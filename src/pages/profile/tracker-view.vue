<template>
  <view class="tracker-container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="navbar-title">活动追踪数据</text>
    </view>
    
    <!-- 数据展示区域 -->
    <scroll-view scroll-y class="data-container">
      <!-- 用户活动信息 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">用户活动</text>
        </view>
        <view class="data-item">
          <text class="item-label">扫描次数:</text>
          <text class="item-value">{{ trackerData.userActivity.scanCount }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">连续打卡天数:</text>
          <text class="item-value">{{ trackerData.userActivity.dailyCheckInDays }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">最后打卡日期:</text>
          <text class="item-value">{{ formatDate(trackerData.userActivity.lastCheckInDate) }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">总屏幕时间(分钟):</text>
          <text class="item-value">{{ trackerData.userActivity.totalScreenTime }}</text>
        </view>
      </view>
      
      <!-- 功能使用统计 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">功能使用统计</text>
        </view>
        <view class="data-item" v-for="(count, feature) in trackerData.featureUsage" :key="feature">
          <text class="item-label">{{ formatFeatureName(feature) }}:</text>
          <text class="item-value">{{ count }}</text>
        </view>
        <view v-if="Object.keys(trackerData.featureUsage).length === 0" class="empty-data">
          <text>暂无功能使用数据</text>
        </view>
      </view>
      
      <!-- 最近会话信息 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">最近会话信息</text>
        </view>
        <view class="data-item">
          <text class="item-label">开始时间:</text>
          <text class="item-value">{{ formatDateTime(trackerData.lastSession.startTime) }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">结束时间:</text>
          <text class="item-value">{{ trackerData.lastSession.endTime ? formatDateTime(trackerData.lastSession.endTime) : '会话未结束' }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">持续时间(秒):</text>
          <text class="item-value">{{ trackerData.lastSession.duration }}</text>
        </view>
      </view>
      
      <!-- 访问页面记录 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">访问页面记录</text>
        </view>
        <view class="data-item screen-item" v-for="(screen, index) in trackerData.lastSession.screens" :key="index">
          <text>{{ screen }}</text>
        </view>
        <view v-if="trackerData.lastSession.screens.length === 0" class="empty-data">
          <text>暂无页面访问记录</text>
        </view>
      </view>
      
      <!-- API 统计 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">API 统计</text>
        </view>
        <view class="data-item">
          <text class="item-label">总请求数:</text>
          <text class="item-value">{{ trackerData.apiStats.totalRequests }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">失败请求数:</text>
          <text class="item-value">{{ trackerData.apiStats.failedRequests }}</text>
        </view>
        <view class="data-item">
          <text class="item-label">平均响应时间(ms):</text>
          <text class="item-value">{{ trackerData.apiStats.averageResponseTime.toFixed(2) }}</text>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="action-buttons">
        <view class="action-button primary" @tap="refreshData">
          <text>刷新数据</text>
        </view>
        <view class="action-button danger" @tap="confirmReset">
          <text>重置数据</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { getGlobalTracker } from '@/utils/globalTracker';
import { useGlobalStore } from '@/stores/globalStore';

// 获取全局储存实例
const globalStore = useGlobalStore();
// 追踪数据
const trackerData = reactive({ ...globalStore.globalState });

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 刷新数据
const refreshData = () => {
  Object.assign(trackerData, globalStore.globalState);
  uni.showToast({
    title: '数据已刷新',
    icon: 'success',
    duration: 1500
  });
};

// 确认重置
const confirmReset = () => {
  uni.showModal({
    title: '确认重置',
    content: '确定要重置所有追踪数据吗？这将无法恢复。',
    success: (res) => {
      if (res.confirm) {
        globalStore.resetGlobalState();
        refreshData();
        uni.showToast({
          title: '数据已重置',
          icon: 'success',
          duration: 1500
        });
      }
    }
  });
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '无记录';
  
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  } catch (e) {
    return dateStr || '无记录';
  }
};

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '无记录';
  
  try {
    const date = new Date(dateStr);
    return `${formatDate(dateStr)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  } catch (e) {
    return dateStr || '无记录';
  }
};

// 格式化功能名称
const formatFeatureName = (feature: string) => {
  // 将下划线和连字符转换为空格，并进行首字母大写
  return feature
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

onMounted(() => {
  // 页面加载时获取最新数据
  refreshData();
});
</script>

<style>
.tracker-container {
  min-height: 100vh;
  background-color: #f8f8f8;
}

/* 导航栏样式 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.back-button {
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back-icon {
  font-size: 20px;
  color: #333;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-right: 36px; /* 与返回按钮对称 */
}

/* 数据容器 */
.data-container {
  height: calc(100vh - 60px);
  padding: 16px;
}

/* 数据分区 */
.section {
  background-color: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 数据项 */
.data-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
}

.data-item:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 14px;
  color: #666;
  flex: 1;
}

.item-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.screen-item {
  display: block;
  padding: 6px 0;
}

/* 空数据提示 */
.empty-data {
  padding: 16px 0;
  display: flex;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  margin-bottom: 32px;
}

.action-button {
  padding: 12px 0;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 48%;
}

.action-button.primary {
  background-color: #8b5cf6;
}

.action-button.danger {
  background-color: #ef4444;
}

.action-button text {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}
</style> 