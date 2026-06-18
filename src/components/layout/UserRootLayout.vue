<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import { onMounted } from 'vue';

// 页面滚动锁定控制属性
// Page scroll lock control property
defineProps<{
    disableScroll?: boolean;
}>();

const userStore = useUserStore();
let alreadyRedirected = false;

onMounted(() => {
    if (!userStore.userInfo.userId && !alreadyRedirected) {
        // alreadyRedirected = true;
        // uni.reLaunch({ url: '/pages/landing/index' });
    }
});
</script>

<template>
    <view class="user-root-layout app-page" :class="{ 'disable-scroll': disableScroll }">
        <view class="content">
            <slot />
        </view>
    </view>
</template>

<style scoped>
.user-root-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: #ffffff;

    /* 
      当锁定页面滚动时，限制整体高度并确保内容自适应高度
      When page scroll is locked, limit overall height and ensure content adapts to height
    */
    &.disable-scroll {
        height: 100%;
        max-height: 100vh;
        overflow: hidden;

        .content {
            height: 100%;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
    }

    .content {
        flex: 1;
        box-sizing: border-box;
    }
    /* Hide scrollbar for Chrome/Safari/Webkit */
    ::-webkit-scrollbar {
        width: 0;
        height: 0;
        color: transparent;
    }
}
</style>
