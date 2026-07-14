/**
 * Utility for providing sensory feedback (audio/vibration) 
 * and system-level OS notifications.
 */

const NOTIFICATION_SOUND_PATH = '/sounds/notification.mp3';

// Web Audio API context for synthesized fallback
let audioCtx: AudioContext | null = null;

const playSynthesizedBeep = () => {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // Oscillator 1 (Main tone - C6)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.50, audioCtx.currentTime);
        
        gain1.gain.setValueAtTime(0, audioCtx.currentTime);
        gain1.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        // Oscillator 2 (Harmony - E6)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime);
        
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.3);
        
        osc2.start(audioCtx.currentTime + 0.05); // Slight arpeggio effect
        osc2.stop(audioCtx.currentTime + 0.35);
        
        console.log('[NotificationFeedback] Played simple notification sound');
    } catch (e) {
        console.error('[NotificationFeedback] Web Audio API failed:', e);
    }
};

/**
 * Plays a short, simple notification sound.
 */
export const playNotificationSound = () => {
    playSynthesizedBeep();
};

/**
 * Empty unlock audio function to satisfy Layout.tsx imports.
 * Web Audio API synthesizers are usually unlocked automatically on first user interaction,
 * so we just need a stub to avoid import errors.
 */
export const unlockAudio = () => {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        // Ignore
    }
};

/**
 * Triggers haptic feedback (vibration) on supported devices.
 */
export const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        // Standard pattern: 200ms vibration, 100ms pause, 200ms vibration
        navigator.vibrate([200, 100, 200]);
    }
};

/**
 * Shows a system-level popup notification using the Browser Notification API.
 * 
 * @param title Notification Title
 * @param message Notification Body
 * @param icon Optional Icon (defaults to logo)
 */
export const showSystemNotification = async (title: string, message: string, icon = '/logo.png') => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: message,
            icon,
            silent: true // We handle our own audio for consistency
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showSystemNotification(title, message, icon);
        }
    }
};

/**
 * Global trigger for all rich notification feedback.
 */
export const triggerRichNotification = (title: string, message: string) => {
    playNotificationSound();
    triggerHapticFeedback();
    
    // Only show system notification if the tab is not focused
    if (document.hidden) {
        showSystemNotification(title, message);
    }
};

/**
 * Requests necessary permissions for notifications.
 */
export const requestNotificationPermissions = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            await Notification.requestPermission();
        }
    }
};
