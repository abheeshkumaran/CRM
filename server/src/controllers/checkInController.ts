import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getVisibleUserIds } from '../utils/hierarchyUtils';
import prisma from '../config/prisma';


export const createCheckIn = async (req: AuthRequest, res: Response) => {
    try {
        const { type, notes, photoUrl, leadId, contactId, accountId, location } = req.body;


        // Handle both flat and nested location structures
        const rawLat = location?.latitude ?? req.body.latitude;
        const rawLng = location?.longitude ?? req.body.longitude;
        const rawAddr = location?.address ?? req.body.address;

        const latitude = rawLat !== undefined ? parseFloat(String(rawLat)) : null;
        const longitude = rawLng !== undefined ? parseFloat(String(rawLng)) : null;
        let address = rawAddr;

        const userId = req.user?.id;
        const organisationId = req.user?.organisationId;

        if (!userId || !organisationId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Reverse Geocoding if address is missing or placeholder
        if ((!address || address === 'Fetching address...') && latitude && longitude) {
            try {
                // Use global fetch (Node 18+) or ensure node-fetch is available
                const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const geoRes = await fetch(nominatimUrl, {
                    headers: { 'User-Agent': 'LeadHostix-CRM/1.0' }
                });
                const geoData: any = await geoRes.json();
                if (geoData && geoData.display_name) {
                    address = geoData.display_name;
                }
            } catch (geoError) {
                console.error('Reverse Geocoding Failed:', geoError);
                // Fallback to coordinates string if geocoding fails
                if (!address) address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }
        }

        const checkIn = await prisma.checkIn.create({
            data: {
                type,
                latitude,
                longitude,
                address,
                notes,
                photoUrl,
                userId,
                organisationId,
                leadId,
                contactId,
                accountId
            },
            include: {
                user: { select: { firstName: true, lastName: true } }
            }
        });

        res.status(201).json(checkIn);
    } catch (error: any) {
        console.error('Error creating check-in:', error);
        res.status(500).json({ error: 'Failed to create check-in' });
    }
};

export const getCheckIns = async (req: AuthRequest, res: Response) => {
    try {
        const organisationId = req.user?.organisationId;
        const userId = req.user?.id;
        const { date, userId: queryUserId, sortBy, sortOrder } = req.query;

        if (!organisationId || !userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get visible user IDs based on hierarchy (self, subordinates, branch members)
        const { branchId } = req.query;
        let visibleUserIds = await getVisibleUserIds(userId);

        if (branchId) {
            const branchUsers = await prisma.user.findMany({
                where: {
                    id: { in: visibleUserIds },
                    branchId: branchId as string
                },
                select: { id: true }
            });
            visibleUserIds = branchUsers.map(u => u.id);
        }

        const where: any = { 
            organisationId,
            userId: { in: visibleUserIds } // Only show check-ins from visible users
        };

        if (date) {
            const startDate = new Date(date as string);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);

            where.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        // If specific user is requested, ensure they're in visible users
        if (queryUserId) {
            if (visibleUserIds.includes(queryUserId as string)) {
                where.userId = queryUserId as string;
            } else {
                // User not in hierarchy, return empty result
                return res.json([]);
            }
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

        // Dynamic sorting
        const orderField = sortBy ? String(sortBy) : 'createdAt';
        const orderDir = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';

        const checkIns = await prisma.checkIn.findMany({
            where,
            include: {
                user: { 
                    select: { 
                        firstName: true, 
                        lastName: true,
                        branch: { select: { name: true } }
                    } 
                },
                lead: { select: { firstName: true, lastName: true, company: true } },
                contact: { select: { firstName: true, lastName: true } },
                account: { select: { name: true } }
            },
            take: limit,
            skip: offset,
            orderBy: { [orderField]: orderDir }
        });

        res.json(checkIns);
    } catch (error: any) {
        console.error('Error fetching check-ins:', error);
        res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
};
