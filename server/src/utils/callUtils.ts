
type Interaction = any;

/**
 * Utility to resolve the best duration for a call based on multiple sources.
 * Priority: Hardware (Carrier) > Recording (File) > Duration (Estimated)
 * 
 * @returns Duration in seconds
 */
export function resolveBestDurationSeconds(interaction: Partial<Interaction> | any): number {
    if (interaction.hardwareDuration && interaction.hardwareDuration > 0) {
        return interaction.hardwareDuration;
    }
    if (interaction.recordingDuration && interaction.recordingDuration > 0) {
        return interaction.recordingDuration;
    }
    if (interaction.duration && interaction.duration > 0) {
        return Math.round(interaction.duration * 60);
    }
    return 0;
}

/**
 * Normalizes a raw duration value.
 * Some Android apps/libraries report milliseconds instead of seconds.
 * If a duration is unrealistically high (e.g. > 10 hours for a phone call), 
 * we treat it as milliseconds.
 */
export function normalizeDuration(raw: any): number {
    let val = parseInt(raw, 10) || 0;
    // 36000 seconds = 10 hours. If it's more than that, it's likely ms.
    if (val > 36000) {
        return Math.round(val / 1000);
    }
    return val;
}

/**
 * Ensures both duration (minutes) and recordingDuration (seconds) are synchronized.
 * If one is provided but not the other, it calculates the missing one.
 */
export function synchronizeDurations(data: any) {
    // Normalize inputs first to prevent unit mismatches
    if (data.hardwareDuration !== undefined && data.hardwareDuration !== null) {
        data.hardwareDuration = normalizeDuration(data.hardwareDuration);
    }
    if (data.recordingDuration !== undefined && data.recordingDuration !== null) {
        data.recordingDuration = normalizeDuration(data.recordingDuration);
    }

    const hasHardware = data.hardwareDuration !== undefined && data.hardwareDuration !== null;
    const hasRecording = data.recordingDuration !== undefined && data.recordingDuration !== null;
    const hasDuration = data.duration !== undefined && data.duration !== null;

    if (hasHardware && !hasRecording) {
        data.recordingDuration = data.hardwareDuration;
    }

    if (hasHardware && !hasDuration) {
        data.duration = data.hardwareDuration / 60;
    } else if (hasRecording && !hasDuration) {
        data.duration = data.recordingDuration / 60;
    } else if (hasDuration && !hasRecording) {
        data.recordingDuration = Math.round(data.duration * 60);
    }

    // Round duration to 2 decimal places for DB consistency
    if (data.duration) {
        data.duration = Math.round(data.duration * 100) / 100;
    }
}

/**
 * Generates a standard human-readable description for a call duration.
 */
export function formatCallDurationDescription(seconds: number, options: { hasRecording?: boolean, isCarrierVerified?: boolean } = {}): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    let desc = `Duration: ${mins}m ${secs}s`;
    
    if (options.hasRecording) desc += ' (Recording attached)';
    if (options.isCarrierVerified) desc += ' [Carrier Verified]';
    
    return desc;
}
