<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useUserStore } from '@/stores/userStore';
import {
    useNotificationSettings,
    type ReminderFrequency,
    type ReminderKey,
    type ReminderSchedule,
} from '@/composables/useNotificationSettings';

const { t } = useI18n();
const userStore = useUserStore();
const { settings, refresh, updateSetting, updateSchedule } = useNotificationSettings();

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

const frequencyOptions: { id: ReminderFrequency; labelKey: string }[] = [
    { id: 'daily', labelKey: 'profile.reminderDaily' },
    { id: 'every3days', labelKey: 'profile.reminderEvery3Days' },
    { id: 'weekly', labelKey: 'profile.reminderWeekly' },
];

const activeReminder = ref<ReminderKey | null>(null);
const draftSchedule = ref<ReminderSchedule>({ frequency: 'daily', time: '09:00' });

const userCity = computed(() => {
    const region = userStore.userInfo.region?.trim() || '';
    if (!region || region === 'Earth') return '';
    return region;
});

const hasCity = computed(() => userCity.value.length > 0);

const activeReminderTitle = computed(() => {
    const row = reminderRows.find((item) => item.key === activeReminder.value);
    return row ? t(row.titleKey) : '';
});

const formatScheduleSummary = (key: ReminderKey) => {
    const schedule = settings.value.schedules[key];
    const freq = t(frequencyOptions.find((opt) => opt.id === schedule.frequency)?.labelKey || 'profile.reminderDaily');
    return `${freq} · ${schedule.time}`;
};

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

const openReminderSettings = (key: ReminderKey) => {
    activeReminder.value = key;
    draftSchedule.value = { ...settings.value.schedules[key] };
};

const closeReminderSettings = () => {
    activeReminder.value = null;
};

const saveReminderSettings = () => {
    if (!activeReminder.value) return;
    updateSchedule(activeReminder.value, draftSchedule.value, userCity.value);
    if (!settings.value[activeReminder.value]) {
        updateSetting(activeReminder.value, true, userCity.value);
    }
    closeReminderSettings();
    uni.showToast({ title: t('profile.reminderSaved'), icon: 'success' });
};

const onTimeChange = (event: { detail: { value: string } }) => {
    draftSchedule.value.time = event.detail.value;
};

onMounted(() => {
    refresh();
    if (userStore.userInfo.userId) {
        userStore.fetchUserInfo(userStore.userInfo.userId);
    }
});
</script>

<template>
    <AccountSubLayout :title="t('profile.notificationsTitle')" :subtitle="t('profile.notificationsIntro')">
        <view class="shell-card notifications-card">
            <view
                v-for="row in reminderRows"
                :key="row.key"
                class="notification-row"
            >
                <view class="notification-row-main">
                    <view class="notification-row-left" @tap="openReminderSettings(row.key)">
                        <TablerIcon name="bell" :size="16" color="#6B21C8" />
                        <view class="notification-row-text">
                            <text class="notification-row-title">{{ t(row.titleKey) }}</text>
                            <text class="notification-row-desc">{{ t(row.descKey) }}</text>
                            <text class="notification-row-schedule">{{ formatScheduleSummary(row.key) }}</text>
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

    <view v-if="activeReminder" class="reminder-sheet-mask" @tap="closeReminderSettings">
        <view class="reminder-sheet" @tap.stop>
            <text class="reminder-sheet-title">{{ activeReminderTitle }}</text>
            <text class="reminder-sheet-sub">{{ t('profile.reminderSheetSub') }}</text>

            <text class="reminder-field-label">{{ t('profile.reminderFrequency') }}</text>
            <view class="reminder-frequency-row">
                <view
                    v-for="opt in frequencyOptions"
                    :key="opt.id"
                    class="reminder-frequency-chip"
                    :class="{ on: draftSchedule.frequency === opt.id }"
                    @tap="draftSchedule.frequency = opt.id"
                >
                    {{ t(opt.labelKey) }}
                </view>
            </view>

            <text class="reminder-field-label">{{ t('profile.reminderTime') }}</text>
            <picker mode="time" :value="draftSchedule.time" @change="onTimeChange">
                <view class="reminder-time-picker">
                    <TablerIcon name="clock" :size="16" color="#6B21C8" />
                    <text>{{ draftSchedule.time }}</text>
                </view>
            </picker>

            <button class="shell-btn" @tap="saveReminderSettings">{{ t('common.confirm') }}</button>
            <button class="shell-btn shell-btn-ghost" @tap="closeReminderSettings">{{ t('common.back') }}</button>
        </view>
    </view>
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

/* When AccountSubLayout subtitle is used, hide duplicate intro class */
.account-sub-body > .notifications-intro:first-child {
    margin-top: 0;
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

.notification-row-schedule {
    font-size: 11px;
    font-weight: 600;
    color: #6b21c8;
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

.reminder-sheet-mask {
    position: fixed;
    inset: 0;
    background: rgba(26, 18, 40, 0.45);
    z-index: 1200;
    display: flex;
    align-items: flex-end;
}

.reminder-sheet {
    width: 100%;
    background: #fff;
    border-radius: 20px 20px 0 0;
    padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.reminder-sheet-title {
    font-size: 17px;
    font-weight: 700;
    color: #1a1228;
}

.reminder-sheet-sub {
    font-size: 12px;
    line-height: 1.5;
    color: #8a82a0;
    margin-bottom: 4px;
}

.reminder-field-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8a82a0;
}

.reminder-frequency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.reminder-frequency-chip {
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid #e8e4f4;
    font-size: 12px;
    color: #6b5f80;

    &.on {
        border-color: #6b21c8;
        background: #f3ecff;
        color: #6b21c8;
        font-weight: 600;
    }
}

.reminder-time-picker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid #e8e4f4;
    font-size: 15px;
    font-weight: 600;
    color: #1a1228;
}
</style>
