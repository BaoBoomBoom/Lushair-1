<template>
  <view class="birthday-settings-container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="navbar-title">Birthday</text>
    </view>
    
    <!-- 日期选择器 -->
    <view class="date-picker-section">
      <picker
        mode="date"
        :value="selectedDate"
        :start="startDate"
        :end="endDate"
        @change="onDateChange"
        fields="day"
      >
        <view class="picker-field">
          <text class="date-label">Select your birthday</text>
          <view class="date-value">
            <text>{{ formatDate(selectedDate) }}</text>
            <text class="arrow-icon">&#8250;</text>
          </view>
        </view>
      </picker>
    </view>
    
    <!-- 保存按钮 -->
    <view class="save-button" @tap="saveBirthday">
      <text class="button-text">Save</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
const { userInfo } = userStore;

// 日期范围设置
const startDate = '1940-01-01';
const endDate = new Date().toISOString().split('T')[0]; // 今天

// 选择的日期
const selectedDate = ref(userInfo.dob || endDate);

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 日期变更处理
const onDateChange = (e: any) => {
  selectedDate.value = e.detail.value;
};

// 格式化日期显示
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Select a date';
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}`;
};

// 保存生日信息
const saveBirthday = async () => {
  try {
    uni.showLoading({
      title: 'Saving...',
      mask: true
    });
    
    // 调用更新接口
    const result = await userStore.updateUserInfo({
      dob: selectedDate.value
    });
    
    uni.hideLoading();
    
    if (result.success) {
      uni.showToast({
        title: 'Birthday updated',
        icon: 'success',
        duration: 2000
      });
      
      // 延迟后返回上一页
      setTimeout(() => {
        uni.navigateBack({
          delta: 1
        });
      }, 1500);
    } else {
      uni.showToast({
        title: 'Update failed',
        icon: 'error',
        duration: 2000
      });
    }
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: 'Update error',
      icon: 'error',
      duration: 2000
    });
    console.error('保存生日设置失败:', error);
  }
};

onMounted(() => {
  // 页面加载时逻辑
  // 如果用户信息中有生日数据，则设置为当前选择的日期
  if (userInfo.dob) {
    selectedDate.value = userInfo.dob;
  }
});
</script>

<style>
.birthday-settings-container {
  min-height: 100vh;
  background-color: #fff;
  display: flex;
  flex-direction: column;
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

/* 日期选择器样式 */
.date-picker-section {
  margin: 20px 0;
  padding: 0 16px;
}

.picker-field {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-label {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.date-value {
  display: flex;
  align-items: center;
  color: #666;
}

.arrow-icon {
  margin-left: 8px;
  font-size: 18px;
  color: #999;
}

/* 保存按钮 */
.save-button {
  margin: 32px 16px;
  background-color: #8b5cf6;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin-top: auto;
}

.button-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
</style> 