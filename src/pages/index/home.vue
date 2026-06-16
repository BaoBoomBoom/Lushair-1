<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, computed, onMounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { runScanAction, type ScanActionType } from '@/composables/useScanActions';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';

// 引入及初始化页面滚动控制逻辑
// Import and initialize page scrolling control logic
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight } = useStatusBar();
const disableScroll = ref(false);

const checkScroll = () => {
    // 延迟以等待渲染完成
    // Delay to wait for rendering to complete
    setTimeout(() => {
        const query = uni.createSelectorQuery();
        query.select('.home-shell').boundingClientRect();
        query.select('.shell-promo').boundingClientRect();
        query.select('.app-shell-header').boundingClientRect();
        query.exec((res) => {
            const homeShell = res[0];
            const promo = res[1];
            const header = res[2];
            
            const homeHeight = homeShell ? homeShell.height : 0;
            const promoHeight = promo ? promo.height : 0;
            const headerHeight = header ? header.height : 0;
            
            // 总页面内容高度 = 状态栏高度 + 广告条高度 + 头部高度 + 首页内容高度
            // Total page content height = status bar height + promo height + header height + home content height
            const totalPageHeight = statusBarHeight + promoHeight + headerHeight + homeHeight;
            const sysInfo = uni.getSystemInfoSync();
            const windowHeight = sysInfo.windowHeight;
            
            // 当屏幕可用高度大于等于页面高度（含底部tab栏高度除外，因为windowHeight已扣除tabbar高度），则整体页面不要可上下滑动
            // When window height (which excludes native tabbar) >= total content height, disable scroll
            disableScroll.value = windowHeight >= totalPageHeight;
            console.log('[Home Page Scroll Control]', {
                windowHeight,
                totalPageHeight,
                disableScroll: disableScroll.value
            });
        });
    }, 150);
};

const { t } = useI18n();

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function,
};

import { getApiUrl } from '@/utils/apiHelper';

// 健康度数据
const healthData = ref({
    scalpHealth: '0',
    follicleHealth: '0',
    hairHealth: '0',
    totalScore: 0,
    hasData: false,
    loading: true
});

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

const lastScanDisplay = ref({ value: '—', unit: '' });

const getRingStroke = (value: string) => {
    const pct = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    return {
        dasharray: RING_CIRCUMFERENCE,
        dashoffset: RING_CIRCUMFERENCE * (1 - pct / 100),
    };
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
    { value: healthData.value.scalpHealth, label: t('analysis.scalp') },
    { value: healthData.value.hairHealth, label: t('home.hairStrength') },
    { value: healthData.value.follicleHealth, label: t('advancedResult.follicle') },
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

// 获取健康度数据
const fetchHealthData = async (userId: string) => {
    try {
        healthData.value.loading = true;
        let response: any;
        
        // 根据用户类型调用不同的API
        if ((userStore.userInfo as any).type === 1) {
            response = await post('user/getMerchantDetectionRecordList', { merchantId: userId });
        } else {
            response = await post('user/getDetectionRecordList', { userId });
        }
        
        console.log('健康度数据响应:', response);
        
        // 检查响应状态
        if (response) {
            const { list } = response;
            console.log('list数据响应:', list);
            
            // 计算本周内的检测次数
            const weekCheckTimes = calculateWeekCheckTimes(list);
            userStore.userInfo.checkTimes = weekCheckTimes;
            thisWeekCheckTimes.value = weekCheckTimes;
            
            // 计算周环比差值
            weekOverWeekDifference.value = calculateWeekOverWeekDifference(list);
            
            if (list && list.length > 0) {
                const record = list[0];
                lastScanDisplay.value = formatLastScanRelative(record.createTime);
                userData.value.lastUpdated = record.createTime || '';
                // 先设置为0，等待动画效果
                healthData.value = {
                    scalpHealth: '0',
                    follicleHealth: '0',
                    hairHealth: '0',
                    totalScore: 0,
                    hasData: true,
                    loading: false
                };
                
                // 延迟更新数据，以便看到动画效果
                // Delay updating data to show animation effect
                setTimeout(() => {
                    healthData.value = {
                        scalpHealth: String(Math.round(record.scalp) || 0),
                        follicleHealth: String(Math.round(record.follicle) || 0),
                        hairHealth: String(Math.round(record.hair) || 0),
                        totalScore: Math.round(record.scalpScore) || 0,
                        hasData: true,
                        loading: false
                    };
                    
                    // 更新用户信息中的健康度数据
                    // Update health data in user info
                    userStore.updateUserInfo({
                        scalpHealth: healthData.value.scalpHealth,
                        follicleHealth: healthData.value.follicleHealth,
                        hairHealth: healthData.value.hairHealth,
                        totalScore: healthData.value.totalScore
                    });

                    // 重新检测是否需要禁止滚动
                    // Recheck if scroll needs to be disabled
                    checkScroll();
                }, 300);
            } else {
                lastScanDisplay.value = formatLastScanRelative();
                setNoDataState();
                checkScroll();
            }
        } else {
            lastScanDisplay.value = formatLastScanRelative();
            setNoDataState();
            checkScroll();
        }
    } catch (error) {
        console.error('获取健康度数据失败:', error);
        lastScanDisplay.value = formatLastScanRelative();
        setNoDataState();
        checkScroll();
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

// 跳转到聊天页面
const goToChat = () => {
    uni.switchTab({
        url: '/pages/consult/new',
    });
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

    // 开发环境：如果没有userId，设置默认值
    // Development environment: set default userId if not exists
    if (import.meta.env.DEV && !userStore.userInfo.userId) {
        userStore.userInfo.userId = 'lusHair330e986a';
    }

    // 如果有userId，获取健康度数据
    // If there is a userId, get health data
    if (userStore.userInfo.userId) {
        fetchHealthData(userStore.userInfo.userId);
    }
    
    // 加载任务状态
    // Load task status
    loadTaskStatus();

    // 检测页面滚动限制
    // Check page scroll limit
    checkScroll();
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
        checkScroll();
    }
});

// 每次页面显示时调用
// Called every time page shows
onShow(() => {
    // 如果有userId，获取每日任务状态
    // If there is a userId, get daily task status
    if (userStore.userInfo.userId) {
        fetchDailyTaskStatus(userStore.userInfo.userId);
    }
    checkScroll();
});
</script>

<template>
    <page-meta :page-style="disableScroll ? 'overflow: hidden; height: 100vh;' : ''" />
    <MainTabLayout show-promo>
        <view class="home-shell">
            <text class="shell-welcome">
                {{ t('home.welcome') }}
                <text class="name">{{ userStore.userInfo.name || 'User' }}</text>
            </text>

            <view class="shell-card shell-score-card">
                <view class="shell-score-head">
                    <TablerIcon name="chart-bar" :size="15" color="#6B21C8" />
                    <text>{{ t('home.scoreOverview') }}</text>
                </view>
                <view class="shell-rings">
                    <view v-for="(metric, idx) in scoreMetrics" :key="idx" class="shell-ring-wrap">
                        <view class="shell-ring">
                            <svg class="shell-ring-svg" viewBox="0 0 84 84">
                                <circle class="shell-ring-track-stroke" cx="42" cy="42" :r="RING_RADIUS" />
                                <circle
                                    class="shell-ring-fg-stroke"
                                    cx="42"
                                    cy="42"
                                    :r="RING_RADIUS"
                                    :stroke-dasharray="getRingStroke(metric.value).dasharray"
                                    :stroke-dashoffset="getRingStroke(metric.value).dashoffset"
                                />
                            </svg>
                            <text class="shell-ring-num">{{ metric.value }}</text>
                        </view>
                        <text class="shell-ring-lbl">{{ metric.label }}</text>
                    </view>
                </view>
            </view>

            <text class="shell-section-h">{{ t('home.weeklyHighlights') }}</text>
            <scroll-view
                scroll-x
                enable-flex
                :show-scrollbar="false"
                class="shell-hl-scroll-view"
            >
                <view class="shell-hl-row">
                    <view class="shell-hl-card" @tap="goToHairPoints">
                        <view class="shell-hl-top">
                            <TablerIcon name="circle-dotted" :size="17" color="#1A1228" />
                            <text>{{ t('home.hairPoints') }}</text>
                        </view>
                        <view class="shell-hl-val">
                            <text>{{ userStore.userInfo.points || 0 }}</text>
                        </view>
                        <text class="shell-hl-unit">{{ t('home.points') }}</text>
                    </view>
                    <view class="shell-hl-card" @tap="goToScanTab">
                        <view class="shell-hl-top">
                            <TablerIcon name="qrcode" :size="17" color="#1A1228" />
                            <text>{{ t('home.scans') }}</text>
                        </view>
                        <view class="shell-hl-val">
                            <text>{{ thisWeekCheckTimes || 0 }}</text>
                            <text v-if="weekOverWeekDifference !== 0" class="shell-hl-badge">
                                {{ weekOverWeekDifference > 0 ? '+' : '' }}{{ weekOverWeekDifference }}
                            </text>
                        </view>
                        <text class="shell-hl-unit">{{ t('home.times') }}</text>
                    </view>
                    <view class="shell-hl-card">
                        <view class="shell-hl-top">
                            <TablerIcon name="clock" :size="17" color="#1A1228" />
                            <text>{{ t('home.lastScan') }}</text>
                        </view>
                        <view class="shell-hl-val">
                            <text>{{ lastScanDisplay.value }}</text>
                        </view>
                        <text class="shell-hl-unit">{{ lastScanDisplay.unit }}</text>
                    </view>
                </view>
            </scroll-view>

            <view class="shell-ai-banner" @tap="goToChat">
                <view class="ai-ic">
                    <TablerIcon name="sparkles" :size="20" color="#ffffff" />
                </view>
                <view class="shell-ai-banner-text">
                    <text class="ai-t">{{ t('home.askLushairAi') }}</text>
                    <text class="ai-s">{{ t('home.askLushairAiDesc') }}</text>
                </view>
            </view>

            <button class="shell-btn shell-btn-home-scan" @tap="goToScanTab">
                <TablerIcon name="plus" :size="14" color="#ffffff" />
                <text>{{ t('home.newScan') }}</text>
            </button>
        </view>
    </MainTabLayout>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.shell-hl-scroll-view {
    -webkit-overflow-scrolling: touch;
}

.shell-ai-banner-text {
    min-width: 0;
    flex: 1;
}
</style>
