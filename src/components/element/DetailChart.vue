<template>
    <view class="detail-chart-wrapper">
        <view class="chart-labels">
            <text v-if="hasLow">Low</text>
            <text>Normal</text>
            <text>High</text>
        </view>

        <view class="chart-bars">
            <view
                v-for="(color, index) in config.colors"
                :key="index"
                class="bar"
                :style="{ backgroundColor: color, width: segmentWidth + '%' }"
            />
            <view class="indicator" :style="{ left: indicatorLeft + '%' }" />
        </view>

        <view class="chart-values">
            <text v-if="hasLow" class="value" :style="{ left: segmentWidth + '%' }">
                {{ formatValue(config.break1) }}
            </text>
            <text class="value" :style="{ left: (hasLow ? segmentWidth * 2 : 50) + '%' }">
                {{ formatValue(config.break2) }}
            </text>
        </view>
    </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { chartConfigs } from '../../utils/detailChartConfig';

const props = defineProps<{
    metric: keyof typeof chartConfigs;
    value: number;
}>();

const config = computed(() => chartConfigs[props.metric]);

const hasLow = computed(() => config.value.colors.length === 3);
const segmentWidth = computed(() => (hasLow.value ? 32 : 50));

const formatValue = (val: number) => {
    return config.value.unit === '%' ? `${(val * 100).toFixed(0)}%` : `${val}${config.value.unit}`;
};

const indicatorLeft = computed(() => {
    const { break1, break2, colors } = config.value;
    const v = props.value;
    const segment = colors.length;

    if (segment === 2) {
        if (v < break2) {
            return ((v - break1) / (break2 - break1)) * 50;
        } else {
            return ((v - break2) / (break2 - break1)) * 50 + 50;
        }
    } else {
        if (v < break1) {
            return 0;
        } else if (v < break2) {
            return ((v - break1) / (break2 - break1)) * 32 + 32;
        } else {
            return ((v - break2) / (break2 - break1)) * 32 + 64;
        }
    }
});
</script>

<style scoped lang="less">
.detail-chart-wrapper {
    width: 100%;
    margin-top: 12px;

    .chart-labels {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
    }

    .chart-bars {
        display: flex;
        justify-content: space-between;
        position: relative;
        height: 10px;
        margin-bottom: 4px;
        gap: 2px;

        .bar {
            height: 100%;
            border-radius: 5px;
        }

        .indicator {
            position: absolute;
            top: -2px;
            width: 15px;
            height: 15px;
            background-color: #fff;
            border: 2px solid #5024af;
            border-radius: 50%;
            transform: translateX(-50%);
        }
    }

    .chart-values {
        position: relative;
        height: 16px;
        margin-top: 2px;

        .value {
            position: absolute;
            transform: translateX(-50%);
            font-size: 12px;
            color: #666;
        }
    }
}
</style>
