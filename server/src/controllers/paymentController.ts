import { Request, Response } from 'express';
import PaymentService from '../services/paymentService';

/**
 * Record full payment for an opportunity
 */
export const recordFullPayment = async (req: Request, res: Response) => {
  try {
    const { id: opportunityId } = req.params;
    const { paymentDate, notes } = req.body;
    const userId = (req as any).user?.id;
    const organisationId = (req as any).user?.organisationId;

    if (!userId || !organisationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await PaymentService.recordFullPayment(
      opportunityId,
      userId,
      organisationId,
      paymentDate ? new Date(paymentDate) : undefined,
      notes
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error recording full payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment'
    });
  }
};

/**
 * Record partial payment for an opportunity
 */
export const recordPartialPayment = async (req: Request, res: Response) => {
  try {
    const { id: opportunityId } = req.params;
    const { amount, paymentDate, notes } = req.body;
    const userId = (req as any).user?.id;
    const organisationId = (req as any).user?.organisationId;

    if (!userId || !organisationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      });
    }

    const result = await PaymentService.recordPartialPayment(
      opportunityId,
      amount,
      userId,
      organisationId,
      paymentDate ? new Date(paymentDate) : undefined,
      notes
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error recording partial payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment'
    });
  }
};

/**
 * Get all payment records for an opportunity
 */
export const getPaymentRecords = async (req: Request, res: Response) => {
  try {
    const { id: opportunityId } = req.params;

    const summary = await PaymentService.getPaymentSummary(opportunityId);

    res.status(200).json({
      success: true,
      payments: summary.paymentRecords
    });
  } catch (error: any) {
    console.error('Error fetching payment records:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch payment records'
    });
  }
};

/**
 * Get payment summary for an opportunity
 */
export const getPaymentSummary = async (req: Request, res: Response) => {
  try {
    const { id: opportunityId } = req.params;

    const summary = await PaymentService.getPaymentSummary(opportunityId);

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error: any) {
    console.error('Error fetching payment summary:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch payment summary'
    });
  }
};
