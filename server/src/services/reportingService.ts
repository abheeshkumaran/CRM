import prisma from '../config/prisma';


export class ReportingService {
    static async getDailyStats(organisationId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. New Leads Today
        const newLeads = await prisma.lead.count({
            where: {
                organisationId,
                createdAt: { gte: today, lt: tomorrow },
                isDeleted: false
            }
        });

        // 2. Opportunities Won Today
        const wonOpps = await prisma.opportunity.findMany({
            where: {
                organisationId,
                stage: 'closed_won',
                updatedAt: { gte: today, lt: tomorrow }
            },
            select: { amount: true }
        });

        const revenueToday = wonOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const conversionsToday = wonOpps.length;

        // 3. Open Tasks
        const pendingTasks = await prisma.task.count({
            where: {
                organisationId,
                status: { not: 'completed' },
                isDeleted: false
            }
        });

        // 4. Overdue Tasks
        const overdueTasks = await prisma.task.count({
            where: {
                organisationId,
                status: { not: 'completed' },
                dueDate: { lt: today },
                isDeleted: false
            }
        });

        // 5. Overall Pipeline
        const pipelineResult = await prisma.opportunity.aggregate({
            where: {
                organisationId,
                stage: { notIn: ['closed_won', 'closed_lost'] }
            },
            _sum: { amount: true }
        });

        // 6. Call Statistics
        const callsToday = await prisma.interaction.findMany({
            where: {
                organisationId,
                type: 'call',
                date: { gte: today, lt: tomorrow },
                isDeleted: false
            }
        });

        const callStats = {
            total: callsToday.length,
            incoming: callsToday.filter(c => c.direction === 'inbound').length,
            outgoing: callsToday.filter(c => c.direction === 'outbound').length,
            missed: callsToday.filter(c => c.direction === 'inbound' && c.callStatus === 'missed').length,
            rejected: callsToday.filter(c => c.direction === 'inbound' && c.callStatus === 'rejected').length,
            neverAttended: callsToday.filter(c => c.direction === 'inbound' && ['missed', 'rejected'].includes(c.callStatus || '')).length,
            notPickedUp: callsToday.filter(c => c.direction === 'outbound' && (c.duration === 0 || c.callStatus === 'failed')).length,
            unique: new Set(callsToday.map(c => c.phoneNumber).filter(Boolean)).size,
            totalDuration: callsToday.reduce((sum, c) => sum + (c.recordingDuration || 0), 0),
            incomingDuration: callsToday.filter(c => c.direction === 'inbound').reduce((sum, c) => sum + (c.recordingDuration || 0), 0),
            outgoingDuration: callsToday.filter(c => c.direction === 'outbound').reduce((sum, c) => sum + (c.recordingDuration || 0), 0),
        };

        return {
            newLeads,
            revenueToday,
            conversionsToday,
            pendingTasks,
            overdueTasks,
            pipelineValue: pipelineResult._sum.amount || 0,
            callStats,
            date: today.toLocaleDateString()
        };
    }

    static formatWhatsAppReport(stats: any, orgName: string) {
        const formatDuration = (seconds: number) => {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}m ${s}s`;
        };

        let report = `📊 *Daily Report: ${orgName}*
📅 Date: ${stats.date}

📈 *Sales & Leads*
- New Leads: ${stats.newLeads}
- Deals Won: ${stats.conversionsToday}
- Revenue: ₹${stats.revenueToday.toLocaleString()}

📝 *Tasks*
- Pending Tasks: ${stats.pendingTasks}
- Overdue: ${stats.overdueTasks}

💰 *Pipeline*
- Active Pipeline: ₹${stats.pipelineValue.toLocaleString()}

📞 *Call Statistics*
- Total Calls: ${stats.callStats.total} (${formatDuration(stats.callStats.totalDuration)})
- Incoming: ${stats.callStats.incoming} (${formatDuration(stats.callStats.incomingDuration)})
- Outgoing: ${stats.callStats.outgoing} (${formatDuration(stats.callStats.outgoingDuration)})
- Missed: ${stats.callStats.missed}
- Rejected: ${stats.callStats.rejected}
- Never Attended: ${stats.callStats.neverAttended}
- Not Pickup by Client: ${stats.callStats.notPickedUp}
- Unique Calls: ${stats.callStats.unique}

_Powered by CRM Automation_`;
        return report;
    }

    static async getManagerDailyStats(managerId: string, organisationId: string) {
        const { getVisibleUserIds } = await import('../utils/hierarchyUtils');
        const userIds = await getVisibleUserIds(managerId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. New Leads by User
        const leads = await prisma.lead.findMany({
            where: {
                organisationId,
                assignedToId: { in: userIds },
                createdAt: { gte: today, lt: tomorrow },
                isDeleted: false
            },
            select: { assignedToId: true, stage: true }
        });

        // 2. Won Opportunities by User
        const wonOpps = await prisma.opportunity.findMany({
            where: {
                organisationId,
                ownerId: { in: userIds },
                stage: 'closed_won',
                updatedAt: { gte: today, lt: tomorrow }
            },
            select: { ownerId: true, amount: true }
        });

        // 3. Calls by User
        const calls = await prisma.interaction.findMany({
            where: {
                organisationId,
                createdById: { in: userIds },
                type: 'call',
                date: { gte: today, lt: tomorrow },
                isDeleted: false
            },
            select: { createdById: true, direction: true, callStatus: true, duration: true, recordingDuration: true, phoneNumber: true }
        });

        // Grouping logic
        const userStats: Record<string, any> = {};
        for (const id of userIds) {
            userStats[id] = { 
                leads: 0, 
                revenue: 0, 
                stages: {},
                calls: {
                    total: 0,
                    incoming: 0,
                    outgoing: 0,
                    missed: 0,
                    duration: 0,
                    unique: new Set()
                }
            };
        }

        leads.forEach(l => {
            if (l.assignedToId) {
                userStats[l.assignedToId].leads++;
                const stage = l.stage || 'new';
                userStats[l.assignedToId].stages[stage] = (userStats[l.assignedToId].stages[stage] || 0) + 1;
            }
        });

        wonOpps.forEach(o => {
            if (o.ownerId) {
                userStats[o.ownerId].revenue += (o.amount || 0);
            }
        });

        calls.forEach(c => {
            if (c.createdById) {
                const s = userStats[c.createdById].calls;
                s.total++;
                if (c.direction === 'inbound') s.incoming++;
                if (c.direction === 'outbound') s.outgoing++;
                if (c.callStatus === 'missed') s.missed++;
                s.duration += (c.recordingDuration || 0);
                if (c.phoneNumber) s.unique.add(c.phoneNumber);
            }
        });

        // Get user names
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true }
        });

        const formattedStats = users.map(u => ({
            name: `${u.firstName} ${u.lastName}`,
            leads: userStats[u.id].leads,
            revenue: userStats[u.id].revenue,
            stages: userStats[u.id].stages,
            calls: {
                ...userStats[u.id].calls,
                unique: userStats[u.id].calls.unique.size
            }
        })).filter(s => s.leads > 0 || s.revenue > 0 || s.calls.total > 0);

        return {
            teamStats: formattedStats,
            totalLeads: leads.length,
            totalRevenue: wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0),
            totalCalls: calls.length,
            date: today.toLocaleDateString()
        };
    }

    static formatManagerReport(stats: any, managerName: string) {
        const formatDuration = (seconds: number) => {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}m ${s}s`;
        };

        let report = `👔 *Manager Daily Report: ${managerName}*\n📅 Date: ${stats.date}\n\n`;

        if (stats.teamStats.length === 0) {
            report += "No business activity recorded for the team today.\n";
        } else {
            stats.teamStats.forEach((user: any) => {
                report += `👤 *${user.name}*\n`;
                report += `- New Leads: ${user.leads}\n`;
                report += `- Revenue: ₹${user.revenue.toLocaleString()}\n`;
                report += `- Calls: ${user.calls.total} (${formatDuration(user.calls.duration)})\n`;
                if (Object.keys(user.stages).length > 0) {
                    const stages = Object.entries(user.stages).map(([s, c]) => `${s}: ${c}`).join(', ');
                    report += `- Stages: ${stages}\n`;
                }
                report += '\n';
            });

            report += `📊 *Team Totals*\n`;
            report += `- Total Leads: ${stats.totalLeads}\n`;
            report += `- Total Revenue: ₹${stats.totalRevenue.toLocaleString()}\n`;
            report += `- Total Calls: ${stats.totalCalls}\n`;
        }

        report += `\n_Generated by Sales Intelligence_`;
        return report;
    }
    static formatEmailReport(stats: any, orgName: string) {
        const formatDuration = (seconds: number) => {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}m ${s}s`;
        };

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
                .header { background: #6B3BA8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .section { padding: 20px; border-bottom: 1px solid #f0f0f0; }
                .section-title { font-weight: bold; color: #6B3BA8; margin-bottom: 10px; text-transform: uppercase; font-size: 14px; }
                .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .stat-item { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #6B3BA8; }
                .stat-value { font-size: 24px; font-weight: 900; color: #111; }
                .stat-label { font-size: 11px; color: #666; text-transform: uppercase; }
                .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin:0;">Daily Business Report</h1>
                    <p style="margin:5px 0 0; opacity: 0.8;">${orgName} | ${stats.date}</p>
                </div>
                
                <div class="section">
                    <div class="section-title">Sales & Growth</div>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <div class="stat-value">${stats.newLeads}</div>
                            <div class="stat-label">New Leads</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">₹${stats.revenueToday.toLocaleString()}</div>
                            <div class="stat-label">Revenue Today</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Calls & Engagement</div>
                    <table style="width:100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Total Calls</td>
                            <td style="text-align: right; font-weight: bold; padding: 8px 0; border-bottom: 1px solid #eee;">${stats.callStats.total}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Connected</td>
                            <td style="text-align: right; font-weight: bold; padding: 8px 0; border-bottom: 1px solid #eee;">${stats.callStats.incoming + stats.callStats.outgoing - stats.callStats.notPickedUp}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Total Duration</td>
                            <td style="text-align: right; font-weight: bold; padding: 8px 0; border-bottom: 1px solid #eee;">${formatDuration(stats.callStats.totalDuration)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">Unique Clients</td>
                            <td style="text-align: right; font-weight: bold; padding: 8px 0;">${stats.callStats.unique}</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Tasks & Pipeline</div>
                    <div class="stat-grid">
                        <div class="stat-item" style="border-left-color: #f59e0b;">
                            <div class="stat-value">${stats.overdueTasks}</div>
                            <div class="stat-label">Overdue Tasks</div>
                        </div>
                        <div class="stat-item" style="border-left-color: #10b981;">
                            <div class="stat-value">₹${stats.pipelineValue.toLocaleString()}</div>
                            <div class="stat-label">Active Pipeline</div>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    Sent automatically by PYPE CRM Sales Intelligence Engine.<br>
                    &copy; ${new Date().getFullYear()} PYPE. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        `;
        return html;
    }
}
