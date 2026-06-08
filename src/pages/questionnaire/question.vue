<template>
  <view class="question-container">
    <!-- 移除状态栏，直接开始内容 -->
    <view class="content">
      <!-- 进度条滑块 - 移动到最顶部 -->
      <view class="progress-slider" :style="headerPaddingStyle(20)">
        <view 
          v-for="i in 5" 
          :key="i"
          class="progress-dot"
          :class="{ 'active': i <= questionId, 'current': i === questionId }"
        ></view>
      </view>
      
      <!-- 顶部区域：问题编号和跳过链接 -->
      <view class="top-section">
        <view class="question-header">
          <text class="question-number">{{ $t('questionnaire.questionNumber', [questionId, 5]) }}</text>
          <!-- <view class="skip-link" @tap="skipQuestionnaire">
            <text class="skip-text">{{ $t('questionnaire.skipForNow') }}</text>
            <TablerIcon name="arrow-right" :size="16" class="skip-icon" />
          </view> -->
        </view>
      </view>
      
      <!-- 问题文本 -->
      <view class="question-text">
        <text>{{ $t(`questionnaire.q${questionId}.text`) }}</text>
      </view>
      
      <!-- 选项列表 -->
      <view class="options">
        <view 
          v-for="(option, index) in getOptionsForCurrentQuestion()"
          :key="index"
          class="option-item"
          :class="{ 'selected': selectedOption === index }"
          @tap="selectOption(index)"
        >
          <text class="option-text">{{ option }}</text>
        </view>
      </view>
      
      <!-- 底部按钮区域 -->
      <view class="bottom-buttons">
        <view class="button-group">
          <view class="back-button" @tap="goBack">
            <text>{{ $t('questionnaire.back') }}</text>
          </view>
          <view class="next-button" :class="{ 'active': selectedOption !== null }" @tap="nextQuestion">
            <text>{{ isLastQuestion ? $t('questionnaire.finish') : $t('questionnaire.next') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useI18n } from 'vue-i18n';
import { post } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';

const { t } = useI18n();
const userStore = useUserStore();

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 问题ID
const questionId = ref(1);
const selectedOption = ref<number | null>(null);
const answers = ref<Record<number, number>>({});
// 存储stage、position和image参数
const stageParam = ref('1');
const positionParam = ref('前额');
const imageParam = ref('');

// 进度百分比
const progressPercentage = computed(() => {
  return `${(questionId.value / 5) * 100}%`;
});

// 是否为最后一个问题
const isLastQuestion = computed(() => {
  return questionId.value === 5;
});

// 获取当前问题的选项
const getOptionsForCurrentQuestion = () => {
  const options = [];
  let i = 0;
  let optionKey = `questionnaire.q${questionId.value}.option${i}`;
  
  while (t(optionKey) !== optionKey) { // 当翻译键不存在时，会返回键本身
    options.push(t(optionKey));
    i++;
    optionKey = `questionnaire.q${questionId.value}.option${i}`;
  }
  
  return options;
};

// 选择选项
const selectOption = (index: number) => {
  selectedOption.value = index;
  answers.value[questionId.value] = index;
  console.log(`问题${questionId.value}选择了选项${index}，当前answers:`, answers.value);
  
  // 每次选择都保存到本地存储
  saveQuestionnaireResults();
};

// 跳过问卷
const skipQuestionnaire = () => {
  // 跳转到分析页面，不提交问卷数据
  const data = {
    userId: userStore.userInfo.userId,
    oil: 0,
    scurfOrKeratin: 0,
    hairLoss: 0,
    discomfort: 0,
    overall: 0,
    stage: stageParam.value,
    position: positionParam.value,
    image: imageParam.value
  };
  
  // uni.navigateTo({
  //   url: `/pages/trichoscan/phone-cam-analysis?${serializeParams(data)}`
  // });
  uni.navigateTo({
    url: `/pages/selfie/results?${serializeParams(data)}`
  });
};

// 下一题
const nextQuestion = () => {
  if (selectedOption.value === null) {
    return;
  }
  
  // 再次确保当前选择被保存
  answers.value[questionId.value] = selectedOption.value;
  console.log(`进入下一题前，当前问题${questionId.value}的答案:`, selectedOption.value);
  console.log('所有答案:', answers.value);
  
  if (isLastQuestion.value) {
    // 保存问卷结果
    saveQuestionnaireResults();
    
    // 提交数据到服务器
    submitSelfieData();
  } else {
    // 保存当前的答案
    saveQuestionnaireResults();
    
    const newId = questionId.value + 1;
    
    // 使用打开新页面的方式进入下一题，这样可以保持状态
    uni.redirectTo({
      url: `/pages/questionnaire/question?id=${newId}&stage=${stageParam.value}&position=${positionParam.value}&image=${encodeURIComponent(imageParam.value)}`
    });
  }
};

// 提交自拍数据
const submitSelfieData = async () => {
  try {
    // 显示加载提示
    uni.showLoading({
      title: t('common.loading')
    });

    // 获取App传递的参数
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    // @ts-ignore
    const options = currentPage.$page?.options || {};
    
    // 准备提交的数据
    const data = {
      userId: userStore.userInfo.userId,
      oil: answers.value[1] !== undefined ? answers.value[1] : 0, // 第一个问题的答案
      scurfOrKeratin: answers.value[2] !== undefined ? answers.value[2] : 0, // 第二个问题的答案
      hairLoss: answers.value[3] !== undefined ? answers.value[3] : 0, // 第三个问题的答案
      discomfort: answers.value[4] !== undefined ? answers.value[4] : 0, // 第四个问题的答案
      overall: answers.value[5] !== undefined ? answers.value[5] : 0, // 第五个问题的答案
      stage: stageParam.value, // 使用从参数获取的stage值
      position: positionParam.value, // 使用从参数获取的position值
      image: imageParam.value, // 使用从参数获取的image值
      extInfo: {
        oil: answers.value[1] !== undefined ? answers.value[1] : 0,
        scurfOrKeratin: answers.value[2] !== undefined ? answers.value[2] : 0,
        hairLoss: answers.value[3] !== undefined ? answers.value[3] : 0,
        discomfort: answers.value[4] !== undefined ? answers.value[4] : 0,
        overall: answers.value[5] !== undefined ? answers.value[5] : 0
      }
    };
    
    console.log('提交的数据:', data);
    console.log('answers数据:', answers.value);
    
    // 调用接口提交数据
    const response = await post('/user/addSelfie', data);
    
    // 隐藏加载提示
    uni.hideLoading();
    
    if (response) {
      // 跳转到分析页面，并传递参数
      // uni.navigateTo({
      //   url: `/pages/trichoscan/phone-cam-analysis?${serializeParams(data)}`
      // });
      uni.navigateTo({
        url: `/pages/selfie/results?${serializeParams(data)}`
      });
    } else {
      uni.showToast({
        title: t('questionnaire.submitError'),
        icon: 'none',
        duration: 2000
      });
    }
  } catch (error) {
    console.error('提交数据失败:', error);
    uni.hideLoading();
    
    uni.showToast({
      title: t('questionnaire.submitError'),
      icon: 'none',
      duration: 2000
    });
  }
};

// 将参数序列化为URL查询字符串
const serializeParams = (params: Record<string, any>) => {
  return Object.keys(params)
    .map(key => {
      const value = key === 'extInfo' && typeof params[key] === 'object'
        ? JSON.stringify(params[key])
        : params[key];
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

// 返回上一页
const goBack = () => {
  if (questionId.value > 1) {
    // 保存当前的答案
    saveQuestionnaireResults();
    // 使用redirectTo而不是navigateTo，这样可以保留之前的状态
    uni.redirectTo({
      url: `/pages/questionnaire/question?id=${questionId.value - 1}&stage=${stageParam.value}&position=${positionParam.value}&image=${encodeURIComponent(imageParam.value)}`
    });
  } else {
    uni.navigateBack();
  }
};

// 保存问卷结果
const saveQuestionnaireResults = () => {
  try {
    uni.setStorageSync('questionnaire_results', JSON.stringify(answers.value));
  } catch (e) {
    console.error(t('questionnaire.saveError'), e);
  }
};

// 从URL参数获取问题ID和stage、position、image参数
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const options = currentPage.$page?.options || {};
  
  // 获取问题ID
  if (options.id) {
    questionId.value = parseInt(options.id);
  }
  
  // 获取stage、position和image参数
  if (options.stage) {
    stageParam.value = options.stage;
  }
  
  if (options.position) {
    positionParam.value = options.position;
  }
  
  if (options.image) {
    imageParam.value = decodeURIComponent(options.image);
  }
  
  console.log('获取到的参数:', { 
    id: questionId.value, 
    stage: stageParam.value, 
    position: positionParam.value,
    image: imageParam.value
  });
  
  // 如果是第一个问题且没有缓存，清空之前的答案
  // 但如果有缓存，我们保留它
  const savedAnswers = uni.getStorageSync('questionnaire_results');
  if (questionId.value === 1 && !savedAnswers) {
    answers.value = {};
    saveQuestionnaireResults();
  }
  
  // 尝试从缓存恢复答案
  try {
    if (savedAnswers) {
      const parsedAnswers = JSON.parse(savedAnswers);
      answers.value = parsedAnswers;
      
      // 如果当前问题有保存的答案，恢复选中状态
      if (answers.value[questionId.value] !== undefined) {
        selectedOption.value = answers.value[questionId.value];
      }
      
      console.log('从缓存恢复的答案:', answers.value);
    }
  } catch (e) {
    console.error(t('questionnaire.loadError'), e);
  }
});
</script>

<style>
.question-container {
  min-height: 100vh;
  background-color: #fff;
  padding: 0;
  margin: 0;
}

.content {
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部区域 */
.top-section {
  padding: 16px;
  padding-top: 20px; /* 减少顶部间距，因为进度条已经在最上面了 */
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-number {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #878D96;
}

.skip-link {
  display: flex;
  align-items: center;
  gap: 4px;
}

.skip-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  color: #7622FF;
}

.skip-icon {
  font-size: 16px;
  color: #7622FF;
}

/* 问题文本 */
.question-text {
  padding: 0 16px;
  margin-bottom: 32px;
}

.question-text text {
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  font-size: 28px;
  line-height: 36px;
  color: #000000;
}

/* 进度条滑块 */
.progress-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 20px 16px;
  /* padding-top is set dynamically via inline style (20px + statusBarHeight) */
}

.progress-dot {
  width: 16px;
  height: 4px;
  background-color: #E0E0E0;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.progress-dot.active {
  background-color: #7622FF;
}

.progress-dot.current {
  width: 48px;
  background-color: #7622FF;
}

/* 选项列表 */
.options {
  flex: 1;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border: 1px solid #7622FF;
  border-radius: 2px;
  background-color: #fff;
  transition: all 0.3s ease;
  cursor: pointer;
}

.option-item.selected {
  background-color: #7622FF;
}

.option-text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #7622FF;
  text-align: center;
  width: 100%;
}

.option-item.selected .option-text {
  color: #fff;
}

/* 底部按钮区域 */
.bottom-buttons {
  padding: 16px;
  padding-bottom: 40px; /* 为底部指示器留出空间 */
}

.button-group {
  display: flex;
  gap: 16px;
}

.back-button, .next-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  height: 56px;
  border: 1px solid #7622FF;
  border-radius: 2px;
  background-color: #fff;
  transition: all 0.3s ease;
}

.back-button text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #7622FF;
}

.next-button {
  background-color: #E0E0E0;
  border-color: #E0E0E0;
}

.next-button text {
  font-family: 'Archivo', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  letter-spacing: 0.25px;
  text-transform: uppercase;
  color: #fff;
}

.next-button.active {
  background-color: #7622FF;
  border-color: #7622FF;
}
</style> 