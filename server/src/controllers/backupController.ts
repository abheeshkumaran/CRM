import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { logAudit } from '../utils/auditLogger';
import prisma from '../config/prisma';


// Full model list in dependency order (Insertion Order)
const MODEL_ORDER = [
    'organisation',
    'systemSetting',
    'subscriptionPlan',
    'smsTemplate',
    'documentTemplate',
    'customField',
    'callSettings',
    'branch',
    'role',
    'user',
    'license',
    'apiKey',
    'assignmentRule',
    'team',
    'territory',
    'pipeline',
    'webForm',
    'workflow',
    'workflowRule',
    'emailList',
    'campaign',
    'smsCampaign',
    'whatsAppCampaign',
    'product',
    'goal',
    'salesTarget',
    'case',
    'lead',
    'account',
    'contact',
    'opportunity',
    'emiSchedule',
    'emiInstallment',
    'interaction',
    'calendarEvent',
    'checkIn',
    'task',
    'quote',
    'quoteLineItem',
    'leadProduct',
    'accountProduct',
    'productShare',
    'document',
    'whatsAppMessage',
    'paymentRecord',
    'commission',
    'landingPage',
    'leadHistory',
    'notification',
    'auditLog',
    'searchHistory',
    'userLeadQuotaTracker',
    'workflowQueue',
    'importJob',
    'callRecording',
    'followUp'
];

/**
 * GET /api/super-admin/platform/export
 * Exports the entire platform database to JSON
 */
export const exportPlatformData = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only super admins can export platform data' });
        }

        logger.info('Starting full platform export...', 'BackupController');
        const backupData: any = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            exportedBy: currentUser.id,
            tables: {}
        };

        for (const modelName of MODEL_ORDER) {
            if ((prisma as any)[modelName]) {
                logger.info(`Exporting ${modelName}...`, 'BackupController');
                backupData.tables[modelName] = await (prisma as any)[modelName].findMany();
            } else {
                logger.warn(`Model ${modelName} not found in Prisma client`, 'BackupController');
            }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=platform-backup-${new Date().toISOString().split('T')[0]}.json`);
        res.send(JSON.stringify(backupData, null, 2));

        logAudit({
            action: 'PLATFORM_BACKUP_EXPORT',
            entity: 'System',
            entityId: 'ALL',
            actorId: currentUser.id,
            organisationId: currentUser.organisationId,
            details: { message: 'Full platform backup generated' }
        });

    } catch (error) {
        logger.error('Export Error', error, 'BackupController');
        res.status(500).json({ message: (error as Error).message });
    }
};

/**
 * POST /api/super-admin/platform/restore
 * Restores the platform database from a JSON file
 */
export const restorePlatformData = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only super admins can restore platform data' });
        }

        const { backupData, confirmDelete } = req.body;

        if (!backupData || !backupData.tables) {
            return res.status(400).json({ message: 'Invalid backup data' });
        }

        if (confirmDelete !== 'PERMANENTLY_DELETE_ALL_DATA') {
            return res.status(400).json({ message: 'Deletion confirmation string is incorrect' });
        }

        logger.info('Starting full platform restoration...', 'BackupController');

        // 1. Transactional restoration
        await prisma.$transaction(async (tx) => {
            // STEP 1: Delete all data in reverse order
            const REVERSE_ORDER = [...MODEL_ORDER].reverse();
            for (const modelName of REVERSE_ORDER) {
                if ((tx as any)[modelName]) {
                    logger.info(`Clearing ${modelName}...`, 'BackupController');
                    await (tx as any)[modelName].deleteMany({});
                }
            }

            // STEP 2: Insert data in forward order
            for (const modelName of MODEL_ORDER) {
                const records = backupData.tables[modelName];
                if (records && records.length > 0 && (tx as any)[modelName]) {
                    logger.info(`Restoring ${records.length} records for ${modelName}...`, 'BackupController');
                    
                    // Use createMany for speed if possible
                    // Note: This assumes the records contain all necessary fields including @id
                    await (tx as any)[modelName].createMany({
                        data: records,
                        skipDuplicates: false // We want to know if there's an error
                    });
                }
            }
        }, {
            timeout: 60000 // 60 seconds timeout
        });

        logAudit({
            action: 'PLATFORM_BACKUP_RESTORE',
            entity: 'System',
            entityId: 'ALL',
            actorId: currentUser.id,
            organisationId: currentUser.organisationId,
            details: { message: 'Full platform backup restored' }
        });

        res.json({ message: 'Platform restoration successful' });

    } catch (error) {
        logger.error('Restore Error', error, 'BackupController');
        res.status(500).json({ message: (error as Error).message });
    }
};
/**
 * GET /api/backup/:organisationId
 * Exports data for a specific organisation
 */
export const generateBackup = async (req: Request, res: Response) => {
    try {
        const { organisationId } = req.params;
        const currentUser = (req as any).user;

        // Only super admin can backup any org, or org admin can backup their own
        if (currentUser.role !== 'super_admin' && currentUser.organisationId !== organisationId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        logger.info(`Starting backup for organisation ${organisationId}...`, 'BackupController');
        
        const backupData: any = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            organisationId,
            tables: {}
        };

        for (const modelName of MODEL_ORDER) {
            if ((prisma as any)[modelName]) {
                // Models that have organisationId field
                const hasOrgId = (prisma as any)[modelName].fields?.organisationId || 
                                 ['user', 'team', 'lead', 'account', 'contact', 'opportunity', 'product', 'workflow'].includes(modelName);

                if (modelName === 'organisation') {
                    backupData.tables[modelName] = await (prisma as any)[modelName].findMany({
                        where: { id: organisationId }
                    });
                } else if (hasOrgId) {
                    backupData.tables[modelName] = await (prisma as any)[modelName].findMany({
                        where: { organisationId }
                    });
                }
            }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=org-backup-${organisationId}-${new Date().toISOString().split('T')[0]}.json`);
        res.send(JSON.stringify(backupData, null, 2));

    } catch (error) {
        logger.error('Org Export Error', error, 'BackupController');
        res.status(500).json({ message: (error as Error).message });
    }
};

/**
 * POST /api/backup/restore/:organisationId
 * Restores data for a specific organisation
 */
export const restoreBackup = async (req: Request, res: Response) => {
    try {
        const { organisationId } = req.params;
        const currentUser = (req as any).user;
        const backupData = req.body; // Assuming JSON body for now, or handled by multer

        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only super admins can restore data' });
        }

        if (!backupData || !backupData.tables) {
            return res.status(400).json({ message: 'Invalid backup data' });
        }

        logger.info(`Starting restoration for organisation ${organisationId}...`, 'BackupController');

        await prisma.$transaction(async (tx) => {
            const REVERSE_ORDER = [...MODEL_ORDER].reverse();
            for (const modelName of REVERSE_ORDER) {
                if ((tx as any)[modelName]) {
                    if (modelName === 'organisation') {
                        // Don't delete the org itself usually during per-org restore unless force?
                        // For now just clear nested data
                    } else {
                        try {
                            await (tx as any)[modelName].deleteMany({
                                where: { organisationId }
                            });
                        } catch (e) {
                            // Some tables might not have organisationId, skip them
                        }
                    }
                }
            }

            for (const modelName of MODEL_ORDER) {
                const records = backupData.tables[modelName];
                if (records && records.length > 0 && (tx as any)[modelName]) {
                    await (tx as any)[modelName].createMany({
                        data: records,
                        skipDuplicates: true
                    });
                }
            }
        });

        res.json({ message: 'Organisation restoration successful' });

    } catch (error) {
        logger.error('Org Restore Error', error, 'BackupController');
        res.status(500).json({ message: (error as Error).message });
    }
};
