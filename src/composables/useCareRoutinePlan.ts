import { computed, ref } from 'vue';
import type { TablerIconName } from '@/components/icons/tabler-icons';
import { AI_HOME_CARE_RECOMMENDATIONS_KEY } from '@/composables/useHomeHealthInsights';
import { post, get, ProjectBrand } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';
import {
  parseCarePlanFromAiResponse,
  toStoredRoutineItems,
  type CarePlanPeriod,
  type StoredCareRoutineItem,
} from '@/utils/carePlanParser';

const userStore = useUserStore();

export const CARE_ROUTINE_PLAN_KEY = 'care_routine_plan';
export const CARE_ROUTINE_RAW_KEY = 'care_routine_raw_text';
export const LAST_RESET_DATE_KEY = 'routine_last_reset_date';

const PERIOD_ORDER: CarePlanPeriod[] = ['ingredient', 'morning', 'evening', 'treatment', 'diet'];

const items = ref<StoredCareRoutineItem[]>([]);
const rawText = ref('');
const checkInMap = ref<Record<string, { done: boolean; checkInTime: string | null }>>({});
const currentVersion = ref(0);
const effectiveDate = ref('');

// 获取今天的日期字符串 YYYY-MM-DD
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// 检查并重置每日打卡状态
const checkAndResetDaily = () => {
  const today = getTodayDate();
  const lastReset = uni.getStorageSync(LAST_RESET_DATE_KEY);

  if (lastReset !== today) {
    console.log('[useCareRoutinePlan] New day detected, resetting check-in status');
    uni.setStorageSync(LAST_RESET_DATE_KEY, today);
    // 加载今天的打卡状态
    loadTodayCheckIns();
  }
};

// 从数据库加载今天的打卡状态
const loadTodayCheckIns = async () => {
  const userId = userStore.userInfo?.userId;
  if (!userId) return;

  try {
    const response = await get('/routine/checkin', { userId, date: getTodayDate() }, { brand: ProjectBrand.LUSHAIR_NEW });
    if (response && response.checkIns) {
      checkInMap.value = response.checkIns;
      console.log('[useCareRoutinePlan] Today check-ins loaded:', checkInMap.value);
    }
  } catch (error) {
    console.error('[useCareRoutinePlan] Failed to load check-ins:', error);
  }
};

// 从数据库获取Routine配置
const loadRoutineConfigFromDB = async () => {
  const userId = userStore.userInfo?.userId;
  if (!userId) return false;

  try {
    const response = await get('/routine/config', { userId, date: getTodayDate() }, { brand: ProjectBrand.LUSHAIR_NEW });
    if (response && response.routines && response.routines.length > 0) {
      // 转换为StoredCareRoutineItem格式
      items.value = response.routines.map((r: any) => ({
        id: r.id,
        period: r.period as CarePlanPeriod,
        name: r.name,
        sub: r.sub || '',
        icon: (r.icon || 'flask') as TablerIconName,
        done: checkInMap.value[r.id]?.done || false
      }));
      currentVersion.value = response.version;
      effectiveDate.value = response.effectiveDate;
      console.log('[useCareRoutinePlan] Loaded routines from DB:', response.version);
      return true;
    }
  } catch (error) {
    console.error('[useCareRoutinePlan] Failed to load routines from DB:', error);
  }
  return false;
};

export function useCareRoutinePlan() {
  const loadPlan = async () => {
    try {
      // 检查是否新的一天
      checkAndResetDaily();

      // 先尝试从数据库加载
      const loadedFromDB = await loadRoutineConfigFromDB();

      if (!loadedFromDB) {
        // 数据库没有数据，从localStorage加载
        const storedItems = uni.getStorageSync(CARE_ROUTINE_PLAN_KEY);
        const storedRaw = uni.getStorageSync(CARE_ROUTINE_RAW_KEY);
        if (storedItems) {
          items.value = JSON.parse(storedItems) as StoredCareRoutineItem[];
          // 重置打卡状态
          items.value.forEach(item => {
            item.done = false;
          });
        } else {
          items.value = [];
          // 尝试从AI缓存加载
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
        rawText.value = storedRaw || '';
      }

      // 加载今天的打卡状态
      loadTodayCheckIns();

      // 应用打卡状态到items
      items.value.forEach(item => {
        if (checkInMap.value[item.id]) {
          item.done = checkInMap.value[item.id].done;
        }
      });

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

  // 保存Routine配置到数据库（新版本从明天生效）
  const saveRoutineConfigToDB = async (routines: StoredCareRoutineItem[], source = 'manual') => {
    const userId = userStore.userInfo?.userId;
    if (!userId) {
      console.warn('[useCareRoutinePlan] No userId, skipping DB save');
      return false;
    }

    try {
      const payload = {
        userId,
        routines: routines.map(r => ({
          name: r.name,
          period: r.period,
          sub: r.sub,
          icon: r.icon
        })),
        source
      };

      const response = await post('/routine/config', payload, { brand: ProjectBrand.LUSHAIR_NEW });
      console.log('[useCareRoutinePlan] Routine config saved to DB:', response);
      return true;
    } catch (error) {
      console.error('[useCareRoutinePlan] Failed to save routine config:', error);
      return false;
    }
  };

  const applyAiRecommendations = async (text: string, source = 'manual') => {
    if (!text?.trim()) return;
    const parsed = parseCarePlanFromAiResponse(text);
    rawText.value = text;
    const newItems = toStoredRoutineItems(parsed, items.value);

    // 保存到数据库（新版本从明天生效）
    if (newItems.length > 0) {
      await saveRoutineConfigToDB(newItems, source);
    }

    items.value = newItems;
    persistPlan();
    uni.$emit('care-plan-updated');
  };

  const toggleItem = async (id: string) => {
    const item = items.value.find((i) => i.id === id);
    if (!item) return;

    const newDoneState = !item.done;
    item.done = newDoneState;
    persistPlan();

    // 更新打卡状态Map
    checkInMap.value[id] = {
      done: newDoneState,
      checkInTime: newDoneState ? new Date().toISOString() : null
    };

    uni.$emit('care-plan-updated');

    // 同步到数据库
    const userId = userStore.userInfo?.userId;
    if (userId) {
      try {
        await post('/routine/checkin', {
          userId,
          routineId: id,
          date: getTodayDate(),
          done: newDoneState
        }, { brand: ProjectBrand.LUSHAIR_NEW });
        console.log('[useCareRoutinePlan] Check-in synced to DB:', id, newDoneState);
      } catch (error) {
        console.error('[useCareRoutinePlan] Failed to sync check-in:', error);
      }
    }

    // 如果任务被标记为完成，也保存到UserProductLog（兼容旧逻辑）
    if (newDoneState) {
      try {
        const logEntry = `${item.period}: ${item.name}`;
        await post('/user/routine-log', { userId, log: logEntry }, { brand: ProjectBrand.LUSHAIR_NEW });
        console.log('[useCareRoutinePlan] Routine log saved:', logEntry);
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

  const applyActionablePlan = async (plan: unknown, source = 'manual') => {
    if (!plan || typeof plan !== 'object') return;

    const payload = plan as {
      summary?: string;
      advice?: string[] | Record<string, string>;
      items?: Array<{ title?: string; text?: string; period?: string }>;
      markdown?: string;
      text?: string;
      morning?: string;
      evening?: string;
      treatment?: string;
      diet?: string;
      ingredient?: string;
    };

    // 处理 {morning: "...", evening: "..."} 格式（包括嵌套在 advice 中的情况）
    const periodData = payload.morning || payload.evening || payload.treatment || payload.diet || payload.ingredient;
    const adviceAsObject = typeof payload.advice === 'object' && !Array.isArray(payload.advice) ? payload.advice : null;
    const advicePeriods = adviceAsObject?.morning || adviceAsObject?.evening || adviceAsObject?.treatment || adviceAsObject?.diet || adviceAsObject?.ingredient;

    if (periodData || advicePeriods) {
      const sections: string[] = [];

      // 从顶层数据获取
      if (payload.morning?.trim()) {
        sections.push(`## Morning\n- ${payload.morning.trim()}`);
      } else if (adviceAsObject?.morning?.trim()) {
        sections.push(`## Morning\n- ${adviceAsObject.morning.trim()}`);
      }

      if (payload.evening?.trim()) {
        sections.push(`## Evening\n- ${payload.evening.trim()}`);
      } else if (adviceAsObject?.evening?.trim()) {
        sections.push(`## Evening\n- ${adviceAsObject.evening.trim()}`);
      }

      if (payload.treatment?.trim()) {
        sections.push(`## Treatment\n- ${payload.treatment.trim()}`);
      } else if (adviceAsObject?.treatment?.trim()) {
        sections.push(`## Treatment\n- ${adviceAsObject.treatment.trim()}`);
      }

      if (payload.diet?.trim()) {
        sections.push(`## Diet\n- ${payload.diet.trim()}`);
      } else if (adviceAsObject?.diet?.trim()) {
        sections.push(`## Diet\n- ${adviceAsObject.diet.trim()}`);
      }

      if (payload.ingredient?.trim()) {
        sections.push(`## Ingredients\n- ${payload.ingredient.trim()}`);
      } else if (adviceAsObject?.ingredient?.trim()) {
        sections.push(`## Ingredients\n- ${adviceAsObject.ingredient.trim()}`);
      }

      if (sections.length) {
        await applyAiRecommendations(sections.join('\n\n'), source);
        console.log('[useCareRoutinePlan] Applied period-based plan:', sections);
        return;
      }
    }

    if (Array.isArray(payload.items) && payload.items.length) {
      const lines = payload.items.map((item) => {
        const title = String(item.title || item.text || '').trim();
        if (!title) return '';
        const period = item.period ? ` (${item.period})` : '';
        return `- ${title}${period}`;
      }).filter(Boolean);
      const text = `## Morning\n${lines.join('\n')}`;
      await applyAiRecommendations(text, source);
      return;
    }

    if (payload.markdown || payload.text) {
      await applyAiRecommendations(String(payload.markdown || payload.text), source);
      return;
    }

    if (Array.isArray(payload.advice) && payload.advice.length) {
      const text = `## Morning\n${payload.advice.map((line) => `- ${line}`).join('\n')}`;
      await applyAiRecommendations(text, source);
      return;
    }

    if (payload.summary?.trim()) {
      await applyAiRecommendations(payload.summary, source);
    }
  };

  return {
    items,
    rawText,
    currentVersion,
    effectiveDate,
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
