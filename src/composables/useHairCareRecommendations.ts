import { ref } from 'vue';
import { AI_HOME_CARE_PROMPT_KEY, AI_HOME_CARE_RECOMMENDATIONS_KEY } from '@/composables/useHomeHealthInsights';
import { useCareRoutinePlan } from '@/composables/useCareRoutinePlan';

const OPENAI_CHAT_URL = '/openai-api/v1/chat/completions';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

interface CachePayload {
    text: string;
    cachedAt: number;
    promptHash: string;
}

function hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i += 1) {
        hash = (hash << 5) - hash + prompt.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

function readCache(prompt: string): string | null {
    try {
        const raw = uni.getStorageSync(AI_HOME_CARE_RECOMMENDATIONS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachePayload;
        if (parsed.promptHash !== hashPrompt(prompt)) return null;
        if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
        return parsed.text || null;
    } catch {
        return null;
    }
}

function writeCache(prompt: string, text: string) {
    try {
        uni.setStorageSync(
            AI_HOME_CARE_RECOMMENDATIONS_KEY,
            JSON.stringify({
                text,
                cachedAt: Date.now(),
                promptHash: hashPrompt(prompt),
            } satisfies CachePayload),
        );
    } catch (e) {
        console.warn('[useHairCareRecommendations] cache write failed:', e);
    }
}

export function useHairCareRecommendations() {
    const loading = ref(false);
    const recommendations = ref('');
    const error = ref('');
    const { applyAiRecommendations, loadPlan } = useCareRoutinePlan();

    const syncStructuredPlan = (text: string) => {
        recommendations.value = text;
        applyAiRecommendations(text);
    };

    async function fetchRecommendations(force = false): Promise<string> {
        const prompt = uni.getStorageSync(AI_HOME_CARE_PROMPT_KEY) || '';
        if (!prompt) {
            recommendations.value = '';
            return '';
        }

        if (!force) {
            const cached = readCache(prompt);
            if (cached) {
                loadPlan();
                syncStructuredPlan(cached);
                return cached;
            }
        }

        loading.value = true;
        error.value = '';

        try {
            const response = await fetch(OPENAI_CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0.6,
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You are Lushair, a hair and scalp screening assistant. Give practical, non-diagnostic care guidance based on quantitative scan metrics. Respond with a JSON code block only, using this schema: {"sections":[{"period":"ingredient|morning|evening|treatment|diet","items":[{"title":"short task name","subtitle":"optional detail"}]}]}. Keep 2-4 actionable checkable items per section.',
                        },
                        { role: 'user', content: prompt },
                    ],
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenAI HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content?.trim() || '';
            if (!text) {
                throw new Error('Empty OpenAI response');
            }

            syncStructuredPlan(text);
            writeCache(prompt, text);
            return text;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            error.value = message;
            console.error('[useHairCareRecommendations]', message);
            return '';
        } finally {
            loading.value = false;
        }
    }

    return {
        loading,
        recommendations,
        error,
        fetchRecommendations,
    };
}
