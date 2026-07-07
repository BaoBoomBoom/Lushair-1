<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import CarePlanChecklist from '@/components/care/CarePlanChecklist.vue';
import { useCareRoutinePlan, type CarePlanPeriod } from '@/composables/useCareRoutinePlan';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';

const { t } = useI18n();
const userStore = useUserStore();

const {
    items,
    loadPlan,
    toggleItem,
    removeItem,
    addItem,
    doneCount,
    totalCount,
    adherencePct,
    hasPlan,
} = useCareRoutinePlan();

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const todayIndex = (new Date().getDay() + 6) % 7;
const showAddSheet = ref(false);
const newRoutineName = ref('');
const newRoutinePeriod = ref<CarePlanPeriod>('morning');

const periodOptions = computed(() => [
    { id: 'morning' as CarePlanPeriod, label: t('routine.morning') },
    { id: 'evening' as CarePlanPeriod, label: t('routine.evening') },
    { id: 'treatment' as CarePlanPeriod, label: t('home.planSectionTreatments') },
    { id: 'diet' as CarePlanPeriod, label: t('home.planSectionDiet') },
]);

const fetchDailyTask = async () => {
    if (!userStore.userInfo.userId) return;
    try {
        await post('/encr/info', { userId: userStore.userInfo.userId });
    } catch (e) {
        console.error('routine encr fetch', e);
    }
};

const refreshPlan = () => {
    loadPlan();
};

const confirmRemove = (id: string) => {
    uni.showModal({
        title: t('routine.deleteConfirmTitle'),
        content: t('routine.deleteConfirmBody'),
        success: (res) => {
            if (res.confirm) removeItem(id);
        },
    });
};

const openAddSheet = () => {
    newRoutineName.value = '';
    newRoutinePeriod.value = 'morning';
    showAddSheet.value = true;
};

const closeAddSheet = () => {
    showAddSheet.value = false;
};

const submitNewRoutine = () => {
    if (!newRoutineName.value.trim()) {
        uni.showToast({ title: t('routine.addNameRequired'), icon: 'none' });
        return;
    }
    addItem(newRoutineName.value, newRoutinePeriod.value);
    closeAddSheet();
    uni.showToast({ title: t('routine.added'), icon: 'success' });
};

onMounted(() => {
    loadPlan();
    fetchDailyTask();
    uni.$on('care-plan-updated', refreshPlan);
});

onUnmounted(() => {
    uni.$off('care-plan-updated', refreshPlan);
});

onShow(() => {
    loadPlan();
});
</script>

<template>
    <MainTabLayout fixed-header>
        <view class="tab-page-scroll">
        <view class="routine-page">
        <text class="shell-ptitle">{{ t('routine.title') }}</text>

        <view class="shell-card adherence-card">
            <view class="adherence-ring">
                <text class="adherence-pct">{{ adherencePct }}%</text>
            </view>
            <view class="adherence-meta">
                <text class="shell-label">{{ t('routine.adherenceToday') }}</text>
                <text class="adherence-count">
                    <text class="done-num">{{ doneCount }}</text>
                    <text class="done-muted"> / {{ totalCount }} {{ t('routine.done') }}</text>
                </text>
            </view>
        </view>

        <view class="shell-card week-card">
            <text class="shell-label">{{ t('routine.thisWeek') }}</text>
            <view class="shell-week">
                <view v-for="(d, i) in weekDays" :key="i" class="wd">
                    <view
                        class="shell-wdot"
                        :class="{
                            done: i < todayIndex,
                            today: i === todayIndex,
                        }"
                    >
                        {{ d }}
                    </view>
                </view>
            </view>
        </view>

        <CarePlanChecklist v-if="hasPlan" :items="items" @toggle="toggleItem" @remove="confirmRemove" />

        <view v-else class="shell-card routine-empty-card">
            <text class="routine-empty-title">{{ t('routine.emptyTitle') }}</text>
            <text class="routine-empty-desc">{{ t('routine.emptyDesc') }}</text>
        </view>

        <button class="shell-btn" @click="openAddSheet">{{ t('routine.addItem') }}</button>
        </view>
        </view>
    </MainTabLayout>

    <view v-if="showAddSheet" class="routine-add-mask" @tap="closeAddSheet">
        <view class="routine-add-sheet" @tap.stop>
            <text class="routine-add-title">{{ t('routine.addItem') }}</text>
            <input v-model="newRoutineName" class="routine-add-input" :placeholder="t('routine.addPlaceholder')" />
            <view class="routine-period-row">
                <view
                    v-for="opt in periodOptions"
                    :key="opt.id"
                    class="routine-period-chip"
                    :class="{ on: newRoutinePeriod === opt.id }"
                    @tap="newRoutinePeriod = opt.id"
                >
                    {{ opt.label }}
                </view>
            </view>
            <button class="shell-btn" @click="submitNewRoutine">{{ t('common.confirm') }}</button>
            <button class="shell-btn shell-btn-ghost" @click="closeAddSheet">{{ t('common.back') }}</button>
        </view>
    </view>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.adherence-card {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 18px;
}

.adherence-ring {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    border: 6px solid #e8e4f4;
    border-top-color: #6b21c8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.adherence-pct {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #1a1228;
}

.adherence-count {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 22px;
    font-weight: 600;
    color: #1a1228;
    margin-top: 4px;
    display: block;
}

.done-num {
    color: #1a1228;
}

.done-muted {
    font-size: 15px;
    color: #8a82a0;
    font-weight: 500;
}

.week-card {
    padding: 16px 18px;
}

.routine-empty-card {
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.routine-empty-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1228;
}

.routine-empty-desc {
    font-size: 13px;
    line-height: 1.5;
    color: #8a82a0;
}

.routine-add-mask {
    position: fixed;
    inset: 0;
    background: rgba(26, 18, 40, 0.45);
    z-index: 1200;
    display: flex;
    align-items: flex-end;
}

.routine-add-sheet {
    width: 100%;
    background: #fff;
    border-radius: 20px 20px 0 0;
    padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.routine-add-title {
    font-size: 16px;
    font-weight: 700;
    color: #1a1228;
}

.routine-add-input {
    height: 44px;
    border: 1px solid #e8e4f4;
    border-radius: 12px;
    padding: 0 14px;
    font-size: 14px;
}

.routine-period-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.routine-period-chip {
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
</style>
