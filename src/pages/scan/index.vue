<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { runScanAction, type ScanActionType } from '@/composables/useScanActions';

// 引入及初始化页面滚动控制逻辑
// Import and initialize page scrolling control logic
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight } = useStatusBar();
const disableScroll = ref(false);

const checkScroll = () => {
    // 延迟以等待组件渲染完成
    // Delay to wait for component rendering to complete
    setTimeout(() => {
        const query = uni.createSelectorQuery();
        query.select('.scan-shell').boundingClientRect();
        query.select('.shell-promo').boundingClientRect();
        query.select('.app-shell-header').boundingClientRect();
        query.exec((res) => {
            const scanShell = res[0];
            const promo = res[1];
            const header = res[2];
            
            const scanHeight = scanShell ? scanShell.height : 0;
            const promoHeight = promo ? promo.height : 0;
            const headerHeight = header ? header.height : 0;
            
            // 总页面内容高度 = 状态栏高度 + 广告条高度 + 头部高度 + 扫描页面内容高度
            // Total page content height = status bar height + promo height + header height + scan content height
            const totalPageHeight = statusBarHeight + promoHeight + headerHeight + scanHeight;
            const sysInfo = uni.getSystemInfoSync();
            const windowHeight = sysInfo.windowHeight;
            
            // 当屏幕可用高度大于等于页面内容总高度时，禁止上下滑动
            // When window height >= total content height, disable scrolling
            disableScroll.value = windowHeight >= totalPageHeight;
            console.log('[Scan Page Scroll Control]', {
                windowHeight,
                totalPageHeight,
                disableScroll: disableScroll.value
            });
        });
    }, 150);
};

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
    // 重新计算滚动限制
    // Recalculate scrolling limit
    checkScroll();
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

onMounted(() => {
    checkScroll();
});

onShow(() => {
    checkScroll();
});
</script>

<template>
    <page-meta :page-style="disableScroll ? 'overflow: hidden; height: 100vh;' : ''" />
    <MainTabLayout>
        <view class="scan-shell">
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
