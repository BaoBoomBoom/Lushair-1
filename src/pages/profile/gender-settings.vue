<template>
  <view class="gender-settings-container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="navbar-title">Gender</text>
    </view>
    
    <!-- 性别选择列表 -->
    <view class="gender-list">
      <view class="gender-item" @tap="selectGender(1)" :class="{ active: selectedGender === 1 }">
        <text class="gender-name">Male</text>
        <TablerIcon v-if="selectedGender === 1" name="check" :size="18" class="check-icon" />
      </view>
      
      <view class="gender-item" @tap="selectGender(2)" :class="{ active: selectedGender === 2 }">
        <text class="gender-name">Female</text>
        <TablerIcon v-if="selectedGender === 2" name="check" :size="18" class="check-icon" />
      </view>
    </view>
    
    <!-- 保存按钮 -->
    <view class="save-button" @tap="saveGender">
      <text class="button-text">Save</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
const selectedGender = ref(userStore.userInfo.gender);

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 选择性别
const selectGender = (gender: number) => {
  selectedGender.value = gender;
};

// 保存性别设置
const saveGender = async () => {
  try {
    uni.showLoading({
      title: 'Saving...',
      mask: true
    });
    
    // 调用更新接口
    const result = await userStore.updateUserInfo({
      gender: selectedGender.value
    });
    
    uni.hideLoading();
    
    if (result.success) {
      uni.showToast({
        title: 'Gender updated',
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
    console.error('保存性别设置失败:', error);
  }
};

onMounted(() => {
  // 页面加载时的逻辑
  selectedGender.value = userStore.userInfo.gender;
});
</script>

<style>
.gender-settings-container {
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

/* 性别选择列表 */
.gender-list {
  margin-top: 16px;
}

.gender-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.gender-item.active {
  background-color: #f8f2ff;
}

.gender-name {
  font-size: 16px;
  color: #333;
}

.check-icon {
  color: #8b5cf6;
  font-size: 20px;
  font-weight: bold;
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