import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Achievement {
  id: string;
  category: 'analysis' | 'care' | 'progress' | 'exploration' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: number;
  progress: number;
  completed: boolean;
  completedAt?: string;
  rewardPoints: number;
  rewardClaimed?: boolean;
}

export interface UserAchievementData {
  // 分析相关统计
  totalAnalyses: number;
  weeklyAnalyses: number;
  lastAnalysisDate: string;
  
  // 护理相关统计
  consecutiveClockInDays: number;
  totalClockInDays: number;
  lastClockInDate: string;
  
  // 进步相关统计
  initialHealthScore: number;
  currentHealthScore: number;
  bestHealthScore: number;
  monthlyImprovements: number;
  
  // 探索相关统计
  featuresUsed: Set<string>;
  consultationCount: number;
  chartViews: number;
  
  // 社交相关统计
  friendsInvited: number;
  passportShares: number;
}

export const useAchievementStore = defineStore('achievement', () => {
  const userStats = ref<UserAchievementData>({
    totalAnalyses: 0,
    weeklyAnalyses: 0,
    lastAnalysisDate: '',
    consecutiveClockInDays: 0,
    totalClockInDays: 0,
    lastClockInDate: '',
    initialHealthScore: 0,
    currentHealthScore: 0,
    bestHealthScore: 0,
    monthlyImprovements: 0,
    featuresUsed: new Set(),
    consultationCount: 0,
    chartViews: 0,
    friendsInvited: 0,
    passportShares: 0,
  });

  const achievements = ref<Achievement[]>([
    // 分析成就
    {
      id: 'firstAnalysis',
      category: 'analysis',
      rarity: 'common',
      requirement: 1,
      progress: 0,
      completed: false,
      rewardPoints: 100,
    },
    {
      id: 'weeklyAnalyst',
      category: 'analysis',
      rarity: 'rare',
      requirement: 3,
      progress: 0,
      completed: false,
      rewardPoints: 200,
    },
    {
      id: 'analysisExpert',
      category: 'analysis',
      rarity: 'epic',
      requirement: 50,
      progress: 0,
      completed: false,
      rewardPoints: 1000,
    },
    // 护理成就
    {
      id: 'careStarter',
      category: 'care',
      rarity: 'common',
      requirement: 3,
      progress: 0,
      completed: false,
      rewardPoints: 150,
    },
    {
      id: 'weeklyCareTaker',
      category: 'care',
      rarity: 'rare',
      requirement: 7,
      progress: 0,
      completed: false,
      rewardPoints: 300,
    },
    {
      id: 'careExpert',
      category: 'care',
      rarity: 'epic',
      requirement: 30,
      progress: 0,
      completed: false,
      rewardPoints: 800,
    },
    {
      id: 'careMaster',
      category: 'care',
      rarity: 'legendary',
      requirement: 100,
      progress: 0,
      completed: false,
      rewardPoints: 2000,
    },
    // 进步成就
    {
      id: 'healthImprover',
      category: 'progress',
      rarity: 'rare',
      requirement: 10,
      progress: 0,
      completed: false,
      rewardPoints: 400,
    },
    {
      id: 'progressChampion',
      category: 'progress',
      rarity: 'epic',
      requirement: 3,
      progress: 0,
      completed: false,
      rewardPoints: 600,
    },
    {
      id: 'perfectScore',
      category: 'progress',
      rarity: 'legendary',
      requirement: 95,
      progress: 0,
      completed: false,
      rewardPoints: 1500,
    },
    // 探索成就
    {
      id: 'featureExplorer',
      category: 'exploration',
      rarity: 'rare',
      requirement: 3,
      progress: 0,
      completed: false,
      rewardPoints: 250,
    },
    {
      id: 'consultationSeeker',
      category: 'exploration',
      rarity: 'epic',
      requirement: 20,
      progress: 0,
      completed: false,
      rewardPoints: 500,
    },
    {
      id: 'dataEnthusiast',
      category: 'exploration',
      rarity: 'rare',
      requirement: 50,
      progress: 0,
      completed: false,
      rewardPoints: 350,
    },
    // 社交成就
    {
      id: 'inviteAmbassador',
      category: 'social',
      rarity: 'rare',
      requirement: 5,
      progress: 0,
      completed: false,
      rewardPoints: 400,
    },
    {
      id: 'shareEnthusiast',
      category: 'social',
      rarity: 'epic',
      requirement: 10,
      progress: 0,
      completed: false,
      rewardPoints: 300,
    },
    {
      id: 'communityBuilder',
      category: 'social',
      rarity: 'legendary',
      requirement: 20,
      progress: 0,
      completed: false,
      rewardPoints: 1000,
    },
  ]);

  // 计算属性
  const completedAchievements = computed(() => 
    achievements.value.filter(a => a.completed)
  );

  const totalAchievements = computed(() => achievements.value.length);

  const achievementsByCategory = computed(() => {
    const categories: Record<string, Achievement[]> = {};
    achievements.value.forEach(achievement => {
      if (!categories[achievement.category]) {
        categories[achievement.category] = [];
      }
      categories[achievement.category].push(achievement);
    });
    return categories;
  });

  const totalPointsEarned = computed(() => 
    completedAchievements.value.reduce((total, achievement) => 
      total + achievement.rewardPoints, 0
    )
  );

  // 更新用户统计数据
  const updateAnalysisStats = (count: number = 1) => {
    userStats.value.totalAnalyses += count;
    userStats.value.weeklyAnalyses += count;
    userStats.value.lastAnalysisDate = new Date().toISOString();
    updateAchievementProgress();
  };

  const updateClockInStats = (consecutive: number, total: number) => {
    userStats.value.consecutiveClockInDays = consecutive;
    userStats.value.totalClockInDays = total;
    userStats.value.lastClockInDate = new Date().toISOString();
    updateAchievementProgress();
  };

  const updateHealthScore = (newScore: number) => {
    if (userStats.value.initialHealthScore === 0) {
      userStats.value.initialHealthScore = newScore;
    }
    userStats.value.currentHealthScore = newScore;
    if (newScore > userStats.value.bestHealthScore) {
      userStats.value.bestHealthScore = newScore;
    }
    updateAchievementProgress();
  };

  const trackFeatureUsage = (feature: string) => {
    userStats.value.featuresUsed.add(feature);
    updateAchievementProgress();
  };

  const updateConsultationCount = () => {
    userStats.value.consultationCount++;
    updateAchievementProgress();
  };

  const updateChartViews = () => {
    userStats.value.chartViews++;
    updateAchievementProgress();
  };

  const updateSocialStats = (invites: number = 0, shares: number = 0) => {
    userStats.value.friendsInvited += invites;
    userStats.value.passportShares += shares;
    updateAchievementProgress();
  };

  // 更新成就进度
  const updateAchievementProgress = () => {
    achievements.value.forEach(achievement => {
      if (achievement.completed) return;

      let progress = 0;
      
      switch (achievement.id) {
        case 'firstAnalysis':
        case 'analysisExpert':
          progress = userStats.value.totalAnalyses;
          break;
        case 'weeklyAnalyst':
          progress = userStats.value.weeklyAnalyses;
          break;
        case 'careStarter':
        case 'weeklyCareTaker':
        case 'careExpert':
        case 'careMaster':
          progress = userStats.value.consecutiveClockInDays;
          break;
        case 'healthImprover':
          progress = Math.max(0, userStats.value.currentHealthScore - userStats.value.initialHealthScore);
          break;
        case 'progressChampion':
          progress = userStats.value.monthlyImprovements;
          break;
        case 'perfectScore':
          progress = userStats.value.bestHealthScore;
          break;
        case 'featureExplorer':
          progress = userStats.value.featuresUsed.size;
          break;
        case 'consultationSeeker':
          progress = userStats.value.consultationCount;
          break;
        case 'dataEnthusiast':
          progress = userStats.value.chartViews;
          break;
        case 'inviteAmbassador':
        case 'communityBuilder':
          progress = userStats.value.friendsInvited;
          break;
        case 'shareEnthusiast':
          progress = userStats.value.passportShares;
          break;
      }

      achievement.progress = progress;
      
      if (progress >= achievement.requirement && !achievement.completed) {
        completeAchievement(achievement.id);
      }
    });
  };

  // 完成成就
  const completeAchievement = (achievementId: string) => {
    const achievement = achievements.value.find(a => a.id === achievementId);
    if (achievement && !achievement.completed) {
      achievement.completed = true;
      achievement.completedAt = new Date().toISOString();
      
      // 触发成就完成通知
      notifyAchievementCompleted(achievement);
      
      // 保存到本地存储
      saveAchievementsToStorage();
    }
  };

  // 成就完成通知
  const notifyAchievementCompleted = (achievement: Achievement) => {
    uni.showToast({
      title: `获得成就: ${achievement.id}`,
      icon: 'none',
      duration: 3000
    });
  };

  // 保存成就数据到本地存储
  const saveAchievementsToStorage = () => {
    try {
      uni.setStorageSync('user_achievements', JSON.stringify(achievements.value));
      uni.setStorageSync('user_stats', JSON.stringify({
        ...userStats.value,
        featuresUsed: Array.from(userStats.value.featuresUsed)
      }));
    } catch (error) {
      console.error('保存成就数据失败:', error);
    }
  };

  // 从本地存储加载成就数据
  const loadAchievementsFromStorage = () => {
    try {
      const savedAchievements = uni.getStorageSync('user_achievements');
      const savedStats = uni.getStorageSync('user_stats');
      
      if (savedAchievements) {
        const parsed = JSON.parse(savedAchievements);
        // 保持现有成就结构，只更新进度和完成状态
        achievements.value.forEach(achievement => {
          const saved = parsed.find((a: Achievement) => a.id === achievement.id);
          if (saved) {
            achievement.progress = saved.progress;
            achievement.completed = saved.completed;
            achievement.completedAt = saved.completedAt;
          }
        });
      }
      
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        userStats.value = {
          ...parsed,
          featuresUsed: new Set(parsed.featuresUsed || [])
        };
      }
    } catch (error) {
      console.error('加载成就数据失败:', error);
    }
  };

  // 重置每周统计（可以在每周开始时调用）
  const resetWeeklyStats = () => {
    userStats.value.weeklyAnalyses = 0;
    saveAchievementsToStorage();
  };

  // 获取特定成就
  const getAchievement = (id: string) => {
    return achievements.value.find(a => a.id === id);
  };

  return {
    // 状态
    userStats,
    achievements,
    
    // 计算属性
    completedAchievements,
    totalAchievements,
    achievementsByCategory,
    totalPointsEarned,
    
    // 方法
    updateAnalysisStats,
    updateClockInStats,
    updateHealthScore,
    trackFeatureUsage,
    updateConsultationCount,
    updateChartViews,
    updateSocialStats,
    updateAchievementProgress,
    completeAchievement,
    saveAchievementsToStorage,
    loadAchievementsFromStorage,
    resetWeeklyStats,
    getAchievement,
  };
}); 