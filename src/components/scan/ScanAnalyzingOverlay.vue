<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const props = defineProps<{
    visible: boolean;
}>();

const { t } = useI18n();

const activeStep = ref(0);
let timers: ReturnType<typeof setTimeout>[] = [];

const steps = computed(() => [
    { key: 'quality', label: t('scan.analyzingStepQuality'), doneLabel: t('scan.analyzingStepQualityDone') },
    { key: 'scalp', label: t('scan.analyzingStepScalp'), doneLabel: t('scan.analyzingStepScalpDone') },
    { key: 'density', label: t('scan.analyzingStepDensity'), doneLabel: t('scan.analyzingStepDensityActive') },
]);

const clearTimers = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
};

const startProgress = () => {
    clearTimers();
    activeStep.value = 0;
    timers.push(setTimeout(() => { activeStep.value = 1; }, 850));
    timers.push(setTimeout(() => { activeStep.value = 2; }, 1600));
};

watch(
    () => props.visible,
    (visible) => {
        if (visible) startProgress();
        else {
            clearTimers();
            activeStep.value = 0;
        }
    },
    { immediate: true },
);

onUnmounted(clearTimers);
</script>

<template>
    <view v-if="visible" class="scan-analyzing-overlay">
        <view class="scan-analyzing-inner">
            <svg class="scan-analyzing-spinner" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#E6DDF8" stroke-width="5" />
                <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="#6D28D9"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-dasharray="60 200"
                />
            </svg>
            <text class="scan-analyzing-title">{{ t('scan.analyzingTitle') }}</text>
            <text class="scan-analyzing-subtitle">{{ t('scan.analyzingSubtitle') }}</text>

            <view class="scan-analyzing-steps">
                <view
                    v-for="(step, index) in steps"
                    :key="step.key"
                    class="scan-analyzing-step"
                    :class="{ visible: index <= activeStep }"
                    :style="{ animationDelay: `${index * 0.08}s` }"
                >
                    <view
                        class="scan-analyzing-step-icon"
                        :class="{ done: index < activeStep, pending: index === activeStep }"
                    >
                        <TablerIcon v-if="index < activeStep" name="check" :size="15" color="#0F6B49" />
                        <view v-else-if="index === activeStep" class="scan-analyzing-dot" />
                    </view>
                    <text
                        class="scan-analyzing-step-label"
                        :class="{ muted: index === activeStep }"
                    >
                        {{ index < activeStep ? step.doneLabel : step.label }}
                    </text>
                </view>
            </view>

            <text class="scan-analyzing-footnote">{{ t('scan.analyzingFootnote') }}</text>
        </view>
    </view>
</template>

<style scoped lang="scss">
.scan-analyzing-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.scan-analyzing-inner {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.scan-analyzing-spinner {
    width: 56px;
    height: 56px;
    animation: scan-spin 1s linear infinite;
}

@keyframes scan-spin {
    to {
        transform: rotate(360deg);
    }
}

.scan-analyzing-title {
    margin-top: 28px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 22px;
    font-weight: 650;
    color: #16151e;
    letter-spacing: -0.02em;
}

.scan-analyzing-subtitle {
    margin-top: 9px;
    max-width: 270px;
    font-size: 13.5px;
    line-height: 1.55;
    color: #5b5a66;
}

.scan-analyzing-steps {
    width: 100%;
    margin-top: 30px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.scan-analyzing-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    background: #f7f7fa;
    border: 1px solid #ececf1;
    opacity: 0;
    transform: translateY(5px);
    animation: scan-rise 0.5s ease forwards;
}

@keyframes scan-rise {
    to {
        opacity: 1;
        transform: none;
    }
}

.scan-analyzing-step-icon {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: #eaf5f0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.pending {
        background: #f7f7fa;
    }
}

.scan-analyzing-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #e2e2e8;
    border-top-color: #6d28d9;
    animation: scan-spin 0.8s linear infinite;
}

.scan-analyzing-step-label {
    flex: 1;
    text-align: left;
    font-size: 13.5px;
    font-weight: 600;
    color: #16151e;

    &.muted {
        color: #5b5a66;
        font-weight: 500;
    }
}

.scan-analyzing-footnote {
    margin-top: 26px;
    max-width: 300px;
    font-size: 11.5px;
    line-height: 1.55;
    color: #8a8990;
}
</style>
