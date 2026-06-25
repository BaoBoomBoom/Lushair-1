<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import type { TablerIconName } from '@/components/icons/tabler-icons';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';

const { t } = useI18n();
const userStore = useUserStore();

interface RoutineItem {
    id: string;
    period: 'morning' | 'evening';
    name: string;
    sub: string;
    icon: TablerIconName;
    done: boolean;
}

const items = ref<RoutineItem[]>([
    { id: '1', period: 'morning', name: 'Biotin 5 mg', sub: 'With breakfast', icon: 'pill', done: false },
    { id: '2', period: 'morning', name: 'Minoxidil 5%', sub: 'Apply to crown · AM', icon: 'droplet', done: false },
    { id: '3', period: 'evening', name: 'Gentle shampoo', sub: '2× / week', icon: 'bath', done: false },
    { id: '4', period: 'evening', name: 'Scalp massage', sub: '3 min', icon: 'yoga', done: false },
]);

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const todayIndex = (new Date().getDay() + 6) % 7;

const doneCount = computed(() => items.value.filter((i) => i.done).length);
const totalCount = computed(() => items.value.length);
const adherencePct = computed(() =>
    totalCount.value ? Math.round((doneCount.value / totalCount.value) * 100) : 0
);

const morningItems = computed(() => items.value.filter((i) => i.period === 'morning'));
const eveningItems = computed(() => items.value.filter((i) => i.period === 'evening'));

const toggleItem = (id: string) => {
    const item = items.value.find((i) => i.id === id);
    if (item) item.done = !item.done;
    persistRoutine();
};

const persistRoutine = () => {
    try {
        uni.setStorageSync('routine_check_state', JSON.stringify(items.value.map((i) => ({ id: i.id, done: i.done }))));
    } catch (e) {
        console.error(e);
    }
};

const loadRoutine = () => {
    try {
        const raw = uni.getStorageSync('routine_check_state');
        if (raw) {
            const saved = JSON.parse(raw) as { id: string; done: boolean }[];
            saved.forEach((s) => {
                const item = items.value.find((i) => i.id === s.id);
                if (item) item.done = s.done;
            });
        }
    } catch (e) {
        console.error(e);
    }
};

const fetchDailyTask = async () => {
    if (!userStore.userInfo.userId) return;
    try {
        await post('/encr/info', { userId: userStore.userInfo.userId });
    } catch (e) {
        console.error('routine encr fetch', e);
    }
};

const goClockIn = () => {
    uni.navigateTo({ url: '/pages/routine/clock-in' });
};

const addFromRecs = () => {
    uni.switchTab({ url: '/pages/scan/index' });
};

onMounted(() => {
    loadRoutine();
    fetchDailyTask();
});
</script>

<template>
    <MainTabLayout>
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

        <text class="shell-section-h">{{ t('routine.morning') }}</text>
        <view class="shell-card task-card">
            <view
                v-for="item in morningItems"
                :key="item.id"
                class="shell-rt-item"
                @click="toggleItem(item.id)"
            >
                <checkbox :checked="item.done" color="#6b21c8" @click.stop="toggleItem(item.id)" />
                <view class="shell-rt-ic">
                    <TablerIcon :name="item.icon" :size="18" />
                </view>
                <view class="rt-body">
                    <text class="shell-rt-name" :class="{ done: item.done }">{{ item.name }}</text>
                    <text class="shell-rt-sub">{{ item.sub }}</text>
                </view>
            </view>
        </view>

        <text class="shell-section-h">{{ t('routine.evening') }}</text>
        <view class="shell-card task-card">
            <view
                v-for="item in eveningItems"
                :key="item.id"
                class="shell-rt-item"
                @click="toggleItem(item.id)"
            >
                <checkbox :checked="item.done" color="#6b21c8" @click.stop="toggleItem(item.id)" />
                <view class="shell-rt-ic">
                    <TablerIcon :name="item.icon" :size="18" />
                </view>
                <view class="rt-body">
                    <text class="shell-rt-name" :class="{ done: item.done }">{{ item.name }}</text>
                    <text class="shell-rt-sub">{{ item.sub }}</text>
                </view>
            </view>
        </view>

        <button class="shell-btn shell-btn-ghost" @click="goClockIn">{{ t('routine.haircareLog') }}</button>
        <button class="shell-btn shell-btn-ghost" @click="addFromRecs">{{ t('routine.addFromRecs') }}</button>
    </MainTabLayout>
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

.task-card {
    padding: 6px 18px;
}

.rt-body {
    flex: 1;
    min-width: 0;
}
</style>
