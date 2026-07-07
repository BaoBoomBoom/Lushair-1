<script setup lang="ts">
import UserRootLayout from '@/components/layout/UserRootLayout.vue';
import AppShellHeader from '@/components/layout/AppShellHeader.vue';
import ShellDisclaimer from '@/components/layout/ShellDisclaimer.vue';

// 引入状态栏高度 Composable
// Import status bar height Composable
import { useStatusBar } from '@/composables/useStatusBar';

const { statusBarHeight } = useStatusBar();

defineProps<{
    showPromo?: boolean;
    disableScroll?: boolean;
    /** Keep logo header pinned while page content scrolls */
    fixedHeader?: boolean;
    /** Fill viewport height; body does not scroll (use internal scroll regions) */
    fillScreen?: boolean;
    /** Show screening disclaimer at bottom of page content */
    showDisclaimer?: boolean;
}>();
</script>

<template>
    <UserRootLayout :disable-scroll="disableScroll || fixedHeader || fillScreen">
        <view
            class="main-tab-layout shell-page"
            :class="{
                'disable-scroll': disableScroll || fillScreen,
                'fixed-header': fixedHeader,
                'fill-screen': fillScreen,
            }"
        >
            <view class="main-tab-layout__top">
                <!-- 状态栏占位，防止内容被状态栏遮挡 -->
                <!-- Status bar placeholder to prevent content from being covered by the status bar -->
                <view :style="{ height: statusBarHeight + 'px', width: '100%' }" class="status-bar-placeholder"></view>

                <!-- <view v-if="showPromo" class="shell-promo">
                    New Customer Offer · Use Code LUSHAIR for 5% Off
                </view> -->
                <AppShellHeader />
            </view>
            <view class="shell-body">
                <slot />
                <ShellDisclaimer v-if="showDisclaimer !== false" />
            </view>
        </view>
    </UserRootLayout>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.main-tab-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #ffffff;

    /* 
      当锁定页面滚动时，限制整体高度并确保子元素不溢出
      When page scroll is locked, limit overall height and ensure child elements do not overflow
    */
    &.disable-scroll {
        height: 100%;
        max-height: 100vh;
        overflow: hidden;

        .shell-body {
            height: 100%;
            min-height: 0;
        }
    }

    &.fixed-header {
        height: 100%;
        min-height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        box-sizing: border-box;

        .main-tab-layout__top {
            flex-shrink: 0;
            z-index: 100;
            background: #ffffff;
        }

        .shell-body {
            flex: 1;
            min-height: 0;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
    }

    &.fill-screen {
        height: 100%;
        min-height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        box-sizing: border-box;

        .main-tab-layout__top {
            flex-shrink: 0;
            z-index: 100;
            background: #ffffff;
        }

        .shell-body {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 0;
        }
    }

    &.fixed-header.fill-screen {
        .shell-body {
            overflow: hidden;
        }
    }
}

.main-tab-layout__top {
    width: 100%;
}

.shell-body {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-height: 0;
}
</style>
