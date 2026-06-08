<script setup lang="ts">
declare var window: Window & { changeTabToChat: Function };

import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
// @ts-ignore
import { setLocale, updateTabBarTexts } from './i18n.js';
import { useSettingsStore } from './stores/settingsStore'
import { useGlobalStore } from './stores/globalStore'
import { setupApiTracker } from './utils/globalTracker'
import { initVConsole, setupShakeToShowVConsole } from './utils/vConsoleInit';
import env from './utils/env';
import { maybeRedirectDevToOnboarding } from './composables/useDevOnboarding';

// 初始化时不要立即使用 store
let settingsStore: ReturnType<typeof useSettingsStore>
let globalStore: ReturnType<typeof useGlobalStore>

// 在应用启动时执行的操作
onLaunch(() => {
  console.log("App Launch");
  
  // 输出当前环境信息
  console.log(`当前环境: ${env.getEnvName()}`);
  
  // 初始化 VConsole (只在开发环境下启用)
  initVConsole();
  
  // 设置摇晃手势以在真机上显示/隐藏 VConsole
  // setupShakeToShowVConsole();
  
  // 初始化语言，可以根据系统语言设置默认语言
  // const systemLanguage = uni.getSystemInfoSync().language;
  // if (systemLanguage && systemLanguage.startsWith('zh')) {
  //   setLocale('zh-CN');
  // } else {
  //   setLocale('en-US');
  // }
  setLocale('en');

  maybeRedirectDevToOnboarding();

  // Register global function for App native bridge
  window.changeTabToChat = function(reportId: string) {
    try {
      if (reportId) {
        uni.setStorageSync('ai_chat_targetReportId', reportId);
        uni.removeStorageSync('ai_chat_chatId');
        uni.removeStorageSync('ai_chat_reportId');
      }
      uni.setStorageSync('ai_chat_autoStart', 'true');
      uni.switchTab({ url: '/pages/consult/new' });
    } catch (error) {
      console.error('处理App传来的数据失败:', error);
    }
  };
  
  // 延迟确保tabbar已创建并准备好
  setTimeout(() => {
    updateTabBarTexts();
    console.log("初始化时更新tabbar文字");
  }, 1000);
  
  // 监听语言变更事件  
  uni.$on('languageChanged', (locale) => {
    console.log('App接收到语言变更事件(新):', locale);
    // 确保tabbar文本及时更新
    setTimeout(() => {
      updateTabBarTexts();
    }, 100);
  });

  // 延迟初始化 store，确保 Pinia 已准备好
  setTimeout(() => {
    try {
      // 初始化 store
      settingsStore = useSettingsStore()
      globalStore = useGlobalStore()
      
      // 初始化应用设置
      settingsStore.initSettings()
      // 设置主题监听
      settingsStore.setupThemeListener()
      
      // 初始化全局状态
      globalStore.initGlobalState()
      
      // 设置 API 和网络追踪
      setupApiTracker()
      
      console.log('Store 初始化完成')
    } catch (error) {
      console.error('初始化 Store 失败:', error)
    }
  }, 100);
});

// 应用回到前台时执行
onShow(() => {
  console.log("App Show");
  // 每次显示App时更新tabbar文本
  setTimeout(() => {
    updateTabBarTexts();
    console.log("应用显示时更新tabbar文字");
  }, 200);
  
  // 开始新会话 - 确保 store 已初始化
  setTimeout(() => {
    try {
      if (globalStore) {
        globalStore.startNewSession()
      }
    } catch (error) {
      console.error('开始新会话失败:', error)
    }
  }, 200);
});

// 应用进入后台时执行
onHide(() => {
  console.log("App Hide");
  
  // 结束当前会话 - 确保 store 已初始化
  try {
    if (globalStore) {
      globalStore.endCurrentSession()
    }
  } catch (error) {
    console.error('结束当前会话失败:', error)
  }
});
</script>
<style lang="scss">
@import '@/styles/typography.scss';
@import '@/styles/auth-flow.scss';

/* 品牌 Logo 专用字体（其余 UI 使用 Inter + Space Grotesk） */
@font-face {
  font-family: 'Didot';
  src: url('/static/fonts/Didot.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}

page {
  overflow-x: hidden;
  width: 100%;
}

view,
text {
  max-width: 100%;
  word-wrap: break-word;
}

.logo {
  font-family: 'Didot', 'Times New Roman', serif !important;
  font-weight: 700;
  letter-spacing: -1px;
}

.welcome-text,
.welcome-name {
  font-size: 22px;
  font-weight: 500;
  color: #000;
}

.scan-title,
.routine-title {
  font-size: 16px;
  font-weight: 600;
  color: #6739c6;
}

.scan-points,
.routine-description {
  font-size: 14px;
  font-weight: 300;
  color: #323232;
}

.primary-button text,
.secondary-button text,
.buttons text,
.scan-buttons text {
  font-family: 'Archivo', sans-serif;
  font-size: 16px;
  font-weight: 600;
}

.buttons text,
.scan-buttons text {
  color: #fff;
}

.secondary-button text {
  color: #6739c6;
  font-size: 14px;
  font-weight: 500;
}

.highlight-number,
.score-number {
  font-weight: 600;
}
</style>
