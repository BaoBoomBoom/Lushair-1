<template>
  <view class="questionnaire-page">
    <ScanAnalyzingOverlay :visible="isSubmitting" />

    <view class="questionnaire-topbar" :style="headerPaddingStyle(0)">
      <view class="questionnaire-back" @tap="goBack">
        <TablerIcon name="chevron-left" :size="20" color="#1A1228" />
      </view>
      <text class="questionnaire-topbar-title">{{ $t('pages.questionnaire') }}</text>
      <view class="questionnaire-topbar-spacer" />
    </view>

    <view class="questionnaire-body" :style="contentMarginStyle(48)">
      <view class="questionnaire-progress">
        <view
          v-for="i in 5"
          :key="i"
          class="questionnaire-progress-seg"
          :class="{ active: i <= questionId, current: i === questionId }"
        />
      </view>

      <text class="questionnaire-step">{{ $t('questionnaire.questionNumber', [questionId, 5]) }}</text>
      <text class="questionnaire-question">{{ $t(`questionnaire.q${questionId}.text`) }}</text>

      <view class="questionnaire-options">
        <view
          v-for="(option, index) in getOptionsForCurrentQuestion()"
          :key="index"
          class="questionnaire-option"
          :class="{ selected: selectedOption === index }"
          @tap="selectOption(index)"
        >
          <view class="questionnaire-option-radio">
            <view v-if="selectedOption === index" class="questionnaire-option-radio-dot" />
          </view>
          <text class="questionnaire-option-text">{{ option }}</text>
        </view>
      </view>

      <view class="questionnaire-actions">
        <button v-if="questionId > 1" class="questionnaire-secondary-btn" @tap="goBack">
          {{ $t('questionnaire.back') }}
        </button>
        <button
          class="questionnaire-primary-btn"
          :class="{ disabled: selectedOption === null }"
          :disabled="selectedOption === null"
          @tap="nextQuestion"
        >
          {{ isLastQuestion ? $t('questionnaire.finish') : $t('questionnaire.next') }}
        </button>
      </view>
    </view>

    <ShellDisclaimer compact />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { post } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ShellDisclaimer from '@/components/layout/ShellDisclaimer.vue';
import ScanAnalyzingOverlay from '@/components/scan/ScanAnalyzingOverlay.vue';
import { useStatusBar } from '@/composables/useStatusBar';

const { t } = useI18n();
const userStore = useUserStore();
const { headerPaddingStyle, contentMarginStyle } = useStatusBar();

const questionId = ref(1);
const selectedOption = ref<number | null>(null);
const answers = ref<Record<number, number>>({});
const stageParam = ref('1');
const positionParam = ref('前额');
const imageParam = ref('');
const isSubmitting = ref(false);
const isAdvancing = ref(false);

const isLastQuestion = computed(() => questionId.value === 5);

const getOptionsForCurrentQuestion = () => {
  const options: string[] = [];
  let i = 0;
  let optionKey = `questionnaire.q${questionId.value}.option${i}`;

  while (t(optionKey) !== optionKey) {
    options.push(t(optionKey));
    i += 1;
    optionKey = `questionnaire.q${questionId.value}.option${i}`;
  }

  return options;
};

const selectOption = (index: number) => {
  if (isAdvancing.value || isSubmitting.value) return;

  selectedOption.value = index;
  answers.value[questionId.value] = index;
  saveQuestionnaireResults();

  isAdvancing.value = true;
  setTimeout(() => {
    advanceQuestion();
    isAdvancing.value = false;
  }, 280);
};

const advanceQuestion = () => {
  if (selectedOption.value === null) return;

  answers.value[questionId.value] = selectedOption.value;

  if (isLastQuestion.value) {
    saveQuestionnaireResults();
    submitSelfieData();
    return;
  }

  saveQuestionnaireResults();
  const newId = questionId.value + 1;
  uni.redirectTo({
    url: `/pages/questionnaire/question?id=${newId}&stage=${stageParam.value}&position=${positionParam.value}&image=${encodeURIComponent(imageParam.value)}`,
  });
};

const nextQuestion = () => {
  if (selectedOption.value === null || isAdvancing.value) return;
  advanceQuestion();
};

const submitSelfieData = async () => {
  try {
    isSubmitting.value = true;

    const data = {
      userId: userStore.userInfo.userId,
      oil: answers.value[1] ?? 0,
      scurfOrKeratin: answers.value[2] ?? 0,
      hairLoss: answers.value[3] ?? 0,
      discomfort: answers.value[4] ?? 0,
      overall: answers.value[5] ?? 0,
      stage: stageParam.value,
      position: positionParam.value,
      image: imageParam.value,
      extInfo: {
        oil: answers.value[1] ?? 0,
        scurfOrKeratin: answers.value[2] ?? 0,
        hairLoss: answers.value[3] ?? 0,
        discomfort: answers.value[4] ?? 0,
        overall: answers.value[5] ?? 0,
      },
    };

    const response = await post('/user/addSelfie', data);
    isSubmitting.value = false;

    if (response) {
      const recordId = (response as any)?.id || (response as any)?.data?.id || '';
      const extInfo = JSON.stringify(data.extInfo);
      uni.redirectTo({
        url: `/pages/Selfie/results?position=${encodeURIComponent(data.position)}&stage=${data.stage}&image=${encodeURIComponent(data.image)}&extInfo=${encodeURIComponent(extInfo)}&userId=${encodeURIComponent(data.userId)}${recordId ? `&id=${encodeURIComponent(recordId)}` : ''}`,
      });
    } else {
      uni.showToast({ title: t('questionnaire.submitError'), icon: 'none' });
    }
  } catch (error) {
    console.error('submitSelfieData failed:', error);
    isSubmitting.value = false;
    uni.showToast({ title: t('questionnaire.submitError'), icon: 'none' });
  }
};

const serializeParams = (params: Record<string, any>) =>
  Object.keys(params)
    .map((key) => {
      const value =
        key === 'extInfo' && typeof params[key] === 'object'
          ? JSON.stringify(params[key])
          : params[key];
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

const goBack = () => {
  if (questionId.value > 1) {
    saveQuestionnaireResults();
    uni.redirectTo({
      url: `/pages/questionnaire/question?id=${questionId.value - 1}&stage=${stageParam.value}&position=${positionParam.value}&image=${encodeURIComponent(imageParam.value)}`,
    });
  } else {
    uni.navigateBack();
  }
};

const saveQuestionnaireResults = () => {
  try {
    uni.setStorageSync('questionnaire_results', JSON.stringify(answers.value));
  } catch (e) {
    console.error(t('questionnaire.saveError'), e);
  }
};

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore
  const options = currentPage.$page?.options || {};

  if (options.id) questionId.value = parseInt(options.id, 10);
  if (options.stage) stageParam.value = options.stage;
  if (options.position) positionParam.value = options.position;
  if (options.image) imageParam.value = decodeURIComponent(options.image);

  const savedAnswers = uni.getStorageSync('questionnaire_results');
  if (questionId.value === 1 && !savedAnswers) {
    answers.value = {};
    saveQuestionnaireResults();
  }

  try {
    if (savedAnswers) {
      answers.value = JSON.parse(savedAnswers);
      if (answers.value[questionId.value] !== undefined) {
        selectedOption.value = answers.value[questionId.value];
      }
    }
  } catch (e) {
    console.error(t('questionnaire.loadError'), e);
  }
});
</script>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.questionnaire-page {
  min-height: 100vh;
  background: $shell-bg2;
  box-sizing: border-box;
}

.questionnaire-topbar {
  display: flex;
  align-items: center;
  padding: 0 16px 12px;
  background: $shell-bg2;
}

.questionnaire-back,
.questionnaire-topbar-spacer {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.questionnaire-topbar-title {
  flex: 1;
  text-align: center;
  font-family: $shell-font-display;
  font-size: 15px;
  font-weight: 600;
  color: $shell-text;
}

.questionnaire-body {
  padding: 8px 16px 24px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.questionnaire-progress {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
}

.questionnaire-progress-seg {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: #e8e4f4;
  transition: background 0.25s ease;

  &.active {
    background: rgba(107, 33, 200, 0.35);
  }

  &.current {
    background: $shell-primary;
  }
}

.questionnaire-step {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: $shell-muted;
  margin-bottom: 8px;
}

.questionnaire-question {
  display: block;
  font-family: $shell-font-display;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  color: $shell-text;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

.questionnaire-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.questionnaire-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid $shell-border;
  background: $shell-bg;
  box-shadow: $shell-shadow;
  transition: border-color 0.2s ease, background 0.2s ease;

  &.selected {
    border-color: $shell-primary;
    background: #faf5ff;
  }
}

.questionnaire-option-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #d8d2ea;
  margin-top: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  .selected & {
    border-color: $shell-primary;
  }
}

.questionnaire-option-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $shell-primary;
}

.questionnaire-option-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: $shell-text;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
  text-align: left;
}

.questionnaire-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  padding-bottom: 8px;
}

.questionnaire-primary-btn,
.questionnaire-secondary-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-family: $shell-font-display;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  text-transform: none;
  letter-spacing: normal;

  &::after {
    border: none;
  }
}

.questionnaire-primary-btn {
  background: $shell-primary;
  color: #fff;
  border: none;

  &.disabled {
    opacity: 0.45;
  }
}

.questionnaire-secondary-btn {
  background: $shell-bg;
  color: $shell-primary;
  border: 1px solid $shell-border;
}

.questionnaire-actions .questionnaire-primary-btn:only-child {
  flex: 1;
}
</style>
