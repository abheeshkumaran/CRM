
/**
 * Formats a duration in seconds into a human-readable string (e.g. 1m 5s)
 */
export function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
}

/**
 * Resolves the best duration in seconds from an interaction object.
 */
export function getBestDurationSeconds(meta: any): number {
    if (!meta) return 0;
    
    // Priority: Hardware > Recording > Minutes
    if (meta.hardwareDuration && meta.hardwareDuration > 0) {
        return meta.hardwareDuration;
    }
    if (meta.recordingDuration && meta.recordingDuration > 0) {
        return meta.recordingDuration;
    }
    if (meta.duration && meta.duration > 0) {
        // duration is in minutes
        return meta.duration * 60;
    }
    return 0;
}
