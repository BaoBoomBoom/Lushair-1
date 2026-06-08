<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import UserRootLayout from '@/components/layout/UserRootLayout.vue';
import { useStatusBar } from '@/composables/useStatusBar';
import { goBackOrHome, goHome } from '@/composables/useAppNavigation';

defineProps<{
    title: string;
}>();

const { t } = useI18n();
const { headerPaddingStyle, contentMarginStyle } = useStatusBar();

const goBack = () => {
    goBackOrHome();
};
</script>

<template>
    <UserRootLayout>
        <view class="account-sub-page">
            <view class="account-sub-topbar" :style="headerPaddingStyle(8)">
                <view class="account-sub-back" @tap="goBack"><text>‹</text></view>
                <text class="account-sub-title">{{ title }}</text>
                <view class="account-sub-home" @tap="goHome">
                    <text>{{ t('tabbar.home') }}</text>
                </view>
            </view>

            <view class="account-sub-body" :style="contentMarginStyle(0)">
                <slot />
            </view>

            <view v-if="$slots.footer" class="account-sub-footer">
                <slot name="footer" />
            </view>
        </view>
    </UserRootLayout>
</template>

<style lang="scss">
@import '@/styles/app-shell.scss';
</style>
