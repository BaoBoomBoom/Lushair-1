<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { runScanAction, type ScanActionType } from '@/composables/useScanActions';

const { t } = useI18n();

type ScanOptionId = 'phone' | 'lushairOne' | 'advanced';

const options: { id: ScanOptionId; labelKey: string; descKey: string }[] = [
    { id: 'phone', labelKey: 'scan.selfie', descKey: 'scan.selfieDesc' },
    { id: 'lushairOne', labelKey: 'scan.lushairOne', descKey: 'scan.lushairOneDesc' },
    { id: 'advanced', labelKey: 'scan.lushairPro', descKey: 'scan.lushairProDesc' },
];

const selected = ref<ScanOptionId>('phone');

const selectedDescKey = computed(() => {
    return options.find((option) => option.id === selected.value)?.descKey || '';
});

function selectOption(id: ScanOptionId) {
    selected.value = id;
}

function launchNativeScan(action: ScanActionType) {
    if (!runScanAction(action)) {
        uni.showToast({
            title: t('scan.nativeAppRequired'),
            icon: 'none',
        });
    }
}

function captureScan() {
    if (selected.value === 'phone') {
        runScanAction('phone');
        return;
    }

    launchNativeScan(selected.value);
}
</script>

<template>
    <MainTabLayout>
        <text class="shell-ptitle">{{ t('scan.title') }}</text>

        <view class="shell-card shell-card-compact">
            <text class="shell-label">{{ t('scan.scanType') }}</text>
            <view class="shell-scan-types">
                <view
                    v-for="opt in options"
                    :key="opt.id"
                    class="shell-scan-chip"
                    :class="{ on: selected === opt.id }"
                    @click="selectOption(opt.id)"
                >
                    {{ t(opt.labelKey) }}
                </view>
            </view>
            <text class="scan-desc">{{ t(selectedDescKey) }}</text>
        </view>

        <view class="shell-cambox">
            <image src="/static/tabbar/scan-active.svg" class="cam-icon" mode="aspectFit" />
            <text class="cam-hint">{{ t('scan.positionHint') }}</text>
        </view>

        <view class="status-row">
            <view class="shell-pill shell-pill-g pill-with-icon">
                <TablerIcon name="check" :size="11" color="#0e9e62" />
                <text>{{ t('scan.focus') }}</text>
            </view>
            <view class="shell-pill shell-pill-g pill-with-icon">
                <TablerIcon name="check" :size="11" color="#0e9e62" />
                <text>{{ t('scan.lighting') }}</text>
            </view>
            <view class="shell-pill shell-pill-w pill-with-icon">
                <TablerIcon name="x" :size="11" color="#c2610a" />
                <text>{{ t('scan.angle') }}</text>
            </view>
        </view>

        <button class="shell-btn" @click="captureScan">{{ t('scan.capture') }}</button>

        <view class="extra-actions">
            <text class="extra-link" @click="runScanAction('device')">{{ t('home.getDevice') }}</text>
        </view>
    </MainTabLayout>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.scan-desc {
    display: block;
    font-size: 12px;
    color: #8a82a0;
    margin-top: 10px;
    line-height: 1.45;
}

.cam-icon {
    width: 38px;
    height: 38px;
}

.cam-hint {
    font-size: 11px;
    color: #8a82a0;
    margin-top: 10px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
}

.status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}

.pill-with-icon {
    display: inline-flex;
    align-items: center;
    gap: 3px;
}

.extra-actions {
    margin-top: 16px;
    text-align: center;
}

.extra-link {
    font-size: 13px;
    color: #6b21c8;
    font-weight: 600;
}
</style>
