import { Request, Response } from 'express';
import twilio from 'twilio';
import { getOrgId } from '../utils/hierarchyUtils';
import { TelephonyService } from '../services/telephonyService';
import { synchronizeDurations } from '../utils/callUtils';
import prisma from '../config/prisma';


const VoiceResponse = twilio.twiml.VoiceResponse;

// Voice Webhook (Inbound or Outbound Answered)
export const handleVoiceWebhook = async (req: Request, res: Response) => {
    const { orgId, leadId, userId } = req.query; // Added leadId and userId from query
    const { CallSid, From } = req.body; 

    const twiml = new VoiceResponse();

    try {
        if (!orgId || typeof orgId !== 'string') {
            console.error('Missing orgId in webhook');
            twiml.say('Configuration error.');
            res.type('text/xml').send(twiml.toString());
            return;
        }

        const org = await prisma.organisation.findUnique({
            where: { id: orgId },
            include: { callSettings: true }
        });

        if (!org) {
            twiml.say('Organization not found.');
            res.type('text/xml').send(twiml.toString());
            return;
        }

        const integrations = org.integrations as any;
        const twilioConfig = integrations?.twilio;

        // Check recording settings
        const shouldRecord = org.callSettings?.autoRecordInbound ?? true;

        // CHECK FOR EXISTING INTERACTION (Created by makeOutboundCall)
        const existingInteraction = await prisma.interaction.findFirst({
            where: {
                organisationId: orgId,
                description: { contains: CallSid }
            }
        });

        if (existingInteraction) {
            console.log(`[Telephony] Found existing interaction ${existingInteraction.id} for CallSid ${CallSid}. Skipping duplicate creation.`);
            return handleVoiceResponse(twiml, twilioConfig, shouldRecord, res, orgId);
        }

        // Create Interaction Data
        const interactionData: any = {
            type: 'call',
            direction: 'inbound', 
            subject: `Call with ${From}`,
            phoneNumber: From,
            callStatus: 'initiated',
            description: `Twilio CallSid: ${CallSid}`,
            recordingUrl: null,
            organisation: { connect: { id: orgId } },
        };

        // Set owner if provided (outbound calls)
        if (userId && typeof userId === 'string') {
            interactionData.createdBy = { connect: { id: userId } };
        }

        // If leadId is passed (e.g. from Click-to-Call), connect it
        if (leadId && typeof leadId === 'string') {
            interactionData.lead = { connect: { id: leadId } };
            interactionData.direction = 'outbound';
            interactionData.subject = `Outbound Call to ${From}`;
        } else if (From) {
            // Fix: Automatic lead lookup for inbound calls
            const cleanFrom = From.replace(/[^0-9]/g, '');
            const last10 = cleanFrom.slice(-10);
            if (last10.length >= 10) {
                const variations = Array.from(new Set([
                    last10,
                    `+91${last10}`,
                    `91${last10}`,
                    `0${last10}`,
                    cleanFrom,
                    From
                ].filter(Boolean)));

                const foundLead = await prisma.lead.findFirst({
                    where: {
                        organisationId: orgId,
                        isDeleted: false,
                        OR: [
                            { phone: { in: variations } },
                            { secondaryPhone: { in: variations } }
                        ]
                    },
                    select: { id: true, firstName: true, lastName: true }
                });

                if (foundLead) {
                    interactionData.lead = { connect: { id: foundLead.id } };
                    interactionData.subject = `Call from ${foundLead.firstName} ${foundLead.lastName || ''}`;
                    console.log(`[Telephony] Inbound call matched to Lead: ${foundLead.id} (${foundLead.firstName})`);
                } else {
                    // MISSING CALL FIX: If it's an inbound call, we might want to log it even if not a lead
                    // Especially if the status will later become 'no-answer' or 'missed'
                    const canSync = org.callSettings ? org.callSettings.syncNonCrmContacts : true;
                    if (!canSync) {
                        // We still allow it to continue IF we want to capture missed calls
                        // But for now, we follow the sync setting UNLESS we can detect 'missed' early
                        // Since missed calls are often detected at the END (status webhook), we log it 
                        // as 'initiated' and only discard later if needed.
                        console.log(`[Telephony] Unknown number ${From} - proceeding to capture potential missed call`);
                    }
                }
            }
        }

        // Create Interaction Record
        await prisma.interaction.create({
            data: interactionData
        });

        return handleVoiceResponse(twiml, twilioConfig, shouldRecord, res, orgId);
    } catch (error) {
        console.error('Twilio Webhook Error:', error);
        twiml.say('An application error occurred.');
        res.type('text/xml').send(twiml.toString());
    }
};

/**
 * Helper to handle the TwiML response (Dial/Record) logic centrally
 */
const handleVoiceResponse = (twiml: any, twilioConfig: any, shouldRecord: boolean, res: Response, orgId: string) => {
    if (shouldRecord) {
        const forwardTo = twilioConfig?.forwardTo;
        if (forwardTo) {
            const dial = twiml.dial({
                record: 'record-from-ringing',
                action: `/api/telephony/webhook/status?orgId=${orgId}`,
            });
            dial.number(forwardTo);
        } else {
            twiml.say('No forwarding number configured.');
            twiml.record({
                action: `/api/telephony/webhook/status?orgId=${orgId}`,
                maxLength: 120
            });
        }
    } else {
        const forwardTo = twilioConfig?.forwardTo;
        if (forwardTo) {
            twiml.dial(forwardTo);
        } else {
            twiml.say('Thank you for calling.');
        }
    }
    res.type('text/xml').send(twiml.toString());
};

export const handleStatusWebhook = async (req: Request, res: Response) => {
    const { orgId } = req.query;
    const { CallSid, RecordingUrl, RecordingDuration, CallStatus } = req.body;

    try {
        if (!orgId) {
            return res.status(400).send('No orgId');
        }

        console.log(`Twilio Status: ${CallStatus}, Recording: ${RecordingUrl}`);

        // Find the interaction by CallSid
        // Since we stored CallSid in description safely or subject... 
        // This is fuzzy. Better to have stored it properly. 
        // For now, finding the most recent call with that description substring
        const interaction = await prisma.interaction.findFirst({
            where: {
                organisationId: orgId as string,
                description: { contains: CallSid }
            }
        });

        if (interaction) {
            const data: any = {
                callStatus: CallStatus
            };
            if (RecordingUrl) {
                data.recordingUrl = RecordingUrl;
            }
            if (RecordingDuration) {
                data.recordingDuration = parseInt(RecordingDuration);
                synchronizeDurations(data);
            }

            await prisma.interaction.update({
                where: { id: interaction.id },
                data
            });

            // Emit Socket event logic here if needed
        }

        res.sendStatus(200);

    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

export const makeOutboundCall = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(user);
        const { to, leadId } = req.body;

        if (!to) return res.status(400).json({ message: 'Phone number required' });

        if (!orgId) {
            return res.status(400).json({ message: 'Organisation not found' });
        }
        const telephonyService = await TelephonyService.getClientForOrg(orgId);

        if (!telephonyService) {
            return res.status(400).json({ message: 'Telephony not configured' });
        }

        // Pass leadId and userId to webhook so we can link the call and attribute it to the agent
        let callbackUrl = `${process.env.API_URL}/api/telephony/webhook/voice?orgId=${orgId}`;
        if (leadId) {
            callbackUrl += `&leadId=${leadId}`;
        }
        callbackUrl += `&userId=${user.id}`;

        const call = await telephonyService.makeCall(to, callbackUrl);

        // CREATE INTERACTION IMMEDIATELY
        // This ensures the call is logged even if the webhook fails or the user hangs up early
        await prisma.interaction.create({
            data: {
                type: 'call',
                direction: 'outbound',
                subject: `Outbound Call to ${to}`,
                phoneNumber: to,
                callStatus: 'initiated',
                description: `Twilio CallSid: ${call.sid}`,
                organisation: { connect: { id: orgId } },
                createdBy: { connect: { id: user.id } },
                lead: leadId ? { connect: { id: leadId } } : undefined,
                date: new Date()
            }
        });

        res.json({ message: 'Call initiated', callSid: call.sid });

    } catch (error) {
        console.error('Outbound Call Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
