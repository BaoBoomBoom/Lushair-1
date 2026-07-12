import { computed, ref } from 'vue';
import type { TablerIconName } from '@/components/icons/tabler-icons';
import { AI_HOME_CARE_RECOMMENDATIONS_KEY } from '@/composables/useHomeHealthInsights';
import { post, ProjectBrand } from '@/utils/request';
import {
    parseCarePlanFromAiResponse,
    toStoredRoutineItems,
    type CarePlanPeriod,
    type StoredCareRoutineItem,
} from '@/utils/carePlanParser';

export const CARE_ROUTINE_PLAN_KEY = 'care_routine_plan';
export const CARE_ROUTINE_RAW_KEY = 'care_routine_raw_text';

const PERIOD_ORDER: CarePlanPeriod[] = ['ingredient', 'morning', 'evening', 'treatment', 'diet'];

const items = ref<StoredCareRoutineItem[]>([]);
const rawText = ref('');

export function useCareRoutinePlan() {
    const loadPlan = () => {
        try {
            const storedItems = uni.getStorageSync(CARE_ROUTINE_PLAN_KEY);
            const storedRaw = uni.getStorageSync(CARE_ROUTINE_RAW_KEY);
            if (storedItems) {
                items.value = JSON.parse(storedItems) as StoredCareRoutineItem[];
            } else {
                items.value = [];
            }
            rawText.value = storedRaw || '';

            if (!items.value.length) {
                const aiCacheRaw = uni.getStorageSync(AI_HOME_CARE_RECOMMENDATIONS_KEY);
                if (aiCacheRaw) {
                    const aiCache = JSON.parse(aiCacheRaw) as { text?: string };
                    if (aiCache.text) {
                        const parsed = parseCarePlanFromAiResponse(aiCache.text);
                        rawText.value = aiCache.text;
                        items.value = toStoredRoutineItems(parsed);
                        persistPlan();
                    }
                }
            }
        } catch (e) {
            console.warn('[useCareRoutinePlan] load failed', e);
            items.value = [];
            rawText.value = '';
        }
    };

    const persistPlan = () => {
        try {
            uni.setStorageSync(CARE_ROUTINE_PLAN_KEY, JSON.stringify(items.value));
            if (rawText.value) uni.setStorageSync(CARE_ROUTINE_RAW_KEY, rawText.value);
        } catch (e) {
            console.warn('[useCareRoutinePlan] persist failed', e);
        }
    };

    const applyAiRecommendations = (text: string) => {
        if (!text?.trim()) return;
        const parsed = parseCarePlanFromAiResponse(text);
        rawText.value = text;
        items.value = toStoredRoutineItems(parsed, items.value);
        persistPlan();
        uni.$emit('care-plan-updated');
    };

    const toggleItem = async (id: string) => {
        const item = items.value.find((i) => i.id === id);
        if (!item) return;
        item.done = !item.done;
        persistPlan();
        uni.$emit('care-plan-updated');

        // 如果任务被标记为完成，保存到数据库
        if (item.done) {
            try {
                // 获取 userId
                let userId = uni.getStorageSync('userId');
                if (!userId) {
                    const userInfo = uni.getStorageSync('userInfo');
                    userId = userInfo?.userId;
                }

                if (userId) {
                    const logEntry = `${item.period}: ${item.name}`;
                    await post('/user/routine-log', { userId, log: logEntry }, { brand: ProjectBrand.LUSHAIR_NEW });
                    console.log('[useCareRoutinePlan] Routine log saved:', logEntry);
                }
            } catch (error) {
                console.error('[useCareRoutinePlan] Failed to save routine log:', error);
            }
        }
    };

    const removeItem = (id: string) => {
        items.value = items.value.filter((i) => i.id !== id);
        persistPlan();
        uni.$emit('care-plan-updated');
    };

    const addItem = (name: string, period: CarePlanPeriod = 'morning', sub = '') => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        items.value.push({
            id,
            period,
            name: trimmed,
            sub,
            icon: 'flask',
            done: false,
        });
        persistPlan();
        uni.$emit('care-plan-updated');
    };

    const doneCount = computed(() => items.value.filter((i) => i.done).length);
    const totalCount = computed(() => items.value.length);
    const adherencePct = computed(() =>
        totalCount.value ? Math.round((doneCount.value / totalCount.value) * 100) : 0,
    );

    const itemsByPeriod = (period: CarePlanPeriod) =>
        computed(() => items.value.filter((i) => i.period === period));

    const groupedSections = computed(() =>
        PERIOD_ORDER.map((period) => ({
            period,
            items: items.value.filter((i) => i.period === period),
        })).filter((section) => section.items.length > 0),
    );

    const hasPlan = computed(() => items.value.length > 0);

    const applyActionablePlan = (plan: unknown) => {
        if (!plan || typeof plan !== 'object') return;

        const payload = plan as {
            summary?: string;
            advice?: string[];
            items?: Array<{ title?: string; text?: string; period?: string }>;
            markdown?: string;
            text?: string;
        };

        if (Array.isArray(payload.items) && payload.items.length) {
            const lines = payload.items.map((item) => {
                const title = String(item.title || item.text || '').trim();
                if (!title) return '';
                const period = item.period ? ` (${item.period})` : '';
                return `- ${title}${period}`;
            }).filter(Boolean);
            const text = `## Morning\n${lines.join('\n')}`;
            applyAiRecommendations(text);
            return;
        }

        if (payload.markdown || payload.text) {
            applyAiRecommendations(String(payload.markdown || payload.text));
            return;
        }

        if (Array.isArray(payload.advice) && payload.advice.length) {
            const text = `## Morning\n${payload.advice.map((line) => `- ${line}`).join('\n')}`;
            applyAiRecommendations(text);
            return;
        }

        if (payload.summary?.trim()) {
            applyAiRecommendations(payload.summary);
        }
    };

    return {
        items,
        rawText,
        loadPlan,
        persistPlan,
        applyAiRecommendations,
        applyActionablePlan,
        toggleItem,
        removeItem,
        addItem,
        doneCount,
        totalCount,
        adherencePct,
        itemsByPeriod,
        groupedSections,
        hasPlan,
    };
}

export type { StoredCareRoutineItem, CarePlanPeriod, TablerIconName };
