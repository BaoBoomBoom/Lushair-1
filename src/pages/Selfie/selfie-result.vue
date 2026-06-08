<template>
  <view class="result-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="left" @click="goBack">
        <wd-icon name="arrow-left" size="24" color="#6739c6" />
      </view>
      <view class="title">{{ t('selfieResult.title') }}</view>
      <view class="right"></view>
    </view>
    
    <!-- 标题和日期 -->
    <view class="title-section">
      <view class="title-row">
        <text class="main-title">{{ t('selfieResult.title') }}</text>
        <view class="badge">
          <view class="camera-icon">
            <TablerIcon name="camera" :size="16" class="camera-symbol" />
          </view>
          <text class="badge-text">{{ t('selfieResult.phoneCamera') }}</text>
        </view>
      </view>
      <text class="date-text">April 22, 2025 at 5:00 PM</text>
    </view>
    
    <!-- 脱发模式卡片 -->
    <view class="pattern-card">
      <view class="pattern-content">
        <view class="pattern-header">
          <text class="pattern-title">{{ t('selfieResult.hairLossPattern') }}</text>
          <text class="pattern-level">{{ t('selfieResult.level') }} 3 {{ t('selfieResult.of') }} 7</text>
        </view>
        
        <!-- 等级指示器 -->
        <view class="level-indicator">
          <view class="indicator-line"></view>
          <view class="level-bars">
            <view class="level-bar completed" v-for="i in 2" :key="i">
              <text class="level-number">{{ i }}</text>
            </view>
            <view class="level-bar current">
              <text class="level-number current">{{ 3 }}</text>
            </view>
            <view class="level-bar" v-for="i in 4" :key="i + 3">
              <text class="level-number">{{ i + 3 }}</text>
            </view>
          </view>
          <view class="level-labels">
            <text class="level-label">{{ t('selfieResult.mildHairloss') }}</text>
            <text class="level-label">{{ t('selfieResult.severeHairloss') }}</text>
          </view>
        </view>
        
        <text class="pattern-description">{{ t('selfieResult.normalHairline') }}</text>
      </view>
    </view>
    
    <!-- 智能摘要卡片 -->
    <view class="summary-card">
      <view class="summary-content">
        <view class="summary-header">
          <view class="ai-icon">
            <TablerIcon name="sparkles" :size="18" class="ai-symbol" />
          </view>
          <text class="summary-title">{{ t('selfieResult.smartSummary') }}</text>
        </view>
        
        <text class="summary-text">{{ t('selfieResult.obviousScalp') }}</text>
        
        <view class="suggestions-section">
          <text class="suggestions-title">{{ t('selfieResult.suggestions') }}</text>
          <text class="suggestions-text">{{ t('selfieResult.suggestionText') }}</text>
        </view>
      </view>
      
      <view class="generate-button">
        <text class="generate-text">{{ t('selfieResult.generateMore') }}</text>
      </view>
    </view>
    
    <!-- 指标部分 -->
    <view class="metrics-section">
      <view class="section-header">
        <text class="section-title">{{ t('selfieResult.yourMetrics') }}</text>
        <text class="section-description">{{ t('selfieResult.metricsDescription') }}</text>
      </view>
      
      <!-- 雷达图 -->
      <view class="radar-chart-container">
        <view class="radar-chart">
          <!-- 这里可以放置实际的雷达图组件 -->
          <view class="chart-placeholder">
            <text class="chart-text">Radar Chart</text>
          </view>
        </view>
        
        <!-- 图表标签 -->
        <view class="chart-labels">
          <text class="chart-label gray-hair">{{ $t('selfieResult.grayHair') }}</text>
          <text class="chart-label sensitivity">{{ $t('selfieResult.sensitivity') }}</text>
          <text class="chart-label hair">{{ $t('selfieResult.hair') }}</text>
          <text class="chart-label oiliness">{{ $t('selfieResult.oiliness') }}</text>
          <text class="chart-label follicle">{{ $t('selfieResult.follicle') }}</text>
          <text class="chart-label scalp">{{ $t('selfieResult.scalpLabel') }}</text>
        </view>
      </view>
    </view>
    
    <!-- 评分明细 -->
    <view class="score-section">
      <view class="section-header">
        <text class="section-title">{{ $t('selfieResult.scoreBreakdown') }}</text>
        <text class="section-description">{{ $t('selfieResult.basicMetrics') }}</text>
      </view>
      
      <!-- 头皮评分卡片 -->
      <view class="score-card">
        <view class="card-header">
          <view class="card-icon">
            <TablerIcon name="search" :size="18" class="icon-symbol" />
          </view>
          <text class="card-title">{{ $t('selfieResult.scalp') }}</text>
        </view>
        
        <view class="card-content">
          <!-- 头皮和头发油脂 -->
          <view class="metric-item">
            <view class="metric-header">
              <text class="metric-name">{{ $t('selfieResult.scalpHairOil') }}</text>
              <view class="metric-score">
                <text class="score-label">High</text>
                <text class="score-value">3/3</text>
              </view>
            </view>
            <view class="progress-bar">
              <view class="progress-fill high" style="width: 100%"></view>
            </view>
            <view class="progress-labels">
              <text class="progress-label">{{ $t('selfieResult.lessOily') }}</text>
              <text class="progress-label">{{ $t('selfieResult.moreOily') }}</text>
            </view>
            <text class="metric-description">{{ $t('selfieResult.descriptionText') }}</text>
          </view>
          
          <!-- 角蛋白构成 -->
          <view class="metric-item">
            <view class="metric-header">
              <text class="metric-name">{{ $t('selfieResult.keratinMakeup') }}</text>
              <view class="metric-score">
                <text class="score-label">High</text>
                <text class="score-value">3/3</text>
              </view>
            </view>
            <view class="progress-bar">
              <view class="progress-fill high" style="width: 100%"></view>
            </view>
            <view class="progress-labels">
              <text class="progress-label">{{ $t('selfieResult.lessKeratin') }}</text>
              <text class="progress-label">{{ $t('selfieResult.moreKeratin') }}</text>
            </view>
            <text class="metric-description">{{ $t('selfieResult.descriptionText') }}</text>
          </view>
        </view>
      </view>
      
      <!-- 头发评分卡片 -->
      <view class="score-card">
        <view class="card-header">
          <view class="card-icon">
            <TablerIcon name="user-scan" :size="18" class="icon-symbol" />
          </view>
          <text class="card-title">{{ $t('selfieResult.hair') }}</text>
        </view>
        
        <view class="card-content">
          <!-- 头发强度 -->
          <view class="metric-item">
            <view class="metric-header">
              <text class="metric-name">{{ $t('selfieResult.hairStrength') }}</text>
              <view class="metric-score">
                <text class="score-label average">Average</text>
                <text class="score-value">2/3</text>
              </view>
            </view>
            <view class="progress-bar">
              <view class="progress-fill average" style="width: 66%"></view>
            </view>
            <view class="progress-labels">
              <text class="progress-label">{{ $t('selfieResult.lessStrong') }}</text>
              <text class="progress-label">{{ $t('selfieResult.stronger') }}</text>
            </view>
            <text class="metric-description">{{ $t('selfieResult.descriptionText') }}</text>
          </view>
          
          <!-- 毛囊厚度 -->
          <view class="metric-item">
            <view class="metric-header">
              <text class="metric-name">{{ $t('selfieResult.follicleThickness') }}</text>
              <view class="metric-score">
                <text class="score-label low">Low</text>
                <text class="score-value">1/3</text>
              </view>
            </view>
            <view class="progress-bar">
              <view class="progress-fill low" style="width: 33%"></view>
            </view>
            <view class="progress-labels">
              <text class="progress-label">{{ $t('selfieResult.lessThick') }}</text>
              <text class="progress-label">{{ $t('selfieResult.thicker') }}</text>
            </view>
            <text class="metric-description">{{ $t('selfieResult.descriptionText2') }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 扫描图片 -->
    <view class="scan-section">
      <text class="scan-title">{{ $t('selfieResult.phoneCamera') }}</text>
      <view class="scan-image-container">
        <image class="scan-image" src="/static/trichoscan/now.jpg" mode="aspectFill"></image>
      </view>
      <view class="view-button">
        <text class="view-text">{{ $t('selfieResult.view') }}</text>
      </view>
    </view>
    
    <!-- CTA 部分 -->
    <view class="cta-section">
      <text class="cta-title">{{ $t('selfieResult.wantMoreInsights') }}</text>
      <text class="cta-description">{{ $t('selfieResult.tryAdvancedScanner') }}</text>
      <view class="cta-button">
        <text class="cta-button-text">{{ $t('selfieResult.getMyDermascope') }}</text>
      </view>
    </view>
    
    <!-- 底部按钮 -->
    <view class="bottom-buttons">
      <view class="secondary-button" @tap="retakeScan">
        <text class="secondary-button-text">{{ $t('selfieResult.retakeScan') }}</text>
      </view>
      <view class="primary-button" @tap="exit">
        <text class="primary-button-text">{{ $t('selfieResult.exit') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useI18n } from 'vue-i18n';

declare var window: Window & { 
  webkit: any,
  android: any,
  goBack: Function
};

const { t } = useI18n();

// 返回上一页
const goBack = () => {
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.goBack.postMessage({data: 'goBack'});
  } else {
    window.android.goBack(JSON.stringify({data: 'goBack'}));
  }
  // uni.navigateBack({
  //   delta: 1
  // });
};

// 重新扫描
const retakeScan = () => {
  uni.navigateTo({
    url: '/pages/trichoscan/index'
  });
};

// 退出
const exit = () => {
  uni.switchTab({
    url: '/pages/index/home'
  });
};

onMounted(() => {
  // 页面加载时的逻辑
});
</script>

<style>
.result-container {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 20px;
  margin-top: calc(48px + env(safe-area-inset-top));
}

/* 顶部导航栏 */
.nav-bar {
  flex-shrink: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: calc(env(safe-area-inset-top) + 0px) 16px 0;
  background-color: #fff;
  box-shadow: 0px 2px 9px 0px #0000002e;

  .left,
  .right {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .title {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14px;
    font-weight: 600;
    color: #000;
  }
}

/* 标题部分 */
.title-section {
  padding: 0 16px;
  margin-bottom: 36px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.main-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 28px;
  line-height: 36px;
  color: #000000;
}

.badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  background: linear-gradient(135deg, #848484 0%, #E6E6E6 34.14%, #7D7D7D 56.34%, #454545 100%);
  border: 0.5px solid #B8B8B8;
  border-radius: 2px;
}

.camera-icon {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-symbol {
  font-size: 10px;
  color: #000000;
}

.badge-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 18px;
  color: #000000;
}

.date-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #7A7A7A;
}

/* 脱发模式卡片 */
.pattern-card {
  margin: 0 16px 36px;
  background: linear-gradient(135deg, #848484 13.86%, #D8D8D8 39.62%, #7D7D7D 56.34%, #454545 100%);
  border: 2px solid;
  border-image: linear-gradient(to bottom, #737373 0%, #EAEAEA 34.14%, #9F9F9F 57.69%, #E0E0E0 82.69%, #888888 100%) 1;
  border-radius: 2px;
  padding: 24px;
}

.pattern-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.pattern-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pattern-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 22px;
  line-height: 29px;
  text-align: center;
  color: #FFFFFF;
}

.pattern-level {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  color: #F5F5F5;
}

/* 等级指示器 */
.level-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.indicator-line {
  width: 100%;
  height: 5px;
  background-color: #FFFFFF;
  margin-bottom: 10px;
}

.level-bars {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 2px;
}

.level-bar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 12px;
  background-color: rgba(223, 255, 96, 0.3);
  border-radius: 2px;
}

.level-bar.completed {
  background-color: rgba(223, 255, 96, 0.4);
}

.level-bar.current {
  background-color: rgba(223, 255, 96, 0.5);
  border: 1px solid #FFFFFF;
}

.level-number {
  font-family: 'Chivo', sans-serif;
  font-weight: 500;
  font-size: 10px;
  line-height: 12px;
  text-align: center;
  color: #E0E0E0;
}

.level-number.current {
  font-weight: 600;
  color: #FFFFFF;
}

.level-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 2px;
}

.level-label {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 10px;
  line-height: 15px;
  color: #B8B8B8;
}

.pattern-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  line-height: 21px;
  text-align: center;
  color: #FFFFFF;
}

/* 智能摘要卡片 */
.summary-card {
  margin: 0 16px 36px;
  background-color: #FFFFFF;
  border: 2px solid;
  border-image: linear-gradient(to bottom, #737373 0%, #EAEAEA 34.14%, #9F9F9F 57.69%, #E0E0E0 82.69%, #888888 100%) 1;
  border-radius: 2px;
  padding: 24px;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-symbol {
  font-size: 20px;
  color: #323232;
}

.summary-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 18px;
  line-height: 23px;
  color: #000000;
}

.summary-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 16px;
  line-height: 24px;
  color: #000000;
}

.suggestions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 21px;
  color: #323232;
}

.suggestions-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 16px;
  line-height: 24px;
  color: #000000;
  white-space: pre-line;
}

.generate-button {
  background-color: #6739C6;
  padding: 16px 18px;
  border-radius: 2px;
  text-align: center;
}

.generate-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 18px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #FFFFFF;
}

/* 指标部分 */
.metrics-section {
  margin: 0 16px 36px;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.section-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 18px;
  line-height: 23px;
  color: #000000;
}

.section-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 10px;
  line-height: 15px;
  color: #323232;
}

/* 雷达图 */
.radar-chart-container {
  background-color: #F5F5F5;
  border-radius: 2px;
  padding: 16px;
  position: relative;
  height: 276px;
}

.radar-chart {
  width: 100%;
  height: 244px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  width: 230px;
  height: 230px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
}

.chart-text {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: #323232;
}

.chart-labels {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.chart-label {
  position: absolute;
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 10px;
  line-height: 15px;
  color: #323232;
}

.chart-label.gray-hair {
  top: 8px;
  left: 25%;
}

.chart-label.sensitivity {
  top: 8px;
  right: 25%;
}

.chart-label.hair {
  top: 50%;
  left: 8px;
  transform: translateY(-50%);
}

.chart-label.oiliness {
  bottom: 8px;
  right: 25%;
}

.chart-label.follicle {
  bottom: 8px;
  left: 25%;
}

.chart-label.scalp {
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
}

/* 评分明细 */
.score-section {
  margin: 0 16px 36px;
}

.score-card {
  background-color: #FFFFFF;
  border-radius: 2px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.25);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
}

.card-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-symbol {
  font-size: 20px;
  color: #000000;
}

.card-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #343A3F;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.metric-name {
  font-family: 'Chivo', sans-serif;
  font-weight: 500;
  font-size: 14px;
  line-height: 21px;
  color: #000000;
}

.metric-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 16px;
  color: #6739C6;
}

.score-label.average {
  color: #7A7A7A;
}

.score-label.low {
  color: #BD4141;
}

.score-value {
  font-family: 'Chivo', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 19px;
  letter-spacing: 0.5px;
  color: #121619;
}

.progress-bar {
  height: 4px;
  background-color: rgba(103, 57, 198, 0.45);
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 10px;
}

.progress-fill.high {
  background-color: #6739C6;
}

.progress-fill.average {
  background-color: #B8B8B8;
}

.progress-fill.low {
  background-color: #B8B8B8;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1px 0;
}

.progress-label {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 8px;
  line-height: 10px;
  color: #697077;
  width: 100px;
}

.progress-label:last-child {
  text-align: right;
}

.metric-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 10px;
  line-height: 15px;
  color: #323232;
}

/* 扫描部分 */
.scan-section {
  margin: 0 16px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.scan-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #878D96;
}

.scan-image-container {
  width: 150px;
  height: 162px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
}

.scan-image {
  width: 100%;
  height: 100%;
}

.view-button {
  background-color: transparent;
  border: 1px solid #6739C6;
  border-radius: 2px;
  padding: 16px 18px;
  text-align: center;
}

.view-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 18px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #6739C6;
}

/* CTA 部分 */
.cta-section {
  margin: 0 16px 36px;
  background-color: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 2px;
  padding: 24px 24px 16px;
  text-align: center;
}

.cta-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 18px;
  line-height: 23px;
  color: #323232;
  margin-bottom: 16px;
}

.cta-description {
  font-family: 'Chivo', sans-serif;
  font-weight: 300;
  font-size: 14px;
  line-height: 21px;
  color: #323232;
  margin-bottom: 16px;
}

.cta-button {
  background-color: #FFFFFF;
  border: 1px solid #6739C6;
  border-radius: 2px;
  padding: 16px 18px;
  text-align: center;
}

.cta-button-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 18px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #6739C6;
}

/* 底部按钮 */
.bottom-buttons {
  margin: 0 16px;
  display: flex;
  gap: 10px;
}

.secondary-button,
.primary-button {
  flex: 1;
  padding: 16px 20px;
  border-radius: 2px;
  text-align: center;
}

.secondary-button {
  background-color: #FFFFFF;
  border: 1px solid #6739C6;
}

.primary-button {
  background-color: #6739C6;
}

.secondary-button-text,
.primary-button-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
}

.secondary-button-text {
  color: #6739C6;
}

.primary-button-text {
  color: #FFFFFF;
}
</style> 