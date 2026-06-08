<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
import { post } from '@/utils/request';
import { ProjectBrand, getCurrentProjectBrand, getApiUrl } from '@/utils/apiConfig';
import { useUserStore } from '@/stores/userStore';
import md5 from 'js-md5';

// 使用 blueimp-md5 库提供的 md5 函数
declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function,
  changeTabToChat: Function,
  receiveLanguageFromApp: Function
};

const { t } = useI18n();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, topPositionStyle, contentMarginStyle } = useStatusBar();

// 状态管理
const hasPicture = ref(false);
const pictureData = ref<string | null>(null);

const hasNativeBridge = (): boolean => {
  const w = window as any;
  return !!(w?.webkit?.messageHandlers?.openSelfie || w?.android?.openSelfie);
};

const takePictureWeb = () => {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera', 'album'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      const userStore = useUserStore();
      uni.showLoading({ title: 'Uploading...' });
      uni.uploadFile({
        url: getApiUrl('file/uploadHairLoss'),
        filePath: tempFilePath,
        name: 'file',
        formData: {
          userId: userStore.userInfo.userId || '',
          type: userStore.userInfo.type || '0',
        },
        success: (uploadRes) => {
          try {
            const data = JSON.parse(uploadRes.data);
            if (data.code === 200 && data.data) {
              receiveImageUrl(data.data);
            } else {
              uni.showToast({ title: data.msg || 'Upload Failed', icon: 'none' });
            }
          } catch {
            uni.showToast({ title: 'Upload Error', icon: 'none' });
          }
        },
        fail: () => uni.showToast({ title: 'Network Error', icon: 'none' }),
        complete: () => uni.hideLoading(),
      });
    },
  });
};

// 拍照功能
const takePicture = () => {
  if (!hasNativeBridge()) {
    takePictureWeb();
    return;
  }
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.openSelfie.postMessage({data: 'openSelfie'});
  } else {
    window.android.openSelfie(JSON.stringify({data: 'openSelfie'}));
  }
};

// 分析功能
const analyzePicture = async () => {
  if (!hasPicture.value) {
    uni.showToast({
      title: '请先拍摄照片',
      icon: 'none'
    });
    return;
  }

  // pictureData.value = 'https://meta.lushair.cn/icons/boy.png';

  uni.showLoading({ title: 'Analyzing...' });

  try {
    const userStore = useUserStore();
    const userInfo = userStore.userInfo;
    
    // 获取性别，默认为2（女性）
    const gender = userInfo?.gender || 2;
    
    // API参数
    const customer = 'lusHair1829de25';
    const key = 'owvI0JMeIXsM';
    const imageUrl = pictureData.value;
    
    // 生成签名
    const signString = `${gender}${imageUrl}${key}${customer}`;
    const sign = md5(signString);
    
    const params = {
      customer,
      gender,
      imageUrl,
      sign
    };
    
    // 根据品牌调用不同接口
    const brand = getCurrentProjectBrand();
    const endpoint = brand === ProjectBrand.LUSHAIR ? '/file/selfieNetApi' : '/file/selfieApi';
    const response = await post(endpoint, params) as any;
    
    if (response && response.POSITION && response.STAGE && imageUrl) {
      // 跳转到结果页面
      uni.navigateTo({
        url: `/pages/questionnaire/index?position=${encodeURIComponent(response.POSITION)}&stage=${response.STAGE}&image=${encodeURIComponent(imageUrl)}`
      });
    } else {
      throw new Error('API响应格式错误');
    }
    
  } catch (error) {
    console.error('分析失败:', error);
    uni.showToast({
      title: '分析失败，请重试',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

// 查看如何扫描
const viewHowToScan = () => {
  // 可以跳转到帮助页面或显示弹窗
  uni.showToast({
    title: '查看扫描指导',
    icon: 'none'
  });
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

// 接收从app传来的imageUrl
const receiveImageUrl = (imageUrl: string) => {
  pictureData.value = imageUrl;
  hasPicture.value = true;
};

// 删除照片
const deletePicture = () => {
  pictureData.value = null;
  hasPicture.value = false;
};

// 重新拍摄
const retakePicture = () => {
  takePicture();
};

// 将方法暴露给全局，供app调用
if (typeof window !== 'undefined') {
  (window as any).receiveImageUrl = receiveImageUrl;
}
</script>

<template>
  <view class="scan-instructions">
    <!-- 返回按钮 -->
    <view class="back-button" :style="topPositionStyle(20)" @click="goBack">
      <text class="back-icon">←</text>
    </view>
    
    <!-- 主要内容区域 -->
    <view class="content" :style="contentMarginStyle(75)">
      <!-- 标题区域 -->
      <view class="header">
        <text class="title">{{ t('selfie.scanInstructions') }}</text>
      </view>
      
      <!-- 说明文字 -->
      <text class="main-title">{{ t('selfie.takeSelfie') }}</text>
      <text class="description">{{ t('selfie.takeSelfieDescription') }}</text>
      
      <!-- 如何扫描链接 -->
      <view class="how-to-scan" @click="viewHowToScan">
        <text class="link-text">{{ t('selfie.howToScan') }}</text>
      </view>
    </view>

    <!-- 指导图示区域 -->
    <view class="diagrams-container">
      <view class="diagrams">
        <!-- 头部模型图示 -->
        <view class="head-model">
          <image 
            src="/static/icons/icon_head.svg" 
            class="head-image"
            mode="aspectFit"
          />
        </view>
        
        <!-- 指导要点 -->
        <view class="guidelines">
                     <view class="guideline-item">
             <view class="guideline-icon">
               <image src="/static/icons/light_mode.svg" class="icon-svg" mode="aspectFit" />
             </view>
             <text class="guideline-text">{{ t('selfie.goodLighting') }}</text>
           </view>
           
           <view class="guideline-item">
             <view class="guideline-icon">
               <image src="/static/icons/face_5.svg" class="icon-svg" mode="aspectFit" />
             </view>
             <text class="guideline-text">{{ t('selfie.includeHairline') }}</text>
           </view>
           
           <view class="guideline-item">
             <view class="guideline-icon">
               <image src="/static/icons/camera_front_black.svg" class="icon-svg" mode="aspectFit" />
             </view>
             <text class="guideline-text">{{ t('selfie.fullFaceCaptured') }}</text>
           </view>
        </view>
      </view>
    </view>

        <!-- 拍照区域 -->
    <view class="photo-area">
      <template v-if="!hasPicture">
        <view class="photo-container">
          <text class="no-picture-text">{{ t('selfie.noPictureTaken') }}</text>
          <button class="take-picture-btn" @click="takePicture">
            <image src="/static/icons/icon_camera.svg" class="btn-icon-svg" mode="aspectFit" />
            <text class="btn-text">{{ t('selfie.takePicture') }}</text>
          </button>
        </view>
      </template>
      <template v-else>
        <!-- 拍照后的界面 -->
        <view class="photo-preview-container">
          <image 
            :src="pictureData" 
            class="preview-photo"
            mode="aspectFit"
          />
          <!-- 删除按钮 -->
          <button class="delete-btn" @click="deletePicture">
            <image src="/static/icons/close.svg" class="delete-icon" mode="aspectFit" />
          </button>
          <!-- 缩放滑块 -->
          <view class="zoom-slider">
            <view class="slider-track"></view>
          </view>
        </view>
      </template>
    </view>

    <!-- 按钮区域 -->
    <view class="button-area" v-if="hasPicture">
      <!-- 重新拍摄按钮 -->
      <button class="retake-btn" @click="retakePicture">
        <image src="/static/icons/icon_camera.svg" class="btn-icon-svg" mode="aspectFit" />
        <text class="retake-text">{{ t('selfie.retake') }}</text>
      </button>
    </view>

    <!-- 分析按钮 -->
    <button 
      class="analyze-btn" 
      :class="{ 'disabled': !hasPicture }"
      @click="analyzePicture"
    >
      <text class="analyze-text">{{ t('selfie.analyze') }}</text>
    </button>
  </view>
</template>

<style scoped>
.scan-instructions {
  min-height: 840px;
  background-color: #FFFFFF;
  padding: 0 16px 100px 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
}

.back-button {
  position: absolute;
  /* top is set dynamically via inline style (20px + statusBarHeight) */
  left: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  z-index: 10;
}

.back-icon {
  font-size: 20px;
  color: #000000;
  font-weight: bold;
}

.content {
  /* margin-top is set dynamically via inline style (75px + statusBarHeight) */
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 1.17;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #878D96;
}

.main-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 28px;
  line-height: 1.29;
  color: #000000;
}

.description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 16px;
  line-height: 1.5;
  color: #323232;
}

.how-to-scan {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  margin-top: 8px;
}

.link-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.14;
  color: #7622FF;
}

.diagrams-container {
  margin-top: 24px;
}

.diagrams {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 12px;
  background-color: #F5F5F5;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  height: 130px;
}

.head-model {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 71px;
}

.head-image {
  width: 100%;
  height: 106px;
  border-radius: 4px;
}



.guidelines {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 4px 16px;
  border-left: 1px solid #B8B8B8;
}

.guideline-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.guideline-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-svg {
  width: 16px;
  height: 16px;
}

.guideline-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 1.5;
  color: #323232;
}

.photo-area {
  margin-top: 48px;
}

.photo-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 10px;
  background-color: #F5F5F5;
  border: 1px solid #B8B8B8;
  border-radius: 2px;
  height: 234px;
}

.photo-preview-container {
  position: relative;
  width: 343px;
  height: 228px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.1);
}

.preview-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 46px;
  height: 46px;
  background-color: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  width: 24px;
  height: 24px;
}

.zoom-slider {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-track {
  width: 48px;
  height: 4px;
  background-color: #7622FF;
  border-radius: 2px;
}

.no-picture-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 16px;
  line-height: 1.5;
  text-align: center;
  color: #323232;
}

.take-picture-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px 18px;
  background-color: #FFFFFF;
  border: 1px solid #7622FF;
  border-radius: 2px;
  height: 46px;
}

.taken-photo {
  width: 200px;
  height: 150px;
  border-radius: 8px;
  border: 2px solid #7622FF;
}

.button-area {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.retake-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px 18px;
  background-color: #FFFFFF;
  border: 1px solid #7622FF;
  border-radius: 2px;
  height: 46px;
}

.retake-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.29;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #7622FF;
}

.btn-icon-svg {
  width: 16px;
  height: 16px;
}

.btn-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.29;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #7622FF;
}

.analyze-btn {
  position: fixed;
  bottom: 34px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background-color: #C0C0C0;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  height: 56px;
  transition: all 0.3s ease;
}

.analyze-btn:not(.disabled) {
  background-color: #7622FF;
  border-color: #7622FF;
}

.analyze-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 1.375;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #FFFFFF;
}

.analyze-btn.disabled .analyze-text {
  color: #000000;
}
</style>
