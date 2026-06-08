import { ref } from 'vue';
import { post } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

interface EncrInfoResponse {
    points: number | null;
    productClockInDaysInWeek: number | null;
    monthlySummary: Record<string, number> | null;
}

const encrInfo = ref<EncrInfoResponse>({
    points: null,
    productClockInDaysInWeek: null,
    monthlySummary: null,
});

const latestSummaryData = ref<{ precede?: number; ratio?: number; lastScore?: number }>({});

export async function fetchEncrInfo(userId: string) {
    try {
        const res = await post('/encr/info', { userId });
        if (!res) return;

        const data = res as EncrInfoResponse;
        encrInfo.value = { ...data };

        userStore.updateUserInfo({ hairPoints: data.points ?? 0 });
    } catch (err) {
        console.error('fetchEncrInfo error:', err);
    }
}

export async function fetchlatestSummaryData(userId: string) {
    try {
        const summaryResponse = await post('analyse/latest/summary', { userId });
        if (summaryResponse) {
            latestSummaryData.value = summaryResponse;
        }
    } catch (err) {
        console.error('fetchlatestSummaryData error:', err);
    }
}

export function useEncrInfo() {
    return {
        encrInfo,
        latestSummaryData,
        fetchEncrInfo,
        fetchlatestSummaryData,
    };
}
