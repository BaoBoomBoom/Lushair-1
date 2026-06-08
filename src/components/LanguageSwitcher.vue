<template>
  <view class="language-switcher">
    <view 
      :class="['language-option', locale === 'zh-Hans' ? 'active' : '']" 
      @tap="switchLanguage('zh-Hans')"
    >
      中文
    </view>
    <view class="divider">|</view>
    <view 
      :class="['language-option', locale === 'en' ? 'active' : '']" 
      @tap="switchLanguage('en')"
    >
      English
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
// @ts-ignore
import { setLocale, getLocale, updateTabBarTexts } from '../i18n.js';

// 当前语言
const locale = computed(() => getLocale());

// 切换语言
const switchLanguage = (localeCode: string) => {
  setLocale(localeCode);
  // 显示切换提示
  uni.showToast({
    title: localeCode === 'zh-Hans' ? '已切换到中文' : 'Switched to English',
    icon: 'none',
    duration: 2000
  });
};

// 组件挂载时确保tabbar文本更新
onMounted(() => {
  updateTabBarTexts();
});
</script>

<style>
.language-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  margin: 0 5px;
}

.language-option {
  padding: 2px 5px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.language-option.active {
  color: #8b5cf6;
  font-weight: bold;
}

.divider {
  margin: 0 5px;
  color: #ddd;
}
</style> 