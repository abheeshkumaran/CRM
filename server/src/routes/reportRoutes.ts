import { Router } from 'express';
import { 
    getLeadsReport, 
    getUserPerformance, 
    getSalesBook, 
    exportToExcel, 
    getTeamPerformanceReport,
    getUserPerformanceDetails,
    getDailyReport,
    getLeadDistributionReport
} from '../controllers/reportController';
import { protect as authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Leads report with filtering
router.get('/leads', getLeadsReport);

// Lead Distribution Report
router.get('/lead-distribution', getLeadDistributionReport);

// User performance metrics (Existing)
router.get('/user-performance', getUserPerformance);

// Detailed user performance for Total Report (New)
router.get('/user-performance-details', getUserPerformanceDetails);

// Daily Report (New)
router.get('/daily-report', getDailyReport);

// Sales book with time period filter
router.get('/sales-book', getSalesBook);

// Team performance for managers
router.get('/team-performance', getTeamPerformanceReport);

// Export to Excel
router.get('/export/:type', exportToExcel);

export default router;
