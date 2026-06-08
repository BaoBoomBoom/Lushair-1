<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { onLoad } from '@dcloudio/uni-app';
import { ref, onMounted } from 'vue';
import lottie from 'lottie-web';
import splashData from '@/static/icons/splash.json';
import { navigateAuthPage } from '@/composables/useAuthFlow';

const { t } = useI18n();
const pushType = ref('0');

onLoad((options) => {
  pushType.value = options?.pushType === '1' ? '1' : '0';
});

const goBack = () => {
  uni.navigateBack();
};

const continueWithEmail = () => {
    if (pushType.value === '1') {
        navigateAuthPage('/pages/auth/register-email-first', '1');
    } else {
        navigateAuthPage('/pages/auth/login-email-first', '0');
    }
};

const continueWithPhone = () => {
    if (pushType.value === '1') {
        navigateAuthPage('/pages/auth/register-phone-first', '1');
    } else {
        navigateAuthPage('/pages/auth/login-phone-first', '0');
    }
};

const initLottieAnimation = () => {
  setTimeout(() => {
    const container = document.getElementById('lottie-container');
    if (container) {
      lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: splashData
      });
    }
  }, 100);
};

onMounted(() => {
  initLottieAnimation();
});
</script>

<template>
  <view class="splash-container auth-flow-page">
    <view class="auth-content splash-layout">
      <view class="auth-back" @click="goBack">
        <image src="@/static/icons/arrow_back.svg" class="auth-back__icon" />
        <text class="auth-back__text">{{ t('common.back') }}</text>
      </view>

      <view class="auth-header splash-header">
        <text class="auth-title">{{ t('auth.splash.title') }}</text>
        <text class="auth-subtitle">{{ t('auth.splash.subtitle') }}</text>
      </view>

      <view class="image-section">
        <view class="placeholder-image">
          <div id="lottie-container" class="main-image"></div>
        </view>
      </view>

      <view class="auth-actions splash-actions">
        <button class="auth-btn-primary" @click="continueWithEmail">
          <image src="@/static/icons/mail.svg" class="btn-icon" />
          <text>{{ t('auth.splash.continueWithEmail') }}</text>
        </button>

        <button class="auth-btn-secondary" @click="continueWithPhone">
          <image src="@/static/icons/phone.svg" class="btn-icon btn-icon--tint" />
          <text>{{ t('auth.splash.continueWithPhone') }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.splash-container {
  width: 100%;
  min-height: 100vh;
  background: #ffffff;
  overflow: hidden;
}

.splash-layout {
  min-height: 100vh;
}

.splash-header {
  margin-top: 8px;
  margin-bottom: 24px;
}

.image-section {
  flex: 1;
  position: relative;
  margin-top: 8px;
  min-height: 280px;
  max-height: 360px;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  overflow: hidden;
}

.main-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  display: block;
}

.splash-actions {
  margin-top: auto;
  padding-bottom: 40px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.btn-icon--tint {
  filter: brightness(0) saturate(100%) invert(32%) sepia(89%) saturate(1942%) hue-rotate(243deg)
    brightness(92%) contrast(95%);
}
</style>
