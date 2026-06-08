<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useUserStore } from '@/stores/userStore';
import { useNotificationSettings } from '@/composables/useNotificationSettings';
import type { NotificationSettings } from '@/composables/useNotificationSettings';

const { t } = useI18n();
const userStore = useUserStore();
const { settings, refresh, updateSetting } = useNotificationSettings();

type ReminderKey = keyof NotificationSettings;

interface ReminderRow {
    key: ReminderKey;
    titleKey: string;
    descKey: string;
    requiresCity?: boolean;
}

const reminderRows: ReminderRow[] = [
    { key: 'scanReminder', titleKey: 'profile.scanReminder', descKey: 'profile.scanReminderSub' },
    { key: 'routineReminder', titleKey: 'profile.routineReminder', descKey: 'profile.routineReminderSub' },
    { key: 'weatherReminder', titleKey: 'profile.weatherReminder', descKey: 'profile.weatherReminderSub', requiresCity: true },
    { key: 'recommendationReminder', titleKey: 'profile.recommendationReminder', descKey: 'profile.recommendationReminderSub' },
];

const userCity = computed(() => {
    const region = userStore.userInfo.region?.trim() || '';
    if (!region || region === 'Earth') return '';
    return region;
});

const hasCity = computed(() => userCity.value.length > 0);

const goSetCity = () => {
    uni.navigateTo({ url: '/pages/account/personal-info' });
};

const onToggle = (key: ReminderKey, enabled: boolean, requiresCity?: boolean) => {
    if (requiresCity && enabled && !hasCity.value) {
        uni.showToast({
            title: t('profile.weatherReminderNeedCity'),
            icon: 'none',
            duration: 2500,
        });
        return;
    }
    updateSetting(key, enabled, userCity.value);
};

onMounted(() => {
    refresh();
    if (userStore.userInfo.userId) {
        userStore.fetchUserInfo(userStore.userInfo.userId);
    }
});
</script>

<template>
    <AccountSubLayout :title="t('profile.notificationsTitle')">
        <text class="notifications-intro">{{ t('profile.notificationsIntro') }}</text>

        <view class="shell-card notifications-card">
            <view
                v-for="row in reminderRows"
                :key="row.key"
                class="notification-row"
            >
                <view class="notification-row-main">
                    <view class="notification-row-left">
                        <TablerIcon name="bell" :size="16" color="#6B21C8" />
                        <view class="notification-row-text">
                            <text class="notification-row-title">{{ t(row.titleKey) }}</text>
                            <text class="notification-row-desc">{{ t(row.descKey) }}</text>
                        </view>
                    </view>
                    <wd-switch
                        :model-value="settings[row.key]"
                        active-color="#6B21C8"
                        @change="(val) => onToggle(row.key, !!val, row.requiresCity)"
                    />
                </view>

                <view
                    v-if="row.requiresCity && !hasCity"
                    class="notification-city-hint"
                    @tap="goSetCity"
                >
                    <text>{{ t('profile.weatherReminderCityHint') }}</text>
                    <text class="notification-city-link">{{ t('profile.setCity') }}</text>
                </view>
                <view v-else-if="row.requiresCity && hasCity" class="notification-city-set">
                    <text>{{ t('profile.weatherReminderCitySet', [userCity]) }}</text>
                </view>
            </view>
        </view>
    </AccountSubLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.notifications-intro {
    display: block;
    font-size: 13px;
    line-height: 1.5;
    color: #8a82a0;
    margin-bottom: 14px;
}

.notifications-card {
    padding: 4px 18px;
}

.notification-row {
    padding: 12px 0;
    border-bottom: 1px solid #e8e4f4;

    &:last-child {
        border-bottom: none;
    }
}

.notification-row-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.notification-row-left {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
    flex: 1;
}

.notification-row-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.notification-row-title {
    font-size: 13px;
    font-weight: 600;
    color: #4a4060;
}

.notification-row-desc {
    font-size: 11px;
    line-height: 1.45;
    color: #8a82a0;
}

.notification-city-hint,
.notification-city-set {
    margin-top: 8px;
    margin-left: 24px;
    font-size: 11px;
    line-height: 1.45;
    color: #8a82a0;
}

.notification-city-hint {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.notification-city-link {
    color: #6b21c8;
    font-weight: 600;
}
</style>
