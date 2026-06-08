<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGlobalStore } from '@/stores/globalStore';
import { getLocale, setLocale } from '@/i18n.js';

const { t } = useI18n();
const userStore = useUserStore();
const globalStore = useGlobalStore();
const { userInfo } = userStore;

// 加载状态
const isLoading = ref(false);
const loadingText = ref('');

const goToIntro = () => {
    uni.navigateTo({
        url: '/pages/landing/intro',
    });
};

// 首次启动检查和自动跳转逻辑
onMounted(() => {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    // @ts-ignore
    const options = currentPage.$page?.options || {};
    if (options.language) {
        setLocale(options.language);
    }
    if (options.userId) {
        userStore.initUserInfo();
        userInfo.userId = options.userId;
        userStore.fetchUserInfo(options.userId);
        uni.switchTab({
            url: '/pages/index/home',
            success: () => {
                // 跳转成功
            },
            fail: (err) => {
                
            }
        });
    } else {
        uni.redirectTo({
            url: '/pages/landing/intro',
        });
    }
    // try {
    //     // 增强的用户状态检查
    //     const checkUserState = () => {
    //         // 检查是否是首次启动
    //         const isFirstLaunch = globalStore.getFlag('isFirstLaunch');
            
    //         if (isFirstLaunch) {
    //             // 检查是否有本地用户数据，如果有则不是真正的首次启动
    //             if (userStore.userInfo.userId) {
    //                 console.log(t('landing.detectingLocalData'));
    //                 globalStore.setFlag('isFirstLaunch', false);
    //                 globalStore.setFlag('hasCompletedOnboarding', true);
                    
    //                 // 重新检查用户状态
    //                 setTimeout(checkUserState, 100);
    //                 return;
    //             }
                
    //             // 真正的首次启动，跳转到介绍页面
    //             loadingText.value = t('landing.firstLaunch');
    //             isLoading.value = true;
                
    //             setTimeout(() => {
    //                 globalStore.setFlag('isFirstLaunch', false);
    //                 uni.redirectTo({
    //                     url: '/pages/landing/intro',
    //                     success: () => {
    //                         // 跳转成功
    //                     },
    //                     fail: (err) => {
    //                         console.error('跳转到介绍页面失败:', err);
    //                         isLoading.value = false;
    //                     }
    //                 });
    //             }, 500);
    //             return;
    //         }
            
    //         // 初始化用户信息
    //         loadingText.value = t('landing.checkingUserStatus');
    //         isLoading.value = true;
            
    //         // 先初始化用户信息
    //         userStore.initUserInfo();
            
    //         setTimeout(() => {
    //             // 检查全局userId是否有值，或者本地存储中是否有用户信息
    //             const hasValidUser = (userInfo.userId && userInfo.userId.trim() !== '');
                
    //             if (hasValidUser) {
    //                 // 有用户信息，跳转到首页
    //                 loadingText.value = t('landing.redirecting');
    //                 console.log(t('landing.userLoggedIn'));
    //                 uni.switchTab({
    //                     url: '/pages/index/home',
    //                     success: () => {
    //                         // 跳转成功
    //                     },
    //                     fail: (err) => {
    //                         console.error('跳转到首页失败:', err);
    //                         isLoading.value = false;
    //                     }
    //                 });
    //             } else {
    //                 // 没有用户信息，跳转到登录页面
    //                 loadingText.value = t('landing.redirecting');
    //                 console.log(t('landing.userNotLoggedIn'));
    //                 uni.redirectTo({
    //                     url: '/pages/auth/splash',
    //                     success: () => {
    //                         // 跳转成功
    //                     },
    //                     fail: (err) => {
    //                         console.error('跳转到登录页面失败:', err);
    //                         isLoading.value = false;
    //                     }
    //                 });
    //             }
    //         }, 500);
    //     };
        
    //     // 执行用户状态检查
    //     checkUserState();
    // } catch (error) {
    //     console.error('Landing页面初始化失败:', error);
    //     isLoading.value = false;
    // }
});
</script>

<template>
    <view class="landing-page">
        <image class="bg-image" src="@/static/images/first-bg.png" mode="aspectFill" />

        <view class="overlay" />

        <!-- 加载状态遮罩 -->
        <view v-if="isLoading" class="loading-overlay">
            <view class="loading-content">
                <view class="loading-spinner"></view>
                <text class="loading-text">{{ loadingText }}</text>
            </view>
        </view>

        <view class="content">
            <image class="logo" src="@/static/images/logo-lines.png" mode="aspectFit" />
            <image class="brand-name" src="/static/images/LUSHAIR.svg" mode="widthFix" />
            <view class="subtitle">{{ t('landing.yourPartner') }}</view>
            <wd-button class="start-button" size="large" type="primary" @click="goToIntro">
                {{ t('landing.start') }}
            </wd-button>
        </view>
    </view>
</template>

<style scoped lang="less">
.landing-page {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;

    .bg-image {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: 0;
    }

    .overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.1);
        z-index: 1;
    }

    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
    }

    .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }

    .loading-text {
        font-size: 16px;
        color: #333;
        font-weight: 500;
    }

    .content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding-bottom: 10vh;
        .logo {
            width: 200px;
            height: 200px;
            margin-bottom: 24px;
            animation: float 3s ease-in-out infinite;
        }
        .brand-name {
            width: 260px;
            margin-bottom: 12px;
        }
        .subtitle {
            font-family: Space Grotesk, Inter, sans-serif;
            font-weight: 400;
            font-style: Regular;
            font-size: 16px;
            line-height: 100%;
            letter-spacing: 0%;
            text-transform: capitalize;
        }
        .start-button {
            margin-top: 32px;
            width: 200px;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            background-color: #6b21c8;
            color: #fff;
        }
    }
}

@keyframes float {
    0% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(-6px);
    }
    100% {
        transform: translateY(0px);
    }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
