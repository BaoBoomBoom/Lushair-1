export interface LatestDetectionRecord {
    recordId?: number;
    createTime?: string;
    reportId?: string;
    userId?: string;
}

export interface LatestSelfieRecord {
    id?: number;
    position?: string;
    stage?: number;
    image?: string;
    extInfo?: string | null;
    createTime?: string | null;
    createdTime?: string | null;
    reportId?: string | null;
    userId?: string;
}

function recordTimestamp(value?: string | null): number {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

export function pickLatestScanRecord(
    detection: LatestDetectionRecord | null | undefined,
    selfie: LatestSelfieRecord | null | undefined,
): { type: 'advancedScan' | 'phoneCamera'; record: LatestDetectionRecord | LatestSelfieRecord } | null {
    const detectionTime = recordTimestamp(detection?.createTime);
    const selfieTime = recordTimestamp(selfie?.createTime || selfie?.createdTime);

    if (!detection?.recordId && !selfie?.id) return null;
    if (detectionTime >= selfieTime && detection?.recordId) {
        return { type: 'advancedScan', record: detection };
    }
    if (selfie?.id) {
        return { type: 'phoneCamera', record: selfie };
    }
    if (detection?.recordId) {
        return { type: 'advancedScan', record: detection };
    }
    return null;
}

export function navigateToLatestScanResult(
    detection: LatestDetectionRecord | null | undefined,
    selfie: LatestSelfieRecord | null | undefined,
    fallbackUserId?: string,
): boolean {
    const latest = pickLatestScanRecord(detection, selfie);
    if (!latest) return false;

    if (latest.type === 'phoneCamera') {
        const data = latest.record as LatestSelfieRecord;
        const userId = data.userId || fallbackUserId || '';
        const reportIdParam = data.reportId ? `&reportId=${encodeURIComponent(data.reportId)}` : '';
        uni.navigateTo({
            url: `/pages/Selfie/results?position=${encodeURIComponent(data.position || '')}&stage=${data.stage || 0}&image=${encodeURIComponent(data.image || '')}&extInfo=${encodeURIComponent(data.extInfo || '')}&userId=${userId}&from=home&createTime=${encodeURIComponent(data.createTime || data.createdTime || '')}&id=${data.id}${reportIdParam}`,
        });
        return true;
    }

    const data = latest.record as LatestDetectionRecord;
    const userId = data.userId || fallbackUserId || '';
    const reportIdParam = data.reportId ? `&reportId=${encodeURIComponent(data.reportId)}` : '';
    uni.navigateTo({
        url: `/pages/trichoscan/advanced-result?id=${data.recordId}&pushType=1&userId=${userId}${reportIdParam}&from=home`,
    });
    return true;
}
