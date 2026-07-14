import { Request, Response } from 'express';
import { getOrgId, getVisibleUserIds } from '../utils/hierarchyUtils';
import { isSuperAdmin as checkSuperAdmin } from '../utils/roleUtils';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';


const logDebug = (msg: string) => {
    try {
        const logPath = path.join(__dirname, '../../debug_crash.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write log', e);
    }
};

// Helper to get branch filter
const getBranchFilter = (req: Request) => {
    const branchId = req.query.branchId as string;
    return branchId ? { branchId } : {};
};

// Helper to get date filter
const getDateFilter = (req: Request, dateField: string) => {
    const month = req.query.month as string; // Expect "YYYY-MM" or "all"
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (month && month !== 'all') {
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;

        const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
        start.setMinutes(start.getMinutes() - 330); // Shift to match IST start

        const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
        end.setMinutes(end.getMinutes() - 330); // Shift to match IST end

        return { [dateField]: { gte: start, lt: end } };
    }

    if (startDate || endDate) {
        const filter: any = {};
        if (startDate) {
            const sDate = new Date(String(startDate));
            sDate.setUTCHours(0, 0, 0, 0);
            filter.gte = sDate;
        }
        if (endDate) {
            const eDate = new Date(String(endDate));
            eDate.setUTCHours(23, 59, 59, 999);
            filter.lte = eDate;
        }
        return { [dateField]: filter };
    }

    return null;
};

export const getDashboardStats = async (req: Request, res: Response) => {
    logDebug('Entered getDashboardStats');
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);
        logDebug(`[Analytics] User: ${user?.id}, Org: ${orgId}, SuperAdmin: ${isSuperAdmin}`);

        const branchFilter = getBranchFilter(req);

        logDebug('[Analytics] Importing hierarchyUtils...');
        const { getVisibleUserIds } = await import('../utils/hierarchyUtils');

        logDebug('[Analytics] Fetching visibleUserIds...');
        const visibleUserIds = await getVisibleUserIds(user.id);
        logDebug(`[Analytics] Visible users: ${visibleUserIds.length}`);

        if (!orgId && !isSuperAdmin) {
            logDebug('[Analytics] No Org ID');
            return res.status(400).json({ message: 'Organisation not found' });
        }

        // Build org filter - super admin sees all orgs
        const orgFilter = orgId ? { organisationId: orgId } : {};
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Base filter for users who are not admin/super_admin
        const visibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            visibilityFilter.assignedToId = { in: visibleUserIds };
        }

        // Special case for opportunity ownerId vs assignedToId (if schema differs)
        const oppVisibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            oppVisibilityFilter.OR = [
                { ownerId: { in: visibleUserIds } },
                { lead: { assignedToId: { in: visibleUserIds } } }
            ];
        }

        // Current Month Dates (Aligned to IST)
        const startOfMonth = new Date();
        startOfMonth.setMinutes(startOfMonth.getMinutes() + 330); // Shift to IST
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        startOfMonth.setMinutes(startOfMonth.getMinutes() - 330); // Shift back to UTC

        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

        // Build Payment Filter
        const paymentFilter: any = {
            ...(orgId ? { organisationId: orgId } : {})
        };
        if (branchFilter.branchId) {
            paymentFilter.opportunity = { branchId: branchFilter.branchId };
        }
        if (oppVisibilityFilter.OR) {
            paymentFilter.opportunity = {
                ...(paymentFilter.opportunity || {}),
                OR: oppVisibilityFilter.OR
            };
        }

        const oppDateFilter = getDateFilter(req, 'closeDate');
        const paymentDateFilter = getDateFilter(req, 'paymentDate');

        // Follow-up Date Filter (always due today or overdue only, aligned timezone-independently to IST)
        const followUpDueDate = {
            lte: (() => {
                const now = new Date();
                const istTime = now.getTime() + (5.5 * 60 * 60 * 1000);
                const istDate = new Date(istTime);
                const endOfTodayIST = new Date(Date.UTC(
                    istDate.getUTCFullYear(),
                    istDate.getUTCMonth(),
                    istDate.getUTCDate(),
                    23, 59, 59, 999
                ));
                return new Date(endOfTodayIST.getTime() - (5.5 * 60 * 60 * 1000));
            })()
        };

        // Follow-up Branch Filter (checking related entities' branches)
        const followUpBranchFilter = branchFilter.branchId ? {
            OR: [
                { branchId: branchFilter.branchId },
                { lead: { branchId: branchFilter.branchId } },
                { opportunity: { branchId: branchFilter.branchId } },
                { contact: { branchId: branchFilter.branchId } },
                { account: { branchId: branchFilter.branchId } }
            ]
        } : {};

        // Follow-up Visibility Filter matching followUpController.ts
        const followUpVisibilityFilter = !isSuperAdmin && user.role !== 'admin' ? {
            OR: [
                { assignedToId: { in: visibleUserIds } },
                { createdById: { in: visibleUserIds } },
                { lead: { assignedToId: { in: visibleUserIds }, isDeleted: false } },
                { contact: { ownerId: { in: visibleUserIds } } },
                { account: { ownerId: { in: visibleUserIds } } },
                { opportunity: { ownerId: { in: visibleUserIds } } }
            ]
        } : {};

        // Group independent queries to run concurrently
        const [
            totalLeads,
            newLeads,
            convertedLeads,
            revenueResult,
            pipelineResult,
            totalContacts,
            totalAccounts,
            prevLeads,
            prevRevenueResult,
            totalClosedCurrent,
            wonCurrent,
            wonTotal,
            lostTotal,
            activeOpportunitiesCount,
            totalOpportunitiesCount,
            revenueThisMonthResult,
            pendingFollowUpsCount
        ] = await Promise.all([
            // Leads
            prisma.lead.count({ where: { ...combinedFilter, isDeleted: false, ...visibilityFilter } }),
            prisma.lead.count({ where: { ...combinedFilter, isDeleted: false, status: 'new', ...visibilityFilter } }),
            prisma.lead.count({ where: { ...combinedFilter, isDeleted: false, status: 'converted', ...visibilityFilter } }),

            // Revenue calculation and trend (Opportunities - Sales Book logic)
            prisma.opportunity.aggregate({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: 'closed_won',
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : {})
                },
                _sum: { amount: true }
            }),

            // Pipeline Value
            prisma.opportunity.aggregate({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : {})
                },
                _sum: { amount: true }
            }),

            // Contacts/Accounts
            prisma.contact.count({
                where: { ...combinedFilter, isDeleted: false, ...(!isSuperAdmin && user.role !== 'admin' ? { ownerId: { in: visibleUserIds } } : {}) }
            }),
            prisma.account.count({
                where: { ...combinedFilter, isDeleted: false, ...(!isSuperAdmin && user.role !== 'admin' ? { ownerId: { in: visibleUserIds } } : {}) }
            }),

            // Previous Month Stats for Trends (Leads)
            prisma.lead.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    createdAt: { gte: startOfLastMonth, lt: startOfMonth },
                    ...visibilityFilter
                }
            }),

            // Previous Month Stats for Trends (Revenue - Opportunities)
            prisma.opportunity.aggregate({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: 'closed_won',
                    ...oppVisibilityFilter,
                    closeDate: { gte: startOfLastMonth, lt: startOfMonth }
                },
                _sum: { amount: true }
            }),

            // Trending Win Rate (total closed current month)
            prisma.opportunity.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: { in: ['closed_won', 'closed_lost'] },
                    closeDate: { gte: startOfMonth },
                    ...oppVisibilityFilter
                }
            }),

            // Trending Win Rate (won current month)
            prisma.opportunity.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: 'closed_won',
                    closeDate: { gte: startOfMonth },
                    ...oppVisibilityFilter
                }
            }),

            // Won/Lost for nested object
            prisma.opportunity.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: 'closed_won',
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : {})
                }
            }),
            prisma.opportunity.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: 'closed_lost',
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : {})
                }
            }),

            // Active and Total Opportunities
            prisma.opportunity.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: { notIn: ['closed_won', 'closed_lost'] },
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : {})
                }
            }),
            prisma.opportunity.count({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : {})
                }
            }),

            // Revenue this month (Sales Book - closed won opportunities)
            prisma.opportunity.aggregate({
                where: {
                    ...combinedFilter,
                    isDeleted: false,
                    stage: 'closed_won',
                    ...oppVisibilityFilter,
                    ...(oppDateFilter ? oppDateFilter : (req.query.month === 'all' ? {} : { closeDate: { gte: startOfMonth } }))
                },
                _sum: { amount: true }
            }),

            // Pending Follow-ups (due today/selected range, aligned to IST timezone, respecting visibility and branch)
            prisma.task.count({
                where: {
                    ...orgFilter,
                    ...followUpBranchFilter,
                    ...followUpVisibilityFilter,
                    isDeleted: false,
                    status: { in: ['not_started', 'in_progress'] },
                    dueDate: followUpDueDate
                }
            })
        ]);

        const totalRevenue = revenueResult._sum.amount || 0;
        const pipelineValue = pipelineResult._sum.amount || 0;
        const prevRevenue = prevRevenueResult._sum.amount || 0;
        const revenueThisMonth = revenueThisMonthResult._sum.amount || 0;
        const currentWinRate = totalClosedCurrent > 0 ? (wonCurrent / totalClosedCurrent) * 100 : 0;

        const calculateTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        res.json({
            // Flat structure
            totalLeads,
            activeOpportunities: activeOpportunitiesCount,
            pendingFollowUps: pendingFollowUpsCount,
            salesRevenue: totalRevenue,
            revenueThisMonth,
            winRate: Math.round(currentWinRate),

            // Trends
            trends: {
                revenue: calculateTrend(totalRevenue, prevRevenue),
                leads: calculateTrend(totalLeads, prevLeads),
                winRate: 0 // Win rate trend requires more historical data, 0 for now
            },

            // Nested structure
            leads: { total: totalLeads, new: newLeads, converted: convertedLeads },
            opportunities: {
                total: totalOpportunitiesCount,
                value: pipelineValue,
                won: wonTotal,
                lost: lostTotal
            },
            contacts: { total: totalContacts },
            accounts: { total: totalAccounts }
        });
    } catch (error) {
        logDebug(`getDashboardStats CRASHED: ${(error as Error).message}\nStack: ${(error as Error).stack}`);
        console.error('getDashboardStats Error:', error);
        res.status(500).json({
            message: (error as Error).message,
            debug: 'Check debug_crash.log'
        });
    }
};

export const getSalesChartData = async (req: Request, res: Response) => {
    try {
        console.log('[Analytics] Requesting Sales Chart Data');
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);

        if (!orgId && !isSuperAdmin) {
            console.error('[Analytics] Org ID missing for user:', user.id);
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };
        const requestedUserId = req.query.userId as string;

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMinutes(sixMonthsAgo.getMinutes() + 330); // Shift to IST
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        sixMonthsAgo.setMinutes(sixMonthsAgo.getMinutes() - 330); // Shift back to UTC

        // Visibility & User Filtering
        const visibilityFilter: any = {};
        if (user.role !== 'admin' && !isSuperAdmin) {
            const { getVisibleUserIds } = await import('../utils/hierarchyUtils');
            const visibleUserIds = await getVisibleUserIds(user.id);

            if (requestedUserId && typeof requestedUserId === 'string') {
                // If specific user requested, verify they are in visibility scope
                if (visibleUserIds.includes(requestedUserId)) {
                    visibilityFilter.ownerId = requestedUserId;
                } else {
                    // Not authorized to see this user's data
                    return res.status(403).json({ message: 'Unauthorized access to user data' });
                }
            } else {
                visibilityFilter.ownerId = { in: visibleUserIds };
            }
        } else if (requestedUserId) {
            // Admin can see any user
            visibilityFilter.ownerId = requestedUserId;
        }

        // Fetch PaymentRecords
        const payments = await prisma.paymentRecord.findMany({
            where: {
                ...(orgId ? { organisationId: orgId as string } : {}),
                paymentDate: { gte: sixMonthsAgo },
                opportunity: {
                    ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
                    ...(visibilityFilter.ownerId ? { ownerId: visibilityFilter.ownerId } : {}),
                    isDeleted: false
                }
            },
            select: {
                amount: true,
                paymentDate: true
            }
        });

        // Initialize last 6 months buckets
        const monthlyData = new Map<string, number>();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 6; i++) {
            const d = new Date(sixMonthsAgo);
            d.setMonth(d.getMonth() + i);
            const key = `${d.getFullYear()}-${d.getMonth()}`; // Unique key per month-year
            monthlyData.set(key, 0);
        }

        // Fill data
        for (const payment of payments) {
            const date = new Date(payment.paymentDate);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (monthlyData.has(key)) {
                monthlyData.set(key, (monthlyData.get(key) || 0) + (payment.amount || 0));
            }
        }

        // Format for frontend
        const formattedData = Array.from(monthlyData.entries()).map(([key, total]) => {
            const [, monthIndex] = key.split('-').map(Number);
            return {
                name: monthNames[monthIndex],
                total,
                fullDate: key // helpful validation
            };
        });

        console.log(`[Analytics] Sales Chart returning ${formattedData.length} points.`);
        res.json(formattedData);
    } catch (error) {
        console.error('getSalesChartData Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getTopLeads = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Visibility
        const visibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            const { getVisibleUserIds } = await import('../utils/hierarchyUtils');
            const visibleUserIds = await getVisibleUserIds(user.id);
            visibilityFilter.assignedToId = { in: visibleUserIds };
        }

        const topLeads = await prisma.lead.findMany({
            where: {
                ...combinedFilter,
                isDeleted: false,
                ...visibilityFilter
            },
            orderBy: { potentialValue: 'desc' },
            take: 10,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
                leadScore: true,
                potentialValue: true
            }
        });

        // Format data for frontend chart (name and value)
        const formattedLeads = topLeads.map(lead => ({
            name: `${lead.firstName} ${lead.lastName || ''}`.trim() || lead.company || lead.email || 'Unknown',
            value: lead.potentialValue || 0,
            leadScore: lead.leadScore
        }));

        res.json(formattedLeads);
    } catch (error) {
        console.error('getTopLeads Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getSalesForecast = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Visibility
        const visibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            const { getVisibleUserIds } = await import('../utils/hierarchyUtils');
            const visibleUserIds = await getVisibleUserIds(user.id);
            visibilityFilter.ownerId = { in: visibleUserIds };
        }

        const oppDateFilter = getDateFilter(req, 'closeDate');

        // Get open opportunities (not closed_won or closed_lost)
        const openOpportunities = await prisma.opportunity.findMany({
            where: {
                ...combinedFilter,
                stage: { notIn: ['closed_won', 'closed_lost'] },
                isDeleted: false,
                ...visibilityFilter,
                ...(oppDateFilter ? oppDateFilter : {})
            },
            select: {
                amount: true,
                probability: true
            }
        });

        let totalPipeline = 0;
        let weightedForecast = 0;

        for (const opp of openOpportunities) {
            const amount = opp.amount || 0;
            const probability = opp.probability || 0;
            totalPipeline += amount;
            weightedForecast += amount * (probability / 100);
        }

        res.json({
            weightedForecast: totalPipeline,
            totalPipeline
        });
    } catch (error) {
        console.error('getSalesForecast Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getLeadSourceAnalytics = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Hierarchy Visibility
        const visibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            const visibleUserIds = await getVisibleUserIds(user.id);
            visibilityFilter.assignedToId = { in: visibleUserIds };
        }

        // Prisma groupBy for lead sources
        const sourceStats = await prisma.lead.groupBy({
            by: ['source'],
            where: {
                ...combinedFilter,
                isDeleted: false,
                ...visibilityFilter
            },
            _count: { source: true },
            orderBy: { _count: { source: 'desc' } }
        });

        const formattedStats = sourceStats.map(stat => ({
            source: stat.source || 'Unknown',
            count: stat._count.source
        }));

        res.json(formattedStats);
    } catch (error) {
        console.error('getLeadSourceAnalytics Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getAiInsights = async (req: Request, res: Response) => {
    try {
        console.log('[Analytics] Requesting AI Insights');
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Visibility Filters for Insights
        const visibilityFilter: any = {};
        const oppVisibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            const visibleUserIds = await getVisibleUserIds(user.id);
            visibilityFilter.assignedToId = { in: visibleUserIds };
            oppVisibilityFilter.ownerId = { in: visibleUserIds };
        }

        const insights = [];

        // 1. Top Lead Source Analysis
        const topSource = await prisma.lead.groupBy({
            by: ['source'],
            where: { ...combinedFilter, isDeleted: false, ...visibilityFilter },
            _count: { source: true },
            orderBy: { _count: { source: 'desc' } },
            take: 1
        });

        if (topSource.length > 0) {
            insights.push({
                type: 'positive',
                title: `Focus on '${topSource[0].source}' Leads`,
                description: `Leads from ${topSource[0].source} are your top volume source (${topSource[0]._count.source} leads). Consider increasing budget here.`,
                icon: 'Target'
            });
        }

        // 2. Stagnation Check (Deals in 'prospecting' or 'qualified' for > 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stagnantDeals = await prisma.opportunity.count({
            where: {
                ...combinedFilter,
                stage: { in: ['prospecting', 'qualified'] },
                isDeleted: false,
                updatedAt: { lt: thirtyDaysAgo },
                ...oppVisibilityFilter
            }
        });

        if (stagnantDeals > 0) {
            insights.push({
                type: 'warning',
                title: 'Pipeline Stagnation',
                description: `You have ${stagnantDeals} deals that haven't moved in 30 days. Follow up to unblock revenue.`,
                icon: 'AlertCircle'
            });
        }

        // 3. High Value Deal Alert - Calculate dynamic threshold based on average deal size
        const avgDealResult = await prisma.opportunity.aggregate({
            where: {
                ...combinedFilter,
                stage: { notIn: ['closed_won', 'closed_lost'] },
                isDeleted: false,
                amount: { gt: 0 },
                ...oppVisibilityFilter
            },
            _avg: { amount: true }
        });

        const avgDealSize = avgDealResult._avg?.amount || 5000;
        const highValueThreshold = avgDealSize * 2; // Deals worth 2x average are considered high value

        const highValueDeals = await prisma.opportunity.findMany({
            where: {
                ...combinedFilter,
                stage: { notIn: ['closed_won', 'closed_lost'] },
                isDeleted: false,
                amount: { gt: highValueThreshold },
                ...oppVisibilityFilter
            },
            take: 2,
            orderBy: { amount: 'desc' },
            select: { name: true, amount: true }
        });

        if (highValueDeals.length > 0) {
            const dealNames = highValueDeals.map(d => d.name).join(', ');
            insights.push({
                type: 'info',
                title: 'High Value Opportunities',
                description: `Key focuses: ${dealNames}. Closing these acts as a major revenue booster.`,
                icon: 'TrendingUp'
            });
        }

        // Fallback if no data
        if (insights.length === 0) {
            insights.push({
                type: 'info',
                title: 'Gathering Data',
                description: 'Add more leads and opportunities to generate smart insights.',
                icon: 'Brain'
            });
        }

        res.json(insights);
    } catch (error) {
        console.error('getAiInsights Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getTopPerformers = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        // User filter needs to be applied to `User` model, but filtered by branch?
        // Users belong to a branch. So we can filter users by branchID.
        const userCombinedFilter = { ...orgFilter, ...branchFilter };
        // For Active users
        const activeFilter = { isActive: true };

        // Hierarchy Visibility for Top Performers
        const visibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            const visibleUserIds = await getVisibleUserIds(user.id);
            visibilityFilter.id = { in: visibleUserIds };
        }

        const topUsers = await prisma.user.findMany({
            where: {
                ...userCombinedFilter,
                ...activeFilter,
                ...visibilityFilter
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                ownedOpportunities: {
                    where: { isDeleted: false },
                    select: {
                        amount: true,
                        paymentStatus: true,
                        emiSchedules: {
                            select: { paidAmount: true }
                        }
                    }
                }
            }
        });

        const leaderboard = topUsers.map(u => {
            const totalRevenue = u.ownedOpportunities.reduce((sum: number, opp: any) => {
                let oppTotal = 0;
                if (opp.emiSchedules && opp.emiSchedules.length > 0) {
                    oppTotal = opp.emiSchedules.reduce((pSum: number, schedule: any) => pSum + (schedule.paidAmount || 0), 0);
                } else if (opp.paymentStatus === 'paid') {
                    oppTotal = opp.amount || 0;
                }
                return sum + oppTotal;
            }, 0);

            const paymentsCount = u.ownedOpportunities.reduce((count: number, opp: any) => {
                if (opp.emiSchedules && opp.emiSchedules.length > 0) return count + 1;
                if (opp.paymentStatus === 'paid') return count + 1;
                return count;
            }, 0);

            return {
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                image: u.profileImage,
                totalRevenue,
                dealsWon: paymentsCount // Number of payments
            };
        })
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);

        res.json(leaderboard);
    } catch (error) {
        console.error('getTopPerformers Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getSalesBook = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);
        const { startDate, endDate } = req.query;

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Visibility
        const visibilityFilter: any = {};
        if (!isSuperAdmin && user.role !== 'admin') {
            const { getVisibleUserIds } = await import('../utils/hierarchyUtils');
            const visibleUserIds = await getVisibleUserIds(user.id);
            visibilityFilter.OR = [
                { ownerId: { in: visibleUserIds } },
                { lead: { assignedToId: { in: visibleUserIds } } }
            ];
        }

        // Date Filter
        const dateFilter: any = {};
        if (startDate || endDate) {
            dateFilter.closeDate = {};
            if (startDate) {
                const sDate = new Date(String(startDate));
                sDate.setUTCHours(0, 0, 0, 0);
                dateFilter.closeDate.gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(String(endDate));
                eDate.setUTCHours(23, 59, 59, 999);
                dateFilter.closeDate.lte = eDate;
            }
        }

        const sales = await prisma.opportunity.findMany({
            where: {
                ...combinedFilter,
                stage: 'closed_won',
                isDeleted: false,
                ...visibilityFilter,
                ...dateFilter
            },
            select: {
                id: true,
                name: true,
                amount: true,
                closeDate: true,
                paymentStatus: true,
                account: { select: { name: true } },
                owner: { select: { firstName: true, lastName: true } },
                branch: { select: { name: true } },
                lead: { select: { firstName: true, lastName: true } },
                emiSchedules: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        totalAmount: true,
                        paidAmount: true,
                        remainingAmount: true,
                        status: true
                    }
                }
            },
            orderBy: { closeDate: 'desc' }
        });

        const formattedSales = sales.map(s => {
            const hasEmi = s.emiSchedules && s.emiSchedules.length > 0;
            const emiSchedule = hasEmi ? s.emiSchedules[0] : null;
            let totalPaid = 0;
            if (hasEmi && emiSchedule) {
                totalPaid = emiSchedule.paidAmount || 0;
            } else if (s.paymentStatus === 'paid') {
                totalPaid = s.amount || 0;
            }

            return {
                id: s.id,
                opportunityName: s.name,
                customerName: s.account?.name || 'N/A',
                amount: s.amount,
                closeDate: s.closeDate,
                paymentStatus: s.paymentStatus || 'pending',
                totalPaid,
                ownerName: s.owner ? `${s.owner.firstName} ${s.owner.lastName}` : 'Unknown',
                branchName: (s as any).branch?.name || 'N/A',
                leadName: (s as any).lead ? `${(s as any).lead.firstName} ${(s as any).lead.lastName || ''}`.trim() : 'N/A',
                hasEmi,
                emiDetails: emiSchedule ? {
                    totalAmount: emiSchedule.totalAmount,
                    paidAmount: emiSchedule.paidAmount,
                    remainingAmount: emiSchedule.remainingAmount,
                    status: emiSchedule.status
                } : null
            };
        });

        res.json(formattedSales);
    } catch (error) {
        console.error('getSalesBook Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getUserWiseSales = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const isSuperAdmin = checkSuperAdmin(user);
        const { startDate, endDate } = req.query;

        if (!orgId && !isSuperAdmin) {
            return res.status(400).json({ message: 'Organisation not found' });
        }

        const orgFilter = orgId ? { organisationId: orgId } : {};
        // Branch filter is optional here, usually user-wise report might be global for admin, but let's respect it if passed
        const branchFilter = getBranchFilter(req);
        const combinedFilter = { ...orgFilter, ...branchFilter };

        // Determine scope of users to report on
        let userIdsToReport: string[] = [];
        if (!isSuperAdmin && user.role !== 'admin') {
            const { getVisibleUserIds } = await import('../utils/hierarchyUtils');
            userIdsToReport = await getVisibleUserIds(user.id);
        } else {
            // Admin sees all active users in org (and optional branch)
            const users = await prisma.user.findMany({
                where: { ...combinedFilter, isActive: true },
                select: { id: true }
            });
            userIdsToReport = users.map(u => u.id);
        }

        // Date Filter for OPPORTUNITIES
        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.closeDate = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }

        // Aggregate per user
        const userStats = await Promise.all(userIdsToReport.map(async (uid) => {
            const userDetails = await prisma.user.findUnique({
                where: { id: uid },
                select: { firstName: true, lastName: true, email: true }
            });

            if (!userDetails) return null;

            const aggregates = await prisma.opportunity.aggregate({
                where: {
                    ownerId: uid,
                    stage: 'closed_won',
                    isDeleted: false,
                    ...dateFilter
                },
                _sum: { amount: true },
                _count: { id: true }
            });

            return {
                name: `${userDetails.firstName} ${userDetails.lastName}`,
                email: userDetails.email,
                totalRevenue: aggregates._sum.amount || 0,
                dealsWon: aggregates._count.id || 0
            };
        }));

        res.json(userStats.filter(Boolean));
    } catch (error) {
        console.error('getUserWiseSales Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};