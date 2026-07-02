 <script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function
};

const { t, locale } = useI18n();
const userStore = useUserStore();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import html2canvas from 'html2canvas';

const HEX_W = 230;
const HEX_H = 231;
const HEX_CX = 115;
const HEX_CY = 115.585;
const HEX_RADIUS = 72;
const DOWNLOAD_LINK = 'https://www.lushair.ai/getlushair/p/advanced-scalp-analysis-tool-lushair-scalp-scanner';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

const pushType = ref('0');
const recordId = ref(0);
// reportId相关变量 reportId related variables
const reportIdFromList = ref<string>(''); // 从列表传来的reportId reportId from list
const currentReportId = ref<string>(''); // 当前页面展示报告的reportId Current page report's reportId
const currentUserId = ref<string>(''); // 当前用户ID current user ID
const fromSource = ref(''); // 来源标识 Source identifier
// API 响应数据和状态
const analysisData = ref(null);
const loading = ref(false);
const error = ref('');

// 健康记录数据
const healthRecords = ref([]);
const chartWidth = ref('100%');
const trendChartScrollLeft = ref(0); // 趋势图表滚动位置 Trend chart scroll position

// 产品推荐数据
const products = ref<ProductItem[]>([]);
const showNoDataState = ref(false);
const aiLoadTimedOut = ref(false);

// 新版API相关
const useNewAnalysisMode = ref(true);
const analysisReport = ref(null);
const isAIAnalysisCalled = ref(false); // 防止AI分析接口重复调用 Prevent duplicate AI analysis calls
const isExistingReportCalled = ref(false); // 防止已有报告接口重复调用 Prevent duplicate existing report calls
// 运行时检测是否在 iOS Bundle (GCDWebServer) 环境下
// 特征：hostname 为 localhost 或 127.0.0.1（GCDWebServer 监听本地端口）
// Runtime detection: check if running in iOS Bundle (GCDWebServer) environment
// Indicator: hostname is localhost or 127.0.0.1 (GCDWebServer listens on local port)
const _isLocalBundle = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.protocol === 'file:');

// AI 服务器直连地址（离线 bundle 模式下使用，不走 nginx 代理）
// AI server direct URL (used in offline bundle mode, bypassing nginx proxy)
const _AI_SERVER_BASE = 'http://43.156.213.63:5011';
const _LOG_SERVER_BASE = 'http://115.159.42.189:5000';

// AI 接口 URL：
//   - 在线 H5：走 /ai-api/ 相对路径，由 nginx 代理转发
//   - iOS Bundle (localhost)：直连 AI 服务器（后端已开启 CORS）
// AI API URL:
//   - Online H5: use /ai-api/ relative path via nginx proxy
//   - iOS Bundle (localhost): direct connection (backend CORS enabled)
const _AI_API_BASE = (import.meta.env.VITE_AI_API_BASE as string) || (_isLocalBundle ? _AI_SERVER_BASE : '');
const AI_ANALYSIS_URL = _AI_API_BASE
  ? `${_AI_API_BASE}/api/v1/hair/analyze`
  : '/ai-api/api/v1/hair/analyze';

console.log('[Env] isLocalBundle:', _isLocalBundle, '| AI_ANALYSIS_URL:', AI_ANALYSIS_URL);

// 模拟数据
const hairScore = ref(74);
const improvement = ref(0);
const scanDate = ref('April 22, 2025 at 5:00 PM');
const hairLossLevel = ref(3);
const isQuickScan = ref(false); // 是否为快速扫描模式 Whether it is quick scan mode

// 头皮健康指标状态
const selectedScalpMetric = ref('oiliness'); // 默认选中油性

// 头皮健康指标配置
const scalpMetrics: ScalpMetric[] = [
  {
    id: 'oiliness',
    nameKey: 'advancedResult.oiliness',
    dataField: 'scalp_oil_area_score_map',
    standardRange: '0-15%',
    icon: '/static/icons/egg.svg',
    displayIcon: '/static/icons/egg_black.svg'
  },
  {
    id: 'dandruff',
    nameKey: 'advancedResult.dandruff',
    dataField: 'keratinocytes_score_map',
    standardRange: '0-3%',
    icon: '/static/icons/icon_dandruff.svg',
    displayIcon: '/static/icons/icon_dandruff_black.svg'
  },
  {
    id: 'sensitivity',
    nameKey: 'advancedResult.sensitivity',
    dataField: 'redness_area_score_map',
    standardRange: '0-15%',
    icon: '/static/icons/icon_sensitivity.svg',
    displayIcon: '/static/icons/icon_sensitivity_black.svg'
  }
];

// 头发焦点指标状态
const selectedHairMetric = ref('hairDensity'); // 默认选中头发密度

// 头发焦点指标配置
const hairMetrics: ScalpMetric[] = [
  {
    id: 'hairDensity',
    nameKey: 'advancedResult.hairDensity',
    dataField: 'hair_density_score_map',
    standardRange: '80fu/cm²',
    icon: '/static/icons/icon_density.svg',
    displayIcon: '/static/icons/icon_density_black.svg'
  },
  {
    id: 'hairRadius',
    nameKey: 'advancedResult.hairRadius',
    dataField: 'hair_max_rad_score_map',
    standardRange: '15-40μm',
    icon: '/static/icons/icon_hair_radius.svg',
    displayIcon: '/static/icons/icon_hair_radius_black.svg'
  },
  {
    id: 'greyHairs',
    nameKey: 'advancedResult.greyHairs',
    dataField: 'white_ratio_score_map',
    standardRange: '0-15%',
    icon: '/static/icons/icon_grey.svg',
    displayIcon: '/static/icons/icon_grey_black.svg'
  },
  {
    id: 'terminalVellusRatio',
    nameKey: 'advancedResult.terminalVellusRatio',
    dataField: 'terminal_vellus_ratio',
    standardRange: '4:1',
    icon: '/static/icons/icon_terminal.svg',
    displayIcon: '/static/icons/icon_terminal_black.svg'
  }
];

// 毛囊焦点指标状态
const selectedFollicleMetric = ref('follicleDensity'); // 默认选中毛囊密度

// 毛囊焦点指标配置
const follicleMetrics: ScalpMetric[] = [
  {
    id: 'follicleDensity',
    nameKey: 'advancedResult.follicleDensity',
    dataField: 'hair_density_score_map',
    standardRange: '80fu/cm²',
    icon: '/static/icons/icon_follicle_density.svg',
    displayIcon: '/static/icons/icon_follicle_density_black.svg'
  },
  {
    id: 'follicleRadius',
    nameKey: 'advancedResult.follicleRadius',
    dataField: 'hair_texture_score_map',
    standardRange: '15-40μm',
    icon: '/static/icons/icon_hair_radius.svg',
    displayIcon: '/static/icons/icon_hair_radius_black.svg'
  }
];

// 计算改进值
const calculateImprovement = () => {
  if (healthRecords.value && healthRecords.value.length >= 2) {
    // 获取最新的两个记录（正序排列，取最后两个）
    const latest = healthRecords.value[healthRecords.value.length - 1];
    const previous = healthRecords.value[healthRecords.value.length - 2];
    
    // 计算分数差值并转换为整数
    const latestScore = latest.scalpScore || 0;
    const previousScore = previous.scalpScore || 0;
    const difference = Math.floor(latestScore - previousScore);
    
    // 只有当差值大于0时才设置改进值
    improvement.value = difference > 0 ? difference : 0;
  } else {
    improvement.value = 0;
  }
};

// 获取当前选中指标的数据
const getCurrentScalpMetricData = computed(() => {
  const currentMetric = scalpMetrics.find(m => m.id === selectedScalpMetric.value);
  if (!currentMetric) return null;
  
  // 优先使用真实数据
  if (analysisData.value && (analysisData.value as any)[currentMetric.dataField]) {
    return (analysisData.value as any)[currentMetric.dataField];
  }
  
  // 如果没有真实数据，使用测试数据来验证功能（设置不同范围的值以便观察差异）
  const testData = {
    'scalp_oil_area_score_map': { 
      score: 0, // 在12-18%区间，应该约75百分位
      advice: '' 
    },
    'keratinocytes_score_map': { 
      score: 0, // 在1-2%区间，应该约55百分位
      advice: '' 
    },
    'redness_area_score_map': { 
      score: 0, // 在5-10%区间，应该约46百分位
      advice: '' 
    }
  };
  
  return (testData as any)[currentMetric.dataField] || null;
});

// 获取当前指标的分数值
const getCurrentScalpScore = computed(() => {
  const data = getCurrentScalpMetricData.value;
  return data?.score || 0;
});

// 获取当前指标的建议文本
const getCurrentScalpAdvice = computed(() => {
  if (useNewAnalysisMode.value) {
    // 新模式：优先使用 AI 分析报告
    if (analysisReport.value) {
      const metricMap: Record<string, string> = {
        'oiliness': 'oil_ratio',
        'dandruff': 'keratin_ratio',
        'sensitivity': 'sensitivity_ratio'
      };
      const reportKey = metricMap[selectedScalpMetric.value];
      if (reportKey && analysisReport.value.report && analysisReport.value.report[reportKey]) {
        return analysisReport.value.report[reportKey].root_cause.analysis;
      }
    }
    // 新模式下，如果报告还未返回，返回空字符串，让模板使用默认文本
    return '';
  }
  // 旧模式：使用现有数据
  const data = getCurrentScalpMetricData.value;
  return data?.advice || '';
});

// 获取当前指标的状态文本
const getCurrentScalpStatus = computed(() => {
  const metricId = selectedScalpMetric.value;
  switch (metricId) {
    case 'oiliness':
      return t('advancedResult.highOiliness');
    case 'dandruff':
      return t('advancedResult.highDandruff');
    case 'sensitivity':
      return t('advancedResult.highSensitivity');
    default:
      return '';
  }
});

// 获取当前指标的百分位数（根据score值计算）
const getCurrentPercentile = computed(() => {
  const score = getCurrentScalpScore.value;
  const metricId = selectedScalpMetric.value;
  
  // 调试信息
  console.log(`计算百分位数: ${metricId}, score: ${score}`);
  
  if (score === 0) return 50; // 默认50百分位
  
  let percentile = 50;
  
  switch (metricId) {
    case 'oiliness':
      // 油性分布：基于人群统计的合理分段
      // 0-3%: 极低油性 (5-15百分位)
      // 3-7%: 低油性 (15-35百分位)  
      // 7-12%: 正常 (35-65百分位)
      // 12-18%: 偏高 (65-85百分位)
      // 18%+: 高油性 (85-95百分位)
      if (score <= 3) {
        percentile = 5 + (score / 3) * 10;
      } else if (score <= 7) {
        percentile = 15 + ((score - 3) / 4) * 20;
      } else if (score <= 12) {
        percentile = 35 + ((score - 7) / 5) * 30;
      } else if (score <= 18) {
        percentile = 65 + ((score - 12) / 6) * 20;
      } else {
        percentile = 85 + Math.min(10, (score - 18) / 10 * 10);
      }
      break;
      
    case 'dandruff':
      // 头屑分布：基于角质细胞脱落程度
      // 0-0.5%: 极少 (5-20百分位)
      // 0.5-1%: 少量 (20-40百分位)
      // 1-2%: 正常 (40-70百分位)  
      // 2-3%: 偏多 (70-85百分位)
      // 3%+: 严重 (85-95百分位)
      if (score <= 0.5) {
        percentile = 5 + (score / 0.5) * 15;
      } else if (score <= 1) {
        percentile = 20 + ((score - 0.5) / 0.5) * 20;
      } else if (score <= 2) {
        percentile = 40 + ((score - 1) / 1) * 30;
      } else if (score <= 3) {
        percentile = 70 + ((score - 2) / 1) * 15;
      } else {
        percentile = 85 + Math.min(10, (score - 3) / 2 * 10);
      }
      break;
      
    case 'sensitivity':
      // 敏感性分布：基于红肿面积比例
      // 0-2%: 极低敏感 (5-15百分位)
      // 2-5%: 低敏感 (15-35百分位)
      // 5-10%: 正常 (35-65百分位)
      // 10-15%: 偏敏感 (65-85百分位)  
      // 15%+: 高敏感 (85-95百分位)
      if (score <= 2) {
        percentile = 5 + (score / 2) * 10;
      } else if (score <= 5) {
        percentile = 15 + ((score - 2) / 3) * 20;
      } else if (score <= 10) {
        percentile = 35 + ((score - 5) / 5) * 30;
      } else if (score <= 15) {
        percentile = 65 + ((score - 10) / 5) * 20;
      } else {
        percentile = 85 + Math.min(10, (score - 15) / 10 * 10);
      }
      break;
      
    default:
      percentile = 50;
  }
  
  const result = Math.round(Math.max(5, Math.min(95, percentile)));
  console.log(`${metricId} 百分位数结果: ${result}`);
  return result;
});

// 获取当前指标的图标（用于显示区域）
// Get current metric icon (for display section)
const getCurrentMetricIcon = computed(() => {
  const currentMetric = scalpMetrics.find(m => m.id === selectedScalpMetric.value);
  return currentMetric?.displayIcon || currentMetric?.icon || 'egg';
});

// 获取当前指标的名称
const getCurrentMetricName = computed(() => {
  const currentMetric = scalpMetrics.find(m => m.id === selectedScalpMetric.value);
  return t(currentMetric?.nameKey || 'advancedResult.oiliness');
});

// 点击指标按钮的处理函数
const selectScalpMetric = (metricId: string) => {
  console.log(`点击头皮指标: ${metricId}`);
  selectedScalpMetric.value = metricId;
  console.log(`当前选中头皮指标: ${selectedScalpMetric.value}`);
};

// 头发指标相关函数
// 获取当前选中头发指标的数据
const getCurrentHairMetricData = computed(() => {
  const currentMetric = hairMetrics.find(m => m.id === selectedHairMetric.value);
  if (!currentMetric) return null;
  
  // 优先使用真实数据
  if (currentMetric.id === 'terminalVellusRatio') {
    const terminalMap = (analysisData.value as any)?.terminal_hair_rate_map;
    const vellusMap = (analysisData.value as any)?.velveolus_hair_rate_map;
    
    // 如果terminal_hair_rate_map或velveolus_hair_rate_map取值为null，或者terminal_hair_rate_map和velveolus_hair_rate_map的值都为0
    if (!terminalMap || !vellusMap || (terminalMap.score === 0 && vellusMap.score === 0)) {
       return { score: 0, advice: '', display: 'No Data' };
    }
    
    const tScore = terminalMap.score || 0;
    const vScore = vellusMap.score || 0;
    
    // 计算终毛百分比 Calculate terminal hair percentage
    // 如果是1:0的情况(即vScore为0)，则percentage为100 If 1:0 case (vScore is 0), percentage is 100
    // 如果是4:1的情况，则percentage为80 (4/5 * 100) If 4:1 case, percentage is 80
    const total = tScore + vScore;
    const percentage = total > 0 ? (tScore / total * 100) : 0;
    
    return {
      score: percentage, // 使用计算后的百分比作为分数 Use calculated percentage as score
      advice: terminalMap.advice || '',
      display: `${Math.round(tScore)}:${Math.round(vScore)}`
    };
  }

  if (analysisData.value && (analysisData.value as any)[currentMetric.dataField]) {
    return (analysisData.value as any)[currentMetric.dataField];
  }
  
  // 如果没有真实数据，使用测试数据来验证功能
  const testData = {
    'hair_density_score_map': { 
      score: 0, // 低于80标准，应该约30百分位
      advice: '' 
    },
    'hair_max_rad_score_map': { 
      score: 0, // 在15-40区间，应该约60百分位
      advice: '' 
    },
    'white_ratio_score_map': { 
      score: 0, // 在0-15%区间，应该约70百分位
      advice: '' 
    },
    'terminal_vellus_ratio': {
      score: 0,
      advice: '',
      display: 'No Data'
    }
  };
  
  return (testData as any)[currentMetric.dataField] || null;
});

// 获取当前头发指标的显示值
const getCurrentHairDisplayValue = computed(() => {
  const data = getCurrentHairMetricData.value;
  if (selectedHairMetric.value === 'terminalVellusRatio') {
    return data?.display || 'No Data';
  }
  return (data?.score || 0).toFixed(2);
});

// 获取当前头发指标的单位
const getCurrentHairUnit = computed(() => {
  if (selectedHairMetric.value === 'terminalVellusRatio') return '';
  if (selectedHairMetric.value === 'hairDensity') return 'fu/cm²';
  if (selectedHairMetric.value === 'hairRadius') return 'μm';
  return '%';
});

// 获取当前头发指标的分数值
const getCurrentHairScore = computed(() => {
  const data = getCurrentHairMetricData.value;
  return data?.score || 0;
});

// 获取当前头发指标的建议文本
const getCurrentHairAdvice = computed(() => {
  if (useNewAnalysisMode.value) {
    // 新模式：优先使用 AI 分析报告
    if (analysisReport.value) {
      const metricMap: Record<string, string> = {
        'hairDensity': 'follicle_density',
        'hairRadius': 'hair_radius', 
        'greyHairs': '' // 接口似乎没有直接对应白发比例的分析，或需确认
      };
      const reportKey = metricMap[selectedHairMetric.value];
      if (reportKey && analysisReport.value.report && analysisReport.value.report[reportKey]) {
        return analysisReport.value.report[reportKey].root_cause.analysis;
      }
    }
    // 新模式下，如果报告还未返回，返回空字符串，让模板使用默认文本
    return '';
  }
  // 旧模式：使用现有数据
  const data = getCurrentHairMetricData.value;
  return data?.advice || '';
});

// 获取当前头发指标的状态文本
const getCurrentHairStatus = computed(() => {
  const metricId = selectedHairMetric.value;
  switch (metricId) {
    case 'hairDensity':
      return t('advancedResult.lowDensity');
    case 'hairRadius':
      return t('advancedResult.hairRadius');
    case 'greyHairs':
      return t('advancedResult.greyHairs');
    case 'terminalVellusRatio':
      return 'Ratio'; // 或者其他状态描述
    default:
      return '';
  }
});

// 获取当前头发指标的百分位数
const getCurrentHairPercentile = computed(() => {
  const score = getCurrentHairScore.value;
  const metricId = selectedHairMetric.value;
  
  console.log(`计算头发百分位数: ${metricId}, score: ${score}`);
  
  if (score === 0) return 50;
  
  let percentile = 50;
  
  switch (metricId) {
    case 'hairDensity':
      // 头发密度分布：基于80fu/cm²标准
      // 0-40: 极低密度 (5-15百分位)
      // 40-60: 低密度 (15-35百分位)
      // 60-80: 偏低 (35-65百分位)
      // 80-100: 正常 (65-85百分位)
      // 100+: 高密度 (85-95百分位)
      if (score <= 40) {
        percentile = 5 + (score / 40) * 10;
      } else if (score <= 60) {
        percentile = 15 + ((score - 40) / 20) * 20;
      } else if (score <= 80) {
        percentile = 35 + ((score - 60) / 20) * 30;
      } else if (score <= 100) {
        percentile = 65 + ((score - 80) / 20) * 20;
      } else {
        percentile = 85 + Math.min(10, (score - 100) / 50 * 10);
      }
      break;
      
    case 'hairRadius':
      // 头发半径分布：基于15-40μm标准
      // 0-15: 极细 (5-20百分位)
      // 15-25: 细 (20-40百分位)
      // 25-35: 正常 (40-70百分位)
      // 35-45: 粗 (70-85百分位)
      // 45+: 极粗 (85-95百分位)
      if (score <= 15) {
        percentile = 5 + (score / 15) * 15;
      } else if (score <= 25) {
        percentile = 20 + ((score - 15) / 10) * 20;
      } else if (score <= 35) {
        percentile = 40 + ((score - 25) / 10) * 30;
      } else if (score <= 45) {
        percentile = 70 + ((score - 35) / 10) * 15;
      } else {
        percentile = 85 + Math.min(10, (score - 45) / 20 * 10);
      }
      break;
      
    case 'greyHairs':
      // 白发比例分布：基于0-15%标准
      // 0-3%: 极少 (5-25百分位)
      // 3-7%: 少量 (25-50百分位)
      // 7-12%: 中等 (50-75百分位)
      // 12-18%: 较多 (75-90百分位)
      // 18%+: 很多 (90-95百分位)
      if (score <= 3) {
        percentile = 5 + (score / 3) * 20;
      } else if (score <= 7) {
        percentile = 25 + ((score - 3) / 4) * 25;
      } else if (score <= 12) {
        percentile = 50 + ((score - 7) / 5) * 25;
      } else if (score <= 18) {
        percentile = 75 + ((score - 12) / 6) * 15;
      } else {
        percentile = 90 + Math.min(5, (score - 18) / 10 * 5);
      }
      break;

    case 'terminalVellusRatio':
      // 终毛比例分布：越高越好
      // 假设80%以上为优秀
      // 0-40%: 极差 (5-15百分位)
      // 40-60%: 差 (15-35百分位)
      // 60-80%: 一般 (35-65百分位)
      // 80-90%: 良好 (65-85百分位)
      // 90%+: 优秀 (85-95百分位)
      if (score <= 40) {
        percentile = 5 + (score / 40) * 10;
      } else if (score <= 60) {
        percentile = 15 + ((score - 40) / 20) * 20;
      } else if (score <= 80) {
        percentile = 35 + ((score - 60) / 20) * 30;
      } else if (score <= 90) {
        percentile = 65 + ((score - 80) / 10) * 20;
      } else {
        percentile = 85 + Math.min(10, (score - 90) / 10 * 10);
      }
      break;
      
    default:
      percentile = 50;
  }
  
  const result = Math.round(Math.max(5, Math.min(95, percentile)));
  console.log(`${metricId} 头发百分位数结果: ${result}`);
  return result;
});

// 获取当前头发指标的图标（用于显示区域）
// Get current hair metric icon (for display section)
const getCurrentHairMetricIcon = computed(() => {
  const currentMetric = hairMetrics.find(m => m.id === selectedHairMetric.value);
  return currentMetric?.displayIcon || currentMetric?.icon || 'wave-sine';
});

// 获取当前头发指标的名称
const getCurrentHairMetricName = computed(() => {
  const currentMetric = hairMetrics.find(m => m.id === selectedHairMetric.value);
  if (currentMetric?.id === 'terminalVellusRatio') return 'Terminal-Vellus Ratio';
  return t(currentMetric?.nameKey || 'advancedResult.hairDensity');
});

// 点击头发指标按钮的处理函数
const selectHairMetric = (metricId: string) => {
  console.log(`点击头发指标: ${metricId}`);
  selectedHairMetric.value = metricId;
  console.log(`当前选中头发指标: ${selectedHairMetric.value}`);
};

// 毛囊指标相关函数
// 获取当前选中毛囊指标的数据
const getCurrentFollicleMetricData = computed(() => {
  const currentMetric = follicleMetrics.find(m => m.id === selectedFollicleMetric.value);
  if (!currentMetric) return null;
  
  // 优先使用真实数据
  if (analysisData.value && (analysisData.value as any)[currentMetric.dataField]) {
    return (analysisData.value as any)[currentMetric.dataField];
  }
  
  // 如果没有真实数据，使用测试数据来验证功能
  const testData = {
    'follicle_score_map': { 
      score: 0, // 在1.5-2.5发/囊区间，应该约64百分位
      advice: '' 
    }
  };
  
  return (testData as any)[currentMetric.dataField] || null;
});

// 获取当前毛囊指标的分数值
const getCurrentFollicleScore = computed(() => {
  const data = getCurrentFollicleMetricData.value;
  return data?.score || 0;
});

// 获取当前毛囊指标的建议文本
const getCurrentFollicleAdvice = computed(() => {
  if (useNewAnalysisMode.value) {
    // 新模式：优先使用 AI 分析报告
    if (analysisReport.value) {
      const metricMap: Record<string, string> = {
        'follicleDensity': 'follicle_density',
        'follicleRadius': 'hair_radius'
      };
      const reportKey = metricMap[selectedFollicleMetric.value];
      if (reportKey && analysisReport.value.report && analysisReport.value.report[reportKey]) {
        return analysisReport.value.report[reportKey].root_cause.analysis;
      }
    }
    // 新模式下，如果报告还未返回，返回空字符串，让模板使用默认文本
    return '';
  }
  // 旧模式：使用现有数据
  const data = getCurrentFollicleMetricData.value;
  return data?.advice || '';
});

// 获取当前毛囊指标的状态文本
const getCurrentFollicleStatus = computed(() => {
  const metricId = selectedFollicleMetric.value;
  switch (metricId) {
    case 'follicleDensity':
      return t('advancedResult.follicleDensity');
    case 'follicleRadius':
      return t('advancedResult.follicleRadius');
    default:
      return '';
  }
});

const getCurrentFollicleDisplayValue = computed(() => {
  const data = getCurrentFollicleMetricData.value;
  return (data?.score || 0).toFixed(2);
});

const getCurrentFollicleUnit = computed(() => {
  if (selectedFollicleMetric.value === 'follicleDensity') return 'fu/cm²';
  if (selectedFollicleMetric.value === 'follicleRadius') return 'μm';
  return '';
});

// 获取当前毛囊指标的百分位数
const getCurrentFolliclePercentile = computed(() => {
  const score = getCurrentFollicleScore.value;
  const metricId = selectedFollicleMetric.value;
  
  console.log(`计算毛囊百分位数: ${metricId}, score: ${score}`);
  
  if (score === 0) return 50;
  
  let percentile = 50;
  
  switch (metricId) {
    case 'follicleDensity':
      if (score <= 50) {
        percentile = 5 + (score / 50) * 20;
      } else if (score <= 80) {
        percentile = 25 + ((score - 50) / 30) * 35;
      } else if (score <= 100) {
        percentile = 60 + ((score - 80) / 20) * 30;
      } else {
        percentile = 90;
      }
      break;

    case 'follicleRadius':
      if (score <= 15) {
        percentile = 5 + (score / 15) * 20;
      } else if (score <= 27.5) {
        percentile = 25 + ((score - 15) / 12.5) * 35;
      } else if (score <= 40) {
        percentile = 60 + ((score - 27.5) / 12.5) * 30;
      } else {
        percentile = 90;
      }
      break;
      
    default:
      percentile = 50;
  }
  
  const result = Math.round(Math.max(5, Math.min(95, percentile)));
  console.log(`${metricId} 毛囊百分位数结果: ${result}`);
  return result;
});

// 获取当前毛囊指标的图标（用于显示区域）
// Get current follicle metric icon (for display section)
const getCurrentFollicleMetricIcon = computed(() => {
  const currentMetric = follicleMetrics.find(m => m.id === selectedFollicleMetric.value);
  return currentMetric?.displayIcon || currentMetric?.icon || 'scan';
});

// 获取当前毛囊指标的名称
const getCurrentFollicleMetricName = computed(() => {
  const currentMetric = follicleMetrics.find(m => m.id === selectedFollicleMetric.value);
  return t(currentMetric?.nameKey || 'advancedResult.follicleDensity');
});

// 点击毛囊指标按钮的处理函数
const selectFollicleMetric = (metricId: string) => {
  console.log(`点击毛囊指标: ${metricId}`);
  selectedFollicleMetric.value = metricId;
  console.log(`当前选中毛囊指标: ${selectedFollicleMetric.value}`);
};

// 生成钟形曲线路径
const getBellCurvePath = (isFilled: boolean) => {
  const width = 311;
  const height = 110;
  const centerX = width / 2;
  const centerY = height - 20; // 底部留20px空间
  const amplitude = 65; // 曲线高度 - 增加高度使山峰更凸起
  const spread = 70; // 曲线宽度控制
  
  let path = '';
  const points = [];
  
  // 生成钟形曲线的点，使用更密集的采样
  for (let x = 0; x <= width; x += 1) {
    // 使用高斯函数生成钟形曲线
    const normalizedX = (x - centerX) / spread;
    const y = centerY - amplitude * Math.exp(-0.5 * normalizedX * normalizedX);
    points.push({ x, y });
  }
  
  // 构建平滑的SVG路径
  if (points.length > 0) {
    path = `M ${points[0].x} ${points[0].y}`;
    
    // 使用三次贝塞尔曲线创建更平滑的曲线
    for (let i = 1; i < points.length - 2; i += 3) {
      const p1 = points[i];
      const p2 = points[Math.min(i + 1, points.length - 1)];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      
      path += ` C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
    }
    
    // 处理剩余的点
    for (let i = points.length - (points.length % 3); i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // 如果是填充区域，闭合路径到底部
    if (isFilled) {
      const lastPoint = points[points.length - 1];
      path += ` L ${lastPoint.x} ${centerY} L ${points[0].x} ${centerY} Z`;
    }
  }
  
  return path;
};

// 计算钟形曲线上某个x位置的y值
const getBellCurveY = (x: number) => {
  const width = 311;
  const centerX = width / 2;
  const centerY = 90; // 底部位置
  const amplitude = 65; // 与曲线生成保持一致
  const spread = 70;
  
  const normalizedX = (x - centerX) / spread;
  return centerY - amplitude * Math.exp(-0.5 * normalizedX * normalizedX);
};

// 根据百分位数计算用户标记位置（头皮健康）
const getUserMarkerPosition = computed(() => {
  const percentile = getCurrentPercentile.value;
  const width = 311;
  const centerX = width / 2;
  const spread = 70;
  
  // 将百分位数转换为标准正态分布的z值
  // 使用逆正态分布函数近似
  const z = approximateInverseNormal(percentile / 100);
  
  // 将z值映射到曲线的x位置
  const x = centerX + z * spread * 0.6; // 0.6是调整因子，使标记位置更合理
  
  // 确保x在有效范围内
  return Math.max(20, Math.min(291, x));
});

// 根据百分位数计算头发指标用户标记位置
const getHairUserMarkerPosition = computed(() => {
  const percentile = getCurrentHairPercentile.value;
  const width = 311;
  const centerX = width / 2;
  const spread = 70;
  
  // 将百分位数转换为标准正态分布的z值
  const z = approximateInverseNormal(percentile / 100);
  
  // 将z值映射到曲线的x位置
  const x = centerX + z * spread * 0.6;
  
  // 确保x在有效范围内
  return Math.max(20, Math.min(291, x));
});

// 根据百分位数计算毛囊指标用户标记位置
const getFollicleUserMarkerPosition = computed(() => {
  const percentile = getCurrentFolliclePercentile.value;
  const width = 311;
  const centerX = width / 2;
  const spread = 70;
  
  // 将百分位数转换为标准正态分布的z值
  const z = approximateInverseNormal(percentile / 100);
  
  // 将z值映射到曲线的x位置
  const x = centerX + z * spread * 0.6;
  
  // 确保x在有效范围内
  return Math.max(20, Math.min(291, x));
});

// 近似逆正态分布函数（用于将百分位数转换为z值）
const approximateInverseNormal = (p: number) => {
  // 使用Beasley-Springer-Moro算法的简化版本
  if (p <= 0) return -3;
  if (p >= 1) return 3;
  if (p === 0.5) return 0;
  
  // 对于p < 0.5，使用对称性
  const sign = p < 0.5 ? -1 : 1;
  const q = p < 0.5 ? p : 1 - p;
  
  // 近似计算
  const t = Math.sqrt(-2 * Math.log(q));
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / 
            (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  
  return sign * z;
};

// 扫描位置数据
const scanPositions = ref([
  'foreheadLeft',
  'foreheadMiddle', 
  'foreheadRight',
  'sideburnsLeft',
  'sideburnsRight',
  'topOfHead',
  'backOfHead'
]);

// 接口类型定义
interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
}

interface ScalpMetric {
  id: string;
  nameKey: string;
  dataField: string;
  standardRange: string;
  icon: string;
  displayIcon?: string;
}

interface RecommendedProduct {
  type: string; // e.g., PRE_WASH, SHAMPOO
  typeDesc: string;
  productId: number;
  productTitle: string;
  productDesc: string | null;
  productUrl: string;
}

// 静态产品推荐数据（作为后备）
const productRecommendations = ref([
]);

const getProductTypeIcon = (type: string) => {
  const icons = {
    preWash: 'bath',
    shampoo: 'bath',
    conditioner: 'egg',
    serum: 'flask',
    hairMask: 'color-filter'
  };
  return icons[type as keyof typeof icons] || 'package';
};

const getProductTypeName = (type: string) => {
  return t(`advancedResult.${type}`);
};

// 获取产品名称键
const getProductNameKey = (product: any) => {
  // 如果是静态数据，使用 nameKey
  if (product.nameKey) {
    return product.nameKey;
  }
  // 如果是接口数据，根据 type 映射到对应的翻译键
  const typeToNameKeyMap: Record<string, string> = {
    'preWash': 'hairOil',
    'shampoo': 'shampoo',
    'conditioner': 'conditioner',
    'serum': 'serum',
    'hairMask': 'hairMask',
    'finasteride': 'finasteride'
  };
  return typeToNameKeyMap[product.type] || product.type;
};

const buildLegacySmartSummary = () => {
  const oil = analysisData.value?.scalp_oil_area_score_map?.grade;
  const scurfOrKeratin = analysisData.value?.scurf_area_score_map?.grade;
  const hairLoss = analysisData.value?.follicle_score_map?.grade;
  const discomfort = analysisData.value?.redness_area_score_map?.grade;
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
    return t('advancedResult.summaryFallback');
  }
  return result;
};

// 获取summary文本内容（多语言组合逻辑）
const getSmartSummaryText = () => {
  if (useNewAnalysisMode.value) {
    if (analysisReport.value?.actionable_plan?.advice) {
      const adviceList = analysisReport.value.actionable_plan.advice;
      if (Array.isArray(adviceList) && adviceList.length > 0) {
        return adviceList.join('\n');
      }
    }
    if (!analysisReport.value && !aiLoadTimedOut.value && !showNoDataState.value) {
      return t('advancedResult.analyzingProfile');
    }
    return buildLegacySmartSummary();
  }
  return buildLegacySmartSummary();
};

const trendRecords = computed(() => {
  if (healthRecords.value.length > 0) return healthRecords.value;
  if (analysisData.value?.scalpScore != null) {
    return [{
      scalpScore: analysisData.value.scalpScore,
      createTime: analysisData.value.createTime || ''
    }];
  }
  return [];
});

const getMetricFieldScore = (dataField: string): string => {
  const data = (analysisData.value as any)?.[dataField];
  if (!data) return '';
  if (dataField === 'terminal_vellus_ratio') {
    return data.display || (data.score != null ? String(Math.round(Number(data.score))) : '');
  }
  if (data.score !== 0 && !data.score) return '';
  const score = Number(data.score);
  return Number.isFinite(score) ? String(Math.round(score)) : '';
};

const radarAxisLabels = computed(() => [
  { label: t('advancedResult.follicle'), score: getMetricFieldScore('follicle_score_map'), style: 'top:-6px;left:-4px', class: '' },
  { label: t('advancedResult.hairDensity'), score: getMetricFieldScore('hair_density_score_map'), style: 'top:-6px;right:-4px', class: '' },
  { label: t('advancedResult.hairRadius'), score: getMetricFieldScore('hair_max_rad_score_map'), style: 'top:50%;left:-60px;transform:translateY(-50%)', class: 'rp-hex-label-vertical' },
  { label: t('advancedResult.keratin'), score: getMetricFieldScore('keratinocytes_score_map'), style: 'bottom:-10px;right:36px', class: '' },
  { label: t('advancedResult.oiliness'), score: getMetricFieldScore('scalp_oil_area_score_map'), style: 'bottom:-10px;left:36px', class: '' },
  { label: t('advancedResult.sensitivity'), score: getMetricFieldScore('redness_area_score_map'), style: 'top:50%;right:-55px;transform:translateY(-50%)', class: 'rp-hex-label-vertical' }
]);

// 分享卡片专用标签（使用view元素，保持两行布局）
const radarAxisLabelsForShare = computed(() => [
  { label: t('advancedResult.follicle'), score: getMetricFieldScore('follicle_score_map'), style: 'top:-6px;left:-4px', class: '' },
  { label: t('advancedResult.hairDensity'), score: getMetricFieldScore('hair_density_score_map'), style: 'top:-6px;right:-4px', class: '' },
  { label: t('advancedResult.hairRadius'), score: getMetricFieldScore('hair_max_rad_score_map'), style: 'top:50%;left:-60px;transform:translateY(-50%)', class: 'rp-hex-label-vertical' },
  { label: t('advancedResult.keratin'), score: getMetricFieldScore('keratinocytes_score_map'), style: 'bottom:-10px;right:36px', class: '' },
  { label: t('advancedResult.oiliness'), score: getMetricFieldScore('scalp_oil_area_score_map'), style: 'bottom:-10px;left:36px', class: '' },
  { label: t('advancedResult.sensitivity'), score: getMetricFieldScore('redness_area_score_map'), style: 'top:50%;right:-55px;transform:translateY(-50%)', class: 'rp-hex-label-vertical' }
]);

const shareGridMetrics = [
  { nameKey: 'advancedResult.oiliness', dataField: 'scalp_oil_area_score_map', icon: 'egg' },
  { nameKey: 'advancedResult.dandruff', dataField: 'keratinocytes_score_map', icon: 'dandruff' },
  { nameKey: 'advancedResult.sensitivity', dataField: 'redness_area_score_map', icon: 'sensitivity' },
  { nameKey: 'advancedResult.hairDensity', dataField: 'hair_density_score_map', icon: 'density' },
  { nameKey: 'advancedResult.hairRadius', dataField: 'hair_max_rad_score_map', icon: 'hair_radius' },
  { nameKey: 'advancedResult.greyHairs', dataField: 'white_ratio_score_map', icon: 'grey' },
  { nameKey: 'advancedResult.terminalVellusRatio', dataField: 'terminal_vellus_ratio', icon: 'terminal' },
  { nameKey: 'advancedResult.follicleDensity', dataField: 'follicle_score_map', icon: 'follicle_density' }
];

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

// 格式化时间显示
const formatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  
  try {
    // 解析 "2025-05-09 15:25" 格式
    const [datePart, timePart] = dateTimeStr.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    
    // 创建Date对象
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    
    // 月份名称数组
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // 格式化时间为12小时制
    let displayHour = parseInt(hour);
    const ampm = displayHour >= 12 ? 'PM' : 'AM';
    displayHour = displayHour % 12;
    displayHour = displayHour ? displayHour : 12; // 0点显示为12点
    
    // 返回格式化后的字符串
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year} at ${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  } catch (error) {
    console.error('时间格式化错误:', error);
    return dateTimeStr; // 如果格式化失败，返回原始字符串
  }
};

// Determine specific error reason for failed loading
const getSpecificErrorMessage = (err: any): string => {
  const msg = (err?.message || err?.errMessage || err?.errMsg || '').toLowerCase();
  const code = err?.statusCode || err?.code || err?.errno || '';
  const data = err?.data || err?.response?.data || {};
  const reason = (data?.reason || data?.error || data?.errorCode || '').toLowerCase();

  // Network / connectivity errors — check first since they're the most common
  if (!navigator.onLine ||
      msg.includes('timeout') || msg.includes('network') || msg.includes('econnrefused') ||
      msg.includes('econnaborted') || msg.includes('enotfound') || msg.includes('abort') ||
      msg.includes('request:fail') || msg.includes('request fail') ||
      code === 'ECONNABORTED' || code === 'ERR_NETWORK' ||
      /^(0|5\d{2})$/.test(String(err?.statusCode || ''))) {
    return t('advancedResult.errorNetwork');
  }
  // Blurry / low-quality image
  if (msg.includes('blur') || msg.includes('quality') || msg.includes('unclear') || msg.includes('模糊') ||
      reason.includes('blur') || reason.includes('quality') || reason.includes('low_quality') ||
      data?.imageQuality === 'low' || data?.blurScore > 0) {
    return t('advancedResult.errorBlurryImage');
  }
  // No follicle / scalp not detected
  if (msg.includes('follicle') || msg.includes('no_detection') || msg.includes('not_found') || msg.includes('毛囊') ||
      msg.includes('no scalp') || msg.includes('unrecognized') ||
      reason.includes('follicle') || reason.includes('no_detection') || reason.includes('not_detected') ||
      data?.detectionResult === 'none' || data?.follicleCount === 0) {
    return t('advancedResult.errorNoFollicle');
  }
  // Fallback
  return t('advancedResult.fetchDataFailed') || 'Failed to fetch data';
};

// Show error as a modal popup with the specific reason
const showErrorPopup = (err: any, opts?: { silent?: boolean }) => {
  const message = getSpecificErrorMessage(err);
  if (!opts?.silent) {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    });
  }
  return message;
};

/** Prefer URL param, then saved currentUserId, then userStore */
const resolveUserId = (override?: string): string =>
  override || currentUserId.value || userStore.userInfo?.userId || '';

const captureAndShareImage = () => {
  const score = Math.round(analysisData.value?.scalpScore || 0);
  const shareText = `My hair health score is ${score}/100! Check yours with Lushair.`;

  uni.showLoading({ title: t('advancedResult.generatingImage') });

  setTimeout(() => {
    drawHexagon();
    const element = document.querySelector('.rp-share-card') as HTMLElement | null;
    if (!element) {
      uni.hideLoading();
      uni.showToast({ title: t('advancedResult.pageNotReady'), icon: 'none' });
      return;
    }

    // 克隆元素并临时移入可视区域，以解决 html2canvas 在部分移动端（如 iOS）截取 fixed/offscreen 元素时的视口偏移和截屏错乱问题
    // Clone element and temporarily move it into viewport to solve viewport offset and capture corruption issues with html2canvas on mobile (e.g. iOS) when capturing fixed/offscreen elements
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = element.offsetWidth + 'px';
    clone.style.height = element.offsetHeight + 'px';
    clone.style.zIndex = '-9999';
    clone.style.visibility = 'visible';
    clone.style.display = 'block';
    document.body.appendChild(clone);

    html2canvas(clone, {
      useCORS: true,
      allowTaint: false, // 禁用 taint 以防止 Canvas 污染导致 iOS 导出报错 / Disable taint to prevent Canvas contamination causing export errors on iOS
      scale: 2,
      backgroundColor: '#ebebeb',
      width: element.offsetWidth,
      height: element.offsetHeight,
      scrollX: 0,
      scrollY: 0
    }).then((canvas) => {
      // 移除克隆元素 / Remove clone element
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      uni.hideLoading();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'lushair-result.png', { type: 'image/png' });
        const dataUrl = canvas.toDataURL('image/png');
        const ua = navigator.userAgent;
        const isiOS = /\(i[^;]+;( U;)? CPU.+Mac OS X/.test(ua);
        const isAndroid = ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1;
        if (isiOS && (window as any).webkit?.messageHandlers?.savePassportImage) {
          (window as any).webkit.messageHandlers.savePassportImage.postMessage({ action: 'savePassportImage', imageData: dataUrl });
          uni.showToast({ title: t('advancedResult.imageSent'), icon: 'success' });
          return;
        }
        if (isAndroid && (window as any).android?.savePassportImage) {
          (window as any).android.savePassportImage(dataUrl);
          uni.showToast({ title: t('advancedResult.imageSent'), icon: 'success' });
          return;
        }
        // @ts-ignore
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await (navigator as any).share({ files: [file], title: 'Lushair - Hair Health Results', text: shareText });
            return;
          } catch { /* user cancelled */ }
        }
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'lushair-result.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        uni.showToast({ title: t('advancedResult.imageDownloaded'), icon: 'success' });
      }, 'image/png');
    }).catch((err: Error) => {
      // 移除克隆元素 / Remove clone element
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      uni.hideLoading();
      uni.showToast({ title: err.message, icon: 'none' });
    });
  }, 400);
};

const shareResults = () => captureAndShareImage();

const handleShareDownloadLink = () => captureAndShareImage();

// 获取分析历史数据
const fetchAnalysisHistory = async (userId?: string) => {
  const effectiveUserId = resolveUserId(userId);
  if (!effectiveUserId) {
    console.error('用户ID不存在，无法加载毛囊镜记录');
    showErrorPopup({ message: 'User not logged in' });
    return;
  }
  if (!recordId.value || Number.isNaN(recordId.value)) {
    console.error('recordId 无效:', recordId.value);
    showErrorPopup({ message: 'Invalid record id' });
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    console.log('调用 analyse/goHis API，参数:', {
      userId: effectiveUserId,
      recordId: recordId.value,
    });

    const response = await post(
      'analyse/goHis',
      {
        userId: effectiveUserId,
        recordId: recordId.value,
      },
      { timeout: 30000 },
    );

    console.log('analyse/goHis API 响应:', response);
    analysisData.value = response;
  } catch (err: any) {
    console.error('获取分析历史数据失败:', err);
    error.value = err;
    showErrorPopup(err);
  } finally {
    loading.value = false;
  }
};

// 获取健康度数据 - 参考 analysis/index.vue 的 fetchHealthData 方法
const fetchHealthData = async (userId: string) => {
  try {
    let response: any;
    
    // 根据用户类型调用不同的API
    if ((userStore.userInfo as any)?.type === 1) {
      response = await post('user/getMerchantDetectionRecordList', { merchantId: userId });
    } else {
      response = await post('user/getDetectionRecordList', { userId });
    }
    
    console.log('健康度数据响应:', response);
    
    // 检查响应状态
    if (response && (response as any).list && (response as any).list.length > 0) {
      healthRecords.value = (response as any).list;
      
      const listLength = (response as any).list.length;
      chartWidth.value = Math.max(listLength * 80 + 40, 200) + 'px';
      
      // 计算改进值 Calculate improvement
      calculateImprovement();
      
      // 延迟滚动到最新日期（最右边）Scroll to latest date (rightmost) after delay
      setTimeout(() => {
        // 计算滚动位置：图表总宽度 - 可视区域宽度（大约300px）
        // Calculate scroll position: chart total width - visible area width (approx 300px)
        const scrollPosition = Math.max(0, listLength * 80 + 40 - 300);
        trendChartScrollLeft.value = scrollPosition;
        console.log('趋势图表自动滚动到位置 Auto scroll trend chart to position:', scrollPosition);
      }, 300);
      
      console.log('健康记录数据已更新:', healthRecords.value);
    } else if (analysisData.value?.scalpScore != null) {
      healthRecords.value = [{
        scalpScore: analysisData.value.scalpScore,
        createTime: analysisData.value.createTime || ''
      }] as any;
      chartWidth.value = '200px';
    }
    
    return response;
  } catch (error) {
    console.error('获取健康度数据失败:', error);
    return null;
  }
};

// 调用AI分析API
const fetchAIAnalysis = async (userId: string) => {
  // 防止重复调用 Prevent duplicate calls
  if (isAIAnalysisCalled.value) {
    console.log('AI分析接口已经调用过,跳过重复调用 AI analysis already called, skipping duplicate call');
    return;
  }
  
  try {
    if (!analysisData.value) return;
    
    // 设置标志,防止重复调用 Set flag to prevent duplicate calls
    isAIAnalysisCalled.value = true;

    // 准备metrics数据
    // avg_hair_count -> follicle_score_map.score
    // hair_radius -> hair_max_rad_score_map.score
    // follicle_density -> hair_density_score_map.score
    // keratin_ratio -> keratinocytes_score_map.score
    // sensitivity_ratio -> redness_area_score_map.score
    // oil_ratio -> scalp_oil_area_score_map.score (推断)
    
    // 获取gender并转换 (1->Male, 2->Female)
    let gender = 'Male';
    const rawGender = userStore.userInfo?.gender || analysisData.value?.gender || 1;
    if (rawGender == 2 || String(rawGender).toLowerCase() === 'female') {
      gender = 'Female';
    }

    const payload = {
      userId: userId,
      gender: gender,
      age: userStore.userInfo?.age || 18,
      language: locale.value || 'en',
      metrics: {
        avg_hair_count: analysisData.value.follicle_score_map?.score || 0,
        hair_radius: analysisData.value.hair_max_rad_score_map?.score || 0,
        follicle_density: analysisData.value.hair_density_score_map?.score || 0,
        keratin_ratio: (analysisData.value.keratinocytes_score_map?.score || 0) / 100,
        oil_ratio: (analysisData.value.scalp_oil_area_score_map?.score || 0) / 100,
        sensitivity_ratio: (analysisData.value.redness_area_score_map?.score || 0) / 100
      }
    };

    console.log('调用AI分析接口:', payload);
    
    // 使用 fetch 调用以兼容 H5/本地加载环境
    const res = await fetch(AI_ANALYSIS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fullResponse: any = await res.json();
    
    console.log('AI分析接口完整响应:', fullResponse);

    // 提取 data 和 reportId Extract data and reportId
    const responseData = fullResponse.data || fullResponse;
    const reportId = fullResponse.reportId;
    
    analysisReport.value = responseData;

    // 处理reportId:保存到本地存储、数据库,并通知列表更新
    // Handle reportId: save to local storage, database, and notify list update
    if (reportId) {
        console.log('从AI分析接口获取到reportId: Got reportId from AI analysis API:', reportId);
        
        // 保存到本地存储 Save to local storage
        try {
            uni.setStorageSync('ai_analysis_reportId', reportId);

            // 同时记录到当前页面的reportId ref Also save to current page reportId ref
            currentReportId.value = reportId;
            console.log('已保存reportId到本地存储: Saved reportId to local storage:', reportId);
        } catch (e) {
            console.error('保存reportId到本地存储失败: Failed to save reportId to local storage:', e);
        }

        // 调用user/updateDetectionRecord接口保存reportId到数据库
        // Call user/updateDetectionRecord API to save reportId to database
        if (recordId.value && currentUserId.value) {
            await updateDetectionRecordReportId(reportId);
        }
    }

    // 如果启用新模式，处理产品推荐 If new mode enabled, handle product recommendations
    if (useNewAnalysisMode.value && responseData && responseData.actionable_plan && responseData.actionable_plan.key_ingredients) {
        const ingredients = responseData.actionable_plan.key_ingredients;
        // 已知成分图片映射表 Known ingredient image mapping (key: ingredient name, value: image filename)
        const ingredientImageMap: Record<string, string> = {
            'aloe vera': 'aloe-vera',
            'biotin': 'biotin',
            'bisabolol': 'bisabolol',
            'caffeine': 'caffeine',
            'ceramides': 'ceramides',
            'finastreride': 'finastreride',
            'hyaluronic acid': 'hyaluronic-acid',
            'jojoba oil': 'jojoba-oil',
            'ketoconazole': 'ketoconazole',
            'minoxidil': 'minoxidil',
            'prp': 'prp',
            'salicylic acid': 'salicylic-acid'
        };
        // 根据成分名称获取图片路径 Get image path based on ingredient name
        const getIngredientImage = (ingredientName: string): string => {
            const lowerName = ingredientName.toLowerCase();
            const matchedKey = Object.keys(ingredientImageMap).find(key => lowerName.includes(key));
            if (matchedKey) {
                return `/static/images/${ingredientImageMap[matchedKey]}.png`;
            }
            return '/static/images/shampoo-product.jpg';
        };
        // 转换为产品列表格式
        products.value = ingredients.map((ing: string, index: number) => ({
            id: `ai-prod-${index}`,
            name: ing,
            fullName: ing,
            type: 'product',
            image: getIngredientImage(ing),
            tags: []
        }));
        showNoDataState.value = products.value.length === 0;
    }

  } catch (error: any) {
    console.error('AI分析接口调用失败:', error);
    // AI 摘要失败不应阻断主检测数据展示
    showErrorPopup(error, { silent: !!analysisData.value });
    if (useNewAnalysisMode.value) {
      showNoDataState.value = true;
    }
    isAIAnalysisCalled.value = false;
  }
};

// 获取已存在的报告（通过reportId）Get existing report by reportId
const fetchExistingReport = async () => {
    // 防止重复调用 Prevent duplicate calls
    if (isExistingReportCalled.value) {
        console.log('已有报告接口已经调用过,跳过重复调用 Existing report already called, skipping duplicate call');
        return;
    }
    isExistingReportCalled.value = true;

    try {
        loading.value = true;

        // 同 AI_ANALYSIS_URL，根据环境变量决定使用绝对地址或相对路径
        // Same as AI_ANALYSIS_URL: use absolute URL or relative path based on env var
        const REPORT_API_URL = _AI_API_BASE
          ? `${_AI_API_BASE}/api/v1/hair/report/${reportIdFromList.value}`
          : `/ai-api/api/v1/hair/report/${reportIdFromList.value}`;

        console.log('调用已有report API: Calling existing report API:', REPORT_API_URL);

        // 调用API Call API
        const response: any = await new Promise((resolve, reject) => {
            uni.request({
                url: REPORT_API_URL,
                method: 'GET',
                header: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000,
                success: (res) => {
                    if (res.statusCode === 200) {
                        resolve(res.data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                },
                fail: (err) => {
                    reject(err);
                }
            });
        });

        console.log('已有report API响应: Existing report API response:', response);

        if (response && response.data.data) {
            analysisReport.value = response.data.data;
            // useNewAnalysisMode.value = true;

            // 如果启用新模式，处理产品推荐 Handle product recommendations if new mode is enabled
            if (useNewAnalysisMode.value && response.data.data.actionable_plan && response.data.data.actionable_plan.key_ingredients) {
                const ingredients = response.data.data.actionable_plan.key_ingredients;
                // 已知成分图片映射表 Known ingredient image mapping (key: ingredient name, value: image filename)
                const ingredientImageMap: Record<string, string> = {
                    'aloe vera': 'aloe-vera',
                    'biotin': 'biotin',
                    'bisabolol': 'bisabolol',
                    'caffeine': 'caffeine',
                    'ceramides': 'ceramides',
                    'finastreride': 'finastreride',
                    'hyaluronic acid': 'hyaluronic-acid',
                    'jojoba oil': 'jojoba-oil',
                    'ketoconazole': 'ketoconazole',
                    'minoxidil': 'minoxidil',
                    'prp': 'prp',
                    'salicylic acid': 'salicylic-acid'
                };
                // 根据成分名称获取图片路径 Get image path based on ingredient name
                const getIngredientImage = (ingredientName: string): string => {
                    const lowerName = ingredientName.toLowerCase();
                    const matchedKey = Object.keys(ingredientImageMap).find(key => lowerName.includes(key));
                    if (matchedKey) {
                        return `/static/images/${ingredientImageMap[matchedKey]}.png`;
                    }
                    return '/static/images/shampoo-product.jpg';
                };
                // 转换为产品列表格式 Convert to product list format
                products.value = ingredients.map((ing: string, index: number) => ({
                    id: `ai-prod-${index}`,
                    name: ing,
                    fullName: ing,
                    type: 'product',
                    image: getIngredientImage(ing),
                    tags: []
                }));
                showNoDataState.value = products.value.length === 0;
            }

            uni.showToast({
                title: 'Report loaded',
                icon: 'success'
            });
        }
    } catch (error: any) {
        console.error('获取已有report失败: Failed to fetch existing report:', error);
        isExistingReportCalled.value = false;
        // report 加载失败不应阻断 goHis 主数据
        showErrorPopup(error, { silent: !!analysisData.value });
    } finally {
        loading.value = false;
    }
};

// 更新检测记录的reportId Update detection record reportId
const updateDetectionRecordReportId = async (reportId: string) => {
    try {
        console.log('更新检测记录reportId: Updating detection record reportId:', recordId.value, reportId);
        await post('user/updateDetectionRecord', {
            userId: currentUserId.value,
            recordId: recordId.value,
            reportId: reportId
        });
        console.log('检测记录reportId更新成功: Detection record reportId updated successfully');
        
        // 通过事件通知列表页更新对应的item Notify list page to update the item via event
        uni.$emit('trichoscanReportIdUpdated', {
            recordId: recordId.value,
            reportId: reportId
        });
        console.log('已发送trichoscanReportIdUpdated事件: Emitted trichoscanReportIdUpdated event');
    } catch (error) {
        console.error('更新检测记录reportId失败: Failed to update detection record reportId:', error);
    }
}

// 计算是否正在加载产品数据
const isLoadingProducts = computed(() => {
  if (useNewAnalysisMode.value) {
    return !analysisReport.value && !showNoDataState.value && !aiLoadTimedOut.value;
  }
  return false;
});

const startAiLoadTimeout = () => {
  setTimeout(() => {
    if (!analysisReport.value && useNewAnalysisMode.value) {
      aiLoadTimedOut.value = true;
      showNoDataState.value = true;
    }
  }, 12000);
};

// 获取产品推荐数据
const fetchProductRecommendations = async (userId: string) => {
  // 如果开启了新模式，则不使用旧的推荐接口 (或者在fetchAIAnalysis中覆盖)
  if (useNewAnalysisMode.value) return;

  try {
    if (!userId) {
      console.error('用户ID不可用，无法获取产品推荐。');
      products.value = [];
      showNoDataState.value = true;
      return;
    }

    console.log('调用 /product/recommend API，参数:', { userId });
    const response = await post('/product/recommend', { userId }) as RecommendedProduct[];
    console.log('/product/recommend API 响应:', response);

    if (response && Array.isArray(response) && response.length > 0) {
      const recommendedProductsMap = new Map<string, ProductItem>();
      const typeMapping: Record<string, string> = {
        PRE_WASH: 'preWash',
        SHAMPOO: 'shampoo',
        CONDITION: 'conditioner',
        SERUM: 'serum',
        HAIR_MASK: 'hairMask',
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

      const displayOrder = ['preWash', 'shampoo', 'conditioner', 'serum', 'hairMask', 'finasteride'];
      const orderedProducts: ProductItem[] = [];
      for (const type of displayOrder) {
        if (recommendedProductsMap.has(type)) {
          orderedProducts.push(recommendedProductsMap.get(type)!);
        }
      }
      
      if (orderedProducts.length > 0) {
        products.value = orderedProducts;
        showNoDataState.value = false;
        console.log('处理后的产品推荐:', products.value);
      } else {
        console.log('API返回数据但没有匹配的产品类型');
        products.value = [];
        showNoDataState.value = true;
      }
    } else {
      console.log('没有产品推荐数据或格式不正确');
      products.value = [];
      showNoDataState.value = true;
      
      // 如果没有数据且不是新模式，可以使用静态数据兜底，或者保持为空
    }
  } catch (error: any) {
    console.error('获取产品推荐失败:', error);
    showErrorPopup(error);
    products.value = [];
    showNoDataState.value = true;
  }
};

const handleBack = () => {
  if (fromSource.value === 'hair') {
    uni.navigateBack();
  } else {
    handleExit();
  }
};

const handleGenerateMore = () => {
  const reportId = currentReportId.value;

  // H5 uni-app mode: use uni.switchTab
  if (pushType.value === '1' || fromSource.value === 'hair') {
    if (reportId) {
      try {
        uni.setStorageSync('ai_chat_targetReportId', reportId);
        uni.removeStorageSync('ai_chat_chatId');
        uni.removeStorageSync('ai_chat_reportId');
      } catch (e) {
        console.error('保存reportId失败:', e);
      }
    }
    uni.setStorageSync('ai_chat_autoStart', 'true');
    uni.switchTab({ url: '/pages/consult/new' });
    return;
  }

  // App WebView: notify native side with reportId
  const payload = JSON.stringify({ reportId });
  const u = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document);
  if (isiOS) {
    window.webkit.messageHandlers.chatWithAssistant.postMessage({
      data: 'chatWithAssistant',
      reportId
    });
  } else {
    window.android.chatWithAssistant(payload);
  }
};

const handleCopyInviteCode = () => {
  // 处理复制邀请码，使用用户的真实邀请码
  const inviteCode = userStore.userInfo?.invitationCode || ''; // fallback到默认值
  
  uni.setClipboardData({
    data: inviteCode,
    success: () => {
      uni.showToast({
        title: t('advancedResult.inviteCodeCopied'),
        icon: 'success'
      });
    }
  });
};

const handleRetakeScan = () => {
  if (fromSource.value === 'hair') {
    uni.navigateBack();
    return;
  }
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.advancedRetakeScan.postMessage({data: 'advancedRetakeScan'});
  } else {
    window.android.advancedRetakeScan(JSON.stringify({data: 'advancedRetakeScan'}));
  }
};

const handleExit = () => {
  if (fromSource.value === 'hair') {
    uni.navigateBack();
    return;
  }
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.advancedExit.postMessage({data: 'advancedExit'});
  } else {
    window.android.advancedExit(JSON.stringify({data: 'advancedExit'}));
  }
};

// 测试空数据状态（开发时使用）
const testEmptyState = () => {
  products.value = [];
  productRecommendations.value = [];
  showNoDataState.value = true;
  console.log('测试空数据状态已激活');
};

// 测试六边形动态效果（开发时使用）
const testHexagonDynamic = () => {
  // 模拟不同的grade值来测试动态效果
  if (!analysisData.value) {
    analysisData.value = {};
  }
  
  analysisData.value.follicle_score_map = { grade: '偏低' };          // 左上 - 毛囊
  analysisData.value.hair_density_score_map = { grade: '偏高' };      // 右上 - 头发密度
  analysisData.value.hair_texture_score_map = { grade: '标准' };      // 左侧 - 头发半径
  analysisData.value.keratinocytes_score_map = { grade: '偏高' };     // 右下 - 角质
  analysisData.value.scalp_oil_area_score_map = { grade: '偏低' };    // 左下 - 油性
  analysisData.value.redness_area_score_map = { grade: '标准' };      // 右侧 - 敏感性
  
  // 重新绘制六边形
  setTimeout(() => {
    drawHexagon();
  }, 100);
  
  console.log('测试六边形动态效果已激活:', getHexagonMetrics());
};

// 调试函数：显示当前指标映射
const debugHexagonMapping = () => {
  const metrics = getHexagonMetrics();
  console.log('六边形顶点映射 (从左上开始顺时针):');
  console.log('1. 左上 (毛囊):', metrics.follicle);
  console.log('2. 右上 (头发密度):', metrics.hairDensity);
  console.log('3. 右侧 (敏感性):', metrics.redness);
  console.log('4. 右下 (角质):', metrics.keratinocytes);
  console.log('5. 左下 (油性):', metrics.scalpOil);
  console.log('6. 左侧 (头发半径):', metrics.hairTexture);
};

// 六边形指标计算逻辑 - 基于具体数值
const getHexagonMetrics = () => {
  if (!analysisData.value) {
    return {
      follicle: 1,      // 毛囊
      hairDensity: 1,   // 头发密度
      hairTexture: 1,   // 头发质地
      keratinocytes: 1, // 角质细胞
      scalpOil: 1,      // 头皮油脂
      redness: 1        // 红肿敏感
    };
  }

  // 根据具体数值计算比例（标准值=1，控制极限在合理范围，防止超出圆形图表）
  // Calculate the ratio based on concrete values (standard = 1, clamp limits to a reasonable range to prevent exceeding the circular chart)
  // ratio = 1 表示标准位置，>1 表示向外（更好），<1 表示向内（更差）
  // ratio = 1 represents standard position, >1 represents outward (better), <1 represents inward (worse)
  const calculateMetricValue = (
    score: number,
    standardMiddle: number,
    excellentValue: number,
    poorValue: number,
    isHigherBetter: boolean = true
  ) => {
    // 无效值返回默认位置
    // Invalid values return default position
    if (!score || score <= 0) return 1;

    let ratio: number;

    if (isHigherBetter) {
      // 数值越大越好（如毛囊密度、头发密度）
      // The higher the value, the better (e.g. follicle density, hair density)
      // excellentValue 对应 ratio = 1.2（限制最大位置，防止超出背景图的圆形区域）
      // excellentValue corresponds to ratio = 1.2 (limits the maximum position to prevent exceeding the background circular area)
      // standardMiddle 对应 ratio = 1.0（标准）
      // standardMiddle corresponds to ratio = 1.0 (standard)
      // poorValue 对应 ratio = 0.6（向内）
      // poorValue corresponds to ratio = 0.6 (inward)
      if (score >= excellentValue) {
        ratio = 1.2;
      } else if (score <= poorValue) {
        ratio = 0.6;
      } else if (score < standardMiddle) {
        // [poorValue, standardMiddle] 之间进行线性插值
        // Linear interpolation between [poorValue, standardMiddle]
        ratio = 0.6 + (score - poorValue) / (standardMiddle - poorValue) * 0.4;
      } else {
        // [standardMiddle, excellentValue] 之间进行线性插值
        // Linear interpolation between [standardMiddle, excellentValue]
        ratio = 1.0 + (score - standardMiddle) / (excellentValue - standardMiddle) * 0.2;
      }
    } else {
      // 数值越小越好（如油性、头屑、敏感）
      // The lower the value, the better (e.g. oiliness, dandruff, sensitivity)
      // excellentValue（小值）对应 ratio = 1.2
      // excellentValue (small value) corresponds to ratio = 1.2
      // standardMiddle 对应 ratio = 1.0（标准）
      // standardMiddle corresponds to ratio = 1.0 (standard)
      // poorValue（大值）对应 ratio = 0.6
      // poorValue (large value) corresponds to ratio = 0.6
      if (score <= excellentValue) {
        ratio = 1.2;
      } else if (score >= poorValue) {
        ratio = 0.6;
      } else if (score < standardMiddle) {
        // [excellentValue, standardMiddle] 之间进行线性插值
        // Linear interpolation between [excellentValue, standardMiddle]
        ratio = 1.2 - (score - excellentValue) / (standardMiddle - excellentValue) * 0.2;
      } else {
        // [standardMiddle, poorValue] 之间进行线性插值
        // Linear interpolation between [standardMiddle, poorValue]
        ratio = 1.0 - (score - standardMiddle) / (poorValue - standardMiddle) * 0.4;
      }
    }

    // 限制最大比例为 1.2，确保紫色区域永远不超出 115 像素（圆形背景的边界）
    // Limit the maximum ratio to 1.2 to ensure the purple area never exceeds 115 pixels (the boundary of the circular background)
    return Math.max(0.4, Math.min(1.2, ratio));
  };

  // 各指标配置
  const follicleScore = analysisData.value.follicle_score_map?.score || 0;
  const hairDensityScore = analysisData.value.hair_density_score_map?.score || 0;
  const hairRadiusScore = analysisData.value.hair_max_rad_score_map?.score || 0;
  const keratinocytesScore = analysisData.value.keratinocytes_score_map?.score || 0;
  const scalpOilScore = analysisData.value.scalp_oil_area_score_map?.score || 0;
  const rednessScore = analysisData.value.redness_area_score_map?.score || 0;

  return {
    // 毛囊密度：标准=2，优秀=3，较差=1（越大越好）
    follicle: calculateMetricValue(follicleScore, 2, 3, 1, true),

    // 头发密度：标准=80，优秀=100，较差=50（越大越好）
    hairDensity: calculateMetricValue(hairDensityScore, 80, 100, 50, true),

    // 头发半径：标准=27.5，优秀=40，较差=15（越大越好）
    hairTexture: calculateMetricValue(hairRadiusScore, 27.5, 40, 15, true),

    // 角质（头屑）：标准=1.5，优秀=0.5，较差=5（越小越好）
    keratinocytes: calculateMetricValue(keratinocytesScore, 1.5, 0.5, 5, false),

    // 油性：标准=7.5，优秀=3，较差=20（越小越好）
    scalpOil: calculateMetricValue(scalpOilScore, 7.5, 3, 20, false),

    // 敏感性（红肿）：标准=7.5，优秀=3，较差=20（越小越好）
    redness: calculateMetricValue(rednessScore, 7.5, 3, 20, false)
  };
};

// 生成六边形路径
const generateHexagonPath = () => {
  const metrics = getHexagonMetrics();
  const centerX = HEX_CX;
  const centerY = HEX_CY;
  const baseRadius = HEX_RADIUS;
  
  // 六个顶点对应的指标（从左上开始，顺时针匹配标签位置）
  const values = [
    metrics.follicle,       // 左上 - 毛囊 (top: 16px; left: 60px)
    metrics.hairDensity,    // 右上 - 头发密度 (top: 16px; right: 60px)
    metrics.redness,        // 右侧 - 敏感性 (top: 132px; right: 22px)
    metrics.keratinocytes,  // 右下 - 角质 (bottom: 16px; right: 72px)
    metrics.scalpOil,       // 左下 - 油性 (bottom: 16px; left: 72px)
    metrics.hairTexture     // 左侧 - 头发半径 (top: 132px; left: 11px)
  ];
  
  const points = [];
  
  for (let i = 0; i < 6; i++) {
    // 计算角度（从左上开始，顺时针，每60度一个点）
    // 左上角为起始点，角度为 -2π/3 (即 -120度)
    const angle = (Math.PI * 2 * i / 6) - Math.PI * 2/3;
    
    // 根据指标值调整半径
    const radius = baseRadius * values[i];
    
    // 计算点的坐标
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    points.push(`${x},${y}`);
  }
  
  // 生成SVG路径字符串
  return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
};

// 响应式计算六边形路径
const hexagonPath = computed(() => {
  return generateHexagonPath();
});

// 绘制六边形到canvas
const drawHexagon = () => {
  const ctx = uni.createCanvasContext('hexagonCanvas');
  const metrics = getHexagonMetrics();
  
  const centerX = HEX_CX;
  const centerY = HEX_CY;
  const baseRadius = HEX_RADIUS;
  
  // 六个顶点对应的指标（从左上开始，顺时针匹配标签位置）
  const values = [
    metrics.follicle,       // 左上 - 毛囊 (top: 16px; left: 60px)
    metrics.hairDensity,    // 右上 - 头发密度 (top: 16px; right: 60px)
    metrics.redness,        // 右侧 - 敏感性 (top: 132px; right: 22px)
    metrics.keratinocytes,  // 右下 - 角质 (bottom: 16px; right: 72px)
    metrics.scalpOil,       // 左下 - 油性 (bottom: 16px; left: 72px)
    metrics.hairTexture     // 左侧 - 头发半径 (top: 132px; left: 11px)
  ];
  
  // 清除画布
  ctx.clearRect(0, 0, HEX_W, HEX_H);
  
  // 开始绘制路径
  ctx.beginPath();
  
  for (let i = 0; i < 6; i++) {
    // 计算角度（从左上开始，顺时针，每60度一个点）
    // 左上角为起始点，角度为 -2π/3 (即 -120度)
    const angle = (Math.PI * 2 * i / 6) - Math.PI * 2/3;
    
    // 根据指标值调整半径
    const radius = baseRadius * values[i];
    
    // 计算点的坐标
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  // 闭合路径
  ctx.closePath();
  
  // 设置填充和描边样式
  ctx.setFillStyle('rgba(103, 57, 198, 0.2)');
  ctx.setStrokeStyle('#6739c6');
  ctx.setLineWidth(1);
  
  // 填充和描边
  ctx.fill();
  ctx.stroke();
  
  // 绘制到画布
  ctx.draw();
};

// ========== 图片预览功能 Image Preview Feature ==========
// 图片预览弹窗状态 Image preview modal state
const showImagePreview = ref(false);
const previewImages = ref<string[]>([]);
const currentPreviewIndex = ref(0);

// 格式化图片URL，解决混合内容问题 (Format image URL to fix mixed content issues)
const formatImageUrl = (url: string) => {
  if (!url) return '';
  if (url.indexOf('http://115.159.42.189:5000') !== -1) {
    // iOS bundle 模式 (localhost)：直接返回原始 HTTP 绝对地址
    // 因为 GCDWebServer 不代理 /log 路径，相对路径会 404
    // iOS bundle mode: return original HTTP URL directly (GCDWebServer doesn't proxy /log)
    if (_isLocalBundle) {
      return url;
    }
    // 线上 H5 模式：替换为 /log 相对路径，走 nginx 代理
    // Online H5 mode: replace with /log relative path for nginx proxy
    if (url.includes('/log/')) {
      return url.replace('http://115.159.42.189:5000', '');
    } else {
      return url.replace('http://115.159.42.189:5000', '/log');
    }
  }
  return url;
};

// 获取头皮健康卡片的图片列表 Get scalp health card images
// oiliness -> url.scalp_oil, dandruff -> url.scurf, sensitivity -> url.opcs_redness
const getScalpCardImages = computed(() => {
  const url = (analysisData.value as any)?.url;
  if (!url) return [];
  
  const metricUrlMap: Record<string, string> = {
    'oiliness': 'scalp_oil',
    'dandruff': 'scurf',
    'sensitivity': 'opcs_redness'
  };
  
  const urlKey = metricUrlMap[selectedScalpMetric.value];
  const images = url[urlKey];
  
  if (Array.isArray(images)) {
    return images.filter((img: string) => img && img.length > 0).map(formatImageUrl);
  } else if (typeof images === 'string' && images.length > 0) {
    return [formatImageUrl(images)];
  }
  return [];
});

// 获取头发焦点卡片的图片列表 Get hair focus card images
// hairDensity -> url.hair, hairRadius -> url.hair, greyHairs -> url.white_hair
const getHairCardImages = computed(() => {
  const url = (analysisData.value as any)?.url;
  if (!url) return [];
  
  const metricUrlMap: Record<string, string> = {
    'hairDensity': 'hair',
    'hairRadius': 'hair',
    'greyHairs': 'white_hair',
    'terminalVellusRatio': 'hair'
  };
  
  const urlKey = metricUrlMap[selectedHairMetric.value];
  const images = url[urlKey];
  
  if (Array.isArray(images)) {
    return images.filter((img: string) => img && img.length > 0).map(formatImageUrl);
  } else if (typeof images === 'string' && images.length > 0) {
    return [formatImageUrl(images)];
  }
  return [];
});

// 获取毛囊焦点卡片的图片列表 Get follicle focus card images
// follicleDensity -> url.follicle
const getFollicleCardImages = computed(() => {
  const url = (analysisData.value as any)?.url;
  if (!url) return [];
  
  const images = url.follicle;
  
  if (Array.isArray(images)) {
    return images.filter((img: string) => img && img.length > 0).map(formatImageUrl);
  } else if (typeof images === 'string' && images.length > 0) {
    return [formatImageUrl(images)];
  }
  return [];
});

// 打开图片预览弹窗 Open image preview modal
const openImagePreview = (images: string[], index: number = 0) => {
  if (!images || images.length === 0) return;
  previewImages.value = images;
  currentPreviewIndex.value = index;
  showImagePreview.value = true;
};

// 关闭图片预览弹窗 Close image preview modal
const closeImagePreview = () => {
  showImagePreview.value = false;
  previewImages.value = [];
  currentPreviewIndex.value = 0;
};

// 切换预览图片（通过滑动指示器） Switch preview image via indicator
const switchPreviewImage = (index: number) => {
  currentPreviewIndex.value = index;
};

// 处理预览滑动 Handle preview swipe
const onPreviewSwiperChange = (e: any) => {
  currentPreviewIndex.value = e.detail.current;
};

// 监听analysisData变化，重新绘制六边形
watch(() => analysisData.value, () => {
  if (analysisData.value) {
    // 延迟绘制，确保canvas已经渲染
    setTimeout(() => {
      drawHexagon();
    }, 100);
  }
}, { deep: true });

// 格式化日期（短）- 改为 "25 Sep" 格式
const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate();
  
  // 月份名称数组
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const month = monthNames[date.getMonth()];
  return `${day} ${month}`;
};

// 获取图表点的X坐标（像素）
const getPointX = (index: number) => {
  const pointSpacing = 80; // 点之间的间距
  return index * pointSpacing + 20; // 20px为左边距
};

// 获取点的Y坐标（从上到下）- 使用固定像素值
const getPointTopPosition = (value: string | number) => {
  // 确保分数是整数
  const score = Math.floor(parseInt(String(value)) || 0);
  const maxScore = 100; // 最高分数
  const minScore = 0;  // 最低分数
  const chartHeight = 90;
  const usableHeight = chartHeight - 24;
  
  // 计算从顶部开始的位置（分数越高，位置越靠上）
  return Math.floor(chartHeight - ((score - minScore) / (maxScore - minScore)) * usableHeight - 20);
};

// 获取连接线的样式
const getConnectorStyle = (index: number, type: string) => {
  const records = trendRecords.value;
  if (!records[index] || !records[index + 1]) return {};
  
  const record1 = records[index] as any;
  const record2 = records[index + 1] as any;
  
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

// 从 URL hash 解析页面参数（H5 WebView fallback）
// Parse page params from URL hash (H5 WebView fallback)
const getPageOptionsFromHash = (): Record<string, string> => {
  try {
    const hash = window.location.hash; // e.g. #/pages/xxx?data=...&userId=...
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

// 页面挂载时获取数据
onMounted(async () => {
  userStore.initUserInfo();

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const optionsFromPage = currentPage.$page?.options || {};
  // H5 WebView fallback: 如果 getCurrentPages 返回空，直接从 URL hash 解析
  // H5 WebView fallback: if getCurrentPages returns empty, parse from URL hash directly
  const optionsFromHash = getPageOptionsFromHash();
  const options = (Object.keys(optionsFromPage).length > 0) ? optionsFromPage : optionsFromHash;
  console.log('options from page===>', optionsFromPage);
  console.log('options from hash===>', optionsFromHash);
  console.log('options final===>', options);

  if (options.from) {
    fromSource.value = options.from;
  }

  // 优先从options获取userId和recordId Get userId and recordId from options
  const userId = options.userId || userStore.userInfo?.userId || uni.getStorageSync('userId') || '';
  currentUserId.value = userId;
  if (userId && !userStore.userInfo?.userId) {
    userStore.userInfo.userId = userId;
  }
  
  if (options.pushType) {
    pushType.value = options.pushType;
  }
  
  // 获取reportId Get reportId
  reportIdFromList.value = options.reportId || '';
  currentReportId.value = options.reportId || '';
  
  // 检查是否启用新AI分析模式 (options覆盖默认)
  if (options.useNewApi === 'true' || options.useNewApi === true) {
    useNewAnalysisMode.value = true;
  }

  if (options.data) {
    // 检查是否为快速扫描模式 Check if it is quick scan mode
    if (options.quick) {
      isQuickScan.value = true;
    }
    try {
      const data = JSON.parse(options.data);
      if (data) {
        analysisData.value = data;
        if (userId) {
          fetchHealthData(userId);
          fetchProductRecommendations(userId);
        }
      }
    } catch (e) {
      console.error('解析data参数失败: Failed to parse data param:', e, 'raw data:', options.data);
    }
  } else if (options.id) {
    recordId.value = parseInt(options.id, 10);
    await fetchAnalysisHistory(userId);
    if (userId) {
      fetchHealthData(userId);
      fetchProductRecommendations(userId);
    }
  } else if (userId) {
    await fetchAnalysisHistory(userId);
    fetchHealthData(userId);
    fetchProductRecommendations(userId);
  }

  // 判断是否有reportId，有则调用GET report接口；否则调用分析接口
  if (analysisData.value) {
    if (reportIdFromList.value) {
      console.log('从列表获取到reportId，调用GET report接口:', reportIdFromList.value);
      await fetchExistingReport();
    } else if (useNewAnalysisMode.value) {
      const uId = resolveUserId(userId);
      if (uId) {
        startAiLoadTimeout();
        await fetchAIAnalysis(uId);
      }
    }
  }
  
  // 确保用户信息已加载
  // if (userStore.userInfo?.userId) {
  //   console.log('用户ID存在，开始获取数据:', userStore.userInfo.userId);
  //   await Promise.all([
  //     fetchAnalysisHistory(userStore.userInfo.userId),
  //     fetchHealthData(userStore.userInfo.userId),
  //     fetchProductRecommendations(userStore.userInfo.userId)
  //   ]);
  // } else {
  //   console.log('用户ID不存在，等待用户信息加载...');
  //   // 可以在这里添加监听用户信息变化的逻辑
  //   // 或者显示加载状态
  //   const fallbackUserId = "lusHair6f6ea91a";
  //   userStore.userInfo.userId = fallbackUserId;
  //   await Promise.all([
  //     fetchAnalysisHistory(fallbackUserId),
  //     fetchHealthData(fallbackUserId),
  //     fetchProductRecommendations(fallbackUserId)
  //   ]);
  // }
  
  // 延迟绘制六边形，确保页面渲染完成
  setTimeout(() => {
    drawHexagon();
  }, 500);
});

// 监听数据变化以触发AI分析 (作为补充，处理后续更新)
// Watch analysisData changes to trigger AI analysis
watch(analysisData, (newVal: any) => {
  if (newVal) {
    setTimeout(() => drawHexagon(), 300);
  }
  if (!newVal || !useNewAnalysisMode.value || analysisReport.value) return;
  const uId = resolveUserId(newVal.userId);
  if (!uId) return;

  if (reportIdFromList.value && !isExistingReportCalled.value) {
    fetchExistingReport();
  } else if (!isAIAnalysisCalled.value) {
    startAiLoadTimeout();
    fetchAIAnalysis(uId);
  }
});
</script>

<template>
  <view class="rp-page advanced-result">
    <view v-if="loading" class="rp-loading">
      <view class="rp-loading-inner">
        <view class="rp-spinner" />
        <text class="rp-loading-text">{{ t('common.loading') }}</text>
      </view>
    </view>

    <view class="rp-topbar" :style="headerPaddingStyle(0)">
      <view class="rp-back" @click="handleBack"><text>‹</text></view>
      <text class="rp-topbar-title">{{ t('advancedResult.title') }}</text>
      <view class="rp-share" @click="shareResults">
        <image class="share-icon" src="/static/icons/share.svg" mode="aspectFit" style="width:18px;height:18px" />
      </view>
    </view>

    <view class="rp-body" :style="headerPaddingStyle(52)">
      <view v-if="error && !analysisData" class="shell-card rp-empty">
        <text class="rp-empty-title">{{ t('advancedResult.fetchDataFailed') }}</text>
        <text>{{ getSpecificErrorMessage(error) }}</text>
        <view class="rp-btn rp-btn--primary rp-btn--wide" style="margin-top:14px" @click="fetchAnalysisHistory()">
          <text>{{ t('common.retry') || 'Retry' }}</text>
        </view>
      </view>

      <view class="rp-hero-meta">
        <view class="shell-src-badge">
          <TablerIcon name="scan" :size="11" color="#fff" />
          <text>{{ isQuickScan ? t('quickResult.quickScan') : t('advancedResult.advancedScan') }}</text>
        </view>
        <text class="rp-date">{{ formatDateTime(analysisData?.createTime) }}</text>
      </view>

      <view class="shell-card rp-score-block">
        <text class="shell-label">{{ t('advancedResult.yourHairScore') }}</text>
        <view class="rp-score-main">
          <text class="rp-score-num">{{ Math.round(analysisData?.scalpScore || 0) }}</text>
          <text class="rp-score-of">{{ t('advancedResult.outOf100') }}</text>
        </view>
        <text v-if="improvement > 0" class="rp-improve">{{ t('advancedResult.improvement', [improvement]) }}</text>

        <view class="rp-trend">
          <scroll-view
            scroll-x="true"
            class="rp-trend-scroll"
            :scroll-left="trendChartScrollLeft"
            :scroll-with-animation="true"
            show-scrollbar="false"
          >
            <view class="rp-trend-inner" :style="{ width: chartWidth }">
            <view class="chart-area">
              <!-- 连接线 - 只显示scalpScore -->
              <view v-for="(_, index) in trendRecords.slice(0, -1)" :key="'scalp-connector-'+index" 
                    class="line-connector scalp"
                    :class="{ 'latest': index === trendRecords.length - 2 }"
                    :style="getConnectorStyle(index, 'scalpScore')">
              </view>
              
              <!-- 数据点 - 只显示scalpScore -->
              <view 
                v-for="(record, index) in trendRecords" 
                :key="'scalp-' + index" 
                class="chart-point scalp"
                :class="{ 'latest': index === trendRecords.length - 1 }"
                :style="{ 
                  left: getPointX(index) + 'px', 
                  top: getPointTopPosition(record.scalpScore) + 'px' 
                }"
              >
                <view class="point-dot"></view>
              </view>
            </view>

            <!-- 日期标签 -->
            <view class="chart-dates">
              <view 
                v-for="(record, index) in trendRecords" 
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
      </view>

      <view class="shell-card">
        <view class="rp-ai-head">
          <TablerIcon name="sparkles" :size="18" color="#6B21C8" />
          <text class="rp-ai-title">{{ t('advancedResult.smartSummary') }}</text>
        </view>
        <text class="rp-ai-text">{{ getSmartSummaryText() }}</text>
        <view class="rp-btn rp-btn--primary rp-btn--wide" @click="handleGenerateMore">
          <text>{{ t('advancedResult.generateMore') }}</text>
        </view>
      </view>

      <view class="shell-card">
        <text class="shell-label">{{ t('advancedResult.picksForYou') }}</text>
        <text class="shell-section-sub">{{ t('advancedResult.aiRecommendedProducts') }}</text>
        <scroll-view class="rp-products-scroll" scroll-x v-if="!showNoDataState && (products.length > 0 || productRecommendations.length > 0)">
          <view class="rp-products-list">
            <view class="rp-product-card" v-for="product in (products.length > 0 ? products : productRecommendations)" :key="product.id || product.type">
              <image class="rp-product-img" :src="product.image" mode="aspectFill" />
              <text class="rp-product-name">{{ product.fullName || product.name }}</text>
            </view>
          </view>
        </scroll-view>
        <view v-if="isLoadingProducts" class="rp-empty"><view class="rp-spinner" /></view>
        <view v-if="showNoDataState && !isLoadingProducts" class="rp-empty">
          <TablerIcon name="package" :size="28" color="#8A82A0" />
          <text class="rp-empty-title">{{ t('advancedResult.noProductData') }}</text>
          <text>{{ t('advancedResult.noProductDataDescription') }}</text>
        </view>
      </view>

      <view class="shell-card">
        <text class="shell-label">{{ t('advancedResult.yourMetrics') }}</text>
        <text class="shell-section-sub">{{ t('advancedResult.metricsDescription') }}</text>
        <view class="rp-hex-wrap">
          <image src="/static/images/bg_chart.svg" mode="aspectFit" class="rp-hex-bg" />
          <canvas canvas-id="hexagonCanvas" class="rp-hex-canvas" :style="{ width: HEX_W + 'px', height: HEX_H + 'px' }" />
          <view class="rp-hex-labels">
            <view
              v-for="(axis, idx) in radarAxisLabels"
              :key="'radar-label-' + idx"
              class="rp-hex-label"
              :class="axis.class"
              :style="axis.style"
            >{{ axis.label }}<text v-if="axis.score" class="rp-hex-score">{{ axis.score }}</text></view>
          </view>
        </view>
      </view>

      <text class="shell-section-h">{{ t('advancedResult.scoreBreakdown') }}</text>
      <text class="shell-section-sub">{{ t('advancedResult.tapIconsToLearn') }}</text>

      <view class="shell-card rp-breakdown">
        <text class="rp-card-title">{{ t('advancedResult.scalpHealth') }}</text>
        
        <view class="rp-curve-wrap">
            <view class="rp-curve-container">
              <svg class="rp-bell-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
                <!-- 定义点状填充图案 -->
                <defs>
                  <pattern id="dotPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                    <circle cx="4" cy="4" r="1" fill="rgba(221, 221, 221, 0.6)"/>
                  </pattern>
                </defs>
                
                <!-- 钟形曲线填充区域 -->
                <path 
                  :d="getBellCurvePath(true)" 
                  fill="url(#dotPattern)" 
                  stroke="none"
                />
                
                <!-- 钟形曲线边框 -->
                <path 
                  :d="getBellCurvePath(false)" 
                  fill="none" 
                  stroke="#7622FF" 
                  stroke-width="2"
                />
                
                <!-- 用户位置垂直线 -->
                <line 
                  :x1="getUserMarkerPosition" 
                  :y1="20" 
                  :x2="getUserMarkerPosition" 
                  :y2="90" 
                  stroke="#7A7A7A" 
                  stroke-width="1"
                />
                
                <!-- 用户标记点 -->
                <circle 
                  :cx="getUserMarkerPosition" 
                  :cy="getBellCurveY(getUserMarkerPosition)" 
                  r="4" 
                  fill="white" 
                  stroke="#7622FF" 
                  stroke-width="2"
                />
              </svg>
              
              <!-- 百分位数标签 -->
              <view class="rp-percentile" :style="{ left: getUserMarkerPosition - 30 + 'px' }">
                <text>{{ t('advancedResult.aheadOfPeers', [getCurrentPercentile]) }}</text>
              </view>
            </view>
            <view class="rp-curve-labels">
              <text>{{ t('advancedResult.lowEnd') }}</text>
              <text>{{ t('advancedResult.average') }}</text>
              <text>{{ t('advancedResult.highEnd') }}</text>
            </view>
          <view class="rp-metric-chips">
            <view
              v-for="metric in scalpMetrics"
              :key="metric.id"
              class="rp-metric-chip"
              :class="{ active: selectedScalpMetric === metric.id }"
              @click="selectScalpMetric(metric.id)"
            >
              <image v-if="metric.icon.startsWith('/')" :src="metric.icon" mode="aspectFit" class="rp-chip-icon" />
              <text class="rp-chip-label">{{ t(metric.nameKey) }}</text>
            </view>
          </view>
        </view>

        <view class="rp-detail-head">
            <view class="rp-detail-title">
              <image v-if="getCurrentMetricIcon.startsWith('/')" :src="getCurrentMetricIcon" mode="aspectFit" class="rp-detail-title-icon" />
              <TablerIcon v-else :name="getCurrentMetricIcon" :size="18" />
              <text>{{ getCurrentMetricName }}</text>
            </view>
            <view class="rp-detail-stat">
              <text class="rp-detail-status">{{ getCurrentScalpStatus }}</text>
              <text class="rp-detail-value">{{ getCurrentScalpScore.toFixed(2) }}<text class="rp-detail-unit">%</text></text>
            </view>
          </view>
          <text class="rp-detail-desc">
            {{ getCurrentScalpAdvice || t('advancedResult.percentileDescription', [getCurrentPercentile, selectedScalpMetric, 'high']) }}
          </text>
          <scroll-view v-if="getScalpCardImages.length > 0" class="rp-img-scroll" scroll-x show-scrollbar="false">
            <view class="rp-img-list">
              <view class="rp-img-item" v-for="(img, index) in getScalpCardImages" :key="'scalp-img-' + index" @click="openImagePreview(getScalpCardImages, index)">
                <image :src="img" mode="aspectFill" />
                <view class="rp-img-view"><text>VIEW</text></view>
              </view>
            </view>
          </scroll-view>
      </view>

      <view class="shell-card rp-breakdown">
        <text class="rp-card-title">{{ t('advancedResult.hairHealth') }}</text>
        
        <view class="rp-curve-wrap">
            <view class="rp-curve-container">
              <svg class="rp-bell-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
                <!-- 定义点状填充图案 -->
                <defs>
                  <pattern id="dotPatternHair" patternUnits="userSpaceOnUse" width="8" height="8">
                    <circle cx="4" cy="4" r="1" fill="rgba(221, 221, 221, 0.6)"/>
                  </pattern>
                </defs>
                
                <!-- 钟形曲线填充区域 -->
                <path 
                  :d="getBellCurvePath(true)" 
                  fill="url(#dotPatternHair)" 
                  stroke="none"
                />
                
                <!-- 钟形曲线边框 -->
                <path 
                  :d="getBellCurvePath(false)" 
                  fill="none" 
                  stroke="#7622FF" 
                  stroke-width="2"
                />
                
                <!-- 用户位置垂直线 -->
                <line 
                  :x1="getHairUserMarkerPosition" 
                  :y1="20" 
                  :x2="getHairUserMarkerPosition" 
                  :y2="90" 
                  stroke="#7A7A7A" 
                  stroke-width="1"
                />
                
                <!-- 用户标记点 -->
                <circle 
                  :cx="getHairUserMarkerPosition" 
                  :cy="getBellCurveY(getHairUserMarkerPosition)" 
                  r="4" 
                  fill="white" 
                  stroke="#7622FF" 
                  stroke-width="2"
                />
              </svg>
              
              <!-- 百分位数标签 -->
              <view class="rp-percentile" :style="{ left: getHairUserMarkerPosition - 30 + 'px' }">
                <text>{{ t('advancedResult.aheadOfPeers', [getCurrentHairPercentile]) }}</text>
              </view>
            </view>
            <view class="rp-curve-labels">
              <text>{{ t('advancedResult.lowEnd') }}</text>
              <text>{{ t('advancedResult.average') }}</text>
              <text>{{ t('advancedResult.highEnd') }}</text>
            </view>
          <view class="rp-metric-chips">
            <view
              v-for="metric in hairMetrics"
              :key="metric.id"
              class="rp-metric-chip"
              :class="{ active: selectedHairMetric === metric.id }"
              @click="selectHairMetric(metric.id)"
            >
              <image v-if="metric.icon.startsWith('/')" :src="metric.icon" mode="aspectFit" class="rp-chip-icon" />
              <text class="rp-chip-label">{{ t(metric.nameKey) }}</text>
            </view>
          </view>
        </view>

        <view class="rp-detail-head">
            <view class="rp-detail-title">
              <image v-if="getCurrentHairMetricIcon.startsWith('/')" :src="getCurrentHairMetricIcon" mode="aspectFit" class="rp-detail-title-icon" />
              <TablerIcon v-else :name="getCurrentHairMetricIcon" :size="18" />
              <text>{{ getCurrentHairMetricName }}</text>
            </view>
            <view class="rp-detail-stat">
              <text class="rp-detail-status">{{ getCurrentHairStatus }}</text>
              <text class="rp-detail-value">{{ getCurrentHairDisplayValue }}<text class="rp-detail-unit">{{ getCurrentHairUnit }}</text></text>
            </view>
          </view>
          <text class="rp-detail-desc">
            {{ getCurrentHairAdvice || t('advancedResult.percentileDescription', [getCurrentHairPercentile, selectedHairMetric, 'normal']) }}
          </text>
          <scroll-view v-if="getHairCardImages.length > 0" class="rp-img-scroll" scroll-x show-scrollbar="false">
            <view class="rp-img-list">
              <view class="rp-img-item" v-for="(img, index) in getHairCardImages" :key="'hair-img-' + index" @click="openImagePreview(getHairCardImages, index)">
                <image :src="img" mode="aspectFill" />
                <view class="rp-img-view"><text>VIEW</text></view>
              </view>
            </view>
          </scroll-view>
      </view>

      <view class="shell-card rp-breakdown">
        <text class="rp-card-title">{{ t('advancedResult.follicleHealth') }}</text>
        
        <view class="rp-curve-wrap">
            <view class="rp-curve-container">
              <svg class="rp-bell-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
                <!-- 定义点状填充图案 -->
                <defs>
                  <pattern id="dotPatternFollicle" patternUnits="userSpaceOnUse" width="8" height="8">
                    <circle cx="4" cy="4" r="1" fill="rgba(221, 221, 221, 0.6)"/>
                  </pattern>
                </defs>
                
                <!-- 钟形曲线填充区域 -->
                <path 
                  :d="getBellCurvePath(true)" 
                  fill="url(#dotPatternFollicle)" 
                  stroke="none"
                />
                
                <!-- 钟形曲线边框 -->
                <path 
                  :d="getBellCurvePath(false)" 
                  fill="none" 
                  stroke="#7622FF" 
                  stroke-width="2"
                />
                
                <!-- 用户位置垂直线 -->
                <line 
                  :x1="getFollicleUserMarkerPosition" 
                  :y1="20" 
                  :x2="getFollicleUserMarkerPosition" 
                  :y2="90" 
                  stroke="#7A7A7A" 
                  stroke-width="1"
                />
                
                <!-- 用户标记点 -->
                <circle 
                  :cx="getFollicleUserMarkerPosition" 
                  :cy="getBellCurveY(getFollicleUserMarkerPosition)" 
                  r="4" 
                  fill="white" 
                  stroke="#7622FF" 
                  stroke-width="2"
                />
              </svg>
              
              <!-- 百分位数标签 -->
              <view class="rp-percentile" :style="{ left: getFollicleUserMarkerPosition - 30 + 'px' }">
                <text>{{ t('advancedResult.aheadOfPeers', [getCurrentFolliclePercentile]) }}</text>
              </view>
            </view>
            <view class="rp-curve-labels">
              <text>{{ t('advancedResult.lowEnd') }}</text>
              <text>{{ t('advancedResult.average') }}</text>
              <text>{{ t('advancedResult.highEnd') }}</text>
            </view>
          <view class="rp-metric-chips">
            <view
              v-for="metric in follicleMetrics"
              :key="metric.id"
              class="rp-metric-chip"
              :class="{ active: selectedFollicleMetric === metric.id }"
              @click="selectFollicleMetric(metric.id)"
            >
              <image v-if="metric.icon.startsWith('/')" :src="metric.icon" mode="aspectFit" class="rp-chip-icon" />
              <text class="rp-chip-label">{{ t(metric.nameKey) }}<text v-if="getMetricFieldScore(metric.dataField)" class="rp-chip-score">{{ getMetricFieldScore(metric.dataField) }}</text></text>
            </view>
          </view>
        </view>

        <view class="rp-detail-head">
            <view class="rp-detail-title">
              <image v-if="getCurrentFollicleMetricIcon.startsWith('/')" :src="getCurrentFollicleMetricIcon" mode="aspectFit" class="rp-detail-title-icon" />
              <TablerIcon v-else :name="getCurrentFollicleMetricIcon" :size="18" />
              <text>{{ getCurrentFollicleMetricName }}</text>
            </view>
            <view class="rp-detail-stat">
              <text class="rp-detail-status">{{ getCurrentFollicleStatus }}</text>
              <text class="rp-detail-value">{{ getCurrentFollicleDisplayValue }}<text class="rp-detail-unit">{{ getCurrentFollicleUnit }}</text></text>
            </view>
          </view>
          <text class="rp-detail-desc">
            {{ getCurrentFollicleAdvice || t('advancedResult.percentileDescription', [getCurrentFolliclePercentile, selectedFollicleMetric, 'good']) }}
          </text>
          <scroll-view v-if="getFollicleCardImages.length > 0" class="rp-img-scroll" scroll-x show-scrollbar="false">
            <view class="rp-img-list">
              <view class="rp-img-item" v-for="(img, index) in getFollicleCardImages" :key="'follicle-img-' + index" @click="openImagePreview(getFollicleCardImages, index)">
                <image :src="img" mode="aspectFill" />
                <view class="rp-img-view"><text>VIEW</text></view>
              </view>
            </view>
          </scroll-view>
      </view>

    <!-- 位置分解 -->
    <!-- <view class="positions-section">
      <view class="section-header">
        <text class="section-title">{{ t('advancedResult.positionsBreakdown') }}</text>
        <text class="section-subtitle">{{ t('advancedResult.tapHotspotsToLearn') }}</text>
      </view>

      <view class="positions-card">
        <view class="head-diagrams">
          <view class="diagram-container">
            <view class="diagram-row">
              <view class="diagram-item">
                <image class="head-image" src="/static/images/position_female1.png" mode="aspectFill" />
                <view class="hotspot" style="top: 8.5px; left: 15px;">
                  <view class="hotspot-inner"></view>
                  <view class="hotspot-outer"></view>
                </view>
              </view>
              <view class="diagram-item">
                <image class="head-image" src="/static/images/position_female2.png" mode="aspectFill" />
                <view class="hotspot" style="top: 37px; left: 34.5px;">
                  <view class="hotspot-inner"></view>
                  <view class="hotspot-outer"></view>
                </view>
                <view class="hotspot" style="top: 6px; left: 22.5px;">
                  <view class="hotspot-inner"></view>
                  <view class="hotspot-outer"></view>
                </view>
              </view>
              <view class="diagram-item">
                <image class="head-image" src="/static/images/position_female1.png" mode="aspectFill" />
                <view class="hotspot" style="top: 28.5px; left: -7.5px;">
                  <view class="hotspot-inner"></view>
                  <view class="hotspot-outer"></view>
                </view>
                <view class="hotspot" style="top: 16.5px; left: 27px;">
                  <view class="hotspot-inner"></view>
                  <view class="hotspot-outer"></view>
                </view>
              </view>
            </view>
          </view>
          
          <view class="position-info">
            <view class="position-badge">
              <text class="position-name">{{ t('advancedResult.rightForehead') }}</text>
            </view>
            <text class="issues-count">{{ t('advancedResult.issuesFound', [2]) }}</text>
          </view>
        </view>

        <view class="scan-details">
          <view class="scan-item">
            <text class="scan-title">{{ t('advancedResult.foreheadLeft') }}</text>
            <image class="scan-image" src="/static/images/no-picture.png" mode="aspectFill" />
            <button class="view-button">
              <TablerIcon name="eye" :size="18" class="button-icon" />
              <text class="button-text">{{ t('advancedResult.view') }}</text>
            </button>
          </view>
          <view class="scan-item">
            <text class="scan-title">{{ t('advancedResult.foreheadLeft') }}</text>
            <image class="scan-image" src="/static/images/no-picture.png" mode="aspectFill" />
            <button class="view-button">
              <TablerIcon name="eye" :size="18" class="button-icon" />
              <text class="button-text">{{ t('advancedResult.view') }}</text>
            </button>
          </view>
        </view>

        <view class="position-content">
          <view class="content-item">
            <view class="issue-badge">
              <text class="issue-text">{{ t('advancedResult.mildHairlossIssue') }}</text>
            </view>
            <text class="issue-description">
              {{ t('advancedResult.issueDescription') }}
            </text>
          </view>
          <view class="content-item">
            <view class="issue-badge">
              <text class="issue-text">{{ t('advancedResult.dandruffIssue') }}</text>
            </view>
            <text class="issue-description">
              {{ t('advancedResult.issueDescription') }}
            </text>
          </view>
        </view>
      </view>
    </view> -->

    <!-- 扫描位置列表 -->
    <!-- <view class="scans-section">
      <view class="scans-grid">
        <view class="scan-item" v-for="(position, index) in scanPositions" :key="index">
          <text class="scan-title">{{ t(`advancedResult.${position}`) }}</text>
          <image class="scan-image" src="/static/images/no-picture.png" mode="aspectFill" />
          <button class="view-button">
            <TablerIcon name="eye" :size="18" class="button-icon" />
            <text class="button-text">{{ t('advancedResult.view') }}</text>
          </button>
        </view>
      </view>
    </view> -->

      <view class="shell-card shell-card-tint rp-cta">
        <text class="rp-cta-title">{{ t('advancedResult.shareCardCta') }}</text>
        <view class="rp-btn rp-btn--primary rp-btn--wide" @click="handleShareDownloadLink">
          <text>{{ t('advancedResult.shareDownloadLink') }}</text>
        </view>
      </view>

      <view class="rp-actions">
        <view class="rp-btn rp-btn--ghost" @click="handleRetakeScan">
          <text>{{ t('advancedResult.retakeScan') }}</text>
        </view>
        <view class="rp-btn rp-btn--primary" @click="handleExit">
          <text>{{ t('advancedResult.exit') }}</text>
        </view>
      </view>
    </view>

    <!-- Off-screen share card for long-image export -->
    <view class="rp-share-card" v-if="analysisData">
      <view class="rp-share-section">
        <text class="rp-share-title">{{ t('advancedResult.yourMetrics') }}</text>
        <view class="rp-share-hex">
          <!-- 内联 SVG 避免 iOS 本地加载跨域污染画布 / Inline SVG to prevent iOS local loading cross-origin canvas contamination -->
          <svg width="230" height="231" viewBox="0 0 230 231" fill="none" xmlns="http://www.w3.org/2000/svg" class="rp-share-hex-bg">
            <circle cx="115" cy="115.585" r="115" fill="white"/>
            <circle cx="115" cy="115.585" r="114.5" stroke="black" stroke-opacity="0.2"/>
            <circle cx="115" cy="115.586" r="88.4615" fill="white"/>
            <circle cx="115" cy="115.586" r="87.9615" stroke="black" stroke-opacity="0.2"/>
            <circle cx="114.999" cy="115.584" r="61.9231" fill="white"/>
            <circle cx="114.999" cy="115.584" r="61.4231" stroke="black" stroke-opacity="0.2"/>
            <circle cx="115" cy="115.585" r="35.3846" fill="white"/>
            <circle cx="115" cy="115.585" r="34.8846" stroke="black" stroke-opacity="0.2"/>
            <circle cx="63.8471" cy="26.2387" r="3.53846" fill="white" stroke="#2E1B54"/>
            <circle cx="217.769" cy="115.584" r="3.53846" fill="white" stroke="#2E1B54"/>
            <circle cx="12.5385" cy="115.584" r="3.53846" fill="white" stroke="#2E1B54"/>
            <circle cx="63.8471" cy="204.045" r="3.53846" fill="white" stroke="#2E1B54"/>
            <circle cx="166.461" cy="204.045" r="3.53846" fill="white" stroke="#2E1B54"/>
            <circle cx="166.461" cy="26.2387" r="3.53846" fill="white" stroke="#2E1B54"/>
          </svg>
          <svg class="rp-share-hex-svg" :viewBox="`0 0 ${HEX_W} ${HEX_H}`" xmlns="http://www.w3.org/2000/svg">
            <path :d="hexagonPath" fill="rgba(103, 57, 198, 0.2)" stroke="#6739c6" stroke-width="1.5" />
          </svg>
          <view class="rp-hex-labels">
            <view
              v-for="(axis, idx) in radarAxisLabelsForShare"
              :key="'share-radar-' + idx"
              class="rp-hex-label rp-share-hex-label"
              :class="axis.class"
              :style="axis.style"
            >{{ axis.label }}<text v-if="axis.score" class="rp-hex-score">{{ axis.score }}</text></view>
          </view>
        </view>
      </view>

      <view class="rp-share-section">
        <text class="rp-share-title">{{ t('advancedResult.scalpHealth') }}</text>
        <view class="rp-share-curve">
          <svg class="rp-bell-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
            <path :d="getBellCurvePath(true)" fill="rgba(221,221,221,0.5)" stroke="none" />
            <path :d="getBellCurvePath(false)" fill="none" stroke="#7622FF" stroke-width="2" />
            <line :x1="getUserMarkerPosition" y1="20" :x2="getUserMarkerPosition" y2="90" stroke="#7A7A7A" stroke-width="1" />
            <circle :cx="getUserMarkerPosition" :cy="getBellCurveY(getUserMarkerPosition)" r="4" fill="white" stroke="#7622FF" stroke-width="2" />
          </svg>
          <view class="rp-share-percentile">
            <text>{{ t('advancedResult.aheadOfPeers', [getCurrentPercentile]) }}</text>
          </view>
          <view class="rp-share-curve-labels">
            <text>{{ t('advancedResult.lowEnd') }}</text>
            <text>{{ t('advancedResult.average') }}</text>
            <text>{{ t('advancedResult.highEnd') }}</text>
          </view>
        </view>
      </view>

      <view class="rp-share-section">
        <view class="rp-share-grid">
          <view class="rp-share-tile" v-for="(metric, idx) in shareGridMetrics" :key="'share-metric-' + idx">
            <view class="rp-share-tile-icon">
              <!-- 使用内联 SVG 代替 image 标签，防止 iOS 跨域问题 / Use inline SVG instead of image tag to avoid iOS cross-origin issues -->
              <svg v-if="metric.icon === 'egg'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3C8.5 3 5 9.33 5 14C5 17.87 8.13 21 12 21C15.87 21 19 17.87 19 14C19 9.33 15.5 3 12 3ZM13 18C10 18 8 16.01 8 13C8 12.45 8 12 8 12H10V13C10 15.92 12.42 16 13 16C13.55 16 14 16 14 16V18C14 18 13.55 18 13 18Z" fill="#7622FF"/>
              </svg>
              <svg v-else-if="metric.icon === 'dandruff'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.2002 17.2002C8.85705 17.2002 10.2002 15.857 10.2002 14.2002C10.2002 12.5433 8.85705 11.2002 7.2002 11.2002C5.54334 11.2002 4.2002 12.5433 4.2002 14.2002C4.2002 15.857 5.54334 17.2002 7.2002 17.2002Z" fill="#7622FF"/>
                <path d="M11.2002 9.2002C12.857 9.2002 14.2002 7.85705 14.2002 6.2002C14.2002 4.54334 12.857 3.2002 11.2002 3.2002C9.54334 3.2002 8.2002 4.54334 8.2002 6.2002C8.2002 7.85705 9.54334 9.2002 11.2002 9.2002Z" fill="#7622FF"/>
                <path d="M16.8002 20.8002C18.4571 20.8002 19.8002 19.4571 19.8002 17.8002C19.8002 16.1433 18.4571 14.8002 16.8002 14.8002C15.1433 14.8002 13.8002 16.1433 13.8002 17.8002C13.8002 19.4571 15.1433 20.8002 16.8002 20.8002Z" fill="#7622FF"/>
              </svg>
              <svg v-else-if="metric.icon === 'sensitivity'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.76 16.2402C6.67 15.1602 6 13.6602 6 12.0002C6 10.3402 6.67 8.84018 7.76 7.76018L9.18 9.18018C8.45 9.90018 8 10.9002 8 12.0002C8 13.1002 8.45 14.1002 9.17 14.8302L7.76 16.2402ZM16.24 16.2402C17.33 15.1602 18 13.6602 18 12.0002C18 10.3402 17.33 8.84018 16.24 7.76018L14.82 9.18018C15.55 9.90018 16 10.9002 16 12.0002C16 13.1002 15.55 14.1002 14.83 14.8302L16.24 16.2402ZM12 10.0002C10.9 10.0002 10 10.9002 10 12.0002C10 13.1002 10.9 14.0002 12 14.0002C13.1 14.0002 14 13.1002 14 12.0002C14 10.9002 13.1 10.0002 12 10.0002ZM20 12.0002C20 14.2102 19.1 16.2102 17.65 17.6502L19.07 19.0702C20.88 17.2602 22 14.7602 22 12.0002C22 9.24018 20.88 6.74018 19.07 4.93018L17.65 6.35018C19.1 7.79018 20 9.79018 20 12.0002ZM6.35 6.35018L4.93 4.93018C3.12 6.74018 2 9.24018 2 12.0002C2 14.7602 3.12 17.2602 4.93 19.0702L6.35 17.6502C4.9 16.2102 4 14.2102 4 12.0002C4 9.79018 4.9 7.79018 6.35 6.35018Z" fill="#7622FF"/>
              </svg>
              <svg v-else-if="metric.icon === 'density'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8C19.1 8 20 7.1 20 6C20 4.9 19.1 4 18 4C16.9 4 16 4.9 16 6C16 7.1 16.9 8 18 8ZM18 16C19.1 16 20 15.1 20 14C20 12.9 19.1 12 18 12C16.9 12 16 12.9 16 14C16 15.1 16.9 16 18 16ZM6 8C4.9 8 4 8.9 4 10C4 11.1 4.9 12 6 12C7.1 12 8 11.1 8 10C8 8.9 7.1 8 6 8ZM14 8C12.9 8 12 8.9 12 10C12 11.1 12.9 12 14 12C15.1 12 16 11.1 16 10C16 8.9 15.1 8 14 8ZM10 16C11.1 16 12 15.1 12 14C12 12.9 11.1 12 10 12C8.9 12 8 12.9 8 14C8 15.1 8.9 16 10 16ZM10 4C8.9 4 8 4.9 8 6C8 7.1 8.9 8 10 8C11.1 8 12 7.1 12 6C12 4.9 11.1 4 10 4ZM14 16C12.9 16 12 16.9 12 18C12 19.1 12.9 20 14 20C15.1 20 16 19.1 16 18C16 16.9 15.1 16 14 16ZM6 20C7.1 20 8 19.1 8 18C8 16.9 7.1 16 6 16C4.9 16 4 16.9 4 18C4 19.1 4.9 20 6 20Z" fill="#7622FF"/>
              </svg>
              <svg v-else-if="metric.icon === 'hair_radius'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.9998 4.0698V2.0498C8.9898 2.2498 7.1598 3.0498 5.6798 4.2598L7.0998 5.6898C8.20981 4.8298 9.5398 4.2498 10.9998 4.0698ZM18.3198 4.2598C16.8398 3.0498 15.0098 2.2498 12.9998 2.0498V4.0698C14.4598 4.2498 15.7898 4.8298 16.8998 5.6898L18.3198 4.2598ZM19.9298 10.9998H21.9498C21.7498 8.9898 20.9498 7.1598 19.7398 5.6798L18.3098 7.0998C19.1698 8.20981 19.7498 9.5398 19.9298 10.9998ZM5.6898 7.0998L4.2598 5.6798C3.0498 7.1598 2.2498 8.9898 2.0498 10.9998H4.0698C4.2498 9.5398 4.8298 8.20981 5.6898 7.0998ZM4.0698 12.9998H2.0498C2.2498 15.0098 3.0498 16.8398 4.2598 18.3198L5.6898 16.8898C4.8298 15.7898 4.2498 14.4598 4.0698 12.9998ZM14.9998 11.9998C14.9998 10.3398 13.6598 8.9998 11.9998 8.9998C10.3398 8.9998 8.9998 10.3398 8.9998 11.9998C8.9998 13.6598 10.3398 14.9998 11.9998 14.9998C13.6598 14.9998 14.9998 13.6598 14.9998 11.9998ZM18.3098 16.8998L19.7398 18.3298C20.9498 16.8498 21.7498 15.0098 21.9498 13.0098H19.9298C19.7498 14.4598 19.1698 15.7898 18.3098 16.8998ZM12.9998 19.9298V21.9498C15.0098 21.7498 16.8398 20.9498 18.3198 19.7398L16.8898 18.3098C15.7898 19.1698 14.4598 19.7498 12.9998 19.9298ZM5.6798 19.7398C7.1598 20.9498 8.9998 21.7498 10.9998 21.9498V19.9298C9.5398 19.7498 8.20981 19.1698 7.0998 18.3098L5.6798 19.7398Z" fill="#7622FF"/>
              </svg>
              <svg v-else-if="metric.icon === 'grey'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M6.04243 12C8.1898 12.7143 9.37419 12.8134 12.3158 12C11.859 13.8474 11.6459 16.1128 11.6459 19.0265C11.6459 20.4493 10.7748 21.3639 9.65924 21.7682C9.23348 21.9223 8.77645 22 8.32334 22C7.87023 22 7.41243 21.923 6.98666 21.7689C5.87185 21.366 5 20.4507 5 19.0265C5 16.353 5.34956 14.0195 6.04243 12Z" fill="#7622FF"/>
                <path d="M6.70508 13.2461C7.42779 13.4421 8.11476 13.5632 8.86816 13.5732C9.53709 13.5821 10.2316 13.5034 11.0254 13.3428C10.765 14.9603 10.6455 16.827 10.6455 19.0264C10.6455 19.8893 10.1843 20.4618 9.46582 20.7695L9.31836 20.8281C9.0052 20.9414 8.66369 21 8.32324 21C7.98137 21 7.6393 20.9411 7.32715 20.8281H7.32617C6.52623 20.5389 6 19.9486 6 19.0264C6.00001 16.8468 6.24121 14.9285 6.70508 13.2461ZM17.2803 3.49316C15.2981 4.96283 13.7416 6.43516 12.6553 8.36816C12.1797 9.21458 11.7981 10.1411 11.5 11.1816C10.3679 11.4699 9.58155 11.5824 8.89453 11.5732C8.39231 11.5666 7.91582 11.4942 7.36426 11.3525C7.88865 10.1224 8.55876 9.03777 9.37598 8.08691C11.2156 5.94641 13.8313 4.43074 17.2803 3.49316Z" stroke="#7622FF" stroke-width="2"/>
              </svg>
              <svg v-else-if="metric.icon === 'terminal'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 6 1C3.24 1 1 3.24 1 6C1 8.76 3.24 11 6 11ZM6 3C7.65 3 9 4.35 9 6C9 7.65 7.65 9 6 9C4.35 9 3 7.65 3 6C3 4.35 4.35 3 6 3Z" fill="#7622FF"/>
                <path d="M21 14H16C14.9 14 14 14.9 14 16V21C14 22.1 14.9 23 16 23H21C22.1 23 23 22.1 23 21V16C23 14.9 22.1 14 21 14ZM21 21H16V16H21V21Z" fill="#7622FF"/>
                <path d="M17.71 7.7C18.11 7.89 18.54 8 19 8C20.65 8 22 6.65 22 5C22 3.35 20.65 2 19 2C17.35 2 16 3.35 16 5C16 5.46 16.11 5.89 16.3 6.29L6.29 16.3C5.89 16.11 5.46 16 5 16C3.35 16 2 17.35 2 19C2 20.65 3.35 22 5 22C6.65 22 8 20.65 8 19C8 18.54 7.89 18.11 7.7 17.71L17.71 7.7Z" fill="#7622FF"/>
              </svg>
              <svg v-else-if="metric.icon === 'follicle_density'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 15H3V21H9V19H5V15ZM5 5H9V3H3V9H5V5ZM21 3H15V5H19V9H21V3ZM19 19H15V21H21V15H19V19Z" fill="#7622FF"/>
                <path d="M10.8639 15.9073C11.3101 15.7456 11.6585 15.3797 11.6585 14.8106C11.6585 12.8858 11.891 11.6684 12.411 10.7431C12.9276 9.82397 13.7419 9.17343 14.9044 8.3886C14.9759 8.34025 15.0144 8.25713 14.9953 8.1726C14.9691 8.05583 14.8431 7.98063 14.7141 8.00438C12.8373 8.35382 11.4098 9.05412 10.4473 10.174C9.48797 11.2902 9.00017 12.8132 9.00017 14.8106C9.00017 15.3803 9.34891 15.7464 9.79484 15.9075C9.96514 15.9692 10.1483 16 10.3295 16C10.5108 16 10.6936 15.9689 10.8639 15.9073Z" fill="#7622FF"/>
              </svg>
            </view>
            <text class="rp-share-tile-label">{{ t(metric.nameKey) }}</text>
            <text class="rp-share-tile-score">{{ getMetricFieldScore(metric.dataField) || '—' }}</text>
          </view>
        </view>
      </view>

      <view class="rp-share-footer">
        <view class="rp-share-footer-text">
          <text class="rp-share-footer-cta">{{ t('advancedResult.shareCardCta') }}</text>
        </view>
        <!-- 使用真实二维码图片，指向 https://lushair.net/download-app / Use real QR code image pointing to download URL -->
        <image class="rp-share-qr" src="/static/images/qrcode-download.png" mode="aspectFit"></image>
      </view>
    </view>

    <view class="rp-preview" v-if="showImagePreview" @click="closeImagePreview">
      <view class="rp-preview-inner" @click.stop>
        <view class="rp-preview-close" @click="closeImagePreview"><text>×</text></view>
        <swiper class="rp-preview-swiper" :current="currentPreviewIndex" @change="onPreviewSwiperChange" circular>
          <swiper-item v-for="(img, index) in previewImages" :key="'preview-' + index">
            <view class="rp-preview-img-wrap">
              <image class="rp-preview-img" :src="img" mode="aspectFit" />
            </view>
          </swiper-item>
        </swiper>
        <view class="rp-preview-dots" v-if="previewImages.length > 1">
          <view
            class="rp-preview-dot"
            v-for="(img, index) in previewImages"
            :key="'dot-' + index"
            :class="{ active: currentPreviewIndex === index }"
            @click="switchPreviewImage(index)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss">
@import '@/styles/result-page-shell.scss';
</style>
