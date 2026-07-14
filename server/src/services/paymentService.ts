import prisma from '../config/prisma';


export interface PaymentResult {
  success: boolean;
  opportunity: any;
  paymentRecord: any;
  message: string;
}

export interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  paymentRecords: any[];
  emiSchedule?: any;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

class PaymentService {
  /**
   * Validate payment amount
   */
  async validatePaymentAmount(
    opportunityId: string,
    amount: number
  ): Promise<ValidationResult> {
    if (amount <= 0) {
      return { valid: false, error: 'Payment amount must be greater than zero' };
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return { valid: false, error: 'Opportunity not found' };
    }

    const remaining = await this.calculateRemainingAmount(opportunityId);

    if (amount > remaining) {
      return {
        valid: false,
        error: `Payment amount ($${amount}) exceeds remaining balance ($${remaining})`
      };
    }

    return { valid: true };
  }

  /**
   * Calculate remaining amount for an opportunity
   */
  async calculateRemainingAmount(opportunityId: string): Promise<number> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { emiSchedules: true }
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    let totalPaid = 0;
    
    if (opportunity.emiSchedules && opportunity.emiSchedules.length > 0) {
      totalPaid = opportunity.emiSchedules.reduce(
        (sum, schedule) => sum + (schedule.paidAmount || 0),
        0
      );
    } else if (opportunity.paymentStatus === 'paid') {
      totalPaid = opportunity.amount;
    }

    return opportunity.amount - totalPaid;
  }

  /**
   * Record full payment
   */
  async recordFullPayment(
    opportunityId: string,
    userId: string,
    organisationId: string,
    paymentDate?: Date,
    notes?: string
  ): Promise<PaymentResult> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    if (opportunity.paymentStatus === 'paid') {
      throw new Error('Opportunity is already fully paid');
    }

    if (opportunity.amount <= 0) {
      throw new Error('Opportunity total amount must be greater than zero');
    }

    const remaining = await this.calculateRemainingAmount(opportunityId);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update opportunity status
      const updatedOpportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          paymentStatus: 'paid',
          paymentDate: paymentDate || new Date()
        }
      });

      // Delete any active EMI schedules
      await tx.eMISchedule.deleteMany({
        where: { opportunityId }
      });

      return { updatedOpportunity };
    });

    // Notify hierarchy
    this.notifyHierarchyOfPayment(result.updatedOpportunity).catch(console.error);

    return {
      success: true,
      opportunity: result.updatedOpportunity,
      message: 'Payment recorded successfully'
    };
  }

  /**
   * Record partial payment
   */
  async recordPartialPayment(
    opportunityId: string,
    amount: number,
    userId: string,
    organisationId: string,
    paymentDate?: Date,
    notes?: string
  ): Promise<PaymentResult> {
    // Validate amount
    const validation = await this.validatePaymentAmount(opportunityId, amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    if (opportunity.paymentStatus === 'paid') {
      throw new Error('Opportunity is already fully paid');
    }

    const remaining = await this.calculateRemainingAmount(opportunityId);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update opportunity status
      const updatedOpportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          paymentStatus: 'partial'
        }
      });

      // Delete any active EMI schedules (since we switched to non-EMI partial payment)
      await tx.eMISchedule.deleteMany({
        where: { opportunityId }
      });

      return { updatedOpportunity };
    });

    // Notify hierarchy
    this.notifyHierarchyOfPayment(result.updatedOpportunity).catch(console.error);

    return {
      success: true,
      opportunity: result.updatedOpportunity,
      message: 'Partial payment recorded successfully'
    };
  }

  /**
   * Notify hierarchy about payment
   */
  private async notifyHierarchyOfPayment(opportunity: any) {
    try {
      if (!opportunity.ownerId) return;

      const { NotificationService } = await import('./notificationService');
      const owner = await prisma.user.findUnique({
        where: { id: opportunity.ownerId },
        select: { firstName: true, lastName: true }
      });

      if (owner) {
        await NotificationService.sendToHierarchy(
          opportunity.ownerId,
          'Payment Received! 💰',
          `${owner.firstName} ${owner.lastName} received a payment of $${opportunity.amount} for deal "${opportunity.name}".`,
          'success'
        );
      }
    } catch (error) {
      console.error('[PaymentService] Error notifying hierarchy of payment:', error);
    }
  }

  /**
   * Get payment summary for an opportunity
   */
  async getPaymentSummary(opportunityId: string): Promise<PaymentSummary> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        emiSchedules: {
          include: {
            installments: {
              orderBy: { dueDate: 'asc' }
            }
          }
        }
      }
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const totalAmount = opportunity.amount;
    let paidAmount = 0;
    
    if (opportunity.emiSchedules && opportunity.emiSchedules.length > 0) {
      paidAmount = opportunity.emiSchedules.reduce(
        (sum, schedule) => sum + (schedule.paidAmount || 0),
        0
      );
    } else if (opportunity.paymentStatus === 'paid') {
      paidAmount = totalAmount;
    }
    
    const remainingAmount = totalAmount - paidAmount;

    return {
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus: opportunity.paymentStatus,
      paymentRecords: [],
      emiSchedule: opportunity.emiSchedules?.[0] || null
    };
  }
}

export default new PaymentService();
