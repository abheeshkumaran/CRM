import { Request, Response } from 'express';
import prisma from '../config/prisma';


export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        const { group } = req.query;
        const where = group ? { group: String(group) } : {};

        const settings = await prisma.systemSetting.findMany({
            where
        });

        // Convert array to object for easier frontend consumption
        const settingsMap = settings.reduce((acc: Record<string, string>, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);

        res.json(settingsMap);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
    try {
        const settings = req.body; // Expecting { key: value, key2: value2 }
        const group = (req.query.group as string) || 'general';

        const updates = Object.entries(settings).map(([key, value]) => {
            return prisma.systemSetting.upsert({
                where: { key },
                update: { value: String(value), group },
                create: { key, value: String(value), group }
            });
        });

        await prisma.$transaction(updates);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Failed to update settings' });
    }
};

export const getPublicSystemSettings = async (req: Request, res: Response) => {
    try {
        // Only return specific public settings (SEO, Branding)
        // Avoid exposing sensitive keys if any
        const publicKeys = [
            'app_name',
            'seo_title',
            'seo_description',
            'seo_keywords',
            'og_image',
            'favicon_url',
            'logo_url'
        ];

        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: publicKeys }
            }
        });

        const settingsMap = settings.reduce((acc: Record<string, string>, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);

        res.json(settingsMap);
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};
