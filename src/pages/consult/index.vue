<template>
  <view class="chat-container">
    <!-- 顶部导航栏 -->
    <view class="header">
      <!-- <view class="back-button">
        <text class="back-icon">&#8249;</text>
      </view> -->
      <view class="title">{{ $t('consult.title') }}</view>
    </view>
    
    <!-- 固定在顶部的信息卡片区域 -->
    <view class="fixed-info-cards" ref="infoCardsRef" v-show="healthData.totalScore > 0">
      <!-- 折叠控制按钮 -->
      <view class="collapse-toggle" @tap="toggleCollapse">
        <text>{{ isCollapsed ? $t('common.expand') : $t('common.collapse') }}</text>
        <TablerIcon :name="isCollapsed ? 'chevron-down' : 'chevron-up'" :size="14" class="toggle-icon" />
      </view>
      
      <view v-show="!isCollapsed" class="info-cards-container">
        <!-- 数据卡片1 - 紫色 -->
        <view class="info-card purple-card">
          <!-- <view class="card-date">2024.03.20</view> -->
          <view class="card-title">{{ $t('infoCards.latestData') }}</view>
          <view class="card-content">
            <view class="data-row">
              <text class="data-label">{{ $t('infoCards.mainStatus') }}</text>
              <text class="data-value"> {{ $t('home.warningDetected', [alertCount]) }}</text>
            </view>
            <view class="data-row">
              <text class="data-label">{{ $t('infoCards.hairLevel') }}</text>
              <text class="data-value">{{healthData.totalScore}}/100</text>
            </view>
          </view>
        </view>
        
        <!-- 数据卡片2 - 蓝色 -->
        <view class="info-card blue-card">
          <!-- <view class="card-date">2024.03.20</view> -->
          <view class="card-title">{{ $t('infoCards.aiAnalysis') }}</view>
          <view class="card-content">
            <view class="data-row">
              <text class="data-label">{{ $t('infoCards.scalpCondition') }}</text>
              <text class="data-value">{{ $t('home.excellentThan', [summaryAvailable ? (latestSummaryData?.precede || 0) : 0]) }}</text>
            </view>
            <!-- <view class="data-row">
              <text class="data-label">{{ $t('infoCards.causeProportion') }} 62%</text>
              <text class="data-value">{{ $t('consult.poorCirculation') }}</text>
            </view> -->
          </view>
        </view>
        
        <!-- 数据卡片3 - 黄绿色 -->
        <!-- <view class="info-card green-card">
          <view class="card-date">2024.03.20</view>
          <view class="card-title">{{ $t('infoCards.peerComparison') }}</view>
          <view class="card-content">
            <view class="data-row">
              <text class="data-label">{{ $t('infoCards.peerVolume') }}</text>
              <text class="data-value">65%</text>
            </view>
            <view class="data-row">
              <text class="data-label">{{ $t('infoCards.peerDensity') }}</text>
              <text class="data-value highlight">85%</text>
            </view>
          </view>
        </view> -->
      </view>
      
      <!-- 折叠后只显示最后一个卡片 -->
      <view v-show="isCollapsed" class="info-cards-container collapsed">
        <view class="info-card blue-card">
          <!-- <view class="card-date">2024.03.20</view> -->
          <view class="card-title">{{ $t('infoCards.aiAnalysis') }}</view>
          <view class="card-content">
            <view class="data-row">
              <text class="data-label">{{ $t('infoCards.scalpCondition') }}</text>
              <text class="data-value">{{ $t('home.excellentThan', [summaryAvailable ? (latestSummaryData?.precede || 0) : 0]) }}</text>
            </view>
            <!-- <view class="data-row">
              <text class="data-label">{{ $t('infoCards.causeProportion') }} 62%</text>
              <text class="data-value">{{ $t('consult.poorCirculation') }}</text>
            </view> -->
          </view>
        </view>
      </view>
    </view>
    
    <!-- 聊天内容区 -->
    <div 
      class="chat-messages"
      ref="chatMessagesRef"
      :class="{ 'collapsed': isCollapsed }"
    >
      <view class="messages-container">
        <view v-for="(message, index) in chatMessages" :key="index" 
              :id="'msg-' + index"
              class="message-wrapper">
          <!-- 时间分隔 -->
          <view v-if="message.showTime" class="time-divider">
            {{ message.time }}
          </view>
          
          <!-- 消息气泡 -->
          <view :class="['message', message.type === 'user' ? 'message-user' : 'message-ai']">
            <!-- AI头像 -->
            <view v-if="message.type === 'ai'" class="avatar ai-avatar">
              <image src="/static/ai-avatar.svg" mode="aspectFill"></image>
            </view>
            
            <!-- 消息内容 -->
            <view :class="['bubble', message.type === 'user' ? 'bubble-user' : 'bubble-ai']">
              <!-- 用户消息使用普通文本 -->
              <text v-if="message.type === 'user'">{{ message.content }}</text>
              <!-- AI 消息使用 Markdown 渲染 -->
              <MarkdownRenderer v-else :content="message.content" />
              
              <!-- 语音消息 (仅AI消息可能带有语音) -->
              <view v-if="message.type === 'ai' && message.audioUrl" class="audio-player">
                <TablerIcon name="play" :size="12" color="#6b21c8" class="play-icon" />
                <view class="audio-wave">
                  <image src="/static/audio-wave.svg" mode="aspectFit"></image>
                </view>
                <text class="duration">{{ message.audioDuration }}</text>
              </view>
            </view>
            
            <!-- 用户头像 -->
            <view v-if="message.type === 'user'" class="avatar user-avatar">
              <ShellUserIcon variant="chat" />
            </view>
          </view>
        </view>
        
        <!-- 用于显示AI正在输入的状态 -->
        <view v-if="isAiTyping" class="message-wrapper" id="typing-indicator">
          <view class="message message-ai">
            <view class="avatar ai-avatar">
              <image src="/static/ai-avatar.svg" mode="aspectFill"></image>
            </view>
            <view class="bubble bubble-ai">
              <MarkdownRenderer :content="typingContent" />
            </view>
          </view>
        </view>
        
        <!-- 占位元素确保滚动到底部时，最新消息在输入框上方 -->
        <view class="scroll-bottom-anchor" id="scroll-bottom"></view>
      </view>
    </div>
    
    <!-- 底部固定区域，包含输入框和安全区域 -->
    <view class="fixed-bottom">
      <!-- 底部输入区域 -->
      <view class="input-container">
        <view class="input-wrapper">
          <input 
            class="message-input" 
            type="text" 
            v-model="userInput" 
            :placeholder="$t('consult.inputPlaceholder')"
            @confirm="sendMessage"
            :adjust-position="false"
            :cursor-spacing="10"
          />
          <button 
            class="send-button" 
            :disabled="!userInput.trim()" 
            @tap="sendMessage"
          >
            <text class="send-icon">&#10148;</text>
          </button>
        </view>
      </view>
      
      <!-- 底部安全区域，为tabBar预留空间 -->
      <view class="safe-area-bottom"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch, onUnmounted } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import MarkdownRenderer from '../../components/MarkdownRenderer.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ShellUserIcon from '@/components/icons/ShellUserIcon.vue';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request'
import { getLocale } from '@/i18n.js';
import { getAchievementTracker } from '@/utils/achievementTracker';
import env from '@/utils/env';
import { toastIcon } from 'wot-design-uni/components/wd-toast';

const userStore = useUserStore();
const { userInfo } = userStore;

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function,
  changeTabToChat: Function
};

// 健康度数据
const healthData = ref({
  scalpHealth: '0',
  follicleHealth: '0',
  hairHealth: '0',
  totalScore: 0,
  hasData: false,
  loading: true
});

// 初始化i18n
const { t } = useI18n();

// 用户ID和聊天ID (实际应用中可能通过其他方式获取)
// const userId = ref('lusHaircc9005ec');//ref('userId_' + Math.random().toString(16).slice(2));
// const chatId = ref('chatId_' + Math.random().toString(16).slice(2));
const chatId = ref('chatId_' + userInfo.userId);

// 信息卡片折叠状态
const isCollapsed = ref(false);

const alertCount = ref(0);
const alertDescriptions = ref<string[]>([]);
const summaryAvailable = ref(false)
const latestSummaryData = ref<{ precede?: number }>({})

// DOM引用
const infoCardsRef = ref<any>(null);
const chatMessagesRef = ref<any>(null);

// 折叠/展开信息卡片
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  
  // 更新CSS变量，根据折叠状态调整聊天区域的位置
  nextTick(() => {
    updateChatAreaPosition();
  });
};

// 聊天记录
const chatMessages = ref<any[]>([]);

// 用户输入
const userInput = ref('');
// 是否正在加载回复
const isAiTyping = ref(false);
// AI流式输出的内容
const typingContent = ref('');
// 滚动位置ID
const scrollIntoView = ref('scroll-bottom');
// 滚动位置（用于小程序scroll-view）
const scrollTop = ref(0);
// 滚动动画key，用于强制触发滚动更新
const scrollAnimationKey = ref(0);
// 内容容器的实际高度
const containerHeight = ref(0);
// 滚动视图的高度
const scrollViewHeight = ref(0);
// H5滚动验证定时器
const scrollVerifyTimer = ref<any>(null);

// 监听消息列表变化，自动滚动到底部
watch([chatMessages], async () => {
  // 等待DOM更新后再滚动
  await nextTick();
  await scrollToBottom();
}, { deep: true });

// 监听流式输出内容变化，自动滚动到输入指示器
watch(typingContent, async () => {
  if (isAiTyping.value && typingContent.value) {
    // 使用精确高度计算的滚动方法
    // 节流：每50个字符或前100个字符内每次都滚动
    const contentLength = typingContent.value.length;
    if (contentLength <= 100 || contentLength % 50 === 0) {
      await forceScrollToBottom();
    }
  }
}, { immediate: true });


// 更新聊天区域位置的函数
const updateChatAreaPosition = () => {
  // uni-app环境中使用不同的DOM访问方式
  // #ifdef H5
  // 在H5环境中使用普通的DOM方法
  const infoCardsEl = document.querySelector('.fixed-info-cards');
  if (infoCardsEl) {
    const height = infoCardsEl.getBoundingClientRect().height;
    const collapsedHeight = isCollapsed.value ? height : 220;
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--info-cards-height', `${height}px`);
    document.documentElement.style.setProperty('--info-cards-collapsed-height', `${collapsedHeight}px`);
  }
  // #endif
  
  // #ifndef H5
  // 在非H5环境中使用uni接口
  uni.createSelectorQuery()
    .select('.fixed-info-cards')
    .boundingClientRect(data => {
      if (data) {
        // 确保处理NodeInfo可能是数组的情况
        const nodeInfo = Array.isArray(data) ? data[0] : data;
        if (nodeInfo) {
          const height = nodeInfo.height || 220;
          const collapsedHeight = isCollapsed.value ? height : 220;
          
          // 对于非H5环境，使用内联样式而不是CSS变量
          const chatMessagesEl = chatMessagesRef.value;
          if (chatMessagesEl) {
            const topMargin = isCollapsed.value ? 44 + collapsedHeight : 44 + height;
            const viewHeight = uni.getSystemInfoSync().windowHeight - topMargin - 68 - 50;
            
            chatMessagesEl.style.marginTop = `${topMargin}px`;
            chatMessagesEl.style.height = `${viewHeight}px`;
          }
        }
      }
    })
    .exec();
  // #endif
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim()) return;
  
  const currentTime = new Date();
  const timeString = formatTime(currentTime);
  
  // 添加用户消息
  chatMessages.value.push({
    type: 'user',
    content: userInput.value,
    time: timeString,
    showTime: shouldShowTime(currentTime)
  });
  
  // 清空输入框
  const userMessage = userInput.value;
  userInput.value = '';
  
  // 记录咨询成就
  try {
    const tracker = getAchievementTracker();
    tracker.trackConsultation();
    tracker.trackFeatureUsage('ai_consultation');
  } catch (error) {
    console.error('记录成就失败:', error);
  }
  
  // 等待DOM更新后自动滚动到底部
  await nextTick();
  await scrollToBottom();
  
  // 发送到服务器并获取回复
  await getAiResponse(userMessage);
};

// 获取AI回复
const getAiResponse = async (content: string) => {
  isAiTyping.value = true;
  typingContent.value = '';
  
  // 立即滚动到底部显示输入指示器
  await nextTick();
  await scrollToBottom();

  const currentLanguage = getLocale();

  try {
    const requestData = {
      multiRound: true,
      userId: userInfo.userId,
      chatId: chatId.value,
      content: content,
      language: currentLanguage || 'en'
    };
    
    // 使用统一的API配置系统
    const { apiFetch } = await import('@/utils/apiHelper');
    
    const response = await apiFetch.aiChat(requestData);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    // 处理流式响应
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;
    let lastScrollTime = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // 解码并添加到当前响应
      const chunk = decoder.decode(value, { stream: true });
      typingContent.value += chunk;
      chunkCount++;
      
      // 优化滚动频率：使用精确高度计算，每200ms最多滚动一次
      const now = Date.now();
      if (now - lastScrollTime > 200) { // 降低频率到200ms，因为高度计算需要时间
        await forceScrollToBottom();
        lastScrollTime = now;
      }
    }
    
    // 将完整响应添加到消息列表
    const currentTime = new Date();
    
    chatMessages.value.push({
      type: 'ai',
      content: typingContent.value,
      time: formatTime(currentTime),
      showTime: shouldShowTime(currentTime)
    });
    
    // 等待DOM更新后滚动到新消息
    await nextTick();
    await scrollToBottom();
    
  } catch (error) {
    console.error('Error:', error);
    
    // 添加错误消息
    chatMessages.value.push({
      type: 'ai',
      content: t('consult.errorMessage'),
      time: formatTime(new Date()),
      showTime: true
    });
    
    // 滚动到错误消息
    await nextTick();
    await scrollToBottom();
    
  } finally {
    isAiTyping.value = false;
    typingContent.value = '';
    await scrollToBottom();
  }
};

// 加载更多历史消息 (上拉加载)
const loadMoreMessages = () => {
  // 实际场景中可从服务器获取更多历史消息
  console.log('Loading more messages...');
};

// 时间格式化
const formatTime = (date: Date) => {
  const now = new Date();
  
  // 获取小时和分钟
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // 转换为12小时制
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // 格式化时间字符串
  const timeString = hour12.toString().padStart(2, '0') + ':' + 
                    minutes.toString().padStart(2, '0') + ' ' + ampm;
  
  // 判断是否为今天
  if (date.toDateString() === now.toDateString()) {
    return timeString;
  }
  
  // 判断是否为昨天
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return t('common.yesterday') + ' ' + timeString;
  }
  
  // 其他日期
  return date.toLocaleDateString() + ' ' + timeString;
};

// 判断是否显示时间
const shouldShowTime = (date: Date) => {
  // 如果是第一条消息，或者与上一条消息间隔超过5分钟，则显示时间
  if (chatMessages.value.length === 0) return true;
  
  const lastMessage = chatMessages.value[chatMessages.value.length - 1];
  const lastTime = new Date(lastMessage.time);
  
  // 如果时间不能正确解析，则显示时间
  if (isNaN(lastTime.getTime())) return true;
  
  // 如果间隔超过5分钟，则显示时间
  return (date.getTime() - lastTime.getTime()) > 5 * 60 * 1000;
};

// 获取实际内容高度并精确滚动
const getContainerHeightAndScroll = async () => {
  await nextTick();
  
  return new Promise<void>((resolve) => {
    const query = uni.createSelectorQuery();
    
    // 获取消息容器的实际高度
    query.select('.messages-container').boundingClientRect((containerRect) => {
      if (containerRect && !Array.isArray(containerRect)) {
        containerHeight.value = containerRect.height || 0;
      }
      
      // 获取scroll-view的高度
      query.select('.chat-messages').boundingClientRect((scrollRect) => {
        if (scrollRect && !Array.isArray(scrollRect)) {
          scrollViewHeight.value = scrollRect.height || 0;
          
          // 计算需要滚动的距离
          const needScrollTop = Math.max(0, containerHeight.value - scrollViewHeight.value);
          
          // 调试日志
          console.log('精确滚动计算:', {
            containerHeight: containerHeight.value,
            scrollViewHeight: scrollViewHeight.value,
            needScrollTop: needScrollTop,
            currentScrollTop: scrollTop.value
          });
          
          // 强制触发scrollTop变化 - 关键修复点
          if (needScrollTop !== scrollTop.value) {
            scrollTop.value = needScrollTop;
          } else {
            // 如果值相同，先设置一个不同的值再设置目标值
            scrollTop.value = needScrollTop - 1;
            nextTick(() => {
              scrollTop.value = needScrollTop;
            });
          }
          
          // 更新动画key强制刷新
          scrollAnimationKey.value++;
          
          // 额外的强制滚动方案
          setTimeout(() => {
            scrollTop.value = needScrollTop + 1;
            nextTick(() => {
              scrollTop.value = needScrollTop;
            });
          }, 50);
          
          // 同时使用scroll-into-view作为备用
          scrollIntoView.value = '';
          nextTick(() => {
            scrollIntoView.value = 'scroll-bottom';
          });
        }
        resolve();
      });
    });
    
    query.exec();
  });
};

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  const chatContainer = document.querySelector('.chat-messages');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};

// 强制滚动到底部（用于流式输出）
const forceScrollToBottom = scrollToBottom;

// H5专用：验证滚动是否成功，如果失败则重试
const verifyH5Scroll = () => {
  // #ifdef H5
  const chatContainer = document.querySelector('.chat-messages');
  if (chatContainer) {
    const maxScrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
    const currentScrollTop = chatContainer.scrollTop;
    
    console.log('H5滚动验证:', {
      maxScrollTop,
      currentScrollTop,
      isAtBottom: Math.abs(maxScrollTop - currentScrollTop) < 10
    });
    
    // 如果没有滚动到底部，强制滚动
    if (maxScrollTop - currentScrollTop > 10) {
      console.log('H5滚动未到底部，强制重试...');
      chatContainer.scrollTop = maxScrollTop;
      
      // 再次验证
      setTimeout(() => {
        if (chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop > 10) {
          console.log('H5强制滚动仍然失败，使用scrollIntoView备用方案');
          const scrollBottomEl = chatContainer.querySelector('#scroll-bottom');
          if (scrollBottomEl) {
            scrollBottomEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
      }, 100);
    }
  }
  // #endif
};

const fetchLatestSummary = async (userId: string) => {
  try {
    const response = await post('analyse/latest/summary', { userId })
    console.log(response)
    // 如果响应存在且有效，设置summaryAvailable为true
    if (response) {
      healthData.value.totalScore = Math.round((response as any).score);
      summaryAvailable.value = true
      latestSummaryData.value = response
      // 处理扫描提示
      const data = response as { conditions?: any[] };
      // handleScanReminders(data.conditions)
      // 处理警告
      handleAlerts(data.conditions)
    } else {
      // summaryAvailable.value = false
      // scanReminders.value = []
      // scanRemindersVisible.value = false
    }
  } catch (error) {
    console.error('获取最新检测结果概览失败:', error)
    // summaryAvailable.value = false
    // scanReminders.value = []
    // scanRemindersVisible.value = false
  }
}

function handleAlerts(conditions: any[] = []) {
  alertCount.value = 0;
  alertDescriptions.value = [];
  conditions.forEach(condition => {
    if (condition.grade !== 'NORMAL') {
      alertCount.value++;
      alertDescriptions.value.push(`${condition.desc} ${condition.grade}`);
    }
  });
}

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

const setUpData = async () => {
  await fetchLatestSummary(userInfo.userId);
  
  // 添加初始对话
  const currentTime = new Date();
  const timeString = formatTime(currentTime);
  
  // 添加用户消息
  chatMessages.value.push({
    type: 'user',
    content: 'Hi, how is my scalp?',
    time: timeString,
    showTime: shouldShowTime(currentTime)
  });
  
  // 清空输入框
  const userMessage = 'Hi, how is my scalp?';
  userInput.value = '';
  
  // 初始化信息卡片高度和聊天区域位置
  setTimeout(async () => {
    updateChatAreaPosition();
    // 确保初始加载时滚动到底部
    await nextTick();
    await scrollToBottom();
    
    // 发送到服务器并获取回复
    await getAiResponse(userMessage);
  }, 500);
  
  // #ifdef H5
  // 监听窗口大小变化，重新计算高度
  window.addEventListener('resize', updateChatAreaPosition);
  // #endif
}

// 首次加载时显示欢迎消息
onLoad(() => {
  // 示例：加载历史消息
  // 实际应用中可从服务器加载历史聊天记录
  // 如果有历史消息，在这里加载并确保滚动到底部
  setTimeout(() => {
    scrollToBottom();
  }, 100);
});

// 页面每次显示时都自动滚动到底部
onShow(() => {
  setTimeout(() => {
    scrollToBottom();
  }, 100);
});

onMounted(async () => {
  // 完善用户ID判断逻辑，确保不为空且有效
  if (!userInfo.userId || userInfo.userId === '' || userInfo.userId === null || userInfo.userId === undefined || userInfo.userId.trim() === '') {
    console.log('用户ID无效，请求用户ID:', userInfo.userId);
    requestUserIdFromApp();
    return;
  }
  
  console.log('用户ID有效，开始设置数据:', userInfo.userId);
  setUpData();
});

// 组件销毁时移除事件监听
onUnmounted(() => {
  // #ifdef H5
  window.removeEventListener('resize', updateChatAreaPosition);
  // #endif
});
</script>

<style>
html, body, #app {
  height: 100%;
  min-height: 100%;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  background-color: #f8f8f8;
  box-sizing: border-box;
  position: relative;
  padding-bottom: calc(68px + 50px);
  width: 100vw;
  overflow-x: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  height: 44px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  /* 确保头部固定 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  width: 100%;
}

.back-button {
  width: 30px;
}

.back-icon {
  font-size: 28px;
  color: #333;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.placeholder {
  width: 30px;
}

/* 固定在顶部的信息卡片区域 */
.fixed-info-cards {
  width: 100%;
  background-color: #f8f8f8;
  z-index: 50;
  padding-bottom: 10px;
  overflow-x: hidden;
  position: fixed;
  top: 44px; /* 头部导航栏的高度 */
  left: 0;
  right: 0;
}

.info-cards-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px;
  width: 100%;
  box-sizing: border-box;
}

.info-cards-container.collapsed {
  padding-top: 0;
}

.collapse-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px 0;
  font-size: 12px;
  color: #666;
  background-color: rgba(255, 255, 255, 0.5);
  width: 100%;
}

.toggle-icon {
  margin-left: 5px;
  font-size: 10px;
}

.info-card {
  border-radius: 12px;
  padding: 10px 15px;
  color: white;
  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.purple-card {
  background: linear-gradient(135deg, #8e44ad, #a266bf);
}

.blue-card {
  background: linear-gradient(135deg, #3498db, #54a0ff);
}

.green-card {
  background: linear-gradient(135deg, #b7df2d, #e9ff54);
  color: #333; /* 黄绿色背景使用深色文字 */
}

.card-date {
  position: absolute;
  top: 8px;
  left: 10px;
  font-size: 10px;
  opacity: 0.7;
}

.card-title {
  text-align: center;
  font-weight: bold;
  margin-top: 5px;
  font-size: 14px;
  padding-bottom: 8px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  width: 100%;
  box-sizing: border-box;
}

.data-label {
  opacity: 0.9;
  word-break: break-word;
}

.data-value {
  font-weight: bold;
  word-break: break-word;
  text-align: right;
  padding-left: 8px;
}

.data-value.highlight {
  color: #0066ff;
}

/* 聊天消息区域调整 */
.chat-messages {
  flex: 1;
  padding: 16px;
  padding-bottom: 24px;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  box-sizing: border-box;
  margin-top: calc(44px + var(--info-cards-height, 220px));
  height: calc(100vh - 44px - var(--info-cards-height, 220px) - 68px - 50px);
  overflow-y: auto;
  background: #f8f8f8;
}

/* 折叠时的高度调整 */
.chat-messages.collapsed {
  margin-top: calc(44px + var(--info-cards-collapsed-height, 80px));
  height: calc(100vh - 44px - var(--info-cards-collapsed-height, 80px) - 68px - 50px);
}

.messages-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
}

.message-wrapper {
  margin-bottom: 16px;
  width: 100%;
}

.time-divider {
  text-align: center;
  margin: 8px 0;
  font-size: 12px;
  color: #888;
  width: 100%;
}

.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
}

.message-user {
  justify-content: flex-end;
}

.message-ai {
  justify-content: flex-start;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.ai-avatar {
  margin-right: 8px;
  background-color: #eee;
}

.user-avatar {
  margin-left: 8px;
  background: transparent;
}

.avatar image {
  width: 100%;
  height: 100%;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  word-break: break-word;
}

.bubble-user {
  background-color: #8b5cf6;
  color: white;
  border-top-right-radius: 4px;
}

.bubble-ai {
  background-color: #f0f0f0;
  color: #333;
  border-top-left-radius: 4px;
}

.audio-player {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.play-icon {
  font-size: 16px;
  margin-right: 8px;
}

.audio-wave {
  flex: 1;
  height: 24px;
}

.audio-wave image {
  width: 100%;
  height: 100%;
}

.duration {
  font-size: 12px;
  color: #888;
  margin-left: 8px;
}

/* 固定在底部的区域 */
.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #f8f8f8;
  /* 添加阴影，增强视觉分离感 */
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.05);
  width: 100%;
}

.input-container {
  padding: 12px 16px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
  width: 100%;
  box-sizing: border-box;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 24px;
  padding: 4px;
  width: 100%;
  box-sizing: border-box;
}

.message-input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: none;
  background: transparent;
  font-size: 16px;
  width: calc(100% - 48px);
}

.send-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #8b5cf6;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
}

.send-button[disabled] {
  background-color: #ccc;
}

.send-icon {
  color: white;
  font-size: 16px;
}

/* 底部安全区域，为tabBar预留空间 */
.safe-area-bottom {
  height: 50px; /* 与tabBar高度保持一致 */
  width: 100%;
}

/* 添加底部锚点，用于确保滚动位置正确 */
.scroll-bottom-anchor {
  height: 20px;
  width: 1px;
}
</style> 