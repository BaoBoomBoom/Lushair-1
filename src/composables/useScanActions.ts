/**
 * Scan actions — native bridge targets aligned with:
 * - iOS: https://github.com/Han111/Siyuejia_iOS.git
 *   HCMainWebViewController → messageHandler "quick" → gotoTrichoscopeFunc:@200
 * - Android: https://github.com/Han111/Lushair-android.git
 *   WebView JavascriptInterface "quick" (same payload as legacy H5)
 */
import { getMerchantScanCustomer } from '@/composables/useMerchantScanCustomer';
import { setUserIdToApp } from '@/composables/useAuthFlow';
export type ScanActionType =
    | 'phone'
    | 'quick'
    | 'lushairOne'
    | 'advanced'
    | 'advancedByTask'
    | 'device';

function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const u = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document);
}

type NativeWindow = Window & {
    webkit?: { messageHandlers?: Record<string, { postMessage: (d: unknown) => void }> };
    android?: Record<string, (d: string) => void>;
};

function postNativeBridge(handlerName: string, payload: Record<string, unknown>): Promise<boolean> {
    return new Promise((resolve) => {
        const ios = isIOS();
        const w = window as NativeWindow;
        const message = JSON.stringify(payload);

        // 回退 handler 映射 (Fallback handler mappings)
        const fallbackHandlers: Record<string, string[]> = {
            lushairPro: ['advanced', 'openDermascope'],
            lushairOne: ['advanced', 'quick', 'openDermascope'],
            advanced: ['lushairPro', 'openDermascope'],
        };

        const getAvailableHandler = (targetHandler: string): string | null => {
            if (!ios || !w.webkit?.messageHandlers) return null;
            if (w.webkit.messageHandlers[targetHandler]) return targetHandler;
            const fallbacks = fallbackHandlers[targetHandler] || [];
            for (const fb of fallbacks) {
                if (w.webkit.messageHandlers[fb]) {
                    console.warn(`[useScanActions] Handler ${targetHandler} not found, using fallback ${fb}`);
                    return fb;
                }
            }
            return null;
        };

        const activeHandler = getAvailableHandler(handlerName);

        if (ios && activeHandler && w.webkit?.messageHandlers?.[activeHandler]) {
            w.webkit.messageHandlers[activeHandler].postMessage(payload);
            resolve(true);
            return;
        }

        if (w.android?.[handlerName]) {
            w.android[handlerName](message);
            resolve(true);
            return;
        }

        // 如果既非 iOS 也非 Android App 环境（即纯 Web 浏览器），直接返回 false (Return false directly if not in App environment)
        if (!ios && !w.android) {
            resolve(false);
            return;
        }

        // 重试机制：从原生页面返回后 messageHandlers 可能尚未就绪 (Retry mechanism: messageHandlers may not be ready after returning from native page)
        let retryCount = 0;
        const maxRetries = 8;
        const retryInterval = 50; // ms

        const retryTimer = setInterval(() => {
            retryCount++;
            const retryW = window as NativeWindow;
            const retryHandler = getAvailableHandler(handlerName);

            if (retryHandler && retryW.webkit?.messageHandlers?.[retryHandler]) {
                clearInterval(retryTimer);
                retryW.webkit.messageHandlers[retryHandler].postMessage(payload);
                console.log(`[useScanActions] Bridge ${retryHandler} succeeded after ${retryCount} retries`);
                resolve(true);
                return;
            }

            if (retryW.android?.[handlerName]) {
                clearInterval(retryTimer);
                retryW.android[handlerName](message);
                console.log(`[useScanActions] Bridge ${handlerName} succeeded after ${retryCount} retries`);
                resolve(true);
                return;
            }

            if (retryCount >= maxRetries) {
                clearInterval(retryTimer);
                console.warn(`[useScanActions] Bridge ${handlerName} failed after ${maxRetries} retries`);
                resolve(false);
            }
        }, retryInterval);
    });
}

function syncNativeScanUserId() {
    const merchantCustomer = getMerchantScanCustomer();
    if (merchantCustomer?.userId) {
        setUserIdToApp(merchantCustomer.userId);
    }
}

/** Lushair One — Lushair One (iOS detectionType 200). */
export function runLushairOneScan(): Promise<boolean> {
    syncNativeScanUserId();
    uni.setStorageSync('lastTrichoScanType', 'lushairOne');
    return postNativeBridge('advanced', { data: 'advanced' });
}

/** Lushair Pro — Lushair Pro (iOS detectionType 302). */
export function runLushairProScan(): Promise<boolean> {
    syncNativeScanUserId();
    uni.setStorageSync('lastTrichoScanType', 'lushairPro');
    return postNativeBridge('lushairPro', { data: 'lushairPro' });
}

export function runScanAction(type: ScanActionType): Promise<boolean> {
    switch (type) {
        case 'advancedByTask':
            return postNativeBridge('advancedByTask', { data: 'advancedByTask' });
        case 'advanced':
            return runLushairProScan();
        case 'quick':
        case 'lushairOne':
            return runLushairOneScan();
        case 'phone':
            uni.navigateTo({ url: '/pages/Selfie/scan-instructions' });
            return Promise.resolve(true);
        case 'device': {
            const deviceUrl = 'https://lushair.net/getlushair/p/l1';
            return postNativeBridge('getDevice', { data: deviceUrl }).then((ok) => {
                if (ok) return true;
                window.open(deviceUrl, '_blank');
                return true;
            });
        }
        default:
            return Promise.resolve(false);
    }
}
