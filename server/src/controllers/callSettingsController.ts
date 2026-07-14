import { Request, Response } from 'express';
import { getOrgId } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


// Get call settings for the organisation (create defaults if not exists)
export const getCallSettings = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        // Try to find existing settings
        let settings = await prisma.callSettings.findUnique({
            where: { organisationId: orgId }
        });

        // If not exists, create with defaults
        if (!settings) {
            settings = await prisma.callSettings.create({
                data: {
                    organisationId: orgId
                }
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('Get call settings error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update call settings
export const updateCallSettings = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);

        if (!orgId) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const {
            autoRecordOutbound,
            autoRecordInbound,
            recordingQuality,
            storageType,
            retentionDays,
            autoDeleteEnabled,
            popupOnIncoming,
            autoFollowupReminder,
            followupDelayMinutes,
            syncNonCrmContacts
        } = req.body;

        // Upsert settings
        const settings = await prisma.callSettings.upsert({
            where: { organisationId: orgId },
            update: {
                autoRecordOutbound: autoRecordOutbound ?? undefined,
                autoRecordInbound: autoRecordInbound ?? undefined,
                recordingQuality: recordingQuality ?? undefined,
                storageType: storageType ?? undefined,
                retentionDays: retentionDays ?? undefined,
                autoDeleteEnabled: autoDeleteEnabled ?? undefined,
                popupOnIncoming: popupOnIncoming ?? undefined,
                autoFollowupReminder: autoFollowupReminder ?? undefined,
                followupDelayMinutes: followupDelayMinutes ?? undefined,
                syncNonCrmContacts: syncNonCrmContacts ?? undefined
            },
            create: {
                organisationId: orgId,
                autoRecordOutbound: autoRecordOutbound ?? true,
                autoRecordInbound: autoRecordInbound ?? true,
                recordingQuality: recordingQuality ?? 'high',
                storageType: storageType ?? 'local',
                retentionDays: retentionDays ?? 90,
                autoDeleteEnabled: autoDeleteEnabled ?? false,
                popupOnIncoming: popupOnIncoming ?? true,
                autoFollowupReminder: autoFollowupReminder ?? true,
                followupDelayMinutes: followupDelayMinutes ?? 30,
                syncNonCrmContacts: syncNonCrmContacts ?? true // Default to true if not specified on first create
            }
        });

        res.json(settings);
    } catch (error) {
        console.error('Update call settings error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
