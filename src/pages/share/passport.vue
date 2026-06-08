<template>
  <view class="passport-container">
    <!-- 护照风格背景 -->
    <image class="passport-bg" src="/static/images/share.png" mode="aspectFill"></image>

    <view class="back-icon" @tap="goBack">
      <text class="back-arrow">&#8592;</text>
    </view>
    
    <!-- 半透明遮罩层 -->
    <view class="overlay"></view>
    
    <!-- 护照标题 -->
    <view class="passport-title">
      <text class="title-text">MY LUSHAIR PASSPORT</text>
      <text class="subtitle-text">PASSPORT • PASS • PASAPORTE</text>
    </view>
    
    <!-- 检测日期 -->
    <view class="passport-info">
      <text class="info-label">Authority Lushair App</text>
      <text class="info-label">Date of issue {{ formatDate(new Date()) }}</text>
      <!-- <text class="info-label">Member since {{ formatDate(joinDate) }}</text> -->
    </view>
    
    <!-- 内容区域布局 -->
    <view class="content-layout">
      <!-- 分数概览 - 左侧 -->
      <view class="score-overview">
        <text class="score-title">SCORE OVERVIEW</text>
        
        <view class="score-metrics">
          <!-- 头皮健康度 -->
          <view class="metric-item">
            <view class="circular-progress">
              <view class="progress-circle">
                <view class="circle-bg"></view>
                <view class="circle-progress-bar" :style="{ 
                  background: `conic-gradient(#8b5cf6 ${getProgressDegrees(healthData.scalpHealth)}deg, transparent 0deg)`
                }"></view>
                <view class="progress-inner">
                  <text class="progress-value">{{healthData.scalpHealth}}</text>
                </view>
              </view>
            </view>
            <text class="metric-label">SCALP</text>
          </view>
          
          <!-- 头发健康度 -->
          <view class="metric-item">
            <view class="circular-progress">
              <view class="progress-circle">
                <view class="circle-bg"></view>
                <view class="circle-progress-bar" :style="{ 
                  background: `conic-gradient(#8b5cf6 ${getProgressDegrees(healthData.follicleHealth)}deg, transparent 0deg)`
                }"></view>
                <view class="progress-inner">
                  <text class="progress-value">{{healthData.follicleHealth}}</text>
                </view>
              </view>
            </view>
            <text class="metric-label">FOLLICLE</text>
          </view>
          
          <!-- 生活方式健康度 -->
          <view class="metric-item">
            <view class="circular-progress">
              <view class="progress-circle">
                <view class="circle-bg"></view>
                <view class="circle-progress-bar" :style="{ 
                  background: `conic-gradient(#8b5cf6 ${getProgressDegrees(healthData.hairHealth)}deg, transparent 0deg)`
                }"></view>
                <view class="progress-inner">
                  <text class="progress-value">{{healthData.hairHealth}}</text>
                </view>
              </view>
            </view>
            <text class="metric-label">HAIR</text>
          </view>
        </view>
      </view>
      
      <!-- 二维码 - 右侧 -->
      <view class="qrcode-container">
        <image class="qrcode" src="/static/images/qrcode.png" mode="aspectFit"></image>
        <text class="qrcode-text">Scan to learn more</text>
      </view>
    </view>
    
    <!-- 底部标签 -->
    <view class="passport-footer">
      <text class="footer-text">LUSHAIR&lt;&lt;YOUR&lt;&lt;PERSONALIZED&lt;&lt;HAIRCARE&lt;&lt;SOLUTION&lt;&lt;</text>
    </view>
    
    <!-- 底部空间占位，防止内容被底部按钮遮挡 -->
    <view class="bottom-spacer"></view>
  </view>
  
  <!-- 操作按钮 - 固定在底部 -->
  <!-- <view class="action-buttons">
    <button class="share-button" @tap="saveImage">Save Image</button>
    <button class="share-button" @tap="shareImage">Share</button>
  </view> -->
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import html2canvas from 'html2canvas';
import { useI18n } from 'vue-i18n';
import { getAchievementTracker } from '@/utils/achievementTracker';

const userStore = useUserStore();
const joinDate = ref(new Date());
const qrCodeUrl = ref('https://www.lushair.ai/getlushair/p/advanced-scalp-analysis-tool-lushair-scalp-scanner');

// 声明全局window接口，用于与原生App通信
declare var window: Window & { 
  webkit: any,
  android: any,
  receiveHealthDataFromApp: Function
};

// 健康度数据 - 直接设置默认值
const healthData = ref({
  scalpHealth: '96',
  follicleHealth: '66',
  hairHealth: '76',
});

const goBack = () => {
  uni.navigateBack();
};

// 从URL参数获取健康数据
const getHealthDataFromUrlParams = () => {
  try {
    // 获取当前页面路由参数
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    // @ts-ignore - 获取页面参数
    const options = currentPage.$page?.options || {};
    
    console.log('从URL获取到的护照页面参数:', options);
    
    // 如果URL参数中有健康数据，则使用URL参数更新健康数据
    if (options.scalpHealth || options.follicleHealth || options.hairHealth) {
      healthData.value = {
        scalpHealth: Math.round(Number(options.scalpHealth || '96')).toString(),
        follicleHealth: Math.round(Number(options.follicleHealth || '66')).toString(),
        hairHealth: Math.round(Number(options.hairHealth || '76')).toString()
      };
      
      console.log('使用URL参数更新健康数据:', healthData.value);
    } else {
      // 如果URL参数中没有健康数据，尝试从原生App获取
      requestHealthDataFromApp();
    }
  } catch (error) {
    console.error('从URL获取健康数据失败:', error);
    // 失败时尝试从原生App获取
    requestHealthDataFromApp();
  }
};

// 从原生App接收健康数据的方法
window.receiveHealthDataFromApp = function(healthDataString: string) {
  try {
    console.log('从App接收到健康数据:', healthDataString);
    const data = JSON.parse(healthDataString);
    
    // 更新健康数据
    healthData.value = {
      scalpHealth: Math.round(Number(data.scalpHealth || '96')).toString(),
      follicleHealth: Math.round(Number(data.follicleHealth || '66')).toString(),
      hairHealth: Math.round(Number(data.hairHealth || '76')).toString()
    };
    
    console.log('健康数据已更新:', healthData.value);
  } catch (error) {
    console.error('处理App传来的健康数据失败:', error);
  }
};

// 请求App传递健康数据
const requestHealthDataFromApp = () => {
  try {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document); // iOS终端
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; // Android终端
    
    if (isiOS && window.webkit && window.webkit.messageHandlers) {
      window.webkit.messageHandlers.getHealthData.postMessage({action: 'getHealthData'});
      console.log('向iOS App发送获取健康数据请求');
    } else if (isAndroid && window.android) {
      const healthDataFromAndroid = window.android.getHealthData();
      console.log('从Android App直接获取健康数据:', healthDataFromAndroid);
      
      if (healthDataFromAndroid) {
        window.receiveHealthDataFromApp(healthDataFromAndroid);
      }
    } else {
      console.log('未检测到原生环境，使用模拟健康数据');
      // 使用默认数据
    }
  } catch (error) {
    console.error('请求App健康数据时出错:', error);
  }
};

// 计算进度条角度
const getProgressDegrees = (value: string) => {
  const numValue = parseInt(value) || 0;
  // 将百分比值转换为角度，100%对应360度
  return (Math.min(numValue, 100) / 100) * 360;
};

// 格式化日期 DD MMM YY
const formatDate = (date: Date) => {
  const day = date.getDate();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().substr(-2);
  
  return `${day} ${month} ${year}`;
};

// 生成二维码
const generateQrCode = () => {
  // 实际应用中应当使用二维码生成库
  // 这里仅使用静态图片，实际开发时需要替换为动态生成的二维码
  return '/static/images/qrcode.png';
};

// 保存图片
const saveImage = () => {
  uni.showLoading({
    title: 'Generating image...'
  });
  
  // 延迟执行，确保界面已完全渲染
  setTimeout(() => {
    try {
      // 获取需要截图的容器元素
      const query = uni.createSelectorQuery();
      query.select('.passport-container').boundingClientRect().exec((res) => {
        if (!res || !res[0]) {
          uni.hideLoading();
          uni.showModal({
            title: 'Error',
            content: 'Cannot find the passport container element.',
            showCancel: false
          });
          return;
        }
        
        // 使用 html2canvas 库生成图片
        const element = document.querySelector('.passport-container');
        if (!element) {
          uni.hideLoading();
          uni.showModal({
            title: 'Error',
            content: 'Cannot find the passport container in DOM.',
            showCancel: false
          });
          return;
        }
        
        // 配置 html2canvas
        const options = {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          backgroundColor: null,
          ignoreElements: (el: Element) => {
            return el.classList && el.classList.contains('action-buttons');
          }
        };
        
        // 生成 canvas
        html2canvas(element as HTMLElement, options).then((canvas) => {
          // 将 canvas 转换为 base64 图片数据
          const imageData = canvas.toDataURL('image/png');
          
          // 发送图片数据到 iOS 原生应用
          sendImageToNativeApp(imageData);
          
          uni.hideLoading();
          uni.showToast({
            title: 'Image saved',
            icon: 'success',
            duration: 2000
          });
        }).catch((error: Error) => {
          console.error('html2canvas error:', error);
          uni.hideLoading();
          uni.showModal({
            title: 'Error',
            content: 'Failed to generate image: ' + error.message,
            showCancel: false
          });
        });
      });
    } catch (error: unknown) {
      uni.hideLoading();
      uni.showModal({
        title: 'Error',
        content: 'Failed to process the image: ' + (error instanceof Error ? error.message : String(error)),
        showCancel: false
      });
    }
  }, 300);
};

// 将图片发送给原生 App
const sendImageToNativeApp = (imageData: string) => {
  try {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document);
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;
    
    if (isiOS && window.webkit && window.webkit.messageHandlers) {
      // iOS: 通过 messageHandlers 发送图片数据
      window.webkit.messageHandlers.savePassportImage.postMessage({
        action: 'savePassportImage',
        imageData: imageData
      });
      console.log('向 iOS App 发送护照图片数据');
    } else if (isAndroid && window.android) {
      // Android: 直接调用方法保存图片
      window.android.savePassportImage(imageData);
      console.log('向 Android App 发送护照图片数据');
    } else {
      // 浏览器环境：使用 a 标签下载图片
      const a = document.createElement('a');
      a.href = imageData;
      a.download = 'lushair-passport.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log('浏览器环境下载图片');
    }
  } catch (error: unknown) {
    console.error('发送图片到 App 失败:', error);
    uni.showModal({
      title: 'Error',
      content: 'Failed to send image to App: ' + (error instanceof Error ? error.message : String(error)),
      showCancel: false
    });
  }
};

// 分享护照
const sharePassport = () => {
  uni.showLoading({
    title: 'Preparing to share...'
  });
  
  setTimeout(() => {
    uni.hideLoading();
    
    // 实际应用中应当使用系统分享功能
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  }, 1000);
  
  // 记录分享成就
  try {
    const tracker = getAchievementTracker();
    tracker.trackSocialActivity(0, 1); // 0次邀请，1次分享
    tracker.trackFeatureUsage('share_passport');
  } catch (error) {
    console.error('记录成就失败:', error);
  }
};

onMounted(() => {
  try {
    // 尝试从URL获取健康数据
    getHealthDataFromUrlParams();
    
    // 如果无法从App获取，尝试从用户信息中获取
    if (userStore.userInfo) {
      // 延迟执行，给URL参数或App请求一些时间
      setTimeout(() => {
        // 只有在没有从其他途径获取到数据的情况下才使用userStore中的数据
        if (healthData.value.scalpHealth === '96' && 
            healthData.value.follicleHealth === '66' && 
            healthData.value.hairHealth === '76') {
          healthData.value = {
            scalpHealth: Math.round(Number(userStore.userInfo.scalpHealth || '96')).toString(),
            follicleHealth: Math.round(Number(userStore.userInfo.follicleHealth || '66')).toString(),
            hairHealth: Math.round(Number(userStore.userInfo.hairHealth || '76')).toString()
          };
        }
      }, 500);
    }
    
    // 设置用户注册日期
    const now = new Date();
    joinDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30); // 假设30天前加入
    
    console.log('Health data initialized:', healthData.value);
  } catch (error) {
    console.error('初始化健康数据失败', error);
  }
});
</script>

<style>
.passport-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  padding-bottom: 80px; /* 为底部按钮留出空间 */
}

.passport-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 0;
  object-fit: cover;
}

.back-icon {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
}

.back-arrow {
  font-size: 24px;
  color: #ffffff;
}

.overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 0;
}

.passport-title {
  position: relative;
  z-index: 1;
  text-align: left;
  width: 90%;
  margin-top: 15vh;
}

.title-text {
  display: block;
  font-size: min(32px, 7vw);
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 5px;
}

.subtitle-text {
  display: block;
  font-size: min(14px, 3.5vw);
  color: #ffffff;
  opacity: 0.8;
}

.passport-info {
  position: relative;
  z-index: 1;
  width: 90%;
  margin-top: min(70px, 10vh);
  text-align: left;
}

.info-label {
  display: block;
  font-size: min(16px, 4vw);
  color: #ffffff;
  margin-bottom: 10px;
}

.content-layout {
  position: relative;
  z-index: 1;
  width: 90%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: min(50px, 8vh);
  flex-wrap: wrap;
}

.score-overview {
  position: relative;
  width: min(60%, 500px);
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: min(20px, 4vw);
  box-sizing: border-box;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.score-title {
  font-size: min(20px, 5vw);
  font-weight: bold;
  color: #ffffff;
  margin-bottom: min(20px, 3vh);
  display: block;
}

.score-metrics {
  display: flex;
  justify-content: space-around;
  width: 100%;
  flex-wrap: wrap;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(30%, 100px);
  margin-bottom: 15px;
}

.circular-progress {
  width: min(80px, 20vw);
  height: min(80px, 20vw);
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-circle {
  width: min(70px, 18vw);
  height: min(70px, 18vw);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: transparent;
}

.circle-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(139, 92, 246, 0.15);
}

.circle-progress-bar {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(#8b5cf6 0deg, transparent 0deg);
}

.progress-inner {
  position: absolute;
  width: calc(100% - 12px);
  height: calc(100% - 12px);
  border-radius: 50%;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.progress-value {
  font-size: min(24px, 6vw);
  font-weight: bold;
  color: #1a1a1a;
}

.metric-label {
  font-size: min(16px, 4vw);
  color: #ffffff;
  font-weight: 500;
  text-align: center;
}

.qrcode-container {
  position: relative;
  width: min(35%, 250px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.qrcode {
  width: min(140px, 30vw);
  height: min(140px, 30vw);
  margin-bottom: 10px;
  background-color: white;
  padding: 10px;
  border-radius: 8px;
}

.qrcode-text {
  font-size: min(14px, 3.5vw);
  color: #ffffff;
  text-align: center;
}

.passport-footer {
  position: relative;
  width: 100%;
  z-index: 1;
  padding: 15px;
  text-align: center;
  margin-top: 30px;
}

.footer-text {
  font-size: min(12px, 3vw);
  color: #ffffff;
  letter-spacing: 1px;
}

.bottom-spacer {
  height: 60px;
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  display: flex;
  justify-content: space-around;
  /* background-color: rgba(0, 0, 0, 0.7); */
  padding: 15px 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

.share-button {
  background-color: #8b5cf6;
  color: white;
  padding: min(12px, 3vw) min(30px, 8vw);
  border-radius: 8px;
  font-size: min(16px, 4vw);
  font-weight: 500;
  border: none;
  width: 40%;
  max-width: 200px;
}

/* 媒体查询适配小屏幕 */
@media screen and (max-width: 480px) {
  .content-layout {
    flex-direction: column;
  }
  
  .score-overview {
    width: 100%;
    margin-bottom: 20px;
  }
  
  .qrcode-container {
    width: 100%;
    margin-top: 20px;
  }
  
  .passport-title {
    margin-top: 100px;
  }
}
</style> 