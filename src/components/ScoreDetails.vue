<script setup lang="ts">
import { computed, ref } from 'vue';
import DetailChart from './element/DetailChart.vue';

const props = defineProps({
    detailData: {
        type: Object,
        default: () => ({}),
    },
});

const chartPadding = 4;
const chartWidth = 300;
const chartHeight = 150;
const maxColumns = 5;

const metricToScoreKey: Record<string, string> = {
    Oiliness: 'scalp_oil_area_score',
    Follicle: 'follicle_score',
    Sensitivity: 'redness_area_score',
    Keratin: 'keratinocytes_score',
    'Hair Density': 'hair_density_score',
    'Hair Thickness': 'hair_max_rad_score',
};

const metricToUrlKey: Record<string, string> = {
    Oiliness: 'scalp_oil',
    Follicle: 'follicle',
    Sensitivity: 'opcs_redness',
    Keratin: 'follicle_keratinocytes',
    'Hair Density': 'hair',
    'Hair Thickness': 'hair',
};

const metricBackgroundColors: Record<string, string> = {
    Oiliness: '#5024af',
    Follicle: '#c1d77b',
    Sensitivity: '#76ceff',
    Keratin: '#dbcaff',
    'Hair Density': '#ffbdad',
    'Hair Thickness': '#c6b0f8',
};

const gradeMap: Record<string, string> = {
    标准: 'Neutral',
    偏低: 'Low',
    偏高: 'High',
};

computed(() => {
    const key = metricToScoreKey[activeMetric.value ?? ''];
    if (!key) return [];
    return Object.entries(props.detailData)
        .filter(([k]) => /^[1-5]$/.test(k))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([_, record]) => record?.[key])
        .filter((val) => typeof val === 'number');
});

const imageUrls = computed(() => {
    const key = metricToUrlKey[activeMetric.value ?? ''];
    if (!key) return [];

    return Object.entries(props.detailData)
        .filter(([k]) => /^[1-5]$/.test(k))
        .map(([_, record]) => record?.url?.[key]?.[0])
        .filter(Boolean);
});

const activeMetric = ref<string | null>(null);

const toggleMetricDetail = (metric: string) => {
    if (activeMetric.value === metric) {
        // 如果点击的是当前显示的指标，则关闭详情
        activeMetric.value = null;
    } else {
        // 否则显示该指标的详情
        activeMetric.value = metric;
    }
};

const previewImage = (currentUrl: string) => {
    uni.previewImage({
        current: currentUrl,
        urls: imageUrls.value,
    });
};

const pointCoords = computed(() => {
    const key = metricToScoreKey[activeMetric.value ?? ''];
    if (!key) return [];

    const raw = Object.entries(props.detailData)
        .filter(([k]) => /^[1-5]$/.test(k))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([_, record]) => record?.[key])
        .filter((v) => typeof v === 'number');

    if (raw.length === 0) return [];

    const max = Math.max(...raw);
    const min = Math.min(...raw);
    const stepX = (chartWidth - chartPadding * 2) / (maxColumns - 1);

    return raw.map((score, i) => {
        const percent = (score - min) / (max - min || 1);
        const x = chartPadding + stepX * i;
        const y = chartPadding + (1 - percent) * (chartHeight - chartPadding * 2);
        return { x, y };
    });
});

const linePoints = computed(() => pointCoords.value.map((p) => `${p.x},${p.y}`).join(' '));

const fillPoints = computed(() => {
    const points = pointCoords.value.map((p) => `${p.x},${p.y}`);
    if (points.length < 2) return '';
    const firstX = pointCoords.value[0].x;
    const lastX = pointCoords.value[pointCoords.value.length - 1].x;
    return [...points, `${lastX},${chartHeight}`, `${firstX},${chartHeight}`].join(' ');
});
</script>

<template>
    <view class="root">
        <!-- 详细数据卡片 -->
        <view class="details-card">
            <view class="hair-metrics">
                <view
                    class="hair-metric-item"
                    @tap="toggleMetricDetail('Oiliness')"
                    :style="{ backgroundColor: metricBackgroundColors['Oiliness'] }"
                    :class="{ active: activeMetric === 'Oiliness' }"
                >
                    <view class="metric-header">
                        <text class="metric-title">Oiliness</text>
                        <text class="metric-grade">
                            {{
                                gradeMap[detailData.scalp_oil_area_score_map.grade] ||
                                detailData.scalp_oil_area_score_map.grade
                            }}
                        </text>
                    </view>
                    <view class="metric-value">
                        <text class="metric-value-big">{{
                            detailData.scalp_oil_area_score_map.score?.toFixed(2)
                        }}</text>
                        <text class="metric-value-unit">%</text>
                    </view>
                    <view class="metric-indicator">
                        <image
                            v-if="activeMetric === 'Oiliness'"
                            src="/static/icons/up.svg"
                            class="indicator-icon"
                            mode="aspectFit"
                        />
                        <image v-else src="/static/icons/down.svg" class="indicator-icon" mode="aspectFit" />
                    </view>
                </view>
                <view
                    class="hair-metric-item"
                    @tap="toggleMetricDetail('Follicle')"
                    :style="{ backgroundColor: metricBackgroundColors['Follicle'] }"
                    :class="{ active: activeMetric === 'Follicle' }"
                >
                    <view class="metric-header">
                        <text class="metric-title">Follicle</text>
                        <text class="metric-grade">
                            {{ gradeMap[detailData.follicle_score_map.grade] || detailData.follicle_score_map.grade }}
                        </text>
                    </view>
                    <view class="metric-value">
                        <text class="metric-value-big">{{ detailData.follicle_score_map.score?.toFixed(2) }}</text>
                        <text class="metric-value-unit">h/f</text>
                    </view>
                    <view class="metric-indicator">
                        <image
                            v-if="activeMetric === 'Follicle'"
                            src="/static/icons/up.svg"
                            class="indicator-icon"
                            mode="aspectFit"
                        />
                        <image v-else src="/static/icons/down.svg" class="indicator-icon" mode="aspectFit" />
                    </view>
                </view>
                <view
                    class="hair-metric-item"
                    @tap="toggleMetricDetail('Sensitivity')"
                    :style="{ backgroundColor: metricBackgroundColors['Sensitivity'] }"
                    :class="{ active: activeMetric === 'Sensitivity' }"
                >
                    <view class="metric-header">
                        <text class="metric-title">Sensitivity</text>
                        <text class="metric-grade">
                            {{
                                gradeMap[detailData.redness_area_score_map.grade] ||
                                detailData.redness_area_score_map.grade
                            }}
                        </text>
                    </view>
                    <view class="metric-value">
                        <text class="metric-value-big">{{ detailData.redness_area_score_map.score?.toFixed(2) }}</text>
                        <text class="metric-value-unit">%</text>
                    </view>
                    <view class="metric-indicator">
                        <image
                            v-if="activeMetric === 'Hair'"
                            src="/static/icons/up.svg"
                            class="indicator-icon"
                            mode="aspectFit"
                        />
                        <image v-else src="/static/icons/down.svg" class="indicator-icon" mode="aspectFit" />
                    </view>
                </view>
            </view>

            <!-- 指标详细数据 -->
            <view class="detail-data" v-if="activeMetric === 'Oiliness'">
                <DetailChart :metric="'Oiliness'" :value="detailData.scalp_oil_area_score_map.score" />

                <view class="detail-description">
                    <text class="detail-info"
                        >Olliness means scalp oll conctent, surface oll, follicle oll lushalr detect surface oil.</text
                    >
                </view>

                <view class="svg-chart">
                    <svg
                        :width="chartWidth"
                        :height="chartHeight"
                        viewBox="0 0 300 150"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            v-for="i in 3"
                            :key="'h-' + i"
                            :x1="chartPadding"
                            :x2="chartWidth - chartPadding"
                            :y1="(chartHeight / 4) * i"
                            :y2="(chartHeight / 4) * i"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <!-- 纵向虚线：5列 -->
                        <line
                            v-for="i in 5"
                            :key="'v-' + i"
                            :x1="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :x2="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :y1="chartPadding"
                            :y2="chartHeight - chartPadding"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <polygon :points="fillPoints" fill="rgba(231, 248, 163, 0.6)" />

                        <polyline :points="linePoints" fill="none" stroke="#a855f7" stroke-width="2" />

                        <circle
                            v-for="(p, i) in pointCoords"
                            :key="'c-' + i"
                            :cx="p.x"
                            :cy="p.y"
                            r="4"
                            fill="#a855f7"
                        />
                    </svg>
                </view>

                <!-- 显微图像 -->
                <view class="microscope-images">
                    <scroll-view class="images-scroll" scroll-x show-scrollbar="false">
                        <view class="image-item" v-for="(url, index) in imageUrls" :key="index">
                            <image :src="url" mode="aspectFill" @tap="previewImage(url)" />
                        </view>
                    </scroll-view>
                </view>
            </view>

            <view class="detail-data" v-if="activeMetric === 'Follicle'">
                <DetailChart :metric="'Follicle'" :value="detailData.follicle_score_map.score" />

                <view class="detail-description">
                    <text class="detail-info"
                        >Follicle health indicates the condition of your hair follicles. Healthy follicles produce
                        stronger, thicker hair strands.</text
                    >
                </view>

                <view class="svg-chart">
                    <svg
                        :width="chartWidth"
                        :height="chartHeight"
                        viewBox="0 0 300 150"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            v-for="i in 3"
                            :key="'h-' + i"
                            :x1="chartPadding"
                            :x2="chartWidth - chartPadding"
                            :y1="(chartHeight / 4) * i"
                            :y2="(chartHeight / 4) * i"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <!-- 纵向虚线：5列 -->
                        <line
                            v-for="i in 5"
                            :key="'v-' + i"
                            :x1="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :x2="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :y1="chartPadding"
                            :y2="chartHeight - chartPadding"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <polygon :points="fillPoints" fill="rgba(231, 248, 163, 0.6)" />

                        <polyline :points="linePoints" fill="none" stroke="#a855f7" stroke-width="2" />

                        <circle
                            v-for="(p, i) in pointCoords"
                            :key="'c-' + i"
                            :cx="p.x"
                            :cy="p.y"
                            r="4"
                            fill="#a855f7"
                        />
                    </svg>
                </view>

                <!-- 显微图像 -->
                <view class="microscope-images">
                    <scroll-view class="images-scroll" scroll-x show-scrollbar="false">
                        <view class="image-item" v-for="(url, index) in imageUrls" :key="index">
                            <image :src="url" mode="aspectFill" @tap="previewImage(url)" />
                        </view>
                    </scroll-view>
                </view>
            </view>

            <view class="detail-data" v-if="activeMetric === 'Sensitivity'">
                <DetailChart :metric="'Sensitivity'" :value="detailData.redness_area_score_map.score / 100" />
                <view class="detail-description">
                    <text class="detail-info"
                        >Scalp sensitive erythema refers to the scalp in which symptoms such as erythema, itching,
                        tingling, burning or dryness are present.</text
                    >
                </view>

                <view class="svg-chart">
                    <svg
                        :width="chartWidth"
                        :height="chartHeight"
                        viewBox="0 0 300 150"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            v-for="i in 3"
                            :key="'h-' + i"
                            :x1="chartPadding"
                            :x2="chartWidth - chartPadding"
                            :y1="(chartHeight / 4) * i"
                            :y2="(chartHeight / 4) * i"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <!-- 纵向虚线：5列 -->
                        <line
                            v-for="i in 5"
                            :key="'v-' + i"
                            :x1="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :x2="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :y1="chartPadding"
                            :y2="chartHeight - chartPadding"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <polygon :points="fillPoints" fill="rgba(231, 248, 163, 0.6)" />

                        <polyline :points="linePoints" fill="none" stroke="#a855f7" stroke-width="2" />

                        <circle
                            v-for="(p, i) in pointCoords"
                            :key="'c-' + i"
                            :cx="p.x"
                            :cy="p.y"
                            r="4"
                            fill="#a855f7"
                        />
                    </svg>
                </view>

                <!-- 显微图像 -->
                <view class="microscope-images">
                    <scroll-view class="images-scroll" scroll-x show-scrollbar="false">
                        <view class="image-item" v-for="(url, index) in imageUrls" :key="index">
                            <image :src="url" mode="aspectFill" @tap="previewImage(url)" />
                        </view>
                    </scroll-view>
                </view>
            </view>
        </view>

        <!-- 详细数据卡片 -->
        <view class="details-card">
            <view class="hair-metrics">
                <view
                    class="hair-metric-item"
                    @tap="toggleMetricDetail('Keratin')"
                    :style="{ backgroundColor: metricBackgroundColors['Keratin'] }"
                    :class="{ active: activeMetric === 'Keratin' }"
                >
                    <view class="metric-header">
                        <text class="metric-title">Keratin</text>
                        <text class="metric-grade">
                            {{
                                gradeMap[detailData.keratinocytes_score_map.grade] ||
                                detailData.keratinocytes_score_map.grade
                            }}
                        </text>
                    </view>
                    <view class="metric-value">
                        <text class="metric-value-big">{{ detailData.keratinocytes_score_map.score?.toFixed(2) }}</text>
                        <text class="metric-value-unit">%</text>
                    </view>
                    <view class="metric-indicator">
                        <image
                            v-if="activeMetric === 'Keratin'"
                            src="/static/icons/up.svg"
                            class="indicator-icon"
                            mode="aspectFit"
                        />
                        <image v-else src="/static/icons/down.svg" class="indicator-icon" mode="aspectFit" />
                    </view>
                </view>
                <view
                    class="hair-metric-item"
                    @tap="toggleMetricDetail('Hair Density')"
                    :style="{ backgroundColor: metricBackgroundColors['Hair Density'] }"
                    :class="{ active: activeMetric === 'Hair Density' }"
                >
                    <view class="metric-header">
                        <text class="metric-title">Hair Density</text>
                        <text class="metric-grade">
                            {{
                                gradeMap[detailData.hair_density_score_map.grade] ||
                                detailData.hair_density_score_map.grade
                            }}
                        </text>
                    </view>
                    <view class="metric-value">
                        <text class="metric-value-big">{{ detailData.hair_density_score_map.score?.toFixed(2) }}</text>
                        <text class="metric-value-unit">fu/cm²</text>
                    </view>
                    <view class="metric-indicator">
                        <image
                            v-if="activeMetric === 'Hair Density'"
                            src="/static/icons/up.svg"
                            class="indicator-icon"
                            mode="aspectFit"
                        />
                        <image v-else src="/static/icons/down.svg" class="indicator-icon" mode="aspectFit" />
                    </view>
                </view>
                <view
                    class="hair-metric-item"
                    @tap="toggleMetricDetail('Hair Thickness')"
                    :style="{ backgroundColor: metricBackgroundColors['Hair Thickness'] }"
                    :class="{ active: activeMetric === 'Hair Thickness' }"
                >
                    <view class="metric-header">
                        <text class="metric-title">Hair Thickness</text>
                        <text class="metric-grade">
                            {{
                                gradeMap[detailData.hair_max_rad_score_map.grade] ||
                                detailData.hair_max_rad_score_map.grade
                            }}
                        </text>
                    </view>
                    <view class="metric-value">
                        <text class="metric-value-big">{{ detailData.hair_max_rad_score_map.score?.toFixed(2) }}</text>
                        <text class="metric-value-unit">μm</text>
                    </view>
                    <view class="metric-indicator">
                        <image
                            v-if="activeMetric === 'Hair Thickness'"
                            src="/static/icons/up.svg"
                            class="indicator-icon"
                            mode="aspectFit"
                        />
                        <image v-else src="/static/icons/down.svg" class="indicator-icon" mode="aspectFit" />
                    </view>
                </view>
            </view>

            <!-- 指标详细数据 -->
            <view class="detail-data" v-if="activeMetric === 'Keratin'">
                <DetailChart :metric="'Keratin'" :value="detailData.keratinocytes_score_map.score" />

                <view class="detail-description">
                    <text class="detail-info"
                        >Scalp keratin refers to the cuticle formed on the surface of the scalp. The stratum corneum is
                        formed by the gradual falloff and accumulation of keratinocytes, which plays a role in
                        protecting the scalp.</text
                    >
                </view>

                <view class="svg-chart">
                    <svg
                        :width="chartWidth"
                        :height="chartHeight"
                        viewBox="0 0 300 150"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            v-for="i in 3"
                            :key="'h-' + i"
                            :x1="chartPadding"
                            :x2="chartWidth - chartPadding"
                            :y1="(chartHeight / 4) * i"
                            :y2="(chartHeight / 4) * i"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <!-- 纵向虚线：5列 -->
                        <line
                            v-for="i in 5"
                            :key="'v-' + i"
                            :x1="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :x2="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :y1="chartPadding"
                            :y2="chartHeight - chartPadding"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <polygon :points="fillPoints" fill="rgba(231, 248, 163, 0.6)" />

                        <polyline :points="linePoints" fill="none" stroke="#a855f7" stroke-width="2" />

                        <circle
                            v-for="(p, i) in pointCoords"
                            :key="'c-' + i"
                            :cx="p.x"
                            :cy="p.y"
                            r="4"
                            fill="#a855f7"
                        />
                    </svg>
                </view>

                <!-- 显微图像 -->
                <view class="microscope-images">
                    <scroll-view class="images-scroll" scroll-x show-scrollbar="false">
                        <view class="image-item" v-for="(url, index) in imageUrls" :key="index">
                            <image :src="url" mode="aspectFill" @tap="previewImage(url)" />
                        </view>
                    </scroll-view>
                </view>
            </view>

            <view class="detail-data" v-if="activeMetric === 'Hair Density'">
                <DetailChart :metric="'Hair Density'" :value="detailData.hair_density_score_map.score" />

                <view class="detail-description">
                    <text class="detail-info"
                        >Hair density refers to the amount of hair per unit area of the head, usually measured in units per square centimeter, affected by genetic, age, health status and other environmental factors.</text
                    >
                </view>

                <view class="svg-chart">
                    <svg
                        :width="chartWidth"
                        :height="chartHeight"
                        viewBox="0 0 300 150"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            v-for="i in 3"
                            :key="'h-' + i"
                            :x1="chartPadding"
                            :x2="chartWidth - chartPadding"
                            :y1="(chartHeight / 4) * i"
                            :y2="(chartHeight / 4) * i"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <!-- 纵向虚线：5列 -->
                        <line
                            v-for="i in 5"
                            :key="'v-' + i"
                            :x1="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :x2="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :y1="chartPadding"
                            :y2="chartHeight - chartPadding"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <polygon :points="fillPoints" fill="rgba(231, 248, 163, 0.6)" />

                        <polyline :points="linePoints" fill="none" stroke="#a855f7" stroke-width="2" />

                        <circle
                            v-for="(p, i) in pointCoords"
                            :key="'c-' + i"
                            :cx="p.x"
                            :cy="p.y"
                            r="4"
                            fill="#a855f7"
                        />
                    </svg>
                </view>

                <!-- 显微图像 -->
                <view class="microscope-images">
                    <scroll-view class="images-scroll" scroll-x show-scrollbar="false">
                        <view class="image-item" v-for="(url, index) in imageUrls" :key="index">
                            <image :src="url" mode="aspectFill" @tap="previewImage(url)" />
                        </view>
                    </scroll-view>
                </view>
            </view>

            <view class="detail-data" v-if="activeMetric === 'Hair Thickness'">
                <DetailChart :metric="'Hair Thickness'" :value="detailData.hair_max_rad_score_map.score" />

                <view class="detail-description">
                    <text class="detail-info"
                        >The diameter of hair can be affected by factors such as heredity, age, gender, hormone levels
                        and health.</text
                    >
                </view>

                <view class="svg-chart">
                    <svg
                        :width="chartWidth"
                        :height="chartHeight"
                        viewBox="0 0 300 150"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            v-for="i in 3"
                            :key="'h-' + i"
                            :x1="chartPadding"
                            :x2="chartWidth - chartPadding"
                            :y1="(chartHeight / 4) * i"
                            :y2="(chartHeight / 4) * i"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <!-- 纵向虚线：5列 -->
                        <line
                            v-for="i in 5"
                            :key="'v-' + i"
                            :x1="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :x2="chartPadding + (i - 1) * ((chartWidth - chartPadding * 2) / 4)"
                            :y1="chartPadding"
                            :y2="chartHeight - chartPadding"
                            stroke="#ccc"
                            stroke-dasharray="4,4"
                        />

                        <polygon :points="fillPoints" fill="rgba(231, 248, 163, 0.6)" />

                        <polyline :points="linePoints" fill="none" stroke="#a855f7" stroke-width="2" />

                        <circle
                            v-for="(p, i) in pointCoords"
                            :key="'c-' + i"
                            :cx="p.x"
                            :cy="p.y"
                            r="4"
                            fill="#a855f7"
                        />
                    </svg>
                </view>

                <!-- 显微图像 -->
                <view class="microscope-images">
                    <scroll-view class="images-scroll" scroll-x show-scrollbar="false">
                        <view class="image-item" v-for="(url, index) in imageUrls" :key="index">
                            <image :src="url" mode="aspectFill" @tap="previewImage(url)" />
                        </view>
                    </scroll-view>
                </view>
            </view>
        </view>
    </view>
</template>

<style lang="less" scoped>
.root {
    .details-card {
        background-color: #f9fafb;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 30px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        .hair-metrics {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .hair-metric-item {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            width: 32%;
            height: 140px;
            background-color: #f9fafb;
            border-radius: 10px;
            padding: 0px 4px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
            cursor: pointer;
            transition: all 0.3s ease;

            .metric-header {
                display: flex;
                flex: 1;
                justify-content: space-between;
                align-items: center;
                overflow: hidden;
                .metric-title {
                    font-size: 15px;
                    font-weight: 500;
                    text-align: left;
                }

                .metric-grade {
                    font-size: 8px;
                    font-weight: 500;
                    background-color: rgba(139, 92, 246, 0.1);
                    padding: 2px 4px;
                    white-space: nowrap;
                }
            }

            .metric-value {
                display: flex;
                flex: 1;
                justify-content: center;
                align-items: center;
                .metric-value-big {
                    font-size: 30px;
                    font-weight: 700;
                    margin-right: 2px;
                    color: #333;
                }

                .metric-value-unit {
                    font-size: 12px;
                    color: #666;
                }
            }

            .metric-indicator {
                display: flex;
                flex: 1;
                justify-content: center;
                align-items: center;
                .indicator-icon {
                    width: 16px;
                    height: 16px;
                }
                .indicator-arrow {
                    color: #999;
                    transition: all 0.3s ease;
                }
            }
            .hair-metric-item:has(+ .detail-data) .indicator-arrow,
            .hair-metric-item:has(~ .detail-data) .indicator-arrow {
                color: #8b5cf6;
                transform: rotate(180deg);
            }

            &.active {
                transform: scale(0.98);
                .metric-title,
                .metric-grade,
                .metric-value-big,
                .metric-value-unit,
                .indicator-arrow {
                    color: #fff !important;
                }

                .metric-grade {
                    background-color: rgba(255, 255, 255, 0.2);
                }
            }
        }
        .detail-data {
            display: flex;
            flex-direction: column;
            padding: 20px;
            display: flex;
            align-items: center;
            background-color: #fff;
            animation: slideDown 0.3s ease-out;
            .detail-value {
                min-width: 110px;
                .detail-value-big {
                    font-size: 32px;
                    font-weight: 700;
                    color: #8b5cf6;
                }
                .detail-value-unit {
                    font-size: 14px;
                    color: #666;
                }
            }
            .detail-chart {
                flex: 1;
                height: 60px;
            }
            .detail-description {
                padding: 20px;
                background-color: #fff;
                .detail-info {
                    font-size: 14px;
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }
            }
            .svg-chart {
                width: 100%;
                margin: 16px 0;
                overflow: hidden;
            }
            .microscope-images {
                .microscope-title {
                    font-size: 16px;
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 16px;
                    display: block;
                }
                .images-scroll {
                    white-space: nowrap;
                    padding-bottom: 10px;
                    .image-item {
                        display: inline-block;
                        width: 140px;
                        height: 100px;
                        margin-right: 12px;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    .image-item image {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                }
            }
        }
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
}
</style>
