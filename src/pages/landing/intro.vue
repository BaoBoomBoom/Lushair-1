<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { resetDevLoginState } from '@/composables/useDevOnboarding';

const { t } = useI18n();

const activeIndex = ref(0);

const onChange = (e: { detail: { current: number } }) => {
    activeIndex.value = e.detail.current;
};

const goToRegister = () => {
    uni.navigateTo({
        url: '/pages/auth/splash?pushType=1',
        animationType: 'slide-in-right',
        animationDuration: 200,
    });
};

const goToLogin = () => {
    uni.navigateTo({
        url: '/pages/auth/splash?pushType=0',
        animationType: 'slide-in-right',
        animationDuration: 200,
    });
};

onMounted(() => {
    if (import.meta.env.DEV) {
        resetDevLoginState();
    }
});
</script>

<template>
    <view class="intro-page auth-flow-page">
        <view class="intro-top">
            <swiper class="swiper-content" :current="activeIndex" @change="onChange" circular>
                <swiper-item>
                    <view class="slide" style="background-image: url('/static/images/intro-01-bg.png')">
                        <view class="progress-bar">
                            <view
                                v-for="(_, i) in 3"
                                :key="i"
                                :class="['dot', { active: i === activeIndex }]"
                                :style="{
                                    width: i === activeIndex ? '48px' : '16px',
                                    height: i === activeIndex ? '5px' : '4px',
                                }"
                            />
                        </view>

                        <view class="device">
                            <wd-img
                                :enable-preview="true"
                                :width="400"
                                :height="400"
                                mode="aspectFill"
                                src="/static/images/lushair-device-1.png"
                            >
                                <template #error>
                                    <view class="error-wrap"></view>
                                </template>
                                <template #loading>
                                    <view class="loading-wrap">
                                        <wd-loading />
                                    </view>
                                </template>
                            </wd-img>
                        </view>

                        <view class="text-section auth-header intro-slide-header">
                            <text class="auth-title auth-title--inverse">{{ t('landing.scan') }}</text>
                            <text class="auth-subtitle auth-subtitle--inverse">{{ t('landing.cool') }}</text>
                        </view>
                    </view>
                </swiper-item>

                <swiper-item>
                    <view class="slide" style="background-image: url('/static/images/intro-02-bg.png')">
                        <view class="progress-bar">
                            <view
                                v-for="(_, i) in 3"
                                :key="i"
                                :class="['dot', { active: i === activeIndex }]"
                                :style="{
                                    width: i === activeIndex ? '48px' : '16px',
                                    height: i === activeIndex ? '5px' : '4px',
                                }"
                            />
                        </view>

                        <view class="text-section auth-header intro-slide-header">
                            <text class="auth-title auth-title--inverse">{{ t('landing.takeCare') }}</text>
                            <text class="auth-subtitle auth-subtitle--inverse">{{ t('landing.cool') }}</text>
                        </view>
                    </view>
                </swiper-item>

                <swiper-item>
                    <view class="slide" style="background-image: url('/static/images/intro-03-bg.png')">
                        <view class="progress-bar">
                            <view
                                v-for="(_, i) in 3"
                                :key="i"
                                :class="['dot', { active: i === activeIndex }]"
                                :style="{
                                    width: i === activeIndex ? '48px' : '16px',
                                    height: i === activeIndex ? '5px' : '4px',
                                }"
                            />
                        </view>

                        <view class="text-section auth-header intro-slide-header">
                            <text class="auth-title auth-title--inverse">{{ t('landing.growth') }}</text>
                            <text class="auth-subtitle auth-subtitle--inverse">{{ t('landing.cool') }}</text>
                        </view>
                    </view>
                </swiper-item>
            </swiper>
        </view>

        <view class="bottom-buttons">
            <button class="auth-btn-primary" @click="goToRegister">
                {{ t('landing.createAccount') }}
            </button>
            <text class="auth-link" @click="goToLogin">{{ t('landing.haveAccount') }}</text>
        </view>
    </view>
</template>

<style scoped lang="scss">
.intro-page {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;

    .intro-top {
        flex: 1;
        position: relative;

        .swiper-content {
            width: 100%;
            height: 100%;
        }

        .slide {
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 24px 16px;
            box-sizing: border-box;
            position: relative;

            .progress-bar {
                position: absolute;
                top: 48px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 8px;

                .dot {
                    background-color: #fff;
                    opacity: 0.4;
                    border-radius: 2px;
                    transition: all 0.3s;

                    &.active {
                        background-color: #6b21c8;
                        opacity: 1;
                    }
                }
            }

            .device {
                position: relative;
                top: 50px;
            }

            .intro-slide-header {
                margin-bottom: 15px;
            }
        }
    }

    .bottom-buttons {
        background-color: #fff;
        padding: 32px 16px 40px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: stretch;
    }
}
</style>
