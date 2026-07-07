import { ref } from 'vue';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';
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
            const [detectionRes, selfieRes] = await Promise.all([
                post('user/getDetectionRecordList', { userId }) as Promise<{ list?: DetectionRecordRow[] }>,
                post('user/getSelfieResultList', { userId }) as Promise<SelfieRow[]>,
            ]);

            const latestRecord = pickLatestRecord(detectionRes?.list || []);
            const latestSelfie = pickLatestSelfie(Array.isArray(selfieRes) ? selfieRes : []);

            let metrics: TrichoscopyMetrics = {};
            if (latestRecord?.recordId) {
                try {
                    const goHis = (await post('analyse/goHis', {
                        userId,
                        recordId: latestRecord.recordId,
                    }, { timeout: 30000 })) as Record<string, any>;
                    metrics = extractTrichoscopyMetrics(goHis);
                } catch (err) {
                    console.warn('[useHomeHealthInsights] goHis failed:', err);
                }
            }

            const scores = {
                scalp: Math.round(parseFloat(latestRecord?.scalp || '0') || 0),
                hair: Math.round(parseFloat(latestRecord?.hair || '0') || 0),
                follicle: Math.round(parseFloat(latestRecord?.follicle || '0') || 0),
                overall: Math.round(parseFloat(latestRecord?.scalpScore || '0') || 0),
            };

            const findings = deriveHomeHealthFindings(metrics);
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
