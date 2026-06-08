<template>
  <view class="language-settings-container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="navbar-title">{{ $t('language.title') }}</text>
    </view>
    
    <!-- 语言选择列表 -->
    <view class="language-list">
      <view
        v-for="lang in languages"
        :key="lang.code"
        class="language-item"
        :class="{ active: selectedLanguage === lang.code }"
        @tap="selectLanguage(lang.code)"
      >
        <view class="language-content">
          <text class="language-name">{{ lang.nativeName }}</text>
          <text class="language-subtitle">{{ lang.englishName }}</text>
        </view>
        <TablerIcon v-if="selectedLanguage === lang.code" name="check" :size="18" class="check-icon" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { setLocale, getLocale } from '@/i18n.js';

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveLanguageChangeFromApp?: Function
};

const { t } = useI18n();
const selectedLanguage = ref('');

const languages = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'zh-Hans', nativeName: '简体中文', englishName: 'Chinese (Simplified)' },
  { code: 'zh-Hant-TW', nativeName: '繁體中文', englishName: 'Chinese (Traditional)' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
];

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 选择语言
const selectLanguage = (locale: string) => {
  selectedLanguage.value = locale;
  
  // 立即切换语言
  setLocale(locale);
  
  // 显示切换提示
  uni.showToast({
    title: t('language.languageUpdated'),
    icon: 'none',
    duration: 1500
  });
  
  // 通知App语言变更
  notifyLanguageChange(locale);
  
  // 延迟后返回上一页
  setTimeout(() => {
    uni.navigateBack({
      delta: 1
    });
  }, 1500);
};

// 通知App语言变更的方法
const notifyLanguageChange = (locale: string) => {
  try {
    // 发出uni-app事件
    uni.$emit('languageChanged', locale);
    
    // 如果在App环境中，调用原生方法
    // @ts-ignore
    if (typeof uni.getSystemInfoSync !== 'undefined') {
      const systemInfo = uni.getSystemInfoSync();
      if (systemInfo.platform !== 'devtools') {
        // 尝试调用原生方法
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.languageChange) {
          window.webkit.messageHandlers.languageChange.postMessage({ locale });
        } else if (window.android && window.android.onLanguageChange) {
          window.android.onLanguageChange(locale);
        }
      }
    }
    
    console.log('Language change notified:', locale);
  } catch (error) {
    console.error('Failed to notify language change:', error);
  }
};

onMounted(() => {
  // 页面加载时获取当前语言
  selectedLanguage.value = getLocale();
});
</script>

<style>
.language-settings-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 导航栏样式 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.back-button {
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back-icon {
  font-size: 20px;
  color: #333;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-right: 36px; /* 与返回按钮对称 */
}

/* 语言选择列表 */
.language-list {
  margin-top: 20px;
  margin-left: 16px;
  margin-right: 16px;
}

.language-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #fff;
  margin-bottom: 12px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.language-item:last-child {
  margin-bottom: 0;
}

.language-item.active {
  background-color: #f8f2ff;
  border: 2px solid #8b5cf6;
  border-radius: 12px;
  margin-bottom: 12px;
}

.language-item.active:last-child {
  margin-bottom: 0;
}

.language-content {
  display: flex;
  flex-direction: column;
}

.language-name {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  margin-bottom: 2px;
}

.language-subtitle {
  font-size: 14px;
  color: #999;
}

.check-icon {
  color: #8b5cf6;
  font-size: 20px;
  font-weight: bold;
}
</style> 