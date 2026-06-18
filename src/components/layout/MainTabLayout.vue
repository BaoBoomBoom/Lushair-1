<script setup lang="ts">
import UserRootLayout from '@/components/layout/UserRootLayout.vue';
import AppShellHeader from '@/components/layout/AppShellHeader.vue';

// 引入状态栏高度 Composable
// Import status bar height Composable
import { useStatusBar } from '@/composables/useStatusBar';

const { statusBarHeight } = useStatusBar();

defineProps<{
    showPromo?: boolean;
    disableScroll?: boolean;
}>();
</script>

<template>
    <UserRootLayout :disable-scroll="disableScroll">
        <view class="main-tab-layout shell-page" :class="{ 'disable-scroll': disableScroll }">
            <!-- 状态栏占位，防止内容被状态栏遮挡 -->
            <!-- Status bar placeholder to prevent content from being covered by the status bar -->
            <view :style="{ height: statusBarHeight + 'px', width: '100%' }" class="status-bar-placeholder"></view>
            
            <!-- <view v-if="showPromo" class="shell-promo">
                New Customer Offer · Use Code LUSHAIR for 5% Off
            </view> -->
            <AppShellHeader />
            <view class="shell-body">
                <slot />
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
