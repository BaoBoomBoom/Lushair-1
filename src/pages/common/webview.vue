<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

const src = ref('');
onLoad((query) => {
    src.value = decodeURIComponent(query?.url || '');
});

function goBack() {
    uni.navigateBack();
}
</script>

<template>
    <view class="webview-container">
        <web-view :src="src" v-if="src" />
        <cover-view class="nav-bar" @tap="goBack">
            <cover-view class="back-icon">‹</cover-view>
            <cover-view class="nav-text">Back</cover-view>
        </cover-view>
    </view>
</template>

<style lang="less" scoped>
.webview-container {
    width: 100%;
    height: 100vh;
    position: relative;
}

.nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 88rpx;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    background: rgba(255, 255, 255, 0.95);
    gap: 16rpx;
    z-index: 999;

    .back-icon {
        font-size: 48rpx;
        color: #222;
        font-weight: 300;
    }

    .nav-text {
        font-size: 32rpx;
        font-weight: 600;
        color: #222;
    }
}
</style>
