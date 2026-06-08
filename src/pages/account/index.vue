<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ShellUserIcon from '@/components/icons/ShellUserIcon.vue';
import type { TablerIconName } from '@/components/icons/tabler-icons';
import { goHome } from '@/composables/useAppNavigation';
import { performAccountLogout } from '@/composables/useAccountLogout';

const { t } = useI18n();
const userStore = useUserStore();
const { userInfo } = userStore;
const showLogoutModal = ref(false);

type AccountRowType = 'nav' | 'static' | 'logout';

interface AccountRow {
    icon: TablerIconName;
    titleKey: string;
    type: AccountRowType;
    staticValue?: string;
    onClick?: () => void;
}

const displayEmail = computed(() => userInfo.email || 'user@email.com');
const displayPhone = computed(() => userInfo.phone || '—');

const confirmLogout = () => {
    showLogoutModal.value = true;
};

const closeLogoutModal = () => {
    showLogoutModal.value = false;
};

const handleLogoutConfirm = () => {
    showLogoutModal.value = false;
    performAccountLogout();
};

const goBackToDashboard = () => {
    goHome();
};

const accountRows = computed<AccountRow[]>(() => [
    {
        icon: 'user',
        titleKey: 'profile.accountDetails',
        type: 'nav',
        onClick: () => uni.navigateTo({ url: '/pages/account/details' }),
    },
    {
        icon: 'world',
        titleKey: 'profile.language',
        type: 'nav',
        onClick: () => uni.navigateTo({ url: '/pages/account/language' }),
    },
    {
        icon: 'bell',
        titleKey: 'profile.notifications',
        type: 'nav',
        onClick: () => uni.navigateTo({ url: '/pages/account/notifications' }),
    },
    {
        icon: 'link',
        titleKey: 'profile.genpulseLedger',
        type: 'nav',
        onClick: () => uni.navigateTo({ url: '/pages/account/genpulse-ledger' }),
    },
    {
        icon: 'database',
        titleKey: 'profile.manageData',
        type: 'nav',
        onClick: () => uni.navigateTo({ url: '/pages/account/manage-my-data' }),
    },
    {
        icon: 'help',
        titleKey: 'profile.helpSupport',
        type: 'nav',
        onClick: () => uni.navigateTo({ url: '/pages/account/help-support' }),
    },
    {
        icon: 'help',
        titleKey: 'profile.support',
        type: 'static',
        staticValue: t('profile.supportEmail'),
    },
    {
        icon: 'user-circle',
        titleKey: 'profile.logout',
        type: 'logout',
        onClick: confirmLogout,
    },
]);

const handleRowTap = (item: AccountRow) => {
    if (item.type === 'static') return;
    item.onClick?.();
};

onMounted(() => {
    if (userInfo.userId) {
        userStore.fetchUserInfo(userInfo.userId);
    }
});
</script>

<template>
    <MainTabLayout>
        <view class="account-shell">
            <view class="account-body">
                <text class="shell-ptitle">{{ t('tabbar.profile') }}</text>

                <view class="shell-card shell-account-hero">
                    <ShellUserIcon variant="account" />
                    <text class="shell-account-name">{{ userInfo.name || 'User' }}</text>
                    <text class="shell-account-email">{{ displayEmail }}</text>
                    <text class="shell-account-phone">{{ displayPhone }}</text>
                </view>

                <view class="shell-card settings-card">
                    <view
                        v-for="(item, index) in accountRows"
                        :key="'account-row-' + index"
                        class="shell-row account-row"
                        :class="{ 'account-row--logout': item.type === 'logout' }"
                        @tap="handleRowTap(item)"
                    >
                        <view class="account-row-left">
                            <TablerIcon :name="item.icon" :size="16" color="#6B21C8" />
                            <text class="row-label">{{ t(item.titleKey) }}</text>
                        </view>
                        <view class="account-row-right">
                            <text
                                v-if="item.staticValue"
                                class="shell-row-val"
                            >{{ item.staticValue }}</text>
                            <TablerIcon
                                v-else-if="item.type === 'nav' || item.type === 'logout'"
                                name="chevron-right"
                                :size="16"
                                color="#8A82A0"
                            />
                        </view>
                    </view>
                </view>

                <view class="shell-btn shell-btn-ghost account-dashboard-btn" @tap="goBackToDashboard">
                    {{ t('profile.backToDashboard') }}
                </view>
            </view>
        </view>

        <view v-if="showLogoutModal" class="account-modal-mask" @tap="closeLogoutModal">
            <view class="account-modal-card account-modal-card--confirm" @tap.stop>
                <view class="account-modal-icon account-modal-icon--primary">
                    <TablerIcon name="user-circle" :size="22" color="#6B21C8" />
                </view>
                <text class="account-modal-title">{{ t('profile.logoutTip') }}</text>
                <text class="account-modal-desc">{{ t('profile.logoutConfirm') }}</text>
                <view class="account-modal-actions account-modal-actions--stack">
                    <view class="shell-btn" @tap="handleLogoutConfirm">
                        {{ t('profile.logout') }}
                    </view>
                    <view class="shell-btn shell-btn-ghost" @tap="closeLogoutModal">
                        {{ t('profile.cancel') }}
                    </view>
                </view>
            </view>
        </view>
    </MainTabLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.account-shell {
    min-height: 100%;
    box-sizing: border-box;
}

.account-body {
    padding: 0 16px 24px;
}

.settings-card {
    padding: 4px 18px;
}

.account-row {
    cursor: pointer;
    gap: 8px;
}

.account-row-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
}

.account-row-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.row-label {
    font-size: 13px;
    color: #4a4060;
}

.shell-account-phone {
    font-size: 12px;
    color: #8a82a0;
    margin-top: 3px;
    display: block;
}

.account-row--logout .row-label {
    color: #6b21c8;
    font-weight: 600;
}

.account-dashboard-btn {
    margin-top: 12px;
    width: 100%;
}
</style>
