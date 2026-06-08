 <script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';
import html2canvas from 'html2canvas';

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
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

const pushType = ref('0');
const recordId = ref(0);
// reportId相关变量 reportId related variables
const reportIdFromList = ref<string>(''); // 从列表传来的reportId reportId from list
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
    dataField: 'follicle_score_map',
    standardRange: '1-3发/囊',
    icon: '/static/icons/icon_follicle_density.svg',
    displayIcon: '/static/icons/icon_follicle_density_black.svg'
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
        'follicleDensity': 'avg_hair_count'
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
    default:
      return '';
  }
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
      // 毛囊密度分布：基于1-3发/囊标准
      // 0-1: 极低密度 (5-20百分位)
      // 1-1.5: 低密度 (20-40百分位)
      // 1.5-2.5: 正常 (40-70百分位)
      // 2.5-3: 良好 (70-85百分位)
      // 3+: 优秀 (85-95百分位)
      if (score <= 1) {
        percentile = 5 + (score / 1) * 15;
      } else if (score <= 1.5) {
        percentile = 20 + ((score - 1) / 0.5) * 20;
      } else if (score <= 2.5) {
        percentile = 40 + ((score - 1.5) / 1) * 30;
      } else if (score <= 3) {
        percentile = 70 + ((score - 2.5) / 0.5) * 15;
      } else {
        percentile = 85 + Math.min(10, (score - 3) / 1 * 10);
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

// 获取summary文本内容（多语言组合逻辑）
const getSmartSummaryText = () => {
  if (useNewAnalysisMode.value) {
    if (analysisReport.value && analysisReport.value.actionable_plan) {
      const adviceList = analysisReport.value.actionable_plan.advice;
      if (Array.isArray(adviceList) && adviceList.length > 0) {
        return adviceList.join('\n');
      }
    }
    // 新模式下，如果报告还未返回，显示加载中的提示
    return 'Analyzing your hair profile...';
  }

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
const showErrorPopup = (err: any) => {
  const message = getSpecificErrorMessage(err);
  uni.showModal({
    title: t('advancedResult.fetchDataFailed'),
    content: message,
    showCancel: false,
    confirmText: 'OK'
  });
};

// Share results — capture the result page as a long image and share/download it.
const shareResults = () => {
  const score = Math.round(analysisData.value?.scalpScore || 0);
  const shareText = `My hair health score is ${score}/100! Check yours with Lushair.`;

  uni.showLoading({ title: 'Generating image...' });

  setTimeout(() => {
    const element = document.querySelector('.advanced-result') as HTMLElement | null;
    if (!element) {
      uni.hideLoading();
      uni.showToast({ title: 'Page not ready', icon: 'none' });
      return;
    }

    html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      ignoreElements: (el: Element) =>
        el.classList && (el.classList.contains('share-button') || el.classList.contains('back-button'))
    }).then((canvas) => {
      uni.hideLoading();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'lushair-result.png', { type: 'image/png' });

        // Native bridges (iOS/Android WebViews)
        const dataUrl = canvas.toDataURL('image/png');
        const ua = navigator.userAgent;
        const isiOS = /\(i[^;]+;( U;)? CPU.+Mac OS X/.test(ua);
        const isAndroid = ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1;
        if (isiOS && (window as any).webkit?.messageHandlers?.savePassportImage) {
          (window as any).webkit.messageHandlers.savePassportImage.postMessage({ action: 'savePassportImage', imageData: dataUrl });
          uni.showToast({ title: 'Image sent', icon: 'success' });
          return;
        }
        if (isAndroid && (window as any).android?.savePassportImage) {
          (window as any).android.savePassportImage(dataUrl);
          uni.showToast({ title: 'Image sent', icon: 'success' });
          return;
        }

        // H5: try Web Share API with file, fall back to download
        // @ts-ignore
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await (navigator as any).share({ files: [file], title: 'Lushair - Hair Health Results', text: shareText });
            return;
          } catch { /* user cancelled or unsupported, fall through */ }
        }
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'lushair-result.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        uni.showToast({ title: 'Image downloaded', icon: 'success' });
      }, 'image/png');
    }).catch((err: Error) => {
      uni.hideLoading();
      uni.showToast({ title: 'Failed: ' + err.message, icon: 'none' });
    });
  }, 300);
};

// 获取分析历史数据
const fetchAnalysisHistory = async (userId: string) => {
  if (!userStore.userInfo?.userId) {
    console.error('用户ID不存在');
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    console.log('调用 analyse/goHis API，参数:', { 
      userId: userId, 
      recordId: recordId.value 
    });
    
    // 设置超时时间为30秒 Set timeout to 30 seconds
    const response = await post('analyse/goHis', {
      userId: userId,
      recordId: recordId.value
    }, { timeout: 30000 });
    
    console.log('analyse/goHis API 响应:', response);
    analysisData.value = response;
    
    // 这里可以根据API响应更新页面数据
    // 例如：如果API返回了新的分数，可以更新 hairScore.value
    
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
      
      // 计算图表宽度 Calculate chart width
      const listLength = (response as any).list.length;
      chartWidth.value = (listLength * 80 + 40) + 'px';
      
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
        keratin_ratio: analysisData.value.keratinocytes_score_map?.score || 0,
        oil_ratio: (analysisData.value.scalp_oil_area_score_map?.score || 0) / 100,
        sensitivity_ratio: analysisData.value.redness_area_score_map?.score || 0
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
    showErrorPopup(error);
    // 发生错误时也要更新状态
    if (useNewAnalysisMode.value) {
      showNoDataState.value = true;
    }
    // 重置标志,允许重试 Reset flag to allow retry
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
        // 重置标志,允许重试 Reset flag to allow retry
        isExistingReportCalled.value = false;
        showErrorPopup(error);
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
  // 新模式下：如果 analysisReport 还未返回且不是显示空数据状态，则表示正在加载
  if (useNewAnalysisMode.value) {
    return !analysisReport.value && !showNoDataState.value;
  }
  // 旧模式下：不需要加载状态
  return false;
});

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
  // 处理生成更多摘要
  console.log('Generate more summary');
  chatWithAssistant();
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

// 六边形指标计算逻辑
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

  // 根据grade值转换为数值（0.7=偏低, 1.1=标准, 1.3=偏高）
  const gradeToValue = (grade: string) => {
    switch (grade) {
      case '偏低': return 0.7;
      case '标准': return 1.3;
      case '偏高': return 1.5;
      default: return 1.3;
    }
  };

  return {
    follicle: gradeToValue(analysisData.value.follicle_score_map?.grade || '标准'),
    hairDensity: gradeToValue(analysisData.value.hair_density_score_map?.grade || '标准'),
    hairTexture: gradeToValue(analysisData.value.hair_texture_score_map?.grade || '标准'),
    keratinocytes: gradeToValue(analysisData.value.keratinocytes_score_map?.grade || '标准'),
    scalpOil: gradeToValue(analysisData.value.scalp_oil_area_score_map?.grade || '标准'),
    redness: gradeToValue(analysisData.value.redness_area_score_map?.grade || '标准')
  };
};

// 生成六边形路径
const generateHexagonPath = () => {
  const metrics = getHexagonMetrics();
  const centerX = 80; // 图表中心X坐标
  const centerY = 80; // 图表中心Y坐标
  const baseRadius = 50; // 基础半径
  
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
  
  const centerX = 80; // canvas中心X坐标
  const centerY = 80; // canvas中心Y坐标
  const baseRadius = 50; // 基础半径
  
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
  ctx.clearRect(0, 0, 160, 160);
  
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
  ctx.setStrokeStyle('#6B3CEE');
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
  const chartHeight = 160; // 图表总高度
  const usableHeight = chartHeight - 40; // 减去上下边距
  
  // 计算从顶部开始的位置（分数越高，位置越靠上）
  return Math.floor(chartHeight - ((score - minScore) / (maxScore - minScore)) * usableHeight - 20);
};

// 获取连接线的样式
const getConnectorStyle = (index: number, type: string) => {
  if (!healthRecords.value[index] || !healthRecords.value[index + 1]) return {};
  
  const record1 = healthRecords.value[index] as any;
  const record2 = healthRecords.value[index + 1] as any;
  
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
  const userId = options.userId || userStore.userInfo?.userId || '';
  currentUserId.value = userId; // 保存userId Save userId
  
  if (options.pushType) {
    pushType.value = options.pushType;
  }
  
  // 获取reportId Get reportId
  reportIdFromList.value = options.reportId || '';
  
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
        if (options.userId) {
          userStore.userInfo.userId = options.userId;
          fetchHealthData(options.userId),
          fetchProductRecommendations(options.userId)
        }
      }
    } catch (e) {
      console.error('解析data参数失败: Failed to parse data param:', e, 'raw data:', options.data);
    }
  } else if (options.id) {
    recordId.value = parseInt(options.id, 10);
    fetchAnalysisHistory(options.userId);
    fetchHealthData(options.userId),
    fetchProductRecommendations(options.userId)
  } else if (options.userId) {
    fetchAnalysisHistory(options.userId),
    fetchHealthData(options.userId),
    fetchProductRecommendations(options.userId)
  }

  // 判断是否有reportId，有则调用GET report接口；否则调用分析接口
    // If has reportId, call GET report API; otherwise call analysis API
    if (reportIdFromList.value) {
        console.log('从列表获取到reportId，调用GET report接口: Got reportId from list, calling GET report API:', reportIdFromList.value);
        await fetchExistingReport();
    } else {
        // 调用AI分析接口获取reportId (如果analysisData.value已有数据)
        // Call AI analysis API to get reportId (if analysisData.value has data)
        if (analysisData.value && useNewAnalysisMode.value) {
            const uId = options.userId || userStore.userInfo?.userId || currentUserId.value;
            if (uId) {
                await fetchAIAnalysis(uId);
            }
            // fetchAIAnalysis内部已处理reportId的保存和事件通知
            // reportId saving and event notification are handled inside fetchAIAnalysis
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
  if (newVal && useNewAnalysisMode.value) {
      // 优先从data内取userId，其次从onMounted中保存的currentUserId（来自URL参数），最后从userStore取
      // Priority: userId in data > currentUserId saved from URL options > userStore
      const uId = newVal.userId || currentUserId.value || userStore.userInfo?.userId;
      // 防止重复调用: 如果onMounted已经调用过，这里可能会再次触发? 
      // 实际上fetchAIAnalysis内部可以加防抖，或者这里只在userId存在且analysisReport为空时调用
      if (reportIdFromList.value) {
          console.log('从列表获取到reportId，调用GET report接口: Got reportId from list, calling GET report API:', reportIdFromList.value);
          fetchExistingReport();
      } else {
        if (uId && !analysisReport.value) {
          console.log('触发AI分析，userId: Triggering AI analysis, userId:', uId);
          fetchAIAnalysis(uId);
        }
      }
  }
});
</script>

<template>
  <view class="advanced-result">
    <!-- 头部 -->
    <view class="header" :style="headerPaddingStyle(0)">
      <view class="header-content">
        <text class="header-title">{{ t('advancedResult.title') }}</text>
        <view class="back-button" @click="handleBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="share-button" @click="shareResults">
          <image class="share-icon" src="/static/icons/share.svg" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 标题区域 -->
    <view class="title-section" :style="headerPaddingStyle(80)">
      <view class="title-row">
        <text class="main-title">{{ t('advancedResult.title') }}</text>
        <view class="badge">
          <image class="badge-icon" src="/static/icons/blur_on_black.svg" mode="aspectFit" />
          <text class="badge-text">{{ isQuickScan ? t('quickResult.quickScan') : t('advancedResult.advancedScan') }}</text>
        </view>
      </view>
      <text class="date-text">{{ formatDateTime(analysisData?.createTime) }}</text>
    </view>

    <!-- 分数卡片 -->
    <view class="score-card">
      <view class="score-header">
        <text class="score-title">{{ t('advancedResult.yourHairScore') }}</text>
        <view class="score-display">
          <text class="score-number">{{ Math.round(analysisData?.scalpScore || 0) }}</text>
          <text class="score-out-of">{{ t('advancedResult.outOf100') }}</text>
        </view>
      </view>

      <!-- 趋势图表区域 -->
      <view class="trend-section">
        <scroll-view 
          scroll-x="true" 
          class="trend-chart-scroll"
          :scroll-left="trendChartScrollLeft"
          :scroll-with-animation="true"
          show-scrollbar="false">
          <view class="trend-chart-wrapper" :style="{ width: chartWidth }">

            <!-- 折线图 -->
            <view class="chart-area">
              <!-- 连接线 - 只显示scalpScore -->
              <view v-for="(_, index) in healthRecords.slice(0, -1)" :key="'scalp-connector-'+index" 
                    class="line-connector scalp"
                    :class="{ 'latest': index === healthRecords.length - 2 }"
                    :style="getConnectorStyle(index, 'scalpScore')">
              </view>
              
              <!-- 数据点 - 只显示scalpScore -->
              <view 
                v-for="(record, index) in healthRecords" 
                :key="'scalp-' + index" 
                class="chart-point scalp"
                :class="{ 'latest': index === healthRecords.length - 1 }"
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
        
        <!-- <view class="trend-info">
          <text class="trend-label">{{ t('advancedResult.good') }}</text>
          <view class="improvement-badge">
            <text class="improvement-text">+ {{ improvement }}</text>
          </view>
        </view> -->
      </view>

      <!-- 图表图例 -->
      <!-- <view class="chart-legend">
        <view class="legend-item">
          <view class="legend-color scalp"></view>
          <text class="legend-text">{{ t('analysis.scalp') }}</text>
        </view>
      </view> -->

      <!-- 时间轴 -->
      <!-- <view class="timeline">
        <view class="timeline-item" v-for="(date, index) in ['6 Aug', '17 Aug', '29 Aug', '6 Sep', '25 Sep', '12 Oct', '28 Oct']" :key="index">
          <view class="timeline-dot"></view>
          <text class="timeline-date">{{ date }}</text>
        </view>
      </view> -->

      <text v-if="improvement > 0" class="improvement-text">{{ t('advancedResult.improvement', [improvement]) }}</text>

      <!-- 脱发模式 -->
      <!-- <view class="hair-loss-section">
        <view class="section-header">
          <text class="section-title">{{ t('advancedResult.hairLossPattern') }}</text>
          <text class="section-subtitle">{{ t('advancedResult.levelOf', [hairLossLevel]) }}</text>
        </view>
        
        <view class="level-indicator">
          <view class="level-bar">
            <view class="level-item" v-for="i in 7" :key="i" :class="{ active: i === hairLossLevel }">
              <text class="level-number">{{ i }}</text>
            </view>
          </view>
          <view class="level-labels">
            <text class="level-label">{{ t('advancedResult.mildHairloss') }}</text>
            <text class="level-label">{{ t('advancedResult.severeHairloss') }}</text>
          </view>
        </view>

        <text class="hairline-description">{{ t('advancedResult.normalHairline') }}</text>
      </view> -->

    </view>

    <!-- 智能摘要 -->
    <view class="smart-summary">
      <view class="summary-header">
        <view class="summary-title">
          <image src="/static/images/assistant.svg" mode="aspectFit" class="logo-image" />
          <text class="summary-text">{{ t('advancedResult.smartSummary') }}</text>
        </view>
      </view>
      
      <view class="summary-content">
        <text class="summary-description">
          {{ getSmartSummaryText() }}
        </text>
        
        <!-- <view class="suggestions">
          <text class="suggestions-title">{{ t('advancedResult.suggestions') }}</text>
          <text class="suggestions-text">
            {{ t('advancedResult.suggestionsText') }}
          </text>
        </view> -->
      </view>

      <button class="generate-button" @click="handleGenerateMore">
        {{ t('advancedResult.generateMore') }}
      </button>
    </view>

    <!-- 产品推荐 -->
    <view class="product-recommendations">
      <view class="section-header">
        <text class="section-title">{{ t('advancedResult.picksForYou') }}</text>
        <text class="section-subtitle">{{ t('advancedResult.aiRecommendedProducts') }}</text>
      </view>

      <!-- 有产品数据时显示产品列表 -->
      <scroll-view class="product-scroll" scroll-x v-if="!showNoDataState && (products.length > 0 || productRecommendations.length > 0)">
        <view class="product-list">
          <view class="product-item" v-for="product in (products.length > 0 ? products : productRecommendations)" :key="product.id || product.type">
            <view class="product-header" v-if="!useNewAnalysisMode">
              <TablerIcon :name="getProductTypeIcon(product.type)" :size="18" class="product-type-icon" />
              <text class="product-type">{{ getProductTypeName(product.type) }}</text>
            </view>
            
            <view class="product-card">
              <image class="product-image" :src="product.image" mode="aspectFill" />
              <view class="product-info">
                <view class="product-name">
                  <!-- <text class="product-category">{{ t(`advancedResult.${getProductNameKey(product)}`) }}</text> -->
                  <text class="product-full-name">{{ product.fullName || product.name }}</text>
                </view>
                
                <view class="product-tags" v-if="product.tags && !useNewAnalysisMode">
                  <text class="tags-label">{{ t('advancedResult.goodFor') }}</text>
                  <view class="tags-list">
                    <view class="tag" v-for="tag in product.tags" :key="tag">
                      <text class="tag-text">{{ t(`advancedResult.${tag}`) }}</text>
                    </view>
                    <view class="tag">
                      <text class="tag-text">+ {{ product.tags.length }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 新API模式加载中状态 -->
      <view class="loading-container" v-if="isLoadingProducts">
        <view class="loading-content">
          <view class="loading-spinner"></view>
          <!-- <text class="loading-text">{{ t('advancedResult.loadingProducts') || 'Analyzing and generating personalized recommendations...' }}</text> -->
        </view>
      </view>

      <!-- 无产品数据时显示空状态 -->
      <view class="no-data-container" v-if="showNoDataState && !isLoadingProducts">
        <view class="no-data-content">
          <TablerIcon name="package" :size="32" class="no-data-icon" />
          <text class="no-data-title">{{ t('advancedResult.noProductData') }}</text>
          <text class="no-data-description">{{ t('advancedResult.noProductDataDescription') }}</text>
        </view>
      </view>
    </view>

    <!-- 指标图表 -->
    <view class="metrics-section">
      <view class="section-header">
        <text class="section-title">{{ t('advancedResult.yourMetrics') }}</text>
        <text class="section-subtitle">{{ t('advancedResult.metricsDescription') }}</text>
      </view>
      
        <view class="metrics-chart">
          <view class="radar-chart-container">
            <!-- 背景六边形网格 -->
            <image src="/static/images/bg_chart.svg" mode="aspectFit" class="chart-background" />
            
            <!-- 动态紫色六边形 - 使用canvas -->
            <canvas 
              canvas-id="hexagonCanvas" 
              class="hexagon-canvas"
            ></canvas>
          </view>
          
          <view class="chart-labels">
            <text class="chart-label" style="top: 16px; left: 60px;">{{ t('advancedResult.follicle') }}</text>
            <text class="chart-label" style="top: 16px; right: 60px;">{{ t('advancedResult.hairDensity') }}</text>
            <text class="chart-label" style="top: 132px; left: 11px;">{{ t('advancedResult.hairRadius') }}</text>
            <text class="chart-label" style="bottom: 16px; right: 72px;">{{ t('advancedResult.keratin') }}</text>
            <text class="chart-label" style="bottom: 16px; left: 72px;">{{ t('advancedResult.oiliness') }}</text>
            <text class="chart-label" style="top: 132px; right: 22px;">{{ t('advancedResult.sensitivity') }}</text>
          </view>
        </view>
    </view>

    <!-- 分数分解 -->
    <view class="score-breakdown">
      <view class="section-header">
        <text class="section-title">{{ t('advancedResult.scoreBreakdown') }}</text>
        <text class="section-subtitle">{{ t('advancedResult.tapIconsToLearn') }}</text>
      </view>

      <!-- 头皮健康卡片 -->
      <view class="breakdown-card">
        <text class="card-title">{{ t('advancedResult.scalpHealth') }}</text>
        
        <view class="chart-section">
          <view class="bell-curve">
            <view class="curve-container">
              <!-- SVG 钟形曲线 -->
              <svg class="bell-curve-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
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
                  stroke="#A855F7" 
                  stroke-width="2"
                />
                
                <!-- 用户位置垂直线 -->
                <line 
                  :x1="getUserMarkerPosition" 
                  :y1="20" 
                  :x2="getUserMarkerPosition" 
                  :y2="90" 
                  stroke="#9CA3AF" 
                  stroke-width="1"
                />
                
                <!-- 用户标记点 -->
                <circle 
                  :cx="getUserMarkerPosition" 
                  :cy="getBellCurveY(getUserMarkerPosition)" 
                  r="4" 
                  fill="white" 
                  stroke="#A855F7" 
                  stroke-width="2"
                />
              </svg>
              
              <!-- 百分位数标签 -->
              <view class="percentile-badge" :style="{ left: getUserMarkerPosition - 30 + 'px' }">
                <text class="percentile-text">{{ t('advancedResult.aheadOfPeers', [getCurrentPercentile]) }}</text>
              </view>
            </view>
            <view class="curve-labels">
              <text class="curve-label">{{ t('advancedResult.lowEnd') }}</text>
              <text class="curve-label">{{ t('advancedResult.average') }}</text>
              <text class="curve-label">{{ t('advancedResult.highEnd') }}</text>
            </view>
          </view>
          
          <view class="metric-buttons">
            <view 
              v-for="metric in scalpMetrics" 
              :key="metric.id"
              class="metric-button" 
              :class="{ active: selectedScalpMetric === metric.id }"
              @click="selectScalpMetric(metric.id)"
            >
              <view class="button-icon">
                <image v-if="metric.icon.startsWith('/')" :src="metric.icon" mode="aspectFit" class="button-icon-img" />
                <text v-else>{{ metric.icon }}</text>
              </view>
              <text class="button-label">{{ t(metric.nameKey) }}</text>
            </view>
          </view>
        </view>

        <view class="content-section">
          <view class="content-header">
            <view class="content-title">
              <image v-if="getCurrentMetricIcon.startsWith('/')" :src="getCurrentMetricIcon" mode="aspectFit" class="title-icon-img" />
              <TablerIcon v-else :name="getCurrentMetricIcon" :size="20" class="title-icon" />
              <text class="title-text">{{ getCurrentMetricName }}</text>
            </view>

            <view class="content-status">
              <text class="status-text">{{ getCurrentScalpStatus }}</text>
              <view class="status-value">
                <text class="value-number">{{ getCurrentScalpScore.toFixed(2) }}</text>
                <text class="value-unit">%</text>
              </view>
            </view>
          </view>
          <text class="content-description">
            {{ getCurrentScalpAdvice || t('advancedResult.percentileDescription', [getCurrentPercentile, selectedScalpMetric, 'high']) }}
          </text>
          
          <!-- 头皮健康卡片图片滑动区域 Scalp Health Card Image Scroll Area -->
          <view class="card-images-section" v-if="getScalpCardImages.length > 0">
            <scroll-view class="card-images-scroll" scroll-x show-scrollbar="false">
              <view class="card-images-list">
                <view 
                  class="card-image-item" 
                  v-for="(img, index) in getScalpCardImages" 
                  :key="'scalp-img-' + index"
                  @click="openImagePreview(getScalpCardImages, index)"
                >
                  <image class="card-image" :src="img" mode="aspectFill" />
                  <view class="card-image-view-btn" @click.stop="openImagePreview(getScalpCardImages, index)">
                    <image class="view-icon" src="/static/icons/icon_eye.svg" mode="aspectFit" />
                    <text class="view-text">VIEW</text>
                  </view>
                </view>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>

      <!-- 头发焦点卡片 -->
      <view class="breakdown-card">
        <text class="card-title">{{ t('advancedResult.hairFocus') }}</text>
        
        <view class="chart-section">
          <view class="bell-curve">
            <view class="curve-container">
              <!-- SVG 钟形曲线 -->
              <svg class="bell-curve-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
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
                  stroke="#A855F7" 
                  stroke-width="2"
                />
                
                <!-- 用户位置垂直线 -->
                <line 
                  :x1="getHairUserMarkerPosition" 
                  :y1="20" 
                  :x2="getHairUserMarkerPosition" 
                  :y2="90" 
                  stroke="#9CA3AF" 
                  stroke-width="1"
                />
                
                <!-- 用户标记点 -->
                <circle 
                  :cx="getHairUserMarkerPosition" 
                  :cy="getBellCurveY(getHairUserMarkerPosition)" 
                  r="4" 
                  fill="white" 
                  stroke="#A855F7" 
                  stroke-width="2"
                />
              </svg>
              
              <!-- 百分位数标签 -->
              <view class="percentile-badge" :style="{ left: getHairUserMarkerPosition - 30 + 'px' }">
                <text class="percentile-text">{{ t('advancedResult.aheadOfPeers', [getCurrentHairPercentile]) }}</text>
              </view>
            </view>
            <view class="curve-labels">
              <text class="curve-label">{{ t('advancedResult.lowEnd') }}</text>
              <text class="curve-label">{{ t('advancedResult.average') }}</text>
              <text class="curve-label">{{ t('advancedResult.highEnd') }}</text>
            </view>
          </view>
          
          <view class="metric-buttons">
            <view 
              v-for="metric in hairMetrics" 
              :key="metric.id"
              class="metric-button" 
              :class="{ active: selectedHairMetric === metric.id }"
              @click="selectHairMetric(metric.id)"
            >
              <view class="button-icon">
                <image v-if="metric.icon.startsWith('/')" :src="metric.icon" mode="aspectFit" class="button-icon-img" />
                <text v-else>{{ metric.icon }}</text>
              </view>
              <text class="button-label">{{ t(metric.nameKey) }}</text>
            </view>
          </view>
        </view>

        <view class="content-section">
          <view class="content-header">
            <view class="content-title">
              <image v-if="getCurrentHairMetricIcon.startsWith('/')" :src="getCurrentHairMetricIcon" mode="aspectFit" class="title-icon-img" />
              <TablerIcon v-else :name="getCurrentHairMetricIcon" :size="20" class="title-icon" />
              <text class="title-text">{{ getCurrentHairMetricName }}</text>
            </view>
            <view class="content-status">
              <text class="status-text">{{ getCurrentHairStatus }}</text>
              <view class="status-value">
                <text class="value-number">{{ getCurrentHairDisplayValue }}</text>
                <text class="value-unit">{{ getCurrentHairUnit }}</text>
              </view>
            </view>
          </view>
          <text class="content-description">
            {{ getCurrentHairAdvice || t('advancedResult.percentileDescription', [getCurrentHairPercentile, selectedHairMetric, 'normal']) }}
          </text>
          
          <!-- 头发焦点卡片图片滑动区域 Hair Focus Card Image Scroll Area -->
          <view class="card-images-section" v-if="getHairCardImages.length > 0">
            <scroll-view class="card-images-scroll" scroll-x show-scrollbar="false">
              <view class="card-images-list">
                <view 
                  class="card-image-item" 
                  v-for="(img, index) in getHairCardImages" 
                  :key="'hair-img-' + index"
                  @click="openImagePreview(getHairCardImages, index)"
                >
                  <image class="card-image" :src="img" mode="aspectFill" />
                  <view class="card-image-view-btn" @click.stop="openImagePreview(getHairCardImages, index)">
                    <image class="view-icon" src="/static/icons/icon_eye.svg" mode="aspectFit" />
                    <text class="view-text">VIEW</text>
                  </view>
                </view>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>

      <!-- 毛囊焦点卡片 -->
      <view class="breakdown-card">
        <text class="card-title">{{ t('advancedResult.follicleFocus') }}</text>
        
        <view class="chart-section">
          <view class="bell-curve">
            <view class="curve-container">
              <!-- SVG 钟形曲线 -->
              <svg class="bell-curve-svg" viewBox="0 0 311 110" xmlns="http://www.w3.org/2000/svg">
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
                  stroke="#A855F7" 
                  stroke-width="2"
                />
                
                <!-- 用户位置垂直线 -->
                <line 
                  :x1="getFollicleUserMarkerPosition" 
                  :y1="20" 
                  :x2="getFollicleUserMarkerPosition" 
                  :y2="90" 
                  stroke="#9CA3AF" 
                  stroke-width="1"
                />
                
                <!-- 用户标记点 -->
                <circle 
                  :cx="getFollicleUserMarkerPosition" 
                  :cy="getBellCurveY(getFollicleUserMarkerPosition)" 
                  r="4" 
                  fill="white" 
                  stroke="#A855F7" 
                  stroke-width="2"
                />
              </svg>
              
              <!-- 百分位数标签 -->
              <view class="percentile-badge" :style="{ left: getFollicleUserMarkerPosition - 30 + 'px' }">
                <text class="percentile-text">{{ t('advancedResult.aheadOfPeers', [getCurrentFolliclePercentile]) }}</text>
              </view>
            </view>
            <view class="curve-labels">
              <text class="curve-label">{{ t('advancedResult.lowEnd') }}</text>
              <text class="curve-label">{{ t('advancedResult.average') }}</text>
              <text class="curve-label">{{ t('advancedResult.highEnd') }}</text>
            </view>
          </view>
          
          <view class="metric-buttons">
            <view 
              v-for="metric in follicleMetrics" 
              :key="metric.id"
              class="metric-button" 
              :class="{ active: selectedFollicleMetric === metric.id }"
              @click="selectFollicleMetric(metric.id)"
            >
              <view class="button-icon">
                <image v-if="metric.icon.startsWith('/')" :src="metric.icon" mode="aspectFit" class="button-icon-img" />
                <text v-else>{{ metric.icon }}</text>
              </view>
              <text class="button-label">{{ t(metric.nameKey) }}</text>
            </view>
          </view>
        </view>

        <view class="content-section">
          <view class="content-header">
            <view class="content-title">
              <image v-if="getCurrentFollicleMetricIcon.startsWith('/')" :src="getCurrentFollicleMetricIcon" mode="aspectFit" class="title-icon-img" />
              <TablerIcon v-else :name="getCurrentFollicleMetricIcon" :size="20" class="title-icon" />
              <text class="title-text">{{ getCurrentFollicleMetricName }}</text>
            </view>
            <view class="content-status">
              <text class="status-text">{{ getCurrentFollicleStatus }}</text>
              <view class="status-value">
                <text class="value-number">{{ getCurrentFollicleScore.toFixed(1) }}</text>
                <text class="value-unit">h/f</text>
              </view>
            </view>
          </view>
          <text class="content-description">
            {{ getCurrentFollicleAdvice || t('advancedResult.percentileDescription', [getCurrentFolliclePercentile, selectedFollicleMetric, 'good']) }}
          </text>
          
          <!-- 毛囊焦点卡片图片滑动区域 Follicle Focus Card Image Scroll Area -->
          <view class="card-images-section" v-if="getFollicleCardImages.length > 0">
            <scroll-view class="card-images-scroll" scroll-x show-scrollbar="false">
              <view class="card-images-list">
                <view 
                  class="card-image-item" 
                  v-for="(img, index) in getFollicleCardImages" 
                  :key="'follicle-img-' + index"
                  @click="openImagePreview(getFollicleCardImages, index)"
                >
                  <image class="card-image" :src="img" mode="aspectFill" />
                  <view class="card-image-view-btn" @click.stop="openImagePreview(getFollicleCardImages, index)">
                    <image class="view-icon" src="/static/icons/icon_eye.svg" mode="aspectFit" />
                    <text class="view-text">VIEW</text>
                  </view>
                </view>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>
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

    <!-- 邀请码卡片 -->
    <view class="invite-card">
      <view class="invite-content">
        <text class="invite-title">{{ t('advancedResult.friendsWantToTry') }}</text>
        <text class="invite-description">{{ t('advancedResult.sendInviteCode') }}</text>
      </view>
      <button class="invite-button" @click="handleCopyInviteCode">
        <image class="copy-button-icon" src="/static/icons/icon_copy.svg" mode="aspectFit" />
        <text class="button-text">{{ t('advancedResult.copyInviteCode') }}</text>
      </button>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-buttons">
      <button class="secondary-button" @click="handleRetakeScan">
        {{ t('advancedResult.retakeScan') }}
      </button>
      <button class="primary-button" @click="handleExit">
        {{ t('advancedResult.exit') }}
      </button>
    </view>

    <!-- 图片预览弹窗 Image Preview Modal -->
    <view class="image-preview-modal" v-if="showImagePreview" @click="closeImagePreview">
      <view class="preview-container" @click.stop>
        <!-- 关闭按钮 Close Button -->
        <view class="preview-close-btn" @click="closeImagePreview">
          <text class="close-icon">×</text>
        </view>
        
        <!-- 图片滑动区域 Image Swiper -->
        <swiper 
          class="preview-swiper" 
          :current="currentPreviewIndex"
          @change="onPreviewSwiperChange"
          circular
        >
          <swiper-item v-for="(img, index) in previewImages" :key="'preview-' + index">
            <view class="preview-image-wrapper">
              <image class="preview-image" :src="img" mode="aspectFit" />
            </view>
          </swiper-item>
        </swiper>
        
        <!-- 指示器 Dots Indicator -->
        <view class="preview-indicators" v-if="previewImages.length > 1">
          <view 
            class="preview-dot" 
            v-for="(img, index) in previewImages" 
            :key="'dot-' + index"
            :class="{ active: currentPreviewIndex === index }"
            @click="switchPreviewImage(index)"
          ></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.advanced-result {
  min-height: 100vh;
  background-color: #FFFFFF;
  padding-bottom: 20px;
}

.logo-image {
  width: 24px;
  height: 24px;
}

.header {
  background: white;
  box-shadow: 0 4px 16px rgba(107, 60, 238, 0.06);
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
  color: #6B3CEE;
}

.share-button {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  background: #f0e6ff;
}

.share-icon {
  width: 22px;
  height: 22px;
}

.title-section {
  padding: 16px;
  /* padding-top is set dynamically via inline style (80px + statusBarHeight) */
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
  gap: 4px;
  padding: 0 4px;
  height: 28px;
  background: #FFFFFF;
  border: 0.5px solid #b8b8b8;
  border-radius: 4px;
}

.badge-icon {
  width: 16px;
  height: 16px;
}

.badge-text {
  font-family: 'Chivo', sans-serif;
  font-size: 12px;
  color: black;
}

.date-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: #9CA3AF;
}

.score-card {
  margin: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(107, 60, 238, 0.12);
  padding: 24px 0px 0px 0px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  gap: 16px;
}

.score-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 22px;
  color: #111827;
  text-align: center;
}

.score-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-number {
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 64px;
  line-height: 1.09;
  letter-spacing: -2px;
  color: #000000; font-weight: bold;
}

.score-out-of {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #6B7280;
}

.trend-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.trend-chart-scroll {
  width: 100%;
  height: 180px;
  background: #FFFFFF; /* was F3F4F6 */
  box-shadow: 0 4px 14px rgba(107, 60, 238, 0.05);
  border-radius: 16px;
}

.trend-chart-wrapper {
  position: relative;
  height: 160px;
  min-width: 100%;
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
  background-color: #A855F7;
}

.line-connector.scalp.latest {
  background-color: #f3f0fd;
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
  border: 2px solid #A855F7;
}

.chart-point.scalp .point-dot {
  background-color: #E2D9FF;
  border: 2px solid #323232;
}

.chart-point.scalp.latest .point-dot {
  background-color: #ffffff;
  border: 2px solid #323232;
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
  color: #111827;
  white-space: nowrap;
  display: block;
  text-align: center;
}

/* 图表图例 */
.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #323232;
}

.legend-color.scalp {
  background-color: #A855F7;
}

.legend-text {
  font-size: 12px;
  color: #111827;
  font-family: 'Chivo', sans-serif;
}

.trend-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-label {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #111827;
}

.improvement-badge {
  background: #FFD819;
  border-radius: 16px;
  padding: 2px 8px;
}

.improvement-text {
  font-family: 'Chivo', sans-serif;
  font-size: 12px;
  color: black;
}

.timeline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 38px;
}

.timeline-dot {
  width: 0;
  height: 5px;
  border-left: 0.8px solid #f5f5f5;
}

.timeline-date {
  font-family: 'Lato', sans-serif;
  font-weight: 500;
  font-size: 12px;
  color: #111827;
  text-align: center;
}

.improvement-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #111827;
  text-align: center;
}

.hair-loss-section {
  margin: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 22px;
  color: #111827;
}

.section-subtitle {
  font-family: 'Chivo', sans-serif;
  font-size: 12px;
  color: #323232;
}

.level-indicator {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.level-bar {
  display: flex;
  gap: 2px;
}

.level-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 12px;
  background: rgba(255, 216, 25, 0.3);
  border-radius: 16px;
}

.level-item.active {
  background: rgba(255, 216, 25, 0.5);
  border: 1px solid white;
}

.level-number {
  font-family: 'Chivo', sans-serif;
  font-weight: 500;
  font-size: 10px;
  color: #323232;
}

.level-item.active .level-number {
  font-weight: 600;
  color: #111827;
}

.level-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 100px;
}

.level-label {
  font-family: 'Chivo', sans-serif;
  font-size: 10px;
  color: #111827;
}

.hairline-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #111827;
  text-align: center;
}

.smart-summary {
  margin: 0 16px;
  background: #F3F1FF;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-icon {
  font-size: 24px;
}

.summary-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 18px;
  color: black;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 16px;
  color: black;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #323232;
}

.suggestions-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 16px;
  color: black;
}

.generate-button {
  background: #E2D9FF;
  color: #111827;
  border: none;
  border-radius: 16px;
  padding: 16px 18px;
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-recommendations {
  margin: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-scroll {
  width: 100%;
}

.product-list {
  display: flex;
  gap: 12px;
  padding: 0 16px;
}

.product-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 300px;
  flex-shrink: 0;
}

.product-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.product-type-icon {
  font-size: 16px;
}

.product-type {
  font-family: 'Archivo', sans-serif;
  font-size: 14px;
  color: #323232;
}

.product-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  box-shadow: 0 8px 24px rgba(107, 60, 238, 0.08);
  border-radius: 16px;
  height: 156px;
}

.product-image {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  background: #e9e9e9;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.product-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-category {
  font-family: 'Chivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #323232;
}

.product-full-name {
  font-family: 'Chivo', sans-serif;
  font-size: 16px;
  color: black;
  line-height: 1.5;
}

.product-tags {
  display: flex;
  gap: 24px;
}

.tags-label {
  font-family: 'Chivo', sans-serif;
  font-size: 10px;
  color: #9CA3AF;
  white-space: nowrap;
}

.tags-list {
  display: flex;
  gap: 4px;
}

.tag {
  background: #FFFFFF;
  border: 0.5px solid #b8b8b8;
  border-radius: 16px;
  padding: 2px 6px;
}

.tag-text {
  font-family: 'Chivo', sans-serif;
  font-size: 12px;
  color: black;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 16px;
  min-height: 200px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #6B3CEE;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #9CA3AF;
  max-width: 280px;
  line-height: 1.5;
}

.no-data-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 16px;
  min-height: 200px;
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.no-data-icon {
  font-size: 48px;
  opacity: 0.6;
}

.no-data-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 18px;
  color: #323232;
}

.no-data-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #9CA3AF;
  line-height: 1.5;
  max-width: 280px;
}

.metrics-section {
  margin: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metrics-chart {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(107, 60, 238, 0.12);
  height: 276px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-chart-container {
  position: relative;
  width: 230px;
  height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-background {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hexagon-canvas {
  position: absolute;
  width: 160px;
  height: 160px;
  z-index: 2;
}

.chart-labels {
  position: absolute;
  width: 100%;
  height: 100%;
}

.chart-label {
  position: absolute;
  font-family: 'Chivo', sans-serif;
  font-size: 10px;
  color: #323232;
}

.score-breakdown {
  margin: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.breakdown-card {
  background: white;
  box-shadow: 0 8px 24px rgba(107, 60, 238, 0.08);
  border-radius: 16px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.card-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: black;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bell-curve {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.curve-container {
  position: relative;
  height: 110px;
  background: transparent;
  border-radius: 4px;
}

.bell-curve-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.curve-line {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid #6B3CEE;
  border-radius: 4px;
}

.user-marker {
  position: absolute;
  right: 24px;
  top: 24px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-dot {
  width: 10px;
  height: 10px;
  background: #6B3CEE;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.percentile-badge {
  position: absolute;
  top: 6px;
  background: #6B3CEE;
  border-radius: 16px;
  padding: 0 4px;
  white-space: nowrap;
  z-index: 10;
}

.percentile-text {
  font-family: 'Chivo', sans-serif;
  font-size: 12px;
  color: #ffffff;
}

.vertical-line {
  position: absolute;
  right: 45px;
  top: 45px;
  width: 0;
  height: 65px;
  border-left: 1px solid #9CA3AF;
}

.curve-labels {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.curve-label {
  font-family: 'Chivo', sans-serif;
  font-size: 8px;
  color: #9CA3AF;
  flex: 1;
}

.curve-label:first-child {
  text-align: left;
}

.curve-label:nth-child(2) {
  text-align: center;
}

.curve-label:last-child {
  text-align: right;
}

.metric-buttons {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.metric-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.button-icon {
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #6B3CEE;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.button-icon-img {
  width: 20px;
  height: 20px;
}

.metric-button.active .button-icon {
  background: rgba(103, 57, 198, 0.2);
}

.button-label {
  font-family: 'Archivo', sans-serif;
  font-size: 8px;
  color: #6B3CEE;
  text-align: center;
  line-height: 1.1;
}

.metric-button:not(.active) .button-label {
  color: black;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 13px;
}

.content-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title-icon {
  font-size: 32px;
}

.title-icon-img {
  width: 32px;
  height: 32px;
}

.title-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 16px;
  color: black;
}

.content-status {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 6px 0;
}

.status-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: #2e1b54;
}

.status-value {
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.value-number {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 28px;
  color: black;
}

.value-unit {
  font-family: 'Chivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #9CA3AF;
}

.content-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #323232;
  line-height: 1.5;
}

.invite-card {
  margin: 0 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 24px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invite-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 18px;
  color: #323232;
  text-align: center;
}

.invite-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #323232;
  text-align: center;
  line-height: 1.5;
}

.invite-button {
  background: white;
  border: 1px solid #6B3CEE;
  border-radius: 16px;
  padding: 5px 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.copy-button-icon {
  width: 24px;
  height: 24px;
}

.button-icon {
  font-size: 16px;
}

.button-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #6B3CEE;
}

.bottom-buttons {
  margin: 20px 16px;
  display: flex;
  gap: 10px;
}

.secondary-button, .primary-button {
  flex: 1;
  height: 56px;
  border-radius: 16px;
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.secondary-button {
  background: white;
  color: #6B3CEE;
  border: 1px solid #6B3CEE;
}

.primary-button {
  background: #6B3CEE;
  color: #ffffff;
}

.positions-section {
  margin: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.positions-card {
  background: white;
  box-shadow: 0 8px 24px rgba(107, 60, 238, 0.08);
  border-radius: 16px;
  padding: 24px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.head-diagrams {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diagram-container {
  background: #f5f5f5;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  padding: 12px;
}

.diagram-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 48px;
}

.diagram-item {
  position: relative;
  width: 78px;
}

.head-image {
  width: 100%;
  height: 105px;
  border-radius: 16px;
}

.hotspot {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.hotspot-inner {
  position: absolute;
  width: 15px;
  height: 15px;
  background: rgba(46, 27, 84, 0.3);
  border-radius: 50%;
  top: 4.5px;
  left: 4.5px;
}

.hotspot-outer {
  position: absolute;
  width: 15px;
  height: 15px;
  background: rgba(46, 27, 84, 0.3);
  border: 1px dashed #ffffff;
  border-radius: 50%;
  top: 4.5px;
  left: 4.5px;
}

.position-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.position-badge {
  background: #6B3CEE;
  border-radius: 16px;
  padding: 4px 8px;
}

.position-name {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 16px;
  color: #111827;
}

.issues-count {
  font-family: 'Chivo', sans-serif;
  font-size: 10px;
  color: #323232;
  text-align: center;
}

.scan-details {
  display: flex;
  gap: 24px;
}

.scan-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.scan-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #878d96;
  text-align: center;
}

.scan-image {
  width: 150px;
  height: 162px;
  border-radius: 4px;
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
}

.view-button {
  background: transparent;
  border: none;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
}

.button-icon {
  font-size: 16px;
}

.button-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #6B3CEE;
}

.position-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.content-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.issue-badge {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 8px;
  border-left: 2px solid #6B3CEE;
}

.issue-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 500;
  font-size: 16px;
  color: #323232;
}

.issue-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: #323232;
  line-height: 1.5;
}

.scans-section {
  margin: 16px;
}

.scans-grid {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 0 16px;
}

/* ========== 卡片图片滑动区域样式 Card Image Scroll Area Styles ========== */
.card-images-section {
  margin-top: 16px;
}

.card-images-scroll {
  width: 100%;
  white-space: nowrap;
}

.card-images-list {
  display: inline-flex;
  gap: 12px;
}

.card-image-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.card-image {
  width: 120px;
  height: 120px;
  border-radius: 4px;
  object-fit: cover;
}

.card-image-view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 0;
}

.view-icon {
  width: 18px;
  height: 18px;
}

.view-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #6B3CEE;
  letter-spacing: 0.5px;
}

/* ========== 图片预览弹窗样式 Image Preview Modal Styles ========== */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-close-btn {
  position: absolute;
  top: 40px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: #FFFFFF; /* was F3F4F6 */
  box-shadow: 0 4px 14px rgba(107, 60, 238, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.close-icon {
  font-size: 28px;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
}

.preview-swiper {
  width: 100%;
  height: 70vh;
}

.preview-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
}

.preview-dot.active {
  background: #ffffff;
  width: 24px;
  border-radius: 4px;
}
</style>
