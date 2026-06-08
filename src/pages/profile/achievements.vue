<template>
  <view class="achievements-container" :style="headerPaddingStyle(20)">
    <view class="header">
      <text class="title">{{ $t('achievements.title') }}</text>
      <text class="completion-rate">{{ $t('achievements.totalCompleted', [completedAchievements.length, totalAchievements]) }}</text>
    </view>
    
    <view class="categories-tabs">
      <view 
        v-for="(category, index) in categories" 
        :key="index" 
        class="category-tab" 
        :class="{ active: activeCategory === category }"
        @tap="setActiveCategory(category)"
      >
        <text>{{ $t(`achievements.categories.${category}`) }}</text>
      </view>
    </view>
    
    <scroll-view class="achievements-list" scroll-y="true">
      <view 
        v-for="(achievement, index) in filteredAchievements" 
        :key="index"
        class="achievement-card"
        :class="[achievement.rarity, { completed: achievement.completed }]"
        @tap="showAchievementDetails(achievement)"
      >
        <view class="achievement-icon">
          <image :src="getAchievementIcon(achievement)" mode="aspectFit"></image>
          <view v-if="achievement.completed" class="completed-badge">
            <TablerIcon name="check" :size="12" color="#ffffff" />
          </view>
        </view>
        
        <view class="achievement-info">
          <text class="achievement-name">{{ $t(`achievements.badges.${achievement.id}.name`) }}</text>
          <text class="achievement-description">{{ $t(`achievements.badges.${achievement.id}.description`) }}</text>
          
          <view class="achievement-progress">
            <view class="progress-bar">
              <view 
                class="progress-fill" 
                :style="{ width: `${Math.min(100, (achievement.progress / achievement.requirement) * 100)}%` }"
              ></view>
            </view>
            <text class="progress-text">{{ $t('achievements.progress', [achievement.progress, achievement.requirement]) }}</text>
          </view>
          
          <view class="achievement-reward" v-if="achievement.completed && !achievement.rewardClaimed">
            <text class="reward-text">{{ $t('achievements.rewards.hairPoints', [achievement.rewardPoints]) }}</text>
            <view class="claim-button" @tap.stop="claimReward(achievement)">
              <text>{{ $t('achievements.claimReward') }}</text>
            </view>
          </view>
          
          <view class="achievement-reward claimed" v-if="achievement.completed && achievement.rewardClaimed">
            <text class="reward-text">{{ $t('achievements.rewards.hairPoints', [achievement.rewardPoints]) }}</text>
            <text class="claimed-text">{{ $t('achievements.rewardClaimed') }}</text>
          </view>
        </view>
        
        <view class="achievement-rarity">
          <text>{{ $t(`achievements.rarity.${achievement.rarity}`) }}</text>
        </view>
      </view>
    </scroll-view>
    
    <!-- 成就详情弹窗 -->
    <view class="achievement-details-popup" v-if="showDetailsPopup">
      <view class="popup-content" :class="selectedAchievement?.rarity">
        <view class="popup-header">
          <text class="popup-title">{{ selectedAchievement ? $t(`achievements.badges.${selectedAchievement.id}.name`) : '' }}</text>
          <view class="close-button" @tap="closeDetailsPopup">×</view>
        </view>
        
        <view class="popup-body">
          <view class="achievement-icon large">
            <image :src="selectedAchievement ? getAchievementIcon(selectedAchievement) : ''" mode="aspectFit"></image>
          </view>
          
          <text class="achievement-description">
            {{ selectedAchievement ? $t(`achievements.badges.${selectedAchievement.id}.description`) : '' }}
          </text>
          
          <view class="achievement-requirements">
            <text class="requirement-label">{{ $t('achievements.badges.requirement') }}</text>
            <text class="requirement-text">
              {{ selectedAchievement ? $t(`achievements.badges.${selectedAchievement.id}.requirementText`) : '' }}
            </text>
          </view>
          
          <view class="achievement-progress">
            <view class="progress-bar">
              <view 
                class="progress-fill" 
                :style="{ width: `${selectedAchievement ? Math.min(100, (selectedAchievement.progress / selectedAchievement.requirement) * 100) : 0}%` }"
              ></view>
            </view>
            <text class="progress-text">
              {{ selectedAchievement ? $t('achievements.progress', [selectedAchievement.progress, selectedAchievement.requirement]) : '' }}
            </text>
          </view>
          
          <view class="achievement-status">
            <text class="status-label">{{ $t('achievements.status.label') }}</text>
            <text class="status-text" :class="selectedAchievement?.completed ? 'completed' : 'in-progress'">
              {{ selectedAchievement?.completed ? $t('achievements.status.completed') : $t('achievements.status.inProgress') }}
            </text>
          </view>
          
          <view class="achievement-completion-date" v-if="selectedAchievement?.completed">
            <text>{{ $t('achievements.completedAt', [formatDate(selectedAchievement.completedAt)]) }}</text>
          </view>
          
          <view class="achievement-reward" v-if="selectedAchievement?.completed && !selectedAchievement?.rewardClaimed">
            <text class="reward-text">{{ $t('achievements.rewards.hairPoints', [selectedAchievement?.rewardPoints]) }}</text>
            <view class="claim-button" @tap="claimReward(selectedAchievement)">
              <text>{{ $t('achievements.claimReward') }}</text>
            </view>
          </view>
          
          <view class="achievement-reward claimed" v-if="selectedAchievement?.completed && selectedAchievement?.rewardClaimed">
            <text class="reward-text">{{ $t('achievements.rewards.hairPoints', [selectedAchievement?.rewardPoints]) }}</text>
            <text class="claimed-text">{{ $t('achievements.rewardClaimed') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useAchievementStore } from '@/stores/achievementStore';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const achievementStore = useAchievementStore();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 加载成就数据
onMounted(() => {
  achievementStore.loadAchievementsFromStorage();
});

// 成就分类
const categories = ['analysis', 'care', 'progress', 'exploration', 'social'];
const activeCategory = ref('analysis');

// 设置当前活跃分类
const setActiveCategory = (category) => {
  activeCategory.value = category;
};

// 根据分类筛选成就
const filteredAchievements = computed(() => {
  return achievementStore.achievements.filter(a => a.category === activeCategory.value);
});

// 获取成就图标
const getAchievementIcon = (achievement) => {
  // 使用占位图标作为默认图标
  const placeholderIcon = '/static/achievements/placeholder.svg';
  
  // 尝试根据成就ID和稀有度返回对应图标
  try {
    const baseUrl = '/static/achievements/';
    const iconPath = `${baseUrl}${achievement.id}.svg`;
    
    // 这里可以添加检查文件是否存在的逻辑
    // 但在前端环境中这可能不容易实现
    // 所以我们暂时使用占位图标
    return placeholderIcon;
  } catch (error) {
    console.error('获取成就图标失败:', error);
    return placeholderIcon;
  }
};

// 成就详情弹窗
const showDetailsPopup = ref(false);
const selectedAchievement = ref(null);

// 显示成就详情
const showAchievementDetails = (achievement) => {
  selectedAchievement.value = achievement;
  showDetailsPopup.value = true;
};

// 关闭成就详情弹窗
const closeDetailsPopup = () => {
  showDetailsPopup.value = false;
  selectedAchievement.value = null;
};

// 领取奖励
const claimReward = (achievement) => {
  if (!achievement.completed) return;
  
  // 添加领取奖励的逻辑
  achievement.rewardClaimed = true;
  
  // 更新用户积分（这里需要与积分系统集成）
  // userStore.addPoints(achievement.rewardPoints);
  
  // 保存到本地存储
  achievementStore.saveAchievementsToStorage();
  
  // 显示提示
  uni.showToast({
    title: t('achievements.rewards.hairPoints', [achievement.rewardPoints]),
    icon: 'success',
    duration: 2000
  });
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// 计算属性
const completedAchievements = computed(() => achievementStore.completedAchievements);
const totalAchievements = computed(() => achievementStore.totalAchievements);
</script>

<style scoped>
.achievements-container {
  padding: 20px; /* padding-top is set dynamically via inline style */
  padding-top: 0; /* overridden by inline style */
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header {
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.completion-rate {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
  display: block;
}

.categories-tabs {
  display: flex;
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.category-tab {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  font-size: 14px;
  color: #666;
  position: relative;
}

.category-tab.active {
  color: #8b5cf6;
  font-weight: bold;
}

.category-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  width: 50%;
  height: 3px;
  background-color: #8b5cf6;
  border-radius: 3px;
}

.achievements-list {
  height: calc(100vh - 150px);
}

.achievement-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  display: flex;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #ccc;
}

.achievement-card.common {
  border-left-color: #9ca3af;
}

.achievement-card.rare {
  border-left-color: #3b82f6;
}

.achievement-card.epic {
  border-left-color: #8b5cf6;
}

.achievement-card.legendary {
  border-left-color: #f59e0b;
}

.achievement-card.completed {
  background-color: #f0f9ff;
}

.achievement-icon {
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: #f3f4f6;
  margin-right: 15px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.achievement-icon image {
  width: 40px;
  height: 40px;
}

.completed-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #4ade80;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.achievement-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.achievement-progress {
  margin-bottom: 10px;
}

.progress-bar {
  height: 6px;
  background-color: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background-color: #8b5cf6;
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

.achievement-reward {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.reward-text {
  font-size: 14px;
  color: #8b5cf6;
  font-weight: bold;
}

.claim-button {
  background-color: #8b5cf6;
  padding: 6px 12px;
  border-radius: 4px;
}

.claim-button text {
  color: white;
  font-size: 12px;
}

.achievement-reward.claimed {
  color: #4ade80;
}

.claimed-text {
  font-size: 12px;
  color: #4ade80;
  font-weight: bold;
}

.achievement-rarity {
  position: absolute;
  top: 15px;
  right: 15px;
}

.achievement-rarity text {
  font-size: 12px;
  color: #9ca3af;
}

/* 弹窗样式 */
.achievement-details-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.popup-content {
  width: 80%;
  max-width: 320px;
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.popup-content.common {
  border-top: 5px solid #9ca3af;
}

.popup-content.rare {
  border-top: 5px solid #3b82f6;
}

.popup-content.epic {
  border-top: 5px solid #8b5cf6;
}

.popup-content.legendary {
  border-top: 5px solid #f59e0b;
}

.popup-header {
  padding: 15px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.close-button {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #666;
}

.popup-body {
  padding: 20px;
}

.achievement-icon.large {
  width: 80px;
  height: 80px;
  border-radius: 40px;
  margin: 0 auto 20px;
}

.achievement-icon.large image {
  width: 50px;
  height: 50px;
}

.achievement-requirements {
  margin: 15px 0;
}

.requirement-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
  display: block;
}

.requirement-text {
  font-size: 16px;
  color: #333;
}

.achievement-status {
  margin: 15px 0;
}

.status-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
  display: block;
}

.status-text {
  font-size: 16px;
}

.status-text.completed {
  color: #4ade80;
}

.status-text.in-progress {
  color: #f59e0b;
}

.achievement-completion-date {
  margin: 15px 0;
  font-size: 14px;
  color: #666;
}
</style> 