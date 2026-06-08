<template>
  <view class="result-container">
    <view class="header" :style="headerPaddingStyle(15)">
      <view class="back-button" @tap="goHome">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="header-title">调查结果</text>
    </view>
    
    <view class="content">
      <view class="result-box">
        <view class="success-icon">
          <TablerIcon name="check" :size="28" color="#ffffff" />
        </view>
        
        <view class="completion-text">
          <text class="main-text">感谢您完成每日调查!</text>
          <text class="sub-text">您的回答已记录，我们将为您提供专业分析。</text>
        </view>
        
        <view class="points-earned">
          <text class="points-number">+50</text>
          <text class="points-text">发分已添加到您的账户</text>
        </view>
        
        <view class="result-summary">
          <text class="summary-title">您的头发状态摘要</text>
          <view class="summary-content">
            <text class="summary-text">{{ generatedSummary }}</text>
          </view>
        </view>
      </view>
      
      <view class="action-buttons">
        <view class="action-button primary" @tap="viewDetailedAnalysis">
          <text>查看详细分析</text>
        </view>
        
        <view class="action-button secondary" @tap="goHome">
          <text>返回首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

// 生成的头发状态摘要
const generatedSummary = ref('正在分析您的头发状态...');

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 返回首页
const goHome = () => {
  uni.reLaunch({
    url: '/pages/index/home'
  });
};

// 查看详细分析
const viewDetailedAnalysis = () => {
  uni.navigateTo({
    url: '/pages/analysis/index'
  });
};

// 根据问卷答案生成摘要
const generateSummary = (answers: Record<number, number>) => {
  if (!answers || Object.keys(answers).length === 0) {
    return '未能获取您的调查数据，请重新完成调查。';
  }
  
  // 问题定义
  const questions = [
    {
      id: 1,
      text: '今天头皮出油程度',
      options: [
        '清爽无油',
        '轻微油腻',
        '明显油腻',
        '严重油腻（可见油光）'
      ]
    },
    {
      id: 2,
      text: '是否有头屑或角质堆积？',
      options: [
        '无',
        '少量细小头屑',
        '大片头屑/块状角质'
      ]
    },
    {
      id: 3,
      text: '脱发情况（对比昨日照片）',
      options: [
        '无异常脱落',
        '轻微增多（10-20根）',
        '明显增多（>30根）'
      ]
    },
    {
      id: 4,
      text: '头皮是否有不适？',
      options: [
        '无',
        '瘙痒',
        '红肿/刺痛',
        '干燥紧绷'
      ]
    },
    {
      id: 5,
      text: '头发整体状态',
      options: [
        '柔顺有光泽',
        '毛躁分叉',
        '脆弱易断'
      ]
    }
  ];
  
  // 判断头皮健康状态
  let oilStatus = '正常';
  let dandruffStatus = '无异常';
  let falloutStatus = '正常';
  let comfortStatus = '舒适';
  let hairStatus = '健康';
  
  // 油脂
  if (answers[1] !== undefined) {
    const oilOptions = ['正常', '轻微偏油', '油性', '严重油性'];
    oilStatus = oilOptions[answers[1]];
  }
  
  // 头屑
  if (answers[2] !== undefined) {
    const dandruffOptions = ['正常', '轻微头屑', '明显头屑'];
    dandruffStatus = dandruffOptions[answers[2]];
  }
  
  // 脱发
  if (answers[3] !== undefined) {
    const falloutOptions = ['正常', '轻微脱发', '明显脱发'];
    falloutStatus = falloutOptions[answers[3]];
  }
  
  // 舒适度
  if (answers[4] !== undefined) {
    const comfortOptions = ['舒适', '轻微不适', '明显不适', '严重不适'];
    comfortStatus = comfortOptions[answers[4]];
  }
  
  // 头发状态
  if (answers[5] !== undefined) {
    const hairOptions = ['健康', '轻微损伤', '明显损伤'];
    hairStatus = hairOptions[answers[5]];
  }
  
  // 生成整体评估
  let overall = '优';
  let recommendations = '';
  
  // 简单评分系统 - 将各项问题的分数加权求和
  const totalScore = 
    (3 - (answers[1] || 0)) * 1 + // 油脂问题，权重1
    (2 - (answers[2] || 0)) * 1.5 + // 头屑问题，权重1.5
    (2 - (answers[3] || 0)) * 2 + // 脱发问题，权重2
    (3 - (answers[4] || 0)) * 1.5 + // 舒适度，权重1.5
    (2 - (answers[5] || 0)) * 1; // 头发状态，权重1
  
  // 最高可能分数 = 3*1 + 2*1.5 + 2*2 + 3*1.5 + 2*1 = 13
  const scorePercentage = (totalScore / 13) * 100;
  
  if (scorePercentage >= 80) {
    overall = '优';
    recommendations = '继续保持当前的护理方式，定期进行头皮检测。';
  } else if (scorePercentage >= 60) {
    overall = '良';
    recommendations = '注意调整洗发频率，选择适合您头皮类型的产品。';
  } else if (scorePercentage >= 40) {
    overall = '中';
    recommendations = '建议您增加头皮护理频率，使用针对性产品进行改善。';
  } else {
    overall = '差';
    recommendations = '您的头皮状况需要专业护理，建议咨询专业人士或使用治疗型产品。';
  }
  
  return `您的头皮油脂状况${oilStatus}，头屑情况${dandruffStatus}，脱发情况${falloutStatus}，头皮舒适度${comfortStatus}，头发整体${hairStatus}。综合评估为${overall}。${recommendations}`;
};

onMounted(() => {
  try {
    const savedAnswers = uni.getStorageSync('questionnaire_results');
    if (savedAnswers) {
      const parsedAnswers = JSON.parse(savedAnswers);
      // 生成摘要
      generatedSummary.value = generateSummary(parsedAnswers);
    }
  } catch (e) {
    console.error('获取问卷结果失败', e);
    generatedSummary.value = '获取数据失败，请重新完成调查。';
  }
});
</script>

<style>
.result-container {
  min-height: 100vh;
  background-color: #fff;
}

.header {
  display: flex;
  padding: 15px; /* padding-top is set dynamically via inline style */
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
  padding: 20px;
}

.result-box {
  background-color: #f9f7ff;
  border-radius: 15px;
  padding: 30px 20px;
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon {
  width: 60px;
  height: 60px;
  background-color: #8b5cf6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.icon-text {
  color: #fff;
  font-size: 30px;
  font-weight: bold;
}

.completion-text {
  text-align: center;
  margin-bottom: 20px;
}

.main-text {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.sub-text {
  font-size: 14px;
  color: #666;
  display: block;
}

.points-earned {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
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

.points-number {
  font-size: 36px;
  font-weight: bold;
  color: #8b5cf6;
}

.points-text {
  font-size: 14px;
  color: #666;
}

.result-summary {
  width: 100%;
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.summary-content {
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.summary-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.action-button {
  padding: 15px;
  border-radius: 30px;
  text-align: center;
}

.action-button.primary {
  background-color: #8b5cf6;
}

.action-button.secondary {
  background-color: transparent;
  border: 1px solid #8b5cf6;
}

.action-button.primary text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.action-button.secondary text {
  color: #8b5cf6;
  font-size: 16px;
  font-weight: 500;
}
</style> 