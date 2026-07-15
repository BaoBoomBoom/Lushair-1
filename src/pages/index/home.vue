<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import DeviceConfidenceSheet from '@/components/scan/DeviceConfidenceSheet.vue';
import { runScanAction, type ScanActionType } from '@/composables/useScanActions';
import { useUserStore } from '@/stores/userStore';
import { get, post, ProjectBrand } from '@/utils/request';
import { useHomeHealthInsights } from '@/composables/useHomeHealthInsights';
import { useHairCareRecommendations } from '@/composables/useHairCareRecommendations';
import { useCareRoutinePlan } from '@/composables/useCareRoutinePlan';
import type { TablerIconName } from '@/components/icons/tabler-icons';
import { navigateToLatestScanResult } from '@/utils/latestScanNavigation';
import {
    buildScoreSituationNote,
    buildScoreTrendLine,
    deltaTone,
    formatScoreDelta,
    type ScoreDeltas,
} from '@/utils/homeScoreTrend';
import {
    getFindingDetailKey,
    getFindingDetailParams,
    isNormalFindingKey,
    type FindingDetailKey,
} from '@/utils/homeHealthRules';

const { t, locale } = useI18n();

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function,
};

import { getApiUrl } from '@/utils/apiHelper';

interface DetectionRecord {
    createTime?: string;
    scalp?: string;
    hair?: string;
    follicle?: string;
    scalpScore?: string;
}

// 健康度数据
const healthData = ref({
    scalpHealth: '0',
    follicleHealth: '0',
    hairHealth: '0',
    totalScore: 0,
    hasData: false,
    loading: true
});

/** Pick the most recent detection record by createTime. */
const pickLatestDetectionRecord = (list: DetectionRecord[]): DetectionRecord | null => {
    if (!list?.length) return null;
    return [...list].sort((a, b) => {
        const timeA = new Date(a.createTime || '').getTime();
        const timeB = new Date(b.createTime || '').getTime();
        if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
        if (Number.isNaN(timeA)) return 1;
        if (Number.isNaN(timeB)) return -1;
        return timeB - timeA;
    })[0];
};

const applyLatestScores = (record: DetectionRecord) => {
    lastScanDisplay.value = formatLastScanRelative(record.createTime);
    userData.value.lastUpdated = record.createTime || '';
    healthData.value = {
        scalpHealth: '0',
        follicleHealth: '0',
        hairHealth: '0',
        totalScore: 0,
        hasData: true,
        loading: false,
    };

    setTimeout(() => {
        healthData.value = {
            scalpHealth: String(Math.round(parseFloat(record.scalp || '0') || 0)),
            follicleHealth: String(Math.round(parseFloat(record.follicle || '0') || 0)),
            hairHealth: String(Math.round(parseFloat(record.hair || '0') || 0)),
            totalScore: Math.round(parseFloat(record.scalpScore || '0') || 0),
            hasData: true,
            loading: false,
        };

        userStore.updateUserInfo({
            scalpHealth: healthData.value.scalpHealth,
            follicleHealth: healthData.value.follicleHealth,
            hairHealth: healthData.value.hairHealth,
            totalScore: healthData.value.totalScore,
        });
    }, 300);
};

// 用户数据
const userData = ref({
    name: 'Jane',
    hairPoints: 74,
    scans: 6,
    checks: 6,
    lastUpdated: '2025-04-22 22:05'
});

// 每日任务打卡信息
const encrInfo = ref<{
    clockedIn: boolean;
}>({
    clockedIn: false
});

// 扫描提示可见性
const scanRemindersVisible = ref(true);

// 周环比差值
const weekOverWeekDifference = ref(0);

// 本周检测次数
const thisWeekCheckTimes = ref(0);

const RING_RADIUS = 35;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAIN_RING_RADIUS = 46;
const MAIN_RING_CIRCUMFERENCE = 2 * Math.PI * MAIN_RING_RADIUS;

const { insight, loadHomeHealthInsights } = useHomeHealthInsights();
const { loading: planLoading, fetchRecommendations } = useHairCareRecommendations();
const { items: carePlanItems, hasPlan, loadPlan, doneCount: carePlanDoneCount, totalCount: carePlanTotalCount } = useCareRoutinePlan();

const scoreDeltas = ref<ScoreDeltas>({
    overall: null,
    scalp: null,
    hair: null,
    follicle: null,
    hasPrevious: false,
});

const detectionRecords = ref<DetectionRecord[]>([]);
const showDeviceSheet = ref(false);

const formatShortMonth = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale.value, { month: 'short' });
};

const sortedDetectionRecords = computed(() =>
    [...detectionRecords.value]
        .filter((record) => record.createTime && record.scalpScore)
        .sort((a, b) => new Date(a.createTime || '').getTime() - new Date(b.createTime || '').getTime()),
);

const progressChart = computed(() => {
    const records = sortedDetectionRecords.value;
    if (records.length < 2) return null;

    const scores = records.map((record) => Math.round(parseFloat(record.scalpScore || '0') || 0));
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    const width = 80;
    const height = 40;
    const pad = 6;

    const points = scores.map((score, index) => {
        const x = pad + (index / (scores.length - 1)) * (width - pad * 2);
        const y = pad + (1 - (score - min) / range) * (height - pad * 2);
        return { x, y };
    });

    const last = points[points.length - 1];
    const firstRecord = records[0];
    const lastRecord = records[records.length - 1];

    return {
        polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
        lastX: last.x,
        lastY: last.y,
        summary: `${formatShortMonth(firstRecord.createTime)} → ${formatShortMonth(lastRecord.createTime)} · ${scores[scores.length - 1]}`,
    };
});

const progressSummaryText = computed(() => {
    if (progressChart.value) return progressChart.value.summary;
    if (healthData.value.hasData) {
        return `${t('home.progressCurrentScore')} · ${healthData.value.totalScore}`;
    }
    return t('home.progressNoData');
});

const showProgressCard = computed(() => healthData.value.hasData);
const showConfidenceCard = computed(() => healthData.value.hasData);

const lastScanDisplay = ref({ value: '—', unit: '' });

const getRingStroke = (value: string, circumference = RING_CIRCUMFERENCE) => {
    const pct = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    return {
        dasharray: circumference,
        dashoffset: circumference * (1 - pct / 100),
    };
};

const healthSummary = computed(() => {
    if (!healthData.value.hasData) return t('analysis.noData');
    return healthData.value.totalScore >= 70 ? t('home.generallyHealthy') : t('home.needsAttention');
});

const overallDeltaLabel = computed(() => formatScoreDelta(scoreDeltas.value.overall));
const overallDeltaTone = computed(() => deltaTone(scoreDeltas.value.overall));

const lastScanRelativeText = computed(() => {
    const { value, unit } = lastScanDisplay.value;
    if (!value || value === '—') return '';
    return unit ? `${value} ${unit}` : value;
});

const scoreTrendLine = computed(() =>
    buildScoreTrendLine({
        deltas: scoreDeltas.value,
        lastScanRelative: lastScanRelativeText.value,
        t,
    }),
);

const scoreSituationNote = computed(() => {
    if (!healthData.value.hasData) return '';

    const watchoutLabels: string[] = [];
    if (insight.value.findings.hairThinning) watchoutLabels.push(t('home.hairThinning'));
    if (insight.value.findings.shedding) watchoutLabels.push(t('home.shedding'));
    insight.value.findings.scalpConditions
        .filter((c) => c !== 'mild scalp')
        .forEach((c) => watchoutLabels.push(getConditionLabel(c)));

    const hasMildScalpOnly =
        insight.value.findings.scalpConditions.includes('mild scalp') &&
        !insight.value.findings.hairThinning &&
        !insight.value.findings.shedding &&
        watchoutLabels.length === 0;

    return buildScoreSituationNote({
        deltas: scoreDeltas.value,
        watchoutLabels,
        hasMildScalpOnly,
        t,
    });
});

const conditionLabelKey: Record<string, string> = {
    'hair thinning': 'home.hairThinning',
    'shedding': 'home.shedding',
    'oily scalp': 'home.oilyScalp',
    'dry scalp': 'home.dryScalpFinding',
    'scurfy scalp': 'home.scurfyScalp',
    'mild scalp': 'home.mildScalp',
    'sensitive scalp': 'home.sensitiveScalp',
    hairThinning: 'home.hairThinning',
};

const findingRows = computed(() => {
    const rows: {
        key: string;
        tone: 'neutral' | 'warn';
        icon: TablerIconName;
        title: string;
        subtitle: string;
        statusChip: string;
    }[] = [];

    console.log('[findingRows] insight.value.findings:', insight.value.findings);

    const pushRow = (
        key: string,
        tone: 'neutral' | 'warn',
        icon: TablerIconName,
        titleKey: string,
        subtitleKey: string,
        statusKey: string,
    ) => {
        rows.push({
            key,
            tone,
            icon,
            title: t(titleKey),
            subtitle: t(subtitleKey),
            statusChip: t(statusKey),
        });
    };

    if (insight.value.findings.hairThinning) {
        pushRow('hairThinning', 'warn', 'wave-sine', 'home.hairThinning', 'home.findingSubtitleHairThinning', 'home.findingChipMonitor');
    }
    if (insight.value.findings.shedding) {
        pushRow('shedding', 'warn', 'trending-up', 'home.shedding', 'home.findingSubtitleShedding', 'home.findingChipWatch');
    }
    insight.value.findings.scalpConditions.forEach((condition) => {
        const neutral = isNormalFindingKey(condition);
        const iconMap: Record<string, TablerIconName> = {
            'oily scalp': 'droplet',
            'dry scalp': 'snowflake',
            'scurfy scalp': 'color-filter',
            'mild scalp': 'check',
            'sensitive scalp': 'alert-triangle',
        };
        const subtitleMap: Record<string, string> = {
            'oily scalp': 'home.findingSubtitleOilyScalp',
            'dry scalp': 'home.findingSubtitleDryScalp',
            'scurfy scalp': 'home.findingSubtitleScurfyScalp',
            'mild scalp': 'home.findingSubtitleMildScalp',
            'sensitive scalp': 'home.findingSubtitleSensitiveScalp',
        };
        const statusMap: Record<string, string> = {
            'oily scalp': 'home.findingChipMild',
            'dry scalp': 'home.findingChipMild',
            'scurfy scalp': 'home.findingChipMild',
            'mild scalp': 'home.findingChipNormal',
            'sensitive scalp': 'home.findingChipMonitor',
        };
        rows.push({
            key: condition,
            tone: neutral ? 'neutral' : 'warn',
            icon: iconMap[condition] || 'circle-dotted',
            title: getConditionLabel(condition),
            subtitle: t(subtitleMap[condition] || 'home.findingSubtitleMildScalp'),
            statusChip: t(statusMap[condition] || 'home.findingChipMonitor'),
        });
    });

    console.log('[findingRows] final rows.length:', rows.length, 'rows:', rows);
    return rows;
});

const carePlanSummary = computed(() =>
    carePlanTotalCount.value
        ? t('home.planProgressSummary', [carePlanDoneCount.value, carePlanTotalCount.value])
        : '',
);

const goToRoutineTab = () => {
    uni.switchTab({ url: '/pages/routine/index' });
};

const expandedFindingKey = ref<string | null>(null);

const findingDetailI18nKey: Record<FindingDetailKey, string> = {
    'mild scalp': 'home.findingDetailMildScalp',
    'oily scalp': 'home.findingDetailOilyScalp',
    'dry scalp': 'home.findingDetailDryScalp',
    'scurfy scalp': 'home.findingDetailScurfyScalp',
    'sensitive scalp': 'home.findingDetailSensitiveScalp',
    hairThinning: 'home.findingDetailHairThinning',
    shedding: 'home.findingDetailShedding',
};

const toggleFinding = (key: string) => {
    expandedFindingKey.value = expandedFindingKey.value === key ? null : key;
};

const getFindingDetail = (key: string): string => {
    const detailKey = getFindingDetailKey(key);
    if (!detailKey) return '';
    const i18nKey = findingDetailI18nKey[detailKey];
    const params = getFindingDetailParams(detailKey, insight.value.metrics);
    return t(i18nKey, params);
};

const getConditionLabel = (key: string) => {
    const i18nKey = conditionLabelKey[key];
    return i18nKey ? t(i18nKey) : key;
};

const refreshHealthInsights = async (userId: string) => {
    await loadHomeHealthInsights(userId);
    if (insight.value.hasData) {
        fetchRecommendations();
    }
};

const formatLastScanRelative = (createTime?: string) => {
    if (!createTime) {
        return { value: '—', unit: t('analysis.noData') };
    }

    const scannedAt = new Date(createTime);
    if (Number.isNaN(scannedAt.getTime())) {
        return { value: '—', unit: t('analysis.noData') };
    }

    const diffHours = Math.floor((Date.now() - scannedAt.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) {
        return {
            value: String(Math.max(diffHours, 0)),
            unit: t('home.hoursAgo'),
        };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
        value: String(diffDays),
        unit: t('home.daysAgo'),
    };
};

// 计算本周内的检测次数
const calculateWeekCheckTimes = (list: any[]) => {
    if (!list || list.length === 0) {
        return 0;
    }
    
    // 获取本周的起始时间（周一凌晨）
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 获取今天是星期几，0是周日，转换为1-7
    const mondayOfThisWeek = new Date(today);
    mondayOfThisWeek.setDate(today.getDate() - dayOfWeek + 1); // 设置为本周一
    mondayOfThisWeek.setHours(0, 0, 0, 0); // 设置为凌晨
    
    // 计算本周内的检测次数
    let weekCheckCount = 0;
    list.forEach(item => {
        if (item.createTime) {
            // 解析createTime字段，格式可能需要根据实际数据调整
            const checkTime = new Date(item.createTime);
            if (!isNaN(checkTime.getTime()) && checkTime >= mondayOfThisWeek) {
                weekCheckCount++;
            }
        }
    });
    
    return weekCheckCount;
};

// 计算上周的检测次数
const calculateLastWeekCheckTimes = (list: any[]) => {
    if (!list || list.length === 0) {
        return 0;
    }
    
    // 获取上周的起始和结束时间
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 获取今天是星期几，0是周日，转换为1-7
    
    // 计算上周一的日期
    const mondayOfLastWeek = new Date(today);
    mondayOfLastWeek.setDate(today.getDate() - dayOfWeek + 1 - 7); // 上周一
    mondayOfLastWeek.setHours(0, 0, 0, 0); // 设置为凌晨
    
    // 计算上周日的日期
    const sundayOfLastWeek = new Date(mondayOfLastWeek);
    sundayOfLastWeek.setDate(mondayOfLastWeek.getDate() + 6); // 上周日
    sundayOfLastWeek.setHours(23, 59, 59, 999); // 设置为周日结束
    
    // 计算上周内的检测次数
    let lastWeekCheckCount = 0;
    list.forEach(item => {
        if (item.createTime) {
            const checkTime = new Date(item.createTime);
            if (!isNaN(checkTime.getTime()) && 
                checkTime >= mondayOfLastWeek && 
                checkTime <= sundayOfLastWeek) {
                lastWeekCheckCount++;
            }
        }
    });
    
    return lastWeekCheckCount;
};

// 计算本周与上周的差值
const calculateWeekOverWeekDifference = (list: any[]) => {
    const thisWeekCount = calculateWeekCheckTimes(list);
    const lastWeekCount = calculateLastWeekCheckTimes(list);
    return thisWeekCount - lastWeekCount;
};

// 设置无数据状态
const setNoDataState = () => {
    healthData.value = {
        scalpHealth: '0',
        follicleHealth: '0',
        hairHealth: '0',
        totalScore: 0,
        hasData: false,
        loading: false
    };
    scoreDeltas.value = {
        overall: null,
        scalp: null,
        hair: null,
        follicle: null,
        hasPrevious: false,
    };
};

// 任务动态状态（completed/color/disabled 需要保持可写）
// Dynamic task state that needs to be mutable
const taskStates = ref<Record<number, { completed: boolean; color: string; disabled?: boolean }>>({
    2: { completed: false, color: '#B8B8B8' }
});

// routineTasks 使用 computed，使语言切换后标题/描述自动更新
// Use computed so title/description update reactively on locale change
const routineTasks = computed(() => [
    // {
    //     id: 1,
    //     title: t('home.updateStressLevels'),
    //     description: t('home.stressDescription'),
    //     points: 10,
    //     ...taskStates.value[1],
    //     taskType: 'stress_level'
    // },
    {
        id: 2,
        title: t('home.scanScalpTask'),
        description: t('home.scanDescription'),
        points: 50,
        ...(taskStates.value[2] ?? { completed: false, color: '#B8B8B8' }),
        taskType: 'scan_scalp'
    },
    // {
    //     id: 3,
    //     title: t('home.logDailyHaircare'),
    //     description: t('home.haircareDescription'),
    //     points: 20,
    //     ...taskStates.value[3],
    //     taskType: 'daily_haircare'
    // }
]);

// scanTests 使用 computed，语言切换后标题/描述自动更新
// Use computed so title/description update reactively on locale change
const scoreMetrics = computed(() => [
    { value: healthData.value.scalpHealth, label: t('hair.scalpScore'), delta: scoreDeltas.value.scalp },
    { value: healthData.value.hairHealth, label: t('hair.hairScoreLabel'), delta: scoreDeltas.value.hair },
    { value: healthData.value.follicleHealth, label: t('hair.follicleScore'), delta: scoreDeltas.value.follicle },
]);

const scanTests = computed(() => [
    {
        id: 2,
        type: 'quick',
        title: t('home.quickScan'),
        description: t('home.quickScanDesc'),
        icon: 'timelapse_color',
        gradient: 'linear-gradient(180deg, #F5F5F5 0%, #E0E0E0 100%)'
    },
    {
        id: 1,
        type: 'advanced',
        title: t('home.advancedScan'),
        description: t('home.advancedScanDesc'),
        icon: 'blur_on_color',
        gradient: 'linear-gradient(150.16deg, #848484 -29.98%, #D8D8D8 0.05%, #7D7D7D 19.53%, #454545 70.42%)'
    },
    {
        id: 3,
        type: 'phone',
        title: t('home.phoneCameraAnalysis'),
        description: t('home.phoneAnalysisDesc'),
        icon: 'camera_front_color',
        gradient: '#FFFFFF'
    }
]);

// productRecommendations 使用 computed，语言切换后内容自动更新
// Use computed so content updates reactively on locale change
const productRecommendations = computed(() => [
    {
        id: 1,
        type: t('home.shampoo'),
        name: t('home.glossModerneShampoo'),
        image: '/static/images/shampoo-product.jpg',
        tags: [t('home.oilyHair'), t('home.dryScalp')]
    },
    {
        id: 2,
        type: t('home.hairOil'),
        name: t('home.gisouHoneyOil'),
        image: '/static/images/hair-oil-product.jpg',
        tags: [t('home.oilyHair'), t('home.dryScalp')]
    }
]);

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const userStore = useUserStore();

const DEV_DEFAULT_USER_ID = 'lusHair330e986a';

const ensureUserId = () => {
    if (!userStore.userInfo.userId) {
        const localUserInfo = uni.getStorageSync('userInfo');
        const storedUserId = uni.getStorageSync('userId');
        const resolved = localUserInfo?.userId || storedUserId || '';
        if (resolved) {
            userStore.userInfo.userId = resolved;
        } else if (import.meta.env.DEV) {
            userStore.userInfo.userId = DEV_DEFAULT_USER_ID;
        }
    }
    return userStore.userInfo.userId;
};

const loadLatestScoreOverview = () => {
    const userId = ensureUserId();
    if (userId) {
        fetchHealthData(userId);
    }
};

// 获取健康度数据
const fetchHealthData = async (userId: string) => {
    try {
        healthData.value.loading = true;

        // 并行获取最新分数、分数变化和健康洞察
        const [scoreResponse, deltasResponse] = await Promise.all([
            get('report/latest-score?userId=' + encodeURIComponent(userId), {}, { brand: ProjectBrand.LUSHAIR_NEW }) as any,
            get('report/score-deltas?userId=' + encodeURIComponent(userId), {}, { brand: ProjectBrand.LUSHAIR_NEW }) as any,
            loadHomeHealthInsights(userId),
        ]);

        console.log('最新分数响应:', scoreResponse);
        console.log('分数变化响应:', deltasResponse);

        if (scoreResponse && scoreResponse.overallScore !== null && scoreResponse.overallScore !== undefined) {
            // 更新各项分数
            healthData.value.totalScore = Math.round(scoreResponse.overallScore);
            healthData.value.scalpHealth = String(Math.round(scoreResponse.scalp || 0));
            healthData.value.hairHealth = String(Math.round(scoreResponse.hair || 0));
            healthData.value.follicleHealth = String(Math.round(scoreResponse.follicle || 0));
            healthData.value.hasData = true;
            healthData.value.loading = false;

            // 更新分数变化
            scoreDeltas.value = {
                overall: deltasResponse?.overall ?? null,
                scalp: deltasResponse?.scalp ?? null,
                hair: deltasResponse?.hair ?? null,
                follicle: deltasResponse?.follicle ?? null,
                hasPrevious: deltasResponse?.hasPrevious || false,
            };
        } else {
            setNoDataState();
        }
    } catch (error) {
        console.error('获取最新分数失败:', error);
        setNoDataState();
    }
};

// 完成任务 / Complete a task
const completeTask = (task: any) => {
    // 如果任务被禁用，则不执行任何操作
    if (task.disabled) return;

    // 通过 taskStates 切换任务完成状态（computed 不可直接改，需写 taskStates）
    // Toggle via taskStates since routineTasks is computed (read-only elements)
    const current = taskStates.value[task.id] ?? { completed: false, color: '#B8B8B8' };
    const newCompleted = !current.completed;
    taskStates.value[task.id] = {
        ...current,
        completed: newCompleted,
        color: newCompleted ? '#7622FF' : '#B8B8B8'
    };
    
    // 保存任务状态到本地存储
    saveTaskStatus();
    
    // 显示完成提示
    if (newCompleted) {
        uni.showToast({
            title: `完成任务！获得${task.points}积分`,
            icon: 'success',
            duration: 2000
        });
    }
    
    console.log(`任务 ${task.taskType} 状态更新为: ${newCompleted ? '已完成' : '未完成'}`);
};

// 保存任务状态到本地存储
const saveTaskStatus = () => {
    const taskStatus = routineTasks.value.map(task => ({
        id: task.id,
        completed: task.completed,
        taskType: task.taskType
    }));
    
    try {
        uni.setStorageSync('routine_tasks_status', JSON.stringify(taskStatus));
        console.log('任务状态已保存到本地存储');
    } catch (error) {
        console.error('保存任务状态失败:', error);
    }
};

// 从本地存储加载任务状态
const loadTaskStatus = () => {
    try {
        const savedStatus = uni.getStorageSync('routine_tasks_status');
        if (savedStatus) {
            const taskStatus = JSON.parse(savedStatus);
            
            // 检查是否是今天的数据
            const today = new Date().toDateString();
            const savedDate = uni.getStorageSync('routine_tasks_date');
            
            if (savedDate === today) {
                // 如果是今天的数据，恢复状态（写入 taskStates）
                // Restore state via taskStates
                taskStatus.forEach((savedTask: any) => {
                    const existing = taskStates.value[savedTask.id] ?? { completed: false, color: '#B8B8B8' };
                    taskStates.value[savedTask.id] = {
                        ...existing,
                        completed: savedTask.completed,
                        color: savedTask.completed ? '#7622FF' : '#B8B8B8'
                    };
                });
                console.log('已恢复今天的任务状态');
            } else {
                // 如果不是今天的数据，重置所有任务
                resetDailyTasks();
                console.log('新的一天，重置所有任务');
            }
        } else {
            resetDailyTasks();
        }
    } catch (error) {
        console.error('加载任务状态失败:', error);
        resetDailyTasks();
    }
};

// 获取今日任务状态
const fetchDailyTaskStatus = async (userId: string) => {
  try {
    const response = await post('/encr/dailyTask', { userId });
    console.log('今日任务状态:', response);
    
    if (response) {
      // 使用类型断言处理响应数据
      const data = response as { clockedIn?: boolean; detected?: boolean };
      // 更新今日任务打卡状态
      encrInfo.value.clockedIn = data.clockedIn === true;
      // 如果detected为true，则不显示扫描提示
      if (data.detected === true) {
        scanRemindersVisible.value = false;
        
        // 更新 scan_scalp 任务状态（通过 taskStates，id=2）
        // Update scan_scalp task state via taskStates (id=2)
        const scanTask = routineTasks.value.find(t => t.taskType === 'scan_scalp');
        if (scanTask) {
          taskStates.value[scanTask.id] = {
            completed: true,
            color: '#7622FF',
            disabled: true
          };
        }
      }
      return data.detected === true;
    }
    return false;
  } catch (error) {
    console.error('获取今日任务状态失败:', error);
    // 默认为未打卡
    encrInfo.value.clockedIn = false;
    return false;
  }
};

// 处理任务点击
const handleTaskClick = async (task: any) => {
    if (task.taskType === 'scan_scalp') {
        const detected = await fetchDailyTaskStatus(userStore.userInfo.userId);
        if (detected) {
            uni.showToast({
                title: t('home.taskCompletedMsg'),
                icon: 'none',
                duration: 2000
            });
        } else {
            gotoAdvancedScanByTask();
        }
    } else {
        completeTask(task);
    }
};

// 重置每日任务（重置 taskStates）
// Reset daily tasks via taskStates
const resetDailyTasks = () => {
    routineTasks.value.forEach(task => {
        taskStates.value[task.id] = { completed: false, color: '#B8B8B8' };
    });
    
    // 保存今天的日期
    const today = new Date().toDateString();
    uni.setStorageSync('routine_tasks_date', today);
    
    // 清除任务状态
    uni.removeStorageSync('routine_tasks_status');
    
    console.log('每日任务已重置');
};

const goToLatestResult = async () => {
    const navigated = await navigateToLatestScanResult(
        insight.value.latestDetectionRecord,
        insight.value.latestSelfieRecord,
        userStore.userInfo.userId,
    );
    if (!navigated) {
        uni.showToast({ title: t('analysis.noData'), icon: 'none' });
    }
};

// 跳转到聊天页面
const goToChat = () => {
    uni.switchTab({
        url: '/pages/consult/new',
    });
};

const goToProgress = () => {
    uni.switchTab({ url: '/pages/hair/index' });
};

const openDeviceSheet = () => {
    showDeviceSheet.value = true;
};

const closeDeviceSheet = () => {
    showDeviceSheet.value = false;
};

const openLushairDeviceSite = () => {
    closeDeviceSheet();
    window.open('https://lushair.net', '_blank');
};

const goToHairPoints = () => {
    const u = navigator.userAgent;
    // 更准确的iOS/iPad判断逻辑，支持iPadOS 13+
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document);
    if (isiOS) {
        window.webkit.messageHandlers.goToHairPoints.postMessage({data: 'goToHairPoints'});
    } else {
        window.android.goToHairPoints(JSON.stringify({data: 'goToHairPoints'}));
    }
};

const gotoAdvancedScanByTask = () => {
    selectScanType('advancedByTask');
};

// 弹框状态
const showModal = ref(false);

// 显示扫描选择弹框
const showScanModal = () => {
    showModal.value = true;
};

// 隐藏扫描选择弹框
const hideScanModal = () => {
    showModal.value = false;
};

const selectScanType = (type: string) => {
    hideScanModal();
    runScanAction(type as ScanActionType);
};

const goToScanTab = () => {
    uni.switchTab({ url: '/pages/scan/index' });
};

const gotoSkinScan = () => {
    const u = navigator.userAgent;
    // 更准确的iOS/iPad判断逻辑，支持iPadOS 13+
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document);
    if (isiOS) {
        window.webkit.messageHandlers.gotoSkinScan.postMessage({data: 'gotoSkinScan'});
    } else {
        window.android.gotoSkinScan(JSON.stringify({data: 'gotoSkinScan'}));
    }
};

const goToHairLossPrediction = () => {
    uni.navigateTo({
        url: '/pages/index/hair-loss-prediction'
    });
};

// 从原生App接收userId的方法
window.receiveUserIdFromApp = function(userIdString: string) {
  try {
    console.log('从App接收到userId:', userIdString);
    userStore.userInfo.userId = userIdString;
    userStore.fetchUserInfo(userIdString);
    fetchHealthData(userIdString);
    fetchDailyTaskStatus(userIdString);
  } catch (error) {
    console.error('处理App传来的userId失败:', error);
  }
};

onMounted(() => {
    userStore.initUserInfo();
    loadLatestScoreOverview();
    loadPlan();
    uni.$on('care-plan-updated', loadPlan);

    // 加载任务状态
    // Load task status
    loadTaskStatus();
});

onUnmounted(() => {
    uni.$off('care-plan-updated', loadPlan);
});

// 下拉刷新
// Pull down refresh
onPullDownRefresh(async () => {
    console.log('触发下拉刷新');
    try {
        // 重新获取用户信息
        // Refetch user info
        if (userStore.userInfo.userId) {
            await userStore.fetchUserInfo(userStore.userInfo.userId);
            await fetchHealthData(userStore.userInfo.userId);
            await fetchDailyTaskStatus(userStore.userInfo.userId);
        } else {
             // 尝试初始化用户信息
             // Try to initialize user info
             await userStore.initUserInfo();
             if (userStore.userInfo.userId) {
                await fetchHealthData(userStore.userInfo.userId);
                await fetchDailyTaskStatus(userStore.userInfo.userId);
             }
        }
        
        // 重新加载任务状态
        // Reload task status
        loadTaskStatus();
    } catch (error) {
        console.error('刷新失败:', error);
    } finally {
        uni.stopPullDownRefresh();
    }
});

// 每次页面显示时调用
// Called every time page shows
onShow(() => {
    loadPlan();
    loadLatestScoreOverview();
    if (userStore.userInfo.userId) {
        fetchDailyTaskStatus(userStore.userInfo.userId);
    }
});
</script>

<template>
    <MainTabLayout show-promo fixed-header>
        <view class="tab-page-scroll">
        <view class="home-shell">
            <text class="shell-welcome">
                {{ t('home.welcome') }}
                <text class="name">{{ userStore.userInfo.name || 'User' }}</text>
            </text>

            <view class="shell-card shell-score-card shell-home-score-card shell-home-score-card--compact">
                <view class="shell-score-head">
                    <TablerIcon name="chart-bar" :size="15" color="#6B21C8" />
                    <text>{{ t('home.scoreOverview') }}</text>
                </view>

                <view class="shell-home-hero-row">
                    <view class="shell-overall-ring">
                        <svg class="shell-overall-ring-svg" viewBox="0 0 108 108">
                            <circle class="shell-ring-track-stroke" cx="54" cy="54" :r="MAIN_RING_RADIUS" />
                            <circle
                                class="shell-ring-fg-stroke"
                                cx="54"
                                cy="54"
                                :r="MAIN_RING_RADIUS"
                                :stroke-dasharray="getRingStroke(String(healthData.totalScore), MAIN_RING_CIRCUMFERENCE).dasharray"
                                :stroke-dashoffset="getRingStroke(String(healthData.totalScore), MAIN_RING_CIRCUMFERENCE).dashoffset"
                            />
                        </svg>
                        <view class="shell-overall-ring-center">
                            <text class="shell-overall-ring-num">{{ healthData.totalScore }}</text>
                        </view>
                    </view>
                    <view class="shell-home-hero-copy">
                        <view class="shell-home-hero-title-row">
                            <text class="shell-home-hero-title">{{ healthSummary }}</text>
                            <text
                                v-if="overallDeltaLabel"
                                class="shell-score-delta-chip"
                                :class="`shell-score-delta-chip--${overallDeltaTone}`"
                            >
                                {{ overallDeltaLabel }}
                            </text>
                        </view>
                    </view>
                </view>

                <view class="shell-home-divider" />

                <view class="shell-metric-bars shell-metric-bars--compact shell-metric-bars--inline">
                    <view v-for="(metric, idx) in scoreMetrics" :key="idx" class="shell-metric-bar-row">
                        <text class="shell-metric-bar-label">{{ metric.label }}</text>
                        <text class="shell-metric-bar-value">{{ metric.value }}</text>
                        <view class="shell-metric-bar-track">
                            <view
                                class="shell-metric-bar-fill"
                                :style="{ width: `${Math.min(100, Math.max(0, parseInt(metric.value, 10) || 0))}%` }"
                            />
                        </view>
                        <text
                            v-if="formatScoreDelta(metric.delta)"
                            class="shell-metric-bar-delta shell-metric-bar-delta--inline"
                            :class="`shell-metric-bar-delta--${deltaTone(metric.delta)}`"
                        >
                            {{ formatScoreDelta(metric.delta) }}
                        </text>
                    </view>
                </view>

                <view v-if="findingRows.length" class="shell-home-findings">
                    <view class="shell-home-findings-head">
                        <text class="shell-label">{{ t('home.latestFindings') }}</text>
                        <text class="shell-home-link" @tap="goToLatestResult">{{ t('home.viewResult') }}</text>
                    </view>
                    <view class="shell-finding-listcard">
                        <view
                            v-for="(row, idx) in findingRows"
                            :key="`${row.key}-${idx}`"
                            class="shell-finding-row"
                            :class="{ expanded: expandedFindingKey === row.key }"
                        >
                            <view class="shell-finding-row-head" @tap="toggleFinding(row.key)">
                                <view
                                    class="shell-finding-row-icon"
                                    :class="row.tone === 'neutral' ? 'shell-finding-row-icon--neutral' : 'shell-finding-row-icon--warn'"
                                >
                                    <TablerIcon :name="row.icon" :size="18" />
                                </view>
                                <view class="shell-finding-row-copy">
                                    <text class="shell-finding-row-title">{{ row.title }}</text>
                                    <text class="shell-finding-row-sub">{{ row.subtitle }}</text>
                                    <view class="shell-finding-row-chips">
                                        <text
                                            class="shell-finding-chip shell-finding-chip--compact"
                                            :class="row.tone === 'neutral' ? 'shell-finding-chip--neutral' : 'shell-finding-chip--warn'"
                                        >
                                            {{ row.statusChip }}
                                        </text>
                                    </view>
                                </view>
                                <TablerIcon
                                    :name="expandedFindingKey === row.key ? 'chevron-up' : 'chevron-right'"
                                    :size="16"
                                    color="#AEAEB6"
                                />
                            </view>
                            <text
                                v-if="expandedFindingKey === row.key"
                                class="shell-finding-detail shell-finding-detail--row"
                            >
                                {{ getFindingDetail(row.key) }}
                            </text>
                        </view>
                    </view>
                </view>
            </view>

            <view
                v-if="planLoading || hasPlan"
                class="shell-card shell-card-tint shell-home-plan-card shell-home-plan-card--link"
                @tap="goToRoutineTab"
            >
                <view class="shell-home-plan-head">
                    <view class="shell-home-plan-head-main">
                        <TablerIcon name="sparkles" :size="15" color="#6B21C8" />
                        <view class="shell-home-plan-head-copy">
                            <text>{{ t('home.personalizedPlan') }}</text>
                            <text v-if="!planLoading && carePlanSummary" class="shell-home-plan-summary">{{ carePlanSummary }}</text>
                        </view>
                    </view>
                    <TablerIcon name="chevron-right" :size="16" color="#8A82A0" />
                </view>
                <text v-if="planLoading" class="shell-home-plan-loading">{{ t('home.loadingPlan') }}</text>
                <view v-else-if="hasPlan" class="shell-home-plan-preview">
                    <view
                        v-for="item in carePlanItems.slice(0, 2)"
                        :key="item.id"
                        class="shell-home-plan-preview-item"
                    >
                        <view class="shell-home-plan-preview-dot" :class="{ done: item.done }" />
                        <text class="shell-home-plan-preview-name" :class="{ done: item.done }">{{ item.name }}</text>
                    </view>
                    <text v-if="carePlanItems.length > 2" class="shell-home-plan-preview-more">
                        {{ t('home.planOpenRoutine') }}
                    </text>
                </view>
            </view>

            <view class="shell-ask-card" @tap="goToChat">
                <view class="shell-ask-card-icon">
                    <TablerIcon name="sparkles" :size="19" color="#6D28D9" />
                </view>
                <view class="shell-ask-card-body">
                    <text class="shell-ask-card-title">{{ t('home.askLushairAi') }}</text>
                    <text class="shell-ask-card-desc">{{ t('home.askLushairAiDesc') }}</text>
                </view>
                <TablerIcon name="chevron-right" :size="18" color="#AEAEB6" />
            </view>

            <view
                v-if="showProgressCard"
                class="shell-card shell-home-action-card"
                @tap="goToProgress"
            >
                <svg
                    v-if="progressChart"
                    class="shell-home-progress-spark"
                    viewBox="0 0 80 40"
                >
                    <defs>
                        <linearGradient id="homeProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#A78BFA" />
                            <stop offset="100%" stop-color="#6D28D9" />
                        </linearGradient>
                    </defs>
                    <polyline
                        :points="progressChart.polyline"
                        fill="none"
                        stroke="url(#homeProgressGrad)"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <circle
                        :cx="progressChart.lastX"
                        :cy="progressChart.lastY"
                        r="3.2"
                        fill="#6D28D9"
                    />
                </svg>
                <view v-else class="shell-home-progress-fallback">
                    <TablerIcon name="trending-up" :size="22" color="#6D28D9" />
                </view>
                <view class="shell-home-action-copy">
                    <text class="shell-home-action-title">{{ t('home.yourProgress') }}</text>
                    <text class="shell-home-action-desc">{{ progressSummaryText }}</text>
                </view>
                <TablerIcon name="chevron-right" :size="18" color="#AEAEB6" />
            </view>

            <view
                v-if="showConfidenceCard"
                class="shell-card shell-card-confidence shell-home-action-card"
                @tap="openDeviceSheet"
            >
                <view class="shell-home-confidence-icon">
                    <TablerIcon name="device-mobile" :size="18" color="#5B21B6" />
                </view>
                <view class="shell-home-action-copy">
                    <text class="shell-home-action-title shell-home-action-title--accent">
                        {{ t('home.improveScanConfidence') }}
                    </text>
                    <text class="shell-home-action-desc">{{ t('home.improveScanConfidenceDesc') }}</text>
                </view>
                <TablerIcon name="chevron-right" :size="18" color="#6D28D9" />
            </view>

            <button class="shell-btn shell-btn-home-scan" @tap="goToScanTab">
                <TablerIcon name="plus" :size="14" color="#ffffff" />
                <text>{{ t('home.newScan') }}</text>
            </button>
        </view>
        </view>
    </MainTabLayout>

    <DeviceConfidenceSheet
        :visible="showDeviceSheet"
        @close="closeDeviceSheet"
        @learn-more="openLushairDeviceSite"
    />
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.shell-hl-scroll-view {
    -webkit-overflow-scrolling: touch;
}
</style>
