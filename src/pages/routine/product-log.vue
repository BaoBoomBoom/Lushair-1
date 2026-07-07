<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useCareRoutinePlan } from '@/composables/useCareRoutinePlan';
import {
    groupProductsByPlanIngredients,
    loadLoggedProductIds,
    saveLoggedProductIds,
    type CarePlanProduct,
} from '@/utils/carePlanProducts';
import { useStatusBar } from '@/composables/useStatusBar';

const { t } = useI18n();
const { items, loadPlan } = useCareRoutinePlan();
const { headerPaddingStyle } = useStatusBar();

const loggedProductIds = ref<string[]>([]);

const grouped = computed(() => groupProductsByPlanIngredients(items.value));
const hasIngredients = computed(() => grouped.value.ingredients.length > 0);

const toggleProduct = (productId: string) => {
    if (loggedProductIds.value.includes(productId)) {
        loggedProductIds.value = loggedProductIds.value.filter((id) => id !== productId);
    } else {
        loggedProductIds.value = [...loggedProductIds.value, productId];
    }
    saveLoggedProductIds(loggedProductIds.value);
};

const isLogged = (productId: string) => loggedProductIds.value.includes(productId);

const goBack = () => {
    uni.navigateBack();
};

const categoryLabel = (product: CarePlanProduct) =>
    product.categoryKey ? t(product.categoryKey) : product.category;

onMounted(() => {
    loadPlan();
    loggedProductIds.value = loadLoggedProductIds();
});
</script>

<template>
    <view class="product-log-page">
        <view class="product-log-header" :style="headerPaddingStyle(12)">
            <view class="back-button" @tap="goBack">
                <TablerIcon name="chevron-right" :size="20" color="#1A1228" class="back-icon-flip" />
            </view>
            <text class="product-log-title">{{ t('routine.productLogTitle') }}</text>
            <view class="header-spacer" />
        </view>

        <scroll-view scroll-y class="product-log-scroll" :show-scrollbar="false">
            <view class="product-log-body">
                <text class="product-log-desc">{{ t('routine.productLogDesc') }}</text>

                <view v-if="hasIngredients" class="shell-card ingredient-card">
                    <text class="shell-label">{{ t('routine.recommendedIngredients') }}</text>
                    <view class="ingredient-chip-row">
                        <text v-for="ingredient in grouped.ingredients" :key="ingredient" class="ingredient-chip">
                            {{ ingredient }}
                        </text>
                    </view>
                </view>

                <view v-else class="shell-card ingredient-card">
                    <text class="empty-copy">{{ t('routine.productLogEmpty') }}</text>
                </view>

                <view v-if="grouped.fullMatch.length" class="section-block">
                    <text class="section-title">{{ t('routine.productFullMatch') }}</text>
                    <view
                        v-for="product in grouped.fullMatch"
                        :key="product.id"
                        class="shell-card product-card"
                        @tap="toggleProduct(product.id)"
                    >
                        <image :src="product.image" class="product-image" mode="aspectFit" />
                        <view class="product-copy">
                            <text class="product-category">{{ categoryLabel(product) }}</text>
                            <text class="product-name">{{ product.name }}</text>
                            <text class="product-match">{{ t('routine.coversAllIngredients') }}</text>
                        </view>
                        <view class="product-check" :class="{ on: isLogged(product.id) }">
                            <TablerIcon v-if="isLogged(product.id)" name="check" :size="14" color="#fff" />
                        </view>
                    </view>
                </view>

                <view v-if="grouped.partialMatch.length" class="section-block">
                    <text class="section-title">{{ t('routine.productPartialMatch') }}</text>
                    <view
                        v-for="entry in grouped.partialMatch"
                        :key="entry.product.id"
                        class="shell-card product-card"
                        @tap="toggleProduct(entry.product.id)"
                    >
                        <image :src="entry.product.image" class="product-image" mode="aspectFit" />
                        <view class="product-copy">
                            <text class="product-category">{{ categoryLabel(entry.product) }}</text>
                            <text class="product-name">{{ entry.product.name }}</text>
                            <text class="product-match">
                                {{ t('routine.matchesIngredients', [entry.matched.join(' · ')]) }}
                            </text>
                        </view>
                        <view class="product-check" :class="{ on: isLogged(entry.product.id) }">
                            <TablerIcon v-if="isLogged(entry.product.id)" name="check" :size="14" color="#fff" />
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.product-log-page {
    min-height: 100vh;
    background: #fff;
    display: flex;
    flex-direction: column;
}

.product-log-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #ececf1;
}

.back-button,
.header-spacer {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.back-icon-flip {
    transform: rotate(180deg);
}

.product-log-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #1a1228;
}

.product-log-scroll {
    flex: 1;
    min-height: 0;
    height: calc(100vh - 64px);
}

.product-log-body {
    padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
}

.product-log-desc {
    display: block;
    font-size: 13px;
    line-height: 1.55;
    color: #5b5a66;
    margin-bottom: 14px;
}

.ingredient-card {
    padding: 16px;
    margin-bottom: 18px;
}

.ingredient-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}

.ingredient-chip {
    font-size: 12px;
    font-weight: 600;
    color: #5b21b6;
    background: #f3eefc;
    border-radius: 999px;
    padding: 5px 11px;
}

.section-block {
    margin-bottom: 18px;
}

.section-title {
    display: block;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8a8990;
    margin: 0 2px 10px;
}

.product-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 10px;
}

.product-image {
    width: 42px;
    height: 64px;
    flex-shrink: 0;
}

.product-copy {
    flex: 1;
    min-width: 0;
}

.product-category {
    display: block;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8a8990;
    font-weight: 600;
}

.product-name {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: #1a1228;
}

.product-match {
    display: block;
    margin-top: 5px;
    font-size: 11px;
    line-height: 1.45;
    color: #6b21c8;
}

.product-check {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.8px solid #e2e2e8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.on {
        background: #6b21c8;
        border-color: #6b21c8;
    }
}

.empty-copy {
    font-size: 13px;
    line-height: 1.5;
    color: #8a8990;
}
</style>
