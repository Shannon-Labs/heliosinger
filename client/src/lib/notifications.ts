/**
 * Browser Notification Management for Heliosinger
 * 
 * Handles notification permissions and displays notifications for significant
 * space weather events
 */

export interface NotificationSettings {
  enabled: boolean;
  kpThresholds: boolean; // Notify on Kp threshold crossings
  conditionChanges: boolean; // Notify on condition changes
  velocityChanges: boolean; // Notify on large velocity changes
  bzEvents: boolean; // Notify on strong Bz events
  quietHours: {
    enabled: boolean;
    start: number; // Hour (0-23)
    end: number; // Hour (0-23)
  };
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  kpThresholds: true,
  conditionChanges: true,
  velocityChanges: true,
  bzEvents: true,
  quietHours: {
    enabled: false,
    start: 22, // 10 PM
    end: 7, // 7 AM
  },
  soundEnabled: false,
};

const NOTIFICATION_SETTINGS_KEY = 'heliosinger-notification-settings';
const LAST_NOTIFICATION_TIME_KEY = 'heliosinger-last-notification-time';
const MIN_NOTIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
}

/**
 * Check if notifications are allowed
 */
export function canSendNotifications(): boolean {
  if (!isNotificationSupported()) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Get notification settings from localStorage
 */
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load notification settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Save notification settings to localStorage
 */
export function saveNotificationSettings(settings: Partial<NotificationSettings>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getNotificationSettings();
    const updated = { ...existing, ...settings };
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save notification settings:', error);
  }
}

/**
 * Check if we're in quiet hours
 */
function isQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHours.enabled) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const { start, end } = settings.quietHours;
  
  // Handle quiet hours that span midnight
  if (start > end) {
    return currentHour >= start || currentHour < end;
  }
  
  return currentHour >= start && currentHour < end;
}

/**
 * Check if enough time has passed since last notification
 */
function canSendNotificationNow(): boolean {
  if (typeof window === 'undefined') return true;
  
  try {
    const lastTime = localStorage.getItem(LAST_NOTIFICATION_TIME_KEY);
    if (!lastTime) return true;
    
    const lastTimestamp = parseInt(lastTime, 10);
    const now = Date.now();
    
    return (now - lastTimestamp) >= MIN_NOTIFICATION_INTERVAL;
  } catch {
    return true;
  }
}

/**
 * Record notification sent time
 */
function recordNotificationSent(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LAST_NOTIFICATION_TIME_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to record notification time:', error);
  }
}

/**
 * Send a notification
 */
export function sendNotification(
  title: string,
  body: string,
  tag?: string
): void {
  if (!canSendNotifications()) return;
  
  const settings = getNotificationSettings();
  if (!settings.enabled) return;
  
  if (isQuietHours(settings)) {
    console.log('🌙 Quiet hours - notification suppressed');
    return;
  }
  
  if (!canSendNotificationNow()) {
    console.log('⏱️ Rate limit - notification suppressed');
    return;
  }
  
  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico', // Use site icon
      tag: tag || 'heliosinger-event', // Prevent duplicate notifications
      requireInteraction: false,
      silent: !settings.soundEnabled,
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    recordNotificationSent();
    
    console.log(`🔔 Notification sent: ${title}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Check for significant space weather events and send notifications
 */
export interface SpaceWeatherChange {
  previousKp?: number;
  currentKp?: number;
  previousCondition?: 'quiet' | 'moderate' | 'storm' | 'extreme';
  currentCondition?: 'quiet' | 'moderate' | 'storm' | 'extreme';
  previousVelocity?: number;
  currentVelocity?: number;
  previousBz?: number;
  currentBz?: number;
}

export function checkAndNotifyEvents(change: SpaceWeatherChange): void {
  const settings = getNotificationSettings();
  if (!settings.enabled || !canSendNotifications()) return;
  
  // Kp threshold crossings
  if (settings.kpThresholds && change.previousKp !== undefined && change.currentKp !== undefined) {
    const thresholds = [3, 5, 7];
    for (const threshold of thresholds) {
      if (change.previousKp < threshold && change.currentKp >= threshold) {
        sendNotification(
          'Heliosinger: Geomagnetic Activity Alert',
          `Kp index crossed ${threshold} - Current: ${change.currentKp.toFixed(1)}`,
          `kp-threshold-${threshold}`
        );
        return; // Only send one notification per check
      }
    }
  }
  
  // Condition changes
  if (settings.conditionChanges && 
      change.previousCondition && 
      change.currentCondition &&
      change.previousCondition !== change.currentCondition) {
    const conditionNames: Record<string, string> = {
      quiet: 'Quiet',
      moderate: 'Moderate',
      storm: 'Storm',
      extreme: 'Extreme'
    };
    
    sendNotification(
      'Heliosinger: Space Weather Change',
      `Condition changed from ${conditionNames[change.previousCondition]} to ${conditionNames[change.currentCondition]}`,
      'condition-change'
    );
    return;
  }
  
  // Large velocity changes
  if (settings.velocityChanges &&
      change.previousVelocity !== undefined &&
      change.currentVelocity !== undefined) {
    const velocityChange = Math.abs(change.currentVelocity - change.previousVelocity);
    if (velocityChange > 100) {
      sendNotification(
        'Heliosinger: Solar Wind Velocity Change',
        `Velocity changed by ${velocityChange.toFixed(1)} km/s (${change.previousVelocity.toFixed(1)} → ${change.currentVelocity.toFixed(1)} km/s)`,
        'velocity-change'
      );
      return;
    }
  }
  
  // Strong Bz events
  if (settings.bzEvents &&
      change.currentBz !== undefined &&
      change.currentBz < -10) {
    sendNotification(
      'Heliosinger: Strong Southward Bz',
      `Bz magnetic field is strongly negative: ${change.currentBz.toFixed(1)} nT (potential for auroras)`,
      'bz-event'
    );
    return;
  }
}

