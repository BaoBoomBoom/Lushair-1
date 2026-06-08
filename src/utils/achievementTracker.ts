import { useAchievementStore } from '@/stores/achievementStore';

/**
 * 成就追踪工具类
 * 用于在应用程序的各个部分触发成就进度更新
 */
export class AchievementTracker {
  private static instance: AchievementTracker;
  private achievementStore: ReturnType<typeof useAchievementStore>;
  
  private constructor() {
    this.achievementStore = useAchievementStore();
    // 初始化时加载成就数据
    this.achievementStore.loadAchievementsFromStorage();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): AchievementTracker {
    if (!AchievementTracker.instance) {
      AchievementTracker.instance = new AchievementTracker();
    }
    return AchievementTracker.instance;
  }
  
  /**
   * 记录头皮分析
   */
  public trackAnalysis(): void {
    this.achievementStore.updateAnalysisStats();
  }
  
  /**
   * 记录产品打卡
   * @param consecutiveDays 连续打卡天数
   * @param totalDays 总打卡天数
   */
  public trackClockIn(consecutiveDays: number, totalDays: number): void {
    this.achievementStore.updateClockInStats(consecutiveDays, totalDays);
  }
  
  /**
   * 记录健康评分变化
   * @param score 当前评分
   */
  public trackHealthScore(score: number): void {
    this.achievementStore.updateHealthScore(score);
  }
  
  /**
   * 记录月度健康评分提升
   */
  public trackMonthlyImprovement(): void {
    const stats = this.achievementStore.userStats;
    stats.monthlyImprovements++;
    this.achievementStore.updateAchievementProgress();
  }
  
  /**
   * 记录功能使用
   * @param feature 功能名称
   */
  public trackFeatureUsage(feature: string): void {
    this.achievementStore.trackFeatureUsage(feature);
  }
  
  /**
   * 记录咨询对话
   */
  public trackConsultation(): void {
    this.achievementStore.updateConsultationCount();
  }
  
  /**
   * 记录图表查看
   */
  public trackChartView(): void {
    this.achievementStore.updateChartViews();
  }
  
  /**
   * 记录社交活动（邀请和分享）
   * @param invites 邀请数量
   * @param shares 分享数量
   */
  public trackSocialActivity(invites: number = 0, shares: number = 0): void {
    this.achievementStore.updateSocialStats(invites, shares);
  }
  
  /**
   * 重置每周统计数据
   */
  public resetWeeklyStats(): void {
    this.achievementStore.resetWeeklyStats();
  }
}

/**
 * 获取成就追踪器实例
 */
export function getAchievementTracker(): AchievementTracker {
  return AchievementTracker.getInstance();
} 