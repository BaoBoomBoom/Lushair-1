<script setup lang="ts">
import UserRootLayout from '@/components/layout/UserRootLayout.vue';
import AppShellHeader from '@/components/layout/AppShellHeader.vue';

defineProps<{
    showPromo?: boolean;
}>();
</script>

<template>
    <UserRootLayout>
        <view class="main-tab-layout shell-page">
            <view v-if="showPromo" class="shell-promo">
                New Customer Offer · Use Code LUSHAIR for 5% Off
            </view>
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
