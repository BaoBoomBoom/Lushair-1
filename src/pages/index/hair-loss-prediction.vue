<script setup lang="ts">
import { ref } from 'vue';
import { getApiUrl } from '@/utils/apiConfig';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

// --- AI Hair Loss Prediction Logic ---
const hairLossLevel = ref('2');
const hairLossImage = ref('');
const uploadedHairLossUrl = ref('');
const generatedHairResult = ref('');
const isUploadingHair = ref(false);
const isGeneratingHair = ref(false);
const hairLossLevels = ['1', '2', '3'];

const chooseHairImage = () => {
    uni.chooseImage({
        count: 1,
        sourceType: ['album', 'camera'],
        success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            hairLossImage.value = tempFilePath;
            uploadedHairLossUrl.value = ''; // Reset previous upload
            generatedHairResult.value = ''; // Reset previous result
            uploadHairImage(tempFilePath);
        }
    });
};

const uploadHairImage = (filePath: string) => {
    isUploadingHair.value = true;
    const uploadUrl = getApiUrl('file/uploadHairLoss');
    
    uni.showLoading({ title: 'Uploading...' });
    
    uni.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: 'file',
        formData: {
            userId: userStore.userInfo.userId || '',
            type: userStore.userInfo.type || '0'
        },
        success: (uploadRes) => {
            try {
                const data = JSON.parse(uploadRes.data);
                if (data.code === 200) {
                    uploadedHairLossUrl.value = data.data; // Assuming data.data contains the URL
                    uni.showToast({ title: 'Upload Success', icon: 'success' });
                } else {
                    uni.showToast({ title: data.msg || 'Upload Failed', icon: 'none' });
                    console.error('Upload failed:', data);
                }
            } catch (e) {
                console.error('Parse error:', e);
                uni.showToast({ title: 'Upload Error', icon: 'none' });
            }
        },
        fail: (err) => {
            console.error('Upload fail:', err);
            uni.showToast({ title: 'Network Error', icon: 'none' });
        },
        complete: () => {
            isUploadingHair.value = false;
            uni.hideLoading();
        }
    });
};

const generateHairPrediction = () => {
    if (!uploadedHairLossUrl.value) {
        uni.showToast({ title: 'Please upload image first', icon: 'none' });
        return;
    }

    isGeneratingHair.value = true;
    uni.showLoading({ title: 'Generating...' });

    // vite proxy: /hair-loss-api -> http://43.156.213.63:5000 (rewrite removes prefix)
    const isDev = import.meta.env.DEV;
    const apiUrl = isDev
        ? '/hair-loss-api/generate_hair_loss_image_v1'
        : 'http://43.156.213.63:5000/generate_hair_loss_image_v1';

    uni.request({
        url: apiUrl,
        method: 'POST',
        data: {
            image_url: uploadedHairLossUrl.value,
            loss_level: hairLossLevel.value
        },
        header: {
            'Content-Type': 'application/json'
        },
        success: (res: any) => {
            console.log('Generate res:', res);
            if (res.data && res.data.code === 200) {
                // The backend returns a full URL like http://43.156.213.63:5000/log/...
                // We need to replace the domain part with our proxy prefix /log
                // to avoid CORS and mixed content issues
                let imageUrl = res.data.url;
                if (imageUrl && imageUrl.includes(':5000/log/')) {
                    if (isDev) {
                        const logPath = imageUrl.split('/log/')[1];
                        generatedHairResult.value = `/hair-loss-log/${logPath}`;
                    } else {
                        generatedHairResult.value = imageUrl;
                    }
                } else {
                    generatedHairResult.value = imageUrl;
                }
            } else {
                uni.showToast({ title: 'Generation Failed', icon: 'none' });
            }
        },
        fail: (err) => {
            console.error('Generate error:', err);
            uni.showToast({ title: 'Service Error', icon: 'none' });
        },
        complete: () => {
            isGeneratingHair.value = false;
            uni.hideLoading();
        }
    });
};

const previewImage = (url: string) => {
    if(!url) return;
    uni.previewImage({
        urls: [url]
    });
};

const goBack = () => {
    uni.navigateBack();
};
</script>

<template>
    <view class="prediction-page">
        <!-- Header -->
        <view class="page-header">
            <view class="back-btn" @tap="goBack">
                <image src="/static/icons/arrow_back.svg" mode="aspectFit" class="back-icon" />
            </view>
            <text class="page-title">AI Hair Loss Simulation</text>
        </view>

        <view class="content">
            <view class="prediction-card">
                <view class="card-header">
                    <text class="card-title">Upload your photo to see the future you</text>
                    <text class="card-subtitle">AI-powered hair loss simulation based on your selfie.</text>
                </view>

                <view class="prediction-main">
                    <!-- Image Upload Area -->
                    <view class="upload-area" @tap="chooseHairImage">
                        <template v-if="!hairLossImage">
                            <view class="upload-placeholder">
                                <view class="icon-circle">
                                    <image src="/static/icons/camera_front.svg" mode="aspectFit" class="upload-icon" />
                                </view>
                                <text class="upload-text">Upload Selfie</text>
                            </view>
                        </template>
                        <template v-else>
                            <image :src="hairLossImage" mode="aspectFill" class="uploaded-image" />
                            <view class="reupload-overlay">
                                <text class="reupload-text">Change</text>
                            </view>
                        </template>
                    </view>

                    <!-- Controls Area -->
                    <view class="controls-area">
                        <view class="level-control">
                            <text class="control-label">Select Loss Level (Norwood Scale)</text>
                            <view class="level-options">
                                <view 
                                    v-for="level in hairLossLevels" 
                                    :key="level"
                                    class="level-option"
                                    :class="{ active: hairLossLevel === level }"
                                    @tap="hairLossLevel = level"
                                >
                                    <text class="level-text">{{ level }}</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
                
                <view class="action-section">
                    <view class="action-button" :class="{ disabled: !uploadedHairLossUrl || isGeneratingHair }" @tap="generateHairPrediction">
                        <text class="button-text">{{ isGeneratingHair ? 'Generating...' : 'Simulate' }}</text>
                        <image v-if="!isGeneratingHair" src="/static/icons/arrow_right.svg" mode="aspectFit" class="button-icon" />
                    </view>
                </view>

                <!-- Result Area -->
                <view v-if="generatedHairResult" class="result-display">
                    <view class="result-divider">
                        <text class="divider-text">Simulation Result</text>
                    </view>
                    <view class="result-image-container" @tap="previewImage(generatedHairResult)">
                        <image :src="generatedHairResult" mode="widthFix" class="result-image" />
                        <view class="preview-hint">
                            <text class="hint-text">Tap to preview</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
.prediction-page {
    min-height: 100vh;
    background-color: #F8F9FA;
    display: flex;
    flex-direction: column;
}

.page-header {
    background: #fff;
    padding: 50px 16px 16px; /* Adjust top padding for status bar */
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.back-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.back-icon {
    width: 24px;
    height: 24px;
}

.page-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
}

.content {
    padding: 24px 16px;
    flex: 1;
}

.prediction-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.card-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.card-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    line-height: 1.3;
}

.card-subtitle {
    font-size: 14px;
    color: #6B7280;
    line-height: 1.5;
}

.prediction-main {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.upload-area {
    width: 100%;
    aspect-ratio: 1; /* Square upload area for better mobile experience */
    max-height: 300px;
    background: #F9FAFB;
    border: 2px dashed #D1D5DB;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    margin: 0 auto;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.icon-circle {
    width: 56px;
    height: 56px;
    background: #EDE9FE;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.upload-icon {
    width: 32px;
    height: 32px;
}

.upload-text {
    font-size: 14px;
    color: #6B7280;
    font-weight: 500;
}

.uploaded-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.reupload-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.6);
    padding: 8px;
    display: flex;
    justify-content: center;
}

.reupload-text {
    color: #fff;
    font-size: 12px;
    font-weight: 500;
}

.controls-area {
    display: flex;
    flex-direction: column;
}

.level-control {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.control-label {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
}

.level-options {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.level-option {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: #F3F4F6;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.level-option.active {
    background: #7622FF;
    color: white;
    border-color: rgba(118, 34, 255, 0.3);
    box-shadow: 0 4px 12px rgba(118, 34, 255, 0.3);
}

.level-text {
    font-size: 20px;
    font-weight: 600;
}

.action-section {
    padding-top: 8px;
}

.action-button {
    background: linear-gradient(90deg, #7622FF 0%, #a855f7 100%);
    border-radius: 12px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(118, 34, 255, 0.3);
}

.action-button:active {
    transform: translateY(1px);
}

.action-button.disabled {
    opacity: 0.5;
    background: #9CA3AF;
    box-shadow: none;
}

.button-text {
    color: white;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.button-icon {
    width: 20px;
    height: 20px;
    filter: brightness(0) invert(1);
}

.result-display {
    margin-top: 24px;
    border-top: 1px solid #E5E7EB;
    padding-top: 24px;
    animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.result-divider {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
}

.divider-text {
    font-size: 14px;
    color: #4B5563;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.result-image-container {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    background: #F9FAFB;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.result-image {
    width: 100%;
    display: block;
}

.preview-hint {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0,0,0,0.75);
    padding: 6px 12px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
}

.hint-text {
    color: white;
    font-size: 12px;
    font-weight: 500;
}
</style>
