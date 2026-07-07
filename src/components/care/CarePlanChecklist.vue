<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import type { CarePlanPeriod, StoredCareRoutineItem } from '@/composables/useCareRoutinePlan';

const props = withDefaults(
    defineProps<{
        items: StoredCareRoutineItem[];
        compact?: boolean;
    }>(),
    { compact: false },
);

const emit = defineEmits<{
    toggle: [id: string];
    remove: [id: string];
}>();

const { t } = useI18n();

const PERIOD_ORDER: CarePlanPeriod[] = ['ingredient', 'morning', 'evening', 'treatment', 'diet'];

const periodTitleKey: Record<CarePlanPeriod, string> = {
    ingredient: 'home.planSectionIngredients',
    morning: 'routine.morning',
    evening: 'routine.evening',
    treatment: 'home.planSectionTreatments',
    diet: 'home.planSectionDiet',
};

const sections = computed(() =>
    PERIOD_ORDER.map((period) => ({
        period,
        title: t(periodTitleKey[period]),
        items: props.items.filter((item) => item.period === period),
    })).filter((section) => section.items.length > 0),
);
</script>

<template>
    <view class="care-plan-checklist" :class="{ compact }">
        <view v-for="section in sections" :key="section.period" class="care-plan-section">
            <text class="care-plan-section-title">{{ section.title }}</text>
            <view class="shell-card care-plan-task-card">
                <view
                    v-for="item in section.items"
                    :key="item.id"
                    class="shell-rt-item"
                    @click="emit('toggle', item.id)"
                >
                    <checkbox :checked="item.done" color="#6b21c8" @click.stop="emit('toggle', item.id)" />
                    <view class="shell-rt-ic">
                        <TablerIcon :name="item.icon" :size="18" />
                    </view>
                    <view class="rt-body">
                        <text class="shell-rt-name" :class="{ done: item.done }">{{ item.name }}</text>
                        <text v-if="item.sub" class="shell-rt-sub">{{ item.sub }}</text>
                    </view>
                    <view class="rt-delete" @click.stop="emit('remove', item.id)">
                        <TablerIcon name="trash" :size="16" color="#b42318" />
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.care-plan-checklist {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.care-plan-checklist.compact {
    gap: 10px;
}

.care-plan-section-title {
    display: block;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    color: #8a82a0;
    margin: 0 2px 8px;
}

.care-plan-task-card {
    padding: 6px 16px;
}

.rt-body {
    flex: 1;
    min-width: 0;
}

.rt-delete {
    padding: 4px;
    flex-shrink: 0;
}
</style>
