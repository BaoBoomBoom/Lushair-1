<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t } = useI18n();

const connectLedger = () => {
    uni.showToast({
        title: t('common.comingSoon'),
        icon: 'none',
        duration: 2000,
    });
};
</script>

<template>
    <AccountSubLayout :title="t('profile.genpulseLedger')">
        <view class="shell-card ledger-card">
            <view class="ledger-icon-wrap">
                <TablerIcon name="link" :size="28" color="#6B21C8" />
            </view>
            <text class="ledger-title">{{ t('profile.genpulseLedgerTitle') }}</text>
            <text class="ledger-desc">{{ t('profile.genpulseLedgerDesc') }}</text>
        </view>

        <template #footer>
            <view class="shell-btn" @tap="connectLedger">
                {{ t('profile.connectLedger') }}
            </view>
        </template>
    </AccountSubLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';

.ledger-card {
    text-align: center;
    padding: 28px 20px;
}

.ledger-icon-wrap {
    width: 56px;
    height: 56px;
    margin: 0 auto 14px;
    border-radius: 16px;
    background: rgba(107, 33, 200, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
}

.ledger-title {
    display: block;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #1a1228;
    margin-bottom: 8px;
}

.ledger-desc {
    display: block;
    font-size: 13px;
    line-height: 1.55;
    color: #8a82a0;
}
</style>
