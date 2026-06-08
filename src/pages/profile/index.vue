<template>
  <view class="profile-container">
    <!-- 顶部背景区域 -->
    <view class="profile-header">
      <!-- 用户信息区域 -->
      <view class="user-info">
        <view class="avatar-container">
          <ShellUserIcon variant="account" />
        </view>
        <view class="user-name">{{userInfo.name}}</view>
        
        <!-- 用户属性信息 -->
        <view class="user-attributes">
          <view class="attribute">
            <text>{{ userInfo.gender === 2 ? 'Female' : 'Male' }}</text>
          </view>
          <view class="attribute">
            <text>{{ userInfo.age }}</text>
          </view>
          <view class="attribute">
            <text>{{ userInfo.region }}</text>
          </view>
        </view>
      </view>
      
      <!-- $HAIR点数展示 -->
      <view class="hair-points">
        <view class="points-icon">
          <image src="/static/icons/icon_hair_points.png" mode="aspectFit" class="icon-image"></image>
        </view>
        <text class="points-value">{{ $t('profile.hairPoints', [userInfo.hairPoints || '0']) }}</text>
      </view>
      
      <!-- 积分到期提示 -->
      <!-- <view class="points-expiry">
        <text>{{ $t('profile.expiring', ['120']) }}</text>
      </view> -->
      
      <!-- 操作按钮区域 -->
      <!-- <view class="action-buttons">
        <view class="action-button science">
          <text>{{ $t('profile.scienceTag') }}</text>
        </view>
        <view class="action-button follower">
          <text>{{ $t('profile.followerTag') }}</text>
        </view>
      </view> -->
    </view>
    
    <!-- 评分展示区域 -->
    <view class="score-section">
      <view class="score-container">
        <text class="score-value">{{ healthData.totalScore }}</text>
        <text class="score-max">/100</text>
      </view>
      
      <view class="score-description">
        <text>{{ $t('profile.betterThan', [latestSummaryData.precede || '0']) }}</text>
      </view>
      
      <!-- 增长指标 -->
      <view class="growth-indicator">
        <view class="growth-arrow">
          <text class="growth-icon" :class="{ 
            'positive': (latestSummaryData.ratio || 0) > 0, 
            'negative': (latestSummaryData.ratio || 0) < 0 
          }">{{ (latestSummaryData.ratio || 0) > 0 ? '&#8599;' : '&#8600;' }}</text>
        </view>
        <text class="growth-value" :class="{ 
          'positive': (latestSummaryData.ratio || 0) > 0, 
          'negative': (latestSummaryData.ratio || 0) < 0 
        }">{{ (latestSummaryData.ratio || 0) > 0 ? '+' : '' }}{{ latestSummaryData.ratio || 0 }}%</text>
      </view>
    </view>
    
    <!-- 产品使用统计 -->
    <view class="product-usage" v-if="encrInfo.monthlySummary && Object.keys(encrInfo.monthlySummary).length > 0">
      <text class="usage-title">{{ $t('profile.monthlyUsage') }}</text>
      
      <scroll-view class="usage-stats" scroll-x="true" show-scrollbar="false">
        <view class="usage-items-container">
          <view class="usage-item" v-for="(count, type) in encrInfo.monthlySummary" :key="type">
            <text class="usage-type">{{ $t(`product.${getProductTypeKey(type)}`) }}</text>
            <text class="usage-count">{{ count + ' ' + $t('profile.times') }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 头皮问题提示区域 -->
    <!-- <view class="scalp-issue">
      <view class="issue-icon">
        <text class="warning-icon">&#9888;</text>
      </view>
      <view class="issue-info">
        <text class="issue-title">{{ $t('profile.oilProblem') }}</text>
      </view>
      <view class="issue-growth">
        <text class="growth-icon">&#8599;</text>
        <text class="issue-percentage">+15%</text>
      </view>
    </view> -->
    
    <!-- 产品推荐区域 -->
    <!-- <view class="product-recommendation">
      <view class="product-icon">
        <text class="like-icon">&#9825;</text>
      </view>
      <view class="product-info">
        <text class="product-name">{{ $t('profile.recommendedProduct') }}</text>
        <text class="product-usage">{{ $t('profile.usageDuration', ['2']) }}</text>
      </view>
    </view> -->
    
    <!-- 按钮区域 -->
    <!-- <view class="bottom-buttons">
      <view class="button primary">
        <text>{{ $t('profile.generateReport') }}</text>
      </view>
      <view class="button secondary">
        <text>{{ $t('profile.syncHealthData') }}</text>
      </view>
    </view> -->
    
    <!-- 设置菜单区域 -->
    <view class="settings-menu">
      <!-- 成就勋章项 -->
      <!-- <view class="menu-item" @tap="goToAchievements">
        <view class="menu-icon achievements">
          <TablerIcon name="award" :size="22" class="icon-trophy" />
        </view>
        <text class="menu-text">{{ $t('achievements.title') }}</text>
        <text class="menu-arrow">&#8250;</text>
      </view> -->
      
      <!-- 设置项 -->
      <view class="menu-item" @tap="goToSettings">
        <view class="menu-icon settings">
          <text class="icon-gear">&#9881;</text>
        </view>
        <text class="menu-text">{{ $t('profile.settings') }}</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      
      <!-- 钱包登录项 -->
      <!-- <view class="menu-item" @tap="goToWalletLogin">
        <view class="menu-icon wallet">
          <text class="icon-wallet">&#128091;</text>
        </view>
        <text class="menu-text">{{ $t('login.walletLogin') }}</text>
        <text class="menu-arrow">&#8250;</text>
      </view> -->
      
      <!-- 帮助与反馈项 -->
      <view class="menu-item" @tap="goToHelp">
        <view class="menu-icon help">
          <text class="icon-help">&#63;</text>
        </view>
        <text class="menu-text">{{ $t('profile.helpFeedback') }}</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      
      <!-- 消息通知项 -->
      <view class="menu-item" @tap="goToNotifications">
        <view class="menu-icon notification">
          <text class="icon-notification">&#9993;</text>
        </view>
        <text class="menu-text">{{ $t('profile.notifications') }}</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      
      <!-- 退出登录项 -->
      <view class="menu-item" @tap="logout">
        <view class="menu-icon logout">
          <text class="icon-logout">&#8629;</text>
        </view>
        <text class="menu-text">{{ $t('profile.logout') }}</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ShellUserIcon from '@/components/icons/ShellUserIcon.vue';
import { useI18n } from 'vue-i18n';
import { useGlobalStore } from '@/stores/globalStore'
import { useUserStore } from '@/stores/userStore'
import { get, post } from '@/utils/request'
// 初始化i18n
const { t } = useI18n();
const globalStore = useGlobalStore()
const userStore = useUserStore();
const { userInfo } = userStore;

// 用户积分数据
const encrInfo = ref<{
  points: number | null;
  productClockInDaysInWeek: number | null;
  monthlySummary: Record<string, number> | null;
}>({
  points: null,
  productClockInDaysInWeek: null,
  monthlySummary: null
});

// 添加健康数据和分析摘要数据
const healthData = ref({
  totalScore: 0
});
const latestSummaryData = ref<{ precede?: number, ratio?: number }>({});

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function
};

// 页面跳转函数
const goToSettings = () => {
  uni.navigateTo({
    url: '/pages/profile/settings'
  });
};

const goToHelp = () => {
  // uni.navigateTo({
  //   url: '/pages/profile/help'
  // });
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.feedback.postMessage({data: 'feedback'});
  } else {
    window.android.feedback(JSON.stringify({data: 'feedback'}));
  }
};

const goToWalletLogin = () => {
  uni.navigateTo({
    url: '/pages/auth/wallet-login'
  });
};

const goToNotifications = () => {
  // uni.navigateTo({
  //   url: '/pages/profile/notifications'
  // });
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.notifications.postMessage({data: 'notifications'});
  } else {
    window.android.notifications(JSON.stringify({data: 'notifications'}));
  }
};

const goToAchievements = () => {
  uni.navigateTo({
    url: '/pages/profile/achievements'
  });
};

const logout = () => {
  try {
    // 保存应用设置
    const settings = uni.getStorageSync('settings');
    const globalState = uni.getStorageSync('globalState');
    
    // 清除所有存储
    uni.clearStorageSync();
    
    // 恢复应用设置，但重置用户相关标志
    if (settings) {
      uni.setStorageSync('settings', settings);
    }
    
    if (globalState) {
      // 重置用户相关标志，但保留应用设置
      globalState.flags.isFirstLaunch = false;
      globalState.flags.hasCompletedOnboarding = false;
      uni.setStorageSync('globalState', globalState);
    }
    
    console.log('用户登出完成，应用设置已保留');
  } catch (error) {
    console.error('登出时清除数据失败:', error);
  }
  
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.logout.postMessage('logout');
  } else {
    window.android.logout('logout');
  }
};

// 定义接口响应类型
interface EncrInfoResponse {
  points: number | null;
  productClockInDaysInWeek: number | null;
  monthlySummary: Record<string, number> | null;
}

// 添加接口定义
interface HealthDataResponse {
  list?: {
    scalp?: string;
    follicle?: string;
    hair?: string;
    scalpScore?: string;
    createTime?: string;
  }[];
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
      userStore.updateUserInfo({
        hairPoints: data.points || 0
      })
    }
  } catch (error) {
    console.error('获取用户激励信息失败:', error)
  }
}

// 获取健康数据和分析摘要，添加在script部分
const fetchUserHealthData = async (userId: string) => {
  try {
    // 获取健康数据
    let response;
    
    if ((userInfo as any).type === 1) {
      response = await post('user/getMerchantDetectionRecordList', { merchantId: userId });
    } else {
      response = await post('user/getDetectionRecordList', { userId });
    }
    
    // 使用类型断言处理响应
    const typedResponse = response as HealthDataResponse;
    
    if (typedResponse && typedResponse.list && typedResponse.list.length > 0) {
      const record = typedResponse.list[typedResponse.list.length - 1];
      healthData.value.totalScore = Math.round(Number(record.scalpScore) || 0);
    }
    
    // 获取分析摘要
    const summaryResponse = await post('analyse/latest/summary', { userId });
    if (summaryResponse) {
      latestSummaryData.value = summaryResponse;
    }
  } catch (error) {
    console.error('获取用户健康数据失败:', error);
  }
};

onMounted(() => {
  // 页面加载时的逻辑
  fetchEncrInfo(userInfo.userId);
  fetchUserHealthData(userInfo.userId);
});

// 根据 API 中的类型返回对应的多语言键
const getProductTypeKey = (type: string) => {
  // 转换为小写并移除下划线，对应多语言文件中的键
  const typeMap: Record<string, string> = {
    'PRE_WASH': 'preWash',
    'SHAMPOO': 'shampoo',
    'CONDITIONER': 'conditioner',
    'SERUM': 'serum',
    'HAIR_MASK': 'mask',
    'FINASTERIDE': 'finasteride'
  };
  
  return typeMap[type] || type.toLowerCase();
};
</script>

<style>
.profile-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  position: relative;
}

/* 顶部背景区域 */
.profile-header {
  background-color: #8b5cf6;
  padding: 20px 16px;
  color: #fff;
  position: relative;
  border-radius: 0 0 15px 15px;
  padding-bottom: 30px;
}

/* 用户信息区域 */
.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-name {
  font-size: 20px;
  font-weight: 500;
  margin-top: 8px;
}

.user-attributes {
  display: flex;
  margin-top: 8px;
}

.attribute {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 10px;
}

/* $HAIR点数展示 */
.hair-points {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.points-icon {
  margin-right: 8px;
  display: flex;
  align-items: center;
}

.icon-image {
  width: 20px;
  height: 20px;
}

.points-value {
  font-size: 18px;
  font-weight: 500;
}

/* 积分到期提示 */
.points-expiry {
  text-align: right;
  font-size: 12px;
  opacity: 0.9;
  margin-top: 5px;
}

/* 操作按钮区域 */
.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 15px;
  gap: 10px;
}

.action-button {
  padding: 6px 12px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 12px;
}

/* 评分展示区域 */
.score-section {
  background-color: #fff;
  margin: 15px;
  border-radius: 10px;
  padding: 15px;
  position: relative;
}

.score-container {
  display: flex;
  align-items: baseline;
}

.score-value {
  font-size: 38px;
  font-weight: bold;
  color: #333;
}

.score-max {
  font-size: 16px;
  color: #666;
  margin-left: 3px;
}

.score-description {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.growth-indicator {
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  align-items: center;
}

.growth-arrow {
  display: flex;
  align-items: center;
  color: #ff6b6b;
}

.growth-icon {
  font-size: 16px;
  margin-right: 2px;
}

.growth-value {
  color: #ff6b6b;
  font-size: 14px;
  font-weight: 500;
}

/* 产品使用统计 */
.product-usage {
  margin: 15px;
}

.usage-title {
  font-size: 14px;
  color: #666;
}

.usage-stats {
  margin-top: 10px;
  white-space: nowrap;  /* 确保不换行 */
  width: 100%;
  overflow-x: auto;    /* 允许水平滚动 */
}

.usage-items-container {
  display: inline-flex;  /* 使用inline-flex确保子元素排列在一行 */
  padding: 5px 0;
}

.usage-item {
  display: flex;
  flex-direction: column;  /* 改为纵向布局 */
  margin-right: 20px;      /* 项之间的间距 */
  padding: 8px 15px;       /* 内边距增加可点击区域 */
  background-color: #fff;  /* 白色背景 */
  border-radius: 8px;      /* 圆角 */
  min-width: 90px;         /* 最小宽度 */
}

.usage-type {
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.usage-count {
  font-size: 14px;
  color: #8b5cf6;
  font-weight: 500;
}

/* 头皮问题提示区域 */
.scalp-issue {
  margin: 15px;
  padding: 15px;
  background-color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
}

.issue-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #ffebee;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
}

.warning-icon {
  color: #f44336;
  font-size: 16px;
}

.issue-info {
  flex: 1;
}

.issue-title {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.issue-growth {
  display: flex;
  align-items: center;
  color: #f44336;
}

.issue-percentage {
  font-size: 14px;
  font-weight: 500;
}

/* 产品推荐区域 */
.product-recommendation {
  margin: 15px;
  padding: 15px;
  background-color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
}

.product-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #e8f5e9;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
}

.like-icon {
  color: #4caf50;
  font-size: 16px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.product-usage {
  font-size: 12px;
  color: #666;
  margin-top: 3px;
}

/* 按钮区域 */
.bottom-buttons {
  display: flex;
  margin: 20px 15px;
  gap: 10px;
}

.button {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
}

.button.primary {
  background-color: #8b5cf6;
  color: #fff;
}

.button.secondary {
  background-color: #f0ebfd;
  color: #8b5cf6;
  border: 1px solid #d3c4fd;
}

/* 设置菜单区域 */
.settings-menu {
  background-color: #fff;
  margin: 20px 0 0;
  border-radius: 15px 15px 0 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-icon.settings {
  background-color: #e3f2fd;
}

.menu-icon.help {
  background-color: #f1f8e9;
}

.menu-icon.notification {
  background-color: #fffde7;
}

.menu-icon.logout {
  background-color: #fbe9e7;
}

.menu-icon.wallet {
  background-color: #e8f5e9;
}

.menu-icon.achievements {
  background-color: #e0f2f7;
}

.icon-gear, .icon-help, .icon-notification, .icon-logout, .icon-wallet, .icon-trophy {
  font-size: 18px;
}

.icon-gear {
  color: #2196f3;
}

.icon-help {
  color: #8bc34a;
}

.icon-notification {
  font-size: 18px;
  color: #ffc107;
}

.icon-logout {
  font-size: 18px;
  color: #ff5722;
}

.icon-wallet {
  font-size: 18px;
  color: #4caf50;
}

.icon-trophy {
  color: #ffd700;
}

.menu-text {
  flex: 1;
  font-size: 16px;
  color: #333;
}

.menu-arrow {
  font-size: 18px;
  color: #ccc;
}

/* 增长指标 */
.growth-icon.positive {
  color: #f43f5e; /* 红色 */
}

.growth-icon.negative {
  color: #10b981; /* 绿色 */
}

.growth-value.positive {
  color: #f43f5e; /* 红色 */
}

.growth-value.negative {
  color: #10b981; /* 绿色 */
}
</style> 