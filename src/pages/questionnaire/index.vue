<template>
  <view class="questionnaire-page">
    <view class="questionnaire-topbar" :style="headerPaddingStyle(0)">
      <view class="questionnaire-back" @tap="goBack">
        <TablerIcon name="chevron-left" :size="20" color="#1A1228" />
      </view>
      <text class="questionnaire-topbar-title">{{ $t('pages.questionnaire') }}</text>
      <view class="questionnaire-topbar-spacer" />
    </view>

    <view class="questionnaire-body" :style="contentMarginStyle(48)">
      <view class="shell-card questionnaire-intro-card">
        <text class="questionnaire-kicker">{{ $t('questionnaire.introKicker') }}</text>
        <text class="questionnaire-intro-line">{{ $t('questionnaire.introLine1') }}</text>
        <text class="questionnaire-intro-line">{{ $t('questionnaire.introLine2') }}</text>
        <text class="questionnaire-intro-line muted">{{ $t('questionnaire.introLine3') }}</text>
      </view>

      <button class="questionnaire-primary-btn" @tap="startQuestionnaire">
        {{ $t('questionnaire.startButton') }}
      </button>
    </view>

    <ShellDisclaimer compact />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../../stores/userStore';
import env from '@/utils/env';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ShellDisclaimer from '@/components/layout/ShellDisclaimer.vue';
import { useStatusBar } from '@/composables/useStatusBar';

declare var window: Window & {
  webkit: any;
  android: any;
  receiveUserIdFromApp: Function;
  changeTabToChat: Function;
};

const userStore = useUserStore();
const { userInfo } = userStore;
const { t } = useI18n();
const { headerPaddingStyle, contentMarginStyle } = useStatusBar();

const stageParam = ref('1');
const positionParam = ref('前额');
const patternParam = ref('0');
const imageParam = ref('');
const anglesParam = ref(''); // 存储原始图片 angles 数据

const goBack = () => {
  uni.navigateBack({ delta: 1 });
};

const startQuestionnaire = () => {
  try {
    uni.removeStorageSync('questionnaire_results');
  } catch (e) {
    console.error('Failed to clear questionnaire cache:', e);
  }

  uni.navigateTo({
    url: `/pages/questionnaire/question?id=1&stage=${stageParam.value}&position=${positionParam.value}&pattern=${patternParam.value}&image=${encodeURIComponent(imageParam.value)}&angles=${anglesParam.value}`,
  });
};

const requestUserIdFromApp = () => {
  try {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document);
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;

    if (isiOS && window.webkit?.messageHandlers) {
      window.webkit.messageHandlers.getUserId.postMessage({ action: 'getUserId' });
    } else if (isAndroid && window.android) {
      const userIdFromAndroid = window.android.getUserId();
      if (userIdFromAndroid) {
        window.receiveUserIdFromApp(userIdFromAndroid);
      }
    } else if (env.isDevelopment()) {
      // H5环境：支持通过URL参数设置开发测试账号 ?devUserId=xxx
      const urlParams = new URLSearchParams(window.location.search);
      const devUserId = urlParams.get('devUserId');
      if (devUserId) {
        userInfo.userId = devUserId;
        window.receiveUserIdFromApp(devUserId);
      }
    }
  } catch (error) {
    console.error('requestUserIdFromApp failed:', error);
    if (env.isDevelopment()) {
      const urlParams = new URLSearchParams(window.location.search);
      const devUserId = urlParams.get('devUserId');
      if (devUserId) {
        userInfo.userId = devUserId;
        window.receiveUserIdFromApp(devUserId);
      }
    }
  }
};

window.receiveUserIdFromApp = function (userIdString: string) {
  try {
    userInfo.userId = userIdString;
    userStore.fetchUserInfo(userIdString);
  } catch (error) {
    console.error('receiveUserIdFromApp failed:', error);
  }
};

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const options = currentPage.$page?.options || {};

  if (options.stage) stageParam.value = options.stage;
  if (options.position) positionParam.value = options.position;
  if (options.pattern) patternParam.value = options.pattern;
  if (options.image) imageParam.value = options.image;
  if (options.angles) anglesParam.value = options.angles; // 接收 angles 参数

  if (!userInfo.userId?.trim()) {
    requestUserIdFromApp();
  }

  const profile = userStore.userInfo;
  const hasDemographics = !!(profile?.gender && (profile?.age || profile?.dob));
  if (options.from === 'trichoscan' && hasDemographics) {
    startQuestionnaire();
  }
});
</script>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.questionnaire-page {
  min-height: 100vh;
  background: $shell-bg2;
  box-sizing: border-box;
}

.questionnaire-topbar {
  display: flex;
  align-items: center;
  padding: 0 16px 12px;
  background: $shell-bg2;
}

.questionnaire-back,
.questionnaire-topbar-spacer {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.questionnaire-topbar-title {
  flex: 1;
  text-align: center;
  font-family: $shell-font-display;
  font-size: 15px;
  font-weight: 600;
  color: $shell-text;
}

.questionnaire-body {
  padding: 8px 16px 24px;
}

.questionnaire-intro-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: questionnaire-fade-in 0.4s ease;
}

.questionnaire-kicker {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: $shell-primary;
}

.questionnaire-intro-line {
  font-size: 15px;
  line-height: 1.55;
  color: $shell-text;

  &.muted {
    color: $shell-muted;
    font-size: 13px;
  }
}

.questionnaire-primary-btn {
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: $shell-primary;
  color: #fff;
  font-family: $shell-font-display;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;

  &::after {
    border: none;
  }
}

@keyframes questionnaire-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
