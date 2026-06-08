<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatusBar } from '@/composables/useStatusBar';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import type { TablerIconName } from '@/components/icons/tabler-icons';

declare var window: Window & {
  webkit: any;
  android: any;
  receiveUserIdFromApp: Function;
};

// 国际化 i18n
const { t } = useI18n();

// 使用状态栏高度 composable
// Use status bar height composable
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// ========== 类型定义 Type Definitions ==========
interface SkinApiResponse {
  code: number;
  msg: string;
  score: number;
  score_sep: {
    wrinkle: number;
    pore: number;
    acne: number;
    pigment: number;
    sensitive: number;
    blackhead: number;
    oil: number;
    skin_tone: number;
  };
  suggestion: {
    wrinkle: string;
    pore: string;
    acne: string;
    pigment: string;
    sensitive: string;
    blackhead: string;
    oil: string;
    skin_tone: string;
  };
  urls: {
    led: { wrinkle: string; pore: string };
    polarized: { acne: string; pigment: string; sensitive: string; blackhead: string };
    uv: { oil: string; skin_tone: string };
  };
  data: {
    acne_area_rate: number;
    acne_count: number;
    acne_avg_area: number;
    pigment_area_rate: number;
    pigment_count: number;
    pigment_avg_area: number;
    sensitive_area_rate: number;
    blackhead_count: number;
    blackhead_density: number;
    oil_count: number;
    oil_density: number;
    wrinkle_area: number;
    pore_count: number;
    pore_density: number;
    skin_tone_area: number;
  };
}

// ========== 皮肤指标配置 Skin Metric Config ==========
interface SkinMetric {
  id: keyof SkinApiResponse['score_sep'];
  labelKey: string; // i18n key
  icon: string;
  urlGroup: 'led' | 'polarized' | 'uv';
  dataKey?: keyof SkinApiResponse['data'];
  dataLabelKey?: string; // i18n key for raw data label
  isRate?: boolean;  // float rate: multiply by 100 and show as %
  isFloat?: boolean; // plain float: show with toFixed(2)
  unit?: string;     // optional unit suffix appended after value
}

const skinMetrics: SkinMetric[] = [
  // LED 光 - wrinkle_area / pore_count 默认值为 0
  // LED light - wrinkle_area / pore_count default to 0
  { id: 'wrinkle',   labelKey: 'skinResult.wrinkle',   icon: 'wave-sine' as TablerIconName, urlGroup: 'led',       dataKey: 'wrinkle_area',       dataLabelKey: 'skinResult.wrinkleArea',      isFloat: true                     },
  { id: 'pore',      labelKey: 'skinResult.pore',      icon: 'circle' as TablerIconName, urlGroup: 'led',       dataKey: 'pore_count',          dataLabelKey: 'skinResult.poreCount'                                          },
  // 偏振光 - acne / pigment / sensitive / blackhead
  // Polarized - acne / pigment / sensitive / blackhead
  { id: 'acne',      labelKey: 'skinResult.acne',      icon: 'circle' as TablerIconName, urlGroup: 'polarized', dataKey: 'acne_count',          dataLabelKey: 'skinResult.acneCount'                                          },
  { id: 'pigment',   labelKey: 'skinResult.pigment',   icon: 'color-filter' as TablerIconName, urlGroup: 'polarized', dataKey: 'pigment_count',       dataLabelKey: 'skinResult.pigmentCount'                                       },
  { id: 'sensitive', labelKey: 'skinResult.sensitive', icon: 'heart' as TablerIconName, urlGroup: 'polarized', dataKey: 'sensitive_area_rate', dataLabelKey: 'skinResult.sensitiveAreaRate', isRate: true                  },
  { id: 'blackhead', labelKey: 'skinResult.blackhead', icon: 'circle' as TablerIconName, urlGroup: 'polarized', dataKey: 'blackhead_count',     dataLabelKey: 'skinResult.blackheadCount'                                     },
  // 紫外光 - oil / skin_tone; skin_tone_area 默认值为 0
  // UV light - oil / skin_tone; skin_tone_area default to 0
  { id: 'oil',       labelKey: 'skinResult.oil',       icon: 'droplet' as TablerIconName, urlGroup: 'uv',        dataKey: 'oil_count',           dataLabelKey: 'skinResult.oilCount'                                           },
  { id: 'skin_tone', labelKey: 'skinResult.skin_tone', icon: 'sparkles' as TablerIconName, urlGroup: 'uv',        dataKey: 'skin_tone_area',      dataLabelKey: 'skinResult.skinToneArea',     isFloat: true                     },
];

// 分组配置 Group config
interface MetricGroup {
  labelKey: string;
  groupKey: 'led' | 'polarized' | 'uv';
  metrics: SkinMetric[];
}

const metricGroups: MetricGroup[] = [
  { labelKey: 'skinResult.ledLight',        groupKey: 'led',       metrics: skinMetrics.filter(m => m.urlGroup === 'led')       },
  { labelKey: 'skinResult.polarizedLight',  groupKey: 'polarized', metrics: skinMetrics.filter(m => m.urlGroup === 'polarized') },
  { labelKey: 'skinResult.uvLight',         groupKey: 'uv',        metrics: skinMetrics.filter(m => m.urlGroup === 'uv')        },
];

// ========== 页面状态 Page State ==========
const apiData = ref<SkinApiResponse | null>(null);
const selectedMetricId = ref<keyof SkinApiResponse['score_sep']>('acne');

// 图片预览状态 Image preview state
const showImagePreview = ref(false);
const previewImageUrl = ref('');

// ========== URL 参数解析 URL Query Parsing ==========
const getPageOptionsFromHash = (): Record<string, string> => {
  try {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    if (queryStart === -1) return {};
    const queryStr = hash.substring(queryStart + 1);
    const params: Record<string, string> = {};
    queryStr.split('&').forEach(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const key = decodeURIComponent(part.substring(0, eqIdx));
        const val = decodeURIComponent(part.substring(eqIdx + 1));
        params[key] = val;
      }
    });
    return params;
  } catch (e) {
    return {};
  }
};

// ========== 计算属性 Computed ==========

// 当前选中指标对象 Current selected metric
const selectedMetric = computed(() =>
  skinMetrics.find(m => m.id === selectedMetricId.value) || skinMetrics[0]
);

// 当前分数 Current score (null if not present in API response)
const selectedScore = computed(() => {
  const score = apiData.value?.score_sep[selectedMetricId.value];
  return (score === undefined || score === null) ? null : score;
});

// 辅助工具：安全获取指标分数 Safely get metric score (null if absent)
const getMetricScore = (id: keyof SkinApiResponse['score_sep']): number | null => {
  const score = apiData.value?.score_sep[id];
  return (score === undefined || score === null) ? null : score;
};

// 当前建议 Current suggestion
const selectedSuggestion = computed(() =>
  apiData.value?.suggestion[selectedMetricId.value] || t('skinResult.noSuggestion')
);

// 当前图片 URL Current image URL
const selectedImageUrl = computed(() => {
  if (!apiData.value) return '';
  const metric = selectedMetric.value;
  const group = apiData.value.urls[metric.urlGroup] as Record<string, string>;
  return group?.[metric.id] || '';
});

// 当前原始数值 Current raw data value
const selectedDataValue = computed((): number | null => {
  if (!apiData.value || !selectedMetric.value.dataKey) return null;
  const raw = (apiData.value.data as any)[selectedMetric.value.dataKey];
  return (raw === undefined || raw === null) ? null : Number(raw);
});

// 综合评分 Overall score
const overallScore = computed(() => apiData.value?.score ?? 0);

// 评分等级 Score level key (null-safe)
const getScoreLevelKey = (score: number | null): string => {
  if (score === null || score === undefined) return '';
  if (score >= 90) return 'skinResult.excellent';
  if (score >= 75) return 'skinResult.good';
  if (score >= 60) return 'skinResult.fair';
  return 'skinResult.poor';
};

// 评分颜色 Score color (null-safe, fallback to gray)
const getScoreColor = (score: number | null): string => {
  if (score === null || score === undefined) return '#9ca3af';
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#7622FF';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

// 百分比宽度 Progress bar width (null-safe)
const getProgressWidth = (score: number | null): string => score !== null ? `${score}%` : '0%';

// ===== 钟形曲线 Bell Curve =====
const getBellCurvePath = (isFilled: boolean) => {
  const width = 311;
  const height = 110;
  const centerX = width / 2;
  const centerY = height - 20;
  const amplitude = 65;
  const spread = 70;
  let path = '';
  const points: { x: number; y: number }[] = [];
  for (let x = 0; x <= width; x += 1) {
    const normalizedX = (x - centerX) / spread;
    const y = centerY - amplitude * Math.exp(-0.5 * normalizedX * normalizedX);
    points.push({ x, y });
  }
  if (points.length > 0) {
    path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 2; i += 3) {
      const p1 = points[i];
      const p2 = points[Math.min(i + 1, points.length - 1)];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      path += ` C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
    }
    for (let i = points.length - (points.length % 3); i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    if (isFilled) {
      const lastPoint = points[points.length - 1];
      path += ` L ${lastPoint.x} ${centerY} L ${points[0].x} ${centerY} Z`;
    }
  }
  return path;
};

const getBellCurveY = (x: number) => {
  const width = 311;
  const centerX = width / 2;
  const centerY = 90;
  const amplitude = 65;
  const spread = 70;
  const normalizedX = (x - centerX) / spread;
  return centerY - amplitude * Math.exp(-0.5 * normalizedX * normalizedX);
};

// 近似逆正态 Approximate inverse normal
const approximateInverseNormal = (p: number) => {
  if (p <= 0) return -3;
  if (p >= 1) return 3;
  if (p === 0.5) return 0;
  const sign = p < 0.5 ? -1 : 1;
  const q = p < 0.5 ? p : 1 - p;
  const t_ = Math.sqrt(-2 * Math.log(q));
  const z = t_ - (2.515517 + 0.802853 * t_ + 0.010328 * t_ * t_) /
    (1 + 1.432788 * t_ + 0.189269 * t_ * t_ + 0.001308 * t_ * t_ * t_);
  return sign * z;
};

// 百分位数 Percentile from score
const scoreToPercentile = (score: number): number =>
  Math.round(Math.max(5, Math.min(95, score)));

// 用户标记 x 坐标 User marker x position
const getUserMarkerX = computed(() => {
  const percentile = scoreToPercentile(selectedScore.value);
  const width = 311;
  const centerX = width / 2;
  const spread = 70;
  const z = approximateInverseNormal(percentile / 100);
  const x = centerX + z * spread * 0.6;
  return Math.max(20, Math.min(291, x));
});

// ========== 事件处理 Event Handlers ==========
const handleBack = () => {
  handleExit();
};

const selectMetric = (metricId: keyof SkinApiResponse['score_sep']) => {
  selectedMetricId.value = metricId;
};

const openImagePreview = (url: string) => {
  if (!url) return;
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

const closeImagePreview = () => {
  showImagePreview.value = false;
  previewImageUrl.value = '';
};

const handleRetakeScan = () => {
  const u = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document);
  if (isiOS) {
    window.webkit.messageHandlers.advancedRetakeScan.postMessage({ data: 'advancedRetakeScan' });
  } else {
    window.android.advancedRetakeScan(JSON.stringify({ data: 'advancedRetakeScan' }));
  }
};

const handleExit = () => {
  const u = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document);
  if (isiOS) {
    window.webkit.messageHandlers.advancedExit.postMessage({ data: 'advancedExit' });
  } else {
    window.android.advancedExit(JSON.stringify({ data: 'advancedExit' }));
  }
};

// ========== 页面挂载 onMounted ==========
onMounted(async () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const optionsFromPage = currentPage.$page?.options || {};
  const optionsFromHash = getPageOptionsFromHash();
  const options = (Object.keys(optionsFromPage).length > 0) ? optionsFromPage : optionsFromHash;

  console.log('[SkinResult] options:', options);

  // 解析传入的 data 参数 Parse incoming data param
  if (options.data) {
    try {
      const parsed: SkinApiResponse = JSON.parse(options.data);
      if (parsed && parsed.score !== undefined) {
        apiData.value = parsed;
        console.log('[SkinResult] apiData loaded:', apiData.value);
      }
    } catch (e) {
      console.error('[SkinResult] Failed to parse data:', e);
    }
  }
});
</script>

<template>
  <view class="skin-result">

    <!-- 固定顶部导航 Fixed Header -->
    <view class="header" :style="headerPaddingStyle(0)">
      <view class="header-content">
        <text class="header-title">{{ t('skinResult.title') }}</text>
        <view class="back-button" @click="handleBack">
          <text class="back-icon">‹</text>
        </view>
      </view>
    </view>

    <!-- 标题区域 Title Section -->
    <view class="title-section" :style="headerPaddingStyle(60)">
      <view class="title-row">
        <text class="main-title">{{ t('skinResult.pageTitle') }}</text>
        <view class="badge">
          <text class="badge-text">{{ t('skinResult.badgeLabel') }}</text>
        </view>
      </view>
    </view>

    <!-- 综合评分卡片 Overall Score Card -->
    <view class="score-card">
      <view class="score-header">
        <text class="score-title">{{ t('skinResult.overallScore') }}</text>
        <view class="score-display">
          <text class="score-number">{{ Math.round(overallScore) }}</text>
          <text class="score-out-of">{{ t('skinResult.outOf100') }}</text>
        </view>
        <view class="score-level-badge" :style="{ borderColor: getScoreColor(overallScore) }">
          <text class="score-level-text" :style="{ color: getScoreColor(overallScore) }">
            {{ t(getScoreLevelKey(overallScore)) }}
          </text>
        </view>
      </view>

        <!-- 8项指标迷你卡片 8 Metrics Mini Cards -->
        <view class="metrics-overview">
          <view
            v-for="metric in skinMetrics"
            :key="metric.id"
            class="metric-mini-card"
            :class="{ 'metric-mini-card--active': selectedMetricId === metric.id }"
            @click="selectMetric(metric.id)"
          >
            <TablerIcon :name="metric.icon" :size="16" class="metric-mini-icon" />
            <text class="metric-mini-label">{{ t(metric.labelKey) }}</text>
            <view class="metric-mini-score-bar">
              <view
                class="metric-mini-score-fill"
                :style="{
                  width: getProgressWidth(getMetricScore(metric.id)),
                  backgroundColor: getScoreColor(getMetricScore(metric.id))
                }"
              ></view>
            </view>
            <!-- 分数无值时直接隐藏 Hide score number when absent -->
            <text class="metric-mini-score-num" v-if="getMetricScore(metric.id) !== null">
              {{ Math.round(getMetricScore(metric.id)!) }}
            </text>
          </view>
        </view>
    </view>

    <!-- 指标详情区域 Metric Detail Section -->
    <view class="breakdown-section">
      <view class="section-header">
        <text class="section-title">{{ t('skinResult.scoreBreakdown') }}</text>
        <text class="section-subtitle">{{ t('skinResult.scoreBreakdownSub') }}</text>
      </view>

      <view class="breakdown-card">
        <!-- 指标标头 Metric Header -->
        <view class="card-metric-header">
          <TablerIcon :name="selectedMetric.icon" :size="20" class="card-metric-icon" />
          <text class="card-metric-label">{{ t(selectedMetric.labelKey) }}</text>
          <!-- 分数有值时显示，无值时直接隐藏 Show score badge when available, hide when absent -->
          <view
            v-if="selectedScore !== null"
            class="card-metric-score-badge"
            :style="{ backgroundColor: getScoreColor(selectedScore) }"
          >
            <text class="card-metric-score-text">
              {{ Math.round(selectedScore) }}
            </text>
          </view>
        </view>

        <!-- 钟形曲线仅在有分数时显示 Bell Curve only shown when score is available -->
        <view class="chart-section" v-if="selectedScore !== null">
          <view class="bell-curve">
            <view class="curve-container">
              <svg class="bell-curve-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="skinDotPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                    <circle cx="4" cy="4" r="1" fill="rgba(221, 221, 221, 0.6)"/>
                  </pattern>
                </defs>
                <path :d="getBellCurvePath(true)" fill="url(#skinDotPattern)" stroke="none"/>
                <path :d="getBellCurvePath(false)" fill="none" stroke="#7622FF" stroke-width="2"/>
                <line
                  :x1="getUserMarkerX" :y1="20"
                  :x2="getUserMarkerX" :y2="90"
                  stroke="#7A7A7A" stroke-width="1"
                />
                <circle
                  :cx="getUserMarkerX"
                  :cy="getBellCurveY(getUserMarkerX)"
                  r="4" fill="white" stroke="#7622FF" stroke-width="2"
                />
              </svg>
              <!-- 百分位标签 Percentile Badge -->
              <view class="percentile-badge" :style="{ left: (getUserMarkerX - 30) + 'px' }">
                <text class="percentile-text">{{ t('skinResult.ahead', [100 - scoreToPercentile(selectedScore)]) }}</text>
              </view>
            </view>
            <view class="curve-labels">
              <text class="curve-label">{{ t('skinResult.lowEnd') }}</text>
              <text class="curve-label">{{ t('skinResult.average') }}</text>
              <text class="curve-label">{{ t('skinResult.highEnd') }}</text>
            </view>
          </view>
        </view>

        <!-- 原始数值 Raw Data Value -->
        <!-- 展示规则：rate 字段×100显示%，float 字段保留2位小数，int 字段直接显示 -->
        <!-- Display rule: rate×100 as %, float toFixed(2), int as-is -->
        <view class="raw-data-section" v-if="selectedDataValue !== null">
          <text class="raw-data-label">{{ t(selectedMetric.dataLabelKey || '') }}</text>
          <text class="raw-data-value">
            {{ selectedMetric.isRate
              ? (selectedDataValue * 100).toFixed(2) + '%'
              : selectedMetric.isFloat
                ? selectedDataValue.toFixed(2) + (selectedMetric.unit || '')
                : selectedDataValue + (selectedMetric.unit || '') }}
          </text>
        </view>

        <!-- 护肤建议 Skin Care Advice -->
        <view class="suggestion-section">
          <text class="suggestion-title">{{ t('skinResult.metricAdvice') }}</text>
          <text class="suggestion-text">{{ selectedSuggestion }}</text>
        </view>

        <!-- 检测图像 Scan Image -->
        <view class="metric-image-section" v-if="selectedImageUrl">
          <text class="metric-image-title">{{ t('skinResult.scanImage') }}</text>
          <view class="metric-image-wrapper" @click="openImagePreview(selectedImageUrl)">
            <image class="metric-image" :src="selectedImageUrl" mode="aspectFill" />
            <view class="metric-image-view-btn">
              <TablerIcon name="eye" :size="16" class="view-icon-text" />
              <text class="view-text">{{ t('skinResult.view') }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 分组图片区域 Grouped Image Section -->
    <view class="image-groups-section">
      <view class="section-header">
        <text class="section-title">{{ t('skinResult.scanImages') }}</text>
        <text class="section-subtitle">{{ t('skinResult.scanImagesSub') }}</text>
      </view>

      <view v-for="group in metricGroups" :key="group.groupKey" class="image-group">
        <text class="image-group-title">{{ t(group.labelKey) }}</text>
        <scroll-view class="image-group-scroll" scroll-x show-scrollbar="false">
          <view class="image-group-list">
            <view
              v-for="metric in group.metrics"
              :key="metric.id"
              class="image-group-item"
              @click="openImagePreview((apiData?.urls[metric.urlGroup] as any)?.[metric.id] || '')"
            >
              <view class="image-group-img-wrap">
                <image
                  v-if="(apiData?.urls[metric.urlGroup] as any)?.[metric.id]"
                  class="image-group-img"
                  :src="(apiData?.urls[metric.urlGroup] as any)?.[metric.id]"
                  mode="aspectFill"
                />
                <view v-else class="image-group-placeholder">
                  <TablerIcon :name="metric.icon" :size="24" class="placeholder-icon" />
                </view>
              </view>
              <text class="image-group-label">{{ t(metric.labelKey) }}</text>
              <!-- 评分芯片: 有值显示，无值隐藏 Score chip: hidden when absent -->
              <view
                v-if="getMetricScore(metric.id) !== null"
                class="image-group-score-chip"
                :style="{ backgroundColor: getScoreColor(getMetricScore(metric.id)) }"
              >
                <text class="image-group-score-text">
                  {{ Math.round(getMetricScore(metric.id)!) }}
                </text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 数据概览 Data Overview -->
    <view class="data-overview-section">
      <view class="section-header">
        <text class="section-title">{{ t('skinResult.dataOverview') }}</text>
        <text class="section-subtitle">{{ t('skinResult.dataOverviewSub') }}</text>
      </view>

      <view class="data-grid">
        <!-- 痘痘 Acne -->
        <view class="data-card">
          <view class="data-card-title">
            <TablerIcon name="circle" :size="16" color="#e0556b" />
            <text>{{ t('skinResult.acne') }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.acneCount') }}</text>
            <text class="data-value">{{ apiData?.data.acne_count ?? 0 }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.acneAreaRate') }}</text>
            <text class="data-value">{{ ((apiData?.data.acne_area_rate ?? 0) * 100).toFixed(2) }}%</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.acneAvgArea') }}</text>
            <!-- float: 各区域面积平均值（像素²）/ float: avg area in px² -->
            <text class="data-value">{{ (apiData?.data.acne_avg_area ?? 0).toFixed(1) }}</text>
          </view>
        </view>

        <!-- 色斑 Pigment -->
        <view class="data-card">
          <view class="data-card-title">
            <TablerIcon name="color-filter" :size="16" />
            <text>{{ t('skinResult.pigment') }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.pigmentCount') }}</text>
            <text class="data-value">{{ apiData?.data.pigment_count ?? 0 }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.pigmentAreaRate') }}</text>
            <text class="data-value">{{ ((apiData?.data.pigment_area_rate ?? 0) * 100).toFixed(2) }}%</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.pigmentAvgArea') }}</text>
            <!-- float: 各区域面积平均值（像素²）/ float: avg area in px² -->
            <text class="data-value">{{ (apiData?.data.pigment_avg_area ?? 0).toFixed(1) }}</text>
          </view>
        </view>

        <!-- 黑头 Blackhead -->
        <view class="data-card">
          <view class="data-card-title">
            <TablerIcon name="circle" :size="16" color="#1a1228" />
            <text>{{ t('skinResult.blackhead') }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.blackheadCount') }}</text>
            <!-- int: 独立区域数 / int: count of independent regions -->
            <text class="data-value">{{ apiData?.data.blackhead_count ?? 0 }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.blackheadDensity') }}</text>
            <!-- float: count/图像面积×10000，单位个/万像素 / float: count per 10000px² -->
            <text class="data-value">{{ (apiData?.data.blackhead_density ?? 0).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 油脂 Oil -->
        <view class="data-card">
          <view class="data-card-title">
            <TablerIcon name="droplet" :size="16" />
            <text>{{ t('skinResult.oil') }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.oilCount') }}</text>
            <!-- int: 独立区域数 / int: count of independent regions -->
            <text class="data-value">{{ apiData?.data.oil_count ?? 0 }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.oilDensity') }}</text>
            <!-- float: count/图像面积×10000，单位个/万像素 / float: count per 10000px² -->
            <text class="data-value">{{ (apiData?.data.oil_density ?? 0).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 敏感 Sensitive -->
        <view class="data-card">
          <view class="data-card-title">
            <TablerIcon name="heart" :size="16" color="#e0556b" />
            <text>{{ t('skinResult.sensitive') }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.sensitiveAreaRate') }}</text>
            <text class="data-value">{{ ((apiData?.data.sensitive_area_rate ?? 0) * 100).toFixed(2) }}%</text>
          </view>
        </view>

        <!-- 毛孔 Pore -->
        <view class="data-card">
          <view class="data-card-title">
            <TablerIcon name="circle" :size="16" color="#4da3f0" />
            <text>{{ t('skinResult.pore') }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.poreCount') }}</text>
            <text class="data-value">{{ apiData?.data.pore_count ?? 0 }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">{{ t('skinResult.poreDensity') }}</text>
            <text class="data-value">{{ (apiData?.data.pore_density ?? 0).toFixed(1) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 Bottom Buttons -->
    <view class="bottom-buttons">
      <button class="secondary-button" @click="handleRetakeScan">{{ t('skinResult.retakeScan') }}</button>
      <button class="primary-button" @click="handleExit">{{ t('skinResult.exit') }}</button>
    </view>

    <!-- 图片预览弹窗 Image Preview Modal -->
    <view class="image-preview-modal" v-if="showImagePreview" @click="closeImagePreview">
      <view class="preview-container" @click.stop>
        <view class="preview-close-btn" @click="closeImagePreview">
          <text class="close-icon">×</text>
        </view>
        <view class="preview-image-wrapper">
          <image class="preview-image" :src="previewImageUrl" mode="aspectFit" />
        </view>
      </view>
    </view>

  </view>
</template>

<style scoped>
/* ===== 全局布局 Global Layout ===== */
.skin-result {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
}

/* ===== 导航栏 Header ===== */
.header {
  background: white;
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.18);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  position: relative;
}

.header-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.back-button {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 24px;
  color: #7622FF;
}

/* ===== 标题区域 Title Section ===== */
.title-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.main-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 28px;
  line-height: 1.29;
}

.badge {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, #7622FF, #a855f7);
  border-radius: 14px;
}

.badge-text {
  font-family: 'Chivo', sans-serif;
  font-size: 12px;
  color: white;
  font-weight: 600;
}

/* ===== 综合评分卡 Score Card ===== */
.score-card {
  margin: 0 16px;
  background: linear-gradient(150.16deg, #848484 -29.98%, #D8D8D8 0.05%, #7D7D7D 19.53%, #454545 70.42%);
  border-radius: 8px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.score-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%);
  border-radius: 50%;
  transform: translate(-40px, -40px);
  pointer-events: none;
}

.score-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.score-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 18px;
  color: white;
  text-align: center;
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score-number {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 64px;
  line-height: 1.09;
  letter-spacing: -2px;
  color: #ffffff;
}

.score-out-of {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 18px;
  color: #e0e0e0;
}

.score-level-badge {
  border: 1.5px solid;
  border-radius: 20px;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.15);
}

.score-level-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 13px;
}

/* ===== 8项指标迷你卡 Metrics Overview ===== */
.metrics-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.metric-mini-card {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1.5px solid transparent;
  cursor: pointer;
}

.metric-mini-card--active {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.7);
}

.metric-mini-icon {
  font-size: 18px;
}

.metric-mini-label {
  font-size: 10px;
  color: #e0e0e0;
  font-weight: 600;
  text-align: center;
}

.metric-mini-score-bar {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.metric-mini-score-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.metric-mini-score-num {
  font-size: 11px;
  color: #ffffff;
  font-weight: 700;
}

/* ===== 指标分析区域 Breakdown Section ===== */
.breakdown-section {
  margin-top: 16px;
}

.section-header {
  padding: 0 16px 12px 16px;
}

.section-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 18px;
  display: block;
  margin-bottom: 4px;
}

.section-subtitle {
  font-family: 'Archivo', sans-serif;
  font-size: 12px;
  color: #7a7a7a;
  display: block;
}

/* ===== 详情卡片 Breakdown Card ===== */
.breakdown-card {
  margin: 0 16px 16px 16px;
  background: white;
  border-radius: 12px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-metric-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-metric-icon {
  font-size: 22px;
}

.card-metric-label {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 16px;
  flex: 1;
}

.card-metric-score-badge {
  border-radius: 14px;
  padding: 4px 12px;
}

.card-metric-score-text {
  color: white;
  font-weight: 700;
  font-size: 14px;
}

/* ===== 钟形曲线 Bell Curve ===== */
.chart-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bell-curve {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curve-container {
  position: relative;
  width: 100%;
}

.bell-curve-svg {
  width: 100%;
  height: 110px;
}

.percentile-badge {
  position: absolute;
  top: -6px;
  background: #7622FF;
  border-radius: 4px;
  padding: 2px 6px;
  min-width: 60px;
}

.percentile-text {
  font-size: 10px;
  color: white;
  font-weight: 700;
  white-space: nowrap;
}

.curve-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 4px;
}

.curve-label {
  font-size: 11px;
  color: #9ca3af;
}

/* ===== 原始数值 Raw Data ===== */
.raw-data-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 10px 14px;
}

.raw-data-label {
  font-size: 13px;
  color: #6b7280;
}

.raw-data-value {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 16px;
  color: #1f2937;
}

/* ===== 护肤建议 Suggestion ===== */
.suggestion-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #374151;
}

.suggestion-text {
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}

/* ===== 检测图像 Metric Image ===== */
.metric-image-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-image-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #374151;
}

.metric-image-wrapper {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  height: 180px;
  cursor: pointer;
}

.metric-image {
  width: 100%;
  height: 100%;
}

.metric-image-view-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 6px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.view-icon-text {
  font-size: 12px;
}

.view-text {
  font-size: 11px;
  color: white;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ===== 分组图片区域 Image Groups ===== */
.image-groups-section {
  margin-top: 16px;
}

.image-group {
  margin-bottom: 16px;
  padding: 0 16px;
}

.image-group-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #374151;
  margin-bottom: 10px;
  display: block;
}

.image-group-scroll {
  width: 100%;
}

.image-group-list {
  display: flex;
  gap: 10px;
  padding-bottom: 4px;
}

.image-group-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 90px;
}

.image-group-img-wrap {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  background: #e5e7eb;
}

.image-group-img {
  width: 100%;
  height: 100%;
}

.image-group-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 28px;
}

.image-group-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
  text-align: center;
}

.image-group-score-chip {
  border-radius: 10px;
  padding: 2px 10px;
}

.image-group-score-text {
  font-size: 11px;
  color: white;
  font-weight: 700;
}

/* ===== 数据概览 Data Overview ===== */
.data-overview-section {
  margin-top: 16px;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 16px;
}

.data-card {
  background: white;
  border-radius: 10px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.data-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: #1f2937;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-label {
  font-size: 11px;
  color: #9ca3af;
}

.data-value {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: #374151;
}

/* ===== 底部按钮 Bottom Buttons ===== */
.bottom-buttons {
  display: flex;
  gap: 12px;
  padding: 20px 16px;
  margin-top: 8px;
}

.secondary-button {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  background: white;
  border: 1.5px solid #d1d5db;
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-button {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, #7622FF, #a855f7);
  border: none;
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 图片预览弹窗 Image Preview Modal ===== */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container {
  position: relative;
  width: 90%;
  max-height: 80vh;
  background: #111;
  border-radius: 12px;
  overflow: hidden;
}

.preview-close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
}

.close-icon {
  color: white;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.preview-image-wrapper {
  width: 100%;
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  width: 100%;
  height: 60vh;
}
</style>
