<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
//@ts-ignore
import { setLocale, getLocale } from '@/i18n.js';

declare var window: Window & {
    webkit?: { messageHandlers?: Record<string, { postMessage: (d: unknown) => void }> };
    android?: Record<string, (d: string) => void>;
};

const { t, locale } = useI18n();

const langs = [
    { value: 'zh-Hans', title: '中文（简体）', sub: 'chinese' },
    { value: 'zh-Hant-HK', title: '中文（香港）', sub: 'chineseHK' },
    { value: 'zh-Hant-TW', title: '中文（台灣）', sub: 'chineseTW' },
    { value: 'en', title: 'English', sub: 'english' },
    { value: 'ja', title: '日本語', sub: 'japanese' },
    { value: 'ko', title: '한국어', sub: 'korean' },
    { value: 'es', title: 'Español', sub: 'spanish' },
    { value: 'fr', title: 'Français', sub: 'french' },
    { value: 'de', title: 'Deutsch', sub: 'german' },
    { value: 'ru', title: 'Русский', sub: 'russian' },
    { value: 'pt', title: 'Português', sub: 'portuguese' },
    { value: 'it', title: 'Italiano', sub: 'italian' },
    { value: 'ar', title: 'العربية', sub: 'arabic' },
    { value: 'th', title: 'ภาษาไทย', sub: 'thai' },
    { value: 'vi', title: 'Tiếng Việt', sub: 'vietnamese' },
    { value: 'id', title: 'Bahasa Indonesia', sub: 'indonesian' },
    { value: 'fil', title: 'Filipino', sub: 'filipino' },
    { value: 'pl', title: 'Polski', sub: 'polish' },
];

const selected = ref('');

onMounted(() => {
    selected.value = getLocale();
});

function notifyLanguageChange(val: string) {
    try {
        uni.$emit('languageChanged', val);
        const info = uni.getSystemInfoSync();
        if (info.platform !== 'devtools') {
            if (window.webkit?.messageHandlers?.onLanguageChange) {
                window.webkit.messageHandlers.onLanguageChange.postMessage({ locale: val });
            } else if (window.android?.onLanguageChange) {
                window.android.onLanguageChange(val);
            }
        }
    } catch (e) {
        console.error('notifyLanguageChange error', e);
    }
}

function chooseLang(val: string) {
    if (selected.value === val) return;
    selected.value = val;
    setLocale(val);
    locale.value = val;

    const msg = val.startsWith('zh') ? t('language.switchedToChinese') : t('language.switchedToEnglish');
    uni.showToast({ title: msg, icon: 'none', duration: 1500 });
    notifyLanguageChange(val);
}
</script>

<template>
    <AccountSubLayout :title="t('language.title')">
        <text class="page-intro">{{ t('profile.preferredLanguage') }}</text>

        <view class="shell-card lang-card">
            <view
                v-for="item in langs"
                :key="item.value"
                class="lang-row"
                :class="{ 'lang-row--active': selected === item.value }"
                @tap="chooseLang(item.value)"
            >
                <view class="lang-row-text">
                    <text class="lang-row-title">{{ item.title }}</text>
                    <text class="lang-row-sub">{{ t(`language.${item.sub}`) }}</text>
                </view>
                <TablerIcon
                    v-if="selected === item.value"
                    name="check"
                    :size="18"
                    color="#6B21C8"
                />
            </view>
        </view>
    </AccountSubLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.page-intro {
    display: block;
    font-size: 13px;
    line-height: 1.5;
    color: #8a82a0;
    margin-bottom: 14px;
}

.lang-card {
    padding: 4px 16px;
}

.lang-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid #e8e4f4;

    &:last-child {
        border-bottom: none;
    }
}

.lang-row--active .lang-row-title {
    color: #6b21c8;
}

.lang-row-text {
    min-width: 0;
    flex: 1;
}

.lang-row-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #4a4060;
}

.lang-row-sub {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: #8a82a0;
}
</style>
