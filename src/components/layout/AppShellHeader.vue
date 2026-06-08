<script setup lang="ts">
import ShellUserIcon from '@/components/icons/ShellUserIcon.vue';
import { goHome } from '@/composables/useAppNavigation';

const goAccount = () => {
    uni.navigateTo({ url: '/pages/account/index' });
};

const goNotifications = () => {
    uni.navigateTo({ url: '/pages/account/notifications' });
};
</script>

<template>
    <view class="app-shell-header">
        <view class="logo-wrap" @tap="goHome">
            <text class="logo">LUSHAIR</text>
        </view>
        <view class="hdr-icons">
            <view class="ibtn" @tap="goNotifications">
                <image src="/static/tabbar/notify.svg" class="icon-img" mode="aspectFit" />
            </view>
            <view class="ibtn account" @tap="goAccount">
                <ShellUserIcon variant="header" />
            </view>
        </view>
    </view>
</template>

<style scoped lang="scss">
.app-shell-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px 14px;
    border-bottom: 1px solid #e8e4f4;
    background: #ffffff;
}

.logo-wrap {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.logo {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #1a1228;
}

.hdr-icons {
    display: flex;
    gap: 13px;
    align-items: center;
}

.ibtn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-img {
    width: 20px;
    height: 20px;
}
</style>
