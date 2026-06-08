import { ref } from 'vue';

export interface NotificationSettings {
    scanReminder: boolean;
    routineReminder: boolean;
    weatherReminder: boolean;
    recommendationReminder: boolean;
}

const STORAGE_KEY = 'notificationSettings';

const defaultSettings = (): NotificationSettings => ({
    scanReminder: false,
    routineReminder: false,
    weatherReminder: false,
    recommendationReminder: false,
});

const settings = ref<NotificationSettings>(loadSettings());

function loadSettings(): NotificationSettings {
    try {
        const stored = uni.getStorageSync(STORAGE_KEY);
        if (stored && typeof stored === 'object') {
            return { ...defaultSettings(), ...stored };
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

    const updateSetting = (key: keyof NotificationSettings, enabled: boolean, city = '') => {
        const next = { ...settings.value, [key]: enabled };
        saveSettings(next);
        syncToNative(next, city);
    };

    return {
        settings,
        refresh,
        updateSetting,
        syncToNative: (city = '') => syncToNative(settings.value, city),
    };
}
