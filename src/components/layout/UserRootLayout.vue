<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import { onMounted } from 'vue';

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
    <view class="user-root-layout app-page">
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
