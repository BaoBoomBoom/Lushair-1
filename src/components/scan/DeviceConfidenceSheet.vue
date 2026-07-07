<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import TablerIcon from '@/components/icons/TablerIcon.vue';

defineProps<{
    visible: boolean;
}>();

const emit = defineEmits<{
    close: [];
    learnMore: [];
}>();

const { t } = useI18n();
</script>

<template>
    <view v-if="visible" class="shell-bottom-sheet-mask" @tap="emit('close')">
        <view class="shell-bottom-sheet device-confidence-sheet" @tap.stop>
            <view class="shell-bottom-sheet-grab" />
            <view class="shell-bottom-sheet-head">
                <text class="shell-bottom-sheet-title">{{ t('home.deviceSheetTitle') }}</text>
                <view class="shell-bottom-sheet-close" @tap="emit('close')">
                    <TablerIcon name="x" :size="18" color="#1A1228" />
                </view>
            </view>
            <text class="shell-bottom-sheet-body">{{ t('home.deviceSheetIntro') }}</text>

            <view class="device-compare-card">
                <text class="device-compare-name">{{ t('scan.lushairOne') }}</text>
                <text class="device-compare-desc">{{ t('home.deviceSheetOneDesc') }}</text>
            </view>
            <view class="device-compare-card device-compare-card--pro">
                <text class="device-compare-name">{{ t('scan.lushairPro') }}</text>
                <text class="device-compare-desc">{{ t('home.deviceSheetProDesc') }}</text>
            </view>

            <view class="shell-device-chip-row">
                <text class="shell-device-chip">{{ t('home.deviceSheetChipCrown') }}</text>
                <text class="shell-device-chip">{{ t('home.deviceSheetChipFollicle') }}</text>
                <text class="shell-device-chip">{{ t('home.deviceSheetChipScalp') }}</text>
            </view>
            <button class="shell-btn shell-bottom-sheet-primary" @tap="emit('learnMore')">
                {{ t('home.deviceSheetLearnMore') }}
            </button>
            <button class="shell-btn shell-btn-ghost shell-bottom-sheet-secondary" @tap="emit('close')">
                {{ t('home.deviceSheetMaybeLater') }}
            </button>
        </view>
    </view>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.device-confidence-sheet {
    max-height: 88vh;
    overflow-y: auto;
}

.device-compare-card {
    padding: 14px;
    border-radius: 14px;
    border: 1px solid #e8e4f4;
    background: #faf8ff;
    margin-bottom: 10px;
}

.device-compare-card--pro {
    border-color: #d8c8ff;
    background: #f6f0ff;
}

.device-compare-name {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: #1a1228;
    margin-bottom: 6px;
}

.device-compare-desc {
    display: block;
    font-size: 12px;
    line-height: 1.55;
    color: #6b5f80;
}
</style>
