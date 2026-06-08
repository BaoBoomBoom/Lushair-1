<template>
  <view class="analysis-container">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="header-title">{{ $t('analysis.overview') }}</text>
      <view class="header-actions">
        <view class="records-button" @tap="navigateToRecords">
          <uni-icons type="list" size="20" color="#8b5cf6"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 分数展示区域 -->
    <view class="score-section">
      <view class="score-container">
        <text class="score-number">{{ Math.round(latestSummaryData?.score || 0) }}</text>
        <text class="score-label">/100</text>
      </view>
      
      <view class="score-info">
        <text class="score-date">{{ lastCheckDate }}</text>
        <text v-if="latestSummaryData?.ratio && latestSummaryData.ratio > 0" class="score-trend">{{ $t('analysis.increase', [Math.floor(latestSummaryData.ratio)]) }}</text>
      </view>
    </view>

    <!-- 趋势图表 -->
    <view class="trend-chart-container">
      <scroll-view 
        scroll-x="true" 
        class="trend-chart-scroll"
        :scroll-left="trendChartScrollPosition"
        :scroll-with-animation="true"
        id="trendChartScroll">
        <view class="trend-chart-wrapper" :style="{ width: chartWidth }">
          <view class="chart-background">
            <view class="chart-line" v-for="i in 5" :key="i"></view>
    </view>

          <!-- 折线图 -->
          <view class="chart-area">
            <!-- 连接线 -->
            <!-- 头皮健康线 -->
            <view v-for="(_, index) in healthRecords.slice(0, -1)" :key="'scalp-connector-'+index" 
                  class="line-connector scalp"
                  :style="getConnectorStyle(index, 'scalp')">
      </view>
            
            <!-- 毛囊健康线 -->
            <view v-for="(_, index) in healthRecords.slice(0, -1)" :key="'follicle-connector-'+index" 
                  class="line-connector follicle"
                  :style="getConnectorStyle(index, 'follicle')">
      </view>
            
            <!-- 头发健康线 -->
            <view v-for="(_, index) in healthRecords.slice(0, -1)" :key="'hair-connector-'+index" 
                  class="line-connector hair"
                  :style="getConnectorStyle(index, 'hair')">
      </view>
            
            <!-- 数据点 -->
            <!-- 头皮健康点 -->
            <view 
              v-for="(record, index) in healthRecords" 
              :key="'scalp-' + index" 
              class="chart-point scalp"
              :style="{ 
                left: getPointX(index) + 'px', 
                top: getPointTopPosition(record.scalp) + 'px' 
              }"
            >
              <view class="point-dot"></view>
    </view>

            <!-- 毛囊健康点 -->
            <view 
              v-for="(record, index) in healthRecords" 
              :key="'follicle-' + index" 
              class="chart-point follicle"
              :style="{ 
                left: getPointX(index) + 'px', 
                top: getPointTopPosition(record.follicle) + 'px' 
              }"
            >
              <view class="point-dot"></view>
      </view>
            
            <!-- 头发健康点 -->
            <view 
              v-for="(record, index) in healthRecords" 
              :key="'hair-' + index" 
              class="chart-point hair"
              :style="{ 
                left: getPointX(index) + 'px', 
                top: getPointTopPosition(record.hair) + 'px' 
              }"
            >
              <view class="point-dot"></view>
      </view>
    </view>

          <!-- 日期标签 -->
          <view class="chart-dates">
            <view 
              v-for="(record, index) in healthRecords" 
              :key="'date-' + index" 
              class="chart-date"
              :style="{ left: getPointX(index) + 'px' }"
            >
              <text class="date-label">{{ formatDateShort(record.createTime) }}</text>
        </view>
        </view>
        </view>
      </scroll-view>
        </view>

    <!-- 图表图例 -->
    <view class="chart-legend">
      <view class="legend-item">
        <view class="legend-color hair"></view>
        <text class="legend-text">{{ $t('analysis.hair') }}</text>
        </view>
      <view class="legend-item">
        <view class="legend-color scalp-oil"></view>
        <text class="legend-text">{{ $t('analysis.scalp') }}</text>
        </view>
      <view class="legend-item">
        <view class="legend-color scalp-sensitive"></view>
        <text class="legend-text">{{ $t('analysis.follicle') }}</text>
        </view>
      </view>

    <!-- 产品展示 -->
    <view class="product-recommendations">
      <!-- <view class="section-title">{{ $t('analysis.recommendedProducts') }}</view> -->
      <scroll-view class="product-list" scroll-x="true" show-scrollbar="false">
        <view class="product-item" v-for="(product, index) in products" :key="index">
          <image class="product-image" :src="product.image" mode="aspectFit"></image>
          <text class="product-name">{{product.type}}</text>
        </view>
      </scroll-view>
      
      <!-- <view class="track-button" @tap="showClockInPopup">
        <text class="button-text">{{ $t('analysis.trackRoutine') }}</text>
      </view> -->
    </view>

    <!-- 日常打卡 -->
    <view class="daily-clock-in-section">
      <!-- 日期选择 -->
      <view class="date-navigation">
        <view class="nav-button" @tap="navigatePrevDay">
          <text>&lt;</text>
        </view>
        <view class="current-date">
          <text>{{ formatDisplayDate(selectedDate) }}</text>
        </view>
        <view class="nav-button" @tap="navigateNextDay">
          <text>&gt;</text>
        </view>
      </view>

      <!-- 日历滑动区域 -->
      <scroll-view 
        class="calendar-scroll" 
        scroll-x="true" 
        show-scrollbar="false"
        :scroll-left="calendarScrollPosition"
        :scroll-with-animation="true"
        id="calendarScroll">
        <view class="calendar-days">
          <view 
            v-for="(day, index) in calendarDays" 
            :key="index" 
            class="day-item" 
            :class="{ 'active': isSelectedDay(day.date) }"
            @tap="selectDay(index)"
            :id="`day-${day.dayNumber}`"
          >
            <text class="day-number">{{ day.dayNumber }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 筛选按钮 -->
      <view class="filter-buttons">
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'all' }"
          @tap="setFilter('all')"
        >
          <text>All</text>
        </view>
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'pre-wash' }"
          @tap="setFilter('pre-wash')"
        >
          <text>Pre-Wash</text>
        </view>
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'shampoo' }"
          @tap="setFilter('shampoo')"
        >
          <text>Shampoo</text>
        </view>
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'conditioner' }"
          @tap="setFilter('conditioner')"
        >
          <text>Condition</text>
        </view>
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'serum' }"
          @tap="setFilter('serum')"
        >
          <text>Serum</text>
        </view>
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'hair-mask' }"
          @tap="setFilter('hair-mask')"
        >
          <text>Hair Mask</text>
        </view>
        <view 
          class="filter-button" 
          :class="{ 'active': selectedFilter === 'finasteride' }"
          @tap="setFilter('finasteride')"
        >
          <text>Finasteride</text>
        </view>
      </view>

      <!-- 产品列表 -->
      <view class="popup-product-list">
        <view v-if="filteredProducts.length > 0">
          <view 
            v-for="(product, index) in filteredProducts" 
            :key="index"
            class="popup-product-item"
            :class="{ 'clocked-in': isProductClocked(getProductId(product)) }"
          >
            <image class="popup-product-image" :src="getProductImage(product)" mode="aspectFit"></image>
            <view class="popup-product-info">
              <text class="popup-product-name">{{ getProductName(product) }}</text>
            </view>
            <view 
              class="popup-clock-button" 
              :class="{ 
                'checked': isProductClocked(getProductId(product)),
                'disabled': !isDateToday(selectedDate)
              }"
              @tap="toggleClockIn(getProductId(product))"
            >
              <text v-if="!isProductClocked(getProductId(product))" class="popup-button-text">{{ $t('common.clockIn') }}</text>
              <TablerIcon v-else name="check" :size="14" color="#ffffff" class="popup-check-icon" />
            </view>
          </view>
        </view>
        <view v-else class="no-records-message">
          <text>{{ $t('common.noClockInRecords') }}</text>
        </view>
      </view>
    </view>

    <!-- 数据分析选项卡 -->
    <view class="data-analytics-section">
      <text class="section-title">{{ $t('analysis.dataAnalytics') }}</text>
      <view class="tabs">
        <view 
          class="tab" 
          :class="{ 'active': activeTab === 'scalp' }"
          @tap="switchTab('scalp')"
        >
          <text class="tab-text">{{ $t('analysis.scalpAnalytics') }}</text>
        </view>
        <view 
          class="tab"
          :class="{ 'active': activeTab === 'derma' }"
          @tap="switchTab('derma')"
        >
          <text class="tab-text">{{ $t('analysis.dermaAnalytics') }}</text>
        </view>
      </view>
    </view>

    <!-- 选项卡内容 - 头皮分析 -->
    <view v-if="activeTab === 'scalp'" class="tab-content">
      <!-- 照片对比区域 -->
      <view class="photo-comparison">
        <view class="comparison-header">
          <text class="comparison-title">{{ $t('analysis.photoComparison') }}</text>
          <!-- <text class="comparison-arrow">{{ formatDisplayDate(selectedPhotoDate) }}</text> -->
        </view>
        
        <!-- 日期导航 -->
        <view class="date-navigation">
          <view class="nav-button" @tap="navigatePrevPhotoDay">
            <text>&lt;</text>
          </view>
          <view class="current-date">
            <text>{{ formatDisplayDate(selectedPhotoDate) }}</text>
          </view>
          <view class="nav-button" @tap="navigateNextPhotoDay">
            <text>&gt;</text>
          </view>
        </view>

        <!-- 日历滑动区域 -->
        <scroll-view 
          class="calendar-scroll" 
          scroll-x="true" 
          show-scrollbar="false"
          :scroll-left="photoCalendarScrollPosition"
          :scroll-with-animation="true"
          id="photoCalendarScroll">
          <view class="calendar-days">
            <view 
              v-for="(day, index) in photoCalendarDays" 
              :key="index"
              class="day-item" 
              :class="{ 'active': isSelectedPhotoDay(day.date) }"
              @tap="selectPhotoDay(index)"
              :id="`photo-day-${day.dayNumber}`"
            >
              <text class="day-number">{{ day.dayNumber }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="comparison-images" v-if="!isLoadingPhotos">
          <view v-if="selfiePhotos.length === 0" class="no-photos-message">
            <text>{{ $t('analysis.noPhotosFound') }}</text>
          </view>
          <view v-else>
            <view 
              v-for="(row, rowIndex) in getPhotoRows" 
              :key="rowIndex" 
              class="photo-row"
              :class="{ 'single-photo': selfiePhotos.length === 1 }"
            >
              <view 
                v-for="(photoUrl, photoIndex) in row" 
                :key="photoIndex"
                class="comparison-image"
                :class="{ 'single': selfiePhotos.length === 1 }"
              >
                <image :src="photoUrl" mode="aspectFill" class="selfie-image"></image>
              </view>
            </view>
          </view>
        </view>
        
        <view v-if="isLoadingPhotos" class="loading-photos">
          <text>{{ $t('common.loading') }}</text>
        </view>
      </view>
      
      <!-- 数据标签行 -->
      <!-- <view class="data-labels">
        <view class="data-label-item normal">
          <text class="label-text">Normal</text>
        </view>
        <view class="data-label-item">
          <text class="label-text">Oily</text>
        </view>
        <view class="data-label-item">
          <text class="label-text">Hair Loss</text>
        </view>
        <view class="data-label-item">
          <text class="label-text">Dry</text>
        </view>
        <view class="data-label-item">
          <text class="label-text">Sensitive</text>
        </view>
      </view> -->
    </view>

    <!-- 选项卡内容 - 皮肤分析 -->
    <view v-if="activeTab === 'derma'" class="tab-content">
      <!-- 照片对比区域 -->
      <view class="photo-comparison">
        <view class="comparison-header">
          <text class="comparison-title">{{ $t('analysis.photoComparison') }}</text>
        </view>
        <!-- 日期导航 -->
        <view class="date-navigation">
          <view class="nav-button" @tap="navigatePrevDermaPhotoDay">
            <text>&lt;</text>
          </view>
          <view class="current-date">
            <text>{{ formatDisplayDate(selectedDermaPhotoDate) }}</text>
          </view>
          <view class="nav-button" @tap="navigateNextDermaPhotoDay">
            <text>&gt;</text>
          </view>
        </view>
        <!-- 日历滑动区域 -->
        <scroll-view 
          class="calendar-scroll" 
          scroll-x="true" 
          show-scrollbar="false"
          :scroll-left="dermaPhotoCalendarScrollPosition"
          :scroll-with-animation="true"
          id="dermaPhotoCalendarScroll">
          <view class="calendar-days">
            <view 
              v-for="(day, index) in dermaPhotoCalendarDays" 
              :key="index"
              class="day-item" 
              :class="{ 'active': isSelectedDermaPhotoDay(day.date) }"
              @tap="selectDermaPhotoDay(index)"
              :id="`derma-photo-day-${day.dayNumber}`"
            >
              <text class="day-number">{{ day.dayNumber }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="comparison-images" v-if="!isLoadingDermaPhotos">
          <view v-if="dermaSelfiePhotos.length === 0" class="no-photos-message">
            <text>{{ $t('analysis.noPhotosFound') }}</text>
          </view>
          <view v-else>
            <view 
              v-for="(row, rowIndex) in getDermaPhotoRows" 
              :key="rowIndex" 
              class="photo-row"
              :class="{ 'single-photo': dermaSelfiePhotos.length === 1 }"
            >
              <view 
                v-for="(photoUrl, photoIndex) in row" 
                :key="photoIndex"
                class="comparison-image"
                :class="{ 'single': dermaSelfiePhotos.length === 1 }"
              >
                <image :src="photoUrl" mode="aspectFill" class="selfie-image"></image>
              </view>
            </view>
          </view>
        </view>
        <view v-if="isLoadingDermaPhotos" class="loading-photos">
          <text>{{ $t('common.loading') }}</text>
        </view>
      </view>
    </view>

    <!-- 产品使用频率 -->
    <!-- <view class="product-usage-section">
      <text class="section-title">Product Usage</text>
      <view class="product-usage-items">
        <view class="product-usage-item">
          <image class="usage-product-image" src="/static/analysis/prewash-small.png" mode="aspectFit"></image>
        </view>
        <view class="product-usage-item">
          <image class="usage-product-image" src="/static/analysis/shampoo-small.png" mode="aspectFit"></image>
        </view>
        <view class="product-usage-item">
          <image class="usage-product-image" src="/static/analysis/conditioner-small.png" mode="aspectFit"></image>
        </view>
        <view class="product-usage-item">
          <image class="usage-product-image" src="/static/analysis/serum-small.png" mode="aspectFit"></image>
        </view>
        <view class="product-usage-item">
          <image class="usage-product-image" src="/static/analysis/mask-small.png" mode="aspectFit"></image>
        </view>
      </view>
    </view> -->

    <!-- AI分析建议 -->
    <view class="ai-suggestion">
      <view class="ai-header">
        <view class="ai-icon">
          <TablerIcon name="sparkles" :size="16" color="#6b21c8" />
        </view>
        <text class="ai-title">{{ $t('analysis.aiEvaluation') }}</text>
      </view>
      
      <view class="ai-content" v-if="scanRemindersVisible">
        <scroll-view scroll-x="true" class="scan-reminder-scroll">
          <view class="scan-reminder-content">
            <view v-if="scanReminders.length > 0" v-for="(reminder, idx) in scanReminders" :key="idx" class="reminder-text">{{ reminder }}</view>
            <view v-else class="reminder-text">{{ $t('scan.noAbnormalityFound') }}</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 趋势分析区 -->
    <view class="trend-analytics">
      <text class="section-title">{{ $t('analysis.trendAnalytics') }}</text>
      <view class="trend-chart-box">
        <view v-if="trendData.length === 0" class="trend-empty">
          <text>{{ $t('analysis.noData') }}</text>
        </view>
        <view v-else class="trend-chart">
          <canvas canvas-id="trendChart" id="trendChart" class="trend-canvas"></canvas>
          <view class="trend-labels">
            <view v-for="(item, index) in trendData" :key="index" class="trend-label" :style="{ left: getTrendLabelPosition(index) + 'px' }">
              <text class="trend-date">{{ formatTrendDate(item.date) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 头皮分析区 -->
    <view class="scalp-analytics">
      <text class="section-title">{{ $t('analysis.scalpDetailScore') }}</text>
      <view class="scalp-score">
        <!-- 头皮健康评分 -->
        <view class="scalp-metric">
          <view class="metric-header">
            <text class="metric-label">{{ $t('analysis.scalpHealth') }}</text>
          </view>
          <view class="metric-content">
            <text class="metric-value">{{ Math.floor(latestSummaryData?.score || 0) }}</text>
            <view v-if="latestSummaryData?.ratio !== null && latestSummaryData?.ratio !== undefined && latestSummaryData?.ratio != 0" class="metric-trend">
              <text v-if="latestSummaryData.ratio > 0" class="trend-up">↑</text>
              <text v-else-if="latestSummaryData.ratio < 0" class="trend-down">↓</text>
            </view>
          </view>
        </view>
        
        <!-- 条件指标 -->
        <view v-for="(condition, index) in filteredConditions" :key="index" class="scalp-metric">
          <view class="metric-header">
            <text class="metric-label">{{ condition.key }}</text>
          </view>
          <view class="metric-content">
            <text class="metric-value">{{ condition.score }}</text>
            <!-- <text class="metric-desc">{{ condition.desc }}</text> -->
            <view v-if="condition.ratio !== null && condition.ratio !== undefined && condition.ratio != 0" class="metric-trend">
              <text v-if="condition.ratio > 0" class="trend-up">↑</text>
              <text v-else-if="condition.ratio < 0" class="trend-down">↓</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 灰色区块-产品评测 -->
    <!-- <view class="product-evaluation">
      <text class="section-title">{{ $t('analysis.productEvaluation') }}</text>
      <view class="evaluation-content">
        <text class="evaluation-text">{{ $t('analysis.shampooVolume') }}</text>
        <text class="evaluation-text">{{ $t('analysis.maskSmoothness') }}</text>
        <text class="evaluation-text">{{ $t('analysis.serumMoisture') }}</text>
      </view>
    </view> -->

    <!-- 打卡弹窗 -->
    <ClockInPopup 
      :visible="showPopup" 
      @update:visible="showPopup = $event"
      :initial-products="products"
      @clock-in-updated="handleClockInUpdated"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineEmits, nextTick } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';
import ClockInPopup from '@/components/ClockInPopup.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { getAchievementTracker } from '@/utils/achievementTracker';

interface AnalysisSummary {
  score: number;
  ratio: number;
}

interface HealthRecord {
  scalp: string;
  follicle: string;
  hair: string;
  scalpScore: string;
  createTime: string;
}

interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
  clockIn?: boolean;
}

interface RecommendedProduct {
  type: string; // e.g., PRE_WASH, SHAMPOO
  typeDesc: string;
  productId: number;
  productTitle: string;
  productDesc: string | null;
  productUrl: string;
  clockIn: boolean; 
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
}

const userStore = useUserStore();
const { userInfo } = userStore;
const { t } = useI18n();

const score = ref(0);
const ratio = ref(0);
const lastCheckDate = ref('');
const healthRecords = ref<HealthRecord[]>([]);

// 产品数据
const products = ref<ProductItem[]>([]);
const dailyProducts = ref<RecommendedProduct[]>([]);

// 当前选中的日期索引
const selectedDayIndex = ref(0);
const todayIndex = ref(0);
const calendarDays = ref<CalendarDay[]>([]);
const clockInRecords = ref<Record<string, string[]>>({});
const selectedDate = ref<Date>(new Date());
const selectedFilter = ref<string>('all');

const emit = defineEmits(['clock-in-updated']);

// 产品类别
const productCategories = computed(() => {
  const categories = new Map<string, { type: string, name: string }>();
  
  dailyProducts.value.forEach(product => {
    if (!categories.has(product.type)) {
      categories.set(product.type, {
        type: product.type,
        name: product.typeDesc
      });
    }
  });
  
  return Array.from(categories.values());
});

// 筛选后的产品
const filteredProducts = computed(() => {
  if (selectedFilter.value === 'all') {
    return dailyProducts.value;
  } else {
    return dailyProducts.value.filter(product => product.type === selectedFilter.value);
  }
});

// 扫描提示相关
const scanReminders = ref<string[]>([]);
const scanRemindersVisible = ref(true);

const alertCount = ref(0);
const alertDescriptions = ref<string[]>([]);

// 趋势数据
interface TrendItem {
  date: string;
  score: number;
}

// 自拍历史照片接口
interface SelfieHistoryResponse {
  originImgUrls: string[];
}

// 照片对比日期项
interface PhotoComparisonDate {
  date: Date;
  dayNumber: number;
  isSelected: boolean;
  hasPhotos: boolean;
}

// 照片对比日历日期项
interface PhotoCalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
}

const trendData = ref<TrendItem[]>([]);

// 照片对比相关状态
const photoComparisonDates = ref<PhotoComparisonDate[]>([]);
const photoCalendarDays = ref<PhotoCalendarDay[]>([]);
const selectedPhotoDate = ref<Date>(new Date());
const selectedPhotoDayIndex = ref(0);
const selfiePhotos = ref<string[]>([]);
const isLoadingPhotos = ref(false);
const photoCalendarScrollPosition = ref(0);

// 总体评分卡片和扫描提示的数据可用性
const summaryAvailable = ref(false)
const latestSummaryData = ref<{ 
  precede?: number,
  score?: number,
  ratio?: number,
  conditions?: Array<{
    key: string,
    desc: string,
    grade: string,
    score: number,
    lastScore: number | null,
    ratio: number | null
  }>
}>({})

// 获取健康度数据
const fetchHealthData = async (userId: string) => {
  try {
    let response: any;
    
    // 根据用户类型调用不同的API
    if ((userInfo as any).type === 1) {
      response = await post('user/getMerchantDetectionRecordList', { merchantId: userId });
    } else {
      response = await post('user/getDetectionRecordList', { userId });
    }
    
    console.log('健康度数据响应:', response);
    
    // 检查响应状态
    if (response && response.list && response.list.length > 0) {
      const sortedList = [...response.list].sort((a: any, b: any) =>
        new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
      );
      healthRecords.value = sortedList;

      // 获取最后一条记录
      const latestRecord = sortedList[sortedList.length - 1];
      
      // 更新分数和日期
      score.value = Math.round(latestRecord.scalpScore) || 0;
      lastCheckDate.value = formatDate(latestRecord.createTime);
      
      // 更新用户信息中的健康度数据
      userStore.updateUserInfo({
        totalScore: score.value
      });
      
      // 自动滚动到最新数据
      calculateTrendChartScrollPosition();
    }
    
    return response;
  } catch (error) {
    console.error('获取健康度数据失败:', error);
    return null;
  }
};

// 获取最新分析概览
const fetchLatestSummary = async (userId: string) => {
  try {
    const response = await post('analyse/latest/summary', { userId });
    console.log('分析数据响应:', response);
    
    if (response && typeof response === 'object') {
      summaryAvailable.value = true;
      latestSummaryData.value = response;
      
      // 处理扫描提示
      if ('conditions' in response) {
        const conditions = response.conditions as any[];
        handleScanReminders(conditions);
        handleAlerts(conditions);
      } else {
        // 如果没有conditions数据，也显示默认提示
        scanReminders.value = [];
        scanRemindersVisible.value = true;
      }
    } else {
      // 如果没有响应数据，也显示默认提示
      scanReminders.value = [];
      scanRemindersVisible.value = true; // 修改为true，以便显示默认提示
    }
  } catch (error) {
    console.error('获取最新检测结果概览失败:', error);
    scanReminders.value = [];
    scanRemindersVisible.value = true; // 修改为true，以便显示默认提示
  }
};

// 过滤有效的conditions
const filteredConditions = computed(() => {
  if (!latestSummaryData.value || !latestSummaryData.value.conditions) {
    return [];
  }
  
  return latestSummaryData.value.conditions.filter(condition => 
    condition && condition.key && condition.grade
  );
});

// 获取条件标签
const getConditionLabel = (key: string) => {
  const keyMap: Record<string, string> = {
    'DENSITY': t('analysis.hairLoss'),
    'OIL': t('analysis.scalpOil'),
    'REDNESS': t('analysis.scalpSensitive'),
    'KERATINOCYTES': t('scan.scurfUp').split('\n')[0],
    'SCURF': t('scan.scurfUp').split('\n')[0],
    'FOLLICLE': t('analysis.follicleHealth')
  };
  
  return keyMap[key] || key;
};

// 获取等级文本
const getGradeText = (grade: string) => {
  const gradeMap: Record<string, string> = {
    'NORMAL': t('analysis.normal'),
    'LOW': t('common.low'),
    'HIGH': t('common.high'),
    'VERY_LOW': t('common.veryLow'),
    'VERY_HIGH': t('common.veryHigh')
  };
  
  return gradeMap[grade] || grade;
};

// 处理扫描提示
function handleScanReminders(conditions: any[] = []) {
  if (!conditions || conditions.length === 0) {
    scanReminders.value = [];
    scanRemindersVisible.value = true; // 修改为true，以便显示默认提示
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
    scanRemindersVisible.value = true; // 修改为true，以便显示默认提示
    return;
  }
  if (!hasAny) {
    reminders.push(t('scan.noProblem'));
  }
  scanReminders.value = reminders;
  scanRemindersVisible.value = true;
}

// 处理警告
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

// 获取产品推荐数据
const fetchProductRecommendations = async (userId: string) => {
  try {
    if (!userId) {
      console.error('用户ID不可用，无法获取产品推荐。');
      products.value = [];
      return;
    }

    const response = await post('/product/recommend', { userId }) as RecommendedProduct[];

    if (response && Array.isArray(response)) {
      const recommendedProductsMap = new Map<string, ProductItem>();
      const typeMapping: Record<string, string> = {
        PRE_WASH: 'pre-wash',
        SHAMPOO: 'shampoo',
        CONDITION: 'conditioner',
        SERUM: 'serum',
        HAIR_MASK: 'hair-mask',
        DRUG: 'finasteride',
      };

      for (const apiProduct of response) {
        const internalType = typeMapping[apiProduct.type];
        if (internalType && !recommendedProductsMap.has(internalType)) {
          recommendedProductsMap.set(internalType, {
            id: apiProduct.productId.toString(),
            name: apiProduct.productTitle,
            type: internalType,
            image: apiProduct.productUrl,
          });
        }
      }

      const displayOrder = ['pre-wash', 'shampoo', 'conditioner', 'serum', 'hair-mask', 'finasteride'];
      const orderedProducts: ProductItem[] = [];
      for (const type of displayOrder) {
        if (recommendedProductsMap.has(type)) {
          orderedProducts.push(recommendedProductsMap.get(type)!);
        }
      }
      products.value = orderedProducts;
      console.log('处理后的产品推荐:', products.value);
    } else {
      console.log('没有产品推荐数据或格式不正确');
      products.value = [];
    }
  } catch (error) {
    console.error('获取产品推荐失败:', error);
    products.value = [];
  }
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 格式化日期（短）- 改为MM/DD/YYYY格式
const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${year}`;
};

// 获取图表点的X坐标（像素）
const getPointX = (index: number) => {
  const pointSpacing = 80; // 点之间的间距
  return index * pointSpacing + 20; // 20px为左边距
};

// 获取点的Y坐标（从上到下）- 使用固定像素值
const getPointTopPosition = (value: string) => {
  // 确保分数是整数
  const score = Math.floor(parseInt(value) || 0);
  const maxScore = 100; // 最高分数
  const minScore = 0;  // 最低分数
  const chartHeight = 160; // 图表总高度
  const usableHeight = chartHeight - 40; // 减去上下边距
  
  // 计算从顶部开始的位置（分数越高，位置越靠上）
  return Math.floor(chartHeight - ((score - minScore) / (maxScore - minScore)) * usableHeight - 20);
};

// 获取连接线的样式
const getConnectorStyle = (index: number, type: 'scalp' | 'follicle' | 'hair') => {
  if (!healthRecords.value[index] || !healthRecords.value[index + 1]) return {};
  
  const record1 = healthRecords.value[index];
  const record2 = healthRecords.value[index + 1];
  
  // 获取当前点和下一个点的位置（像素）
  const startX = getPointX(index);
  const startY = getPointTopPosition(record1[type]);
  const endX = getPointX(index + 1);
  const endY = getPointTopPosition(record2[type]);
  
  // 计算两点之间的距离（像素）
  const xDiff = endX - startX;
  const yDiff = endY - startY;
  
  // 计算线条长度
  const length = Math.floor(Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)));
  
  // 计算线的旋转角度（弧度转度数）
  const angle = Math.atan2(yDiff, xDiff) * 180 / Math.PI;
  
  return {
    width: `${length}px`,
    left: `${startX}px`,
    top: `${startY}px`,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 0'
  };
};

// 计算图表宽度
const chartWidth = computed(() => {
  if (!healthRecords.value.length) return '100%';
  return (healthRecords.value.length * 80 + 40) + 'px'; // 每个点80px宽度，两侧各20px边距
});

// 打卡弹窗相关状态
const showPopup = ref(false);

// 显示打卡弹窗
const showClockInPopup = () => {
  showPopup.value = true;
};

// 处理打卡更新
const handleClockInUpdated = (data: {
  date: string;
  records: string[];
  allRecords: Record<string, string[]>;
}) => {
  console.log('打卡数据已更新:', data);
  // 可以在这里做额外的处理，如UI更新、数据同步等
};

// 生成日历数据
const generateCalendarDays = () => {
  const days: CalendarDay[] = [];
  // 使用选中日期的年月，而不是当前日期
  const selectedYear = selectedDate.value.getFullYear();
  const selectedMonth = selectedDate.value.getMonth();
  const currentDate = new Date();
  
  // 获取选中月份的第一天和最后一天
  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0);
  
  for (let i = 1; i <= endDate.getDate(); i++) {
    const date = new Date(selectedYear, selectedMonth, i);
    const isToday = date.getDate() === currentDate.getDate() && 
                   date.getMonth() === currentDate.getMonth() && 
                   date.getFullYear() === currentDate.getFullYear();
    
    days.push({
      date: date,
      dayNumber: i,
      isToday: isToday
    });
    
    // 设置今天的索引
    if (isToday) {
      todayIndex.value = i - 1;
    }
  }
  
  calendarDays.value = days;
  
  // 找到当前选中日期在新日历中的索引
  const selectedDayInCalendar = days.findIndex(day => 
    day.date.getDate() === selectedDate.value.getDate() &&
    day.date.getMonth() === selectedDate.value.getMonth() &&
    day.date.getFullYear() === selectedDate.value.getFullYear()
  );
  
  if (selectedDayInCalendar >= 0) {
    selectedDayIndex.value = selectedDayInCalendar;
  } else {
    // 如果选中的日期不在当前月份，选择第一天
    selectedDayIndex.value = 0;
    selectedDate.value = days[0].date;
  }
};

// 格式化星期几
const formatDayName = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// 选择日期
const selectDay = (index: number) => {
  selectedDayIndex.value = index;
  selectedDate.value = calendarDays.value[index].date;
  fetchClockInRecords(formatDateString(calendarDays.value[index].date));
  calculateScrollPosition(); // 计算并更新滚动位置
};

// 格式化日期为字符串 YYYY-MM-DD
const formatDateString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 获取打卡记录
const fetchClockInRecords = async (dateStr: string) => {
  try {
    const userId = userInfo.userId;
    if (!userId) {
      console.error('用户ID不可用，无法获取打卡记录');
      return;
    }
    
    // 将日期格式从 YYYY-MM-DD 转换为 YYYYMMDD
    const formattedDate = dateStr.replace(/-/g, '');
    
    // 检查是否是今天的日期
    const isToday = isDateToday(selectedDate.value);
    
    if (isToday) {
      // 如果是今天，先获取推荐产品列表
      await fetchRecommendedProducts(userId);
    }
    
    // 获取打卡记录
    const response = await post('encr/clockIn/product/query', { 
      userId: userId,
      dateStr: formattedDate
    });
    
    if (response && Array.isArray(response)) {
      if (isToday) {
        // 如果是今天，合并推荐产品和打卡记录
        mergeProductsWithClockInStatus(response);
      } else {
        // 如果不是今天，直接使用打卡记录
        dailyProducts.value = response;
      }
      
      // 更新clockInRecords，用于兼容现有逻辑
      const dateKey = formatDateKey(selectedDate.value);
      clockInRecords.value[dateKey] = dailyProducts.value
        .filter(product => product.clockIn)
        .map(product => product.productId.toString());
    } else if (!isToday) {
      // 如果不是今天且没有打卡记录，清空产品列表
      dailyProducts.value = [];
      const dateKey = formatDateKey(selectedDate.value);
      clockInRecords.value[dateKey] = [];
    }
  } catch (error) {
    console.error('获取打卡记录失败:', error);
    if (!isDateToday(selectedDate.value)) {
      dailyProducts.value = [];
    }
    const dateKey = formatDateKey(selectedDate.value);
    clockInRecords.value[dateKey] = [];
  }
};

// 合并推荐产品和打卡记录
const mergeProductsWithClockInStatus = (clockInProducts: any[]) => {
  if (!clockInProducts || clockInProducts.length === 0) {
    return;
  }
  
  // 将打卡状态设置到对应的推荐产品上
  const recommendedProductIds = new Set(dailyProducts.value.map(p => p.productId));
  const additionalProducts: any[] = [];
  
  // 处理每个打卡产品
  clockInProducts.forEach(clockedProduct => {
    // 如果在推荐产品中找到匹配ID的产品，设置其打卡状态
    const existingProductIndex = dailyProducts.value.findIndex(p => p.productId === clockedProduct.productId);
    
    if (existingProductIndex >= 0) {
      // 产品已存在于推荐列表中，更新打卡状态
      dailyProducts.value[existingProductIndex].clockIn = true;
    } else {
      // 产品不在推荐列表中，添加到额外产品列表
      clockedProduct.clockIn = true;
      additionalProducts.push(clockedProduct);
    }
  });
  
  // 将额外的打卡产品添加到推荐产品列表的顶部
  if (additionalProducts.length > 0) {
    dailyProducts.value = [...additionalProducts, ...dailyProducts.value];
  }
};

// 获取推荐产品列表
const fetchRecommendedProducts = async (userId: string) => {
  try {
    const response = await post('/product/recommend', { userId });
    
    if (response && Array.isArray(response)) {
      // 设置推荐产品列表，初始化都未打卡
      dailyProducts.value = response.map(product => ({
        ...product,
        clockIn: false
      }));
    } else {
      dailyProducts.value = [];
    }
  } catch (error) {
    console.error('获取推荐产品失败:', error);
    dailyProducts.value = [];
  }
};

// 检查日期是否是今天
const isDateToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
};

// 切换打卡状态
const toggleClockIn = async (productId: string) => {
  // 如果不是今天，不允许打卡
  if (!isDateToday(selectedDate.value)) {
    return;
  }

  try {
    const userId = userInfo.userId;
    if (!userId) {
      console.error('用户ID不可用，无法更新打卡记录');
      return;
    }
    
    // 找到当前产品
    const productIndex = dailyProducts.value.findIndex(p => {
      return getProductId(p) === productId;
    });
    
    if (productIndex === -1) {
      console.error('未找到产品:', productId);
      return;
    }
    
    const product = dailyProducts.value[productIndex];
    const currentStatus = product.clockIn;
    
    // 更新本地状态（乐观更新）
    product.clockIn = !currentStatus;
    
    // 更新日期键
    const dateKey = formatDateKey(selectedDate.value);
    
    // 更新clockInRecords
    if (product.clockIn) {
      // 添加到记录中
      if (!clockInRecords.value[dateKey]) {
        clockInRecords.value[dateKey] = [];
      }
      if (!clockInRecords.value[dateKey].includes(productId)) {
        clockInRecords.value[dateKey].push(productId);
      }
    } else {
      // 从记录中移除
      if (clockInRecords.value[dateKey]) {
        clockInRecords.value[dateKey] = clockInRecords.value[dateKey].filter(id => id !== productId);
      }
    }
    
    // 提交到服务器
    const formattedDate = formatDateForApi(selectedDate.value);
    await post('encr/clockIn/product', {
      userId: userId,
      productId: parseInt(productId) || 0,
      productType: product.type,
      content: ""  // 内容为空
    });
    
    // 通知父组件
    emit('clock-in-updated', {
      date: dateKey,
      records: clockInRecords.value[dateKey] || [],
      allRecords: clockInRecords.value
    });
  } catch (error) {
    console.error('更新打卡状态失败:', error);
    // 恢复本地状态（出错时回滚）
    const productIndex = dailyProducts.value.findIndex(p => getProductId(p) === productId);
    if (productIndex !== -1) {
      dailyProducts.value[productIndex].clockIn = !dailyProducts.value[productIndex].clockIn;
    }
    
    uni.showToast({
      title: '更新失败，请稍后重试',
      icon: 'none',
      duration: 2000
    });
  }
};

// 保存打卡记录到本地存储
const saveClockInRecords = () => {
  try {
    // 保存产品数据和打卡状态
    uni.setStorageSync('daily_products', JSON.stringify(dailyProducts.value));
    // 保持兼容性
    uni.setStorageSync('clock_in_records', JSON.stringify(clockInRecords.value));
  } catch (e) {
    console.error('保存打卡记录失败', e);
  }
};

// 从本地存储加载打卡记录
const loadClockInRecords = () => {
  try {
    // 加载产品数据和打卡状态
    const products = uni.getStorageSync('daily_products');
    if (products) {
      dailyProducts.value = JSON.parse(products);
    }
    
    // 保持兼容性
    const records = uni.getStorageSync('clock_in_records');
    if (records) {
      clockInRecords.value = JSON.parse(records);
    }
  } catch (e) {
    console.error('加载打卡记录失败', e);
  }
};

// 导航到前一天
const navigatePrevDay = () => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() - 1);
  const oldMonth = selectedDate.value.getMonth();
  const newMonth = newDate.getMonth();
  
  selectedDate.value = newDate;
  
  // 如果跨月了，重新生成日历
  if (oldMonth !== newMonth) {
    generateCalendarDays();
  } else {
    // 在同一个月内，只需要更新索引
    const index = calendarDays.value.findIndex(day => 
      day.date.getDate() === newDate.getDate()
    );
    
    if (index >= 0) {
      selectedDayIndex.value = index;
    }
  }
  
  fetchClockInRecords(formatDateString(newDate));
  calculateScrollPosition(); // 计算并更新滚动位置
};

// 导航到后一天
const navigateNextDay = () => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + 1);
  const oldMonth = selectedDate.value.getMonth();
  const newMonth = newDate.getMonth();
  
  selectedDate.value = newDate;
  
  // 如果跨月了，重新生成日历
  if (oldMonth !== newMonth) {
    generateCalendarDays();
  } else {
    // 在同一个月内，只需要更新索引
    const index = calendarDays.value.findIndex(day => 
      day.date.getDate() === newDate.getDate()
    );
    
    if (index >= 0) {
      selectedDayIndex.value = index;
    }
  }
  
  fetchClockInRecords(formatDateString(newDate));
  calculateScrollPosition(); // 计算并更新滚动位置
};

// 判断是否是选中的日期
const isSelectedDay = (date: Date) => {
  return date.getDate() === selectedDate.value.getDate() &&
         date.getMonth() === selectedDate.value.getMonth() &&
         date.getFullYear() === selectedDate.value.getFullYear();
};

// 设置筛选条件
const setFilter = (filter: string) => {
  selectedFilter.value = filter;
};

// 格式化显示日期
const formatDisplayDate = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString(undefined, options);
};

// 数据分析选项卡相关状态
const activeTab = ref<string>('scalp');

// 切换选项卡
const switchTab = (tab: string) => {
  activeTab.value = tab;
};

// 临时添加缺失的翻译
const dermaDescription = computed(() => {
  // 根据当前语言返回不同的文本
  const locale = uni.getStorageSync('locale') || uni.getSystemInfoSync().language || 'en';
  if (locale.includes('zh')) {
    return '皮肤分析可以帮助您了解皮肤健康状况，包括水分、油脂、弹性等指标。定期分析可以帮助您调整护肤方案。';
  } else {
    return 'Derma analysis helps you understand your skin health, including moisture, oil, elasticity and other indicators. Regular analysis can help you adjust your skincare routine.';
  }
});

// 获取趋势数据
const fetchTrendData = async (userId: string) => {
  try {
    const response = await post('/encr/clockIn/trend', { userId });
    console.log('趋势数据响应:', response);
    
    if (response && Array.isArray(response)) {
      // 按日期排序
      trendData.value = response.sort((a, b) => {
        return parseInt(a.date) - parseInt(b.date);
      });
      
      // 延迟绘制图表，确保DOM已经渲染
      setTimeout(() => {
        drawTrendChart();
      }, 300);
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    trendData.value = [];
  }
};

// 格式化趋势图日期
const formatTrendDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return '';
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  return `${month}/${day}/${year}`;
};

// 计算趋势图数据点的x坐标（与日期标签保持一致）
const getTrendPointX = (index: number, totalLength: number, chartWidth: number, padding: number) => {
  if (totalLength === 1) {
    // 如果只有一个数据点，将其居中显示
    return chartWidth / 2;
  } else {
    // 多个数据点时，均匀分布
    return padding + (chartWidth - 2 * padding) * (index / (totalLength - 1));
  }
};

// 绘制趋势图
const drawTrendChart = () => {
  if (trendData.value.length === 0) return;
  
  try {
    const ctx = uni.createCanvasContext('trendChart');
    const width = 300;  // 画布宽度
    const height = 150; // 画布高度
    const padding = 20; // 内边距
    
    // 计算坐标轴范围
    const maxScore = Math.max(...trendData.value.map(item => item.score));
    const minScore = Math.min(...trendData.value.map(item => item.score));
    const scoreRange = maxScore - minScore || 1;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景网格线
    ctx.setStrokeStyle('#f0f0f0');
    ctx.setLineWidth(1);
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // 绘制折线
    if (trendData.value.length > 1) {
      ctx.beginPath();
      ctx.setStrokeStyle('#8b5cf6');
      ctx.setLineWidth(2);
      
      for (let i = 0; i < trendData.value.length; i++) {
        const item = trendData.value[i];
        const x = getTrendPointX(i, trendData.value.length, width, padding);
        const y = padding + (height - 2 * padding) * (1 - (item.score - minScore) / scoreRange);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // 绘制数据点
    for (let i = 0; i < trendData.value.length; i++) {
      const item = trendData.value[i];
      const x = getTrendPointX(i, trendData.value.length, width, padding);
      const y = padding + (height - 2 * padding) * (1 - (item.score - minScore) / scoreRange);
      
      // 绘制圆点
      ctx.beginPath();
      ctx.setFillStyle('#8b5cf6');
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // 绘制分数
      ctx.setFontSize(12);
      ctx.setFillStyle('#333');
      ctx.fillText(item.score.toString(), x - 8, y - 10);
    }
    
    // 绘制到画布
    ctx.draw();
  } catch (error) {
    console.error('绘制趋势图失败:', error);
  }
};

// Navigate to records page
const navigateToRecords = () => {
  uni.navigateTo({
    url: '/pages/analysis/records'
  });
};

// 日期格式化为YYYY-M-D格式，用于存储
const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// 获取产品ID（兼容不同数据格式）
const getProductId = (product: any) => {
  if ('id' in product) {
    return product.id;
  }
  return product.productId.toString();
};

// 获取产品名称（兼容不同数据格式）
const getProductName = (product: any) => {
  if ('name' in product) {
    return product.name;
  }
  return product.productTitle;
};

// 获取产品图片（兼容不同数据格式）
const getProductImage = (product: any) => {
  if ('image' in product) {
    return product.image;
  }
  return product.productUrl;
};

onMounted(() => {
  fetchLatestSummary(userInfo.userId);
  fetchHealthData(userInfo.userId);
  fetchProductRecommendations(userInfo.userId);
  fetchTrendData(userInfo.userId);
  // 初始化选中日期为今天
  selectedDate.value = new Date();
  // 初始化日期数据
  generateCalendarDays();
  // 加载打卡记录
  fetchClockInRecords(formatDateString(selectedDate.value));
  // 初始化滚动位置
  calculateScrollPosition();
  // 初始化照片对比功能（头皮分析）
  selectedPhotoDate.value = new Date();
  generatePhotoCalendarDays();
  fetchSelfieHistory(userInfo.userId, selectedPhotoDate.value);
  calculatePhotoScrollPosition();
  // 初始化皮肤分析tab
  selectedDermaPhotoDate.value = new Date();
  generateDermaPhotoCalendarDays();
  fetchDermaHistory(userInfo.userId, selectedDermaPhotoDate.value);
  calculateDermaPhotoScrollPosition();
});

// 日期格式化为YYYYMMDD格式，用于API调用
const formatDateForApi = (date: Date) => {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
};

// Add calendarScrollPosition with other refs
const calendarScrollPosition = ref(0);
const trendChartScrollPosition = ref(0);

// Add this after generateCalendarDays function
// 计算并设置日历滚动位置，以便显示当前选中日期
const calculateScrollPosition = () => {
  try {
    // 使用nextTick确保DOM已更新
    nextTick(() => {
      // 获取当前选中日期索引
      const currentDayIndex = calendarDays.value.findIndex(day => isSelectedDay(day.date));
      if (currentDayIndex >= 0) {
        // 计算大致滚动位置：每个日期项的宽度约为60px（50px宽度+10px外边距）
        calendarScrollPosition.value = currentDayIndex * 60 - 100; // 减去一些偏移量使其居中
        
        // 确保不会出现负值滚动
        calendarScrollPosition.value = Math.max(0, calendarScrollPosition.value);
      }
    });
  } catch (error) {
    console.error('计算滚动位置失败:', error);
    calendarScrollPosition.value = 0;
  }
};

// 判断产品是否已打卡
const isProductClocked = (productId: string) => {
  if (!isDateToday(selectedDate.value)) {
    return true;
  }
  // 优先检查API产品数据
  const product = dailyProducts.value.find(p => getProductId(p) === productId);
  if (product) {
    return product.clockIn === true;
  }
  
  // 兼容本地缓存方式
  const dateKey = formatDateKey(selectedDate.value);
  return clockInRecords.value[dateKey]?.includes(productId) || false;
};

// 获取自拍历史照片
const fetchSelfieHistory = async (userId: string, date: Date) => {
  try {
    isLoadingPhotos.value = true;
    const dateStr = formatDateForApi(date);
    
    const response = await post('/selfie/history', {
      userId: userId,
      dateStr: dateStr
    }) as SelfieHistoryResponse;
    
    if (response && response.originImgUrls) {
      selfiePhotos.value = response.originImgUrls;
    } else {
      selfiePhotos.value = [];
    }
  } catch (error) {
    console.error('获取自拍历史照片失败:', error);
    selfiePhotos.value = [];
  } finally {
    isLoadingPhotos.value = false;
  }
};

// 生成照片对比日期
const generatePhotoComparisonDates = () => {
  const dates: PhotoComparisonDate[] = [];
  const today = new Date();
  const currentDate = new Date(selectedPhotoDate.value);
  
  // 生成前后各3天的日期
  for (let i = -3; i <= 3; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + i);
    
    dates.push({
      date: date,
      dayNumber: date.getDate(),
      isSelected: i === 0,
      hasPhotos: false // 这个可以后续通过检查是否有照片来设置
    });
  }
  
  photoComparisonDates.value = dates;
};

// 选择照片对比日期
const selectPhotoDate = (date: Date) => {
  selectedPhotoDate.value = date;
  
  // 更新选中状态
  photoComparisonDates.value.forEach(item => {
    item.isSelected = item.date.getTime() === date.getTime();
  });
  
  // 获取该日期的照片
  fetchSelfieHistory(userInfo.userId, date);
  
  // 计算滚动位置
  calculatePhotoScrollPosition();
};

// 格式化照片对比的显示行
const getPhotoRows = computed(() => {
  const rows: string[][] = [];
  const photos = selfiePhotos.value;
  
  if (photos.length === 0) {
    return rows;
  }
  
  if (photos.length === 1) {
    // 只有一张图片时居中显示
    rows.push(photos);
  } else {
    // 多张图片时每行最多3张
    for (let i = 0; i < photos.length; i += 3) {
      rows.push(photos.slice(i, i + 3));
    }
  }
  
  return rows;
});

// 导航到照片对比的前一天
const navigatePrevPhotoDay = () => {
  const newDate = new Date(selectedPhotoDate.value);
  newDate.setDate(newDate.getDate() - 1);
  const oldMonth = selectedPhotoDate.value.getMonth();
  const newMonth = newDate.getMonth();
  
  selectedPhotoDate.value = newDate;
  
  // 如果跨月了，重新生成日历
  if (oldMonth !== newMonth) {
    generatePhotoCalendarDays();
  } else {
    // 在同一个月内，只需要更新索引
    const index = photoCalendarDays.value.findIndex(day => 
      day.date.getDate() === newDate.getDate()
    );
    
    if (index >= 0) {
      selectedPhotoDayIndex.value = index;
    }
  }
  
  fetchSelfieHistory(userInfo.userId, newDate);
  calculatePhotoScrollPosition();
};

// 导航到照片对比的后一天
const navigateNextPhotoDay = () => {
  const newDate = new Date(selectedPhotoDate.value);
  newDate.setDate(newDate.getDate() + 1);
  const oldMonth = selectedPhotoDate.value.getMonth();
  const newMonth = newDate.getMonth();
  
  selectedPhotoDate.value = newDate;
  
  // 如果跨月了，重新生成日历
  if (oldMonth !== newMonth) {
    generatePhotoCalendarDays();
  } else {
    // 在同一个月内，只需要更新索引
    const index = photoCalendarDays.value.findIndex(day => 
      day.date.getDate() === newDate.getDate()
    );
    
    if (index >= 0) {
      selectedPhotoDayIndex.value = index;
    }
  }
  
  fetchSelfieHistory(userInfo.userId, newDate);
  calculatePhotoScrollPosition();
};

// 计算照片对比日历的滚动位置
const calculatePhotoScrollPosition = () => {
  try {
    nextTick(() => {
      const currentDayIndex = photoCalendarDays.value.findIndex(day => isSelectedPhotoDay(day.date));
      if (currentDayIndex >= 0) {
        photoCalendarScrollPosition.value = currentDayIndex * 60 - 100;
        photoCalendarScrollPosition.value = Math.max(0, photoCalendarScrollPosition.value);
      }
    });
  } catch (error) {
    console.error('计算照片对比滚动位置失败:', error);
    photoCalendarScrollPosition.value = 0;
  }
};

// 生成照片对比日历数据
const generatePhotoCalendarDays = () => {
  const days: PhotoCalendarDay[] = [];
  // 使用选中日期的年月，而不是当前日期
  const selectedYear = selectedPhotoDate.value.getFullYear();
  const selectedMonth = selectedPhotoDate.value.getMonth();
  const currentDate = new Date();
  
  // 获取选中月份的第一天和最后一天
  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0);
  
  for (let i = 1; i <= endDate.getDate(); i++) {
    const date = new Date(selectedYear, selectedMonth, i);
    const isToday = date.getDate() === currentDate.getDate() && 
                   date.getMonth() === currentDate.getMonth() && 
                   date.getFullYear() === currentDate.getFullYear();
    
    days.push({
      date: date,
      dayNumber: i,
      isToday: isToday
    });
  }
  
  photoCalendarDays.value = days;
  
  // 找到当前选中日期在新日历中的索引
  const selectedDayInCalendar = days.findIndex(day => 
    day.date.getDate() === selectedPhotoDate.value.getDate() &&
    day.date.getMonth() === selectedPhotoDate.value.getMonth() &&
    day.date.getFullYear() === selectedPhotoDate.value.getFullYear()
  );
  
  if (selectedDayInCalendar >= 0) {
    selectedPhotoDayIndex.value = selectedDayInCalendar;
  } else {
    // 如果选中的日期不在当前月份，选择第一天
    selectedPhotoDayIndex.value = 0;
    selectedPhotoDate.value = days[0].date;
  }
};

// 判断是否是选中的照片日期
const isSelectedPhotoDay = (date: Date) => {
  return date.getDate() === selectedPhotoDate.value.getDate() &&
         date.getMonth() === selectedPhotoDate.value.getMonth() &&
         date.getFullYear() === selectedPhotoDate.value.getFullYear();
};

// 选择照片日期
const selectPhotoDay = (index: number) => {
  selectedPhotoDayIndex.value = index;
  selectedPhotoDate.value = photoCalendarDays.value[index].date;
  fetchSelfieHistory(userInfo.userId, selectedPhotoDate.value);
  calculatePhotoScrollPosition();
};

// 皮肤分析相关状态
const dermaPhotoCalendarDays = ref<PhotoCalendarDay[]>([]);
const selectedDermaPhotoDate = ref<Date>(new Date());
const selectedDermaPhotoDayIndex = ref(0);
const dermaSelfiePhotos = ref<string[]>([]);
const isLoadingDermaPhotos = ref(false);
const dermaPhotoCalendarScrollPosition = ref(0);

// 生成皮肤分析日历
const generateDermaPhotoCalendarDays = () => {
  const days: PhotoCalendarDay[] = [];
  const selectedYear = selectedDermaPhotoDate.value.getFullYear();
  const selectedMonth = selectedDermaPhotoDate.value.getMonth();
  const currentDate = new Date();
  const endDate = new Date(selectedYear, selectedMonth + 1, 0);
  for (let i = 1; i <= endDate.getDate(); i++) {
    const date = new Date(selectedYear, selectedMonth, i);
    const isToday = date.getDate() === currentDate.getDate() && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
    days.push({ date, dayNumber: i, isToday });
  }
  dermaPhotoCalendarDays.value = days;
  const selectedDayInCalendar = days.findIndex(day => day.date.getDate() === selectedDermaPhotoDate.value.getDate() && day.date.getMonth() === selectedDermaPhotoDate.value.getMonth() && day.date.getFullYear() === selectedDermaPhotoDate.value.getFullYear());
  if (selectedDayInCalendar >= 0) {
    selectedDermaPhotoDayIndex.value = selectedDayInCalendar;
  } else {
    selectedDermaPhotoDayIndex.value = 0;
    selectedDermaPhotoDate.value = days[0].date;
  }
};

const isSelectedDermaPhotoDay = (date: Date) => {
  return date.getDate() === selectedDermaPhotoDate.value.getDate() && date.getMonth() === selectedDermaPhotoDate.value.getMonth() && date.getFullYear() === selectedDermaPhotoDate.value.getFullYear();
};

const selectDermaPhotoDay = (index: number) => {
  selectedDermaPhotoDayIndex.value = index;
  selectedDermaPhotoDate.value = dermaPhotoCalendarDays.value[index].date;
  fetchDermaHistory(userInfo.userId, selectedDermaPhotoDate.value);
  calculateDermaPhotoScrollPosition();
};

const navigatePrevDermaPhotoDay = () => {
  const newDate = new Date(selectedDermaPhotoDate.value);
  newDate.setDate(newDate.getDate() - 1);
  const oldMonth = selectedDermaPhotoDate.value.getMonth();
  const newMonth = newDate.getMonth();
  selectedDermaPhotoDate.value = newDate;
  if (oldMonth !== newMonth) {
    generateDermaPhotoCalendarDays();
  } else {
    const index = dermaPhotoCalendarDays.value.findIndex(day => day.date.getDate() === newDate.getDate());
    if (index >= 0) selectedDermaPhotoDayIndex.value = index;
  }
  fetchDermaHistory(userInfo.userId, newDate);
  calculateDermaPhotoScrollPosition();
};

const navigateNextDermaPhotoDay = () => {
  const newDate = new Date(selectedDermaPhotoDate.value);
  newDate.setDate(newDate.getDate() + 1);
  const oldMonth = selectedDermaPhotoDate.value.getMonth();
  const newMonth = newDate.getMonth();
  selectedDermaPhotoDate.value = newDate;
  if (oldMonth !== newMonth) {
    generateDermaPhotoCalendarDays();
  } else {
    const index = dermaPhotoCalendarDays.value.findIndex(day => day.date.getDate() === newDate.getDate());
    if (index >= 0) selectedDermaPhotoDayIndex.value = index;
  }
  fetchDermaHistory(userInfo.userId, newDate);
  calculateDermaPhotoScrollPosition();
};

const calculateDermaPhotoScrollPosition = () => {
  try {
    nextTick(() => {
      const currentDayIndex = dermaPhotoCalendarDays.value.findIndex(day => isSelectedDermaPhotoDay(day.date));
      if (currentDayIndex >= 0) {
        dermaPhotoCalendarScrollPosition.value = currentDayIndex * 60 - 100;
        dermaPhotoCalendarScrollPosition.value = Math.max(0, dermaPhotoCalendarScrollPosition.value);
      }
    });
  } catch (error) {
    dermaPhotoCalendarScrollPosition.value = 0;
  }
};

const fetchDermaHistory = async (userId: string, date: Date) => {
  try {
    isLoadingDermaPhotos.value = true;
    const dateStr = formatDateForApi(date);
    const response = await post('/analyse/history', { userId, dateStr });
    const res: any = response;
    if (res && res.originImgUrls) {
      dermaSelfiePhotos.value = res.originImgUrls;
    } else {
      dermaSelfiePhotos.value = [];
    }
  } catch (error) {
    dermaSelfiePhotos.value = [];
  } finally {
    isLoadingDermaPhotos.value = false;
  }
};

const getDermaPhotoRows = computed(() => {
  const rows: string[][] = [];
  const photos = dermaSelfiePhotos.value;
  if (photos.length === 0) return rows;
  if (photos.length === 1) {
    rows.push(photos);
  } else {
    for (let i = 0; i < photos.length; i += 3) {
      rows.push(photos.slice(i, i + 3));
    }
  }
  return rows;
});

// 计算趋势图日期标签的位置（与数据点对应）
const getTrendLabelPosition = (index: number) => {
  const width = 300; // 与canvas宽度保持一致
  const padding = 20; // 与canvas内边距保持一致
  
  if (trendData.value.length === 1) {
    // 如果只有一个数据点，标签居中显示
    return width / 2 - 20; // 减去标签宽度的一半进行居中
  } else {
    // 多个数据点时，与圆点位置对应
    return padding + (width - 2 * padding) * (index / (trendData.value.length - 1)) - 20;
  }
};

// 计算并设置趋势图表滚动位置，自动滚动到最新数据
const calculateTrendChartScrollPosition = () => {
  try {
    nextTick(() => {
      if (healthRecords.value.length > 0) {
        // 计算最后一个数据点的位置
        const lastDataIndex = healthRecords.value.length - 1;
        const pointX = getPointX(lastDataIndex);
        // 滚动到最新数据，减去一些偏移量以便看到完整的数据点
        trendChartScrollPosition.value = Math.max(0, pointX - 150);
      }
    });
  } catch (error) {
    console.error('计算趋势图表滚动位置失败:', error);
    trendChartScrollPosition.value = 0;
  }
};

// 查看图表详情
const viewChartDetails = (chartType: string) => {
  // ... existing code ...
  
  // 记录图表查看成就
  try {
    const tracker = getAchievementTracker();
    tracker.trackChartView();
    tracker.trackFeatureUsage('chart_view');
  } catch (error) {
    console.error('记录成就失败:', error);
  }
  
  // ... rest of the function ...
};

</script>

<style>
.analysis-container {
  min-height: 100vh;
  background-color: #fff;
  padding-bottom: 30px;
  width: 100%;
  overflow-x: hidden;
  position: relative;
}

/* 顶部状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
}

.time {
  font-weight: 600;
  font-size: 14px;
}

.status-icons {
  display: flex;
  gap: 5px;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
}

.header-title {
  font-size: 24px;
  font-weight: bold;
}

.header-actions {
  display: flex;
}

.records-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background-color: #f0e6ff;
}

/* 分数展示区域 */
.score-section {
  padding: 0 15px;
}

.score-container {
  display: flex;
  align-items: flex-end;
}

.score-number {
  font-size: 60px;
  font-weight: bold;
  line-height: 1;
}

.score-label {
  font-size: 18px;
  color: #666;
  margin-bottom: 10px;
  margin-left: 3px;
}

.score-info {
  display: flex;
  font-size: 12px;
  color: #666;
}

.score-date {
  margin-right: 4px;
}

.score-trend {
  color: #8b5cf6;
  margin-left: 4px;
}

/* 趋势图表 */
.trend-chart-container {
  padding: 15px;
  margin-top: 10px;
  overflow: hidden;
}

.trend-chart-scroll {
  width: 100%;
  height: 200px;
}

.trend-chart-wrapper {
  position: relative;
  height: 180px;
  min-width: 100%;
}

.chart-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.chart-background .chart-line {
  width: 100%;
  height: 1px;
  background-color: rgba(0,0,0,0.1);
}

.chart-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 20px;
  height: calc(100% - 20px);
  overflow: visible;
}

.line-connector {
  position: absolute;
  height: 2px;
  z-index: 1;
  transform-origin: 0 0;
}

.line-connector.scalp {
  background-color: #f43f5e;
}

.line-connector.follicle {
  background-color: #10b981;
}

.line-connector.hair {
  background-color: #8b5cf6;
}

.chart-point {
  position: absolute;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  margin-top: -6px;
  z-index: 3;
}

.point-dot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.chart-point.scalp .point-dot {
  background-color: #f43f5e;
}

.chart-point.follicle .point-dot {
  background-color: #10b981;
}

.chart-point.hair .point-dot {
  background-color: #8b5cf6;
}

.chart-dates {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  white-space: nowrap;
  overflow: visible;
}

.chart-date {
  position: absolute;
  transform: translateX(-50%);
  text-align: center;
  width: 40px;
  margin-top: 5px;
}

.date-label {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  display: block;
  text-align: center;
}

/* 图表图例 */
.chart-legend {
  display: flex;
  padding: 0 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-right: 15px;
  margin-bottom: 5px;
}

.legend-color {
  width: 10px;
  height: 10px;
  margin-right: 5px;
  border-radius: 2px;
}

.legend-color.hair {
  background-color: #8b5cf6;
}

.legend-color.scalp-oil {
  background-color: #f43f5e;
}

.legend-color.scalp-sensitive {
  background-color: #10b981;
}

.legend-text {
  font-size: 12px;
  color: #666;
}

/* 产品推荐 */
.product-recommendations {
  margin: 30px 15px;
}

/* 通用标题样式 */
.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 15px;
  display: block;  /* 确保文本元素也能应用margin */
}

.product-list {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: 15px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}

.product-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

.product-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20px;
  width: 70px;
}

.product-image {
  width: 50px;
  height: 70px;
  margin-bottom: 5px;
}

.product-name {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.track-button {
  background-color: #8b5cf6;
  color: #fff;
  padding: 10px;
  border-radius: 5px;
  text-align: center;
  margin-top: 10px;
}

.button-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

/* 日常打卡 */
.daily-clock-in-section {
  margin: 20px 15px;
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.popup-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  flex: 1;
  text-align: center;
}

.date-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
}

.nav-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
}

.current-date {
  padding: 0 15px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.calendar-scroll {
  padding: 10px 0;
  background-color: #f8f8f8;
  white-space: nowrap;
  margin-bottom: 15px;
}

.calendar-days {
  display: flex;
  padding: 0 10px;
}

.day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  min-width: 50px;
  max-width: 50px;
  height: 50px;
  min-height: 50px;
  max-height: 50px;
  margin-right: 10px;
  border-radius: 5px;
  background-color: #fff;
  box-sizing: border-box;
}

.day-item.active {
  background-color: #8b5cf6;
}

.day-number {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.day-item.active .day-number {
  color: #fff;
}

.filter-buttons {
  display: flex;
  padding: 5px 0;
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: 15px;
}

.filter-button {
  padding: 6px 12px;
  margin-right: 8px;
  border-radius: 20px;
  background-color: #f5f5f5;
  min-width: max-content;
  white-space: nowrap;
}

.filter-button.active {
  background-color: #8b5cf6;
}

.filter-button text {
  font-size: 14px;
  color: #666;
}

.filter-button.active text {
  color: #fff;
}

.popup-product-list {
  max-height: 40vh;
  overflow-y: auto;
}

.popup-product-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  width: 100%;
}

.popup-product-item.clocked-in {
  background-color: rgba(139, 92, 246, 0.05);
  border-radius: 8px;
}

.popup-product-image {
  width: 35px;
  height: 70px;
  margin-right: 10px;
}

.popup-product-info {
  flex: 1;
  padding-right: 10px;
}

.popup-product-name {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.popup-clock-button {
  min-width: 90px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #8b5cf6;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.popup-clock-button.checked {
  background-color: #4ade80;
  border-radius: 18px;
  animation: checkAnimation 0.5s ease;
}

@keyframes checkAnimation {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.popup-clock-button.disabled {
  opacity: 0.5;
  background-color: #ccc;
  cursor: not-allowed;
}

.popup-button-text {
  font-size: 14px;
  color: #fff;
}

.popup-check-icon {
  font-size: 18px;
  color: #fff;
}

/* 数据分析选项卡 */
.data-analytics-section {
  padding: 20px 15px;
  background-color: #f8f8f8;
  margin-top: 20px;
}

.tabs {
  display: flex;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
}

.tab.active {
  background-color: #8b5cf6;
}

.tab-text {
  font-size: 14px;
  color: #666;
}

.tab.active .tab-text {
  color: #fff;
}

/* 照片对比区域 */
.photo-comparison {
  padding: 15px;
  background-color: #f8f8f8;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.comparison-title {
  font-size: 16px;
  font-weight: 500;
}

.comparison-arrow {
  font-size: 14px;
  color: #666;
}

.comparison-images {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.photo-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
  gap: 10px;
  width: 100%;
}

.photo-row.single-photo {
  justify-content: center;
  align-items: center;
}

.comparison-image {
  width: calc(33.33% - 7px);
  margin-bottom: 10px;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}

.comparison-image.single {
  width: 180px;
  max-width: 70%;
  margin: 0 auto;
}

.selfie-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
}

.image-label {
  position: absolute;
  bottom: 5px;
  left: 5px;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 0 3px rgba(0,0,0,0.7);
}

/* 数据标签行 */
.data-labels {
  display: flex;
  padding: 15px;
  background-color: #f8f8f8;
  overflow-x: auto;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}

.data-labels::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

.data-label-item {
  padding: 5px 15px;
  background-color: #fff;
  border-radius: 15px;
  white-space: nowrap;
}

.data-label-item.normal {
  background-color: #8b5cf6;
}

.data-label-item.normal .label-text {
  color: #fff;
}

.label-text {
  font-size: 12px;
  color: #666;
}

/* 产品使用频率 */
.product-usage-section {
  padding: 20px 15px;
  background-color: #f8f8f8;
}

.product-usage-items {
  display: flex;
  justify-content: space-between;
}

.product-usage-item {
  width: 18%;
  background-color: #fff;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

.usage-product-image {
  width: 30px;
  height: 45px;
}

/* AI分析建议 */
.ai-suggestion {
  margin: 20px 15px;
  background-color: #f0f0ff;
  border-radius: 10px;
  padding: 15px;
}

.ai-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.ai-icon {
  width: 24px;
  height: 24px;
  background-color: #8b5cf6;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
}

.ai-icon text {
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.ai-title {
  font-size: 16px;
  font-weight: 500;
  color: #8b5cf6;
}

.ai-content {
  padding-left: 0;
}

/* 扫描提示样式 */
.scan-reminder-scroll {
  width: 100%;
  white-space: nowrap;
}

.scan-reminder-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
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

/* 趋势分析区 */
.trend-analytics {
  padding: 20px 15px;
  background-color: #f8f8f8;
}

.trend-chart-box {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  height: 200px;
  position: relative;
}

.trend-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.trend-chart {
  width: 100%;
  height: 100%;
  position: relative;
}

.trend-canvas {
  width: 300px;
  height: 150px;
}

.trend-labels {
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 20px;
}

.trend-label {
  position: absolute;
  transform: translateX(-50%);
}

.trend-date {
  font-size: 10px;
  color: #666;
}

/* 头皮分析区 */
.scalp-analytics {
  padding: 20px 15px;
  background-color: #f8f8f8;
}

.scalp-score {
  background-color: #f0f0ff;
  border-radius: 10px;
  padding: 15px;
}

.scalp-metric {
  margin-bottom: 15px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.metric-header {
  flex: 1;
}

.metric-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
}

.metric-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.metric-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.metric-desc {
  font-size: 13px;
  color: #666;
  margin-left: 5px;
}

.metric-trend {
  margin-left: 10px;
}

.trend-up {
  color: #f43f5e;
  font-weight: bold;
}

.trend-down {
  color: #10b981;
  font-weight: bold;
}

.metric-arrow {
  margin-left: auto;
  color: #8b5cf6;
  font-weight: 600;
}

/* 产品评测 */
.product-evaluation {
  margin-top: 20px;
  padding: 20px 15px;
  background-color: #f8f8f8;
}

.evaluation-content {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
}

.evaluation-text {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

/* 为特定的数据分析部分添加额外的样式 */
.data-analytics-section .section-title {
  font-size: 20px;
  font-weight: bold;
}

.tab-content {
  margin-top: 10px;
}

.derma-content {
  padding: 15px;
  background-color: #f8f8f8;
}

.derma-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.derma-info {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
}

.derma-text {
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

/* Additional styles for the popup product list */
.popup-clock-button.disabled {
  opacity: 0.5;
  background-color: #ccc;
  cursor: not-allowed;
}

.no-records-message {
  padding: 20px;
  text-align: center;
  color: #666;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
}

.no-photos-message {
  padding: 20px;
  text-align: center;
  color: #666;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
}

.loading-photos {
  padding: 20px;
  text-align: center;
  color: #666;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
}

.date-picker.small {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-bottom: 15px;
}

.date-picker.small .date-item {
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #f5f5f5;
  min-width: 40px;
  text-align: center;
}

.date-picker.small .date-item.active {
  background-color: #8b5cf6;
}

.date-picker.small .date-item .date-number.active {
  color: #fff;
}
</style> 