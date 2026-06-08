<template>
  <view class="home-container">
    <!-- 添加下拉刷新，但不影响正常滚动 -->
    <scroll-view 
      scroll-y="true" 
      class="scroll-container" 
      refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRefreshRestore"
      refresher-threshold="80"
      show-scrollbar="true"
      enable-back-to-top="true"
      bounces="true"
    >
      <view class="content-wrapper">
        <!-- 顶部导航栏 -->
        <view class="header">
          <view class="logo">L</view>
          <view class="profile-icon" @tap="goToProfile">
            <ShellUserIcon variant="header" />
          </view>
        </view>

        <!-- 欢迎信息 -->
        <view class="welcome-section">
          <text class="welcome-text">{{ $t('home.welcome') }} <text class="welcome-name">{{userInfo.name}}</text></text>
        </view>

        <!-- 分数概览卡片 -->
        <view class="score-card">
          <view class="score-header">
            <view class="score-icon">
              <text class="score-icon-text">{{ $t('home.scoreOverview') }}</text>
            </view>
          </view>
          
          <view class="score-metrics">
            <!-- 头皮健康度 -->
            <view class="metric-item">
              <view class="circular-progress">
                <view class="progress-circle">
                  <view class="circle-bg"></view>
                  <view v-if="healthData.hasData" class="circle-progress-bar" :style="{ 
                    background: `conic-gradient(#8b5cf6 ${getProgressDegrees(healthData.scalpHealth)}deg, transparent 0deg)`
                  }"></view>
                  <view v-if="healthData.loading" class="loading-overlay">
                    <text class="loading-text">加载中...</text>
                  </view>
                  <view v-else-if="!healthData.hasData" class="locked-overlay">
                    <TablerIcon name="lock" :size="14" class="lock-icon" />
                  </view>
                  <view class="progress-inner">
                    <text class="progress-value">{{healthData.hasData ? healthData.scalpHealth : '0'}}</text>
                  </view>
                </view>
              </view>
              <text class="metric-label">{{ $t('home.SCALP') }}</text>
            </view>
            
            <!-- 毛囊健康度 -->
            <view class="metric-item">
              <view class="circular-progress">
                <view class="progress-circle">
                  <view class="circle-bg"></view>
                  <view v-if="healthData.hasData" class="circle-progress-bar" :style="{ 
                    background: `conic-gradient(#8b5cf6 ${getProgressDegrees(healthData.follicleHealth)}deg, transparent 0deg)`
                  }"></view>
                  <view v-if="healthData.loading" class="loading-overlay">
                    <text class="loading-text">加载中...</text>
                  </view>
                  <view v-else-if="!healthData.hasData" class="locked-overlay">
                    <TablerIcon name="lock" :size="14" class="lock-icon" />
                  </view>
                  <view class="progress-inner">
                    <text class="progress-value">{{healthData.hasData ? healthData.follicleHealth : '0'}}</text>
                  </view>
                </view>
              </view>
              <text class="metric-label">{{ $t('home.FOLLICLE') }}</text>
            </view>
            
            <!-- 头发健康度 -->
            <view class="metric-item">
              <view class="circular-progress">
                <view class="progress-circle">
                  <view class="circle-bg"></view>
                  <view v-if="healthData.hasData" class="circle-progress-bar" :style="{ 
                    background: `conic-gradient(#8b5cf6 ${getProgressDegrees(healthData.hairHealth)}deg, transparent 0deg)`
                  }"></view>
                  <view v-if="healthData.loading" class="loading-overlay">
                    <text class="loading-text">加载中...</text>
                  </view>
                  <view v-else-if="!healthData.hasData" class="locked-overlay">
                    <TablerIcon name="lock" :size="14" class="lock-icon" />
                  </view>
                  <view class="progress-inner">
                    <text class="progress-value">{{healthData.hasData ? healthData.hairHealth : '0'}}</text>
                  </view>
                </view>
              </view>
              <text class="metric-label">{{ $t('home.HAIR') }}</text>
            </view>
          </view>
        </view>

        <!-- 总体评分卡片 -->
        <view class="total-score-card">
          <view v-if="!healthData.hasData || !summaryAvailable" class="locked-score-overlay">
            <TablerIcon name="lock" :size="24" class="big-lock-icon" />
          </view>
          <view class="total-score-section">
            <view class="big-score">
              <text class="score-number">{{healthData.hasData ? healthData.totalScore : '0'}}</text>
              <text class="score-denominator">/100</text>
            </view>
            <view class="score-comparison">
              <text class="comparison-text">{{ $t('home.excellentThan', [summaryAvailable ? (latestSummaryData?.precede || 0) : 0]) }}</text>
              <TablerIcon name="thumb-up" :size="16" class="thumbs-up" />
            </view>
          </view>
          
          <view class="warning-section" @tap="showAlerts">
            <view class="warning-icon">
              <TablerIcon name="alert-triangle" :size="18" color="#c2610a" />
            </view>
            <text class="warning-text">{{ $t('home.warningDetected', [alertCount]) }}</text>
          </view>
          
          <view class="action-button" @tap="checkSolution">
            <text class="button-text">{{ $t('home.checkPlan') }}</text>
          </view>
          
          <view class="scan-progress">
            <text class="progress-text">{{ $t('home.weekProgress', [encrInfo?.productClockInDaysInWeek ?? 0]) }}</text>
            <view class="progress-bar">
              <view class="progress-filled" :style="'width: ' + ((encrInfo?.productClockInDaysInWeek ?? 0)/7*100) + '%;'"></view>
            </view>
          </view>
        </view>

        <!-- 扫描提示 -->
        <view class="scan-reminder" v-if="scanRemindersVisible">
          <scroll-view scroll-x="true" class="scan-reminder-scroll">
            <view class="scan-reminder-content">
              <view v-for="(reminder, idx) in scanReminders" :key="idx" class="reminder-text">{{ reminder }}</view>
            </view>
          </scroll-view>
        </view>

        <!-- 扫描测试部分 -->
        <view class="section-container">
          <view class="section-header">
            <image class="section-icon" src="/static/scan-icon.svg"></image>
            <text class="section-title">{{ $t('home.scanTests') }}</text>
          </view>
          
          <view class="scan-item" @tap="openDermascope">
            <view class="scan-color-indicator"></view>
            <view class="scan-info">
              <text class="scan-title">{{ $t('home.dermascope') }}</text>
              <text class="scan-points">+100 {{ $t('home.hairPoints') }}</text>
            </view>
          </view>
          
          <text class="scan-description">{{ $t('home.detectPoints') }}</text>
          
          <view class="scan-buttons">
            <view class="primary-button" @tap="startTrichodScan">
              <text>{{ $t('home.startTrichoScan') }}</text>
            </view>
          </view>
        </view>

        <!-- 日常护理部分 -->
        <view class="section-container">
          <view class="section-header">
            <image class="section-icon" src="/static/routine-icon.svg"></image>
            <text class="section-title">{{ $t('home.routine') }}</text>
          </view>
          
          <view class="routine-item">
            <view class="routine-indicator active"></view>
            <view class="routine-content">
              <text class="routine-title">{{ $t('home.scanScalp') }}</text>
              <text class="routine-description">{{ $t('home.easySnap') }}</text>
            </view>
          </view>
          
          <view class="routine-item">
            <view class="routine-indicator"></view>
            <view class="routine-content">
              <text class="routine-title">{{ $t('home.logHaircare') }}</text>
              <text class="routine-description">{{ $t('home.dailyClockin') }}</text>
            </view>
          </view>
          
          <view class="buttons">
            <view class="primary-button" @tap="goToPhoneCamAnalysis">
              <text>{{ $t('home.continueRoutine') }}</text>
            </view>
          </view>
        </view>

        <!-- 周度亮点部分 -->
        <view class="section-container">
          <view class="section-header">
            <image class="section-icon" src="/static/highlights-icon.svg"></image>
            <text class="section-title">{{ $t('home.weeklyHighlights') }}</text>
          </view>
          
          <scroll-view class="highlights-scroll" scroll-x="true" show-scrollbar="false">
            <view class="highlights-grid">
              <view class="highlight-card">
                <view class="highlight-header">
                  <view class="highlight-icon">
                    <text class="highlight-icon-text">✦</text>
                  </view>
                  <text class="highlight-title">{{ $t('home.hairPoints') }}</text>
                </view>
                <view class="highlight-content">
                  <text class="highlight-number">{{userInfo.hairPoints}}</text>
                </view>
                <view class="highlight-label">{{ $t('home.points') }}</view>
              </view>
              
              <view class="highlight-card">
                <view class="highlight-header">
                  <view class="highlight-icon">
                    <TablerIcon name="check" :size="14" class="highlight-icon-text" />
                  </view>
                  <text class="highlight-title">{{ $t('home.checks') }}</text>
                </view>
                <view class="highlight-content">
                  <text class="highlight-number">{{userInfo.checkTimes}}</text>
                </view>
                <text class="highlight-label">{{ $t('home.times') }}</text>
              </view>
              
              <view class="highlight-card health-card">
                <view class="highlight-header">
                  <view class="highlight-icon health-icon">
                    <text class="highlight-icon-text">♡</text>
                  </view>
                  <text class="highlight-title">{{ $t('home.generalHealth') }}</text>
                </view>
                <view class="highlight-content health-status">
                  <text class="health-value">Normal</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 今日任务 -->
        <view v-if="!encrInfo.clockedIn" class="daily-task" @tap="openDailyTask">
          <view class="task-info">
            <text class="task-text">{{ $t('home.dailyTask') }}</text>
            <text class="task-reward">{{ $t('home.taskReward', ['10']) }}</text>
          </view>
          <text class="task-arrow">›</text>
        </view>
      </view>
    </scroll-view>

    <!-- 打卡弹窗 -->
    <ClockInPopup 
      :visible="showClockInPopup" 
      @update:visible="showClockInPopup = $event"
      :initial-products="recommendedProducts"
      @clock-in-updated="handleClockInUpdated"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ShellUserIcon from '@/components/icons/ShellUserIcon.vue';
import { useUserStore } from '../../stores/userStore';
import { getGlobalTracker } from '../../utils/globalTracker';
import { get, post } from '@/utils/request'
import { useI18n } from 'vue-i18n';
import ClockInPopup from '@/components/ClockInPopup.vue';
import env from '@/utils/env';
// @ts-ignore
import { setLocale } from '@/i18n.js';

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function,
  changeTabToChat: Function,
  receiveLanguageFromApp: Function
};

const userStore = useUserStore();
const { userInfo } = userStore;
const { t, locale } = useI18n();

// 添加下拉刷新状态
const isRefreshing = ref(false);

// 用户积分数据
const encrInfo = ref<{
  points: number | null;
  productClockInDaysInWeek: number | null;
  monthlySummary: any | null;
  clockedIn?: boolean;
}>({
  points: null,
  productClockInDaysInWeek: null,
  monthlySummary: null,
  clockedIn: false
});

// 健康度数据
const healthData = ref({
  scalpHealth: '0',
  follicleHealth: '0',
  hairHealth: '0',
  totalScore: 0,
  hasData: false,
  loading: true
});

// 圆圈动画控制
const animateCircles = ref(false);

// 计算进度条宽度
const getProgressDegrees = (value: string) => {
  const numValue = parseInt(value) || 0;
  // 将百分比值转换为角度，100%对应360度
  return (Math.min(numValue, 100) / 100) * 360;
};

// 从原生App接收userId的方法
window.receiveUserIdFromApp = function(userIdString: string) {
  try {
    console.log('从App接收到userId:', userIdString);
    userInfo.userId = userIdString;
    userStore.fetchUserInfo(userIdString);
    fetchLatestSummary(userIdString);
    fetchHealthData(userIdString);
    fetchEncrInfo(userIdString);
    fetchDailyTaskStatus(userIdString);
    productRecommend(userIdString);
  } catch (error) {
    console.error('处理App传来的userId失败:', error);
  }
};



window.receiveLanguageFromApp = function(language: string) {
  console.log('从App接收到语言:', language);
  if (language.includes('zh') || language.includes('en')) {
    setLocale(language);
  } else {
    setLocale('en');
  }
}

// 总体评分卡片和扫描提示的数据可用性
const summaryAvailable = ref(false)
const latestSummaryData = ref<{ precede?: number }>({})

// 扫描提示相关
const scanReminders = ref<string[]>([]);
const scanRemindersVisible = ref(true);

const alertCount = ref(0);
const alertDescriptions = ref<string[]>([]);

const fetchLatestSummary = async (userId: string) => {
  try {
    const response = await post('analyse/latest/summary', { userId })
    console.log(response)
    // 如果响应存在且有效，设置summaryAvailable为true
    if (response) {
      summaryAvailable.value = true
      latestSummaryData.value = response
      // 处理扫描提示
      const data = response as { conditions?: any[] };
      handleScanReminders(data.conditions)
      // 处理警告
      handleAlerts(data.conditions)
    } else {
      summaryAvailable.value = false
      scanReminders.value = []
      scanRemindersVisible.value = false
    }
  } catch (error) {
    console.error('获取最新检测结果概览失败:', error)
    summaryAvailable.value = false
    scanReminders.value = []
    scanRemindersVisible.value = false
  }
}

function handleScanReminders(conditions: any[] = []) {
  if (!conditions || conditions.length === 0) {
    scanReminders.value = [];
    scanRemindersVisible.value = false;
    return;
  }
  const reminders: string[] = [];
  let hasAny = false;
  let allRatioNull = true;
  for (const cond of conditions) {
    if (cond.ratio !== null && cond.ratio !== undefined) allRatioNull = false;
    switch (cond.key) {
      case 'OIL':
        if (cond.ratio > 0) {
          reminders.push(t('scan.oilUp'));
          hasAny = true;
        }
        break;
      case 'DENSITY':
        if (cond.ratio < 0) {
          reminders.push(t('scan.densityDown'));
          hasAny = true;
        }
        break;
      case 'REDNESS':
        if (cond.ratio > 0) {
          reminders.push(t('scan.rednessUp'));
          hasAny = true;
        }
        break;
      case 'KERATINOCYTES':
        if (cond.ratio > 0) {
          reminders.push(t('scan.scurfUp'));
          hasAny = true;
        }
        break;
      case 'SCURF':
        if (cond.ratio > 0) {
          reminders.push(t('scan.scurfUp'));
          hasAny = true;
        }
        break;
      case 'FOLLICLE':
        if (cond.ratio < 0) {
          reminders.push(t('scan.follicleDown'));
          hasAny = true;
        }
        break;
    }
  }
  if (allRatioNull) {
    scanReminders.value = [];
    scanRemindersVisible.value = false;
    return;
  }
  if (!hasAny) {
    reminders.push(t('scan.noProblem'));
  }
  scanReminders.value = reminders;
  scanRemindersVisible.value = true;
}

function handleAlerts(conditions: any[] = []) {
  alertCount.value = 0;
  alertDescriptions.value = [];
  conditions.forEach(condition => {
    if (condition.grade !== 'NORMAL') {
      alertCount.value++;
      alertDescriptions.value.push(`${condition.desc} ${condition.grade}`);
    }
  });
}

const showAlerts = () => {
  if (alertDescriptions.value.length > 0) {
    uni.showModal({
      title: t('home.alerts'),
      content: alertDescriptions.value.map(desc => t(desc)).join(', '),
      showCancel: false,
      confirmText: t('common.confirm')
    });
  }
};

// 获取健康度数据
const fetchHealthData = async (userId: string) => {
  try {
    healthData.value.loading = true;
    let response: any;
    
    // 根据用户类型调用不同的API
    if ((userInfo as any).type === 1) {
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
      userInfo.checkTimes = weekCheckTimes;
      
      // 更新用户本周检测次数
      // userStore.updateUserInfo({
      //   checkTimes: weekCheckTimes
      // });
      
      if (list && list.length > 0) {
        const record = list[list.length - 1];
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
          userStore.updateUserInfo({
            scalpHealth: healthData.value.scalpHealth,
            follicleHealth: healthData.value.follicleHealth,
            hairHealth: healthData.value.hairHealth,
            totalScore: healthData.value.totalScore
          });
        }, 300);
      } else {
        setNoDataState();
      }
    } else {
      setNoDataState();
    }
  } catch (error) {
    console.error('获取健康度数据失败:', error);
    setNoDataState();
  }
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

// 请求App传递userId
const requestUserIdFromApp = () => {
  try {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document); // iOS终端
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; // Android终端
    
    if (isiOS && window.webkit && window.webkit.messageHandlers) {
      window.webkit.messageHandlers.getUserId.postMessage({action: 'getUserId'});
      console.log('向iOS App发送获取userId请求');
    } else if (isAndroid && window.android) {
      const userIdFromAndroid = window.android.getUserId();
      console.log('从Android App直接获取userId:', userIdFromAndroid);
      
      if (userIdFromAndroid) {
        window.receiveUserIdFromApp(userIdFromAndroid);
      }
    } else {
      // lusHair32685064 lusHair9cf6a4f9
      console.log('未检测到原生环境，使用模拟userId');
      const isDev = env.isDevelopment(); 
      if (isDev) {
        userInfo.userId = 'lusHair330e986a';
        window.receiveUserIdFromApp('lusHair330e986a');
      }
    }
  } catch (error) {
    console.error('请求App userId时出错:', error);
    const isDev = env.isDevelopment(); 
    if (isDev) {
      userInfo.userId = 'lusHair330e986a';
      window.receiveUserIdFromApp('lusHair330e986a');
    }
  }
};

// 打卡弹窗相关状态
const showClockInPopup = ref(false);
const recommendedProducts = ref<Array<{
  type: string;
  typeDesc: string;
  productId: number;
  productTitle: string;
  productDesc: string | null;
  productUrl: string;
  clockIn?: boolean;
}>>([]);

// 处理打卡更新
const handleClockInUpdated = (data: {
  date: string;
  records: string[];
  allRecords: Record<string, string[]>;
}) => {
  console.log('打卡数据已更新:', data);
  // 可以在这里做额外的处理，如UI更新、数据同步等
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('product_clock_in');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 查看方案
const checkSolution = () => {
  // uni.navigateTo({
  //   url: '/pages/trichoscan/index'
  // });
  
  // 显示打卡弹窗而不是跳转
  showClockInPopup.value = true;
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('view_solution');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 打开皮肤镜分析
const openDermascope = () => {
  const u = navigator.userAgent
  const isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
  if (isiOS) {
    window.webkit.messageHandlers.openDermascope.postMessage({data: 'openDermascope'});
  } else {
    window.android.openDermascope(JSON.stringify({data: 'openDermascope'}));
  }
  
  // 记录扫描
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('open_dermascope');
    tracker.trackScan();
  } catch (error) {
    console.error('记录扫描失败:', error);
  }
};

// 开始家庭三维扫描
const startTrichodScan = () => {
  openDermascope();
};

// 跳转到手机拍照分析页
const goToPhoneCamAnalysis = () => {
  const u = navigator.userAgent
  const isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
  if (isiOS) {
    window.webkit.messageHandlers.openPhoneCam.postMessage({data: 'openPhoneCam'});
  } else {
    window.android.openPhoneCam(JSON.stringify({data: 'openPhoneCam'}));
  }
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('open_phone_cam');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }

  // goToQuestionnaire();
};

// 跳转到问卷页面
const goToQuestionnaire = () => {
  uni.navigateTo({
    url: '/pages/questionnaire/index'
  });
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('open_questionnaire');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 继续你的日常
const continueRoutine = () => {
  uni.navigateTo({
    url: '/pages/routine/index'
  });
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('continue_routine');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 打开每日任务
const openDailyTask = () => {
  // uni.navigateTo({
  //   url: '/pages/task/index'
  // });

  showClockInPopup.value = true;
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('open_daily_task');
    
    // 尝试记录每日签到
    tracker.trackDailyCheckIn();
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 跳转到护照分享页
const goToPassport = () => {
  uni.navigateTo({
    url: '/pages/share/passport'
  });
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('share_passport');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 跳转到个人资料页面
const goToProfile = () => {
  uni.switchTab({
    url: '/pages/profile/index'
  });
  
  // 记录功能使用
  try {
    const tracker = getGlobalTracker();
    tracker.trackFeature('view_profile');
  } catch (error) {
    console.error('记录功能使用失败:', error);
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
      }
    }
  } catch (error) {
    console.error('获取今日任务状态失败:', error);
    // 默认为未打卡
    encrInfo.value.clockedIn = false;
  }
};

// 定义接口响应类型
interface EncrInfoResponse {
  points: number | null;
  productClockInDaysInWeek: number | null;
  monthlySummary: any | null;
}

const fetchEncrInfo = async (userId: string) => {
  try {
    const response = await post('/encr/info', { userId })
    console.log(response)
    if (response) {
      // 使用类型断言处理响应数据
      const data = response as EncrInfoResponse;
      
      encrInfo.value = {
        points: data.points,
        productClockInDaysInWeek: data.productClockInDaysInWeek,
        monthlySummary: data.monthlySummary
      }
      
      // 更新用户信息中的积分
      // userStore.updateUserInfo({
      //   hairPoints: data.points || 0
      // })
    }
  } catch (error) {
    console.error('获取用户激励信息失败:', error)
  }
}

const productRecommend = async (userId: string) => {
  try {
    const response = await post('/product/recommend', { userId });
    console.log('产品推荐数据:', response);
    
    if (response && Array.isArray(response)) {
      // 使用原始API响应格式，ClockInPopup组件已更新为同时支持两种格式
      recommendedProducts.value = response;
    }
  } catch (error) {
    console.error('获取产品推荐失败:', error);
    recommendedProducts.value = [];
  }
}

// 刷新数据的方法
const refreshData = async () => {
  try {
    console.log('刷新数据...');
    if (userInfo.userId) {
      // 同时调用所有数据请求
      await Promise.all([
        fetchLatestSummary(userInfo.userId),
        fetchHealthData(userInfo.userId),
        fetchEncrInfo(userInfo.userId),
        fetchDailyTaskStatus(userInfo.userId),
        productRecommend(userInfo.userId)
      ]);
      
      // 显示刷新成功提示
      // uni.showToast({
      //   title: '刷新成功',
      //   icon: 'success',
      //   duration: 1500
      // });
    } else {
      requestUserIdFromApp();
    }
  } catch (error) {
    console.error('刷新数据失败:', error);
    
    // 显示刷新失败提示
    uni.showToast({
      title: '刷新失败',
      icon: 'error',
      duration: 1500
    });
  } finally {
    // 延迟关闭刷新状态，让用户能看到刷新动画
    setTimeout(() => {
      isRefreshing.value = false;
    }, 1000);
  }
};

// 处理下拉刷新
const onRefresh = () => {
  isRefreshing.value = true;
  refreshData();
};

// 刷新恢复事件
const onRefreshRestore = () => {
  console.log('刷新恢复');
};

onMounted(() => {
  try {
    // 初始化用户信息
    userStore.initUserInfo();
    // 从App请求userId
    requestUserIdFromApp();
    console.log('页面已加载，已向App请求userId');
    
    // 如果已有userId，则直接获取健康度数据和今日任务状态
    if (userInfo.userId) {
      // fetchHealthData(userInfo.userId);
      fetchDailyTaskStatus(userInfo.userId);
    }
  } catch (error) {
    console.error('初始化数据加载失败', error);
  }
});
</script>

<style>
.home-container {
  background-color: #fff;
  height: 100vh;
  position: relative;
  width: 100%;
  overflow: hidden;
}

.scroll-container {
  height: 100vh;
  width: 100%;
  position: relative;
}

.content-wrapper {
  padding: 16px 16px 32px 16px;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}

/* 顶部导航栏样式 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.logo {
  font-size: 40px;
  font-weight: 700;
  color: #000;
  font-family: 'Didot', 'Times New Roman', serif;
  line-height: 0.9;
}

.profile-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #eee;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.profile-icon image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* 欢迎信息样式 */
.welcome-section {
  margin-bottom: 20px;
}

.welcome-text {
  font-size: 24px;
  color: #333;
}

.welcome-name {
  color: #333;
  font-weight: 500;
}

/* 分数概览卡片样式 */
.score-card {
  background-color: #f1f1f1;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.score-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.score-icon {
  display: flex;
  align-items: center;
}

.score-icon-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.score-metrics {
  display: flex;
  justify-content: space-between;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 30%;
}

.circular-progress {
  width: 72px;
  height: 72px;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.progress-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.circle-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(139, 92, 246, 0.15);
}

.circle-progress-bar {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(#8b5cf6 0deg, transparent 0deg);
  transition: background 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-inner {
  position: absolute;
  width: calc(100% - 12px);
  height: calc(100% - 12px);
  border-radius: 50%;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.progress-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  text-align: center;
  line-height: 1;
  transition: all 1s ease-out;
}

/* 锁定状态 */
.locked-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  z-index: 3;
}

.lock-icon {
  font-size: 24px;
  color: #999;
}

/* 加载中遮罩 */
.loading-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  z-index: 4;
}

.loading-text {
  font-size: 12px;
  color: #666;
}

/* 总体评分卡片样式 */
.total-score-card {
  background-color: #e9d5ff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

/* 锁定状态遮罩 */
.locked-score-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.big-lock-icon {
  font-size: 40px;
  color: #666;
}

.total-score-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.big-score {
  display: flex;
  align-items: baseline;
}

.score-number {
  font-size: 48px;
  font-weight: 700;
  color: #333;
}

.score-denominator {
  font-size: 18px;
  color: #666;
  margin-left: 4px;
}

.score-comparison {
  margin-left: 16px;
  display: flex;
  align-items: center;
}

.comparison-text {
  font-size: 14px;
  color: #333;
  margin-right: 8px;
}

.warning-section {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 8px 16px;
  margin-bottom: 16px;
}

.warning-icon {
  margin-right: 8px;
}

.warning-text {
  font-size: 14px;
  color: #333;
  text-align: center;
  flex: 1;
}

.action-button {
  background-color: #8b5cf6;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  margin-bottom: 16px;
}

.button-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.scan-progress {
  margin-top: 8px;
}

.progress-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.progress-bar {
  height: 6px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 3px;
  overflow: hidden;
}

.progress-filled {
  height: 100%;
  background-color: #8b5cf6;
  border-radius: 3px;
}

/* 扫描提示样式 */
.scan-reminder {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}
.scan-reminder-scroll {
  width: 100%;
  white-space: nowrap;
}
.scan-reminder-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex-wrap: nowrap;
}
.reminder-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin-right: 24px;
  min-width: 220px;
  max-width: 400px;
  white-space: pre-line;
}

/* 扫描测试部分样式 */
.section-container {
  margin-bottom: 24px;
  border-radius: 12px;
  padding: 16px;
  background-color: #f9fafb;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.section-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.scan-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.scan-color-indicator {
  width: 8px;
  height: 24px;
  background-color: #8b5cf6;
  margin-right: 12px;
  border-radius: 4px;
}

.scan-info {
  display: flex;
  flex-direction: column;
}

.scan-title {
  font-size: 16px;
  color: #8b5cf6;
  margin-bottom: 4px;
}

.scan-points {
  font-size: 13px;
  color: #666;
}

.scan-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
  padding: 0 20px;
}

.scan-buttons {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.primary-button, .secondary-button {
  background-color: #8b5cf6;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.primary-button {
  flex: 1;
}

.primary-button text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.secondary-button {
  margin-top: 10px;
  border: 1px solid #8b5cf6;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.secondary-button.questionnaire {
  background-color: #e9d5ff;
  border-color: #a855f7;
}

.secondary-button text {
  color: #8b5cf6;
  font-size: 14px;
}

.secondary-button.questionnaire text {
  color: #7e22ce;
}

/* 日常护理部分样式 */
.routine-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.routine-indicator {
  width: 16px;
  height: 16px;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin-right: 12px;
  margin-top: 2px;
}

.routine-indicator.active {
  background-color: #8b5cf6;
  border-color: #8b5cf6;
}

.routine-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.routine-title {
  font-size: 16px;
  color: #8b5cf6;
  margin-bottom: 4px;
}

.routine-description {
  font-size: 14px;
  color: #666;
}

.continue-button {
  background-color: #8b5cf6;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.continue-button-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

/* 周度亮点部分样式 */
.highlights-scroll {
  width: 100%;
  white-space: nowrap;
  overflow-x: auto;
}

.highlights-grid {
  display: inline-flex;
  padding: 0 4px;
  flex-wrap: nowrap;
}

.highlight-card {
  width: 150px;
  min-width: 150px;
  background-color: #fff;
  border-radius: 8px;
  padding: 0px;
  border: 1px solid #eee;
  margin-right: 12px;
  display: inline-block;
}

.highlight-header {
  padding: 16px 0px 0px 10px;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.highlight-icon {
  width: 18px;
  height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 2px;
  flex-shrink: 0;
  position: relative;
  left: -2px;
}

.highlight-icon-text {
  color: #8b5cf6;
  font-size: 16px;
}

.health-icon {
  color: #A78BFA;
}

.highlight-title {
  font-size: 14px;
  color: #8b5cf6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  left: -2px;
}

.highlight-content {
  padding: 0px 0px 0px 16px;
  display: flex;
  align-items: baseline;
  margin-bottom: 4px;
}

.highlight-number {
  font-size: 32px;
  font-weight: 700;
  color: #333;
}

.highlight-number.red {
  color: #f43f5e;
}

.highlight-denominator {
  font-size: 14px;
  color: #666;
  margin-left: 4px;
}

.highlight-label {
  padding: 0px 0px 16px 16px;
  font-size: 12px;
  color: #888;
}

.health-card {
  background-color: #F3E8FF;
  border-color: #E9D5FF;
}

.health-status {
  margin-top: 10px;
  margin-bottom: 12px;
}

.health-value {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

/* 今日任务样式 */
.daily-task {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.task-info {
  display: flex;
  flex-direction: column;
}

.task-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.task-reward {
  font-size: 13px;
  color: #8b5cf6;
}

.task-arrow {
  font-size: 24px;
  color: #666;
}

.share-passport-button {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-button-text {
  color: #8b5cf6;
  font-size: 14px;
  font-weight: 500;
}
</style>
