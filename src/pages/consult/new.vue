<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { getAchievementTracker } from '@/utils/achievementTracker';
import { getLocale } from '@/i18n.js';
import { useUserStore } from '@/stores/userStore';
import MarkdownRenderer from '../../components/MarkdownRenderer.vue';
import { captureShareCard, shareCapturedImage } from '@/composables/useShareCardCapture';
import { extractChatSharePayload } from '@/utils/chatShareExtract';
import { get, ProjectBrand } from '@/utils/request';

const { t, locale } = useI18n();
const userStore = useUserStore();
const { userInfo } = userStore;

// 使用状态栏高度 composable
// Use status bar height composable
import {
    useLatestScanReports,
} from '@/composables/useLatestScanReports';
import { AI_HOME_CARE_PROMPT_KEY } from '@/composables/useHomeHealthInsights';

// 页面滚动控制逻辑
const useNewChatApi = ref(true);

const userInput = ref('');
// 用户ID和聊天ID (实际应用中可能通过其他方式获取)
const chatId = ref('chatId_' + userInfo.userId);

// 新 API 模式相关
const savedReportId = ref(''); // 当前使用的 reportId
const savedChatId = ref(''); // 新 API 模式下的 chatId
const savedContextKey = ref(''); // 毛囊镜 + 自拍 reportId 组合

const { loading: scanContextLoading, scanContext, loadLatestScanReports } = useLatestScanReports();
const scanContextReady = ref(false);

// 运行时检测是否在 iOS Bundle (GCDWebServer) 环境下
// Runtime detection: check if running in iOS Bundle (GCDWebServer) environment
const _isLocalBundle = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.protocol === 'file:');

// AI 服务器直连地址
// AI server direct URL
const AI_SERVER_BASE = 'http://43.156.213.63:5011';

// 使用反向代理路径,开发和生产环境都通过 /ai-api/ 访问
// Development and production both use /ai-api/ proxy path
const NEW_CHAT_API_URL = '/ai-api/api/v1/hair/chat';
// 聊天记录
const chatMessages = ref<any[]>([]);
// 是否正在加载回复
const isAiTyping = ref(false);
// AI流式输出的内容
const typingContent = ref('');
// 是否已开始聊天：有消息或正在输出即视为开始
const hasStartedChat = computed(() => chatMessages.value.length > 0 || isAiTyping.value);
const shortcuts = computed(() => [
    t('consult.shortcut1'),
    t('consult.shortcut2'),
    t('consult.shortcut3'),
]);

async function send(text: string) {
    userInput.value = text;
    await sendMessage();
}

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
        showTime: shouldShowTime(currentTime),
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

/**
 * 获取用于聊天的 aiReportId
 * 优先级：
 * 1. ai_chat_targetReportId（结果页点击，临时）
 * 2. ai_analysis_reportId（最新）
 * 3. 获取最新报告（兜底）
 */
const getChatAiReportId = async (): Promise<string | null> => {
    // 1. 优先使用结果页传递的 aiReportId（临时，用完即清除）
    const targetReportId = uni.getStorageSync('ai_chat_targetReportId') || '';
    if (targetReportId) {
        console.log('[聊天页] 使用结果页 aiReportId:', targetReportId);
        uni.removeStorageSync('ai_chat_targetReportId');
        return targetReportId;
    }

    // 2. 使用最新的 aiReportId
    const latestAiReportId = uni.getStorageSync('ai_analysis_reportId') || '';
    if (latestAiReportId) {
        console.log('[聊天页] 使用最新 aiReportId:', latestAiReportId);
        return latestAiReportId;
    }

    // 3. 兜底：获取最新的扫描报告
    console.log('[聊天页] 无缓存，获取最新报告...');

    const { scanContext } = useLatestScanReports();
    await loadLatestScanReports(userInfo.userId);

    const trichoReport = scanContext.value.trichoscan;
    const selfieReport = scanContext.value.selfie;

    if (!trichoReport && !selfieReport) {
        console.log('[聊天页] 没有可用的扫描报告');
        return null;
    }

    // 比较时间，取最新的报告
    let latestReportId: string | null = null;
    let latestType = '';

    if (trichoReport && selfieReport) {
        const trichoTime = new Date(trichoReport.createTime || 0).getTime();
        const selfieTime = new Date(selfieReport.createTime || 0).getTime();
        if (trichoTime >= selfieTime) {
            latestReportId = trichoReport.id;
            latestType = '毛囊镜';
        } else {
            latestReportId = selfieReport.id;
            latestType = '自拍照';
        }
    } else if (trichoReport) {
        latestReportId = trichoReport.id;
        latestType = '毛囊镜';
    } else if (selfieReport) {
        latestReportId = selfieReport.id;
        latestType = '自拍照';
    }

    if (!latestReportId) {
        return null;
    }

    // 调用 /api/report/detail 获取 aiReportId
    try {
        const response: any = await get(`/report/detail/${latestReportId}`, {}, { brand: ProjectBrand.LUSHAIR_NEW });
        const aiReportId = response?.report?.aiReportId;

        if (aiReportId) {
            console.log(`[聊天页] 从最新${latestType}报告获取 aiReportId:`, aiReportId);
            return aiReportId;
        }
    } catch (error) {
        console.error('[聊天页] 获取 report detail 失败:', error);
    }

    return null;
};

// 获取AI回复
const getAiResponse = async (content: string) => {
    isAiTyping.value = true;
    typingContent.value = '';

    // 立即滚动到底部显示输入指示器
    await nextTick();
    await scrollToBottom();

    const currentLanguage = locale.value || 'en';

    // 新 API 模式
    if (useNewChatApi.value) {
        await getNewAiResponse(content, currentLanguage);
    } else {
        // 旧 API 模式
        await getOldAiResponse(content, currentLanguage);
    }
};

// 新 API 模式的响应处理
const getNewAiResponse = async (content: string, currentLanguage: string) => {
    try {
        let requestData: any;

        // 首次对话或需要新的上下文
        if (!savedChatId.value) {
            // 获取 aiReportId
            const aiReportId = await getChatAiReportId();

            if (!aiReportId) {
                // 无可用报告，提示用户
                uni.showModal({
                    title: 'Analysis Required',
                    content: 'Please complete a hair analysis first.',
                    confirmText: t('common.confirm') || 'OK',
                    showCancel: false,
                    success: (res) => {
                        if (res.confirm) {
                            const u = navigator.userAgent;
                            const isiOS = /iPad|iPhone|iPod/.test(u) ||
                                          (/Macintosh/.test(u) && 'ontouchend' in document);
                            if (isiOS) {
                                window.webkit.messageHandlers.advanced.postMessage({data: 'advanced'});
                            } else {
                                window.android.advanced(JSON.stringify({data: 'advanced'}));
                            }
                        }
                    }
                });

                isAiTyping.value = false;
                return;
            }

            requestData = {
                userId: userInfo.userId,
                reportId: aiReportId,
                content: buildAgentMessageContent(content),
                stream: true,
                language: currentLanguage,
                source_app: 'lushair'
            };

            savedReportId.value = aiReportId;
            savedChatId.value = '';

            console.log('[聊天页] 首次对话，使用 aiReportId:', aiReportId);
        } else {
            // 后续对话：检查 reportId 是否变化，有变化则重置 chatId
            const currentAiReportId = await getChatAiReportId();

            if (currentAiReportId && currentAiReportId !== savedReportId.value) {
                console.log('[聊天页] 检测到新报告，重置对话:', {
                    old: savedReportId.value,
                    new: currentAiReportId
                });

                // 重置为新对话
                savedReportId.value = currentAiReportId;
                savedChatId.value = '';
                uni.removeStorageSync('ai_chat_chatId');
                uni.removeStorageSync('ai_chat_reportId');

                requestData = {
                    userId: userInfo.userId,
                    reportId: currentAiReportId,
                    content: buildAgentMessageContent(content),
                    stream: true,
                    language: currentLanguage,
                    source_app: 'lushair'
                };

                console.log('[聊天页] 重置后首次对话，使用 aiReportId:', currentAiReportId);
            } else {
                // 后续对话：使用 chatId
                requestData = {
                    userId: userInfo.userId,
                    chatId: savedChatId.value,
                    content: content,
                    stream: true,
                    source_app: 'lushair'
                };

                console.log('[聊天页] 后续对话，使用 chatId:', savedChatId.value);
            }
        }

        // 使用 fetch 处理流式响应
        const apiUrl = _isLocalBundle 
            ? AI_SERVER_BASE + NEW_CHAT_API_URL.replace('/ai-api', '')
            : (NEW_CHAT_API_URL.startsWith('/') ? window.location.origin + NEW_CHAT_API_URL : NEW_CHAT_API_URL);
        
        let receivedChatId = '';
        let isFinished = false;
        
        console.log('发送请求到:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 辅助函数：解析单行 SSE 数据
        const parseSSELine = (line: string) => {
            const trimmedLine = line.trim();
            // 兼容 "data: " 和 "data:"开头
            if (!trimmedLine || !trimmedLine.startsWith('data:')) return null;
            
            const dataStr = trimmedLine.startsWith('data: ') 
                ? trimmedLine.substring(6) 
                : trimmedLine.substring(5);
                
            if (dataStr === '[DONE]') return { done: true };
            
            try {
                return JSON.parse(dataStr);
            } catch (e) {
                console.error('解析 SSE 数据失败:', dataStr, e);
                return null;
            }
        };

        // 辅助函数：处理解析后的数据
        const handleParsedData = (parsed: any) => {
            if (!parsed) return false;
            if (parsed.done) return true;
            
            if (parsed.chatId && !receivedChatId) {
                receivedChatId = parsed.chatId;
                console.log('收到 chatId:', receivedChatId);
            }
            
            if (parsed.content) {
                typingContent.value += (parsed.content || '');
            }
            
            // 检查 finish_reason
            if (parsed.finish_reason === 'stop') {
                console.log('收到 finish_reason: stop');
                return true;
            }
            
            return false;
        };

        // 检查是否支持流式读取
        if (response.body && typeof response.body.getReader === 'function') {
            console.log('使用流式读取模式');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let lastScrollTime = 0;

            try {
                while (!isFinished) {
                    const result = await reader.read();
                    
                    if (result.done) {
                        console.log('流读取完成');
                        break;
                    }
                    
                    // 防御性检查 value
                    if (!result.value) {
                        console.warn('收到空的 value');
                        continue;
                    }

                    const chunk = decoder.decode(result.value, { stream: true });
                    if (!chunk) continue;
                    
                    buffer += chunk;
                    
                    // 按行分割处理
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        const parsed = parseSSELine(line);
                        if (handleParsedData(parsed)) {
                            isFinished = true;
                            break;
                        }
                    }
                    
                    // 滚动频率控制 (由 200ms 降低到 100ms 使之更丝滑)
                    const now = Date.now();
                    if (now - lastScrollTime > 100) {
                        await forceScrollToBottom();
                        lastScrollTime = now;
                    }
                }
                
                // 处理缓冲区中剩余的数据
                if (buffer.trim()) {
                    const parsed = parseSSELine(buffer);
                    handleParsedData(parsed);
                }
            } catch (readError) {
                console.error('流读取错误:', readError);
                throw readError;
            } finally {
                try {
                    reader.releaseLock();
                } catch (e) {
                    console.warn('释放 reader 锁失败:', e);
                }
            }
        } else {
            // 不支持流式读取，回退到普通响应处理
            console.log('使用非流式读取模式');
            const text = await response.text();
            console.log('响应文本长度:', text?.length || 0);
            
            if (!text) {
                console.warn('响应文本为空');
            } else {
                // 解析 SSE 格式的文本响应
                const lines = text.split('\n');
                for (const line of lines) {
                    const parsed = parseSSELine(line);
                    if (handleParsedData(parsed)) {
                        break;
                    }
                }
            }
        }

        // 保存返回的 chatId（如果是首次对话）
        if (receivedChatId && !savedChatId.value) {
            savedChatId.value = receivedChatId;
            console.log('已保存 chatId:', savedChatId.value);
            // 持久化到本地存储
            try {
                uni.setStorageSync('ai_chat_chatId', savedChatId.value);
                uni.setStorageSync('ai_chat_reportId', savedReportId.value);
                uni.setStorageSync('ai_chat_contextKey', savedContextKey.value);
            } catch (e) {
                console.error('保存 chatId 失败:', e);
            }
        }

        // 将完整响应添加到消息列表
        const currentTime = new Date();

        chatMessages.value.push({
            type: 'ai',
            content: typingContent.value || 'No response received.',
            time: formatTime(currentTime),
            showTime: shouldShowTime(currentTime),
        });

        // 等待DOM更新后滚动到新消息
        await nextTick();
        await scrollToBottom();
    } catch (error) {
        console.error('新 API Error:', error);

        // 添加错误消息
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        chatMessages.value.push({
            type: 'ai',
            content: t('consult.errorMessage') || `Sorry, something went wrong: ${errorMessage}`,
            time: formatTime(new Date()),
            showTime: true,
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

// 旧 API 模式的响应处理
const getOldAiResponse = async (content: string, currentLanguage: string) => {
    try {
        const requestData = {
            multiRound: true,
            userId: userInfo.userId,
            chatId: chatId.value,
            content: content,
            language: currentLanguage,
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
        let lastScrollTime = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码并添加到当前响应
            const chunk = decoder.decode(value, { stream: true });
            typingContent.value += chunk;

            // 优化滚动频率：使用精确高度计算，每200ms最多滚动一次
            const now = Date.now();
            if (now - lastScrollTime > 200) {
                // 降低频率到200ms，因为高度计算需要时间
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
            showTime: shouldShowTime(currentTime),
        });

        // 等待DOM更新后滚动到新消息
        await nextTick();
        await scrollToBottom();
    } catch (error) {
        console.error('旧 API Error:', error);

        // 添加错误消息
        chatMessages.value.push({
            type: 'ai',
            content: t('consult.errorMessage'),
            time: formatTime(new Date()),
            showTime: true,
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

// 时间格式化
const formatTime = (date: Date) => {
    const now = new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const timeString = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    // 今天
    if (date.toDateString() === now.toDateString()) return timeString;
    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return t('common.yesterday') + ' ' + timeString;

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
    return date.getTime() - lastTime.getTime() > 5 * 60 * 1000;
};

// 滚动到底部
const scrollToBottom = async () => {
    await nextTick();
    const anchor = document.getElementById('scroll-bottom');
    if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return;
    }
    const chatContainer = document.querySelector('.shell-chat-feed');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
};

// 强制滚动到底部（用于流式输出）
const forceScrollToBottom = scrollToBottom;

// Handle auto-start chat from advanced-result page
let hasAutoStarted = false;

const viewLastScan = () => {
    uni.switchTab({ url: '/pages/hair/index' });
};

const shareChatSnippet = computed(() =>
    extractChatSharePayload(
        chatMessages.value,
        typingContent.value,
        t('consult.shortcut1'),
        t('consult.welcome'),
    ),
);

const shareChat = async () => {
    try {
        uni.showLoading({ title: t('common.loading') });
        const dataUrl = await captureShareCard('.consult-share-card');
        await shareCapturedImage(dataUrl, 'My AI Health Chat', 'Get personalized advice 24/7');
    } catch (error) {
        console.error('Chat share failed', error);
        uni.showToast({ title: 'Share failed', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

function buildAgentMessageContent(userMessage: string): string {
    const carePrompt = uni.getStorageSync(AI_HOME_CARE_PROMPT_KEY) || '';
    if (!carePrompt) return userMessage;
    return `[Latest trichoscopy & selfie quantitative context]\n${carePrompt}\n\n[User question]\n${userMessage}`;
}

const careContextLoaded = ref(false);

const refreshScanContext = async () => {
    const previousKey = scanContext.value.contextKey || savedContextKey.value;
    try {
        await loadLatestScanReports(userInfo.userId);
    } finally {
        scanContextReady.value = true;
    }
    const nextKey = scanContext.value.contextKey;

    if (nextKey && previousKey && nextKey !== previousKey) {
        savedChatId.value = '';
        savedReportId.value = '';
        savedContextKey.value = '';
        uni.removeStorageSync('ai_chat_chatId');
        uni.removeStorageSync('ai_chat_reportId');
        uni.removeStorageSync('ai_chat_contextKey');
    }
};

onMounted(() => {
    savedChatId.value = uni.getStorageSync('ai_chat_chatId') || '';
    savedReportId.value = uni.getStorageSync('ai_chat_reportId') || '';
    savedContextKey.value = uni.getStorageSync('ai_chat_contextKey') || '';
});

onShow(async () => {
    careContextLoaded.value = !!uni.getStorageSync(AI_HOME_CARE_PROMPT_KEY);
    await refreshScanContext();

    const autoStart = uni.getStorageSync('ai_chat_autoStart');
    if (autoStart === 'true' && !hasAutoStarted && !hasStartedChat.value && !isAiTyping.value && scanContext.value.hasAnyReport) {
        hasAutoStarted = true;
        // Clear the flag immediately to prevent re-triggering
        uni.removeStorageSync('ai_chat_autoStart');
        // Auto-send initial message to start conversation with current reportId
        const initialMessage = t('consult.autoStartMessage');
        if (initialMessage) {
            send(initialMessage);
        }
    } else if (autoStart !== 'true') {
        // Reset flag when autoStart is not set, allowing next trigger to work
        hasAutoStarted = false;
    }
});
</script>

<template>
    <page-meta page-style="height: 100%;" />
    <MainTabLayout show-promo fill-screen fixed-header>
        <view class="shell-chat consult-page">
            <view class="consult-page__header">
                <view class="chat-header-actions">
                    <button class="shell-scan-link" @tap="viewLastScan">
                        <image src="/static/tabbar/hair-active.svg" class="scan-link-icon" mode="aspectFit" />
                        {{ $t('consult.viewLastScan') }}
                    </button>
                    <view v-if="hasStartedChat" class="consult-share-btn" @tap="shareChat">
                        <image src="/static/icons/share.svg" class="consult-share-icon" mode="aspectFit" />
                    </view>
                </view>
                <view v-if="scanContextReady" class="scan-context-strip">
                    <text class="scan-context-title">{{ $t('consult.scanContextTitle') }}</text>
                    <view v-if="scanContextLoading" class="scan-context-loading">
                        {{ $t('consult.scanContextLoading') }}
                    </view>
                    <view v-else class="scan-context-chips">
                        <view
                            v-if="scanContext.trichoscan"
                            class="scan-context-chip scan-context-chip--trichoscan"
                        >
                            <text class="chip-label">{{ $t('consult.trichoscanContext') }}</text>
                            <text v-if="scanContext.trichoscan.scoreLabel" class="chip-meta">
                                {{ $t('consult.scanContextScore', [scanContext.trichoscan.scoreLabel]) }}
                            </text>
                            <text v-if="scanContext.trichoscan.dateLabel" class="chip-date">
                                {{ scanContext.trichoscan.dateLabel }}
                            </text>
                        </view>
                        <view
                            v-if="scanContext.selfie"
                            class="scan-context-chip scan-context-chip--selfie"
                        >
                            <text class="chip-label">{{ $t('consult.selfieContext') }}</text>
                            <text v-if="scanContext.selfie.scoreLabel" class="chip-meta">
                                {{ scanContext.selfie.scoreLabel }}
                            </text>
                            <text v-if="scanContext.selfie.dateLabel" class="chip-date">
                                {{ scanContext.selfie.dateLabel }}
                            </text>
                        </view>
                        <text v-if="!scanContext.trichoscan && !scanContext.selfie" class="scan-context-empty">
                            {{ $t('consult.scanContextMissing') }}
                        </text>
                    </view>
                    <text v-if="careContextLoaded" class="scan-context-care-note">
                        {{ $t('consult.careContextLoaded') }}
                    </text>
                </view>
            </view>

            <view class="shell-chat-feed chat-messages">
                <view v-if="!hasStartedChat" class="shell-chat-intro">
                    <text class="welcome">{{ $t('consult.welcome') }}</text>
                    <text class="bold">{{ $t('consult.placesTip') }}</text>
                    <view class="shell-sugg">
                        <view v-for="q in shortcuts" :key="q" class="shell-sugg-btn" @tap="send(q)">{{ q }}</view>
                    </view>
                </view>

                <view v-else class="shell-msg-row">
                    <view
                        v-for="(message, index) in chatMessages"
                        :key="index"
                        :id="'msg-' + index"
                        class="msg-wrap"
                    >
                        <view v-if="message.showTime" class="time-divider">{{ message.time }}</view>
                        <view
                            :class="[
                                'shell-bubble',
                                message.type === 'user' ? 'shell-bubble-me' : 'shell-bubble-bot',
                            ]"
                        >
                            <text v-if="message.type === 'user'">{{ message.content }}</text>
                            <MarkdownRenderer v-else :content="message.content" />
                        </view>
                    </view>
                    <view v-if="isAiTyping" class="shell-bubble shell-bubble-bot">
                        <view v-if="!typingContent" class="typing-indicator">
                            <view class="typing-dot" />
                            <view class="typing-dot" />
                            <view class="typing-dot" />
                        </view>
                        <MarkdownRenderer v-else :content="typingContent" />
                    </view>
                    <view id="scroll-bottom" class="scroll-anchor"></view>
                </view>
            </view>
            <view class="shell-chat-input">
                <input
                    v-model="userInput"
                    class="shell-chat-field"
                    :placeholder="$t('consult.inputPlaceholder')"
                    confirm-type="send"
                    @confirm="sendMessage"
                />
                <button
                    class="shell-chat-send"
                    :disabled="!userInput.trim()"
                    @tap="sendMessage"
                >
                    <TablerIcon name="arrow-right" :size="18" color="#ffffff" />
                </button>
            </view>
        </view>
    </MainTabLayout>

    <view class="consult-share-card">
        <text class="consult-share-kicker">SCALP HEALTH REPORT</text>
        <text class="consult-share-title">My AI Health Chat</text>
        <text class="consult-share-sub">Get personalized advice 24/7</text>
        <view class="consult-share-bubble consult-share-bubble--user">
            <text>{{ shareChatSnippet.question }}</text>
        </view>
        <view class="consult-share-bubble consult-share-bubble--bot">
            <text>{{ shareChatSnippet.answer }}</text>
        </view>
        <view v-if="shareChatSnippet.productTitle" class="consult-share-product">
            <text class="consult-share-product-label">RECOMMENDED</text>
            <text class="consult-share-product-title">{{ shareChatSnippet.productTitle }}</text>
            <text v-if="shareChatSnippet.productSub" class="consult-share-product-sub">{{ shareChatSnippet.productSub }}</text>
        </view>
        <view class="consult-share-footer">
            <view>
                <text class="consult-share-footer-cta">Download Lushair</text>
                <text class="consult-share-footer-sub">Start your AI hair care journey</text>
            </view>
            <image class="consult-share-qr" src="/static/images/qrcode-download.png" mode="aspectFit" />
        </view>
        <text class="consult-share-url">Lushair.ai</text>
    </view>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.shell-chat-field {
    padding: 0 18px;
}

.chat-header-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
}

.consult-share-btn {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: #f3ecff;
    display: flex;
    align-items: center;
    justify-content: center;
}

.consult-share-icon {
    width: 18px;
    height: 18px;
}

.typing-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 20px;
}

.typing-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #6b21c8;
    animation: consult-typing 1.2s infinite ease-in-out;

    &:nth-child(2) {
        animation-delay: 0.15s;
    }

    &:nth-child(3) {
        animation-delay: 0.3s;
    }
}

@keyframes consult-typing {
    0%, 80%, 100% {
        opacity: 0.3;
        transform: translateY(0);
    }
    40% {
        opacity: 1;
        transform: translateY(-3px);
    }
}

.consult-share-card {
    position: fixed;
    left: -9999px;
    top: 0;
    width: 360px;
    padding: 28px 24px;
    background: #fff;
    border-radius: 20px;
    box-sizing: border-box;
}

.consult-share-kicker {
    display: block;
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #4da3f0;
}

.consult-share-title {
    display: block;
    text-align: center;
    font-size: 24px;
    font-weight: 800;
    color: #1a1228;
    margin: 8px 0 4px;
}

.consult-share-sub {
    display: block;
    text-align: center;
    font-size: 12px;
    color: #8a82a0;
    margin-bottom: 16px;
}

.consult-share-bubble {
    padding: 12px 14px;
    border-radius: 16px;
    margin-bottom: 10px;
    font-size: 13px;
    line-height: 1.5;
}

.consult-share-bubble--user {
    margin-left: 36px;
    background: #6b21c8;
    color: #fff;
}

.consult-share-bubble--bot {
    margin-right: 36px;
    background: #fff;
    border: 1px solid #f0edf7;
    color: #1a1228;
}

.consult-share-product {
    padding: 14px;
    border-radius: 14px;
    border: 1px solid #f0edf7;
    margin: 12px 0;
}

.consult-share-product-label {
    display: block;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #4da3f0;
}

.consult-share-product-title {
    display: block;
    margin-top: 4px;
    font-size: 16px;
    font-weight: 700;
    color: #1a1228;
}

.consult-share-product-sub {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #8a82a0;
}

.consult-share-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(135deg, #faf5ff, #fff);
}

.consult-share-footer-cta {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #6b21c8;
}

.consult-share-footer-sub {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: #8a82a0;
}

.consult-share-qr {
    width: 72px;
    height: 72px;
}

.consult-share-url {
    display: block;
    text-align: center;
    margin-top: 12px;
    font-size: 11px;
    color: #8a82a0;
}

.chat-scan-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
    padding-top: 8px;
}

.scan-link-icon {
    width: 16px;
    height: 16px;
}

.scan-context-strip {
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #f8f6fc;
    border: 1px solid #ece8f4;
}

.scan-context-title {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #8a82a0;
    margin-bottom: 8px;
}

.scan-context-loading {
    font-size: 12px;
    color: #6b6280;
}

.scan-context-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.scan-context-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 120px;
    padding: 8px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid #e8e2f2;
}

.scan-context-chip--trichoscan {
    border-color: #ddd6fe;
}

.scan-context-chip--selfie {
    border-color: #fbcfe8;
}

.chip-label {
    font-size: 12px;
    font-weight: 600;
    color: #4a4060;
}

.chip-meta {
    font-size: 12px;
    color: #6b21c8;
}

.chip-date {
    font-size: 11px;
    color: #8a82a0;
}

.scan-context-empty {
    font-size: 12px;
    color: #8a82a0;
}

.scan-context-care-note {
    display: block;
    margin-top: 8px;
    font-size: 11px;
    color: #6b21c8;
    line-height: 1.45;
}

.msg-wrap {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 4px;
}

.time-divider {
    text-align: center;
    font-size: 11px;
    color: #8a82a0;
    margin: 8px 0;
}

.scroll-anchor {
    height: 12px;
}
</style>
