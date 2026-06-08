import { ref } from 'vue';
import { post } from '@/utils/request';

export interface DetectionRecordItem {
    recordId: number;
    userId: string;
    createTime: string;
    scalpScore?: string;
    reportId?: string;
}

export interface SelfieResultItem {
    id: number;
    userId: string;
    createTime: string | null;
    createdTime: string | null;
    reportId: string | null;
    stage?: number;
    position?: string;
    image?: string;
}

export interface ScanReportContext {
    reportId: string;
    scoreLabel: string;
    dateLabel: string;
}

export interface LatestScanReports {
    trichoscan: ScanReportContext | null;
    selfie: ScanReportContext | null;
    trichoscanReportId: string;
    selfieReportId: string;
    contextKey: string;
    hasAnyReport: boolean;
}

const STORAGE_TRICHOSCAN = 'ai_chat_trichoscan_reportId';
const STORAGE_SELFIE = 'ai_chat_selfie_reportId';
const STORAGE_CONTEXT_KEY = 'ai_chat_contextKey';

const _isLocalBundle = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:');

const AI_SERVER_BASE = 'http://43.156.213.63:5011';

function parseTime(value: string | null | undefined): number {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? 0 : ts;
}

function formatShortDate(value: string | null | undefined): string {
    if (!value) return '';
    try {
        const date = new Date(value);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

function pickLatestTrichoscan(records: DetectionRecordItem[]): DetectionRecordItem | null {
    return records
        .filter((item) => !!item.reportId)
        .sort((a, b) => parseTime(b.createTime) - parseTime(a.createTime))[0] || null;
}

function pickLatestSelfie(results: SelfieResultItem[]): SelfieResultItem | null {
    return results
        .filter((item) => !!item.reportId)
        .sort((a, b) => {
            const timeA = parseTime(a.createTime || a.createdTime);
            const timeB = parseTime(b.createTime || b.createdTime);
            return timeB - timeA;
        })[0] || null;
}

function buildTrichoscanContext(record: DetectionRecordItem): ScanReportContext {
    const score = record.scalpScore ? Math.round(parseFloat(record.scalpScore)) : null;
    return {
        reportId: record.reportId!,
        scoreLabel: score !== null && !Number.isNaN(score) ? String(score) : '',
        dateLabel: formatShortDate(record.createTime),
    };
}

function buildSelfieContext(result: SelfieResultItem): ScanReportContext {
    const stage = result.stage;
    return {
        reportId: result.reportId!,
        scoreLabel: stage ? `Stage ${stage}` : '',
        dateLabel: formatShortDate(result.createTime || result.createdTime),
    };
}

async function fetchDetectionRecords(userId: string): Promise<DetectionRecordItem[]> {
    try {
        const response = await post('user/getDetectionRecordList', { userId }) as { list?: DetectionRecordItem[] };
        return response.list || [];
    } catch (error) {
        console.error('[useLatestScanReports] Failed to fetch detection records:', error);
        return [];
    }
}

async function fetchSelfieResults(userId: string): Promise<SelfieResultItem[]> {
    try {
        const response = await post('user/getSelfieResultList', { userId }) as SelfieResultItem[];
        return response || [];
    } catch (error) {
        console.error('[useLatestScanReports] Failed to fetch selfie results:', error);
        return [];
    }
}

export function resolveUserId(userId?: string): string {
    if (userId) return userId;
    const localUserInfo = uni.getStorageSync('userInfo');
    const storedUserId = uni.getStorageSync('userId');
    return localUserInfo?.userId || storedUserId || '';
}

export function buildScanContextKey(trichoscanReportId: string, selfieReportId: string): string {
    return `${trichoscanReportId || ''}|${selfieReportId || ''}`;
}

export function persistScanReportIds(trichoscanReportId: string, selfieReportId: string) {
    try {
        if (trichoscanReportId) {
            uni.setStorageSync(STORAGE_TRICHOSCAN, trichoscanReportId);
        } else {
            uni.removeStorageSync(STORAGE_TRICHOSCAN);
        }
        if (selfieReportId) {
            uni.setStorageSync(STORAGE_SELFIE, selfieReportId);
        } else {
            uni.removeStorageSync(STORAGE_SELFIE);
        }
        uni.setStorageSync(STORAGE_CONTEXT_KEY, buildScanContextKey(trichoscanReportId, selfieReportId));
    } catch (error) {
        console.error('[useLatestScanReports] Failed to persist report ids:', error);
    }
}

export function readStoredScanReportIds() {
    return {
        trichoscanReportId: uni.getStorageSync(STORAGE_TRICHOSCAN) || '',
        selfieReportId: uni.getStorageSync(STORAGE_SELFIE) || '',
        contextKey: uni.getStorageSync(STORAGE_CONTEXT_KEY) || '',
    };
}

export function useLatestScanReports() {
    const loading = ref(false);
    const scanContext = ref<LatestScanReports>({
        trichoscan: null,
        selfie: null,
        trichoscanReportId: '',
        selfieReportId: '',
        contextKey: '',
        hasAnyReport: false,
    });

    async function loadLatestScanReports(userId?: string): Promise<LatestScanReports> {
        const resolvedUserId = resolveUserId(userId);
        if (!resolvedUserId) {
            const stored = readStoredScanReportIds();
            scanContext.value = {
                trichoscan: stored.trichoscanReportId
                    ? { reportId: stored.trichoscanReportId, scoreLabel: '', dateLabel: '' }
                    : null,
                selfie: stored.selfieReportId
                    ? { reportId: stored.selfieReportId, scoreLabel: '', dateLabel: '' }
                    : null,
                trichoscanReportId: stored.trichoscanReportId,
                selfieReportId: stored.selfieReportId,
                contextKey: stored.contextKey,
                hasAnyReport: !!(stored.trichoscanReportId || stored.selfieReportId),
            };
            return scanContext.value;
        }

        loading.value = true;
        try {
            const [detectionRecords, selfieResults] = await Promise.all([
                fetchDetectionRecords(resolvedUserId),
                fetchSelfieResults(resolvedUserId),
            ]);

            const latestTrichoscan = pickLatestTrichoscan(detectionRecords);
            const latestSelfie = pickLatestSelfie(selfieResults);

            const trichoscanReportId = latestTrichoscan?.reportId || '';
            const selfieReportId = latestSelfie?.reportId || '';
            const contextKey = buildScanContextKey(trichoscanReportId, selfieReportId);

            persistScanReportIds(trichoscanReportId, selfieReportId);

            scanContext.value = {
                trichoscan: latestTrichoscan ? buildTrichoscanContext(latestTrichoscan) : null,
                selfie: latestSelfie ? buildSelfieContext(latestSelfie) : null,
                trichoscanReportId,
                selfieReportId,
                contextKey,
                hasAnyReport: !!(trichoscanReportId || selfieReportId),
            };

            return scanContext.value;
        } finally {
            loading.value = false;
        }
    }

    return {
        loading,
        scanContext,
        loadLatestScanReports,
    };
}

export function buildChatReportPayload(options: {
    targetReportId?: string;
    trichoscanReportId?: string;
    selfieReportId?: string;
}) {
    const targetReportId = options.targetReportId || '';
    const trichoscanReportId = options.trichoscanReportId || '';
    const selfieReportId = options.selfieReportId || '';

    const primaryReportId = targetReportId || trichoscanReportId || selfieReportId;
    const payload: Record<string, string> = {};

    if (primaryReportId) {
        payload.reportId = primaryReportId;
    }
    if (trichoscanReportId && trichoscanReportId !== primaryReportId) {
        payload.trichoscanReportId = trichoscanReportId;
    }
    if (selfieReportId && selfieReportId !== primaryReportId) {
        payload.selfieReportId = selfieReportId;
    }

    return {
        primaryReportId,
        contextKey: buildScanContextKey(trichoscanReportId, selfieReportId),
        payload,
        hasAnyReport: !!(trichoscanReportId || selfieReportId || targetReportId),
    };
}

export async function fetchHairReportSummary(reportId: string): Promise<any | null> {
    if (!reportId) return null;

    const reportPath = `/api/v1/hair/report/${reportId}`;
    const reportUrl = _isLocalBundle
        ? AI_SERVER_BASE + reportPath
        : '/ai-api' + reportPath;

    try {
        const response: any = await new Promise((resolve, reject) => {
            uni.request({
                url: reportUrl,
                method: 'GET',
                header: { 'Content-Type': 'application/json' },
                timeout: 30000,
                success: (res) => {
                    if (res.statusCode === 200) {
                        resolve(res.data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                },
                fail: reject,
            });
        });
        return response?.data?.data || response?.data || response;
    } catch (error) {
        console.warn('[useLatestScanReports] Failed to fetch report summary:', reportId, error);
        return null;
    }
}
