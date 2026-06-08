<template>
  <view class="report-container">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="back-icon" @tap="goBack">
        <text class="back-arrow">&#8592;</text>
      </view>
      <view class="title">Test Report</view>
      <view class="share-icon" @tap="goToPassport">
        <text class="share-dots">&#8942;</text>
      </view>
    </view>

    <!-- 得分提升提示 -->
    <view class="score-improvement" v-if="scoreImprovement > 0">
      <text class="improvement-text">Your score has improved</text>
      <text class="points-text">by {{ scoreImprovement }} points!</text>
    </view>

    <!-- 总体评分 -->
    <view class="total-score">
      <text class="score-number">{{ Math.round(detailData.scalpScore || 0) }}</text>
      <text class="score-denominator">/ 100</text>
    </view>

    <!-- 趋势图表 -->
    <view class="trend-chart-container">
      <scroll-view scroll-x="true" class="trend-chart-scroll">
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
        <text class="legend-text">Hair</text>
      </view>
      <view class="legend-item">
        <view class="legend-color scalp"></view>
        <text class="legend-text">Scalp</text>
      </view>
      <view class="legend-item">
        <view class="legend-color follicle"></view>
        <text class="legend-text">Follicle</text>
      </view>
    </view>

    <!-- 产品推荐 -->
    <view class="product-recommendations">
      <view class="section-title">
        <text>Picks for You</text>
      </view>
      <view class="section-subtitle">
        <text>click to pick different product for each step</text>
      </view>
      <scroll-view class="product-list" scroll-x="true" show-scrollbar="false">
        <view class="product-item" v-for="(product, index) in products" :key="index">
          <image class="product-image" :src="product.image" mode="aspectFit"></image>
          <text class="product-name">{{product.name}}</text>
        </view>
      </scroll-view>
      
      <view class="product-button" @tap="openClockInPopup">
        <text>{{ $t('common.dailyCheckIn') }}</text>
      </view>
    </view>

    <!-- 健康摘要 -->
    <view class="health-summary">
      <view class="summary-header">
        <view class="summary-icon">
          <TablerIcon name="chart-bar" :size="18" color="#6b21c8" />
        </view>
        <text class="summary-title">Hair Health Summary</text>
        <!-- <view class="summary-toggle">
          <text>+</text>
        </view> -->
      </view>
      
      <view class="summary-content">
        <text class="summary-text">
          {{ getSmartSummaryText() }}
        </text>
      </view>
      
      <view class="chat-button" @tap="chatWithAssistant">
        <text>Chat with Your AI Hair Care Assistant</text>
      </view>
    </view>

    <!-- 指标数据 -->
    <view class="metrics-section">  
      <!-- 雷达图 -->
      <view class="metrics-title">
        <text>Metrics</text>
      </view>
      <view class="radar-chart-section">
        <view class="radar-chart">
          <!-- 标签容器 - 放在SVG前面确保它们在底层 -->
          <view class="radar-label follicle-label">
            <text class="label-text">Follicle</text>
          </view>
          <view class="radar-label oil-label">
            <text class="label-text">Oil</text>
          </view>
          <view class="radar-label scurf-label">
            <text class="label-text">Keratin</text>
          </view>
          <view class="radar-label hair-label">
            <text class="label-text">Hair</text>
          </view>
          <view class="radar-label sensitivity-label">
            <text class="label-text">Sensitivity</text>
          </view>
          <view class="radar-label hair-texture-label">
            <text class="label-text">Hair Thickness</text>
          </view>
          
          <!-- SVG图表 -->
          <svg width="100%" height="100%" viewBox="-20 -20 240 240">
            <!-- 背景圆 -->
            <circle cx="100" cy="100" r="90" fill="#f8f8f8" stroke="#e6e6fa" stroke-width="2" />
            
            <!-- 外层六边形（黄色部分，由问卷数据动态生成） -->
            <path :d="getRadarChartPath(true)" fill="rgba(255, 235, 59, 0.3)" />
            
            <!-- 内层六边形（紫色部分，固定形状） -->
            <path :d="getRadarChartPath(false)" fill="rgba(139, 92, 246, 0.5)" stroke="#8b5cf6" stroke-width="1" />
            
            <!-- 中心点 -->
            <circle cx="100" cy="100" r="3" fill="#8b5cf6" />
            
            <!-- 轴线 -->
            <line x1="100" y1="100" x2="100" y2="10" stroke="#ddd" stroke-width="1" />
            <line x1="100" y1="100" x2="177.94" y2="75" stroke="#ddd" stroke-width="1" />
            <line x1="100" y1="100" x2="177.94" y2="125" stroke="#ddd" stroke-width="1" />
            <line x1="100" y1="100" x2="100" y2="190" stroke="#ddd" stroke-width="1" />
            <line x1="100" y1="100" x2="22.06" y2="125" stroke="#ddd" stroke-width="1" />
            <line x1="100" y1="100" x2="22.06" y2="75" stroke="#ddd" stroke-width="1" />
            
            <!-- 外层小圆点 -->
            <circle cx="100" cy="10" r="3" fill="#fff" stroke="#8b5cf6" stroke-width="1" />
            <circle cx="177.94" cy="75" r="3" fill="#fff" stroke="#8b5cf6" stroke-width="1" />
            <circle cx="177.94" cy="125" r="3" fill="#fff" stroke="#8b5cf6" stroke-width="1" />
            <circle cx="100" cy="190" r="3" fill="#fff" stroke="#8b5cf6" stroke-width="1" />
            <circle cx="22.06" cy="125" r="3" fill="#fff" stroke="#8b5cf6" stroke-width="1" />
            <circle cx="22.06" cy="75" r="3" fill="#fff" stroke="#8b5cf6" stroke-width="1" />
          </svg>
        </view>
      </view>
      
      <!-- 详细数据入口 -->
      <view class="view-details">
      </view>
      <view class="metrics-title">
        <text>Click to View Details</text>
      </view>

      <ScoreDetails :detail-data="detailData"/>

      <!-- 头部位置 -->
      <view class="position-section">
        <text class="position-title">Position</text>
        <view class="position-map">
          <view class="position-container">
            <!-- 左侧正面图 -->
            <view class="position-head-container">
              <image src="/static/images/position_female1.png" mode="aspectFit" class="position-head-image"></image>
              
              <!-- 紫色点标记 -->
              <view class="position-dot right-forehead-dot"></view>
              <view class="position-dot mid-forehead-dot"></view>
              <view class="position-dot left-forehead-dot"></view>
              
              <!-- 标签 - 右前额 -->
              <view class="position-label right-forehead-label">
                <text class="position-label-text">Right-forehead</text>
                <view class="position-label-tag" v-if="getLevel1DataForPosition('2')">
                  <text>{{ getLevel1DataForPosition('2') }}</text>
                </view>
              </view>
              
              <!-- 标签 - 左前额 -->
              <view class="position-label left-forehead-label">
                <text class="position-label-text">Left-forehead</text>
                <view class="position-label-tag" v-if="getLevel1DataForPosition('1')">
                  <text>{{ getLevel1DataForPosition('1') }}</text>
                </view>
              </view>
              
              <!-- 标签 - 中部前额 -->
              <view class="position-label mid-forehead-label">
                <text class="position-label-text">Mid-forehead</text>
                <view class="position-label-tag" v-if="getLevel1DataForPosition('3')">
                  <text>{{ getLevel1DataForPosition('3') }}</text>
                </view>
              </view>
              
              <!-- 虚线 -->
              <view class="position-dashed-line right-forehead-line"></view>
              <view class="position-dashed-line left-forehead-line"></view>
              <view class="position-dashed-line mid-forehead-line"></view>
            </view>
            
            <!-- 右侧侧面图 -->
            <view class="position-head-container">
              <image src="/static/images/position_female2.png" mode="aspectFit" class="position-head-image"></image>
              
              <!-- 紫色点标记 -->
              <view class="position-dot top-head-dot"></view>
              <view class="position-dot back-head-dot"></view>
              <view class="position-dot temples-dot"></view>
              
              <!-- 标签 - 头顶 -->
              <view class="position-label top-head-label">
                <text class="position-label-text">Top-head</text>
                <view class="position-label-tag" v-if="getLevel1DataForPosition('4')">
                  <text>{{ getLevel1DataForPosition('4') }}</text>
                </view>
              </view>
              
              <!-- 标签 - 后脑勺 -->
              <view class="position-label back-head-label">
                <text class="position-label-text">Back-head</text>
                <view class="position-label-tag" v-if="getLevel1DataForPosition('5')">
                  <text>{{ getLevel1DataForPosition('5') }}</text>
                </view>
              </view>
              
              <!-- 标签 - 太阳穴 -->
              <view class="position-label temples-label">
                <text class="position-label-text">Temples</text>
                <view class="position-label-tag" v-if="getLevel1DataForPosition('6')">
                  <text>{{ getLevel1DataForPosition('6') }}</text>
                </view>
              </view>
              
              <!-- 虚线 -->
              <view class="position-dashed-line top-head-line"></view>
              <view class="position-dashed-line back-head-line"></view>
              <view class="position-dashed-line temples-line"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 预测结果 -->
      <view class="projection-section">
        <text class="projection-title">Progress</text>
        <text class="projection-subtitle">If the look is not improved by care, in the long run, there may be a risk of baldness in the future, as shown below</text>
        
        <view class="comparison-images">
          <view class="comparison-image">
            <view class="comparison-image-container">
              <image :src="latestImageUrl" mode="aspectFit"></image>
            </view>
            <text class="comparison-label">Now</text>
          </view>
          <view class="comparison-image">
            <view class="comparison-image-container">
              <image :src="lastImageUrl" mode="aspectFit"></image>
            </view>
            <text class="comparison-label before">Before</text>
          </view>
        </view>
      </view>

      <!-- 进展情况 -->
      <!-- <view class="progress-section">
        <text class="progress-title">Condition</text>
        <text class="progress-subtitle">If the look is not improved by care, in the long run, there may be a risk of baldness in the future, as shown below</text>
        
        <view class="comparison-images">
          <view class="comparison-image">
            <view class="comparison-image-container">
              <image src="/static/trichoscan/sensitivity.jpg" mode="aspectFit"></image>
            </view>
            <text class="comparison-label">your sensitivity</text>
          </view>
          <view class="comparison-image">
            <view class="comparison-image-container">
              <image src="/static/trichoscan/scalp.jpg" mode="aspectFit"></image>
            </view>
            <text class="comparison-label sensitive">sensitive scalp ref.</text>
          </view>
        </view>
      </view> -->
    </view>

    <!-- 打卡弹窗 -->
    <ClockInPopup 
      :visible="showClockInPopup" 
      @update:visible="showClockInPopup = $event"
      :initial-products="products"
      @clock-in-updated="handleClockInUpdated"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { getAchievementTracker } from '@/utils/achievementTracker';
import ScoreDetails from '@/components/ScoreDetails.vue';
import ClockInPopup from '@/components/ClockInPopup.vue';
import env from '@/utils/env';

const { t } = useI18n();

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function
};

// 接口定义
interface ApiResponse {
  success?: boolean;
  data?: any;
  errMessage?: string;
  errCode?: string | number;
  [key: string]: any;
}

interface HealthRecord {
  scalp: string;
  follicle: string;
  hair: string;
  scalpScore: string;
  createTime: string;
}

// 图像摘要接口定义
interface ImageSummary {
  latestImageUrl: string;
  lastImageUrl: string;
  precede?: number;
  ratio?: number;
}

interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
}

interface RecommendedProduct {
  productId: number;
  productTitle: string;
  type: string;
  productUrl: string;
}

const userStore = useUserStore();
const { userInfo } = userStore;
const detailData = ref<any>(null);
const loading = ref(false);
const recordId = ref<string | null>(null);
const healthRecords = ref<HealthRecord[]>([]);
const activeMetric = ref<string | null>(null);
const latestImageUrl = ref<string>('/static/trichoscan/now.jpg'); // 默认图像
const lastImageUrl = ref<string>('/static/trichoscan/before.jpg'); // 默认图像
const products = ref<ProductItem[]>([
  {
    id: '1',
    name: 'Pre-Wash',
    type: 'pre-wash',
    image: '/static/trichoscan/pre-wash.png'
  },
  {
    id: '2',
    name: 'Shampoo',
    type: 'shampoo',
    image: '/static/trichoscan/shampoo.png'
  },
  {
    id: '3',
    name: 'Conditioner',
    type: 'conditioner',
    image: '/static/trichoscan/conditioner.png'
  },
  {
    id: '4',
    name: 'Serum',
    type: 'serum',
    image: '/static/trichoscan/serum.png'
  },
  {
    id: '5',
    name: 'Hair Mask',
    type: 'hair-mask',
    image: '/static/trichoscan/hair-mask.png'
  }
]);

const pushType = ref('0');

// 计算分数提升值
const scoreImprovement = computed(() => {
  if (!detailData.value) return 0;
  
  const currentScore = detailData.value.scalpScore;
  const lastScore = detailData.value.lastScalpScore;
  
  // 如果lastScalpScore无值或当前分数不大于上次分数，则返回0
  if (lastScore === undefined || lastScore === null || currentScore <= lastScore) {
    return 0;
  }
  
  // 计算差值并取整数
  return Math.floor(currentScore - lastScore);
});

// 打卡弹窗相关状态
const showClockInPopup = ref(false);

// 显示打卡弹窗
const openClockInPopup = () => {
  showClockInPopup.value = true;
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

// 切换指标详情显示
const toggleMetricDetail = (metric: string) => {
  if (activeMetric.value === metric) {
    // 如果点击的是当前显示的指标，则关闭详情
    activeMetric.value = null;
  } else {
    // 否则显示该指标的详情
    activeMetric.value = metric;
  }
};

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
      };
      // FINASTERIDE 暂不处理

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

      const displayOrder = ['pre-wash', 'shampoo', 'conditioner', 'serum', 'hair-mask'];
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
      // 使用默认产品数据
      products.value = [
        {
          id: '1',
          name: t('analysis.prewash'),
          type: 'pre-wash',
          image: '/static/analysis/prewash.png'
        },
        {
          id: '2',
          name: t('analysis.shampoo'),
          type: 'shampoo',
          image: '/static/analysis/shampoo.png'
        },
        {
          id: '3',
          name: t('analysis.conditioner'),
          type: 'conditioner',
          image: '/static/analysis/conditioner.png'
        },
        {
          id: '4',
          name: t('analysis.serum'),
          type: 'serum',
          image: '/static/analysis/serum.png'
        },
        {
          id: '5',
          name: t('analysis.hairMask'),
          type: 'hair-mask',
          image: '/static/analysis/mask.png'
        }
      ];
    }
  } catch (error) {
    console.error('获取产品推荐失败:', error);
    // 使用默认产品数据
    products.value = [
      {
        id: '1',
        name: t('analysis.prewash'),
        type: 'pre-wash',
        image: '/static/analysis/prewash.png'
      },
      {
        id: '2',
        name: t('analysis.shampoo'),
        type: 'shampoo',
        image: '/static/analysis/shampoo.png'
      },
      {
        id: '3',
        name: t('analysis.conditioner'),
        type: 'conditioner',
        image: '/static/analysis/conditioner.png'
      },
      {
        id: '4',
        name: t('analysis.serum'),
        type: 'serum',
        image: '/static/analysis/serum.png'
      },
      {
        id: '5',
        name: t('analysis.hairMask'),
        type: 'hair-mask',
        image: '/static/analysis/mask.png'
      }
    ];
  }
};

// 获取summary文本内容（多语言组合逻辑）
const getSmartSummaryText = () => {
  const oil = detailData.value.scalp_oil_area_score_map.grade;
  const scurfOrKeratin = detailData.value.scurf_area_score_map.grade;
  const hairLoss = detailData.value.follicle_score_map.grade;
  const discomfort = detailData.value.redness_area_score_map.grade;
  let result = '';
  if (oil == '偏高') {
    result += t('scan.oil');
  }
  if (scurfOrKeratin == '偏高') {
    if (result) result += '\n';
    result += t('scan.scurf');
  }
  if (hairLoss == '偏低') {
    if (result) result += '\n';
    result += t('scan.density');
  }
  if (discomfort == '偏高') {
    if (result) result += '\n';
    result += t('scan.redness');
  }
  if (!result) {
    return 'Please continue to maintain good hair care habits.';
  }
  return result;
};

// 与AI助手聊天
const chatWithAssistant = () => {
  if (pushType.value === '1') {
    uni.switchTab({
      url: '/pages/consult/new'
    });
    return;
  }
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.chatWithAssistant.postMessage({data: 'chatWithAssistant'});
  } else {
    window.android.chatWithAssistant(JSON.stringify({data: 'chatWithAssistant'}));
  }
};

// 生成雷达图路径
const getRadarChartPath = (isOuterPath: boolean) => {
  // 六个指标的顺序：Follicle, Oil, Scurf, Hair, Sensitivity, Hair texture
  // 中心点坐标
  const centerX = 100;
  const centerY = 100;
  
  // 基础半径（内层紫色六边形）
  const baseRadius = 50;
  
  // 最大半径（外层黄色六边形的最大可能值）
  const maxRadius = 90;
  
  // 计算每个点的半径和角度
  const points = [];
  
  for (let i = 0; i < 6; i++) {
    // 角度（从上方开始，顺时针）
    const angle = Math.PI * 2 * (i / 6) - Math.PI / 2;
    
    let radius;
    if (isOuterPath) {
      // 外层路径，根据问卷数据计算半径
      let value = 0;
      
      switch (i) {
        case 0: // Follicle - 使用stage
          value = detailData.value.follicle_score_map.score / 3; // stage范围1-7
          break;
        case 1: // Oil
          value = detailData.value.scalp_oil_area_score_map.score / 15; // 假设oil范围0-2
          break;
        case 2: // Scurf
          value = detailData.value.scurf_area_score_map.score / 15; // 假设scurf范围0-2
          break;
        case 3: // Hair
          value = detailData.value.follicle_score_map.score / 3; // 假设hairLoss范围0-2
          break;
        case 4: // Sensitivity
          value = detailData.value.redness_area_score_map.score / 15; // 假设discomfort范围0-2
          break;
        case 5: // Hair texture
          value = detailData.value.hair_texture_score_map.score / 40; // 假设overall范围0-2
          break;
      }
      
      // 确保值在0-1范围内
      value = Math.max(0, Math.min(1, value));
      
      // 计算半径：内层半径 + 额外的半径（基于问卷数据）
      radius = baseRadius + (maxRadius - baseRadius) * value;
    } else {
      // 内层路径，使用固定半径
      radius = baseRadius;
    }
    
    // 计算点的坐标
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    points.push({ x, y });
  }
  
  // 构建SVG路径
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  path += ' Z'; // 闭合路径
  
  return path;
};

// 跳转到护照分享页
const goToPassport = () => {
  // 获取最新的健康记录数据
  let scalpHealth = '';
  let follicleHealth = '';
  let hairHealth = '';
  
  // 如果有健康记录数据，取最后一条（最新）记录的值
  if (healthRecords.value && healthRecords.value.length > 0) {
    const latestRecord = healthRecords.value[healthRecords.value.length - 1];
    scalpHealth = latestRecord.scalp || '0';
    follicleHealth = latestRecord.follicle || '0';
    hairHealth = latestRecord.hair || '0';
  }
  
  // 使用URL参数传递健康数据
  uni.navigateTo({
    url: `/pages/share/passport?scalpHealth=${scalpHealth}&follicleHealth=${follicleHealth}&hairHealth=${hairHealth}`
  });
  
  // 记录功能使用
  try {
    // 如果有全局追踪器可以在这里添加
    console.log('用户点击分享护照');
  } catch (error) {
    console.error('记录功能使用失败:', error);
  }
};

// 返回上一页
const goBack = () => {
  if (pushType.value === '1') {
    uni.navigateBack({
      delta: 1
    });
    return;
  } 
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.goBack.postMessage({data: 'goBack'});
  } else {
    window.android.goBack(JSON.stringify({data: 'goBack'}));
  }
  // uni.navigateBack({
  //   delta: 1
  // });
};

// 跳转到分析页面
const goToAnalysis = () => {
  uni.navigateTo({
    url: '/pages/analysis/index'
  });
};

// 跳转到手机拍照分析页面
const goToPhoneCamAnalysis = () => {
  uni.navigateTo({
    url: '/pages/trichoscan/phone-cam-analysis'
  });
};

// 自定义请求函数
// Custom request function
const customPost = async (url: string, data: any, options?: { timeout?: number }): Promise<ApiResponse> => {
  try {
    // 使用统一的API配置系统
    // Use unified API configuration system
    const { apiRequest } = await import('@/utils/apiHelper');
    return await apiRequest.api(url, data, options);
  } catch (error) {
    console.error('Request error:', error);
    throw error;
  }
};

// 获取详细数据
// Fetch detail data
const fetchDetailData = async () => {
  if (!recordId.value) {
    console.error('Record ID is missing');
    return;
  }
  
  loading.value = true;
  try {
    // const response = await customPost('/analyse/detail', {
    //   id: recordId.value,
    //   userId: userStore.userInfo.userId
    // });

    // 设置超时时间为30秒 Set timeout to 30 seconds
    const response = await customPost('analyse/goHis', {
      recordId: recordId.value,
      userId: userStore.userInfo.userId,
    }, { timeout: 30000 });
    
    console.log('Detail data:', response);
    
    if (response && response.success && response.data) {
      detailData.value = response.data;
      // 更新UI显示
      updateUIWithData(response.data);
      
      // 获取健康记录数据用于趋势图表
      fetchHealthRecords();
    } else {
      uni.showToast({
        title: response?.errMessage || '获取详情失败',
        icon: 'none',
        duration: 2000
      });
    }
  } catch (error) {
    console.error('Failed to fetch detail data:', error);
    uni.showToast({
      title: '获取详情失败',
      icon: 'none',
      duration: 2000
    });
  } finally {
    loading.value = false;
  }
};

// 更新UI显示
const updateUIWithData = (data: any) => {
  // TODO: 根据接口返回数据更新UI显示
  // 这里可以根据实际接口返回的数据结构来更新页面上的各个部分
  console.log('Updating UI with data:', data);
};

// 格式化日期（短）
const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // 更简短的日期格式
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 获取图表点的X坐标（像素）
const getPointX = (index: number) => {
  const pointSpacing = 80; // 点之间的间距
  return index * pointSpacing + 20; // 20px为左边距
};

// 获取点的Y坐标（从上到下）- 使用固定像素值
const getPointTopPosition = (value: string) => {
  // 确保分数是整数
  const score = parseInt(value) || 0;
  const maxScore = 100; // 最高分数
  const minScore = 0;  // 最低分数
  const chartHeight = 160; // 图表总高度
  const usableHeight = chartHeight - 40; // 减去上下边距
  // 计算从顶部开始的位置（分数越高，位置越靠上）
  const position = Math.floor(chartHeight - ((score - minScore) / (maxScore - minScore)) * usableHeight - 20);
  return position;
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

// 获取健康记录数据
const fetchHealthRecords = async () => {
  try {
    const userId = userStore.userInfo.userId;
    if (!userId) {
      console.error('用户ID不可用，无法获取健康记录');
      return;
    }
    
    const response = await post('user/getDetectionRecordList', { userId });
    console.log('健康记录API响应:', response);
    
    // 确保response有正确的结构
    const responseData = response as any;
    
    if (responseData && responseData.list && Array.isArray(responseData.list) && responseData.list.length > 0) {
      // 确保数据格式正确
      const formattedRecords = responseData.list.map((record: any) => ({
        scalp: record.scalp || "0",
        follicle: record.follicle || "0",
        hair: record.hair || "0",
        scalpScore: record.scalpScore || "0",
        createTime: record.createTime || new Date().toISOString()
      }));
      
      // 按日期排序（从早到晚）
      formattedRecords.sort((a: any, b: any) => {
        return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
      });
      
      healthRecords.value = formattedRecords;
      console.log('处理后的健康记录数据:', healthRecords.value);
    } else {
      console.log('没有健康记录数据或格式不正确');
    }
  } catch (error) {
    console.error('获取健康记录失败:', error);
  }
};

// 获取图像摘要数据
const fetchImageSummary = async () => {
  try {
    const userId = userStore.userInfo.userId;
    if (!userId) {
      console.error('用户ID不可用，无法获取图像摘要数据');
      return;
    }
    
    const response = await post('analyse/latest/summary', { userId }) as ImageSummary;
    console.log('图像摘要数据:', response);
    
    if (response) {
      // 更新图像URL
      if (response.latestImageUrl) {
        latestImageUrl.value = response.latestImageUrl;
      }
      
      if (response.lastImageUrl) {
        lastImageUrl.value = response.lastImageUrl;
      }
    }
  } catch (error) {
    console.error('获取图像摘要数据失败:', error);
    // 保持默认图像
  }
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
        userInfo.userId = 'lusHair32685064';
        window.receiveUserIdFromApp('lusHair32685064');
      }
    }
  } catch (error) {
    console.error('请求App userId时出错:', error);
    const isDev = env.isDevelopment(); 
      if (isDev) {
        userInfo.userId = 'lusHair32685064';
        window.receiveUserIdFromApp('lusHair32685064');
      }
  }
};

// 从原生App接收userId的方法
window.receiveUserIdFromApp = function(userIdString: string) {
  try {
    console.log('从App接收到userId:', userIdString);
    userInfo.userId = userIdString;
    userStore.fetchUserInfo(userIdString);
    fetchProductRecommendations(userStore.userInfo.userId);
    // 获取图像摘要数据
    fetchImageSummary();
    console.log('开始获取健康记录数据...');
    // 获取健康记录数据用于趋势图表
    fetchHealthRecords();
  } catch (error) {
    console.error('处理App传来的userId失败:', error);
  }
};

// 获取指定位置的level1数据（第一个字符串）
const getLevel1DataForPosition = (position: string): string | null => {
  if (!detailData.value || !detailData.value.pos || !detailData.value.pos[position]) {
    return null;
  }
  
  const posData = detailData.value.pos[position];
  if (!posData.level1 || !Array.isArray(posData.level1) || posData.level1.length === 0) {
    return null;
  }
  
  return posData.level1[0];
};

onMounted(() => {
  // 完善用户ID判断逻辑，确保不为空且有效
  if (!userInfo.userId || userInfo.userId === '' || userInfo.userId === null || userInfo.userId === undefined || userInfo.userId.trim() === '') {
    console.log('用户ID无效，请求用户ID:', userInfo.userId);
    requestUserIdFromApp();
  } else {
    console.log('用户ID有效，开始获取数据:', userInfo.userId);
    fetchProductRecommendations(userStore.userInfo.userId);
    // 获取图像摘要数据
    fetchImageSummary();
    console.log('开始获取健康记录数据...');
    // 获取健康记录数据用于趋势图表
    fetchHealthRecords();
  }
  // 记录分析成就
  try {
    const tracker = getAchievementTracker();
    tracker.trackAnalysis();
    tracker.trackFeatureUsage('trichoscan_analysis');
  } catch (error) {
    console.error('记录成就失败:', error);
  }
  
  // 获取路由参数中的id
  const query = uni.getSystemInfoSync().platform === 'devtools' 
    ? location.search.substring(1) 
    : '';
  
  // 尝试从onLoad获取参数
  // const onLoad = (options: any) => {
  //   if (options && options.id) {
  //     recordId.value = options.id;
  //     fetchDetailData();
  //   }
  // };
  
  // 尝试从URL获取参数
  // if (query) {
  //   const params = new URLSearchParams(query);
  //   const id = params.get('id');
  //   if (id) {
  //     recordId.value = id;
  //   }
  // }
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const options = currentPage.$page?.options || {};
  console.log('options===>', options);
  if (options.data) {
    const data = JSON.parse(options.data);
    if (data) {
      detailData.value = data;
      // 更新UI显示
      updateUIWithData(data);
      // 获取健康记录数据用于趋势图表
      fetchHealthRecords();
      return;
    }
  } else if (options.id) {
    recordId.value = options.id;
    fetchDetailData();
  }
  if (options.pushType) {
    pushType.value = options.pushType;
  }

  // 如果有recordId则请求数据
  // if (recordId.value) {
  //   console.log('Record ID:', recordId.value);
  //   fetchDetailData();
  // } else {
  //   // 尝试从页面选项获取
  //   const pages = getCurrentPages();
  //   if (pages && pages.length > 0) {
  //     const currentPage = pages[pages.length - 1];
  //     // @ts-ignore 忽略类型检查
  //     const options = currentPage.options || {};
  //     if (options.id) {
  //       recordId.value = options.id;
  //       fetchDetailData();
  //     } else {
  //       console.error('No record ID provided');
  //       uni.showToast({
  //         title: 'Parameter error',
  //         icon: 'none',
  //         duration: 2000
  //       });
  //     }
  //   }
  // }
});
</script>

<style lang="less" scoped>
.report-container {
  padding: 0;
  background-color: #fff;
  min-height: 100vh;
}

/* 顶部导航栏 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #fff;
}

.back-icon, .share-icon {
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  z-index: 1;
}

.back-icon {
  background-color: #f9fafb;
}

.back-arrow {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.share-dots {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.title {
  left: 0;
  right: 0;
  text-align: center;  /* 文本居中 */
  width: 100%;  /* 确保宽度占满整个header */
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* 得分提升提示 */
.score-improvement {
  padding: 20px 16px 10px;
  text-align: center;
}

.improvement-text {
  font-size: 22px;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.points-text {
  font-size: 24px;
  font-weight: 600;
  color: #8b5cf6;
}

/* 总体评分 */
.total-score {
  text-align: center;
  margin-bottom: 24px;
}

.score-number {
  font-size: 80px;
  font-weight: 700;
  color: #000;
  line-height: 1;
}

.score-denominator {
  font-size: 28px;
  color: #666;
}

/* 得分趋势图 */
.score-trend {
  padding: 0 16px;
  margin-bottom: 30px;
}

.trend-chart {
  width: 100%;
  height: 130px;
  margin-bottom: 16px;
}

.trend-chart image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.date-axis {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.date-text {
  font-size: 12px;
  color: #666;
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

.legend-color.scalp {
  background-color: #f43f5e;
}

.legend-color.follicle {
  background-color: #10b981;
}

.legend-text {
  font-size: 12px;
  color: #666;
}

/* 产品推荐 */
.product-recommendations {
  /* padding: 24px 16px; */
  background-color: #f9fafb;
  margin-bottom: 24px;
  margin: 30px 15px;

}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  margin-bottom: 15px;
  display: block;
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

.product-button {
  background-color: #8b5cf6;
  color: white;
  text-align: center;
  padding: 14px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
  margin-bottom: 15px;
}

/* 健康摘要 */
.health-summary {
  padding: 24px 16px;
  background-color: #f0ecff;
  margin-bottom: 24px;
}

.summary-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.summary-icon {
  margin-right: 10px;
  font-size: 16px;
}

.summary-title {
  font-size: 18px;
  font-weight: 600;
  color: #8b5cf6;
  flex: 1;
}

.summary-toggle {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  color: #8b5cf6;
}

.summary-content {
  margin-bottom: 20px;
}

.summary-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.chat-button {
  background-color: #8b5cf6;
  color: white;
  text-align: center;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
}

/* 指标数据 */
.metrics-section {
  padding: 16px;
}

.metrics-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
}

.radar-chart-section {
  margin: 0 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: visible;
}

.radar-chart {
  width: 100%;
  max-width: 320px;
  height: 320px;
  margin: 0 auto;
  position: relative;
  overflow: visible;
}

/* 确保SVG不会被裁剪 */
.radar-chart svg {
  overflow: visible;
  animation: radar-appear 0.8s ease-out forwards;
  position: relative;
  z-index: 5;
}

/* 雷达图标签样式 */
.radar-label {
  position: absolute;
  z-index: 10;
  width: auto;
}

.label-text {
  color: #8b5cf6;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
}

/* 各个标签的位置 */
.follicle-label {
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
}

.oil-label {
  top: 25%;
  right: -30px;
  text-align: left;
}

.scurf-label {
  top: 65%;
  right: -30px;
  text-align: left;
}

.hair-label {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
}

.sensitivity-label {
  top: 65%;
  left: -30px;
  text-align: right;
  width: 80px;
}

.hair-texture-label {
  top: 25%;
  left: -45px;
  text-align: right;
  width: 90px;
}

/* 添加雷达图的动画效果 */
@keyframes radar-appear {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 详细数据入口 */
.view-details {
  text-align: center;
  padding: 14px;
  /* border-top: 1px solid #eee;
  border-bottom: 1px solid #eee; */
  margin-bottom: 24px;
}

.view-details-text {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 头发详细指标 */
.hair-metrics {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.hair-metric-item {
  width: 32%;
  background-color: #f9fafb;
  border-radius: 10px;
  padding: 16px 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.metric-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  display: block;
}

.metric-value-big {
  font-size: 28px;
  font-weight: 600;
  margin-right: 2px;
}

.metric-value-unit {
  font-size: 12px;
  color: #666;
}

/* 头部位置 */
.position-section {
  margin-bottom: 30px;
  /* padding: 20px 15px; */
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.position-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  display: block;
}

.position-map {
  width: 100%;
  height: 320px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #e6e6fa;
  padding: 20px;
  position: relative;
}

.position-container {
  display: flex;
  justify-content: space-between;
  height: 100%;
}

.position-head-container {
  position: relative;
  width: 48%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center; /* 垂直居中 */
}

/* 分别设置左右两个头像图片的大小 */
.position-head-container:first-child .position-head-image {
  width: 61px; /* 第一个图片宽度 */
  height: 106px; /* 第一个图片高度 */
  object-fit: contain;
}

.position-head-container:last-child .position-head-image {
  width: 76px; /* 第二个图片宽度 */
  height: 103px; /* 第二个图片高度 */
  object-fit: contain;
}

/* 紫色点 */
.position-dot {
  position: absolute;
  width: 8px; /* 调整为8px */
  height: 8px; /* 调整为8px */
  background-color: #8b5cf6;
  border-radius: 50%;
  z-index: 2;
}

/* 左侧正面图的紫色点位置 - 根据用户提供的具体位置 */
.right-forehead-dot {
  left: calc(50% - 30px + 3.5px);
  top: calc(50% - 53px + 25px);
}

.mid-forehead-dot {
  left: 50%; /* 位于中间 */
  transform: translateX(-50%);
  top: calc(50% - 53px + 11px);
}

.left-forehead-dot {
  right: calc(50% - 30px + 4px);
  top: calc(50% - 53px + 25px);
}

/* 右侧侧面图的紫色点位置 - 根据用户提供的具体位置 */
.back-head-dot {
  left: calc(50% - 38px + 8px);
  top: calc(50% - 51.5px + 43px);
}

.top-head-dot {
  left: calc(50% - 38px + 33px);
  top: calc(50% - 51.5px + 12px);
}

.temples-dot {
  left: calc(50% - 38px + 35px);
  top: calc(50% - 51.5px + 35px);
}

/* 标签样式 */
.position-label {
  position: absolute;
  z-index: 3;
  width: auto; /* 改为自适应宽度 */
  min-width: 80px;
}

.position-label-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  display: block;
  text-align: center;
}

.position-label-subtext {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  display: block;
  text-align: center;
}

.position-label-tag {
  background-color: #d6ff8f;
  padding: 2px 8px;
  border-radius: 20px;
  display: inline-block;
  margin-top: 4px;
  text-align: center;
}

.position-label-tag text {
  font-size: 10px;
  color: #333;
}

/* 左侧正面图的标签位置 */
.right-forehead-label {
  top: 15px;
  left: -15px;
  text-align: left;
  width: 90px;
}

.left-forehead-label {
  top: 15px;
  right: -30px;
  text-align: right;
  width: 90px;
}

.mid-forehead-label {
  bottom: 20px;
  left: 20px;
  text-align: left;
  width: 100px;
}

/* 右侧侧面图的标签位置 */
.top-head-label {
  top: 15px; /* 与Left-forehead保持一致 */
  right: calc(50% - 38px + 33px + 4px - 45px);
  text-align: center;
  width: 90px;
}

.back-head-label {
  top: calc(50% - 51.5px + 43px + 10px);
  left: calc(50% - 38px - 90px);
  text-align: left;
  width: 90px;
}

.temples-label {
  bottom: 20px; /* 与Mid-forehead保持一致 */
  right: calc(50% - 38px + 35px + 4px - 45px);
  text-align: center;
  width: 90px;
}

/* 虚线 */
.position-dashed-line {
  position: absolute;
  z-index: 1;
}

/* 左侧正面图的虚线 - 连接圆点中心和文字 */
.right-forehead-line {
  height: 25px;
  width: 0;
  border-left: 1px dashed #ccc;
  border-bottom: none;
  top: calc(50% - 53px + 25px - 25px);
  left: calc(50% - 30px + 3.5px + 4px); /* 加上4px (圆点半径) 使线从圆点中心开始 */
}

.left-forehead-line {
  height: 25px;
  width: 0;
  border-left: 1px dashed #ccc;
  border-bottom: none;
  top: calc(50% - 53px + 25px - 25px);
  right: calc(50% - 30px + 4px + 4px); /* 加上4px (圆点半径) 使线从圆点中心开始 */
}

.mid-forehead-line {
  height: 60px;
  width: 0;
  border-left: 1px dashed #ccc;
  border-bottom: none;
  bottom: 40px;
  left: 50%;
}

/* 右侧侧面图的虚线 - 连接圆点中心和文字 */
.top-head-line {
  height: 25px;
  width: 0;
  border-left: 1px dashed #ccc;
  border-bottom: none;
  top: calc(50% - 51.5px + 12px - 25px);
  right: calc(50% - 38px + 33px + 4px); /* 加上4px (圆点半径) 使线从圆点中心开始 */
}

.back-head-line {
  width: 30px;
  border-bottom: 1px dashed #ccc;
  top: calc(50% - 51.5px + 43px + 4px);
  left: calc(50% - 38px - 30px);
}

.temples-line {
  height: 60px;
  width: 0;
  border-left: 1px dashed #ccc;
  border-bottom: none;
  bottom: 40px;
  right: calc(50% - 38px + 35px + 4px); /* 加上4px (圆点半径) 使线从圆点中心开始 */
}

/* 预测结果 */
.projection-section, .progress-section {
  margin-bottom: 30px;
}

.projection-title, .progress-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.projection-subtitle, .progress-subtitle {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
  display: block;
}

.comparison-images {
  display: flex;
  justify-content: space-between;
}

.comparison-image {
  width: 48%;
  text-align: center;
}

.comparison-image-container {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 10px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
}

.comparison-image image {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.comparison-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.comparison-label.before, .comparison-label.sensitive {
  color: #f43f5e;
}

/* 趋势图表 */
.trend-chart-container {
  padding: 0 16px;
  margin-top: 20px;
  margin-bottom: 30px;
  overflow: hidden;
}

.trend-chart-scroll {
  width: 100%;
  height: 200px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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
</style> 