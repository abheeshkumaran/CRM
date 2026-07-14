import { Request, Response } from 'express';
import EMIService from '../services/emiService';
import prisma from '../config/prisma';


/**
 * Convert partial payment to EMI
 */
export const convertToEMI = async (req: Request, res: Response) => {
  try {
    const { id: opportunityId } = req.params;
    const { installments } = req.body;
    const organisationId = (req as any).user?.organisationId;

    if (!organisationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!installments || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid installments array is required'
      });
    }

    const emiSchedule = await EMIService.convertToEMI(
      opportunityId,
      installments,
      organisationId
    );

    res.status(201).json({
      success: true,
      emiSchedule,
      message: 'EMI schedule created successfully'
    });
  } catch (error: any) {
    console.error('Error converting to EMI:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to convert to EMI'
    });
  }
};

/**
 * Get EMI schedule for an opportunity
 */
export const getEMISchedule = async (req: Request, res: Response) => {
  try {
    const { id: opportunityId } = req.params;

    const emiSchedule = await EMIService.getEMISchedule(opportunityId);

    if (!emiSchedule) {
      return res.status(404).json({
        success: false,
        error: 'EMI schedule not found for this opportunity'
      });
    }

    res.status(200).json({
      success: true,
      emiSchedule
    });
  } catch (error: any) {
    console.error('Error fetching EMI schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch EMI schedule'
    });
  }
};

/**
 * Mark installment as paid
 */
export const markInstallmentPaid = async (req: Request, res: Response) => {
  try {
    const { installmentId } = req.params;
    const { paymentDate, notes } = req.body;
    const userId = (req as any).user?.id;
    const organisationId = (req as any).user?.organisationId;

    if (!userId || !organisationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await EMIService.markInstallmentPaid(
      installmentId,
      userId,
      organisationId,
      paymentDate ? new Date(paymentDate) : undefined,
      notes
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error marking installment as paid:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to mark installment as paid'
    });
  }
};

/**
 * Update installment
 */
export const updateInstallment = async (req: Request, res: Response) => {
  try {
    const { installmentId } = req.params;
    const { dueDate, amount } = req.body;

    if (!dueDate && amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (dueDate or amount) must be provided'
      });
    }

    const updates: any = {};
    if (dueDate) updates.dueDate = new Date(dueDate);
    if (amount !== undefined) updates.amount = amount;

    const installment = await EMIService.updateInstallment(installmentId, updates);

    res.status(200).json({
      success: true,
      installment,
      message: 'Installment updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating installment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update installment'
    });
  }
};

/**
 * Delete installment
 */
export const deleteInstallment = async (req: Request, res: Response) => {
  try {
    const { installmentId } = req.params;

    await EMIService.deleteInstallment(installmentId);

    res.status(200).json({
      success: true,
      message: 'Installment deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting installment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete installment'
    });
  }
};

/**
 * Get all EMI schedules with filtering
 */
export const getEMISchedules = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    const where: any = {
      organisationId: user.organisationId,
      opportunity: {
        paymentStatus: 'emi'
      }
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status;
    }

    const schedules = await prisma.eMISchedule.findMany({
      where,
      include: {
        opportunity: {
          select: {
            id: true,
            name: true,
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        installments: {
          orderBy: {
            installmentNumber: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let finalSchedules = [...schedules];

    // If active or all tabs, include opportunities with paymentStatus 'emi' that do not have an EMISchedule yet
    if (!status || status === 'all' || status === 'active') {
      const pendingOpportunities = await prisma.opportunity.findMany({
        where: {
          organisationId: user.organisationId,
          paymentStatus: 'emi',
          emiSchedules: {
            none: {}
          }
        },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });

      const pendingSchedules = pendingOpportunities.map(opp => ({
        id: `pending-${opp.id}`,
        opportunityId: opp.id,
        totalAmount: opp.amount,
        paidAmount: 0,
        remainingAmount: opp.amount,
        organisationId: opp.organisationId,
        status: 'active',
        startDate: opp.createdAt,
        endDate: opp.createdAt,
        createdAt: opp.createdAt,
        updatedAt: opp.updatedAt,
        opportunity: {
          id: opp.id,
          name: opp.name,
          lead: opp.lead
        },
        installments: [
          {
            id: `dummy-${opp.id}`,
            installmentNumber: 1,
            amount: opp.amount,
            paidAmount: 0,
            dueDate: new Date(),
            status: 'pending'
          }
        ]
      }));

      finalSchedules = [...finalSchedules, ...pendingSchedules];

      // Sort by createdAt descending
      finalSchedules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.status(200).json({
      success: true,
      schedules: finalSchedules
    });
  } catch (error: any) {
    console.error('Error fetching EMI schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch EMI schedules'
    });
  }
};

/**
 * Record payment for an installment (supports partial payments)
 */
export const recordInstallmentPayment = async (req: Request, res: Response) => {
  try {
    const { scheduleId, installmentId } = req.params;
    const { amount } = req.body;
    const userId = (req as any).user?.id;
    const organisationId = (req as any).user?.organisationId;

    if (!userId || !organisationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      });
    }

    // Get the installment
    const installment = await prisma.eMIInstallment.findUnique({
      where: { id: installmentId },
      include: { schedule: true }
    });

    if (!installment || installment.scheduleId !== scheduleId) {
      return res.status(404).json({
        success: false,
        error: 'Installment not found'
      });
    }

    const remainingAmount = installment.amount - installment.paidAmount;
    if (amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        error: `Payment amount cannot exceed remaining amount of ₹${remainingAmount}`
      });
    }

    // Update installment
    const newPaidAmount = installment.paidAmount + amount;
    const newStatus = newPaidAmount >= installment.amount ? 'paid' : installment.status;

    const updatedInstallment = await prisma.eMIInstallment.update({
      where: { id: installmentId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidDate: newStatus === 'paid' ? new Date() : installment.paidDate
      }
    });

    // Update schedule totals
    const schedule = await prisma.eMISchedule.findUnique({
      where: { id: scheduleId },
      include: { installments: true }
    });

    if (schedule) {
      const totalPaid = schedule.installments.reduce((sum, inst) => sum + inst.paidAmount, 0);
      const remaining = schedule.totalAmount - totalPaid;
      const allPaid = schedule.installments.every(inst => inst.status === 'paid');

      await prisma.eMISchedule.update({
        where: { id: scheduleId },
        data: {
          paidAmount: totalPaid,
          remainingAmount: remaining,
          status: allPaid ? 'completed' : schedule.status
        }
      });
    }

    res.status(200).json({
      success: true,
      installment: updatedInstallment,
      message: 'Payment recorded successfully'
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment'
    });
  }
};

/**
 * Mark installment as missed and carry forward amount to next installment
 */
export const markInstallmentMissed = async (req: Request, res: Response) => {
  try {
    const { scheduleId, installmentId } = req.params;
    const userId = (req as any).user?.id;
    const organisationId = (req as any).user?.organisationId;

    if (!userId || !organisationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get the installment and schedule
    const installment = await prisma.eMIInstallment.findUnique({
      where: { id: installmentId },
      include: {
        schedule: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!installment || installment.scheduleId !== scheduleId) {
      return res.status(404).json({
        success: false,
        error: 'Installment not found'
      });
    }

    if (installment.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot mark a paid installment as missed'
      });
    }

    // Calculate unpaid amount
    const unpaidAmount = installment.amount - installment.paidAmount;

    // Mark current installment as missed
    await prisma.eMIInstallment.update({
      where: { id: installmentId },
      data: { status: 'missed' }
    });

    // Find next pending installment
    const nextInstallment = installment.schedule.installments.find(
      inst => inst.installmentNumber > installment.installmentNumber &&
        inst.status !== 'paid' &&
        inst.status !== 'missed'
    );

    if (nextInstallment) {
      // Carry forward the unpaid amount to next installment
      await prisma.eMIInstallment.update({
        where: { id: nextInstallment.id },
        data: {
          amount: nextInstallment.amount + unpaidAmount
        }
      });
    } else {
      // No next installment, mark schedule as defaulted
      await prisma.eMISchedule.update({
        where: { id: scheduleId },
        data: { status: 'defaulted' }
      });
    }

    res.status(200).json({
      success: true,
      message: nextInstallment
        ? `Installment marked as missed. ₹${unpaidAmount.toLocaleString('en-IN')} carried forward to next installment.`
        : 'Installment marked as missed. EMI schedule marked as defaulted.'
    });
  } catch (error: any) {
    console.error('Error marking installment as missed:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to mark installment as missed'
    });
  }
};
