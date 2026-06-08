<template>
  <view class="analysis-container">
    <!-- 返回按钮 -->
    <view class="header" :style="headerPaddingStyle(15)">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="header-title">Phone Cam Analysis</text>
      <view class="back-button invisible">
        <text class="back-icon">&#8592;</text>
      </view>
    </view>
    
    <!-- 用户表现信息 -->
    <view class="performance-info">
      <text class="performance-text">You have beaten </text>
      <text class="percentage"> {{ getPerformancePercentage() }}% users!</text>
    </view>
    
    <!-- 等级徽章 -->
    <view class="level-badge">
      <view class="badge-container">
        <view class="badge-stars">
          <text class="star">✦</text>
        </view>
        <view class="badge-inner">
          <text class="badge-title">Hair loss Pattern</text>
          <text class="badge-level">Lvl {{ questionnaireParams.stage }}</text>
          <text class="badge-progress">out of 7</text>
        </view>
        <view class="badge-stars right">
          <text class="star">✦</text>
        </view>
      </view>
    </view>
    
    <!-- 头发损失模式信息 -->
    <view class="info-card">
      <view class="card-header">
        <text class="card-title">Hair-loss Pattern: Level {{ questionnaireParams.stage }}</text>
        <!-- <view class="info-icon">
          <text>ⓘ</text>
        </view> -->
      </view>
      
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: getProgressWidth() }"></view>
      </view>
      
      <view class="card-content">
        <text class="content-text">{{ getSummaryText() }}</text>
      </view>
      
      <!-- 趋势图表 -->
      <view class="trend-chart">
        <!-- 缺省显示 -->
        <view v-if="!trendData.length" class="empty-chart">
          <view class="empty-icon">��</view>
          <text class="empty-text">暂无趋势数据</text>
        </view>
        
        <!-- 有数据时显示图表 -->
        <scroll-view v-else class="chart-scroll" scroll-x="true" show-scrollbar="false">
          <view class="chart-container" :style="{ width: chartWidth + 'px' }">
            <!-- 图表区域 -->
            <view class="chart-area">
              <!-- 折线连接 -->
              <view v-for="(_, index) in trendData.slice(0, -1)" :key="'connector-'+index" 
                    class="line-connector"
                    :style="getConnectorStyle(index)">
              </view>
              
              <!-- 数据点 -->
              <view v-for="(point, index) in trendData" :key="index" class="chart-point" 
                    :style="{ left: getPointX(index) + 'px', top: getPointTopPosition(point.score) + 'px' }">
                <view class="point-dot" @tap="togglePointSelection(index)"></view>
                <text v-if="selectedPoint === index" 
                      class="point-score" 
                      :class="{
                        'rightmost': isRightmostPoint(index),
                        'show-below': shouldShowScoreBelow(point.score)
                      }">
                  {{point.score}}
                </text>
              </view>
            </view>
            
            <!-- X轴日期标签 -->
            <view class="x-axis">
              <view v-for="(point, index) in trendData" :key="'date-'+index" class="x-label"
                    :style="{ left: getPointX(index) + 'px' }">
                <text class="date-label">{{formatDate(point.date)}}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        
        <!-- 图例 -->
        <view v-if="trendData.length" class="chart-legend">
          <view class="legend-item">
            <view class="legend-color hair"></view>
            <text class="legend-text">Hair Loss Level</text>
          </view>
          <!-- <view class="view-more">
            <text class="more-text">View more ></text>
          </view> -->
        </view>
      </view>
    </view>
    
    <!-- 产品推荐 -->
    <view class="product-recommendations">
      <view class="picks-title">
        <text>Picks for You</text>
      </view>
      <view class="picks-subtitle">
        <text>click to pick different product for each step</text>
      </view>
      
      <scroll-view class="product-list" scroll-x="true" show-scrollbar="false">
        <view class="product-item" v-for="(product, index) in products" :key="index">
          <image class="product-image" :src="product.image" mode="aspectFit"></image>
          <text class="product-name">{{product.name}}</text>
        </view>
      </scroll-view>
      
      <view class="track-button" @tap="showClockInPopup">
        <text class="button-text">Track Routine</text>
      </view>
    </view>
    
    <!-- 头发健康摘要 -->
    <view class="health-summary">
      <view class="summary-header">
        <text class="summary-title">Hair Health Summary</text>
        <!-- <view class="summary-icon">
          <text>?</text>
        </view> -->
      </view>
      
      <view class="summary-content">
        <text class="summary-text">{{ getSmartSummaryText() }}</text>
      </view>
    </view>
    
    <!-- AI助手按钮 -->
    <view class="ai-assistant-button" @tap="chatWithAssistant">
      <text class="assistant-text">Chat with Your AI Hair Care Assistant</text>
    </view>
    
    <!-- 广告区域 -->
    <view class="ad-section" @tap="tryLushairDermascope">
      <image class="ad-image" src="/static/images/bg_session.png" mode="widthFix"></image>
      <view class="ad-content">
        <text class="ad-title">Get Pro-Level Hair Insights</text>
        <text class="ad-description">Discover expert-level hair insights with the Smart Trichoscope at Home.</text>
        <view class="demo-button">
          <text class="demo-text">Try Lushair Dermascope</text>
        </view>
      </view>
    </view>
    
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
          <text class="label-text">Scurf</text>
        </view>
        <view class="radar-label hair-label">
          <text class="label-text">Hair</text>
        </view>
        <view class="radar-label sensitivity-label">
          <text class="label-text">Sensitivity</text>
        </view>
        <view class="radar-label hair-texture-label">
          <text class="label-text">Hair texture</text>
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
    
    <!-- 头发得分指标 -->
    <view class="hair-score-index">
      <text class="index-title">Your Hair Score Index</text>
    </view>
    
    <!-- 得分卡片 -->
    <view class="score-cards">
      <!-- 油脂得分 -->
      <view class="score-item">
        <view class="score-label-container">
          <text class="score-label">Oil</text>
          <text class="score-value">{{ questionnaireParams.oil + 1 }}/3</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill oil" :style="{ width: ((questionnaireParams.oil + 1) / 3 * 100) + '%' }"></view>
        </view>
      </view>
      
      <!-- 头皮屑得分 -->
      <view class="score-item">
        <view class="score-label-container">
          <text class="score-label">Scurf</text>
          <text class="score-value">{{ questionnaireParams.scurfOrKeratin + 1 }}/3</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill scurf" :style="{ width: ((questionnaireParams.scurfOrKeratin + 1) / 3 * 100) + '%' }"></view>
        </view>
      </view>
      
      <!-- 头发类型 -->
      <view class="score-type-header">
        <text class="type-title">Hair Type</text>
      </view>
      
      <!-- 头发得分 -->
      <view class="score-item">
        <view class="score-label-container">
          <text class="score-label">Hair</text>
          <text class="score-value">{{ questionnaireParams.hairLoss + 1 }}/3</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill hair" :style="{ width: ((questionnaireParams.hairLoss + 1) / 3 * 100) + '%' }"></view>
        </view>
      </view>
      
      <!-- 毛囊得分 -->
      <view class="score-item">
        <view class="score-label-container">
          <text class="score-label">Follicle</text>
          <text class="score-value">{{ questionnaireParams.stage }}/7</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill follicle" :style="{ width: (parseInt(questionnaireParams.stage) / 7 * 100) + '%' }"></view>
        </view>
      </view>
      
      <!-- 生活方式 -->
      <view class="score-type-header">
        <text class="type-title">Life Style</text>
      </view>
      
      <!-- 敏感度得分 -->
      <view class="score-item">
        <view class="score-label-container">
          <text class="score-label">Sensitivity</text>
          <text class="score-value">{{ questionnaireParams.discomfort + 1 }}/3</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill sensitivity" :style="{ width: ((questionnaireParams.discomfort + 1) / 3 * 100) + '%' }"></view>
        </view>
      </view>
      
      <!-- 头发质地得分 -->
      <view class="score-item">
        <view class="score-label-container">
          <text class="score-label">Hair texture</text>
          <text class="score-value">{{ questionnaireParams.overall + 1 }}/3</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill hair-texture" :style="{ width: ((questionnaireParams.overall + 1) / 3 * 100) + '%' }"></view>
        </view>
      </view>
    </view>
    
    <!-- 更新评测提示 -->
    <!-- <view class="update-tip">
      <text class="tip-text">*Adjust your index to update your hair score.</text>
    </view> -->
    
    <!-- 重做测验按钮 -->
    <!-- <view class="retake-button" @tap="retakeQuiz">
      <text class="retake-text">Retake the quiz</text>
    </view> -->
    
    <!-- 进度比较 -->
    <view class="progress-section">
      <text class="progress-title">Progress</text>
      <text class="progress-subtitle">If the hair is not improved by care, in the long run, there may be a risk of baldness in the future, as shown below</text>
      
      <view class="comparison-images">
        <!-- 当前图像 -->
        <view class="comparison-image" v-if="latestImageUrl">
          <view class="comparison-header">
            <text class="comparison-label">Now</text>
          </view>
          <image :src="latestImageUrl" mode="aspectFill"></image>
        </view>
        
        <!-- 历史图像 -->
        <view class="comparison-image" v-if="lastImageUrl">
          <view class="comparison-header">
            <text class="comparison-label">Before</text>
          </view>
          <image :src="lastImageUrl" mode="aspectFill"></image>
        </view>
      </view>
    </view>
    
    <!-- 条件比较 -->
    <view class="condition-section">
      <text class="condition-title">Condition</text>
      <text class="condition-subtitle">If the hair is not improved by care, in the long run, there may be a risk of baldness in the future, as shown below</text>
      
      <view class="comparison-images">
        <!-- 油脂 -->
        <view class="comparison-image" v-if="questionnaireParams.oil > 0">
          <view class="comparison-header">
            <text class="comparison-label">Oiliness</text>
          </view>
          <image src="/static/images/pic_oil.png" mode="aspectFill"></image>
        </view>
        
        <!-- 脱发 -->
        <view class="comparison-image" v-if="questionnaireParams.hairLoss > 0">
          <view class="comparison-header">
            <text class="comparison-label">Hair Loss</text>
          </view>
          <image src="/static/images/pic_hairloss.png" mode="aspectFill"></image>
        </view>
        
        <!-- 头皮屑 -->
        <view class="comparison-image" v-if="questionnaireParams.scurfOrKeratin > 0">
          <view class="comparison-header">
            <text class="comparison-label">Scurf</text>
          </view>
          <image src="/static/images/pic_scurf.png" mode="aspectFill"></image>
        </view>
        
        <!-- 敏感 -->
        <view class="comparison-image" v-if="questionnaireParams.discomfort > 0">
          <view class="comparison-header">
            <text class="comparison-label">Sensitivity</text>
          </view>
          <image src="/static/images/pic_sensitivity.png" mode="aspectFill"></image>
        </view>
      </view>
    </view>
    
    <!-- 查看详细分析按钮 -->
    <view class="detail-analysis-button" @tap="tryLushairDermascope">
      <text class="detail-text">Get Your Lushair Home AI Hair Scanner</text>
    </view>

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
import { ref, computed, onMounted } from 'vue';
import ClockInPopup from '@/components/ClockInPopup.vue';
import { post, get } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from 'vue-i18n';

// 获取用户store
const userStore = useUserStore();

// 获取i18n实例
const { t } = useI18n();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 趋势图数据接口定义
interface TrendPoint {
  date: string;
  score: number;
}

// 产品类型定义
interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
}

// API产品推荐接口定义
interface RecommendedProduct {
  type: string; // e.g., PRE_WASH, SHAMPOO
  typeDesc: string;
  productId: number;
  productTitle: string;
  productDesc: string | null;
  productUrl: string;
  clockIn: string | null; 
}

// 自拍结果接口定义
interface SelfieResult {
  id: number;
  userId: string;
  oil: number;
  scurfOrKeratin: number;
  hairLoss: number;
  discomfort: number;
  overall: number;
  stage: string;
  position: string;
  image: string;
  createTime: string;
  updateTime: string;
}

// 自拍图像摘要接口定义
interface SelfieImageSummary {
  latestImageUrl: string;
  lastImageUrl: string;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
}

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function
};

type ClockInRecords = Record<string, string[]>;

// 创建问卷参数的响应式对象
const questionnaireParams = ref({
  userId: '',
  oil: 0,
  scurfOrKeratin: 0,
  hairLoss: 0,
  discomfort: 0,
  overall: 0,
  stage: '1',
  position: '前额',
  image: ''
});

// 历史自拍数据
const historicalSelfie = ref<SelfieResult | null>(null);
const showHistoricalImage = ref(false);

// 添加图像URL引用
const latestImageUrl = ref<string>('');
const lastImageUrl = ref<string>('');

// 获取自拍图像摘要数据
const fetchSelfieImageSummary = async () => {
  try {
    const userId = userStore.userInfo.userId;
    if (!userId) {
      console.error('无法获取用户ID');
      return;
    }
    
    const response = await post('selfie/summary', { userId }) as SelfieImageSummary;
    console.log('自拍图像摘要数据:', response);
    
    if (response) {
      // 设置最新图像URL
      if (response.latestImageUrl) {
        latestImageUrl.value = response.latestImageUrl;
        questionnaireParams.value.image = response.latestImageUrl;
      }
      
      // 设置历史图像URL
      if (response.lastImageUrl) {
        lastImageUrl.value = response.lastImageUrl;
        // 创建一个模拟的历史自拍对象，只包含必要的图像属性
        historicalSelfie.value = {
          id: 0,
          userId: userId,
          oil: 0,
          scurfOrKeratin: 0,
          hairLoss: 0,
          discomfort: 0,
          overall: 0,
          stage: '0',
          position: '',
          image: response.lastImageUrl,
          createTime: '',
          updateTime: ''
        };
        showHistoricalImage.value = true;
      } else {
        showHistoricalImage.value = false;
      }
    }
  } catch (error) {
    console.error('获取自拍图像摘要数据失败:', error);
    showHistoricalImage.value = false;
  }
};

// 趋势图数据
const trendData = ref<TrendPoint[]>([]);
const chartScrollPosition = ref(0);
const chartWidth = ref(600); // 初始宽度，根据数据量动态调整
const chartHeight = 180; // 图表高度
const pointSpacing = 80; // 点之间的间距
const selectedPoint = ref<number | null>(null); // 当前选中的点

// 产品数据 - 将被API调用结果替换
const products = ref<ProductItem[]>([]);

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
          value = parseInt(questionnaireParams.value.stage) / 7; // stage范围1-7
          break;
        case 1: // Oil
          value = questionnaireParams.value.oil / 3; // 假设oil范围0-2
          break;
        case 2: // Scurf
          value = questionnaireParams.value.scurfOrKeratin / 2; // 假设scurf范围0-2
          break;
        case 3: // Hair
          value = questionnaireParams.value.hairLoss / 2; // 假设hairLoss范围0-2
          break;
        case 4: // Sensitivity
          value = questionnaireParams.value.discomfort / 3; // 假设discomfort范围0-2
          break;
        case 5: // Hair texture
          value = questionnaireParams.value.overall / 2; // 假设overall范围0-2
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

// 获取趋势数据
const fetchTrendData = async () => {
  try {
    const userId = questionnaireParams.value.userId || userStore.userInfo.userId;
    if (!userId) {
      console.error('无法获取用户ID');
      return;
    }
    
    const response = await post('selfie/trend', { userId });
    console.log('趋势数据响应:', response);
    
    if (response && Array.isArray(response) && response.length > 0) {
      // 按日期排序，确保最旧数据在最左侧（从左到右日期依次增大）
      trendData.value = response.sort((a, b) => {
        return new Date(formatDateForSort(a.date)).getTime() - new Date(formatDateForSort(b.date)).getTime();
      });
      
      // 动态设置图表宽度，确保至少有400px宽度，并额外增加右侧空间防止裁剪
      chartWidth.value = Math.max(400, trendData.value.length * pointSpacing + 80); // 增加到80px的边距
    } else {
      // 处理空数据情况
      console.log('没有趋势数据');
      trendData.value = [];
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    // 出错时也显示空数据状态
    trendData.value = [];
  }
};

// 获取产品推荐数据
const fetchProductRecommendations = async () => {
  try {
    const userId = questionnaireParams.value.userId || userStore.userInfo.userId;
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
      products.value = [];
    }
  } catch (error) {
    console.error('获取产品推荐失败:', error);
    products.value = [];
  }
};

// 切换点的选中状态
const togglePointSelection = (index: number) => {
  if (selectedPoint.value === index) {
    selectedPoint.value = null; // 如果再次点击同一个点，取消选择
  } else {
    selectedPoint.value = index; // 选择新的点
  }
};

// 计算点的X坐标
const getPointX = (index: number) => {
  return index * pointSpacing + 20; // 20px为左边距
};

// 计算点的Y坐标（从上到下）
const getPointTopPosition = (score: number) => {
  const maxScore = 100; // 最高分数
  const minScore = 0;  // 最低分数
  const usableHeight = chartHeight - 60; // 减去上下边距，为顶部预留更多空间
  
  // 计算从顶部开始的位置（分数越高，位置越靠上）- 不再限制顶部位置
  return chartHeight - ((score - minScore) / (maxScore - minScore)) * usableHeight - 20; // 减去点的半径以确保中心对齐
};

// 检查是否应该在点的下方显示分数
const shouldShowScoreBelow = (score: number) => {
  // 如果点太靠近顶部（分数高），将分数显示在点的下方
  const position = getPointTopPosition(score);
  return position < 40; // 如果距顶部小于40px，则显示在下方
};

// 获取连接线的样式
const getConnectorStyle = (index: number) => {
  if (!trendData.value[index] || !trendData.value[index + 1]) return {};
  
  const startX = getPointX(index);
  const startY = getPointTopPosition(trendData.value[index].score);
  const endX = getPointX(index + 1);
  const endY = getPointTopPosition(trendData.value[index + 1].score);
  
  // 计算两点之间的距离
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  // 计算线的旋转角度（弧度转度数）
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  
  return {
    width: `${length}px`,
    left: `${startX}px`,
    top: `${startY}px`,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 0'
  };
};

// 格式化日期显示
const formatDate = (dateStr: string) => {
  // 输入格式: "20250403"
  if (!dateStr || dateStr.length !== 8) return dateStr;
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  // 返回 "9 Aug" 这样的格式
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(month) - 1;
  return `${parseInt(day)} ${monthNames[monthIndex]}`;
};

// 格式化日期用于排序
const formatDateForSort = (dateStr: string) => {
  // 输入格式: "20250403" 转成 "2025-04-03"
  if (!dateStr || dateStr.length !== 8) return dateStr;
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  return `${year}-${month}-${day}`;
};

// 返回上一页
const goBack = () => {
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

// 与AI助手聊天
const chatWithAssistant = () => {
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.chatWithAssistant.postMessage({data: 'chatWithAssistant'});
  } else {
    window.android.chatWithAssistant(JSON.stringify({data: 'chatWithAssistant'}));
  }
};

// 尝试Lushair Dermascope
const tryLushairDermascope = () => {
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.tryLushairDermascope.postMessage({data: 'tryLushairDermascope'});
  } else {
    window.android.tryLushairDermascope(JSON.stringify({data: 'tryLushairDermascope'}));
  }
};

// 重做测验
const retakeQuiz = () => {
  uni.navigateTo({
    url: '/pages/trichoscan/index' // 或者问卷入口页
  });
};

// 查看详细分析
const viewDetailedAnalysis = () => {
  uni.navigateTo({
    url: '/pages/analysis/index'
  });
};

// 打卡弹窗相关状态
const showPopup = ref(false);

// 显示打卡弹窗
const showClockInPopup = () => {
  showPopup.value = true;
};

// 隐藏打卡弹窗
const hideClockInPopup = () => {
  showPopup.value = false;
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

// 从URL获取参数
const getQueryParams = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const options = currentPage.$page?.options || {};
  
  // 更新问卷参数
  questionnaireParams.value = {
    userId: options.userId || '',
    oil: parseInt(options.oil || '0'),
    scurfOrKeratin: parseInt(options.scurfOrKeratin || '0'),
    hairLoss: parseInt(options.hairLoss || '0'),
    discomfort: parseInt(options.discomfort || '0'),
    overall: parseInt(options.overall || '0'),
    stage: options.stage || '1',
    position: options.position || '前额',
    image: options.image || ''
  };
  
  console.log('获取到的问卷参数:', questionnaireParams.value);
};

// 根据问卷参数更新UI
const updateUIBasedOnParams = () => {
  // 这里您可以根据问卷参数更新界面显示
  // 例如更新进度条、显示不同的分析结果等
  
  // 示例：根据oil值更新油脂评分
  const oilScoreText = document.querySelector('.score-item:nth-child(1) .score-value');
  if (oilScoreText) {
    const oilValue = questionnaireParams.value.oil + 1; // 因为选项从0开始，但显示从1开始
    const maxOil = 3; // 假设最大值为3
    oilScoreText.textContent = `${oilValue}/${maxOil}`;
    
    // 更新进度条
    const oilProgressBar = document.querySelector('.score-item:nth-child(1) .progress-fill.oil');
    if (oilProgressBar) {
      const percentage = (oilValue / maxOil) * 100;
      (oilProgressBar as HTMLElement).style.width = `${percentage}%`;
    }
  }
  
  // 您可以添加更多基于其他参数的UI更新
};

// 检查是否为最右边的点（用于调整分数显示）
const isRightmostPoint = (index: number) => {
  // 如果是最后一个点或倒数第二个点，返回true
  return index >= trendData.value.length - 2;
};

// 根据stage计算用户表现百分比
const getPerformancePercentage = () => {
  // stage为1时为90%，2为80%，以此类推，到7为30%
  const stage = parseInt(questionnaireParams.value.stage) || 1;
  return Math.max(30, 100 - (stage * 10)); // 确保最低为30%
};

// 计算进度条的宽度
const getProgressWidth = () => {
  const stage = parseInt(questionnaireParams.value.stage) || 1;
  const percentage = Math.min(100, (stage / 7) * 100); // 确保最高不超过100%
  return `${percentage}%`;
};

// 获取summary文本内容（多语言组合逻辑）
const getSmartSummaryText = () => {
  const oil = questionnaireParams.value.oil;
  const scurfOrKeratin = questionnaireParams.value.scurfOrKeratin;
  const hairLoss = questionnaireParams.value.hairLoss;
  const discomfort = questionnaireParams.value.discomfort;
  let result = '';
  if (oil > 0) {
    result += t('scan.oil');
  }
  if (scurfOrKeratin > 0) {
    if (result) result += '\n';
    result += t('scan.scurf');
  }
  if (hairLoss > 0) {
    if (result) result += '\n';
    result += t('scan.density');
  }
  if (discomfort > 0) {
    if (result) result += '\n';
    result += t('scan.redness');
  }
  if (!result) {
    return getSummaryText();
  }
  return result;
};

// 获取summary文本内容
const getSummaryText = () => {
  const stage = parseInt(questionnaireParams.value.stage) || 1;
  const gender = userStore.userInfo.gender;
  if (stage === 1) {
    return 'Normal hairline\nThick hair on the top of the head';
  } else if (stage === 2) {
    if (gender === 1) {
      return 'Retract the forehead by 1-2 centimeters.Slightly retract along the hairline';
    } else {
      return 'A small amount of scalp can be seen at the midpoint';
    }
  } else if (stage === 3) {
    if (gender === 1) {
      return 'The hairline further retracts, and the frontal angle retracts more noticeably';
    } else {
      return 'Obvious scalp can be seen at the midpoint, with sparse areas around it';
    }
  } else if (stage === 4) {
    if (gender === 1) {
      return 'Receding hairline and frontal hair, worsening hair loss on the top of the head';
    } else {
      return 'The scalp is clearly visible at the midpoint, and the surrounding sparse area is expanding';
    }
  } else if (stage === 5) {
    if (gender === 1) {
      return 'The hair on the forehead and forehead angle recedes significantly, and the hair band at the top of the head is sparser';
    } else {
      return 'The scalp is clearly visible at the midpoint, and the surrounding sparse area is expanding';
    }
  } else if (stage === 6) {
    if (gender === 1) {
      return 'Basic hair loss in the forehead area, with a noticeable trend of expansion towards the back of the head';
    } else {
      return 'Increased hair loss on the top of the head.A horseshoe shaped hair loss band forms on the top of the head';
    }
  } else if (stage === 7) {
    if (gender === 1) {
      return 'Form a horseshoe shaped hair band with a very low hairline';
    } else {
      return 'Increased hair loss on the top of the head.A horseshoe shaped hair loss band forms on the top of the head';
    }
  }
  return '';
};

onMounted(async () => {
  // 获取URL参数
  getQueryParams();
  
  // 获取趋势数据
  await fetchTrendData();
  
  // 获取产品推荐数据
  await fetchProductRecommendations();
  
  // 获取自拍图像摘要数据
  await fetchSelfieImageSummary();
  
  // 根据参数更新UI
  // setTimeout用于确保DOM已经渲染完成
  setTimeout(() => {
    updateUIBasedOnParams();
  }, 100);
});
</script>

<style>
.analysis-container {
  min-height: 100vh;
  background-color: #fff;
  padding-bottom: 30px;
}

/* 顶部导航栏 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #fff;
}

.back-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 20px;
  color: #333;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.invisible {
  visibility: hidden;
}

/* 用户表现信息 */
.performance-info {
  text-align: center;
  margin: 20px 0;
}

.performance-text {
  font-size: 20px;
  color: #333;
  margin-bottom: 5px;
}

.percentage {
  font-size: 22px;
  font-weight: bold;
  color: #8b5cf6;
}

/* 等级徽章 */
.level-badge {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.badge-container {
  background-color: #8b5cf6;
  display: flex;
  padding: 15px 40px;
  border-radius: 10px;
  position: relative;
}

.badge-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.badge-title {
  font-size: 14px;
  color: #fff;
  margin-bottom: 5px;
}

.badge-level {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.badge-progress {
  font-size: 12px;
  color: #f0f0f0;
}

.badge-stars {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
}

.badge-stars.right {
  left: auto;
  right: 15px;
}

.star {
  font-size: 20px;
  color: #ffeb3b;
}

/* 信息卡片 */
.info-card {
  margin: 20px 15px;
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.info-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background-color: #f0f0f0;
}

.progress-bar {
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  margin: 10px 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #8b5cf6;
  border-radius: 3px;
}

.card-content {
  margin: 15px 0;
}

.content-text {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* 趋势图表 */
.trend-chart {
  margin-top: 20px;
  position: relative;
  min-height: 200px; /* 确保空状态也有足够高度 */
}

.chart-scroll {
  width: 100%;
  overflow-x: auto;
}

.chart-container {
  height: 270px; /* 增加高度为图表顶部留出更多空间 */
  position: relative;
  min-width: 100%;
  padding-bottom: 30px; /* 为x轴留出空间 */
  background-color: #f9f9f9;
  border-radius: 8px;
}

.chart-area {
  position: absolute;
  top: 40px; /* 增加顶部空间，为高分数的显示预留位置 */
  left: 0;
  right: 0;
  bottom: 30px;
  overflow: visible;
}

.line-connector {
  position: absolute;
  height: 2px;
  background-color: #8b5cf6;
  z-index: 1;
}

.chart-point {
  position: absolute;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  margin-top: -6px; /* 确保圆点居中 */
  z-index: 2;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #8b5cf6;
  cursor: pointer;
}

.point-score {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  min-width: 20px;
  text-align: center;
  z-index: 10;
}

/* 最右边点的分数样式 */
.point-score.rightmost {
  left: auto;
  right: 0;
  transform: translateX(0);
}

/* 高分数点的分数显示在下方 */
.point-score.show-below {
  top: auto;
  bottom: -25px;
}

.x-axis {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 30px;
}

.x-label {
  position: absolute;
  bottom: 5px;
  transform: translateX(-50%);
  text-align: center;
}

.date-label {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 5px;
}

.legend-color.hair {
  background-color: #8b5cf6;
}

.legend-text {
  font-size: 12px;
  color: #666;
}

.view-more {
  margin-left: auto;
}

.more-text {
  font-size: 12px;
  color: #8b5cf6;
}

/* 产品推荐 */
.product-recommendations {
  margin: 30px 15px;
}

.picks-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.picks-subtitle {
  font-size: 12px;
  color: #999;
  margin-bottom: 15px;
}

.product-list {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: 15px;
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

/* 头发健康摘要 */
.health-summary {
  margin: 30px 15px;
  background-color: #f8f8f8;
  border-radius: 10px;
  padding: 15px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.summary-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.summary-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background-color: #8b5cf6;
  color: #fff;
}

.summary-content {
  margin-top: 10px;
}

.summary-text {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* AI助手按钮 */
.ai-assistant-button {
  margin: 20px 15px;
  background-color: #8b5cf6;
  color: #fff;
  padding: 12px;
  border-radius: 5px;
  text-align: center;
}

.assistant-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

/* 广告区域 */
.ad-section {
  margin: 30px 15px;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}

.ad-image {
  width: 100%;
  border-radius: 10px;
}

.ad-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  text-align: center;
}

.ad-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 5px;
}

.ad-description {
  font-size: 14px;
  color: #fff;
  margin-bottom: 15px;
}

.demo-button {
  background-color: #ffeb3b;
  padding: 10px 15px;
  border-radius: 5px;
  text-align: center;
  display: inline-block;
}

.demo-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

/* 雷达图 */
.metrics-title {
  margin: 30px 15px 15px 15px;
  font-size: 18px;
  font-weight: bold;
  color: #333;
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

/* 头发得分指标 */
.hair-score-index {
  margin: 30px 15px 15px 15px;
}

.index-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

/* 得分卡片 */
.score-cards {
  margin: 15px;
}

.score-item {
  margin-bottom: 15px;
}

.score-label-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.score-label {
  font-size: 14px;
  color: #666;
}

.score-value {
  font-size: 14px;
  color: #666;
}

.progress-bar {
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill.oil {
  background-color: #ffc107;
}

.progress-fill.scurf {
  background-color: #4caf50;
}

.progress-fill.hair {
  background-color: #2196f3;
}

.progress-fill.follicle {
  background-color: #9c27b0;
}

.progress-fill.sensitivity {
  background-color: #f44336;
}

.progress-fill.sleep {
  background-color: #3f51b5;
}

.progress-fill.hair-texture {
  background-color: #ff9800;
}

.score-type-header {
  margin: 25px 0 15px 0;
}

.type-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 更新提示 */
.update-tip {
  margin: 10px 15px 30px 15px;
}

.tip-text {
  font-size: 12px;
  color: #999;
}

/* 重做测验按钮 */
.retake-button {
  margin: 15px;
  background-color: transparent;
  border: 1px solid #8b5cf6;
  padding: 10px;
  border-radius: 5px;
  text-align: center;
}

.retake-text {
  font-size: 14px;
  color: #8b5cf6;
}

/* 进度比较 */
.progress-section, .condition-section {
  margin: 30px 15px;
  display: flex;
  flex-direction: column;
}

.progress-title, .condition-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.progress-subtitle, .condition-subtitle {
  font-size: 12px;
  color: #999;
  margin-bottom: 15px;
}

.comparison-images {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  margin-top: 15px;
}

.comparison-image {
  width: 45%;
  min-width: 120px;
  margin: 10px 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-grow: 0;
  flex-shrink: 0;
}

.comparison-image image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.comparison-header {
  background-color: #f0f0f0;
  padding: 8px 10px;
  text-align: center;
}

.comparison-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* 查看详细分析按钮 */
.detail-analysis-button {
  margin: 30px 15px;
  background-color: #8b5cf6;
  padding: 12px;
  border-radius: 5px;
  text-align: center;
}

.detail-text {
  font-size: 14px;
  color: #fff;
}

/* 空数据状态 */
.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  background-color: #f9f9f9;
  border-radius: 8px;
  height: 180px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 16px;
  color: #ccc;
}

.empty-text {
  font-size: 14px;
  color: #999;
}
</style> 