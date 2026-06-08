<script setup lang="ts">
import { defineProps, ref } from 'vue';
import UserRootLayout from '@/components/layout/UserRootLayout.vue';
import { useStatusBar } from '@/composables/useStatusBar';

// 使用状态栏高度 composable
// Use status bar height composable
const { statusBarHeight, headerPaddingStyle, contentMarginStyle } = useStatusBar();

const props = defineProps({
    title: {
        type: String,
    },
    button: {
        type: String,
        default: '',
    },
    href: {
        type: String,
        default: '',
    },
});

const onBack = () => {
    uni.navigateBack();
};

const onButtonClick = () => {
    if (props.href) {
        uni.navigateTo({ url: props.href });
    }
};
</script>

<template>
    <UserRootLayout>
        <view class="title-layout">
            <view v-if="title" class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (48 + statusBarHeight) + 'px' }">
                <view class="left" @click="onBack">
                    <wd-icon name="arrow-left" size="24" color="#6739c6" />
                </view>
                <view class="title">{{ title }}</view>
                <view class="right" v-if="button" @click="onButtonClick">
                    <text class="button-text">{{ button }}</text>
                </view>
            </view>
            <view class="content" :style="contentMarginStyle(48)">
                <slot />
            </view>
        </view>
    </UserRootLayout>
</template>

<style lang="less" scoped>
.title-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #fff;

    .nav-bar {
        flex-shrink: 0;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        /* height and padding-top are set dynamically via inline style */
        padding: 0 16px;
        background-color: #fff;
        box-shadow: 0px 2px 9px 0px #0000002e;

        .left,
        .right {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .title {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Archivo', sans-serif;
            font-size: 16px;
            font-weight: 500;
            line-height: 1.375;
            color: #000;
        }

        .button-text {
            font-family: 'Archivo', sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 16px;
            color: #6739c6;
        }
    }

    .content {
        /* margin-top is set dynamically via inline style (48px + statusBarHeight) */
        padding: 24px 16px;
        box-sizing: border-box;
    }
}
</style>
