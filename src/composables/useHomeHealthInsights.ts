import { ref } from 'vue';
import { get, ProjectBrand } from '@/utils/request';
import { useI18n } from 'vue-i18n';
import { getSelfieReports, getTrichoReports } from '@/utils/clerk';
import { decompressBase64Gzip } from '@/utils/decompress';
import {
    buildCareRecommendationPrompt,
    deriveHomeHealthFindings,
    extractTrichoscopyMetrics,
    formatSelfiePositionLabel,
    type HomeHealthFindings,
    type TrichoscopyMetrics,
} from '@/utils/homeHealthRules';

export const AI_HOME_CARE_PROMPT_KEY = 'ai_home_care_system_prompt';
export const AI_HOME_CARE_RECOMMENDATIONS_KEY = 'ai_home_care_recommendations';

interface DetectionRecordRow {
    recordId?: number;
    createTime?: string;
    scalp?: string;
    hair?: string;
    follicle?: string;
    scalpScore?: string;
    reportId?: string;
}

interface SelfieRow {
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

export interface HomeHealthInsightState {
    scores: { scalp: number; hair: number; follicle: number; overall: number };
    metrics: TrichoscopyMetrics;
    findings: HomeHealthFindings;
    selfieLabel: string;
    lastScanTime?: string;
    hasData: boolean;
    latestDetectionRecord: DetectionRecordRow | null;
    latestSelfieRecord: SelfieRow | null;
}

const defaultState = (): HomeHealthInsightState => ({
    scores: { scalp: 0, hair: 0, follicle: 0, overall: 0 },
    metrics: {},
    findings: {
        hairThinning: false,
        shedding: false,
        scalpConditions: [],
        scalpSummary: '',
        hairSummary: '',
    },
    selfieLabel: '',
    hasData: false,
    latestDetectionRecord: null,
    latestSelfieRecord: null,
});

function pickLatestRecord(list: DetectionRecordRow[]): DetectionRecordRow | null {
    if (!list?.length) return null;
    return [...list].sort((a, b) => {
        const ta = new Date(a.createTime || '').getTime();
        const tb = new Date(b.createTime || '').getTime();
        if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return tb - ta;
    })[0];
}

function pickLatestSelfie(list: SelfieRow[]): SelfieRow | null {
    if (!list?.length) return null;
    return [...list]
        .filter((item) => item.reportId || item.stage != null)
        .sort((a, b) => {
            const ta = new Date(a.createTime || a.createdTime || '').getTime();
            const tb = new Date(b.createTime || b.createdTime || '').getTime();
            return tb - ta;
        })[0] || null;
}

function localizeSelfiePosition(position: string | undefined, t: (key: string) => string): string {
    const pos = (position || '').toLowerCase();
    if (pos === 'forehead' || pos === '前额' || pos.includes('frontal')) return t('hair.frontal');
    if (pos === 'crown' || pos === '头顶' || pos.includes('top')) return t('hair.typeV');
    if (pos === 'alopecia areata' || pos === '斑秃' || pos.includes('alopecia')) return t('hair.typeAlopecia');
    if (pos === 'none' || pos === '无') return t('hair.typeNone');
    return position || t('hair.typeNone');
}

export function useHomeHealthInsights() {
    const { t, locale } = useI18n();
    const loading = ref(false);
    const insight = ref<HomeHealthInsightState>(defaultState());

    async function loadHomeHealthInsights(userId: string): Promise<HomeHealthInsightState> {
        if (!userId) {
            insight.value = defaultState();
            return insight.value;
        }

        loading.value = true;
        try {
            // 只需获取最新一条记录
            const [trichoRes, selfieRes] = await Promise.all([
                getTrichoReports(userId, 1, 1),
                getSelfieReports(userId, 1, 1),
            ]);

            // 新接口返回格式：{ reports: [...], total, page, pageSize, totalPages, hasMore }
            const trichoReports = trichoRes?.reports || [];
            const selfieReports = selfieRes?.reports || [];

            // 转换毛囊镜报告为旧格式
            const detectionList: DetectionRecordRow[] = trichoReports.map((report: any) => ({
                recordId: 0, // 新接口没有 recordId
                createTime: report.generatedAt || report.created_at || new Date().toISOString(),
                scalp: report.scalp?.toString() || '0',
                hair: report.hair?.toString() || '0',
                follicle: report.follicle?.toString() || '0',
                scalpScore: report.overallScore?.toString() || '0',
                reportId: report.id || undefined,
                aiReportId: report.ai_report_id || report.aiReportId || null,
                userId: report.userId || userId,
            }));

            // 转换自拍报告为旧格式
            const selfieList: SelfieRow[] = selfieReports.map((report: any) => ({
                id: parseInt(report.id) || 0,
                userId: report.userId || userId,
                stage: report.stage || 1,
                position: report.position || 'none',
                image: report.coverImage || '',
                reportId: report.id || null,
                aiReportId: report.aiReportId || report.ai_report_id || null,
                createTime: report.generatedAt || report.created_at || null,
                createdTime: report.generatedAt || report.created_at || null,
                extInfo: report.extInfo || null,
                hair: report.hair || null,
                scalp: report.scalp || null,
                follicle: report.follicle || null,
                overallScore: report.overallScore || null,
            }));

            const latestRecord = pickLatestRecord(detectionList);
            const latestSelfie = pickLatestSelfie(selfieList);

            console.log('[useHomeHealthInsights] trichoReports:', trichoReports);
            console.log('[useHomeHealthInsights] selfieReports:', selfieReports);
            console.log('[useHomeHealthInsights] detectionList:', detectionList);
            console.log('[useHomeHealthInsights] selfieList:', selfieList);
            console.log('[useHomeHealthInsights] latestRecord:', latestRecord);
            console.log('[useHomeHealthInsights] latestSelfie:', latestSelfie);

            let metrics: TrichoscopyMetrics = {};
            // 新接口没有 recordId，如果 reportId 存在，尝试从 hair_reports_detail 获取详情
            if (latestRecord?.reportId) {
                try {
                    // 如果有 reportId，从 hair_reports_detail 获取完整数据
                    const REPORT_DETAIL_PATH = `/report/detail/${latestRecord.reportId}`;
                    const detailRes = await get(REPORT_DETAIL_PATH, {}, { brand: ProjectBrand.LUSHAIR_NEW }) as any;
                    if (detailRes?.detail) {
                        // 解压 base64 gzip 数据
                        const decompressed = await decompressBase64Gzip(detailRes.detail);
                        console.log('[useHomeHealthInsights] decompressed detail:', decompressed);

                        // 从解压后的数据中提取 metrics（从 output 字段）
                        metrics = extractTrichoscopyMetrics(decompressed.output || decompressed);
                        console.log('[useHomeHealthInsights] extracted metrics:', metrics);
                    }
                } catch (err) {
                    console.warn('[useHomeHealthInsights] fetch/parse detail failed:', err);
                }
            }

            const scores = {
                scalp: Math.round(parseFloat(latestRecord?.scalp || '0') || 0),
                hair: Math.round(parseFloat(latestRecord?.hair || '0') || 0),
                follicle: Math.round(parseFloat(latestRecord?.follicle || '0') || 0),
                overall: Math.round(parseFloat(latestRecord?.scalpScore || '0') || 0),
            };

            console.log('[useHomeHealthInsights] metrics from detail:', metrics);
            console.log('[useHomeHealthInsights] scores:', scores);

            const findings = deriveHomeHealthFindings(metrics);
            console.log('[useHomeHealthInsights] metrics used for findings:', JSON.stringify(metrics, null, 2));
            console.log('[useHomeHealthInsights] derived findings:', findings);
            const positionLabel = latestSelfie
                ? localizeSelfiePosition(latestSelfie.position, t)
                : '';
            const selfieLabel = formatSelfiePositionLabel(positionLabel, latestSelfie?.stage ?? null);

            insight.value = {
                scores,
                metrics,
                findings,
                selfieLabel,
                lastScanTime: latestRecord?.createTime,
                hasData: !!latestRecord || !!latestSelfie,
                latestDetectionRecord: latestRecord,
                latestSelfieRecord: latestSelfie,
            };

            if (latestRecord) {
                const prompt = buildCareRecommendationPrompt({
                    trichoscopyMetrics: metrics,
                    findings,
                    scores,
                    selfieLabel,
                    language: locale.value,
                });
                try {
                    uni.setStorageSync(AI_HOME_CARE_PROMPT_KEY, prompt);
                } catch (e) {
                    console.warn('[useHomeHealthInsights] Failed to persist care prompt:', e);
                }
            }

            return insight.value;
        } catch (error) {
            console.error('[useHomeHealthInsights] load failed:', error);
            insight.value = defaultState();
            return insight.value;
        } finally {
            loading.value = false;
        }
    }

    return {
        loading,
        insight,
        loadHomeHealthInsights,
    };
}
