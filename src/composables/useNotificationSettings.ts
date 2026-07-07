import { ref } from 'vue';

export type ReminderFrequency = 'daily' | 'every3days' | 'weekly';

export interface ReminderSchedule {
    frequency: ReminderFrequency;
    time: string;
}

export interface NotificationSettings {
    scanReminder: boolean;
    routineReminder: boolean;
    weatherReminder: boolean;
    recommendationReminder: boolean;
    schedules: Record<ReminderKey, ReminderSchedule>;
}

export type ReminderKey = keyof Omit<NotificationSettings, 'schedules'>;

const STORAGE_KEY = 'notificationSettings';

const defaultSchedule = (): ReminderSchedule => ({
    frequency: 'every3days',
    time: '09:00',
});

const defaultSettings = (): NotificationSettings => ({
    scanReminder: false,
    routineReminder: false,
    weatherReminder: false,
    recommendationReminder: false,
    schedules: {
        scanReminder: defaultSchedule(),
        routineReminder: { frequency: 'daily', time: '08:00' },
        weatherReminder: { frequency: 'daily', time: '07:30' },
        recommendationReminder: { frequency: 'weekly', time: '10:00' },
    },
});

const settings = ref<NotificationSettings>(loadSettings());

function loadSettings(): NotificationSettings {
    try {
        const stored = uni.getStorageSync(STORAGE_KEY);
        if (stored && typeof stored === 'object') {
            const base = defaultSettings();
            return {
                ...base,
                ...stored,
                schedules: {
                    ...base.schedules,
                    ...(stored.schedules || {}),
                },
            };
        }
    } catch {
        // ignore
    }
    return defaultSettings();
}

function saveSettings(next: NotificationSettings) {
    settings.value = { ...next };
    uni.setStorageSync(STORAGE_KEY, settings.value);
    syncToNative(settings.value);
}

function syncToNative(next: NotificationSettings, city = '') {
    if (typeof navigator === 'undefined') return;

    const payload = JSON.stringify({
        data: 'notificationSettings',
        ...next,
        city,
    });
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document);
    const w = window as Window & {
        webkit?: { messageHandlers?: Record<string, { postMessage: (d: unknown) => void }> };
        android?: Record<string, (d: string) => void>;
    };

    if (isiOS && w.webkit?.messageHandlers?.notifications) {
        w.webkit.messageHandlers.notifications.postMessage(payload);
    } else if (w.android?.notifications) {
        w.android.notifications(payload);
    }
}

export function useNotificationSettings() {
    const refresh = () => {
        settings.value = loadSettings();
    };

    const updateSetting = (key: ReminderKey, enabled: boolean, city = '') => {
        const next = { ...settings.value, [key]: enabled };
        saveSettings(next);
        syncToNative(next, city);
    };

    const updateSchedule = (key: ReminderKey, schedule: Partial<ReminderSchedule>, city = '') => {
        const next = {
            ...settings.value,
            schedules: {
                ...settings.value.schedules,
                [key]: {
                    ...settings.value.schedules[key],
                    ...schedule,
                },
            },
        };
        saveSettings(next);
        syncToNative(next, city);
    };

    return {
        settings,
        refresh,
        updateSetting,
        updateSchedule,
        syncToNative: (city = '') => syncToNative(settings.value, city),
    };
}
