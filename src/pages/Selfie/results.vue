<template>
    <view class="rp-page">
        <view v-if="loadingAnalysis" class="rp-loading">
            <view class="rp-loading-inner">
                <view class="rp-spinner" />
                <text class="rp-loading-text">Analyzing your hair profile...</text>
            </view>
        </view>

        <view class="rp-topbar" :style="headerPaddingStyle(0)">
            <view class="rp-back" @tap="goBack"><text>‹</text></view>
            <text class="rp-topbar-title">{{ $t('selfieResult.title') }}</text>
            <view class="rp-topbar-spacer" />
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
                    </view>
                </view>
            </view>

            <view class="shell-card rp-stage-detail">
                <text class="shell-label">{{ $t('hair.hairLossStage') }}</text>
                <view class="shell-stage-meter">
                    <view v-for="i in 7" :key="i" class="stage-seg" :class="{ on: i <= hairLossLevel }" />
                </view>
                <view class="rp-stage-labels">
                    <text>{{ $t('selfieResult.mildHairloss') }}</text>
                    <text>{{ $t('selfieResult.severeHairloss') }}</text>
                </view>
                <text class="rp-desc">{{ patternDescription }}</text>
            </view>

            <view class="shell-card">
                <view class="rp-ai-head">
                    <TablerIcon name="sparkles" :size="18" color="#6B21C8" />
                    <text class="rp-ai-title">{{ $t('selfieResult.smartSummary') }}</text>
                </view>
                <text class="rp-ai-text">{{ smartSummaryText }}</text>
                <text v-if="positionRecommendations" class="rp-tip">{{ positionRecommendations }}</text>
                <text class="shell-label">{{ $t('selfieResult.suggestions') }}</text>
                <view class="rp-suggest-list">
                    <view v-for="(suggestion, index) in suggestions" :key="index" class="rp-suggest-item">
                        <text class="rp-suggest-dot">•</text>
                        <text>{{ suggestion }}</text>
                    </view>
                </view>
                <view v-if="showGenerateButton && !useNewApi" class="rp-btn rp-btn--primary rp-btn--wide" @tap="generateMore">
                    <text>{{ $t('selfieResult.generateMore') }}</text>
                </view>
                <view v-else class="rp-ai-foot">
                    <text>{{ useNewApi ? 'AI Analysis Complete' : $t('selfieResult.allSuggestionsShown') }}</text>
                </view>
            </view>

            <view class="shell-card">
                <text class="shell-label">{{ $t('selfieResult.yourMetrics') }}</text>
                <text class="shell-section-sub">{{ $t('selfieResult.metricsDescription') }}</text>
                <view class="rp-radar-wrap">
                    <view class="rp-radar-core">
                        <svg class="rp-radar-svg" viewBox="0 0 260 260">
                            <g stroke="#E8E4F4" stroke-width="1" fill="none">
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
                            <polygon
                                points="130,80 179,105 170,150 130,170 85,155 90,100"
                                fill="rgba(107, 33, 200, 0.18)"
                                stroke="#6B21C8"
                                stroke-width="2"
                            />
                        </svg>
                        <view class="rp-radar-labels">
                            <text class="rp-radar-label" style="left:50%;top:14%;transform:translate(-50%,-50%)">{{ $t('selfieResult.grayHair') }}</text>
                            <text class="rp-radar-label" style="left:80%;top:26%;transform:translate(-50%,-50%)">{{ $t('selfieResult.sensitivity') }}</text>
                            <text class="rp-radar-label" style="left:80%;top:76%;transform:translate(-50%,-50%)">{{ $t('selfieResult.scalpLabel') }}</text>
                            <text class="rp-radar-label" style="left:50%;top:86%;transform:translate(-50%,-50%)">{{ $t('selfieResult.oiliness') }}</text>
                            <text class="rp-radar-label" style="left:20%;top:76%;transform:translate(-50%,-50%)">{{ $t('selfieResult.follicle') }}</text>
                            <text class="rp-radar-label" style="left:20%;top:26%;transform:translate(-50%,-50%)">{{ $t('selfieResult.hair') }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <text class="shell-section-h">{{ $t('selfieResult.scoreBreakdown') }}</text>
            <text class="shell-section-sub">{{ $t('selfieResult.basicMetrics') }}</text>

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

            <view class="shell-card shell-card-tint rp-cta">
                <text class="rp-cta-title">{{ $t('selfieResult.wantMoreInsights') }}</text>
                <text class="rp-cta-sub">{{ $t('selfieResult.tryAdvancedScanner') }}</text>
                <view class="rp-btn rp-btn--primary rp-btn--wide" @tap="getDermascope">
                    <text>{{ $t('selfieResult.getMyDermascope') }}</text>
                </view>
            </view>

            <view class="rp-actions">
                <view class="rp-btn rp-btn--ghost" @tap="retakeScan">
                    <text>{{ $t('selfieResult.retakeScan') }}</text>
                </view>
                <view class="rp-btn rp-btn--primary" @tap="exitResults">
                    <text>{{ $t('selfieResult.exit') }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';
import { getLocale } from '@/i18n.js';

// i18n
const { t } = useI18n();
const userStore = useUserStore();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
import TablerIcon from '@/components/icons/TablerIcon.vue';
const { statusBarHeight, headerPaddingStyle, contentMarginStyle } = useStatusBar();

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
const reportIdFromList = ref<string>('');
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
onMounted(async () => {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1] as any;
    const options = currentPage.options || {};

    // 修复：uni-app 页面参数直接存储在 options 中，不是 options.data 中
    position.value = decodeURIComponent(options.position || '');
    stage.value = options.stage || '1';
    imageUrl.value = decodeURIComponent(options.image || '');
    fromSource.value = options.from || '';
    extInfo.value = decodeURIComponent(options.extInfo || '');
    userId.value = options.userId || userStore.userInfo?.userId || '';
    createTime.value = decodeURIComponent(options.createTime || '');
    reportIdFromList.value = options.reportId || '';
    selfieId.value = options.id || '';

    console.log('Results data:', {
        position: position.value,
        stage: stage.value,
        imageUrl: imageUrl.value,
        from: fromSource.value,
        extInfo: extInfo.value,
        userId: userId.value,
        reportId: reportIdFromList.value,
        selfieId: selfieId.value
    });

    console.log('nuserId ===', userId.value);
    console.log('extInfo ===', extInfo.value);

    // 解析 extInfo 获取指标值
    if (extInfo.value) {
        try {
            const parsedExtInfo = JSON.parse(extInfo.value);
            oilValue.value = parsedExtInfo.oil || 0;
            scurfOrKeratinValue.value = parsedExtInfo.scurfOrKeratin || 0;
            overallValue.value = parsedExtInfo.overall || 0;
            hairLossValue.value = parsedExtInfo.hairLoss || 0;
        } catch (e) {
            console.error('Failed to parse extInfo for metrics:', e);
        }
    }

    // 如果有reportId，调用GET report接口；否则如果有extInfo和userId，调用新API
    if (reportIdFromList.value) {
        console.log('Fetch existing report by reportId:', reportIdFromList.value);
        await fetchExistingReport();
    } else if (extInfo.value && userId.value) {
        console.log('new api');
        await fetchAnalysis();
    }
});

// 获取已存在的报告（通过reportId）
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
    }
};

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
            parsedExtInfo = JSON.parse(extInfo.value);
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

            // 获取report_id并更新到数据库
            if (response.reportId) {
                const reportId = response.reportId;
                console.log('Got report_id from API:', reportId);

                // 调用user/updateSelfie接口保存reportId
                if (selfieId.value) {
                    await updateSelfieReportId(reportId);
                    // 检查本地存储是否已有reportId，没有才保存
                    try {
                        const existingReportId = uni.getStorageSync('ai_analysis_reportId');
                        if (!existingReportId) {
                            uni.setStorageSync('ai_analysis_reportId', reportId);
                            console.log('已保存reportId到本地存储: Saved reportId to local storage:', reportId);
                        } else {
                            console.log('本地存储已有reportId，不覆盖: Existing reportId in storage:', existingReportId);
                        }
                    } catch (e) {
                        console.error('保存reportId到本地存储失败: Failed to save reportId to local storage:', e);
                    }
                    // 通过事件通知列表页更新对应的item
                    uni.$emit('selfieReportIdUpdated', {
                        selfieId: selfieId.value,
                        reportId: reportId
                    });
                    console.log('Emitted selfieReportIdUpdated event');
                } else {
                    // 保存到本地存储 Save to local storage
                    try {
                        uni.setStorageSync('ai_analysis_reportId', reportId);
                        console.log('已保存reportId到本地存储: Saved reportId to local storage:', reportId);
                    } catch (e) {
                        console.error('保存reportId到本地存储失败: Failed to save reportId to local storage:', e);
                    }
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
    }
};

// Computed properties for dynamic display
const hairLossLevel = computed(() => {
    const stageNum = parseInt(stage.value) || 1;
    // Map stage (1-5) to level (1-7)
    // Stage 1 -> Level 1-2 (Mild)
    // Stage 2 -> Level 2-3
    // Stage 3 -> Level 3-4 (Moderate)
    // Stage 4 -> Level 5-6
    // Stage 5 -> Level 6-7 (Severe)
    const levelMap: { [key: number]: number } = {
        1: 1,
        2: 3,
        3: 4,
        4: 6,
        5: 7
    };
    return levelMap[stageNum] || 1;
});

const severityText = computed(() => {
    const level = hairLossLevel.value;
    if (level <= 2) return 'Mild';
    if (level <= 4) return 'Moderate';
    if (level <= 6) return 'Advanced';
    return 'Severe';
});

const patternDescription = computed(() => {
    const pos = positionText.value || 'Unknown area';
    const severity = severityText.value;
    
    if (hairLossLevel.value <= 2) {
        return `Your hairline is normal in the ${pos} area. You have a higher than average hair count!`;
    } else if (hairLossLevel.value <= 4) {
        return `Hair thinning detected in the ${pos} area. Consider following suggestions below to maintain hair health.`;
    } else {
        return `Significant hair loss detected in the ${pos} area. We recommend following a care routine and consulting with specialists.`;
    }
});

// Smart Summary - 从API获取或使用默认文本
const smartSummaryText = computed(() => {
    if (useNewApi.value && analysisReport.value && analysisReport.value.actionable_plan) {
        const adviceList = analysisReport.value.actionable_plan.advice;
        if (Array.isArray(adviceList) && adviceList.length > 0) {
            return adviceList.join('\n');
        }
    }

    // 默认文本
    const pos = positionText.value || 'Unknown area';
    return `Hair loss analysis detected in the ${pos} area with severity level ${stage.value}. ${patternDescription.value}`;
});

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

// Position-specific recommendations
const positionRecommendations = computed(() => {
    const pos = position.value.toLowerCase();
    
    if (pos.includes('前额') || pos.includes('forehead') || pos.includes('frontal')) {
        return 'Frontal hair loss is often related to hormonal factors. Consider DHT-blocking treatments.';
    } else if (pos.includes('头顶') || pos.includes('crown') || pos.includes('top')) {
        return 'Crown area thinning typically responds well to topical treatments like minoxidil.';
    } else if (pos.includes('两侧') || pos.includes('temple') || pos.includes('side')) {
        return 'Temple recession is common and may benefit from early intervention with growth serums.';
    }
    
    return 'Maintain overall scalp health for optimal hair growth.';
});

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
</style>
