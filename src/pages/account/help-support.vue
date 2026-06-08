<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t } = useI18n();

declare var window: Window & {
    webkit?: { messageHandlers?: Record<string, { postMessage: (d: unknown) => void }> };
    android?: Record<string, (d: string) => void>;
};

const guides = [
    {
        id: 1,
        titleKey: 'profile.guideHowToScan',
        cover: 'https://picsum.photos/seed/scan/260/340',
        video: 'https://meta.lushair.cn/guideVideo/lushair.mp4',
    },
    {
        id: 2,
        titleKey: 'profile.guideHowToConnect',
        cover: 'https://picsum.photos/seed/connect/260/340',
        video: 'https://meta.lushair.cn/guideVideo/lushair.mp4',
    },
    {
        id: 3,
        titleKey: 'profile.guideVideoTips',
        cover: 'https://picsum.photos/seed/video/260/340',
        video: 'https://meta.lushair.cn/guideVideo/lushair.mp4',
    },
];

const faqs = [
    { id: '2', qKey: 'profile.faq2_q', aKey: 'profile.faq2_a' },
    { id: '3', qKey: 'profile.faq3_q', aKey: 'profile.faq3_a' },
    { id: '4', qKey: 'profile.faq4_q', aKey: 'profile.faq4_a' },
    { id: '5', qKey: 'profile.faq5_q', aKey: 'profile.faq5_a' },
];

const activeFaq = ref('');

function toggleFaq(id: string) {
    activeFaq.value = activeFaq.value === id ? '' : id;
}

function openGuide(guide: { video: string }) {
    if (import.meta.env.VITE_PLATFORM === 'h5' || typeof window !== 'undefined') {
        window.open(guide.video, '_blank');
        return;
    }
    uni.navigateTo({
        url: `/pages/common/webview?url=${encodeURIComponent(guide.video)}`,
    });
}

function contactSupport() {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document);

    if (isiOS && window.webkit?.messageHandlers?.feedback) {
        window.webkit.messageHandlers.feedback.postMessage({ data: 'feedback' });
        return;
    }
    if (window.android?.feedback) {
        window.android.feedback(JSON.stringify({ data: 'feedback' }));
        return;
    }

    uni.setClipboardData({
        data: t('profile.supportEmail'),
        success: () => {
            uni.showToast({ title: t('profile.supportEmailCopied'), icon: 'none' });
        },
    });
}
</script>

<template>
    <AccountSubLayout :title="t('profile.helpSupport')">
        <text class="section-label">{{ t('profile.quickGuides') }}</text>
        <scroll-view class="guide-scroll" scroll-x>
            <view
                v-for="g in guides"
                :key="g.id"
                class="guide-card"
                @tap="openGuide(g)"
            >
                <image :src="g.cover" class="guide-cover" mode="aspectFill" />
                <view class="guide-mask">
                    <text class="guide-title">{{ t(g.titleKey) }}</text>
                    <TablerIcon name="play" :size="18" color="#FFFFFF" />
                </view>
            </view>
        </scroll-view>

        <text class="section-label">{{ t('profile.someFaqs') }}</text>
        <view class="shell-card faq-card">
            <view
                v-for="f in faqs"
                :key="f.id"
                class="faq-row"
                @tap="toggleFaq(f.id)"
            >
                <view class="faq-head">
                    <text class="faq-q">{{ t(f.qKey) }}</text>
                    <TablerIcon
                        :name="activeFaq === f.id ? 'chevron-up' : 'chevron-down'"
                        :size="16"
                        color="#8A82A0"
                    />
                </view>
                <text v-if="activeFaq === f.id" class="faq-a">{{ t(f.aKey) }}</text>
            </view>
        </view>

        <text class="section-label">{{ t('profile.stillNeedHelp') }}</text>
        <view class="shell-card support-card" @tap="contactSupport">
            <TablerIcon name="help" :size="20" color="#6B21C8" />
            <view class="support-text">
                <text class="support-title">{{ t('profile.contactSupport') }}</text>
                <text class="support-sub">{{ t('profile.contactSupportSub') }}</text>
            </view>
            <TablerIcon name="chevron-right" :size="16" color="#8A82A0" />
        </view>
    </AccountSubLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.section-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8a82a0;
    margin: 4px 2px 10px;
}

.guide-scroll {
    white-space: nowrap;
    margin-bottom: 18px;
}

.guide-card {
    position: relative;
    display: inline-block;
    width: 130px;
    height: 170px;
    margin-right: 10px;
    border-radius: 12px;
    overflow: hidden;
    vertical-align: top;
}

.guide-cover {
    width: 100%;
    height: 100%;
}

.guide-mask {
    position: absolute;
    inset: 0;
    background: rgba(26, 18, 40, 0.42);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 10px;
    gap: 8px;
}

.guide-title {
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.35;
    white-space: normal;
}

.faq-card {
    padding: 4px 16px;
    margin-bottom: 18px;
}

.faq-row {
    padding: 12px 0;
    border-bottom: 1px solid #e8e4f4;

    &:last-child {
        border-bottom: none;
    }
}

.faq-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.faq-q {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #4a4060;
    line-height: 1.4;
}

.faq-a {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.55;
    color: #8a82a0;
}

.support-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
}

.support-text {
    flex: 1;
    min-width: 0;
}

.support-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #4a4060;
}

.support-sub {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: #8a82a0;
}
</style>
