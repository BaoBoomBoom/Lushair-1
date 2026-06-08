/**
 * Scan actions — native bridge targets aligned with:
 * - iOS: https://github.com/Han111/Siyuejia_iOS.git
 *   HCMainWebViewController → messageHandler "quick" → gotoTrichoscopeFunc:@200
 * - Android: https://github.com/Han111/Lushair-android.git
 *   WebView JavascriptInterface "quick" (same payload as legacy H5)
 */
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

function postNativeBridge(handlerName: string, payload: Record<string, unknown>): boolean {
    const ios = isIOS();
    const w = window as NativeWindow;
    const message = JSON.stringify(payload);

    if (ios && w.webkit?.messageHandlers?.[handlerName]) {
        w.webkit.messageHandlers[handlerName].postMessage(payload);
        return true;
    }

    if (w.android?.[handlerName]) {
        w.android[handlerName](message);
        return true;
    }

    return false;
}

/** Lushair One — single-spectral scan (iOS detectionType 200). */
export function runLushairOneScan(): boolean {
    return postNativeBridge('quick', { data: 'quick' });
}

/** Lushair Pro — tri-spectral scan (iOS detectionType 302). */
export function runLushairProScan(): boolean {
    return postNativeBridge('advanced', { data: 'advanced' });
}

export function runScanAction(type: ScanActionType): boolean {
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
            return true;
        case 'device': {
            const deviceUrl = 'https://lushair.net/getlushair/p/l1';
            if (postNativeBridge('getDevice', { data: deviceUrl })) {
                return true;
            }
            window.open(deviceUrl, '_blank');
            return true;
        }
        default:
            return false;
    }
}
