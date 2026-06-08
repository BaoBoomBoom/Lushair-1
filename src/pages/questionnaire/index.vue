<template>
  <view class="questionnaire-container">
    <view class="header" :style="headerPaddingStyle(15)">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="header-title">{{ $t('pages.questionnaire') }}</text>
    </view>
    
    <view class="content">
      <view class="intro-text">
        <view class="typewriter">
          <text>{{ $t('questionnaire.introLine1') }}</text>
          <text>{{ $t('questionnaire.introLine2') }}</text>
          <text>{{ $t('questionnaire.introLine3') }}</text>
        </view>
      </view>
      
      <view class="start-button" @tap="startQuestionnaire">
        <text>{{ $t('questionnaire.startButton') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../../stores/userStore';
import env from '@/utils/env';

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function,
  changeTabToChat: Function
};

const userStore = useUserStore();
const { userInfo } = userStore;
const { t } = useI18n();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 存储从App获取的参数
const stageParam = ref('1');
const positionParam = ref('前额');
const imageParam = ref('');

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 开始问卷
const startQuestionnaire = () => {
  try {
    // 清除之前的问卷缓存，确保开始全新的问卷
    uni.removeStorageSync('questionnaire_results');
    console.log('清除了之前的问卷缓存');
  } catch (e) {
    console.error('清除缓存失败:', e);
  }
  
  // 跳转到第一个问题，并传递stage、position和image参数
  uni.navigateTo({
    url: `/pages/questionnaire/question?id=1&stage=${stageParam.value}&position=${positionParam.value}&image=${encodeURIComponent(imageParam.value)}`
  });
};

// 请求App传递userId
const requestUserIdFromApp = () => {
  try {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document); // iOS终端
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; // Android终端
    
    if (isiOS && window.webkit && window.webkit.messageHandlers) {
      window.webkit.messageHandlers.getUserId.postMessage({action: 'getUserId'});
      console.log('向iOS App发送获取userId请求');
    } else if (isAndroid && window.android) {
      const userIdFromAndroid = window.android.getUserId();
      console.log('从Android App直接获取userId:', userIdFromAndroid);
      
      if (userIdFromAndroid) {
        window.receiveUserIdFromApp(userIdFromAndroid);
      }
    } else {
      // lusHair32685064 lusHair9cf6a4f9
      console.log('未检测到原生环境，使用模拟userId');
      const isDev = env.isDevelopment(); 
      if (isDev) {
        userInfo.userId = 'lusHair32685064';
        window.receiveUserIdFromApp('lusHair32685064');
      }
    }
  } catch (error) {
    console.error('请求App userId时出错:', error);
    const isDev = env.isDevelopment(); 
    if (isDev) {
      userInfo.userId = 'lusHair32685064';
      window.receiveUserIdFromApp('lusHair32685064');
    }
  }
};

// 从原生App接收userId的方法
window.receiveUserIdFromApp = function(userIdString: string) {
  try {
    console.log('从App接收到userId:', userIdString);
    userInfo.userId = userIdString;
    userStore.fetchUserInfo(userIdString);
  } catch (error) {
    console.error('处理App传来的userId失败:', error);
  }
};

onMounted(() => {
  // 页面挂载时的逻辑
  // 获取App传递的参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const options = currentPage.$page?.options || {};
  console.log('options', options);
  
  // 获取stage、position和image参数，如果不存在则使用默认值
  if (options.stage) {
    stageParam.value = options.stage;
  }
  
  if (options.position) {
    positionParam.value = options.position;
  }
  
  if (options.image) {
    imageParam.value = options.image;
  }
  // 完善用户ID判断逻辑，确保不为空且有效
  if (!userInfo.userId || userInfo.userId === '' || userInfo.userId === null || userInfo.userId === undefined || userInfo.userId.trim() === '') {
    console.log('用户ID无效，请求用户ID:', userInfo.userId);
    requestUserIdFromApp();
  } else {
    console.log('用户ID有效:', userInfo.userId);
  }
  
  console.log('获取到的参数：', { 
    stage: stageParam.value, 
    position: positionParam.value,
    image: imageParam.value
  });
});
</script>

<style>
.questionnaire-container {
  min-height: 100vh;
  background-color: #fff;
  padding-bottom: 30px;
}

.header {
  display: flex;
  padding: 15px; /* padding-top is set dynamically via inline style (15px + statusBarHeight) */
  padding-top: 0; /* overridden by inline style */
  align-items: center;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.back-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 20px;
  color: #333;
}

.header-title {
  flex: 1;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-right: 30px; /* 为了平衡左侧返回按钮的宽度 */
}

.content {
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
}

.intro-text {
  margin-bottom: 40px;
  text-align: center;
}

.typewriter {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 10px;
}

.typewriter-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.typewriter-animation text {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 10px;
  opacity: 0;
  animation: fadeIn 0.5s forwards, typing 2s steps(40, end);
}

.typewriter-animation text:nth-child(1) {
  animation-delay: 0.2s;
}

.typewriter-animation text:nth-child(2) {
  animation-delay: 1.5s;
}

.typewriter-animation text:nth-child(3) {
  animation-delay: 2.8s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes typing {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

.start-button {
  background-color: #8b5cf6;
  padding: 15px 40px;
  border-radius: 30px;
  margin-top: 30px;
  animation: pulseButton 2s infinite;
  animation-delay: 4s;
}

.start-button text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

@keyframes pulseButton {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style> 