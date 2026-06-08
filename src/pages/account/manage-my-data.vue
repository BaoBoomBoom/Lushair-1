<script setup lang="ts">
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t } = useI18n();

interface DataItem {
    id: number;
    titleKey: string;
    enabled: boolean;
}

const items = reactive<DataItem[]>([
    { id: 1, titleKey: 'profile.sharingWithA', enabled: false },
    { id: 2, titleKey: 'profile.sharingWithB', enabled: false },
    { id: 3, titleKey: 'profile.sharingWithC', enabled: false },
]);

function onToggle(item: DataItem) {
    uni.showToast({
        title: item.enabled ? t('profile.dataSharingEnabled') : t('profile.dataSharingDisabled'),
        icon: 'none',
    });
}
</script>

<template>
    <AccountSubLayout :title="t('profile.manageMyData')">
        <text class="page-intro">
            {{ t('profile.dataUsageTip') }}
            <text class="page-intro-link">{{ t('profile.learnMore') }}</text>
        </text>

        <view class="shell-card data-card">
            <view v-for="item in items" :key="item.id" class="data-row">
                <view class="data-row-left">
                    <TablerIcon name="database" :size="16" color="#6B21C8" />
                    <text class="data-row-title">{{ t(item.titleKey) }}</text>
                </view>
                <wd-switch
                    v-model="item.enabled"
                    active-color="#6B21C8"
                    @change="onToggle(item)"
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
    line-height: 1.55;
    color: #8a82a0;
    margin-bottom: 14px;
}

.page-intro-link {
    color: #6b21c8;
    font-weight: 600;
}

.data-card {
    padding: 4px 16px;
}

.data-row {
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

.data-row-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
}

.data-row-title {
    font-size: 13px;
    font-weight: 600;
    color: #4a4060;
    line-height: 1.35;
}
</style>
