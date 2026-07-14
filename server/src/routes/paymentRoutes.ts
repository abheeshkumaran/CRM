import express from 'express';
import {
  recordFullPayment,
  recordPartialPayment,
  getPaymentRecords,
  getPaymentSummary
} from '../controllers/paymentController';

const router = express.Router();

// Payment operations
router.post('/opportunities/:id/payments/full', recordFullPayment);
router.post('/opportunities/:id/payments/partial', recordPartialPayment);
router.get('/opportunities/:id/payments', getPaymentRecords);
router.get('/opportunities/:id/payment-summary', getPaymentSummary);

export default router;
