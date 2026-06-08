import { useUserStore } from '@/stores/userStore';
import { useGlobalStore } from '@/stores/globalStore';

const ONBOARDING_URL = '/pages/landing/intro';

function parseHashRoute() {
    if (typeof window === 'undefined') {
        return { path: '', params: new URLSearchParams() };
    }
    const hash = window.location.hash.replace(/^#/, '');
    const [path = '', query = ''] = hash.split('?');
    return {
        path: path.startsWith('/') ? path : `/${path}`,
        params: new URLSearchParams(query),
    };
}

export function shouldDevRedirectToOnboarding() {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;

    const { path, params } = parseHashRoute();
    if (params.get('skipOnboarding') === '1') return false;
    if (path.startsWith('/pages/landing') || path.startsWith('/pages/auth')) return false;

    const devEntryRoutes = ['', '/', '/pages/index/home', '/pages/index/index'];
    return devEntryRoutes.includes(path);
}

export function resetDevLoginState() {
    try {
        const userStore = useUserStore();
        userStore.clearUserInfo();
    } catch {
        uni.removeStorageSync('userInfo');
    }

    try {
        const globalStore = useGlobalStore();
        globalStore.setFlag('isFirstLaunch', true);
        globalStore.setFlag('hasCompletedOnboarding', false);
    } catch {
        const globalState = uni.getStorageSync('globalState');
        if (globalState?.flags) {
            globalState.flags.isFirstLaunch = true;
            globalState.flags.hasCompletedOnboarding = false;
            uni.setStorageSync('globalState', globalState);
        }
    }
}

export function goToDevOnboarding() {
    resetDevLoginState();
    uni.reLaunch({
        url: ONBOARDING_URL,
        fail: () => {
            if (typeof window !== 'undefined') {
                window.location.hash = '#/pages/landing/intro';
            }
        },
    });
}

export function maybeRedirectDevToOnboarding() {
    if (!shouldDevRedirectToOnboarding()) return;
    setTimeout(() => goToDevOnboarding(), 0);
}
