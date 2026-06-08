<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import type { TablerIconName } from '@/components/icons/tabler-icons';

const { t } = useI18n();
const showDeletePopup = ref(false);
const deletePassword = ref('');

interface AccountOption {
    titleKey: string;
    subtitleKey: string;
    icon: TablerIconName;
    onClick: () => void;
}

const accountOptions: AccountOption[] = [
    {
        titleKey: 'profile.personalInfo',
        subtitleKey: 'profile.personalInfoSub',
        icon: 'user',
        onClick: () => uni.navigateTo({ url: '/pages/account/personal-info' }),
    },
    {
        titleKey: 'profile.updateEmail',
        subtitleKey: 'profile.updateEmailSub',
        icon: 'mail',
        onClick: () => uni.navigateTo({ url: '/pages/account/update-email' }),
    },
    {
        titleKey: 'profile.updatePhone',
        subtitleKey: 'profile.updatePhoneSub',
        icon: 'phone',
        onClick: () => uni.navigateTo({ url: '/pages/account/update-phone' }),
    },
    {
        titleKey: 'profile.changePassword',
        subtitleKey: 'profile.changePasswordSub',
        icon: 'lock',
        onClick: () => uni.navigateTo({ url: '/pages/account/change-password' }),
    },
];

function deleteAccount() {
    showDeletePopup.value = true;
}

function closeDeletePopup() {
    showDeletePopup.value = false;
    deletePassword.value = '';
}

function confirmDelete() {
    if (!deletePassword.value) {
        uni.showToast({ title: t('profile.passwordEmpty'), icon: 'none' });
        return;
    }
    uni.showToast({ title: t('profile.delete'), icon: 'success' });
    closeDeletePopup();
}
</script>

<template>
    <AccountSubLayout :title="t('profile.accountDetails')">
        <text class="page-intro">{{ t('profile.accountDetailsSub') }}</text>

        <view class="shell-card details-card">
            <view
                v-for="(item, index) in accountOptions"
                :key="index"
                class="details-row"
                @tap="item.onClick()"
            >
                <view class="details-row-left">
                    <TablerIcon :name="item.icon" :size="16" color="#6B21C8" />
                    <view class="details-row-text">
                        <text class="details-row-title">{{ t(item.titleKey) }}</text>
                        <text class="details-row-sub">{{ t(item.subtitleKey) }}</text>
                    </view>
                </view>
                <TablerIcon name="chevron-right" :size="16" color="#8A82A0" />
            </view>
        </view>

        <text class="details-section-label">{{ t('profile.dangerZone') }}</text>

        <view class="shell-card details-card">
            <view class="details-row details-row--danger" @tap="deleteAccount">
                <view class="details-row-left">
                    <TablerIcon name="trash" :size="16" color="#E0556B" />
                    <view class="details-row-text">
                        <text class="details-row-title details-row-title--danger">
                            {{ t('profile.deleteAccount') }}
                        </text>
                        <text class="details-row-sub">{{ t('profile.deleteAccountSub') }}</text>
                    </view>
                </view>
                <TablerIcon name="chevron-right" :size="16" color="#E0556B" />
            </view>
        </view>

        <view v-if="showDeletePopup" class="account-modal-mask" @tap="closeDeletePopup">
            <view class="account-modal-card account-modal-card--confirm" @tap.stop>
                <view class="account-modal-icon account-modal-icon--danger">
                    <TablerIcon name="trash" :size="22" color="#E0556B" />
                </view>
                <text class="account-modal-title">{{ t('profile.deleteConfirmTitle') }}</text>
                <text class="account-modal-desc">{{ t('profile.deleteConfirmDesc1') }}</text>
                <text class="account-modal-desc">{{ t('profile.deleteConfirmDesc2') }}</text>
                <view class="shell-form-field delete-password-field">
                    <text class="shell-form-label">{{ t('profile.passwordLabel') }}</text>
                    <input
                        v-model="deletePassword"
                        type="password"
                        class="shell-input"
                        :placeholder="t('profile.currentPassword')"
                    />
                </view>
                <view class="account-modal-actions account-modal-actions--stack">
                    <view class="shell-btn shell-btn-danger" @tap="confirmDelete">
                        {{ t('profile.delete') }}
                    </view>
                    <view class="shell-btn shell-btn-ghost" @tap="closeDeletePopup">
                        {{ t('profile.cancel') }}
                    </view>
                </view>
            </view>
        </view>
    </AccountSubLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.page-intro {
    display: block;
    font-size: 13px;
    line-height: 1.55;
    color: #8a82a0;
    margin-bottom: 14px;
}

.details-card {
    padding: 4px 16px;
}

.details-section-label {
    display: block;
    margin: 18px 2px 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #8a82a0;
}

.details-row {
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

.details-row-left {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    flex: 1;
}

.details-row-text {
    min-width: 0;
    flex: 1;
}

.details-row-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #4a4060;
}

.details-row-title--danger {
    color: #e0556b;
}

.details-row-sub {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.45;
    color: #8a82a0;
}

.delete-password-field {
    margin-top: 12px;
}
</style>
