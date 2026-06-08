 <script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import TitleLayout from '@/components/layout/TitleLayout.vue';
import html2canvas from 'html2canvas';

const { t } = useI18n();

// 模拟数据
const hairScore = ref(74);
const improvement = ref(4);
const hairLossLevel = ref(3);
const currentDate = ref('April 22, 2025 at 5:00 PM');

// 产品推荐数据
const productRecommendations = ref([
    {
        type: 'preWash',
        icon: 'wash',
        name: 'Hair Oil',
        productName: 'Gisou Honey Infused Hair Oil',
        image: '/static/analysis/hair-oil-product.jpg',
        tags: ['oilyHair', 'dryScalp']
    },
    {
        type: 'shampoo',
        icon: 'bubble_chart',
        name: 'Shampoo',
        productName: 'Gloss Moderne Clean Shampoo',
        image: '/static/analysis/shampoo-product.jpg',
        tags: ['oilyHair', 'dryScalp']
    },
    {
        type: 'conditioner',
        icon: 'egg',
        name: 'Conditioner',
        productName: 'Olaplex N°.5FINE BOND MAINTENANCE® CONDITIONER',
        image: '/static/analysis/conditioner.png',
        tags: ['oilyHair', 'dryScalp']
    },
    {
        type: 'serum',
        icon: 'science',
        name: 'Serum',
        productName: 'Gloss Moderne Clean Shampoo',
        image: '/static/analysis/serum.png',
        tags: ['oilyHair', 'dryScalp']
    },
    {
        type: 'hairMask',
        icon: 'face_retouching_natural',
        name: 'Shampoo',
        productName: 'Gloss Moderne Clean Shampoo',
        image: '/static/analysis/mask.png',
        tags: ['oilyHair', 'dryScalp']
    }
]);

// 指标数据
const metrics = ref([
    { name: 'Gray Hair', value: 15, color: '#6739C6' },
    { name: 'Sensitivity', value: 25, color: '#6739C6' },
    { name: 'Hair', value: 35, color: '#6739C6' },
    { name: 'Oiliness', value: 45, color: '#6739C6' },
    { name: 'Follicle', value: 55, color: '#6739C6' },
    { name: 'Scalp', value: 65, color: '#6739C6' }
]);

// 评分分解数据
const scoreBreakdown = ref([
    {
        title: 'scalpHealth',
        icon: 'egg',
        status: 'highOiliness',
        value: '21.87',
        description: 'percentileDescription',
        activeMetric: 'oiliness',
        metrics: ['oiliness', 'dandruff', 'sensitivity']
    },
    {
        title: 'hairFocus',
        icon: 'grain',
        status: 'lowDensity',
        value: '21.87',
        description: 'percentileDescription',
        activeMetric: 'hairDensity',
        metrics: ['hairDensity', 'hairRadius', 'greyHairs', 'terminalVellusRatio']
    },
    {
        title: 'follicleFocus',
        icon: 'stream',
        status: 'highAverage',
        value: '21.87',
        description: 'percentileDescription',
        activeMetric: 'follicleAverage',
        metrics: ['follicleDensity', 'follicleRadius', 'follicleAverage']
    }
]);

const onBack = () => {
    uni.navigateBack();
};

const onGenerateMore = () => {
    // 生成更多建议的逻辑
    console.log('Generate more suggestions');
};

const onCopyInviteCode = () => {
    // 复制邀请码的逻辑
    uni.setClipboardData({
        data: 'LUSHAIR2024',
        success: () => {
            uni.showToast({
                title: '邀请码已复制',
                icon: 'success'
            });
        }
    });
};

const onRetakeScan = () => {
    uni.navigateTo({
        url: '/pages/trichoscan/index'
    });
};

const onExit = () => {
    uni.switchTab({
        url: '/pages/index/home'
    });
};

const onShareResults = () => {
    const score = hairScore.value || 0;
    const shareText = `My hair health score is ${score}/100! Check yours with Lushair.`;

    uni.showLoading({ title: 'Generating image...' });

    setTimeout(() => {
        const element = document.querySelector('.quick-result') as HTMLElement | null;
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
                el.classList && (el.classList.contains('share-btn') || el.classList.contains('back-button'))
        }).then((canvas) => {
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
                    uni.showToast({ title: 'Image sent', icon: 'success' });
                    return;
                }
                if (isAndroid && (window as any).android?.savePassportImage) {
                    (window as any).android.savePassportImage(dataUrl);
                    uni.showToast({ title: 'Image sent', icon: 'success' });
                    return;
                }

                // @ts-ignore
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await (navigator as any).share({ files: [file], title: 'Lushair - Hair Health Results', text: shareText });
                        return;
                    } catch { /* fall through */ }
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

const onView = () => {
    uni.navigateTo({
        url: '/pages/trichoscan/index'
    });
};

// 辅助函数
const getMetricIcon = (metric: string): string => {
    const iconMap: Record<string, string> = {
        oiliness: 'egg',
        dandruff: 'scatter_plot',
        sensitivity: 'sensors',
        hairDensity: 'grain',
        hairRadius: 'filter_tilt_shift',
        greyHairs: 'texture',
        terminalVellusRatio: 'shape_line',
        follicleDensity: 'center_focus_strong',
        follicleRadius: 'filter_tilt_shift',
        follicleAverage: 'stream'
    };
    return iconMap[metric] || 'help';
};
</script>

<template>
    <TitleLayout :title="t('quickResult.title')">
        <view class="quick-result">
            <!-- 标题和日期 -->
            <view class="title-section">
                <view class="title-row">
                    <text class="main-title">{{ t('quickResult.title') }}</text>
                    <view class="badge">
                        <wd-icon name="timelapse" size="12" color="#000" />
                        <text class="badge-text">{{ t('quickResult.quickScan') }}</text>
                    </view>
                </view>
                <text class="date-text">{{ currentDate }}</text>
            </view>

            <!-- 评分卡片 -->
            <view class="score-card">
                <text class="score-title">{{ t('quickResult.yourHairScore') }}</text>
                <view class="score-display">
                    <text class="score-number">{{ hairScore }}</text>
                    <text class="score-out-of">{{ t('quickResult.outOf100') }}</text>
                </view>
                
                <!-- 趋势图 -->
                <view class="trend-chart">
                    <view class="chart-container">
                        <!-- 简化的趋势线 -->
                        <view class="trend-line"></view>
                        <view class="data-points">
                            <view class="data-point" v-for="i in 7" :key="i" :class="{ active: i === 7 }"></view>
                        </view>
                    </view>
                    <view class="trend-info">
                        <text class="trend-text">{{ t('quickResult.good') }}</text>
                        <view class="improvement-badge">
                            <text class="improvement-text">+ {{ improvement }}</text>
                        </view>
                    </view>
                    <view class="date-timeline">
                        <view class="date-item" v-for="(date, index) in ['6 Aug', '17 Aug', '29 Aug', '6 Sep', '25 Sep', '12 Oct', '28 Oct']" :key="index" :class="{ active: index === 6 }">
                            <view class="date-dot"></view>
                            <text class="date-text">{{ date }}</text>
                        </view>
                    </view>
                </view>
                
                <text class="improvement-text">{{ t('quickResult.improvement', [improvement]) }}</text>
            </view>

            <!-- 脱发模式 -->
            <view class="hair-loss-section">
                <view class="section-header">
                    <text class="section-title">{{ t('quickResult.hairLossPattern') }}</text>
                    <text class="level-text">{{ t('quickResult.levelOf7', [hairLossLevel]) }}</text>
                </view>
                
                <view class="level-indicator">
                    <view class="level-bar">
                        <view class="level-item" v-for="i in 7" :key="i" :class="{ active: i === hairLossLevel }">
                            <text class="level-number">{{ i }}</text>
                        </view>
                    </view>
                    <view class="level-labels">
                        <text class="level-label">{{ t('quickResult.mildHairloss') }}</text>
                        <text class="level-label">{{ t('quickResult.severeHairloss') }}</text>
                    </view>
                </view>
                
                <text class="hair-loss-description">{{ t('quickResult.hairlineNormal') }}</text>
            </view>

            <!-- 智能总结 -->
            <view class="smart-summary">
                <view class="summary-header">
                    <view class="summary-icon">
                        <wd-icon name="assistant" size="24" color="#000" />
                    </view>
                    <text class="summary-title">{{ t('quickResult.smartSummary') }}</text>
                </view>
                
                <view class="summary-content">
                    <text class="summary-text">{{ t('quickResult.scalpObservation') }}</text>
                    
                    <view class="suggestions-section">
                        <text class="suggestions-title">{{ t('quickResult.suggestions') }}</text>
                        <text class="suggestions-text">{{ t('quickResult.suggestionText') }}</text>
                    </view>
                </view>
                
                <button class="generate-btn" @click="onGenerateMore">
                    {{ t('quickResult.generateMore') }}
                </button>
            </view>

            <!-- 产品推荐 -->
            <view class="product-recommendations">
                <view class="section-header">
                    <text class="section-title">{{ t('quickResult.picksForYou') }}</text>
                    <text class="section-description">{{ t('quickResult.picksDescription') }}</text>
                </view>
                
                <scroll-view class="product-scroll" scroll-x>
                    <view class="product-list">
                        <view class="product-item" v-for="product in productRecommendations" :key="product.type">
                            <view class="product-header">
                                <wd-icon :name="product.icon" size="16" color="#323232" />
                                <text class="product-type">{{ t(`quickResult.${product.type}`) }}</text>
                            </view>
                            
                            <view class="product-card">
                                <image class="product-image" :src="product.image" mode="aspectFill" />
                                <view class="product-info">
                                    <view class="product-name">
                                        <text class="product-category">{{ product.name }}</text>
                                        <text class="product-title">{{ product.productName }}</text>
                                    </view>
                                    
                                    <view class="product-tags">
                                        <text class="tags-label">{{ t('quickResult.goodFor') }}</text>
                                        <view class="tags-list">
                                            <view class="tag" v-for="tag in product.tags" :key="tag">
                                                <text class="tag-text">{{ t(`quickResult.${tag}`) }}</text>
                                            </view>
                                            <view class="tag more-tag">
                                                <text class="tag-text">{{ t('quickResult.more') }}</text>
                                            </view>
                                        </view>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </scroll-view>
            </view>

            <!-- 指标图表 -->
            <view class="metrics-section">
                <view class="section-header">
                    <text class="section-title">{{ t('quickResult.yourMetrics') }}</text>
                    <text class="section-description">{{ t('quickResult.metricsDescription') }}</text>
                </view>
                
                <view class="metrics-chart">
                    <view class="chart-container">
                        <view class="radar-chart">
                            <view class="chart-circle" v-for="(metric, index) in metrics" :key="index" :style="{ '--index': index }">
                                <view class="metric-point" :style="{ backgroundColor: metric.color }"></view>
                                <text class="metric-label">{{ metric.name }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 评分分解 -->
            <view class="score-breakdown">
                <view class="section-header">
                    <text class="section-title">{{ t('quickResult.scoreBreakdown') }}</text>
                    <text class="section-description">{{ t('quickResult.breakdownDescription') }}</text>
                </view>
                
                <view class="breakdown-cards">
                    <view class="breakdown-card" v-for="item in scoreBreakdown" :key="item.title">
                        <text class="card-title">{{ t(`quickResult.${item.title}`) }}</text>
                        
                        <view class="chart-section">
                            <view class="bell-curve">
                                <view class="curve-container">
                                    <view class="curve-fill"></view>
                                    <view class="curve-line"></view>
                                    <view class="user-marker">
                                        <view class="marker-dot"></view>
                                    </view>
                                    <view class="percentile-badge">
                                        <text class="percentile-text">{{ t('quickResult.you80th') }}</text>
                                    </view>
                                    <view class="vertical-line"></view>
                                </view>
                                
                                <view class="curve-labels">
                                    <text class="curve-label">{{ t('quickResult.lowEnd') }}</text>
                                    <text class="curve-label">{{ t('quickResult.average') }}</text>
                                    <text class="curve-label">{{ t('quickResult.highEnd') }}</text>
                                </view>
                            </view>
                            
                            <view class="metric-buttons">
                                <view class="metric-button" v-for="metric in item.metrics" :key="metric" :class="{ active: metric === item.activeMetric }">
                                    <wd-icon :name="getMetricIcon(metric)" size="16" :color="metric === item.activeMetric ? '#6739C6' : '#000'" />
                                    <text class="metric-button-text">{{ t(`quickResult.${metric}`) }}</text>
                                </view>
                            </view>
                        </view>
                        
                        <view class="content-section">
                            <view class="content-header">
                                <view class="content-title">
                                    <wd-icon :name="item.icon" size="32" color="#000" />
                                    <text class="content-name">{{ t(`quickResult.${item.activeMetric}`) }}</text>
                                </view>
                                <view class="content-status">
                                    <text class="status-text">{{ t(`quickResult.${item.status}`) }}</text>
                                    <view class="value-display">
                                        <text class="value-number">{{ item.value }}</text>
                                        <text class="value-unit">%</text>
                                    </view>
                                </view>
                            </view>
                            
                            <text class="content-description">{{ t(`quickResult.${item.description}`) }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 分割线 -->
            <view class="divider"></view>

            <!-- 扫描图片 -->
            <view class="scan-section">
                <view class="scan-item">
                    <text class="scan-title">{{ t('quickResult.quickScan') }}</text>
                    <image class="scan-image" src="/static/analysis/scalp1.jpg" mode="aspectFill" />
                    <button class="view-btn" @click="onView">
                        <wd-icon name="remove_red_eye" size="16" color="#6739C6" />
                        <text class="view-text">{{ t('quickResult.view') }}</text>
                    </button>
                </view>
            </view>

            <!-- 邀请卡片 -->
            <view class="invite-card">
                <view class="invite-content">
                    <text class="invite-title">{{ t('quickResult.friendsWantToTry') }}</text>
                    <text class="invite-description">{{ t('quickResult.inviteDescription') }}</text>
                </view>
                
                <button class="copy-btn" @click="onCopyInviteCode">
                    <wd-icon name="content_copy" size="16" color="#6739C6" />
                    <text class="copy-text">{{ t('quickResult.copyInviteCode') }}</text>
                </button>
            </view>

            <!-- 底部按钮 -->
            <view class="bottom-buttons">
                <button class="share-btn" @click="onShareResults">
                    <image class="share-btn-icon" src="/static/icons/share.svg" mode="aspectFit" />
                    <text class="share-btn-text">{{ t('quickResult.shareResults') }}</text>
                </button>
                <button class="retake-btn" @click="onRetakeScan">
                    {{ t('quickResult.retakeScan') }}
                </button>
                <button class="exit-btn" @click="onExit">
                    {{ t('quickResult.exit') }}
                </button>
            </view>
        </view>
    </TitleLayout>
</template>

<style lang="less" scoped>
.quick-result {
    padding: 0 16px 16px;
    background-color: #F5F5F5;
    min-height: 100vh;
}

.title-section {
    margin-bottom: 24px;
    
    .title-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 8px;
        
        .main-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 500;
            font-size: 28px;
            color: #000;
        }
        
        .badge {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0 4px;
            background: linear-gradient(135deg, #848484, #E6E6E6, #7D7D7D, #454545);
            border: 0.5px solid #B8B8B8;
            border-radius: 2px;
            
            .badge-text {
                font-family: 'Chivo', sans-serif;
                font-size: 12px;
                color: #000;
            }
        }
    }
    
    .date-text {
        font-family: 'Archivo', sans-serif;
        font-weight: 600;
        font-size: 12px;
        color: #7A7A7A;
        text-align: center;
        display: block;
    }
}

.score-card {
    background: linear-gradient(135deg, #848484, #D8D8D8, #7D7D7D, #454545);
    border-radius: 2px;
    padding: 24px;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    
    .score-title {
        font-family: 'Archivo', sans-serif;
        font-weight: 600;
        font-size: 22px;
        color: #FFF;
        text-align: center;
    }
    
    .score-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        
        .score-number {
            font-family: 'Archivo', sans-serif;
            font-weight: 700;
            font-size: 64px;
            background: linear-gradient(135deg, #66B4AB, #92F1E6, #4F9890, #99FFF3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.088;
            letter-spacing: -0.03125em;
        }
        
        .score-out-of {
            font-family: 'Archivo', sans-serif;
            font-weight: 600;
            font-size: 16px;
            color: #E0E0E0;
        }
    }
    
    .trend-chart {
        width: 100%;
        max-width: 529px;
        height: 140px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        position: relative;
        overflow: hidden;
        
        .chart-container {
            position: relative;
            width: 100%;
            height: 100%;
            
            .trend-line {
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #DFFF60, #E1E1E1);
                transform: translateY(-50%);
            }
            
            .data-points {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: space-around;
                
                .data-point {
                    width: 9.15px;
                    height: 9.15px;
                    background: #323232;
                    border: 2px solid #E1E1E1;
                    border-radius: 50%;
                    
                    &.active {
                        border-color: #DFFF60;
                    }
                }
            }
        }
        
        .trend-info {
            position: absolute;
            top: 38px;
            right: 24px;
            display: flex;
            align-items: center;
            gap: 4px;
            
            .trend-text {
                font-family: 'Chivo', sans-serif;
                font-weight: 300;
                font-size: 14px;
                color: #FFF;
            }
            
            .improvement-badge {
                background: #DFFF60;
                border-radius: 2px;
                padding: 0 4px;
                
                .improvement-text {
                    font-family: 'Chivo', sans-serif;
                    font-size: 12px;
                    color: #000;
                }
            }
        }
        
        .date-timeline {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-around;
            padding: 0 24px;
            
            .date-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                
                .date-dot {
                    width: 0;
                    height: 5px;
                    border-left: 0.8px solid #F5F5F5;
                }
                
                .date-text {
                    font-family: 'Chivo', sans-serif;
                    font-size: 12px;
                    color: #E0E0E0;
                    
                    &.active {
                        font-family: 'Lato', sans-serif;
                        font-weight: 500;
                        color: #F5F5F5;
                    }
                }
                
                &.active .date-text {
                    font-family: 'Lato', sans-serif;
                    font-weight: 500;
                    color: #F5F5F5;
                }
            }
        }
    }
    
    .improvement-text {
        font-family: 'Chivo', sans-serif;
        font-weight: 300;
        font-size: 14px;
        color: #FFF;
        text-align: center;
    }
}

.hair-loss-section {
    margin-bottom: 24px;
    
    .section-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 24px;
        
        .section-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 600;
            font-size: 22px;
            color: #FFF;
            text-align: center;
        }
        
        .level-text {
            font-family: 'Chivo', sans-serif;
            font-size: 12px;
            color: #F5F5F5;
            text-align: center;
        }
    }
    
    .level-indicator {
        margin-bottom: 24px;
        
        .level-bar {
            display: flex;
            gap: 2px;
            margin-bottom: 2px;
            
            .level-item {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2px 12px;
                background: rgba(223, 255, 96, 0.3);
                border-radius: 2px;
                
                &.active {
                    background: rgba(223, 255, 96, 0.5);
                    border: 1px solid #FFF;
                    
                    .level-number {
                        font-weight: 600;
                        color: #FFF;
                    }
                }
                
                .level-number {
                    font-family: 'Chivo', sans-serif;
                    font-weight: 500;
                    font-size: 10px;
                    color: #323232;
                }
            }
        }
        
        .level-labels {
            display: flex;
            justify-content: space-between;
            
            .level-label {
                font-family: 'Chivo', sans-serif;
                font-size: 10px;
                color: #F5F5F5;
            }
        }
    }
    
    .hair-loss-description {
        font-family: 'Chivo', sans-serif;
        font-weight: 300;
        font-size: 14px;
        color: #FFF;
        text-align: center;
    }
}

.smart-summary {
    background: #FFF;
    border: 2px solid;
    border-image: linear-gradient(135deg, #737373, #EAEAEA, #9F9F9F, #E0E0E0, #888888) 1;
    border-radius: 2px;
    padding: 24px;
    margin-bottom: 24px;
    
    .summary-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
        
        .summary-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }
        
        .summary-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 500;
            font-size: 18px;
            color: #000;
        }
    }
    
    .summary-content {
        margin-bottom: 32px;
        
        .summary-text {
            font-family: 'Chivo', sans-serif;
            font-weight: 300;
            font-size: 16px;
            color: #000;
            margin-bottom: 24px;
            display: block;
        }
        
        .suggestions-section {
            .suggestions-title {
                font-family: 'Archivo', sans-serif;
                font-weight: 600;
                font-size: 16px;
                color: #323232;
                margin-bottom: 12px;
                display: block;
            }
            
            .suggestions-text {
                font-family: 'Chivo', sans-serif;
                font-weight: 300;
                font-size: 16px;
                color: #000;
                line-height: 1.5;
            }
        }
    }
    
    .generate-btn {
        width: 100%;
        background: #6739C6;
        border: none;
        border-radius: 2px;
        padding: 16px 18px;
        font-family: 'Archivo', sans-serif;
        font-weight: 600;
        font-size: 14px;
        color: #FFF;
        text-transform: uppercase;
        letter-spacing: 0.017857em;
    }
}

.product-recommendations {
    margin-bottom: 24px;
    
    .section-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
        
        .section-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 500;
            font-size: 18px;
            color: #000;
        }
        
        .section-description {
            font-family: 'Chivo', sans-serif;
            font-size: 10px;
            color: #323232;
        }
    }
    
    .product-scroll {
        white-space: nowrap;
        
        .product-list {
            display: flex;
            gap: 12px;
            padding: 0 4px;
            
            .product-item {
                width: 300px;
                flex-shrink: 0;
                
                .product-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 10px;
                    
                    .product-type {
                        font-family: 'Archivo', sans-serif;
                        font-size: 14px;
                        color: #323232;
                    }
                }
                
                .product-card {
                    background: #FFF;
                    border-radius: 2px;
                    padding: 16px;
                    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
                    display: flex;
                    gap: 16px;
                    
                    .product-image {
                        width: 124px;
                        height: 124px;
                        border-radius: 2px;
                        background: #E9E9E9;
                    }
                    
                    .product-info {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        
                        .product-name {
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                            
                            .product-category {
                                font-family: 'Chivo', sans-serif;
                                font-size: 12px;
                                color: #323232;
                            }
                            
                            .product-title {
                                font-family: 'Chivo', sans-serif;
                                font-weight: 600;
                                font-size: 16px;
                                color: #323232;
                                line-height: 1.5;
                            }
                        }
                        
                        .product-tags {
                            display: flex;
                            gap: 24px;
                            
                            .tags-label {
                                font-family: 'Chivo', sans-serif;
                                font-size: 10px;
                                color: #7A7A7A;
                                white-space: nowrap;
                            }
                            
                            .tags-list {
                                display: flex;
                                gap: 4px;
                                flex-wrap: wrap;
                                
                                .tag {
                                    background: linear-gradient(135deg, #848484, #E6E6E6, #7D7D7D, #454545);
                                    border: 0.5px solid #B8B8B8;
                                    border-radius: 2px;
                                    padding: 0 4px;
                                    
                                    .tag-text {
                                        font-family: 'Chivo', sans-serif;
                                        font-size: 12px;
                                        color: #000;
                                    }
                                    
                                    &.more-tag {
                                        background: #DFFF60;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

.metrics-section {
    margin-bottom: 24px;
    
    .section-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
        
        .section-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 500;
            font-size: 18px;
            color: #000;
        }
        
        .section-description {
            font-family: 'Chivo', sans-serif;
            font-size: 10px;
            color: #323232;
        }
    }
    
    .metrics-chart {
        background: #F5F5F5;
        border-radius: 2px;
        height: 276px;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .chart-container {
            position: relative;
            width: 230px;
            height: 230px;
            
            .radar-chart {
                position: relative;
                width: 100%;
                height: 100%;
                
                .chart-circle {
                    position: absolute;
                    width: 230px;
                    height: 230px;
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    border-radius: 50%;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    
                    &:nth-child(2) {
                        width: 176.92px;
                        height: 176.92px;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                    }
                    
                    &:nth-child(3) {
                        width: 123.85px;
                        height: 123.85px;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                    }
                    
                    &:nth-child(4) {
                        width: 70.77px;
                        height: 70.77px;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                    }
                    
                    .metric-point {
                        position: absolute;
                        width: 7.08px;
                        height: 7.08px;
                        border-radius: 50%;
                        border: 1px solid #2E1B54;
                        
                        &:nth-child(1) { top: 22.12px; left: 60.31px; }
                        &:nth-child(2) { top: 111.46px; left: 214.23px; }
                        &:nth-child(3) { top: 111.46px; left: 9px; }
                        &:nth-child(4) { top: 199.92px; left: 60.31px; }
                        &:nth-child(5) { top: 199.92px; left: 162.92px; }
                        &:nth-child(6) { top: 22.12px; left: 162.92px; }
                    }
                    
                    .metric-label {
                        position: absolute;
                        font-family: 'Chivo', sans-serif;
                        font-size: 10px;
                        color: #323232;
                        
                        &:nth-child(1) { top: 6px; left: 50px; }
                        &:nth-child(2) { top: 6px; right: 50px; }
                        &:nth-child(3) { top: 112.2px; left: 21px; }
                        &:nth-child(4) { bottom: 6px; right: 38px; }
                        &:nth-child(5) { bottom: 6px; left: 62px; }
                        &:nth-child(6) { top: 112.2px; right: 27px; }
                    }
                }
            }
        }
    }
}

.score-breakdown {
    margin-bottom: 24px;
    
    .section-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 16px;
        
        .section-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 500;
            font-size: 18px;
            color: #000;
        }
        
        .section-description {
            font-family: 'Chivo', sans-serif;
            font-size: 10px;
            color: #323232;
        }
    }
    
    .breakdown-cards {
        display: flex;
        flex-direction: column;
        gap: 16px;
        
        .breakdown-card {
            background: #FFF;
            border-radius: 2px;
            padding: 24px 16px;
            box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
            
            .card-title {
                font-family: 'Archivo', sans-serif;
                font-weight: 600;
                font-size: 12px;
                color: #000;
                text-transform: uppercase;
                letter-spacing: 0.083333em;
                margin-bottom: 32px;
                display: block;
            }
            
            .chart-section {
                margin-bottom: 32px;
                
                .bell-curve {
                    margin-bottom: 16px;
                    
                    .curve-container {
                        position: relative;
                        height: 110px;
                        margin-bottom: 6px;
                        
                        .curve-fill {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(221, 221, 221, 0.1);
                            border-radius: 50% 50% 0 0;
                        }
                        
                        .curve-line {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            border: 1px solid #6739C6;
                            border-radius: 50% 50% 0 0;
                        }
                        
                        .user-marker {
                            position: absolute;
                            top: 24px;
                            right: 30px;
                            
                            .marker-dot {
                                width: 10px;
                                height: 10px;
                                background: linear-gradient(135deg, #5A5A5A, #000, #3A3A3A, #252525, #000);
                                border: 1px solid #B8B8B8;
                                border-radius: 50%;
                            }
                        }
                        
                        .percentile-badge {
                            position: absolute;
                            top: 6px;
                            right: 50px;
                            background: linear-gradient(135deg, #5A5A5A, #000, #3A3A3A, #252525, #000);
                            border-radius: 2px;
                            padding: 0 4px;
                            
                            .percentile-text {
                                font-family: 'Chivo', sans-serif;
                                font-size: 12px;
                                color: #F5F5F5;
                            }
                        }
                        
                        .vertical-line {
                            position: absolute;
                            top: 45px;
                            right: 201px;
                            width: 0;
                            height: 65px;
                            border-left: 1px solid #7A7A7A;
                        }
                    }
                    
                    .curve-labels {
                        display: flex;
                        justify-content: space-between;
                        
                        .curve-label {
                            font-family: 'Chivo', sans-serif;
                            font-size: 8px;
                            color: #7A7A7A;
                            width: 80px;
                            
                            &:nth-child(2) {
                                text-align: center;
                            }
                            
                            &:nth-child(3) {
                                text-align: right;
                            }
                        }
                    }
                }
                
                .metric-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 24px;
                    
                    .metric-button {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 4px;
                        
                        .metric-button-text {
                            font-family: 'Archivo', sans-serif;
                            font-size: 8px;
                            color: #000;
                            text-align: center;
                            
                            &.active {
                                color: #6739C6;
                                font-weight: 600;
                            }
                        }
                        
                        &.active {
                            background: rgba(103, 57, 198, 0.2);
                            border: 1px solid #6739C6;
                            border-radius: 2px;
                            padding: 10px;
                        }
                    }
                }
            }
            
            .content-section {
                .content-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 16px;
                    
                    .content-title {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        
                        .content-name {
                            font-family: 'Archivo', sans-serif;
                            font-weight: 500;
                            font-size: 16px;
                            color: #000;
                        }
                    }
                    
                    .content-status {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 8px;
                        
                        .status-text {
                            font-family: 'Archivo', sans-serif;
                            font-weight: 600;
                            font-size: 12px;
                            color: #2E1B54;
                        }
                        
                        .value-display {
                            display: flex;
                            align-items: flex-end;
                            gap: 2px;
                            
                            .value-number {
                                font-family: 'Archivo', sans-serif;
                                font-weight: 500;
                                font-size: 28px;
                                color: #000;
                            }
                            
                            .value-unit {
                                font-family: 'Chivo', sans-serif;
                                font-weight: 600;
                                font-size: 14px;
                                color: #7A7A7A;
                            }
                        }
                    }
                }
                
                .content-description {
                    font-family: 'Chivo', sans-serif;
                    font-weight: 300;
                    font-size: 14px;
                    color: #323232;
                    line-height: 1.5;
                }
            }
        }
    }
}

.divider {
    height: 1px;
    background: #E0E0E0;
    margin: 24px 0;
}

.scan-section {
    margin-bottom: 24px;
    
    .scan-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        
        .scan-title {
            font-family: 'Archivo', sans-serif;
            font-weight: 600;
            font-size: 12px;
            color: #878D96;
            text-transform: uppercase;
            letter-spacing: 0.083333em;
        }
        
        .scan-image {
            width: 150px;
            height: 162px;
            border-radius: 4px;
            box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
        }
        
        .view-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: none;
            border: none;
            padding: 16px 18px;
            height: 46px;
            
            .view-text {
                font-family: 'Archivo', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #6739C6;
                text-transform: uppercase;
                letter-spacing: 0.017857em;
            }
        }
    }
}

.invite-card {
    background: #FFF;
    border: 1px solid #E0E0E0;
    border-radius: 2px;
    padding: 24px 24px 16px;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    .invite-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
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
    }
    
    .copy-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #FFF;
        border: 1px solid #6739C6;
        border-radius: 2px;
        padding: 16px 18px;
        height: 46px;
        
        .copy-text {
            font-family: 'Archivo', sans-serif;
            font-weight: 600;
            font-size: 14px;
            color: #6739C6;
            text-transform: uppercase;
            letter-spacing: 0.017857em;
        }
    }
}

.bottom-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .share-btn {
        width: 100%;
        height: 56px;
        border-radius: 2px;
        font-family: 'Archivo', sans-serif;
        font-weight: 600;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.015625em;
        background: #F0E6FF;
        border: 1px solid #6739C6;
        color: #6739C6;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .share-btn-icon {
        width: 20px;
        height: 20px;
    }

    .share-btn-text {
        color: #6739C6;
    }

    .retake-btn, .exit-btn {
        flex: 1;
        height: 56px;
        border-radius: 2px;
        font-family: 'Archivo', sans-serif;
        font-weight: 600;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.015625em;
    }

    .retake-btn {
        background: #FFF;
        border: 1px solid #6739C6;
        color: #6739C6;
    }

    .exit-btn {
        background: #6739C6;
        border: none;
        color: #FFF;
    }
}
</style>
