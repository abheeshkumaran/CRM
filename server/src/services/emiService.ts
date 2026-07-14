import PaymentService from './paymentService';
import prisma from '../config/prisma';


export interface InstallmentInput {
  dueDate: Date;
  amount: number;
}

export interface InstallmentPaymentResult {
  success: boolean;
  installment: any;
  paymentRecord: any;
  scheduleCompleted: boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

class EMIService {
  /**
   * Validate EMI schedule
   */
  async validateEMISchedule(
    opportunityId: string,
    installments: InstallmentInput[],
    upfrontPayment?: number
  ): Promise<ValidationResult> {
    // Check if installments array is not empty
    if (!installments || installments.length === 0) {
      return { valid: false, error: 'EMI schedule must contain at least one installment' };
    }

    // Validate all amounts are positive
    for (const installment of installments) {
      if (installment.amount <= 0) {
        return { valid: false, error: 'All installment amounts must be positive numbers' };
      }
    }

    // Validate all dates are today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    for (const installment of installments) {
      const dueDate = new Date(installment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        return { valid: false, error: 'All installment due dates must be today or in the future' };
      }
    }

    // Validate sum equals remaining amount
    const remaining = await PaymentService.calculateRemainingAmount(opportunityId);
    const actualRemaining = remaining - (upfrontPayment || 0);
    const sum = installments.reduce((total, inst) => total + inst.amount, 0);

    if (Math.abs(sum - actualRemaining) > 0.01) { // Allow small floating point differences
      return {
        valid: false,
        error: `Sum of installment amounts ($${sum}) does not equal remaining amount ($${actualRemaining})`
      };
    }

    return { valid: true };
  }

  /**
   * Convert partial payment to EMI
   */
  async convertToEMI(
    opportunityId: string,
    installments: InstallmentInput[],
    organisationId: string,
    upfrontPayment?: number
  ): Promise<any> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { emiSchedules: true }
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    if (opportunity.paymentStatus !== 'partial' && opportunity.paymentStatus !== 'pending' && opportunity.paymentStatus !== 'emi') {
      throw new Error(`EMI conversion requires opportunity status to be 'partial', 'pending', or 'emi', current status is '${opportunity.paymentStatus}'`);
    }

    const remaining = await PaymentService.calculateRemainingAmount(opportunityId);

    if (remaining <= 0) {
      throw new Error('Cannot convert to EMI with zero remaining balance');
    }

    if (opportunity.emiSchedules && opportunity.emiSchedules.length > 0) {
      throw new Error('An EMI schedule already exists for this opportunity');
    }

    // Validate the schedule
    const validation = await this.validateEMISchedule(opportunityId, installments, upfrontPayment);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create EMI schedule and installments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      if (opportunity.paymentStatus === 'pending') {
        await tx.opportunity.update({
          where: { id: opportunityId },
          data: { paymentStatus: 'emi' }
        });
      }

      const startDate = installments.length > 0 ? new Date(installments[0].dueDate) : new Date();
      const endDate = installments.length > 0 ? new Date(installments[installments.length - 1].dueDate) : new Date();

      // Create EMI schedule
      const actualRemaining = remaining - (upfrontPayment || 0);
      const emiSchedule = await tx.eMISchedule.create({
        data: {
          opportunityId,
          totalAmount: remaining,
          paidAmount: upfrontPayment || 0,
          remainingAmount: actualRemaining,
          organisationId,
          status: 'active',
          startDate,
          endDate
        }
      });

      // Create installments
      const createdInstallments = await Promise.all(
        installments.map((inst, index) =>
          tx.eMIInstallment.create({
            data: {
              scheduleId: emiSchedule.id,
              installmentNumber: index + 1,
              amount: inst.amount,
              dueDate: new Date(inst.dueDate),
              status: 'pending'
            }
          })
        )
      );

      return { emiSchedule, installments: createdInstallments };
    });

    // Fetch complete schedule with installments
    return await prisma.eMISchedule.findUnique({
      where: { id: result.emiSchedule.id },
      include: {
        installments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });
  }

  /**
   * Get EMI schedule for an opportunity
   */
  async getEMISchedule(opportunityId: string): Promise<any | null> {
    return await prisma.eMISchedule.findUnique({
      where: { opportunityId },
      include: {
        installments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });
  }

  /**
   * Mark installment as paid
   */
  async markInstallmentPaid(
    installmentId: string,
    userId: string,
    organisationId: string,
    paymentDate?: Date,
    notes?: string
  ): Promise<InstallmentPaymentResult> {
    const installment = await prisma.eMIInstallment.findUnique({
      where: { id: installmentId },
      include: {
        schedule: {
          include: {
            opportunity: true,
            installments: true
          }
        }
      }
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    if (installment.status === 'paid') {
      throw new Error('Installment is already paid');
    }

    if (installment.status !== 'pending' && installment.status !== 'overdue') {
      throw new Error(`Cannot mark installment as paid, current status is '${installment.status}'`);
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update installment
      const updatedInstallment = await tx.eMIInstallment.update({
        where: { id: installmentId },
        data: {
          status: 'paid',
          paidDate: paymentDate || new Date(),
          notes
        }
      });

      // Create payment record
      const paymentRecord = await tx.paymentRecord.create({
        data: {
          opportunityId: installment.schedule.opportunityId,
          amount: installment.amount,
          paymentDate: paymentDate || new Date(),
          paymentType: 'installment',
          installmentId,
          notes,
          createdById: userId,
          organisationId
        }
      });

      // Update EMI schedule
      const newPaidAmount = installment.schedule.paidAmount + installment.amount;
      const newRemainingAmount = installment.schedule.remainingAmount - installment.amount;

      await tx.eMISchedule.update({
        where: { id: installment.scheduleId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount
        }
      });

      // Check if all installments are paid
      const allInstallments = installment.schedule.installments;
      const allPaid = allInstallments.every(
        inst => inst.id === installmentId || inst.status === 'paid'
      );

      let scheduleCompleted = false;
      if (allPaid) {
        // Update EMI schedule status
        await tx.eMISchedule.update({
          where: { id: installment.scheduleId },
          data: { status: 'completed' }
        });

        // Update opportunity status
        await tx.opportunity.update({
          where: { id: installment.schedule.opportunityId },
          data: {
            paymentStatus: 'paid',
            paymentDate: paymentDate || new Date()
          }
        });

        scheduleCompleted = true;
      }

      return { updatedInstallment, paymentRecord, scheduleCompleted };
    });

    return {
      success: true,
      installment: result.updatedInstallment,
      paymentRecord: result.paymentRecord,
      scheduleCompleted: result.scheduleCompleted,
      message: result.scheduleCompleted
        ? 'Installment paid successfully. All installments completed!'
        : 'Installment paid successfully'
    };
  }

  /**
   * Update installment
   */
  async updateInstallment(
    installmentId: string,
    updates: { dueDate?: Date; amount?: number }
  ): Promise<any> {
    const installment = await prisma.eMIInstallment.findUnique({
      where: { id: installmentId },
      include: {
        schedule: {
          include: { installments: true }
        }
      }
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    if (installment.status !== 'pending') {
      throw new Error(`Only pending installments can be modified, current status is '${installment.status}'`);
    }

    // Validate new due date if provided
    if (updates.dueDate) {
      const newDate = new Date(updates.dueDate);
      if (newDate <= new Date()) {
        throw new Error('New due date must be in the future');
      }
    }

    // Validate new amount if provided
    if (updates.amount !== undefined) {
      if (updates.amount <= 0) {
        throw new Error('Installment amount must be positive');
      }

      // Check if sum still equals remaining amount
      const otherInstallments = installment.schedule.installments.filter(
        inst => inst.id !== installmentId
      );
      const otherSum = otherInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      const newSum = otherSum + updates.amount;

      if (Math.abs(newSum - installment.schedule.totalAmount) > 0.01) {
        throw new Error('Modification would cause sum of installments to not equal remaining amount');
      }
    }

    return await prisma.eMIInstallment.update({
      where: { id: installmentId },
      data: {
        ...(updates.dueDate && { dueDate: new Date(updates.dueDate) }),
        ...(updates.amount !== undefined && { amount: updates.amount })
      }
    });
  }

  /**
   * Delete installment
   */
  async deleteInstallment(installmentId: string): Promise<void> {
    const installment = await prisma.eMIInstallment.findUnique({
      where: { id: installmentId },
      include: {
        schedule: {
          include: { installments: true }
        }
      }
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    if (installment.status !== 'pending') {
      throw new Error(`Only pending installments can be deleted, current status is '${installment.status}'`);
    }

    if (installment.schedule.installments.length <= 1) {
      throw new Error('Cannot delete the last installment in a schedule');
    }

    // Check if remaining installments sum equals total
    const otherInstallments = installment.schedule.installments.filter(
      inst => inst.id !== installmentId
    );
    const remainingSum = otherInstallments.reduce((sum, inst) => sum + inst.amount, 0);

    if (Math.abs(remainingSum - installment.schedule.totalAmount) > 0.01) {
      throw new Error('Cannot delete installment: remaining installments would not equal total amount');
    }

    await prisma.eMIInstallment.delete({
      where: { id: installmentId }
    });
  }

  /**
   * Update overdue status for all pending installments
   */
  async updateOverdueStatus(): Promise<void> {
    const now = new Date();

    await prisma.eMIInstallment.updateMany({
      where: {
        status: 'pending',
        dueDate: {
          lt: now
        }
      },
      data: {
        status: 'overdue'
      }
    });
  }
}

export default new EMIService();
