<template>
    <view class="rp-page" style="height: 100vh; overflow-y: auto; -webkit-overflow-scrolling: touch;">
        <ScanAnalyzingOverlay :visible="loadingAnalysis" />

        <view class="rp-topbar" :style="headerPaddingStyle(0)">
            <view class="rp-back" @tap="goBack"><text>‹</text></view>
            <text class="rp-topbar-title">{{ $t('selfieResult.title') }}</text>
            <view class="rp-share" @tap="shareResults">
                <image class="share-icon" src="/static/icons/share.svg" mode="aspectFit" />
            </view>
        </view>

        <view class="rp-body" :style="contentMarginStyle(48)">
            <view class="shell-card rp-hero-card">
                <view class="rp-hero-grid">
                    <view class="rp-photo" @tap="viewScan">
                        <image :src="imageUrl || '/static/images/placeholder-scan.jpg'" mode="aspectFill" />
                    </view>
                    <view class="rp-hero-info">
                        <view class="shell-src-badge">
                            <TablerIcon name="camera" :size="11" color="#fff" />
                            <text>{{ hairLossTypeLabel }}</text>
                        </view>
                        <text class="rp-date">{{ positionText }}</text>
                        <text v-if="currentDate" class="rp-date">{{ currentDate }}</text>
                        <view class="rp-stage-pill">
                            <text class="rp-stage-num">{{ $t('hair.level') }} {{ hairLossLevel }}</text>
                            <text class="rp-stage-of">/ 7</text>
                        </view>
                        <text class="rp-level-name">{{ levelDescriptor }}</text>
                    </view>
                </view>
            </view>

            <view class="shell-card rp-stage-detail">
                <text class="shell-label">{{ $t('hair.hairLossStage') }}</text>
                <view class="shell-stage-meter">
                    <view v-for="i in 7" :key="i" class="stage-seg" :class="{ on: i <= hairLossLevel }" />
                </view>
                <view class="rp-stage-labels">
                    <text>{{ $t('selfieResult.benchmarkNormal') }}</text>
                    <text>{{ $t('selfieResult.benchmarkSevere') }}</text>
                </view>
                <text class="rp-desc">{{ patternDescription }}</text>
            </view>

            <view class="shell-card rp-findings-card">
                <text class="shell-label">{{ $t('selfieResult.keyInsights') }}</text>
                <view v-for="finding in keyFindings" :key="finding.key" class="rp-insight-row">
                    <view class="rp-insight-main">
                        <text class="rp-insight-label">{{ finding.label }}</text>
                        <text class="rp-insight-value">{{ finding.value }}</text>
                    </view>
                    <view class="rp-insight-tags">
                        <text v-for="tag in finding.tags" :key="tag.text" class="rp-insight-tag" :class="tag.tone">{{ tag.text }}</text>
                    </view>
                    <text class="rp-insight-note">{{ finding.note }}</text>
                </view>
            </view>

            <view class="shell-card">
                <view class="rp-ai-head">
                    <TablerIcon name="sparkles" :size="18" color="#6B21C8" />
                    <text class="rp-ai-title">{{ $t('selfieResult.routineUpdates') }}</text>
                </view>
                <text class="rp-routine-note">{{ $t('selfieResult.routineUpdatesNote') }}</text>
                <template v-if="routinePlanSections.length">
                    <view v-for="section in routinePlanSections" :key="section.period" class="rp-routine-section">
                        <text class="shell-label">{{ routinePeriodLabel(section.period) }}</text>
                        <view class="rp-plan-list">
                            <view v-for="item in section.items" :key="item.id" class="rp-plan-item">
                                <text class="rp-plan-dot">•</text>
                                <view class="rp-plan-copy">
                                    <text class="rp-plan-title">{{ item.name }}</text>
                                    <text v-if="item.sub" class="rp-plan-sub">{{ item.sub }}</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </template>
                <text v-else class="rp-routine-empty">{{ $t('selfieResult.routineUpdatesEmpty') }}</text>
                <view class="rp-btn rp-btn--primary rp-btn--wide" @tap="askLushairAi">
                    <text>{{ $t('selfieResult.askLushairAi') }}</text>
                </view>
            </view>

            <text class="shell-section-h">{{ $t('selfieResult.scoreBreakdown') }}</text>
            <text class="shell-section-sub">{{ $t('selfieResult.scoreBreakdownNote') }}</text>

            <view class="shell-card rp-metrics-card">
                <view class="rp-metric-group">
                    <view class="rp-metric-group-head">
                        <image src="/static/icons/ic_scalp.svg" class="rp-metric-group-icon" mode="aspectFit" />
                        <text class="rp-metric-group-title">{{ $t('selfieResult.scalp') }}</text>
                    </view>
                    <view v-for="row in scalpMetricRows" :key="row.key" class="rp-metric-row">
                        <view class="rp-metric-top">
                            <text class="rp-metric-name">{{ row.label }}</text>
                            <text class="rp-metric-val">{{ row.rating.text }}</text>
                        </view>
                        <view class="rp-metric-bar">
                            <view :class="['rp-metric-seg', row.rating.boxes[0] ? 'on-1' : '']" />
                            <view :class="['rp-metric-seg', row.rating.boxes[1] ? 'on-2' : '']" />
                            <view :class="['rp-metric-seg', row.rating.boxes[2] ? 'on-3' : '']" />
                        </view>
                        <view class="rp-metric-ends">
                            <text>{{ row.left }}</text>
                            <text>{{ row.right }}</text>
                        </view>
                        <text v-if="useNewApi && row.rec" class="rp-metric-note">{{ row.rec }}</text>
                    </view>
                </view>
                <view class="rp-metric-group">
                    <view class="rp-metric-group-head">
                        <image src="/static/icons/ic_hair.svg" class="rp-metric-group-icon" mode="aspectFit" />
                        <text class="rp-metric-group-title">{{ $t('selfieResult.hair') }}</text>
                    </view>
                    <view v-for="row in hairMetricRows" :key="row.key" class="rp-metric-row">
                        <view class="rp-metric-top">
                            <text class="rp-metric-name">{{ row.label }}</text>
                            <text class="rp-metric-val">{{ row.rating.text }}</text>
                        </view>
                        <view class="rp-metric-bar">
                            <view :class="['rp-metric-seg', row.rating.boxes[0] ? 'on-1' : '']" />
                            <view :class="['rp-metric-seg', row.rating.boxes[1] ? 'on-2' : '']" />
                            <view :class="['rp-metric-seg', row.rating.boxes[2] ? 'on-3' : '']" />
                        </view>
                        <view class="rp-metric-ends">
                            <text>{{ row.left }}</text>
                            <text>{{ row.right }}</text>
                        </view>
                        <text v-if="useNewApi && row.rec" class="rp-metric-note">{{ row.rec }}</text>
                    </view>
                </view>
            </view>

            <view class="shell-card rp-metrics-locked-card">
                <view class="rp-metrics-locked-head">
                    <text class="shell-label">{{ $t('selfieResult.yourMetrics') }}</text>
                    <view class="rp-lock-badge">
                        <TablerIcon name="lock" :size="12" color="#6B21C8" />
                        <TablerIcon name="help" :size="12" color="#6B21C8" />
                    </view>
                </view>
                <view class="rp-radar-wrap rp-radar-wrap--locked">
                    <view class="rp-radar-core">
                        <svg class="rp-radar-svg" viewBox="0 0 260 260">
                            <g stroke="#E8E4F4" stroke-width="1" fill="none">
                                <polygon points="130,50 199,90 199,170 130,210 61,170 61,90" />
                                <circle cx="130" cy="130" r="80" />
                                <circle cx="130" cy="130" r="60" />
                                <circle cx="130" cy="130" r="40" />
                                <circle cx="130" cy="130" r="20" />
                            </g>
                            <g stroke="#E8E4F4" stroke-width="1">
                                <line x1="130" y1="130" x2="130" y2="50" />
                                <line x1="130" y1="130" x2="199" y2="90" />
                                <line x1="130" y1="130" x2="199" y2="170" />
                                <line x1="130" y1="130" x2="130" y2="210" />
                                <line x1="130" y1="130" x2="61" y2="170" />
                                <line x1="130" y1="130" x2="61" y2="90" />
                            </g>
                            <path
                                :d="previewHexPath"
                                fill="rgba(107, 33, 200, 0.22)"
                                stroke="#6B21C8"
                                stroke-width="1.5"
                            />
                        </svg>
                    </view>
                    <view class="rp-metrics-lock-overlay">
                        <TablerIcon name="lock" :size="28" color="#6B21C8" />
                        <text class="rp-metrics-lock-title">{{ $t('selfieResult.metricsLockedTitle') }}</text>
                        <text class="rp-metrics-lock-body">{{ $t('selfieResult.metricsLockedBody') }}</text>
                    </view>
                </view>
                <view class="rp-btn rp-btn--ghost rp-btn--wide" @tap="openImproveConfidence">
                    <text>{{ $t('selfieResult.improveScanConfidence') }}</text>
                </view>
            </view>

            <ShellDisclaimer />

            <view class="rp-actions">
                <view class="rp-btn rp-btn--ghost" @tap="retakeScan">
                    <text>{{ $t('selfieResult.retakeScan') }}</text>
                </view>
                <view class="rp-btn rp-btn--primary" @tap="exitResults">
                    <text>{{ $t('selfieResult.exit') }}</text>
                </view>
            </view>
        </view>

        <view class="rp-share-card" v-if="!loadingAnalysis">
            <text class="rp-share-kicker">{{ $t('selfieResult.shareReportLabel') }}</text>
            <text class="rp-share-title">{{ $t('selfieResult.shareReportTitle') }}</text>
            <text class="rp-share-score">{{ overallScore }}<text class="rp-share-score-sub">/100</text></text>
            <text v-if="scoreDelta > 0" class="rp-share-delta">{{ $t('selfieResult.scoreImprovement', [scoreDelta]) }}</text>
            <text class="rp-share-section-title">{{ $t('selfieResult.keyInsights') }}</text>
            <view v-for="finding in keyFindings" :key="'share-' + finding.key" class="rp-share-insight">
                <text class="rp-share-insight-label">{{ finding.label }}</text>
                <text class="rp-share-insight-value">{{ finding.value }}</text>
                <text v-if="finding.tags[0]" class="rp-share-insight-tag">{{ finding.tags[0].text }}</text>
            </view>
            <view class="rp-share-footer">
                <view>
                    <text class="rp-share-footer-cta">Download Lushair</text>
                    <text class="rp-share-footer-sub">Start your AI hair care journey</text>
                </view>
                <image class="rp-share-qr" src="/static/images/qrcode-download.png" mode="aspectFit" />
            </view>
            <text class="rp-share-url">Lushair.ai</text>
        </view>
    </view>

    <DeviceConfidenceSheet
        :visible="showDeviceSheet"
        @close="closeDeviceSheet"
        @learn-more="openLushairDeviceSite"
    />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { get, post, put, ProjectBrand } from '@/utils/request';
import { getLocale } from '@/i18n.js';
import { getClerkToken } from '@/utils/clerk';
import { extractExtInfo } from '@/utils/decompress';

// i18n
const { t } = useI18n();
const userStore = useUserStore();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ScanAnalyzingOverlay from '@/components/scan/ScanAnalyzingOverlay.vue';
import ShellDisclaimer from '@/components/layout/ShellDisclaimer.vue';
import DeviceConfidenceSheet from '@/components/scan/DeviceConfidenceSheet.vue';
import { captureShareCard, shareCapturedImage } from '@/composables/useShareCardCapture';
import { useCareRoutinePlan, type CarePlanPeriod } from '@/composables/useCareRoutinePlan';
const { statusBarHeight, headerPaddingStyle, contentMarginStyle } = useStatusBar();
const { applyActionablePlan, groupedSections, loadPlan } = useCareRoutinePlan();

// 从出生日期计算年龄
const calculateAgeFromDob = (dob: string): number => {
    if (!dob) return 18;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age || 18;
};

// API Response Data
const position = ref<string>('');
const stage = ref<string>('');
const imageUrl = ref<string>('');
const oilProgress = ref(100);
const keratinProgress = ref(100);
const additionalSuggestions = ref<string[]>([]);
const showGenerateButton = ref(true);
const fromSource = ref('');
const extInfo = ref<string>('');
const userId = ref<string>('');
const createTime = ref<string>('');
const reportIdFromList = ref<string>('');  // AI Report ID (from AI analysis)
const hairReportId = ref<string>('');     // HairReport ID (from hair_reports table)
const selfieId = ref<string>('');

// 新版API相关
const useNewApi = ref(true);
const analysisReport = ref<any>(null);
const loadingAnalysis = ref(false);

// API推荐文本
const oilRecommendation = ref<string>('');
const keratinRecommendation = ref<string>('');
const hairStrengthRecommendation = ref<string>('');
const follicleRecommendation = ref<string>('');

// 列表传来的指标值 (0-3)
const oilValue = ref<number>(0);
const scurfOrKeratinValue = ref<number>(0);
const overallValue = ref<number>(0);
const hairLossValue = ref<number>(0);
const discomfortValue = ref<number>(0);

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function
};

// 运行时检测是否在 iOS Bundle (GCDWebServer) 环境下
const _isLocalBundle = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.protocol === 'file:');

// AI 服务器直连地址
const AI_SERVER_BASE = 'http://43.156.213.63:5011';

// API地址 - 使用代理路径与 advanced-result.vue 保持一致
const API_URL = _isLocalBundle 
    ? AI_SERVER_BASE + '/api/v1/hair/analyze_selfie'
    : '/ai-api/api/v1/hair/analyze_selfie';

// Determine specific error reason for failed loading
const getSpecificErrorMessage = (err: any): string => {
  const msg = (err?.message || err?.errMessage || err?.errMsg || '').toLowerCase();
  const code = err?.statusCode || err?.code || err?.errno || '';
  const data = err?.data || err?.response?.data || {};
  const reason = (data?.reason || data?.error || data?.errorCode || '').toLowerCase();

  if (!navigator.onLine ||
      msg.includes('timeout') || msg.includes('network') || msg.includes('econnrefused') ||
      msg.includes('econnaborted') || msg.includes('enotfound') || msg.includes('abort') ||
      msg.includes('request:fail') || msg.includes('request fail') ||
      code === 'ECONNABORTED' || code === 'ERR_NETWORK' ||
      /^(0|5\d{2})$/.test(String(err?.statusCode || ''))) {
    return t('advancedResult.errorNetwork');
  }
  if (msg.includes('blur') || msg.includes('quality') || msg.includes('unclear') || msg.includes('模糊') ||
      reason.includes('blur') || reason.includes('quality') || reason.includes('low_quality') ||
      data?.imageQuality === 'low' || data?.blurScore > 0) {
    return t('advancedResult.errorBlurryImage');
  }
  if (msg.includes('follicle') || msg.includes('no_detection') || msg.includes('not_found') || msg.includes('毛囊') ||
      msg.includes('no scalp') || msg.includes('unrecognized') ||
      reason.includes('follicle') || reason.includes('no_detection') || reason.includes('not_detected') ||
      data?.detectionResult === 'none' || data?.follicleCount === 0) {
    return t('advancedResult.errorNoFollicle');
  }
  return t('advancedResult.fetchDataFailed') || 'Failed to fetch data';
};

const showErrorPopup = (err: any) => {
  const message = getSpecificErrorMessage(err);
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 3000
  });
};

// Parse URL parameters on mount
const getPageOptionsFromHash = (): Record<string, string> => {
    try {
        const hash = window.location.hash;
        const queryStart = hash.indexOf('?');
        if (queryStart === -1) return {};
        const queryStr = hash.substring(queryStart + 1);
        const params: Record<string, string> = {};
        queryStr.split('&').forEach((part) => {
            const eqIdx = part.indexOf('=');
            if (eqIdx !== -1) {
                const key = decodeURIComponent(part.substring(0, eqIdx));
                const val = decodeURIComponent(part.substring(eqIdx + 1));
                params[key] = val;
            }
        });
        return params;
    } catch {
        return {};
    }
};

const readPageOptions = (): Record<string, string> => {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1] as any;
    const optionsFromPage = currentPage?.$page?.options || currentPage?.options || {};
    const optionsFromHash = typeof window !== 'undefined' ? getPageOptionsFromHash() : {};
    return Object.keys(optionsFromPage).length > 0 ? optionsFromPage : optionsFromHash;
};

// Fetch report detail from hair_reports_detail table
const fetchReportDetail = async (reportId: string): Promise<any> => {
    try {
        console.log('Fetching report detail for reportId:', reportId);
        const REPORT_DETAIL_PATH = `/report/detail/${reportId}`;
        const response = await get(REPORT_DETAIL_PATH, {}, { brand: ProjectBrand.LUSHAIR_NEW });
        console.log('Report detail response:', response);
        return response;
    } catch (error) {
        console.error('Failed to fetch report detail:', error);
        return null;
    }
};

const syncRoutineFromReport = () => {
    const plan = analysisReport.value?.actionable_plan;
    if (plan) {
        applyActionablePlan(plan);
    } else {
        applyFallbackRoutine();
    }
};

const applyFallbackRoutine = () => {
    if (groupedSections.value.length) return;
    const lines = getBaseSuggestions(hairLossLevel.value);
    if (lines.length) {
        applyActionablePlan({ advice: lines });
    }
};

// 获取已存在的报告（通过aiReportId）
const fetchExistingReport = async () => {
    try {
        loadingAnalysis.value = true;

        const REPORT_PATH = `/api/v1/hair/report/${reportIdFromList.value}`;
        const REPORT_API_URL = _isLocalBundle
            ? AI_SERVER_BASE + REPORT_PATH
            : '/ai-api' + REPORT_PATH;

        console.log('Calling existing report API:', REPORT_API_URL);

        // 调用API
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

        console.log('Existing report API response:', response);

        if (response && response.data) {
            analysisReport.value = response.data;
            useNewApi.value = true;

            // 提取推荐文本
            if (response.data.report) {
                if (response.data.report.oil && response.data.report.oil.root_cause) {
                    oilRecommendation.value = response.data.report.oil.root_cause.analysis;
                }
                if (response.data.report.scurfOrKeratin && response.data.report.scurfOrKeratin.root_cause) {
                    keratinRecommendation.value = response.data.report.scurfOrKeratin.root_cause.analysis;
                }
                if (response.data.report.overall && response.data.report.overall.root_cause) {
                    hairStrengthRecommendation.value = response.data.report.overall.root_cause.analysis;
                }
                if (response.data.report.hairLoss && response.data.report.hairLoss.root_cause) {
                    follicleRecommendation.value = response.data.report.hairLoss.root_cause.analysis;
                }
            }

            syncRoutineFromReport();

            uni.showToast({
                title: 'Report loaded',
                icon: 'success'
            });
        }
    } catch (error: any) {
        console.error('Failed to fetch existing report:', error);
        useNewApi.value = false;
        showErrorPopup(error);
    } finally {
        loadingAnalysis.value = false;
        applyFallbackRoutine();
    }
};

onMounted(async () => {
    const options = readPageOptions();

    // 修复：uni-app 页面参数直接存储在 options 中，不是 options.data 中
    position.value = decodeURIComponent(options.position || '');
    stage.value = options.stage || '1';
    imageUrl.value = decodeURIComponent(options.image || '');
    fromSource.value = options.from || '';
    extInfo.value = decodeURIComponent(options.extInfo || '');
    userId.value = options.userId || userStore.userInfo?.userId || '';
    createTime.value = decodeURIComponent(options.createTime || '');
    reportIdFromList.value = options.aiReportId || '';  // AI分析报告ID
    hairReportId.value = options.reportId || '';        // HairReport ID (用于更新数据库)
    selfieId.value = options.id || '';

    console.log('Results data:', {
        position: position.value,
        stage: stage.value,
        imageUrl: imageUrl.value,
        from: fromSource.value,
        extInfo: extInfo.value,
        userId: userId.value,
        aiReportId: reportIdFromList.value,
        hairReportId: hairReportId.value,
        selfieId: selfieId.value
    });

    console.log('nuserId ===', userId.value);
    console.log('extInfo ===', extInfo.value);

    // 如果有hairReportId，从hair_reports_detail表获取detail字段并解压缩
    if (hairReportId.value) {
        console.log('Fetching report detail for hairReportId:', hairReportId.value);
        const detailData = await fetchReportDetail(hairReportId.value);

        if (detailData && detailData.detail) {
            console.log('Got detail field:', detailData.detail.substring(0, 100) + '...');
            try {
                const decompressedData = await extractExtInfo(detailData.detail);
                console.log('Decompressed ext_info:', decompressedData);

                if (decompressedData && typeof decompressedData === 'object') {
                    oilValue.value = decompressedData.oil || 0;
                    scurfOrKeratinValue.value = decompressedData.scurfOrKeratin || 0;
                    overallValue.value = decompressedData.overall || 0;
                    hairLossValue.value = decompressedData.hairLoss || 0;
                    discomfortValue.value = decompressedData.discomfort || 0;
                    console.log('Extracted metric values:', {
                        oil: oilValue.value,
                        scurfOrKeratin: scurfOrKeratinValue.value,
                        overall: overallValue.value,
                        hairLoss: hairLossValue.value,
                        discomfort: discomfortValue.value
                    });
                }
            } catch (e) {
                console.error('Failed to decompress detail for metrics:', e);
            }
        }

        // 提取并保存 aiReportId（如果 reportIdFromList 为空）
        if (!reportIdFromList.value && detailData?.report?.aiReportId) {
            reportIdFromList.value = detailData.report.aiReportId;
            console.log('从 detail 接口获取 aiReportId:', reportIdFromList.value);
        }
    }

    // 如果没有hairReportId但有extInfo，尝试解析extInfo（兼容旧数据）
    if (!hairReportId.value && extInfo.value) {
        try {
            // 首先尝试直接解析（兼容旧数据）
            let parsedExtInfo: any = null;
            try {
                parsedExtInfo = JSON.parse(extInfo.value);
            } catch {
                // 如果直接解析失败，尝试解压缩
                parsedExtInfo = await extractExtInfo(extInfo.value);
            }

            // 从解压后的数据中提取指标
            // 数据结构可能是 {input: {ext_info: {...}}} 或直接是 ext_info 对象
            const extInfoData = parsedExtInfo?.input?.ext_info || parsedExtInfo;
            if (extInfoData && typeof extInfoData === 'object') {
                oilValue.value = extInfoData.oil || 0;
                scurfOrKeratinValue.value = extInfoData.scurfOrKeratin || 0;
                overallValue.value = extInfoData.overall || 0;
                hairLossValue.value = extInfoData.hairLoss || 0;
                discomfortValue.value = extInfoData.discomfort || 0;
            }
        } catch (e) {
            console.error('Failed to parse extInfo for metrics:', e);
        }
    }

    // 如果有aiReportId，调用GET report接口获取已有AI报告；否则如果有extInfo和userId，调用新API分析
    if (reportIdFromList.value) {
        console.log('Fetch existing AI report by aiReportId:', reportIdFromList.value);
        await fetchExistingReport();
    } else if (extInfo.value && userId.value) {
        console.log('new api');
        await fetchAnalysis();
    }

    loadPlan();
    // 如果没有aiReportId也没有extInfo+userId，使用fallback方案
    if (!reportIdFromList.value && !(extInfo.value && userId.value)) {
        applyFallbackRoutine();
    }
});

// 更新自拍照的reportId
const updateSelfieReportId = async (reportId: string) => {
    try {
        console.log('Updating selfie reportId:', selfieId.value, reportId);
        await post('user/updateSelfie', {
            id: selfieId.value,
            reportId: reportId
        });
        console.log('Selfie reportId updated successfully');
    } catch (error) {
        console.error('Failed to update selfie reportId:', error);
    }
};

// 调用分析API
const fetchAnalysis = async () => {
    
    try {
        loadingAnalysis.value = true;
        
        // 解析extInfo
        let parsedExtInfo: any = {};
        try {
            // 首先尝试直接解析（兼容旧数据）
            try {
                parsedExtInfo = JSON.parse(extInfo.value);
            } catch {
                // 如果直接解析失败，尝试解压缩
                parsedExtInfo = extractExtInfo(extInfo.value) || {};
            }
            // 如果解析结果是null，使用空对象
            if (!parsedExtInfo || typeof parsedExtInfo !== 'object') {
                parsedExtInfo = {};
            }
            console.log('Parsed extInfo:', parsedExtInfo);
        } catch (e) {
            console.error('Failed to parse extInfo:', e);
            return;
        }

        // 准备API参数
        let gender = 'Male';
        const rawGender = userStore.userInfo?.gender;
        if (rawGender == 2 || String(rawGender).toLowerCase() === 'female') {
            gender = 'Female';
        }

        // 获取年龄：优先使用 age，如果没有则从 dob 计算
        let age = userStore.userInfo?.age;
        if (!age && userStore.userInfo?.dob) {
            age = calculateAgeFromDob(userStore.userInfo.dob);
        }
        age = age || 18;

        // 获取语言：使用 uni-app 的 getLocale 获取本地语言
        const currentLanguage = getLocale();
        const language = currentLanguage || 'en';

        // 准备metrics
        const payload = {
            userId: userId.value,
            gender: gender,
            age: age,
            language: language,
            metrics: {
                oil: parsedExtInfo.oil || 0,
                scurfOrKeratin: parsedExtInfo.scurfOrKeratin || 0,
                hairLoss: parsedExtInfo.hairLoss || 0,
                discomfort: parsedExtInfo.discomfort || 0,
                overall: parsedExtInfo.overall || 0,
                stage: parseInt(stage.value) || 1,
                position: position.value
            }
        };

        console.log('Calling analyze_selfie API:', payload);

        // 调用API
        const response: any = await new Promise((resolve, reject) => {
            uni.request({
                url: API_URL,
                method: 'POST',
                data: payload,
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

        console.log('API response:', response);

        if (response && response.data) {
            analysisReport.value = response.data;
            useNewApi.value = true;

            // 提取推荐文本
            if (response.data.report) {
                // Scalp Hair Oil建议
                if (response.data.report.oil && response.data.report.oil.root_cause) {
                    oilRecommendation.value = response.data.report.oil.root_cause.analysis;
                }

                // Keratin Makeup建议
                if (response.data.report.scurfOrKeratin && response.data.report.scurfOrKeratin.root_cause) {
                    keratinRecommendation.value = response.data.report.scurfOrKeratin.root_cause.analysis;
                }

                // Hair Strength建议 (overall)
                if (response.data.report.overall && response.data.report.overall.root_cause) {
                    hairStrengthRecommendation.value = response.data.report.overall.root_cause.analysis;
                }

                // Follicle Thickness建议 (hairLoss)
                if (response.data.report.hairLoss && response.data.report.hairLoss.root_cause) {
                    follicleRecommendation.value = response.data.report.hairLoss.root_cause.analysis;
                }
            }

            syncRoutineFromReport();

            // 获取report_id并更新到数据库
            if (response.reportId) {
                const aiReportId = response.reportId;
                console.log('Got ai_report_id from API:', aiReportId);

                // 保存到本地存储，确保始终是最新
                try {
                    uni.setStorageSync('ai_analysis_reportId', aiReportId);
                    console.log('已保存 ai_analysis_reportId 到本地存储:', aiReportId);
                } catch (e) {
                    console.error('保存 ai_analysis_reportId 失败:', e);
                }

                // 检查是否有Clerk token
                // const clerkToken = getClerkToken();
                // if (!clerkToken) {
                //     console.warn('No Clerk token found, skipping database update');
                // }

                // 如果有hairReportId，调用PUT接口更新ai_report_id
                if (hairReportId.value) {
                    try {
                        await put(`/report/${hairReportId.value}`, {
                            aiReportId: aiReportId
                        }, { brand: ProjectBrand.LUSHAIR_NEW });
                        console.log('已更新aiReportId到数据库: Updated aiReportId to database:', aiReportId);
                        // 通知列表页刷新数据
                        uni.$emit('refreshHairListData');
                    } catch (e) {
                        console.error('更新aiReportId到数据库失败: Failed to update aiReportId to database:', e);
                    }
                } else if (selfieId.value) {
                    // 兼容旧逻辑：如果没有hairReportId但有selfieId，调用updateSelfie接口
                    await updateSelfieReportId(aiReportId);
                    // 通知列表页刷新数据
                    uni.$emit('refreshHairListData');
                }
            }

            uni.showToast({
                title: 'Analysis complete',
                icon: 'success'
            });
        }
    } catch (error: any) {
        console.error('API call failed:', error);
        useNewApi.value = false;
        showErrorPopup(error);
    } finally {
        loadingAnalysis.value = false;
        applyFallbackRoutine();
    }
};

// Computed properties for dynamic display
const hairLossLevel = computed(() => {
    const stageNum = parseInt(stage.value) || 1;
    return Math.min(7, Math.max(1, stageNum));
});

const levelDescriptor = computed(() => {
    const level = hairLossLevel.value;
    const key = `selfieResult.levelDesc${level}`;
    const label = t(key);
    return label === key ? t('selfieResult.levelDesc1') : label;
});

const severityText = computed(() => levelDescriptor.value);

const patternDescription = computed(() => {
    const level = hairLossLevel.value;
    const area = positionText.value || t('selfieResult.positionNone');
    const key = `selfieResult.patternDesc${level}`;
    const template = t(key);
    if (template !== key) {
        return template.replace('{area}', area);
    }
    return t('selfieResult.patternDesc1').replace('{area}', area);
});

const routinePlanSections = computed(() => groupedSections.value);

const routinePeriodLabel = (period: CarePlanPeriod) => {
    const map: Record<CarePlanPeriod, string> = {
        morning: t('routine.morning'),
        evening: t('routine.evening'),
        treatment: t('routine.morning'),
        diet: t('routine.morning'),
        ingredient: t('routine.recommendedIngredients'),
    };
    return map[period] || period;
};

const metricToScore = (value: number, max = 3) => Math.max(0.18, Math.min(1, 1 - value / max));

const previewHexPath = computed(() => {
    const level = hairLossLevel.value;
    const densityScore = Math.max(0.18, 1 - (level - 1) / 6);
    const keratinDisplay = scurfOrKeratinValue.value === 2 ? 3 : scurfOrKeratinValue.value;
    const values = [
        densityScore,
        densityScore,
        metricToScore(overallValue.value >= 3 ? 1 : Math.max(0, 3 - overallValue.value)),
        metricToScore(keratinDisplay),
        metricToScore(oilValue.value),
        metricToScore(discomfortValue.value),
    ];

    const cx = 130;
    const cy = 130;
    const radius = 72;
    const points = values.map((value, index) => {
        const angle = (Math.PI * 2 * index) / 6 - (Math.PI * 2) / 3;
        const x = cx + radius * value * Math.cos(angle);
        const y = cy + radius * value * Math.sin(angle);
        return `${x},${y}`;
    });

    return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
});

const calculateOverallScore = (): number => {
    const level = hairLossLevel.value;
    let baseScore = 100 - (level - 1) * (70 / 6);

    // 使用已解析的指标值而非重新解析 extInfo
    const factors = [
        oilValue.value,
        discomfortValue.value,
        scurfOrKeratinValue.value,
        overallValue.value,
        hairLossValue.value
    ];

    factors.forEach((value) => {
        if (value === 1) baseScore -= 5;
        else if (value === 2) baseScore -= 10;
        else if (value === 3) baseScore -= 15;
    });

    return Math.max(0, Math.min(100, Math.round(baseScore)));
};

const overallScore = computed(() => calculateOverallScore());
const scoreDelta = ref(0);

const askLushairAi = () => {
    // 保存当前结果页的 aiReportId（临时，仅用于当前会话）
    const currentAiReportId = uni.getStorageSync('ai_analysis_reportId') ||
                              reportIdFromList.value;
    if (currentAiReportId) {
        uni.setStorageSync('ai_chat_targetReportId', currentAiReportId);
        console.log('[自拍照结果页] 保存当前 aiReportId:', currentAiReportId);
    }

    uni.setStorageSync('ai_chat_autoStart', 'true');
    uni.switchTab({ url: '/pages/consult/new' });
};

const showDeviceSheet = ref(false);

const openImproveConfidence = () => {
    showDeviceSheet.value = true;
};

const closeDeviceSheet = () => {
    showDeviceSheet.value = false;
};

const openLushairDeviceSite = () => {
    closeDeviceSheet();
    window.open('https://lushair.net', '_blank');
};

const shareResults = async () => {
    try {
        uni.showLoading({ title: t('common.loading') });
        const dataUrl = await captureShareCard('.rp-share-card');
        await shareCapturedImage(dataUrl, t('selfieResult.shareReportTitle'), t('selfieResult.shareReportTitle'));
    } catch (error) {
        console.error('Share failed', error);
        uni.showToast({ title: t('advancedResult.shareFailed') || 'Share failed', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

// Base suggestions for each stage
const getBaseSuggestions = (stageNum: number) => {
    if (useNewApi.value && analysisReport.value && analysisReport.value.further_steps) {
        const furtherSteps = analysisReport.value.further_steps;
        if (Array.isArray(furtherSteps)) {
            return furtherSteps;
        }
    }

    if (stageNum === 1) {
        return [
            'Maintain a healthy diet rich in proteins, vitamins, and minerals.',
            'Use gentle, sulfate-free shampoos to keep your scalp healthy.',
            'Continue regular hair care routine and monitor any changes.'
        ];
    } else if (stageNum === 2) {
        return [
            'Consider using hair growth serums with active ingredients like minoxidil.',
            'Reduce heat styling and chemical treatments to minimize hair damage.',
            'Increase intake of biotin and omega-3 fatty acids for hair health.'
        ];
    } else if (stageNum === 3) {
        return [
            'Consult with a dermatologist for personalized treatment options.',
            'Consider FDA-approved hair loss treatments like finasteride or minoxidil.',
            'Avoid tight hairstyles that can cause additional stress on hair follicles.',
            'Explore PRP (Platelet-Rich Plasma) therapy as a treatment option.'
        ];
    } else if (stageNum === 4) {
        return [
            'Seek professional consultation with a hair restoration specialist.',
            'Consider advanced treatments like hair transplant or laser therapy.',
            'Use prescription-strength topical treatments as recommended by your doctor.',
            'Manage stress levels as stress can accelerate hair loss.'
        ];
    } else if (stageNum === 5) {
        return [
            'Consult with multiple specialists for comprehensive treatment plans.',
            'Explore surgical hair restoration options like FUE or FUT transplant.',
            'Consider combination therapy with multiple FDA-approved treatments.',
            'Join support groups to connect with others experiencing similar challenges.'
        ];
    }
    
    return [
        'Follow a comprehensive hair care routine.',
        'Consult with healthcare professionals for personalized advice.'
    ];
};

// Additional suggestions pool for "Generate More"
const getAdditionalSuggestionsPool = (stageNum: number) => {
    const common = [
        'Protect your hair from UV damage by wearing hats or using UV-protective hair products.',
        'Get regular exercise to improve blood circulation to scalp.',
        'Ensure adequate sleep (7-9 hours) as poor sleep can affect hair growth cycles.',
        'Stay hydrated by drinking at least 8 glasses of water daily.',
        'Consider supplements like Vitamin D, Iron, and Zinc after consulting with a doctor.',
        'Massage your scalp regularly to stimulate blood flow to hair follicles.',
        'Avoid smoking and limit alcohol consumption as they can impair hair growth.',
        'Manage underlying health conditions like thyroid disorders or PCOS.',
        'Use a silk or satin pillowcase to reduce friction and hair breakage.',
        'Track your progress with regular photos to monitor improvements.'
    ];
    
    if (stageNum === 1) {
        return [
            ...common.slice(0, 5),
            'Consider using natural oils like coconut or argan oil for scalp health.',
            'Limit washing frequency to 2-3 times per week to maintain natural oils.',
            'Choose hair products free from parabens and sulfates.'
        ];
    } else if (stageNum === 2) {
        return [
            ...common,
            'Consider low-level laser therapy (LLLT) devices for home use.',
            'Use caffeine-based hair products that may stimulate hair growth.',
            'Try rosemary oil which has shown promise in hair growth studies.',
            'Consider microneedling treatments to enhance product absorption.'
        ];
    } else if (stageNum === 3 || stageNum === 4) {
        return [
            ...common,
            'Ask your doctor about prescription medications like finasteride or dutasteride.',
            'Consider combination therapy with multiple treatment approaches.',
            'Look into red light therapy for hair growth stimulation.',
            'Explore exosome therapy or stem cell treatments if available.',
            'Consider hair loss prevention shampoos with ketoconazole.',
            'Discuss hormone level testing to identify underlying causes.'
        ];
    } else if (stageNum === 5) {
        return [
            ...common,
            'Research different hair transplant techniques (FUE, FUT, DHI) to find the best fit.',
            'Consider scalp micropigmentation as a non-surgical option.',
            'Explore hair system or wig options as temporary or permanent solutions.',
            'Look into clinical trials for new hair loss treatments.',
            'Consider psychological counseling for emotional support.',
            'Join online communities like Reddit\'s r/tressless for peer support.'
        ];
    }
    
    return common;
};

// Computed suggestions combining base and additional
const suggestions = computed(() => {
    const stageNum = parseInt(stage.value) || 1;
    return [...getBaseSuggestions(stageNum), ...additionalSuggestions.value];
});

const hairLossTypeLabel = computed(() => {
    const pos = position.value.toLowerCase();
    if (pos.includes('前额') || pos.includes('forehead') || pos.includes('frontal')) return t('hair.frontal');
    if (pos.includes('头顶') || pos.includes('crown') || pos.includes('top')) return t('hair.typeV');
    if (pos.includes('斑秃') || pos.includes('alopecia')) return t('hair.typeAlopecia');
    if (!pos || pos === '无' || pos === 'none') return t('hair.typeNone');
    return t('hair.typeNone');
});

// Position text with i18n support - 将 position 值映射到多语言键
// Map position value to i18n key
const positionText = computed(() => {
    const pos = position.value.toLowerCase();
    
    // 匹配前额 / Match forehead
    if (pos.includes('前额') || pos.includes('forehead') || pos.includes('frontal')) {
        return t('selfieResult.positionForehead');
    } 
    // 匹配头顶 / Match crown
    else if (pos.includes('头顶') || pos.includes('crown') || pos.includes('top')) {
        return t('selfieResult.positionCrown');
    } 
    // 匹配斑秃 / Match alopecia areata
    else if (pos.includes('斑秃') || pos.includes('alopecia')) {
        return t('selfieResult.positionAlopecia');
    }
    // 无特定区域或其他情况 / No specific area or other cases
    else if (!pos || pos === '无' || pos === 'none') {
        return t('selfieResult.positionNone');
    }
    
    // 默认返回原始值 / Return original value as fallback
    return position.value || t('selfieResult.positionNone');
});

const scalpConditionSummary = computed(() => {
    const oil = getRatingLabel(oilValue.value);
    const keratin = getRatingLabel(scurfOrKeratinValue.value === 2 ? 3 : scurfOrKeratinValue.value);
    return `${oil} oil · ${keratin} keratin`;
});

const hairlineSummary = computed(() => {
    return `${positionText.value} · ${levelDescriptor.value}`;
});

const keyFindings = computed(() => [
    {
        key: 'scalp',
        label: t('selfieResult.scalpCondition'),
        value: scalpConditionSummary.value,
        tags: [
            { text: oilValue.value >= 2 ? t('selfieResult.symptomTag') : t('common.low'), tone: oilValue.value >= 2 ? 'warn' : 'ok' },
            { text: oilRecommendation.value ? t('selfieResult.actionTag') : '', tone: 'action' },
        ].filter((tag) => tag.text),
        note: oilRecommendation.value || keratinRecommendation.value || t('selfieResult.scoreBreakdownNote'),
    },
    {
        key: 'hairline',
        label: t('selfieResult.hairline'),
        value: hairlineSummary.value,
        tags: [
            { text: hairLossLevel.value <= 1 ? t('selfieResult.benchmarkNormal') : t('common.high'), tone: hairLossLevel.value <= 1 ? 'ok' : 'warn' },
        ],
        note: patternDescription.value,
    },
]);

// 将数值转换为评级标签 (0,1=Low, 2=Average, 3=High)
const getRatingLabel = (value: number): string => {
    if (value <= 1) return 'Low';
    if (value === 2) return 'Average';
    return 'High';
};

// 生成 rating-boxes 的填充状态数组
const getRatingBoxes = (value: number): boolean[] => {
    if (value <= 0) return [false, false, false];
    if (value === 1) return [true, false, false];
    if (value === 2) return [true, true, false];
    return [true, true, true];
};

// Scalp Hair Oil 评级
const oilRating = computed(() => {
    const value = oilValue.value;
    return {
        text: `${getRatingLabel(value)} ${value} / 3`,
        boxes: getRatingBoxes(value)
    };
});

// Keratin Makeup 评级 - 特殊映射: 0→0, 1→1, 2→3
const keratinRating = computed(() => {
    const value = scurfOrKeratinValue.value;
    const displayValue = value === 2 ? 3 : value;
    return {
        text: `${getRatingLabel(displayValue)} ${displayValue} / 3`,
        boxes: getRatingBoxes(displayValue)
    };
});

// Hair Strength 评级 - 反向映射: 0→3, 1→2, 2→1, 3→1
const hairStrengthRating = computed(() => {
    const value = overallValue.value;
    const displayValue = value >= 3 ? 1 : Math.max(1, 3 - value);
    return {
        text: `${getRatingLabel(displayValue)} ${displayValue} / 3`,
        boxes: getRatingBoxes(displayValue)
    };
});

// Follicle Thickness 评级 - 反向映射: 0→3, 1→2, 2→1, 3→1
const follicleRating = computed(() => {
    const value = hairLossValue.value;
    const displayValue = value >= 3 ? 1 : Math.max(1, 3 - value);
    return {
        text: `${getRatingLabel(displayValue)} ${displayValue} / 3`,
        boxes: getRatingBoxes(displayValue)
    };
});

const scalpMetricRows = computed(() => [
    {
        key: 'oil',
        label: t('selfieResult.scalpHairOil'),
        rating: oilRating.value,
        rec: oilRecommendation.value,
        left: t('selfieResult.lessOily'),
        right: t('selfieResult.moreOily'),
    },
    {
        key: 'keratin',
        label: t('selfieResult.keratinMakeup'),
        rating: keratinRating.value,
        rec: keratinRecommendation.value,
        left: t('selfieResult.lessKeratin'),
        right: t('selfieResult.moreKeratin'),
    },
]);

const hairMetricRows = computed(() => [
    {
        key: 'strength',
        label: t('selfieResult.hairStrength'),
        rating: hairStrengthRating.value,
        rec: hairStrengthRecommendation.value,
        left: t('selfieResult.lessStrong'),
        right: t('selfieResult.stronger'),
    },
    {
        key: 'follicle',
        label: t('selfieResult.follicleThickness'),
        rating: follicleRating.value,
        rec: follicleRecommendation.value,
        left: t('selfieResult.lessThick'),
        right: t('selfieResult.thicker'),
    },
]);

const currentDate = computed(() => {
    if (!createTime.value) return '';

    const date = new Date(createTime.value);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleString('en-US', options).toUpperCase();
});

const goBack = () => {
    console.log('Navigate back to hair history log');
    if (fromSource.value === 'history') {
        uni.switchTab({
            url: '/pages/hair/index'
        });
    } else {
        uni.switchTab({
            url: '/pages/index/home'
        });
    }
};

const openCamera = () => {
    console.log('Open camera');
    // Navigate back to scan instructions
    // uni.navigateBack({
    //     delta: 1
    // });
};

const generateMore = () => {
    console.log('Generate more suggestions');
    
    const stageNum = parseInt(stage.value) || 1;
    const pool = getAdditionalSuggestionsPool(stageNum);
    
    // Get 3-5 random suggestions from the pool that aren't already shown
    const currentSuggestions = suggestions.value;
    const availableSuggestions = pool.filter(s => !currentSuggestions.includes(s));
    
    if (availableSuggestions.length === 0) {
        uni.showToast({
            title: 'No more suggestions available',
            icon: 'none'
        });
        showGenerateButton.value = false;
        return;
    }
    
    // Randomly select 3-5 suggestions
    const numToAdd = Math.min(Math.floor(Math.random() * 3) + 3, availableSuggestions.length);
    const newSuggestions: string[] = [];
    
    const shuffled = [...availableSuggestions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numToAdd; i++) {
        newSuggestions.push(shuffled[i]);
    }
    
    additionalSuggestions.value = [...additionalSuggestions.value, ...newSuggestions];
    
    uni.showToast({
        title: `Added ${numToAdd} more suggestions!`,
        icon: 'success',
        duration: 1500
    });
    
    // Hide button if we've exhausted the pool
    if (additionalSuggestions.value.length >= pool.length - 3) {
        showGenerateButton.value = false;
    }
};

const viewScan = () => {
    console.log('View scan image');
    // Navigate to scan image view or show full screen image
    if (imageUrl.value) {
        uni.previewImage({
            urls: [imageUrl.value],
            current: imageUrl.value
        });
    }
};

const getDermascope = () => {
    console.log('Get dermascope');
    // Navigate to dermascope purchase page in system browser
    // uni.navigateTo({
    //     url: '/pages/trichoscan/index'
    // });
    const u = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document)
    if (isiOS) {
        window.webkit.messageHandlers.getDermascope.postMessage({data: 'getDermascope'});
    } else {
        window.android.getDermascope(JSON.stringify({data: 'getDermascope'}));
    }
};

const retakeScan = () => {
    console.log('Retake scan');
    // Navigate back to scan instructions
    // uni.navigateBack({
    //     delta: 2
    // });
    uni.switchTab({
        url: '/pages/index/home'
    });
};

const exitResults = () => {
    console.log('Exit results');
    // Navigate to home page
    uni.switchTab({
        url: '/pages/index/home'
    });
};
</script>

<style lang="scss">
@import '@/styles/result-page-shell.scss';

.rp-share {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.share-icon {
    width: 18px;
    height: 18px;
}

.rp-insight-row {
    padding: 12px 0;
    border-bottom: 1px solid #f0edf7;

    &:last-child {
        border-bottom: none;
    }
}

.rp-insight-main {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
}

.rp-insight-label,
.rp-insight-value {
    font-size: 14px;
    color: #1a1228;
}

.rp-insight-value {
    font-weight: 700;
    color: #6b21c8;
}

.rp-insight-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
}

.rp-insight-tag {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #f3ecff;
    color: #6b21c8;

    &.warn {
        background: #fff4e8;
        color: #c2610a;
    }

    &.ok {
        background: #e8faf3;
        color: #0e9e62;
    }
}

.rp-insight-note {
    font-size: 12px;
    line-height: 1.5;
    color: #8a82a0;
}

.rp-plan-list {
    margin: 10px 0 14px;
}

.rp-plan-item {
    display: flex;
    gap: 8px;
    font-size: 13px;
    line-height: 1.5;
    color: #3f3655;
    margin-bottom: 8px;
}

.rp-plan-copy {
    flex: 1;
}

.rp-plan-title {
    display: block;
    font-size: 13px;
    color: #1a1228;
}

.rp-plan-sub {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: #8a82a0;
}

.rp-level-name {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #6b21c8;
}

.rp-routine-note {
    display: block;
    margin-bottom: 12px;
    font-size: 12px;
    line-height: 1.5;
    color: #8a82a0;
}

.rp-routine-empty {
    display: block;
    margin-bottom: 14px;
    font-size: 13px;
    line-height: 1.5;
    color: #8a82a0;
}

.rp-routine-section + .rp-routine-section {
    margin-top: 8px;
}

.rp-metrics-locked-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.rp-lock-badge {
    display: flex;
    gap: 6px;
}

.rp-radar-wrap--locked {
    position: relative;
}

.rp-radar-wrap--locked .rp-radar-core {
    opacity: 0.92;
}

.rp-metrics-lock-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.64);
    backdrop-filter: blur(2px);
}

.rp-metrics-lock-title {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #1a1228;
}

.rp-metrics-lock-body {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: #8a82a0;
}

.rp-share-card {
    position: fixed;
    left: -9999px;
    top: 0;
    width: 360px;
    padding: 28px 24px;
    background: #fff;
    border-radius: 20px;
    box-sizing: border-box;
}

.rp-share-kicker {
    display: block;
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #4da3f0;
    margin-bottom: 8px;
}

.rp-share-title {
    display: block;
    text-align: center;
    font-size: 24px;
    font-weight: 800;
    color: #1a1228;
}

.rp-share-score {
    display: block;
    text-align: center;
    font-size: 48px;
    font-weight: 800;
    color: #6b21c8;
    margin: 12px 0;
}

.rp-share-score-sub {
    font-size: 22px;
}

.rp-share-delta {
    display: block;
    text-align: center;
    font-size: 12px;
    color: #6b21c8;
    margin-bottom: 18px;
}

.rp-share-section-title {
    display: block;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #6b21c8;
    margin-bottom: 10px;
}

.rp-share-insight {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px;
    align-items: center;
    padding: 12px;
    border: 1px solid #f0edf7;
    border-radius: 12px;
    margin-bottom: 8px;
}

.rp-share-insight-label,
.rp-share-insight-value,
.rp-share-insight-tag {
    font-size: 12px;
}

.rp-share-insight-tag {
    padding: 4px 8px;
    border-radius: 999px;
    background: #f3ecff;
    color: #6b21c8;
}

.rp-share-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 18px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(135deg, #faf5ff, #fff);
}

.rp-share-footer-cta {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #6b21c8;
}

.rp-share-footer-sub {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: #8a82a0;
}

.rp-share-qr {
    width: 72px;
    height: 72px;
}

.rp-share-url {
    display: block;
    text-align: center;
    margin-top: 12px;
    font-size: 11px;
    color: #8a82a0;
}
</style>
