import prisma from '../config/prisma';



interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingLead?: any;
    matchedBy?: 'phone' | 'email' | 'whatsapp';
}

interface ReEnquiryData {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    company?: string;
    enquiryAbout?: string;
    stage?: string;
    source?: string;
    sourceDetails?: any;
}

export const DuplicateLeadService = {
    /**
     * Check for duplicate leads by phone, email, or WhatsApp
     * IMPORTANT: Only considers it a duplicate if the lead is in the SAME branch
     * Same lead in different branches = NEW lead (not a re-enquiry)
     */
    async checkDuplicate(
        phone: string,
        email: string | null | undefined,
        organisationId: string,
        branchId?: string | null,
        includeAllBranches: boolean = false // Default to false: isolate by branch
    ): Promise<DuplicateCheckResult> {
        try {
            // Sanitize phone
            const cleanPhone = phone.toString().replace(/\D/g, '');

            // Build OR conditions for duplicate check
            const conditions: any[] = [
                { phone: cleanPhone },
                { secondaryPhone: cleanPhone },
                { phone: `+${cleanPhone}` },
                { secondaryPhone: `+${cleanPhone}` }
            ];

            // Explicit Indian number normalization (91 prefix handling)
            // If 12 digits starting with 91, add the 10-digit version
            if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                const tenDigit = cleanPhone.substring(2);
                conditions.push({ phone: tenDigit });
                conditions.push({ secondaryPhone: tenDigit });
            }
            // If 10 digits, add the 91-prefixed version
            else if (cleanPhone.length === 10) {
                const twelveDigit = '91' + cleanPhone;
                conditions.push({ phone: twelveDigit });
                conditions.push({ secondaryPhone: twelveDigit });
            }

            // Handle international variations using libphonenumber-js
            const { parsePhoneNumberFromString } = await import('libphonenumber-js');

            // Try to parse the phone number to handle international matches
            let phoneToParse = phone.toString().trim();
            if (!phoneToParse.startsWith('+')) {
                phoneToParse = `+${cleanPhone}`; // Assume digits include country code if no plus
            }

            const phoneNumber = parsePhoneNumberFromString(phoneToParse);
            if (phoneNumber) {
                const e164NoPlus = phoneNumber.format('E.164').replace('+', '');
                const national = phoneNumber.nationalNumber.toString();

                // Add E.164 version if different
                if (e164NoPlus !== cleanPhone) {
                    conditions.push({ phone: e164NoPlus });
                    conditions.push({ secondaryPhone: e164NoPlus });
                }

                // Add National version if different
                if (national !== cleanPhone && national !== e164NoPlus) {
                    conditions.push({ phone: national });
                    conditions.push({ secondaryPhone: national });
                }
            }

            if (email) {
                conditions.push({ email, organisationId });
            }

            const where: any = {
                OR: conditions,
                isDeleted: false,
                organisationId
            };

            // BRANCH ISOLATION LOGIC:
            // "in the same branch same lead should not exist twice thats it"
            // We strictly isolate the check to the provided branchId.
            if (branchId) {
                where.branchId = branchId;
            }

            console.log('[DuplicateLeadService] Checking duplicate with:', {
                phone: cleanPhone,
                email,
                organisationId,
                branchId,
                where
            });

            // Check for existing lead IN THE SAME BRANCH
            const existingLead = await prisma.lead.findFirst({
                where,
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (existingLead) {
                // Determine what matched
                let matchedBy: 'phone' | 'email' | 'whatsapp' = 'phone';
                if (email && existingLead.email === email) {
                    matchedBy = 'email';
                } else if (existingLead.phone === cleanPhone) {
                    matchedBy = 'phone';
                }

                console.log('[DuplicateLeadService] Duplicate found:', {
                    leadId: existingLead.id,
                    branch: existingLead.branch?.name,
                    matchedBy
                });

                return {
                    isDuplicate: true,
                    existingLead,
                    matchedBy
                };
            }

            console.log('[DuplicateLeadService] No duplicate found in same branch');
            return { isDuplicate: false };
        } catch (error) {
            console.error('[DuplicateLeadService] Error checking duplicate:', error);
            throw error;
        }
    },

    /**
     * Handle re-enquiry: Update existing lead and notify owner/manager
     */
    async handleReEnquiry(
        existingLead: any,
        newData: ReEnquiryData,
        organisationId: string
    ): Promise<any> {
        try {
            const now = new Date();

            // Update existing lead with latest contact info if provided
            const updatedLead = await prisma.lead.update({
                where: { id: existingLead.id },
                data: {
                    firstName: newData.firstName || existingLead.firstName,
                    lastName: newData.lastName || existingLead.lastName,
                    email: (newData.email && newData.email.trim() !== '') ? newData.email.trim() : existingLead.email,
                    company: newData.company || existingLead.company,
                    status: (newData.stage && (!existingLead.status || ['new', 're_enquiry'].includes(existingLead.status.toLowerCase())))
                        ? newData.stage.toLowerCase()
                        : 're_enquiry',
                    stage: newData.stage || existingLead.stage,
                    isReEnquiry: true,
                    isDeleted: false, // Restore if it was deleted
                    reEnquiryCount: { increment: 1 },
                    lastEnquiryDate: now,
                    enquiryAbout: newData.enquiryAbout || newData.sourceDetails?.message || existingLead.enquiryAbout,
                    // Update source details to track re-enquiry
                    sourceDetails: {
                        ...(existingLead.sourceDetails as any || {}),
                        reEnquiries: [
                            ...((existingLead.sourceDetails as any)?.reEnquiries || []),
                            {
                                date: now.toISOString(),
                                source: newData.source,
                                details: newData.sourceDetails
                            }
                        ]
                    }
                },
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            reportsToId: true
                        }
                    }
                }
            });

            // Create interaction record for timeline
            await prisma.interaction.create({
                data: {
                    type: 'other',
                    direction: 'inbound',
                    subject: 'Re-Enquiry Received',
                    description: `Lead ${existingLead.firstName} ${existingLead.lastName} has enquired again. This is re-enquiry #${updatedLead.reEnquiryCount}. Previous status: ${existingLead.status}`,
                    date: now,
                    leadId: existingLead.id,
                    createdById: existingLead.assignedToId,
                    organisationId
                }
            });

            // Log in LeadHistory for ownership history timeline
            await prisma.leadHistory.create({
                data: {
                    leadId: existingLead.id,
                    reason: `Re-Enquiry received from ${newData.source || 'Website'}`,
                    fieldName: 'status',
                    oldValue: existingLead.status,
                    newValue: 're_enquiry',
                    createdAt: now
                }
            });

            // Notify the assigned owner
            if (updatedLead.assignedToId) {
                await this.notifyOwner(updatedLead, organisationId);
            }

            // Notify the manager if exists
            const managerId = updatedLead.assignedTo?.reportsToId;
            if (managerId) {
                await this.notifyManager(updatedLead, managerId, organisationId);
            }

            console.log(`[DuplicateLeadService] Re-enquiry handled for lead ${existingLead.id}`);
            return updatedLead;
        } catch (error) {
            console.error('[DuplicateLeadService] Error handling re-enquiry:', error);
            throw error;
        }
    },

    /**
     * Notify lead owner about re-enquiry
     */
    async notifyOwner(lead: any, organisationId: string): Promise<void> {
        try {
            const { NotificationService } = await import('./notificationService');

            const ownerId = lead.assignedToId || lead.assignedTo?.id;
            if (!ownerId) {
                console.log(`[DuplicateLeadService] No owner to notify for lead ${lead.id}`);
                return;
            }

            await NotificationService.send(
                ownerId,
                'Re-Enquiry Alert',
                `🔄 ${lead.firstName} ${lead.lastName} has enquired again! This is their ${lead.reEnquiryCount}${this.getOrdinalSuffix(lead.reEnquiryCount)} enquiry. The lead is still interested - follow up immediately.`,
                'warning'
            );

            console.log(`[DuplicateLeadService] Owner notified for lead ${lead.id}`);
        } catch (error) {
            console.error('[DuplicateLeadService] Error notifying owner:', error);
        }
    },

    /**
     * Notify manager about re-enquiry
     */
    async notifyManager(lead: any, managerId: string, organisationId: string): Promise<void> {
        try {
            const { NotificationService } = await import('./notificationService');

            const ownerName = lead.assignedTo
                ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                : 'Unknown';

            await NotificationService.send(
                managerId,
                'Team Re-Enquiry Alert',
                `🔄 Re-enquiry detected: ${lead.firstName} ${lead.lastName} (assigned to ${ownerName}) has enquired again. Re-enquiry count: ${lead.reEnquiryCount}`,
                'info'
            );

            console.log(`[DuplicateLeadService] Manager notified for lead ${lead.id}`);
        } catch (error) {
            console.error('[DuplicateLeadService] Error notifying manager:', error);
        }
    },

    /**
     * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
     */
    getOrdinalSuffix(num: number): string {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    },

    /**
     * Find all potential duplicates in the system
     */
    async findDuplicates(organisationId: string): Promise<any[]> {
        try {
            // Find leads with duplicate phone numbers WITHIN THE SAME BRANCH
            const duplicatesByPhone = await prisma.$queryRaw<any[]>`
                SELECT phone, "branchId", COUNT(*) as count, 
                       array_agg(id) as lead_ids,
                       array_agg("firstName" || ' ' || "lastName") as names
                FROM "Lead"
                WHERE "organisationId" = ${organisationId}
                  AND "isDeleted" = false
                  AND phone IS NOT NULL
                  AND phone != ''
                GROUP BY phone, "branchId"
                HAVING COUNT(*) > 1
            `;

            // Find leads with duplicate emails WITHIN THE SAME BRANCH
            const duplicatesByEmail = await prisma.$queryRaw<any[]>`
                SELECT email, "branchId", COUNT(*) as count,
                       array_agg(id) as lead_ids,
                       array_agg("firstName" || ' ' || "lastName") as names
                FROM "Lead"
                WHERE "organisationId" = ${organisationId}
                  AND "isDeleted" = false
                  AND email IS NOT NULL
                  AND email != ''
                GROUP BY email, "branchId"
                HAVING COUNT(*) > 1
            `;

            return [
                ...duplicatesByPhone.map(d => ({
                    ...d,
                    count: Number(d.count),
                    type: 'phone'
                })),
                ...duplicatesByEmail.map(d => ({
                    ...d,
                    count: Number(d.count),
                    type: 'email'
                }))
            ];
        } catch (error) {
            console.error('[DuplicateLeadService] Error finding duplicates:', error);
            return [];
        }
    },

    /**
     * Get re-enquiry leads for an organization
     */
    async getReEnquiryLeads(organisationId: string, branchId?: string, limit = 50): Promise<any[]> {
        try {
            const where: any = {
                organisationId,
                isDeleted: false,
                isReEnquiry: true
            };

            if (branchId) {
                where.branchId = branchId;
            }

            const reEnquiryLeads = await prisma.lead.findMany({
                where,
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    lastEnquiryDate: 'desc'
                },
                take: limit
            });

            return reEnquiryLeads;
        } catch (error) {
            console.error('[DuplicateLeadService] Error getting re-enquiry leads:', error);
            return [];
        }
    }
};

export default DuplicateLeadService;
