import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  convertToEMI,
  getEMISchedule,
  getEMISchedules,
  markInstallmentPaid,
  updateInstallment,
  deleteInstallment,
  recordInstallmentPayment,
  markInstallmentMissed
} from '../controllers/emiController';

const router = express.Router();

// EMI operations (all protected)
router.post('/opportunities/:id/emi/convert', protect, convertToEMI as any);
router.get('/opportunities/:id/emi', protect, getEMISchedule as any);
router.get('/emi-schedules', protect, getEMISchedules as any);
router.post('/emi-schedules/:scheduleId/installments/:installmentId/pay', protect, recordInstallmentPayment as any);
router.post('/emi-schedules/:scheduleId/installments/:installmentId/miss', protect, markInstallmentMissed as any);
router.post('/emi/installments/:installmentId/pay', protect, markInstallmentPaid as any);
router.put('/emi/installments/:installmentId', protect, updateInstallment as any);
router.delete('/emi/installments/:installmentId', protect, deleteInstallment as any);

export default router;
