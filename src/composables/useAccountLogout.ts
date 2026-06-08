import { useUserStore } from '@/stores/userStore';

declare var window: Window & {
    webkit?: { messageHandlers?: Record<string, { postMessage: (d: unknown) => void }> };
    android?: Record<string, (d: string) => void>;
};

function notifyNativeLogout() {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document);

    if (isiOS && window.webkit?.messageHandlers?.logout) {
        window.webkit.messageHandlers.logout.postMessage('logout');
        return true;
    }
    if (window.android?.logout) {
        window.android.logout('logout');
        return true;
    }
    return false;
}

export function performAccountLogout() {
    try {
        const settings = uni.getStorageSync('settings');
        const locale = uni.getStorageSync('locale');
        const globalState = uni.getStorageSync('globalState');

        uni.clearStorageSync();

        if (settings) uni.setStorageSync('settings', settings);
        if (locale) uni.setStorageSync('locale', locale);
        if (globalState) {
            globalState.flags.isFirstLaunch = false;
            globalState.flags.hasCompletedOnboarding = false;
            uni.setStorageSync('globalState', globalState);
        }
    } catch (error) {
        console.error('Logout storage reset failed:', error);
    }

    try {
        useUserStore().clearUserInfo();
    } catch {
        uni.removeStorageSync('userInfo');
    }

    if (notifyNativeLogout()) return;

    uni.reLaunch({
        url: '/pages/landing/intro',
        fail: () => {
            if (typeof window !== 'undefined') {
                window.location.hash = '#/pages/landing/intro';
            }
        },
    });
}
