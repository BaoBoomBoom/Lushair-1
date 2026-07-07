<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import UserRootLayout from '@/components/layout/UserRootLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useStatusBar } from '@/composables/useStatusBar';
import { goBackOrHome } from '@/composables/useAppNavigation';

defineProps<{
    title: string;
    subtitle?: string;
}>();

const { headerPaddingStyle, contentMarginStyle } = useStatusBar();

const goBack = () => {
    goBackOrHome();
};
</script>

<template>
    <UserRootLayout>
        <view class="account-sub-page">
            <view class="account-sub-topbar" :style="headerPaddingStyle(0)">
                <view class="account-sub-back" @tap="goBack">
                    <TablerIcon name="chevron-left" :size="20" color="#1A1228" />
                </view>
                <text class="account-sub-title">{{ title }}</text>
                <view class="account-sub-spacer" />
            </view>

            <view
                class="account-sub-body"
                :class="{ 'account-sub-body--footer': $slots.footer }"
                :style="contentMarginStyle(48)"
            >
                <text v-if="subtitle" class="account-form-intro">{{ subtitle }}</text>
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
