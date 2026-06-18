<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { getAchievementTracker } from '@/utils/achievementTracker';
import { getLocale } from '@/i18n.js';
import { useUserStore } from '@/stores/userStore';
import MarkdownRenderer from '../../components/MarkdownRenderer.vue';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t, locale } = useI18n();
const userStore = useUserStore();
const { userInfo } = userStore;

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
import {
    buildChatReportPayload,
    readStoredScanReportIds,
    useLatestScanReports,
} from '@/composables/useLatestScanReports';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 页面滚动控制逻辑
// Page scrolling control logic
const disableScroll = ref(false);

const checkScroll = () => {
    if (hasStartedChat.value) {
        // 对话开始后，页面整体不可滚动，仅内部 feed 滚动
        // Once chat starts, the overall page shouldn't scroll, only the internal feed scroll-view should scroll
        disableScroll.value = true;
        return;
    }
    
    // 欢迎界面：动态计算内容高度是否超出屏幕高度
    // Welcome screen: dynamically calculate if content height exceeds screen height
    setTimeout(() => {
        const query = uni.createSelectorQuery();
        query.select('.chat-scan-row').boundingClientRect();
        query.select('.scan-context-strip').boundingClientRect();
        query.select('.shell-chat-intro').boundingClientRect();
        query.select('.shell-chat-input').boundingClientRect();
        query.select('.shell-promo').boundingClientRect();
        query.select('.app-shell-header').boundingClientRect();
        
        query.exec((res) => {
            const scanRowHeight = res[0] ? res[0].height : 0;
            const contextStripHeight = res[1] ? res[1].height : 0;
            const introHeight = res[2] ? res[2].height : 0;
            const inputHeight = res[3] ? res[3].height : 0;
            const promoHeight = res[4] ? res[4].height : 0;
            const headerHeight = res[5] ? res[5].height : 0;
            
            // 总页面内容高度 = 状态栏高度 + 广告条高度 + 头部高度 + 欢迎界面各部分高度之和
            // Total page content height = status bar height + promo height + header height + welcome screen elements height sum
            const totalPageHeight = statusBarHeight + promoHeight + headerHeight + scanRowHeight + contextStripHeight + introHeight + inputHeight;
            const sysInfo = uni.getSystemInfoSync();
            const windowHeight = sysInfo.windowHeight;
            
            disableScroll.value = windowHeight >= totalPageHeight;
            console.log('[Consult Page Scroll Control]', {
                windowHeight,
                totalPageHeight,
                disableScroll: disableScroll.value
            });
        });
    }, 150);
};

// 新 API 模式标志
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
    t('consult.shortcut4'),
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
        const targetReportId = uni.getStorageSync('ai_chat_targetReportId') || '';
        if (targetReportId) {
            uni.removeStorageSync('ai_chat_targetReportId');
        }

        const storedReports = readStoredScanReportIds();
        const reportBundle = buildChatReportPayload({
            targetReportId,
            trichoscanReportId: scanContext.value.trichoscanReportId || storedReports.trichoscanReportId,
            selfieReportId: scanContext.value.selfieReportId || storedReports.selfieReportId,
            trichoscanTime: scanContext.value.trichoscan?.createTime,
            selfieTime: scanContext.value.selfie?.createTime,
        });

        const { primaryReportId, contextKey, payload: reportPayload, hasAnyReport } = reportBundle;
        const contextChanged = contextKey !== savedContextKey.value;

        let requestData: any;

        if (!savedChatId.value || contextChanged) {
            if (!hasAnyReport) {
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
                ...reportPayload,
                content: content,
                stream: true,
                language: currentLanguage
            };

            savedReportId.value = primaryReportId;
            savedContextKey.value = contextKey;
            savedChatId.value = '';

            console.log('首次对话或扫描上下文变化，请求参数:', requestData);
        } else {
            // 后续对话：使用 chatId
            requestData = {
                userId: userInfo.userId,
                chatId: savedChatId.value,
                content: content,
                stream: true
            };
            
            console.log('后续对话，请求参数:', requestData);
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
    const chatContainer = document.querySelector('.chat-messages');
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

// 监听聊天状态，在开始聊天后自动锁定页面滚动
// Watch chat state, automatically lock page scrolling when chat starts
watch(hasStartedChat, () => {
    checkScroll();
});

onMounted(() => {
    savedChatId.value = uni.getStorageSync('ai_chat_chatId') || '';
    savedReportId.value = uni.getStorageSync('ai_chat_reportId') || '';
    savedContextKey.value = uni.getStorageSync('ai_chat_contextKey') || readStoredScanReportIds().contextKey;
    
    // 初始化滚动限制
    // Initialize scrolling limit
    checkScroll();
});

onShow(async () => {
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
    
    // 每次显示页面时重新检测滚动限制
    // Recheck scroll limit when page shows
    checkScroll();
});
</script>

<template>
    <page-meta :page-style="disableScroll ? 'overflow: hidden; height: 100vh;' : ''" />
    <MainTabLayout show-promo :disable-scroll="disableScroll">
        <view class="shell-chat consult-page" :class="{ 'disable-page-scroll': disableScroll }">
            <view class="chat-scan-row">
                <button class="shell-scan-link" @tap="viewLastScan">
                    <image src="/static/tabbar/hair-active.svg" class="scan-link-icon" mode="aspectFit" />
                    {{ $t('consult.viewLastScan') }}
                </button>
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
                        <MarkdownRenderer :content="typingContent" />
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
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.consult-page {
    flex: 1;
    min-height: calc(100vh - 130px);
    display: flex;
    flex-direction: column;

    /* 
      当锁定页面滚动时，重置最小高度并占满容器
      When page scroll is locked, reset min-height and fill the container
    */
    &.disable-page-scroll {
        min-height: 0;
        height: 100%;
    }
}

/* 
  替换 scroll-view 为普通 view 并设置滚动属性，确保滚动流畅与兼容性
  Replace scroll-view with a normal view and set scroll properties to ensure smooth scrolling and compatibility
*/
.shell-chat-feed {
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

/* 
  覆盖输入框的内边距，移除上下内边距防止 iOS 端输入文字截断/隐藏
  Override input field padding, remove top/bottom padding to prevent input text truncation/hiding on iOS
*/
.shell-chat-field {
    padding: 0 18px;
}

.chat-scan-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
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
