import { get, ProjectBrand } from '@/utils/request';
import { decompressBase64Gzip } from '@/utils/decompress';

export interface LatestDetectionRecord {
    recordId?: number;
    createTime?: string;
    generatedAt?: string;
    reportId?: string;
    aiReportId?: string | null;
    userId?: string;
    scalpScore?: string;
    hair?: string;
    scalp?: string;
    follicle?: string;
}

export interface LatestSelfieRecord {
    id?: number;
    position?: string;
    stage?: number;
    image?: string;
    extInfo?: string | null;
    createTime?: string | null;
    createdTime?: string | null;
    generatedAt?: string | null;
    reportId?: string | null;
    aiReportId?: string | null;
    userId?: string;
}

function recordTimestamp(value?: string | null): number {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

// 优先使用 generatedAt，其次使用 createTime 或 createdTime
function getRecordTimestamp(record: LatestDetectionRecord | LatestSelfieRecord | null | undefined): number {
    if (!record) return 0;
    // 优先使用 generatedAt
    if ((record as any).generatedAt) {
        return recordTimestamp((record as any).generatedAt);
    }
    // 其次使用 createTime
    if (record.createTime) {
        return recordTimestamp(record.createTime);
    }
    // 最后尝试 createdTime (仅自拍)
    if ((record as LatestSelfieRecord).createdTime) {
        return recordTimestamp((record as LatestSelfieRecord).createdTime);
    }
    return 0;
}

export function pickLatestScanRecord(
    detection: LatestDetectionRecord | null | undefined,
    selfie: LatestSelfieRecord | null | undefined,
): { type: 'advancedScan' | 'phoneCamera'; record: LatestDetectionRecord | LatestSelfieRecord } | null {
    const detectionTime = getRecordTimestamp(detection);
    const selfieTime = getRecordTimestamp(selfie);

    // 新接口使用 reportId 而非 recordId
    const hasDetection = detection?.reportId || detection?.recordId;
    if (!hasDetection && !selfie?.id) return null;
    if (detectionTime >= selfieTime && hasDetection) {
        return { type: 'advancedScan', record: detection };
    }
    if (selfie?.id) {
        return { type: 'phoneCamera', record: selfie };
    }
    if (hasDetection) {
        return { type: 'advancedScan', record: detection };
    }
    return null;
}

export async function navigateToLatestScanResult(
    detection: LatestDetectionRecord | null | undefined,
    selfie: LatestSelfieRecord | null | undefined,
    fallbackUserId?: string,
): Promise<boolean> {
    const latest = pickLatestScanRecord(detection, selfie);
    if (!latest) return false;

    if (latest.type === 'phoneCamera') {
        const data = latest.record as LatestSelfieRecord;
        const userId = data.userId || fallbackUserId || '';
        const reportIdParam = data.reportId ? `&reportId=${encodeURIComponent(data.reportId)}` : '';
        const aiReportIdParam = data.aiReportId ? `&aiReportId=${encodeURIComponent(data.aiReportId)}` : '';
        uni.navigateTo({
            url: `/pages/Selfie/results?position=${encodeURIComponent(data.position || '')}&stage=${data.stage || 0}&image=${encodeURIComponent(data.image || '')}&extInfo=${encodeURIComponent(data.extInfo || '')}&userId=${userId}&from=home&createTime=${encodeURIComponent(data.createTime || data.createdTime || '')}&id=${data.id}${reportIdParam}${aiReportIdParam}`,
        });
        return true;
    }

    const data = latest.record as LatestDetectionRecord;
    const userId = data.userId || fallbackUserId || '';
    const reportIdParam = data.reportId ? `&reportId=${encodeURIComponent(data.reportId)}` : '';
    const aiReportIdParam = data.aiReportId ? `&aiReportId=${encodeURIComponent(data.aiReportId)}` : '';
    // 新接口使用 reportId 作为 id 参数
    const idParam = data.reportId || data.recordId;
    // 总体分数
    const overallScore = Math.round(parseFloat(data.scalpScore || '0') || 0);
    const overallScoreParam = '&overallScore=' + overallScore;

    let dataParam = '';
    // 如果有 reportId，尝试从 hair_reports_detail 获取详情（参考 hair/index.vue）
    if (data.reportId) {
        try {
            const REPORT_DETAIL_PATH = `/report/detail/${data.reportId}`;
            const detailResponse = await get(REPORT_DETAIL_PATH, {}, { brand: ProjectBrand.LUSHAIR_NEW });
            if (detailResponse?.detail) {
                const decompressed = await decompressBase64Gzip(detailResponse.detail);
                if (decompressed?.output) {
                    dataParam = '&data=' + encodeURIComponent(JSON.stringify(decompressed.output));
                }
            }
        } catch (error) {
            console.warn('[navigateToLatestScanResult] Failed to fetch detail:', error);
        }
    }

    uni.navigateTo({
        url: `/pages/trichoscan/advanced-result?id=${idParam}&pushType=1&userId=${userId}${reportIdParam}${aiReportIdParam}${dataParam}${overallScoreParam}&from=home`,
    });
    return true;
}
