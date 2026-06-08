<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t, locale } = useI18n();
const userStore = useUserStore();

// API数据接口定义
interface DetectionRecord {
    age: number;
    avatar: string;
    createTime: string;
    follicle: string;
    hair: string;
    name: string;
    nickName: string;
    phone: number;
    recordId: number;
    reportId?: string;  // 添加reportId字段
    scalp: string;
    scalpScore: string;
    userId: string;
}

interface SelfieResult {
    approximateAge: number;
    breakHair: number;
    createTime: string | null;
    createdTime: string | null;
    drink: number;
    extInfo: string | null;
    gender: string | null;
    id: number;
    image: string;
    loseHair: number;
    position: string;
    reportId: string | null;
    scalp: string | null;
    scurf: number;
    sleep: number;
    stage: number;
    userId: string;
}

// 统一的历史记录接口
interface HistoryRecord {
    id: number;
    userId: string;
    date: string;
    type: 'advancedScan' | 'phoneCamera';
    typeLabel: string;
    typeIcon: string;
    hairLossPattern: {
        level: number;
        total: number;
        improvement: number;
    };
    hairScore: {
        score: number;
        total: number;
        improvement: number;
    };
    originalData: DetectionRecord | SelfieResult;
}

type ScoreMetricKey = 'hair' | 'follicle' | 'scalp';

// 响应式数据
const historyRecords = ref<HistoryRecord[]>([]);
const isLoading = ref(false);
const loadError = ref('');

// 日期筛选器相关状态
const selectedDateFilter = ref<string | null>(null); // null表示"全部"，具体日期字符串表示选中日期
const showDatePicker = ref(false);
const datePickerMonth = ref(new Date());
const selectedFilterDate = ref<Date | null>(null);
const historyTab = ref<'selfie' | 'trichoscan'>('selfie');
const scoreMetric = ref<ScoreMetricKey>('hair');
const showScoreMenu = ref(false);
const chartDetectionRecords = ref<DetectionRecord[]>([]);
const historyView = ref<'timeline' | 'gallery'>('timeline');
const trichoThumbCache = ref<Record<number, string>>({});
const dateChip = ref<'all' | 'last90'>('all');
const baSplit = ref(50);
const baDragging = ref(false);

const tabs = [
    { key: 'analysis', label: t('hair.analysis') || 'Analysis' },
    { key: 'history', label: t('hair.historyLog') || 'History Log' },
];

// 工具函数
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        
        return `${month} ${day}, ${year} AT ${displayHours}:${displayMinutes} ${ampm}`;
    } catch (error) {
        console.error('Date formatting error:', error);
        return dateString;
    }
};

const getSelfieType = (position: string): string => {
    const pos = (position || '').toLowerCase();
    if (pos === 'forehead' || pos === '前额' || pos.includes('frontal')) return t('hair.frontal');
    if (pos === 'crown' || pos === '头顶' || pos.includes('top')) return t('hair.typeV');
    if (pos === 'none' || pos === '无') return t('hair.typeNone');
    if (pos === 'alopecia areata' || pos === '斑秃' || pos.includes('alopecia')) return t('hair.typeAlopecia');
    return position || t('hair.typeNone');
};

const calculateLevel = (scalpScore: number): number => {
    if (scalpScore >= 90) return 1;
    if (scalpScore >= 80) return 2;
    if (scalpScore >= 70) return 3;
    if (scalpScore >= 60) return 4;
    if (scalpScore >= 50) return 5;
    if (scalpScore >= 40) return 6;
    return 7;
};

const calculateSelfieScore = (stage: number, extInfo: string | null): number => {
    let baseScore = 100 - (stage - 1) * 10; // stage 1=100, 2=90, etc.
    
    if (extInfo) {
        try {
            const info = JSON.parse(extInfo);
            const factors = ['oil', 'discomfort', 'scurfOrKeratin', 'overall', 'hairLoss'];
            
            factors.forEach(factor => {
                const value = info[factor];
                if (value === 1) baseScore -= 5;
                else if (value === 2) baseScore -= 10;
                else if (value === 3) baseScore -= 15;
            });
        } catch (error) {
            console.error('ExtInfo parsing error:', error);
        }
    }
    
    return Math.max(0, Math.min(100, baseScore));
};


// API调用函数
const fetchDetectionRecords = async (userId: string): Promise<DetectionRecord[]> => {
    try {
        console.log('Fetching detection records for userId:', userId);
        const response = await post('user/getDetectionRecordList', {
            userId: userId
        }) as { list?: DetectionRecord[] };
        console.log('Detection records response:', response);
        return response.list || [];
    } catch (error) {
        console.error('Failed to fetch detection records:', error);
        return [];
    }
};

const fetchSelfieResults = async (userId: string): Promise<SelfieResult[]> => {
    try {
        console.log('Fetching selfie results for userId:', userId);
        const response = await post('user/getSelfieResultList', {
            userId: userId
        }) as SelfieResult[];
        console.log('Selfie results response:', response);
        return response || [];
    } catch (error) {
        console.error('Failed to fetch selfie results:', error);
        return [];
    }
};

// 数据处理和合并
const processHistoryData = async (): Promise<{ detectionRecords: DetectionRecord[], selfieResults: SelfieResult[] }> => {
    isLoading.value = true;
    loadError.value = '';
    
    try {
        // 获取当前userId
        let userId = userStore.userInfo.userId;
        if (!userId) {
            const localUserInfo = uni.getStorageSync('userInfo');
            const storedUserId = uni.getStorageSync('userId');
            userId = localUserInfo?.userId || storedUserId;
        }
        
        if (!userId) {
            throw new Error('No userId available');
        }
        
        const [detectionRecords, selfieResults] = await Promise.all([
            fetchDetectionRecords(userId),
            fetchSelfieResults(userId)
        ]);

        // 保存原始顺序的数据（用于计算删除索引）
        originalDetectionRecords.value = [...detectionRecords];
        originalSelfieResults.value = [...selfieResults];

        const allRecords: HistoryRecord[] = [];
        
        // 处理检测记录
        detectionRecords.forEach((record, index) => {
            const scalpScore = parseFloat(record.scalpScore);
            const level = calculateLevel(scalpScore);
            
            // 计算improvement - 与上一条记录比较（时间更早的记录）
            const prevRecord = detectionRecords[index + 1];
            const prevScalpScore = prevRecord ? parseFloat(prevRecord.scalpScore) : null;
            const prevLevel = prevRecord ? calculateLevel(prevScalpScore!) : null;
            
            // 计算实际差值（当前 - 之前），只有正数才显示
            const scoreImprovement = prevScalpScore !== null ? scalpScore - prevScalpScore : 0;
            const levelImprovement = prevLevel !== null ? level - prevLevel : 0;
            
            allRecords.push({
                id: record.recordId,
                userId: record.userId,
                date: formatDate(record.createTime),
                type: 'advancedScan',
                typeLabel: t('hair.advancedScan'),
                typeIcon: '/static/icons/blur_on.svg',
                hairLossPattern: {
                    level,
                    total: 7,
                    improvement: levelImprovement > 0 ? Math.round(levelImprovement) : 0
                },
                hairScore: {
                    score: Math.round(scalpScore),
                    total: 100,
                    improvement: scoreImprovement > 0 ? Math.round(scoreImprovement) : 0
                },
                originalData: record
            });
        });
        
        // 处理自拍结果
        selfieResults.forEach((result, index) => {
            const score = calculateSelfieScore(result.stage, result.extInfo);
            const level = result.stage;
            
            // 计算improvement - 与上一条记录比较（时间更早的记录）
            const prevResult = selfieResults[index + 1];
            const prevScore = prevResult ? calculateSelfieScore(prevResult.stage, prevResult.extInfo) : null;
            const prevLevel = prevResult ? prevResult.stage : null;
            
            // 计算实际差值（当前 - 之前），只有正数才显示
            const scoreImprovement = prevScore !== null ? score - prevScore : 0;
            const levelImprovement = prevLevel !== null ? level - prevLevel : 0;
            
            // 使用createTime或createdTime
            const dateString = result.createTime || result.createdTime || new Date().toISOString();
            
            allRecords.push({
                id: result.id,
                userId: result.userId,
                date: formatDate(dateString),
                type: 'phoneCamera',
                typeLabel: t('hair.phoneCamera'),
                typeIcon: '/static/icons/camera_front.svg',
                hairLossPattern: {
                    level,
                    total: 7,
                    improvement: levelImprovement > 0 ? Math.round(levelImprovement) : 0
                },
                hairScore: {
                    score: Math.round(score),
                    total: 100,
                    improvement: scoreImprovement > 0 ? Math.round(scoreImprovement) : 0
                },
                originalData: result
            });
        });
        
        // 按createTime倒序排列，createTime为null的放到末尾
        allRecords.sort((a, b) => {
            const getOriginalTime = (record: HistoryRecord) => {
                if (record.type === 'advancedScan') {
                    return (record.originalData as DetectionRecord).createTime;
                } else {
                    const selfieData = record.originalData as SelfieResult;
                    return selfieData.createTime || selfieData.createdTime || '';
                }
            };
            
            const timeA = getOriginalTime(a);
            const timeB = getOriginalTime(b);
            const hasTimeA = timeA !== '';
            const hasTimeB = timeB !== '';
            
            // 如果一个有时间一个没时间，有时间的排前面
            if (hasTimeA && !hasTimeB) return -1;
            if (!hasTimeA && hasTimeB) return 1;
            
            // 如果都有时间，按时间倒序
            if (hasTimeA && hasTimeB) {
                const timestampA = new Date(timeA).getTime();
                const timestampB = new Date(timeB).getTime();
                return timestampB - timestampA;
            }
            
            // 如果都没时间，保持原顺序
            return 0;
        });
        
        historyRecords.value = allRecords;
        
        // 获取雷达图数据 Fetch radar data
        const advancedScans = allRecords.filter(r => r.type === 'advancedScan');
        if (advancedScans.length > 0) {
            // 按时间排序是倒序的，所以最后一个是最早的，第一个是最新的
            // Sorted by time descending, so last is earliest, first is latest
            const firstRecord = advancedScans[advancedScans.length - 1];
            const currentRecord = advancedScans[0];
            
            const firstId = (firstRecord.originalData as DetectionRecord).recordId;
            const currentId = (currentRecord.originalData as DetectionRecord).recordId;
            
            if (firstId && currentId) {
                fetchRadarData(firstId, currentId, userId);
            }
        }
        
        chartDetectionRecords.value = [...detectionRecords];
        processTimeSeriesData(detectionRecords, scoreMetric.value);
        fetchWhatChangedRows();
        
        // 返回数据供其他函数使用
        return { detectionRecords, selfieResults };
    } catch (error) {
        console.error('Error processing history data:', error);
        loadError.value = t('hair.loadError');
        throw error;
    } finally {
        isLoading.value = false;
    }
};

// 生命周期
onMounted(async () => {
    // 初始化用户信息
    userStore.initUserInfo();

    // 检查是否有userId，如果没有则尝试从本地存储获取
    let userId = userStore.userInfo.userId;
    if (!userId) {
        const localUserInfo = uni.getStorageSync('userInfo');
        const storedUserId = uni.getStorageSync('userId');
        userId = localUserInfo?.userId || storedUserId;

        if (userId && !userStore.userInfo.userId) {
            // 如果找到userId但userStore还没有，更新userStore
            if (localUserInfo) {
                Object.assign(userStore.userInfo, localUserInfo);
            } else {
                userStore.userInfo.userId = userId;
            }
        }
    }

    console.log('Current userId:', userId);

    // 更新登录记录和计算登录连续天数
    updateLoginRecord();

    if (userId) {
        // 优化：先获取历史数据，然后将数据传递给 fetchLatestScalpScore，避免重复请求
        const { detectionRecords, selfieResults } = await processHistoryData();
        await fetchLatestScalpScore(detectionRecords, selfieResults);
    } else {
        console.warn('No userId found, cannot fetch history data');
        loadError.value = 'User not logged in';
    }

    // 监听自拍照reportId更新事件
    uni.$on('selfieReportIdUpdated', (data: { selfieId: string; reportId: string }) => {
        console.log('Received selfieReportIdUpdated event:', data);
        // 更新historyRecords中对应的记录
        const recordIndex = historyRecords.value.findIndex((r: HistoryRecord) =>
            r.type === 'phoneCamera' && (r.originalData as SelfieResult).id === parseInt(data.selfieId)
        );
        if (recordIndex !== -1) {
            const selfieData = historyRecords.value[recordIndex].originalData as SelfieResult;
            selfieData.reportId = data.reportId;
            console.log('Updated reportId for selfie:', data.selfieId, data.reportId);
        }
    });

    // 监听毛囊镜reportId更新事件
    uni.$on('trichoscanReportIdUpdated', (data: { recordId: number; reportId: string }) => {
        console.log('Received trichoscanReportIdUpdated event:', data);
        // 更新historyRecords中对应的记录
        const recordIndex = historyRecords.value.findIndex((r: HistoryRecord) =>
            r.type === 'advancedScan' && r.id === data.recordId
        );
        if (recordIndex !== -1) {
            const trichoscanData = historyRecords.value[recordIndex].originalData as DetectionRecord;
            trichoscanData.reportId = data.reportId;
            console.log('Updated reportId for trichoscan record:', data.recordId, data.reportId);
        }
    });
});

// 下拉刷新
onPullDownRefresh(async () => {
    console.log('Refresh hair page data');
    try {
        // 重新初始化用户信息
        await userStore.initUserInfo();
        
        let userId = userStore.userInfo.userId;
        if (!userId) {
            const localUserInfo = uni.getStorageSync('userInfo');
            const storedUserId = uni.getStorageSync('userId');
            userId = localUserInfo?.userId || storedUserId;
            
            if (userId) {
                userStore.userInfo.userId = userId;
            }
        }
        
        if (userId) {
            // 重新获取数据
            const { detectionRecords, selfieResults } = await processHistoryData();
            await fetchLatestScalpScore(detectionRecords, selfieResults);
            updateLoginRecord();
        }
    } catch (error) {
        console.error('Refresh failed:', error);
    } finally {
        uni.stopPullDownRefresh();
    }
});

const activeTab = ref(0);
const switchTab = async (idx: number) => {
    activeTab.value = idx;
    
    // 如果切换到历史记录标签且还没有数据，尝试加载
    if (idx === 1 && historyRecords.value.length === 0 && !isLoading.value) {
        let userId = userStore.userInfo.userId;
        if (!userId) {
            const localUserInfo = uni.getStorageSync('userInfo');
            const storedUserId = uni.getStorageSync('userId');
            userId = localUserInfo?.userId || storedUserId;
        }
        
        if (userId) {
            // 优化：先获取历史数据，然后将数据传递给 fetchLatestScalpScore，避免重复请求
            const { detectionRecords, selfieResults } = await processHistoryData();
            await fetchLatestScalpScore(detectionRecords, selfieResults);
        }
    }
};

const viewRecordDetail = (record: HistoryRecord) => {
    console.log('View record detail:', record);

    // Check if it's a phone camera record
    if (record.type === 'phoneCamera') {
        // Navigate to selfie results page for phone camera records
        const data = record.originalData as SelfieResult;
        const reportIdParam = data.reportId ? `&reportId=${encodeURIComponent(data.reportId)}` : '';
        uni.navigateTo({
            url: `/pages/selfie/results?position=${encodeURIComponent(data.position)}&stage=${data.stage}&image=${encodeURIComponent(data.image)}&extInfo=${encodeURIComponent(data.extInfo || '')}&userId=${record.userId}&from=history&createTime=${encodeURIComponent(data.createTime || '')}&id=${data.id}${reportIdParam}`
        });
    } else {
        // Navigate to trichoscan results page for advanced scan records
        const trichoscanData = record.originalData as DetectionRecord;
        const reportIdParam = trichoscanData.reportId ? `&reportId=${encodeURIComponent(trichoscanData.reportId)}` : '';
        uni.navigateTo({
            url: '/pages/trichoscan/advanced-result?id=' + record.id + '&pushType=1' + '&userId=' + record.userId + reportIdParam + '&from=hair'
        });
    }
};

type RangeOption = 'Week' | 'Month' | 'Year';

/** DetectionRecord fields: hair=毛发分, follicle=毛囊分, scalp=头皮分, scalpScore=综合分 */
const getScoreFromRecord = (record: DetectionRecord, metric: ScoreMetricKey): number => {
    switch (metric) {
        case 'hair':
            return Math.round(parseFloat(record.hair) || 0);
        case 'follicle':
            return Math.round(parseFloat(record.follicle) || 0);
        case 'scalp':
            return Math.round(parseFloat(record.scalp) || 0);
    }
};

// 添加响应式的最新头皮分数
const latestScalpScore = ref<string>('--');

// 添加响应式的登录连续天数
const loginStreak = ref<number>(0);

// 计算登录连续天数
const calculateLoginStreak = (): number => {
    try {
        // 获取用户登录历史记录
        const loginHistory = uni.getStorageSync('loginHistory') || [];
        
        if (!loginHistory || loginHistory.length === 0) {
            // 如果没有历史记录，检查是否是第一次登录
            const firstLoginDate = uni.getStorageSync('firstLoginDate');
            if (!firstLoginDate) {
                // 记录第一次登录时间
                uni.setStorageSync('firstLoginDate', new Date().toISOString());
                return 1;
            }
            return 0;
        }

        // 按日期排序（最新的在前）
        const sortedHistory = loginHistory.sort((a: string, b: string) => 
            new Date(b).getTime() - new Date(a).getTime()
        );

        // 计算连续登录天数
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < sortedHistory.length; i++) {
            const loginDate = new Date(sortedHistory[i]);
            loginDate.setHours(0, 0, 0, 0);
            
            const expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - i);
            expectedDate.setHours(0, 0, 0, 0);
            
            if (loginDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break; // 如果不是连续的，停止计算
            }
        }
        
        // 检查今天是否已登录
        const todayLoggedIn = loginHistory.some((loginTime: string) => {
            const loginDate = new Date(loginTime);
            loginDate.setHours(0, 0, 0, 0);
            return loginDate.getTime() === today.getTime();
        });
        
        return todayLoggedIn ? streak : 0;
    } catch (error) {
        console.error('Error calculating login streak:', error);
        return 0;
    }
};

// 更新登录记录
const updateLoginRecord = () => {
    try {
        const now = new Date().toISOString();
        let loginHistory = uni.getStorageSync('loginHistory') || [];
        
        // 检查今天是否已经记录过登录
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const alreadyLoggedIn = loginHistory.some((loginTime: string) => {
            const loginDate = new Date(loginTime);
            loginDate.setHours(0, 0, 0, 0);
            return loginDate.getTime() === today.getTime();
        });
        
        if (!alreadyLoggedIn) {
            loginHistory.push(now);
            // 只保留最近30天的登录记录
            if (loginHistory.length > 30) {
                loginHistory = loginHistory.slice(-30);
            }
            uni.setStorageSync('loginHistory', loginHistory);
        }
        
        // 更新登录连续天数
        loginStreak.value = calculateLoginStreak();
    } catch (error) {
        console.error('Error updating login record:', error);
    }
};

// 获取最新的头皮分数
const fetchLatestScalpScore = async (detectionRecords?: DetectionRecord[], selfieResults?: SelfieResult[]) => {
    try {
        // 如果没有传入数据，则获取数据
        if (!detectionRecords || !selfieResults) {
            // 获取当前userId
            let userId = userStore.userInfo.userId;
            if (!userId) {
                const localUserInfo = uni.getStorageSync('userInfo');
                const storedUserId = uni.getStorageSync('userId');
                userId = localUserInfo?.userId || storedUserId;
            }
            
            if (!userId) {
                console.warn('No userId available for fetching latest scalp score');
                return;
            }

            // 获取检测记录
            detectionRecords = await fetchDetectionRecords(userId);
            selfieResults = await fetchSelfieResults(userId);
        }
        
        if (detectionRecords && detectionRecords.length > 0) {
            // 获取最新的记录（数组最后一个）
            const latestRecord = detectionRecords[detectionRecords.length - 1];
            const score = Math.round(parseFloat(latestRecord.scalpScore)) || 0;
            latestScalpScore.value = String(score);
            console.log('Latest scalp score:', score);
        } else if (selfieResults && selfieResults.length > 0) {
            // 如果没有检测记录，尝试从自拍结果获取
            // 按时间排序，获取最新的
            const sortedResults = selfieResults.sort((a, b) => {
                const timeA = new Date(a.createTime || a.createdTime || '').getTime();
                const timeB = new Date(b.createTime || b.createdTime || '').getTime();
                return timeB - timeA;
            });
            
            const latestResult = sortedResults[0];
            const score = calculateSelfieScore(latestResult.stage, latestResult.extInfo);
            latestScalpScore.value = String(score);
            console.log('Latest selfie score:', score);
        } else {
            latestScalpScore.value = '--';
        }
    } catch (error) {
        console.error('Failed to fetch latest scalp score:', error);
        latestScalpScore.value = '--';
    }
};

const summaryCards = computed(() => [
    { label: 'Scans Taken', value: historyRecords.value.length > 0 ? String(historyRecords.value.length) : '--', icon: 'qrcode' },
    { label: 'Latest Score', value: latestScalpScore.value, icon: 'battery-2' },
    { label: 'Login Streak', value: String(loginStreak.value), icon: 'calendar' },
]);

// 响应式时间序列数据
const timeSeriesData = ref<Record<RangeOption, { label: string; value: number }[]>>({
    Week: [],
    Month: [],
    Year: [],
});

const isDemoData = ref(false);

// 处理时间序列数据的函数 Process time series data function
const processTimeSeriesData = (records: DetectionRecord[], metric: ScoreMetricKey = scoreMetric.value) => {
    console.log('Processing time series data with records:', records);
    
    isDemoData.value = false;
    
    if (!records || records.length === 0) {
        console.log('No records found, using default data');
        isDemoData.value = true;
        timeSeriesData.value = {
            Week: getDefaultWeekData(),
            Month: getDefaultMonthData(),
            Year: getDefaultYearData(),
        };
        return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // 重置到当天开始 Reset to start of day
    console.log('Current time:', now);
    
    // 按时间排序(最新的在前) Sort by time (newest first)
    const sortedRecords = [...records].sort((a, b) => 
        new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
    
    console.log('Sorted records:', sortedRecords);



    // 为了正确的时间序列显示,最早的在前 For chronological display, earliest first
    const chronologicalRecords = [...sortedRecords].reverse();

    // 时间序列数据 Time series data
    let weekData: { label: string; value: number }[] = [];
    let monthData: { label: string; value: number }[] = [];
    let yearData: { label: string; value: number }[] = [];

    // 计算时间范围 Calculate time ranges
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);
    
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Week数据: 优先使用7天内的数据，如果没有则使用最近的记录
    // Week data: prefer last 7 days, fallback to recent records
    const weekRecords = sortedRecords.filter(record => {
        const recordDate = new Date(record.createTime);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate >= oneWeekAgo && recordDate <= now;
    }).reverse();
    
    if (weekRecords.length > 0) {
        weekRecords.forEach(record => {
            const recordDate = new Date(record.createTime);
            weekData.push({
                label: formatWeekLabel(recordDate),
                value: getScoreFromRecord(record, metric)
            });
        });
    } else {
        // 如果7天内没有数据，使用最近的记录 If no data in week, use recent records
        const recentRecords = chronologicalRecords.slice(-Math.min(7, chronologicalRecords.length));
        recentRecords.forEach(record => {
            const recordDate = new Date(record.createTime);
            weekData.push({
                label: formatWeekLabel(recordDate),
                value: getScoreFromRecord(record, metric)
            });
        });
    }
    
    console.log('Week data:', weekData);

    // Month数据: 优先使用30天内的数据，如果没有则使用最近的记录
    // Month data: prefer last 30 days, fallback to recent records
    const monthRecords = sortedRecords.filter(record => {
        const recordDate = new Date(record.createTime);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate >= oneMonthAgo && recordDate <= now;
    }).reverse();
    
    if (monthRecords.length > 0) {
        monthData = buildSampledSeries(monthRecords, metric, CHART_POINT_LIMITS.Month);
    } else {
        monthData = buildSampledSeries(chronologicalRecords, metric, CHART_POINT_LIMITS.Month);
    }
    
    console.log('Month data:', monthData);

    // Year数据: 优先使用12个月内的数据，如果没有则使用所有记录
    // Year data: prefer last 12 months, fallback to all records
    const yearRecords = sortedRecords.filter(record => {
        const recordDate = new Date(record.createTime);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate >= oneYearAgo && recordDate <= now;
    }).reverse();
    
    if (yearRecords.length > 0) {
        yearData = buildSampledSeries(yearRecords, metric, CHART_POINT_LIMITS.Year, formatMonthYearLabel);
    } else {
        yearData = buildSampledSeries(chronologicalRecords, metric, CHART_POINT_LIMITS.Year, formatMonthYearLabel);
    }
    
    console.log('Year data:', yearData);

    console.log('Generated time series data:', {
        Week: weekData,
        Month: monthData,
        Year: yearData
    });

    // 如果没有数据,使用默认数据 If no data, use defaults
    timeSeriesData.value = {
        Week: weekData.length > 0 ? weekData : getDefaultWeekData(),
        Month: monthData.length > 0 ? monthData : getDefaultMonthData(),
        Year: yearData.length > 0 ? yearData : getDefaultYearData(),
    };
    
    // 数据处理完成后滚动到最右侧 Scroll to right after data processing
    scrollToRight();
};

// 滚动控制 Scroll control
const scrollLeft = ref(0);

// 判断是否有真实的检测记录（非demo数据）
const hasRealData = computed(() => {
    return historyRecords.value.some((r: HistoryRecord) => r.type === 'advancedScan');
});

const scrollToRight = () => {
    // 先重置为0，确保值变化能触发视图更新
    // Reset to 0 first to ensure value change triggers view update
    scrollLeft.value = 0;
    
    nextTick(() => {
        // 设置一个足够大的值以滚动到最右侧
        // Set a large enough value to scroll to the far right
        scrollLeft.value = 10000;
    });
};

const formatWeekLabel = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
};

const formatMonthYearLabel = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
};

const CHART_POINT_LIMITS: Record<RangeOption, number> = {
    Week: 7,
    Month: 5,
    Year: 6,
};

type SeriesPoint = { label: string; value: number };

/** Downsample chronological records so Month/Year spans fewer, wider-spaced x-axis points */
const buildSampledSeries = (
    records: DetectionRecord[],
    metric: ScoreMetricKey,
    maxPoints: number,
    labelFn: (date: Date) => string = formatWeekLabel,
): SeriesPoint[] => {
    if (!records.length) return [];

    const chronological = [...records].sort(
        (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
    );

    if (chronological.length <= maxPoints) {
        return chronological.map((record) => ({
            label: labelFn(new Date(record.createTime)),
            value: getScoreFromRecord(record, metric),
        }));
    }

    const result: SeriesPoint[] = [];
    const step = (chronological.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i++) {
        const record = chronological[Math.round(i * step)];
        result.push({
            label: labelFn(new Date(record.createTime)),
            value: getScoreFromRecord(record, metric),
        });
    }
    return result;
};

// 格式化月标签
const formatMonthLabel = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()];
};

// 默认数据（当没有真实数据时显示）
const getDefaultWeekData = (): { label: string; value: number }[] => [
    { label: '6 Sep', value: 35 },
    { label: '25 Sep', value: 44 },
    { label: '12 Oct', value: 46 },
    { label: '28 Oct', value: 50 },
];

const getDefaultMonthData = (): { label: string; value: number }[] => [
    { label: 'May', value: 28 },
    { label: 'Jun', value: 35 },
    { label: 'Jul', value: 42 },
    { label: 'Aug', value: 48 },
    { label: 'Sep', value: 50 },
];

const getDefaultYearData = (): { label: string; value: number }[] => [
    { label: '2021', value: 22 },
    { label: '2022', value: 36 },
    { label: '2023', value: 45 },
    { label: '2024', value: 52 },
];

// 计算属性，使用响应式数据
const timeSeries = computed(() => timeSeriesData.value);

const rangeOptions: RangeOption[] = ['Week', 'Month', 'Year'];
const activeRange = ref<RangeOption>('Week');
const setRange = (range: RangeOption) => {
    activeRange.value = range;
    // 切换视图时滚动到最右侧 Scroll to right when switching view
    scrollToRight();
};

const chartSeries = computed(() => timeSeries.value[activeRange.value as RangeOption]);

const firstScore = computed(() => {
    const series = chartSeries.value;
    const firstValue = series[0]?.value ?? 0;
    console.log('firstScore calculation:', {
        activeRange: activeRange.value,
        series: series,
        firstValue: firstValue,
        timeSeriesData: timeSeriesData.value
    });
    return firstValue;
});

const currentScore = computed(() => chartSeries.value[chartSeries.value.length - 1]?.value ?? 0);
const latestHairScore = computed(() => chartSeries.value[Math.max(chartSeries.value.length - 1, 0)]?.value ?? 0);

const firstScoreText = computed(() => `${firstScore.value} / 100`);
const currentScoreText = computed(() => `${currentScore.value} / 100`);
const latestHairScoreText = computed(() => `${latestHairScore.value} / 100`);

const formatDelta = (delta: number) => {
    if (!delta) return '+0';
    return delta > 0 ? `+${delta}` : `${delta}`;
};

const currentDelta = computed(() => {
    if (chartSeries.value.length < 2) return '+0';
    // 计算当前分与第一个分的差值（progress from first score）
    const current = chartSeries.value[chartSeries.value.length - 1]?.value ?? 0;
    const first = firstScore.value;
    const delta = current - first;
    
    console.log('Current Score Delta calculation:', {
        activeRange: activeRange.value,
        chartSeries: chartSeries.value,
        current: current,
        first: first,
        delta: delta,
        formattedDelta: formatDelta(delta)
    });
    
    console.log('Debug - First Score:', firstScore.value);
    console.log('Debug - Current Score:', current);
    console.log('Debug - Expected delta (current - first):', current, '-', firstScore.value, '=', current - firstScore.value);
    
    return formatDelta(delta);
});

// 保持原有的previous delta计算（用于对比显示）
const previousDelta = computed(() => {
    if (chartSeries.value.length < 2) return '+0';
    // 数据是按时间顺序排列的，所以最后一个是最新的，倒数第二个是前一个
    const currentIndex = chartSeries.value.length - 1;
    const prevIndex = currentIndex - 1;
    const current = chartSeries.value[currentIndex]?.value ?? 0;
    const prev = chartSeries.value[prevIndex]?.value ?? 0;
    const delta = current - prev;
    
    return formatDelta(delta);
});

const latestHairDelta = computed(() => currentDelta.value);

// 图表配置 Chart configuration
const chartConfig = {
    pointSpacing: 100, // 数据点之间的间距(rpx) Spacing between data points - 增加到100确保日期标签完全显示
    sidePadding: 50, // 左右两侧的padding(rpx) Left and right padding
    height: 180,
    svgExtraHeight: 40,
    projectionOffset: 60,
    pointRadius: 6,
};

// 动态计算图表宽度 Dynamically calculate chart width
const chartWidth = computed(() => {
    const pointCount = chartSeries.value.length;
    if (pointCount <= 1) {
        return 540; // 单个数据点时使用固定宽度
    }
    
    // 计算宽度: 左padding + (数据点数-1) × 间距 + 右padding
    // Width = left padding + (points - 1) × spacing + right padding
    const calculatedWidth = chartConfig.sidePadding * 2 + (pointCount - 1) * chartConfig.pointSpacing;
    
    console.log('Chart width calculation:', {
        pointCount,
        spacing: chartConfig.pointSpacing,
        padding: chartConfig.sidePadding,
        calculatedWidth
    });
    
    return calculatedWidth;
});

const chartSvgHeight = chartConfig.height + chartConfig.svgExtraHeight;
const chartMinValue = 0;
const chartMaxValue = 100;

type ChartDrawingPoint = {
    x: number;
    y: number;
    value: number;
    label: string;
};

const chartDrawingPoints = computed<ChartDrawingPoint[]>(() => {
    const points = chartSeries.value;
    if (!points.length) return [];

    return points.map((point: { label: string; value: number }, index: number) => {
        const normalizedY =
            chartConfig.height -
            ((point.value - chartMinValue) / (chartMaxValue - chartMinValue || 1)) * chartConfig.height;

        // 数据点均匀分布: x = 左padding + index × 间距
        // Evenly distribute points: x = left padding + index × spacing
        const x = chartConfig.sidePadding + index * chartConfig.pointSpacing;

        return {
            x: Number(x.toFixed(2)),
            y: Number(normalizedY.toFixed(2)),
            value: point.value,
            label: point.label,
        };
    });
});

const projectionDrawingPoint = computed(() => {
    const points = chartDrawingPoints.value;
    if (!points.length) return null;
    const lastPoint = points[points.length - 1];
    const prevPoint = points[points.length - 2];
    const lastValue = chartSeries.value[chartSeries.value.length - 1]?.value ?? lastPoint.value;
    const prevValue = prevPoint ? prevPoint.value : lastValue;
    const delta = Math.max(lastValue - prevValue, 6);
    const projectedValue = Math.min(chartMaxValue, lastValue + delta);

    const normalizedY =
        chartConfig.height -
        ((projectedValue - chartMinValue) / (chartMaxValue - chartMinValue || 1)) * chartConfig.height;
    
    // 投影点位于最后一个数据点之后
    // Projection point is after the last data point
    const x = lastPoint.x + chartConfig.projectionOffset;

    return {
        x: Number(x.toFixed(2)),
        y: Number(normalizedY.toFixed(2)),
        value: projectedValue,
    };
});

const startingLinePath = computed(() => {
    const firstPoint = chartDrawingPoints.value[0];
    if (!firstPoint) return '';
    const startX = 0;
    const startY = firstPoint.y.toFixed(2);
    return `M ${startX},${startY} L ${firstPoint.x.toFixed(2)},${startY}`;
});

const mainLinePath = computed(() => {
    const points = chartDrawingPoints.value;
    if (!points.length) return '';

    return points
        .map((point: ChartDrawingPoint, index: number) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(' ');
});

const projectionLinePath = computed(() => {
    const points = chartDrawingPoints.value;
    const projection = projectionDrawingPoint.value;
    if (!points.length || !projection) return '';
    const lastPoint = points[points.length - 1];
    return [
        `M ${lastPoint.x.toFixed(2)},${lastPoint.y.toFixed(2)}`,
        `L ${projection.x.toFixed(2)},${projection.y.toFixed(2)}`,
        `L ${chartWidth.value.toFixed(2)},${projection.y.toFixed(2)}`,
    ].join(' ');
});

type ChartCircle = {
    x: number;
    y: number;
    projection: boolean;
    key: string;
};

const chartCircles = computed<ChartCircle[]>(() => {
    const base: ChartCircle[] = chartDrawingPoints.value.map((point: ChartDrawingPoint, index: number) => ({
        x: point.x,
        y: point.y,
        projection: false,
        key: `data-${point.label}-${index}`,
    }));

    const projection = projectionDrawingPoint.value;
    if (projection) {
        base.push({
            x: projection.x,
            y: projection.y,
            projection: true,
            key: 'projection-point',
        });
    }

    return base;
});

const chartCalloutStyle = computed(() => ({
    top: '24rpx',
    right: '24rpx',
}));

const chartDateLabels = computed(() =>
    chartSeries.value
        .map((point: { label: string; value: number }, index: number) => ({ label: point.label, key: `date-${index}-${point.label}` }))
        .filter((item: { label: string; key: string }) => !!item.label)
);

const radarMetrics = ['Follicle', 'Hair Density', 'Hair Radius', 'Keratin', 'Oiliness', 'Sensitivity'];
// 默认值为0，表示没有数据 Default values are 0, indicating no data
const firstScan = ref([0, 0, 0, 0, 0, 0]); 
const currentScan = ref([0, 0, 0, 0, 0, 0]);
const hasRadarData = ref(false);

const convertGradeToScore = (grade: string): number => {
    if (!grade) return 0; // 如果没有等级，返回0 If no grade, return 0
    if (grade.includes('低') || grade.toLowerCase().includes('low')) return 0.3;
    if (grade.includes('标准') || grade.toLowerCase().includes('normal')) return 0.6;
    if (grade.includes('高') || grade.toLowerCase().includes('high')) return 0.9;
    return 0.5;
};

const fetchRadarData = async (firstRecordId: number, currentRecordId: number, userId: string) => {
    try {
        console.log('Fetching radar data for records:', firstRecordId, currentRecordId);
        // 设置超时时间为30秒 Set timeout to 30 seconds
        const [firstRes, currentRes] = await Promise.all([
            post('analyse/goHis', { userId, recordId: firstRecordId }, { timeout: 30000 }),
            post('analyse/goHis', { userId, recordId: currentRecordId }, { timeout: 30000 })
        ]);

        const processResponse = (res: any) => {
            if (!res) return [0, 0, 0, 0, 0, 0];
            return [
                convertGradeToScore(res.follicle_score_map?.grade),
                convertGradeToScore(res.hair_density_score_map?.grade),
                convertGradeToScore(res.hair_texture_score_map?.grade),
                convertGradeToScore(res.keratinocytes_score_map?.grade),
                convertGradeToScore(res.scalp_oil_area_score_map?.grade),
                convertGradeToScore(res.redness_area_score_map?.grade)
            ];
        };

        firstScan.value = processResponse(firstRes);
        currentScan.value = processResponse(currentRes);
        
        // 检查是否有有效数据（非全0） Check for valid data (not all 0)
        const hasValidFirst = firstScan.value.some((v: number) => v > 0);
        const hasValidCurrent = currentScan.value.some((v: number) => v > 0);
        hasRadarData.value = hasValidFirst || hasValidCurrent;
        
        console.log('Radar data updated:', { first: firstScan.value, current: currentScan.value, hasData: hasRadarData.value });
    } catch (error) {
        console.error('Failed to fetch radar data:', error);
        hasRadarData.value = false;
    }
};

const polarPoint = (value: number, index: number, total: number, radius = 80): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = radius * value;
    return {
        x: 100 + r * Math.cos(angle),
        y: 100 + r * Math.sin(angle),
    };
};

const axisPositions = radarMetrics.map((_, index) => polarPoint(1, index, radarMetrics.length));

const firstScanPoints = computed(() =>
    firstScan.value.map((value: number, index: number) => polarPoint(value, index, radarMetrics.length))
);
const currentScanPoints = computed(() =>
    currentScan.value.map((value: number, index: number) => polarPoint(value, index, radarMetrics.length))
);

const firstScanPolygon = computed(() => firstScanPoints.value.map((point: { x: number; y: number }) => `${point.x},${point.y}`).join(' '));
const currentScanPolygon = computed(() => currentScanPoints.value.map((point: { x: number; y: number }) => `${point.x},${point.y}`).join(' '));

const chartSize = 200;
const chartRadius = 70;
const labelOffset = 34;
const labelStyle = (index: number) => {
    const angle = (Math.PI * 2 * index) / radarMetrics.length - Math.PI / 2;
    const { x, y } = polarPoint(1, index, radarMetrics.length, chartRadius + labelOffset);
    const leftPercent = (x / chartSize) * 100;
    const topPercent = (y / chartSize) * 100;

    return {
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
    };
};

const weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthNamesFull = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const today = new Date();
const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const selectedDate = ref(new Date(today));
const showMonthPicker = ref(false);

const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const calendarDays = computed(() => {
    const start = new Date(calendarMonth.value);
    const startDay = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - startDay);

    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + i);
        return {
            key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
            date,
            currentMonth: date.getMonth() === calendarMonth.value.getMonth(),
            isToday: isSameDate(date, today),
            isSelected: isSameDate(date, selectedDate.value),
        };
    });
});

const currentMonthDisplay = computed(
    () => `${monthNamesFull[calendarMonth.value.getMonth()]} ${calendarMonth.value.getFullYear()}`
);

const changeMonth = (offset: number) => {
    const current = calendarMonth.value;
    calendarMonth.value = new Date(current.getFullYear(), current.getMonth() + offset, 1);
};

const selectCalendarDay = (day: (typeof calendarDays.value)[number]) => {
    selectedDate.value = new Date(day.date);
};

const toggleMonthPicker = () => {
    showMonthPicker.value = !showMonthPicker.value;
};

const closeMonthPicker = () => {
    showMonthPicker.value = false;
};

const selectMonth = (monthIndex: number) => {
    const current = calendarMonth.value;
    calendarMonth.value = new Date(current.getFullYear(), monthIndex, 1);
    showMonthPicker.value = false;
};

const changeYear = (offset: number) => {
    const current = calendarMonth.value;
    calendarMonth.value = new Date(current.getFullYear() + offset, current.getMonth(), 1);
};

// 日期筛选器相关方法
const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

const formatDisplayDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
};

// 获取每个日期的记录数量
const getRecordsCountByDate = (date: Date): number => {
    const dateKey = formatDateKey(date);
    return historyRecords.value.filter((record: HistoryRecord) => {
        const recordData = record.originalData;
        const timeString = recordData.createTime || (recordData as SelfieResult).createdTime || '';
        const recordDate = new Date(timeString);
        return formatDateKey(recordDate) === dateKey;
    }).length;
};

// 获取有数据的日期列表
const getDatesWithData = (): Date[] => {
    const datesWithData = new Set<string>();
    historyRecords.value.forEach((record: HistoryRecord) => {
        const recordData = record.originalData;
        const timeString = recordData.createTime || (recordData as SelfieResult).createdTime || '';
        const recordDate = new Date(timeString);
        datesWithData.add(formatDateKey(recordDate));
    });
    
    return Array.from(datesWithData).map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    });
};

// 筛选后的历史记录
const filteredHistoryRecords = computed(() => {
    if (!selectedDateFilter.value) {
        return historyRecords.value;
    }
    
    return historyRecords.value.filter((record: HistoryRecord) => {
        const recordData = record.originalData;
        const timeString = recordData.createTime || (recordData as SelfieResult).createdTime || '';
        const recordDate = new Date(timeString);
        return formatDateKey(recordDate) === selectedDateFilter.value;
    });
});

const displayedHistoryRecords = computed(() => {
    let records = filteredHistoryRecords.value;
    if (historyTab.value === 'selfie') {
        return records.filter((r: HistoryRecord) => r.type === 'phoneCamera');
    } else {
        return records.filter((r: HistoryRecord) => r.type === 'advancedScan');
    }
});

// 原始检测记录列表（保持服务器返回的顺序）
const originalDetectionRecords = ref<DetectionRecord[]>([]);
// 原始自拍结果列表（保持服务器返回的顺序）
const originalSelfieResults = ref<SelfieResult[]>([]);

// 计算记录在原始列表中的索引（仅用于检测记录删除）
const getRecordIndex = (record: HistoryRecord): number => {
    // 只在检测记录列表中查找索引
    const index = originalDetectionRecords.value.findIndex((r: DetectionRecord) => {
        const recordData = record.originalData as DetectionRecord;
        return r.recordId === recordData.recordId;
    });

    console.log('getRecordIndex - recordId:', (record.originalData as DetectionRecord).recordId, 'calculated index:', index);
    return index;
};

// 删除记录
const deleteRecord = async (record: HistoryRecord) => {
    try {
        // 获取userId
        let userId = userStore.userInfo.userId;
        if (!userId) {
            const localUserInfo = uni.getStorageSync('userInfo');
            const storedUserId = uni.getStorageSync('userId');
            userId = localUserInfo?.userId || storedUserId;
        }

        if (!userId) {
            uni.showToast({ title: t('analysis.deleteFailed') || 'User not logged in', icon: 'none' });
            return;
        }

        // 计算记录在原始列表中的索引
        const index = getRecordIndex(record);
        if (index < 0) {
            uni.showToast({ title: t('analysis.deleteFailed') || 'Record not found', icon: 'none' });
            return;
        }

        // 显示确认对话框
        uni.showModal({
            title: t('analysis.deleteConfirmTitle') || 'Delete Record',
            content: t('analysis.deleteConfirmMessage') || 'Are you sure you want to delete this record?',
            confirmText: t('common.confirm') || 'Confirm',
            cancelText: t('profile.cancel') || 'Cancel',
            success: async (res) => {
                if (res.confirm) {
                    // 调用删除API
                    uni.showLoading({ title: t('common.loading') || 'Deleting...' });
                    try {
                        console.log('Delete record - userId:', userId, 'index:', index, 'record type:', record.type);

                        // post函数会自动解包响应，返回data字段
                        const response = await post('user/deleteDetectionRecord', {
                            userId: userId,
                            index: index
                        }) as boolean;

                        console.log('Delete response:', response);

                        uni.hideLoading();

                        // response是true表示成功
                        if (response === true) {
                            // 从本地数据源中移除记录
                            const recordIndex = historyRecords.value.findIndex((r: HistoryRecord) => r.id === record.id);
                            if (recordIndex !== -1) {
                                historyRecords.value.splice(recordIndex, 1);
                            }

                            uni.showToast({ title: t('analysis.deleteSuccess') || 'Deleted successfully', icon: 'success' });

                            // 重新加载数据以更新图表
                            const { detectionRecords, selfieResults } = await processHistoryData();
                            await fetchLatestScalpScore(detectionRecords, selfieResults);
                        } else {
                            uni.showToast({ title: t('analysis.deleteFailed') || 'Delete failed', icon: 'none' });
                        }
                    } catch (error) {
                        uni.hideLoading();
                        console.error('Delete record error:', error);
                        uni.showToast({ title: t('analysis.deleteFailed') || 'Delete failed', icon: 'none' });
                    }
                }
            }
        });
    } catch (error) {
        console.error('Delete record error:', error);
        uni.showToast({ title: t('analysis.deleteFailed') || 'Delete failed', icon: 'none' });
    }
};

// 日期选择器相关方法
const toggleDatePicker = () => {
    showDatePicker.value = !showDatePicker.value;
};

const selectDateFromPicker = (date: Date) => {
    selectedFilterDate.value = date;
    selectedDateFilter.value = formatDateKey(date);
    showDatePicker.value = false;
};

const clearDateFilter = () => {
    selectedDateFilter.value = null;
    selectedFilterDate.value = null;
};

const getFilterDisplayText = (): string => {
    if (!selectedDateFilter.value) {
        return t('hair.allDates');
    }
    
    if (selectedFilterDate.value) {
        return formatDisplayDate(selectedFilterDate.value);
    }
    
    return t('hair.selectDate');
};

const scoreMetricOptions: { key: ScoreMetricKey; label: string }[] = [
    { key: 'hair', label: 'Hair Score' },
    { key: 'follicle', label: 'Follicle Score' },
    { key: 'scalp', label: 'Scalp Score' },
];

const selectedScoreLabel = computed(
    () => scoreMetricOptions.find((o) => o.key === scoreMetric.value)?.label ?? 'Hair Score'
);

const toggleScoreMenu = () => {
    showScoreMenu.value = !showScoreMenu.value;
};

const selectScoreMetric = (key: ScoreMetricKey) => {
    scoreMetric.value = key;
    showScoreMenu.value = false;
    if (chartDetectionRecords.value.length) {
        processTimeSeriesData(chartDetectionRecords.value, key);
    }
};

watch(scoreMetric, (key) => {
    if (chartDetectionRecords.value.length) {
        processTimeSeriesData(chartDetectionRecords.value, key);
    }
});

const averageScore = computed(() => {
    const vals = chartSeries.value.map((p) => p.value);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
});

const avgDelta = computed(() => formatDelta(currentScore.value - averageScore.value));

const formatCompactDate = (dateString: string): string => {
    try {
        const d = new Date(dateString);
        const year = d.getFullYear();
        if (locale.value === 'zh-Hans' || locale.value.startsWith('zh')) {
            return `${year}年${d.getMonth() + 1}月${d.getDate()}日`;
        }
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${year}`;
    } catch {
        return '';
    }
};

const getRecordTimestamp = (record: HistoryRecord): number => {
    const data = record.originalData;
    const timeString =
        (data as DetectionRecord).createTime ||
        (data as SelfieResult).createTime ||
        (data as SelfieResult).createdTime ||
        '';
    return timeString ? new Date(timeString).getTime() : 0;
};

const chipFilteredRecords = computed(() => {
    let records = displayedHistoryRecords.value;
    if (dateChip.value === 'last90') {
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        records = records.filter((r) => getRecordTimestamp(r) >= cutoff);
    }
    return records;
});

const histCountText = computed(() => `${chipFilteredRecords.value.length} scans`);

const histRangeText = computed(() => {
    const records = chipFilteredRecords.value;
    if (!records.length) return '';
    const times = records.map(getRecordTimestamp).filter((t) => t > 0).sort((a, b) => a - b);
    if (!times.length) return '';
    const fmt = (ts: number) => formatCompactDate(new Date(ts).toISOString());
    if (times.length === 1) return fmt(times[0]);
    return `${fmt(times[0])} – ${fmt(times[times.length - 1])}`;
});

const getTimelineWhen = (record: HistoryRecord, index: number, total: number): string => {
    const ts = getRecordTimestamp(record);
    const short = ts ? formatCompactDate(new Date(ts).toISOString()) : record.date;
    if (index === 0) return `Latest · ${short}`;
    if (index === total - 1) return `${short} · Baseline`;
    return short;
};

const formatDeltaPill = (delta: number): string => {
    if (!delta) return '— 0';
    return delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`;
};

const getScoreDeltaClass = (delta: number): string => {
    if (delta > 0) return 'shell-pill shell-pill-g';
    if (delta < 0) return 'shell-pill shell-pill-r';
    return 'shell-pill shell-pill-p';
};

const getSelfieTypeLabel = (record: HistoryRecord): string => {
    if (record.type === 'phoneCamera') {
        return getSelfieType((record.originalData as SelfieResult).position);
    }
    return t('hair.trichoscanTab');
};

const formatTrichoImageUrl = (url: string): string => {
    if (!url) return '';
    if (url.indexOf('http://115.159.42.189:5000') !== -1 && typeof window !== 'undefined') {
        const isLocal =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:';
        if (isLocal) {
            if (url.includes('/log/')) return url.replace('http://115.159.42.189:5000', '');
            return url.replace('http://115.159.42.189:5000', '/log');
        }
    }
    return url;
};

const extractFirstFollicleUrl = (data: Record<string, unknown>): string => {
    const urlObj = data?.url as Record<string, unknown> | undefined;
    const follicle = urlObj?.follicle;
    if (!follicle) return '';
    let raw = '';
    if (Array.isArray(follicle)) {
        raw = (follicle as string[]).find((img) => img && img.length > 0) || '';
    } else if (typeof follicle === 'string') {
        raw = follicle;
    }
    return formatTrichoImageUrl(raw);
};

const getTrichoThumbUrl = (record: HistoryRecord): string => {
    if (record.type !== 'advancedScan') return '';
    const recordId = (record.originalData as DetectionRecord).recordId;
    return trichoThumbCache.value[recordId] || '';
};

const prefetchTrichoThumbnails = async (records: HistoryRecord[]) => {
    const userId = userStore.userInfo.userId;
    if (!userId) return;

    const pending = records.filter((r) => {
        if (r.type !== 'advancedScan') return false;
        const recordId = (r.originalData as DetectionRecord).recordId;
        return !trichoThumbCache.value[recordId];
    });
    if (!pending.length) return;

    await Promise.all(
        pending.map(async (record) => {
            const recordId = (record.originalData as DetectionRecord).recordId;
            try {
                const res = (await post('analyse/goHis', { userId, recordId }, { timeout: 15000 })) as Record<
                    string,
                    unknown
                >;
                const url = extractFirstFollicleUrl(res);
                if (url) {
                    trichoThumbCache.value = { ...trichoThumbCache.value, [recordId]: url };
                }
            } catch (err) {
                console.warn('Failed to fetch tricho thumbnail:', recordId, err);
            }
        }),
    );
};

const getSelfieImage = (record: HistoryRecord): string => {
    if (record.type !== 'phoneCamera') return '';
    const img = (record.originalData as SelfieResult).image;
    return img?.trim() || '';
};

const getGalThumbStyle = (record: HistoryRecord): Record<string, string> => {
    if (record.type === 'phoneCamera') {
        const img = getSelfieImage(record);
        if (img) {
            return {
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }
    }
    if (record.type === 'advancedScan') {
        const img = getTrichoThumbUrl(record);
        if (img) {
            return {
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }
    }
    const hue = Math.round(record.hairScore.score * 2.6);
    return { '--h': `${hue}deg` };
};

const getGalTag = (record: HistoryRecord, index: number, total: number): string => {
    if (index === total - 1) return 'Baseline';
    return `Level ${record.hairLossPattern.level} / ${record.hairLossPattern.total}`;
};

const getGalDate = (record: HistoryRecord): string => {
    const ts = getRecordTimestamp(record);
    return ts ? formatCompactDate(new Date(ts).toISOString()) : record.date;
};

const sortedSelfieRecords = computed(() =>
    historyRecords.value
        .filter((r) => r.type === 'phoneCamera')
        .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a)),
);

/** Pick earliest/latest selfie that has an image; skip records without photos. */
const pickSelfieWithImage = (
    records: HistoryRecord[],
    direction: 'earliest' | 'latest',
): HistoryRecord | null => {
    if (!records.length) return null;
    if (direction === 'earliest') {
        for (let i = records.length - 1; i >= 0; i--) {
            if (getSelfieImage(records[i])) return records[i];
        }
    } else {
        for (let i = 0; i < records.length; i++) {
            if (getSelfieImage(records[i])) return records[i];
        }
    }
    return null;
};

const beforeAfterPair = computed(() => {
    const selfies = sortedSelfieRecords.value;
    if (!selfies.length) return null;

    const latest = pickSelfieWithImage(selfies, 'latest') || selfies[0];
    const baseline = pickSelfieWithImage(selfies, 'earliest') || selfies[selfies.length - 1];

    return {
        latest,
        baseline,
        latestImg: getSelfieImage(latest),
        baselineImg: getSelfieImage(baseline),
        latestScore: latest.hairScore.score,
        baselineScore: baseline.hairScore.score,
        latestDate: getGalDate(latest),
        baselineDate: getGalDate(baseline),
        latestTs: getRecordTimestamp(latest),
        baselineTs: getRecordTimestamp(baseline),
        densityDelta: latest.hairScore.score - baseline.hairScore.score,
    };
});

/** Focus selfie background on hairline (forehead area) */
const getSelfieBaStyle = (img?: string): Record<string, string> => {
    if (!img) return {};
    return {
        backgroundImage: `url(${img})`,
        backgroundSize: '185% auto',
        backgroundPosition: 'center 14%',
        backgroundRepeat: 'no-repeat',
    };
};

const findClosestTrichoscanRecord = (targetTs: number): DetectionRecord | null => {
    const records = chartDetectionRecords.value;
    if (!records.length || !targetTs) return null;
    let closest = records[0];
    let minDiff = Math.abs(new Date(closest.createTime).getTime() - targetTs);
    for (const record of records) {
        const diff = Math.abs(new Date(record.createTime).getTime() - targetTs);
        if (diff < minDiff) {
            minDiff = diff;
            closest = record;
        }
    }
    return closest;
};

type MetricSnapshot = {
    hairDensity: number;
    hairThickness: number;
    follicleDensity: number;
    follicleThickness: number;
    follicleActivity: number;
    scalpScore: number;
};

const WHAT_CHANGED_METRICS: { key: keyof MetricSnapshot; label: string }[] = [
    { key: 'hairDensity', label: 'Hair density' },
    { key: 'hairThickness', label: 'Hair thickness' },
    { key: 'follicleDensity', label: 'Follicle density' },
    { key: 'follicleThickness', label: 'Follicle thickness' },
    { key: 'follicleActivity', label: 'Follicle activity' },
    { key: 'scalpScore', label: 'Scalp score' },
];

const extractMetricSnapshot = (goHis: Record<string, any>, record: DetectionRecord): MetricSnapshot => ({
    hairDensity: Number(goHis?.hair_density_score_map?.score) || 0,
    hairThickness: Number(goHis?.hair_max_rad_score_map?.score) || 0,
    follicleDensity: Number(parseFloat(record.follicle)) || 0,
    follicleThickness: Number(goHis?.hair_texture_score_map?.score) || 0,
    follicleActivity: Number(goHis?.follicle_score_map?.score) || 0,
    scalpScore: Number(parseFloat(record.scalp)) || 0,
});

const calcPctChange = (before: number, after: number): number | null => {
    if (before === 0 && after === 0) return null;
    if (before === 0) return null;
    return Math.round(((after - before) / before) * 1000) / 10;
};

const whatChangedRows = ref<{ label: string; pillClass: string; text: string }[]>([]);

const fetchWhatChangedRows = async () => {
    const pair = beforeAfterPair.value;
    if (!pair?.baselineTs || !pair?.latestTs) {
        whatChangedRows.value = [];
        return;
    }

    const beforeRec = findClosestTrichoscanRecord(pair.baselineTs);
    const afterRec = findClosestTrichoscanRecord(pair.latestTs);
    if (!beforeRec || !afterRec) {
        whatChangedRows.value = [];
        return;
    }

    let userId = userStore.userInfo.userId;
    if (!userId) {
        const localUserInfo = uni.getStorageSync('userInfo');
        const storedUserId = uni.getStorageSync('userId');
        userId = localUserInfo?.userId || storedUserId;
    }
    if (!userId) return;

    try {
        const [beforeGoHis, afterGoHis] = await Promise.all([
            post('analyse/goHis', { userId, recordId: beforeRec.recordId }, { timeout: 30000 }),
            post('analyse/goHis', { userId, recordId: afterRec.recordId }, { timeout: 30000 }),
        ]);

        const beforeSnap = extractMetricSnapshot(beforeGoHis as Record<string, any>, beforeRec);
        const afterSnap = extractMetricSnapshot(afterGoHis as Record<string, any>, afterRec);

        whatChangedRows.value = WHAT_CHANGED_METRICS.map(({ key, label }) => {
            const pct = calcPctChange(beforeSnap[key], afterSnap[key]);
            if (pct === null || pct === 0) return null;
            return {
                label,
                pillClass: pct > 0 ? 'shell-pill shell-pill-g' : 'shell-pill shell-pill-r',
                text: pct > 0 ? `▲ ${Math.abs(pct)}%` : `▼ ${Math.abs(pct)}%`,
            };
        }).filter((row): row is { label: string; pillClass: string; text: string } => row !== null);
    } catch (error) {
        console.error('Failed to fetch what-changed metrics:', error);
        whatChangedRows.value = [];
    }
};

watch(
    () => [beforeAfterPair.value?.baselineTs, beforeAfterPair.value?.latestTs, chartDetectionRecords.value.length],
    () => {
        fetchWhatChangedRows();
    },
);

watch(
    () => [historyView.value, historyTab.value, chipFilteredRecords.value.map((r) => r.id).join(',')],
    () => {
        if (historyView.value === 'gallery' && historyTab.value === 'trichoscan') {
            prefetchTrichoThumbnails(chipFilteredRecords.value);
        }
    },
    { immediate: true },
);

const goToScanTab = () => {
    uni.switchTab({ url: '/pages/scan/index' });
};

const setDateChip = (chip: 'all' | 'last90') => {
    dateChip.value = chip;
    if (chip === 'all') clearDateFilter();
};

const onBaStart = (e: TouchEvent) => {
    baDragging.value = true;
    updateBaFromTouch(e);
};

const onBaMove = (e: TouchEvent) => {
    if (baDragging.value) updateBaFromTouch(e);
};

const onBaEnd = () => {
    baDragging.value = false;
};

const updateBaFromTouch = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || typeof document === 'undefined') return;
    const el = document.querySelector('.shell-ba') as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    baSplit.value = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
};

const baBeforeStyle = computed(() => ({
    clipPath: `inset(0 ${100 - baSplit.value}% 0 0)`,
}));

const baHandleStyle = computed(() => ({
    left: `${baSplit.value}%`,
}));

const getRecordScoreDelta = (record: HistoryRecord, index: number, records: HistoryRecord[]): number => {
    if (index >= records.length - 1) return 0;
    const prev = records[index + 1];
    return record.hairScore.score - prev.hairScore.score;
};

/** Selfie: lower stage = better. Positive delta = worsened. */
const getStageDelta = (record: HistoryRecord, index: number, records: HistoryRecord[]): number => {
    if (index >= records.length - 1) return 0;
    const prev = records[index + 1];
    return record.hairLossPattern.level - prev.hairLossPattern.level;
};

const getStageChangeInfo = (delta: number) => {
    if (!delta) return null;
    const count = Math.abs(delta);
    const unit = count === 1 ? t('hair.stagesUnit') : t('hair.stagesUnitPlural');
    if (delta < 0) {
        return {
            status: t('hair.stageImproved'),
            pillClass: 'shell-pill shell-pill-g',
            detail: `${count} ${unit}`,
        };
    }
    return {
        status: t('hair.stageWorsened'),
        pillClass: 'shell-pill shell-pill-r',
        detail: `${count} ${unit}`,
    };
};

const getRecordStageChange = (record: HistoryRecord, index: number, records: HistoryRecord[]) =>
    getStageChangeInfo(getStageDelta(record, index, records));

const getTrichoscanScores = (record: HistoryRecord) => {
    const data = record.originalData as DetectionRecord;
    return {
        overall: Math.round(parseFloat(data.scalpScore) || 0),
        hair: Math.round(parseFloat(data.hair) || 0),
        follicle: Math.round(parseFloat(data.follicle) || 0),
        scalp: Math.round(parseFloat(data.scalp) || 0),
    };
};

const getTrichoscanOverallDelta = (record: HistoryRecord, index: number, records: HistoryRecord[]): number => {
    if (index >= records.length - 1) return 0;
    const current = getTrichoscanScores(record);
    const prev = getTrichoscanScores(records[index + 1]);
    return current.overall - prev.overall;
};

type TrichoMetricRow = { key: string; label: string; value: number; delta: number };

const getTrichoscanMetricRows = (
    record: HistoryRecord,
    index: number,
    records: HistoryRecord[],
): TrichoMetricRow[] => {
    const scores = getTrichoscanScores(record);
    const deltas =
        index < records.length - 1
            ? (() => {
                  const prev = getTrichoscanScores(records[index + 1]);
                  return {
                      hair: scores.hair - prev.hair,
                      follicle: scores.follicle - prev.follicle,
                      scalp: scores.scalp - prev.scalp,
                  };
              })()
            : { hair: 0, follicle: 0, scalp: 0 };

    return [
        { key: 'hair', label: t('hair.hairScoreLabel'), value: scores.hair, delta: deltas.hair },
        { key: 'follicle', label: t('hair.follicleScore'), value: scores.follicle, delta: deltas.follicle },
        { key: 'scalp', label: t('hair.scalpScore'), value: scores.scalp, delta: deltas.scalp },
    ];
};

const formatMetricDelta = (delta: number): string => {
    if (!delta) return '—';
    return delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`;
};

const getMetricDeltaClass = (delta: number): string => {
    if (delta > 0) return 'shell-metric-delta shell-metric-delta--up';
    if (delta < 0) return 'shell-metric-delta shell-metric-delta--down';
    return 'shell-metric-delta shell-metric-delta--flat';
};

const getGalleryPrimaryText = (record: HistoryRecord, index: number, total: number): string => {
    if (record.type === 'phoneCamera') {
        return `${t('hair.level')} ${record.hairLossPattern.level}/${record.hairLossPattern.total}`;
    }
    return String(getTrichoscanScores(record).overall);
};

// 获取日历天数
const getCalendarDays = () => {
    const start = new Date(datePickerMonth.value);
    const startDay = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - startDay);

    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + i);
        return {
            date,
            isCurrentMonth: date.getMonth() === datePickerMonth.value.getMonth(),
        };
    });
};
</script>

<template>
    <MainTabLayout>
        <view class="your-hair-container">
            <text class="shell-ptitle">{{ t('tabbar.hair') }}</text>
            <view class="shell-tabs">
                <view class="shell-tab" :class="{ on: activeTab === 0 }" @tap="switchTab(0)">{{ t('hair.analysis') }}</view>
                <view class="shell-tab" :class="{ on: activeTab === 1 }" @tap="switchTab(1)">{{ t('hair.historyLog') }}</view>
            </view>

            <!-- ANALYSIS -->
            <view v-if="activeTab === 0" class="analysis-tab">
                <text class="shell-section-h shell-section-h--tight">Trends</text>
                <text class="shell-section-sub">Let's check your progress</text>

                <view class="shell-tgrid">
                    <view v-for="card in summaryCards" :key="card.label" class="shell-card shell-tstat">
                        <TablerIcon :name="card.icon" :size="22" color="#1A1228" />
                        <text class="shell-tstat-label">{{ card.label }}</text>
                        <text class="shell-tstat-val">{{ card.value }}</text>
                    </view>
                </view>

                <template v-if="hasRealData">
                    <text class="shell-label view-by-label">View by</text>
                    <view class="shell-seg">
                        <view
                            v-for="range in rangeOptions"
                            :key="range"
                            class="shell-seg-btn"
                            :class="{ on: range === activeRange }"
                            @tap="setRange(range)"
                        >{{ range }}</view>
                    </view>

                    <view class="shell-dd-wrap" :class="{ open: showScoreMenu }">
                        <view class="shell-dd" @tap="toggleScoreMenu">
                            <view class="shell-dd-l">
                                <view class="shell-dd-dot" />
                                <text>{{ selectedScoreLabel }}</text>
                            </view>
                            <TablerIcon name="chevron-down" :size="18" color="#6B21C8" class="shell-dd-chev" />
                        </view>
                        <view v-if="showScoreMenu" class="shell-dd-menu">
                            <view
                                v-for="opt in scoreMetricOptions"
                                :key="opt.key"
                                class="shell-dd-menu-btn"
                                :class="{ on: scoreMetric === opt.key }"
                                @tap="selectScoreMetric(opt.key)"
                            >{{ opt.label }}</view>
                        </view>
                    </view>

                    <view v-if="isDemoData" class="demo-data-notice">
                        <text class="demo-notice-text">{{ t('hair.demoDataNotice') }}</text>
                    </view>

                    <view class="shell-scoregrid">
                        <view class="shell-sblock">
                            <text class="shell-sb-l">First</text>
                            <text class="shell-sb-v">{{ firstScore }}<text class="sb-small">/100</text></text>
                            <text class="shell-pill shell-sb-d shell-pill--hidden">{{ formatDeltaPill(0) }}</text>
                        </view>
                        <view class="shell-sblock">
                            <text class="shell-sb-l">Current</text>
                            <text class="shell-sb-v">{{ currentScore }}<text class="sb-small">/100</text></text>
                            <text :class="[getScoreDeltaClass(currentScore - firstScore), 'shell-sb-d']">{{ formatDeltaPill(currentScore - firstScore) }}</text>
                        </view>
                        <view class="shell-sblock">
                            <text class="shell-sb-l">Average</text>
                            <text class="shell-sb-v">{{ averageScore }}<text class="sb-small">/100</text></text>
                            <text :class="[getScoreDeltaClass(currentScore - averageScore), 'shell-sb-d']">{{ formatDeltaPill(currentScore - averageScore) }}</text>
                        </view>
                    </view>

                    <view class="shell-card chart-card">
                        <view class="shell-chart-box">
                            <scroll-view class="hair-chart-scroll" scroll-x :scroll-left="scrollLeft" :show-scrollbar="false">
                                <view class="chart-wrapper" :style="{ width: chartWidth + 'rpx' }">
                                    <svg class="hair-line-svg" :viewBox="`0 0 ${chartWidth} ${chartSvgHeight}`" preserveAspectRatio="none">
                                        <path v-if="startingLinePath" :d="startingLinePath" fill="none" stroke="#6B21C8" stroke-width="3" stroke-linecap="round" />
                                        <path v-if="mainLinePath" :d="mainLinePath" fill="none" stroke="#6B21C8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                                        <path v-if="projectionLinePath" :d="projectionLinePath" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                                        <g>
                                            <circle
                                                v-for="circle in chartCircles"
                                                :key="circle.key"
                                                :cx="circle.x"
                                                :cy="circle.y"
                                                :r="chartConfig.pointRadius"
                                                :fill="circle.projection ? '#9ca3af' : '#6B21C8'"
                                                stroke="#ffffff"
                                                stroke-width="4"
                                            />
                                        </g>
                                    </svg>
                                    <view v-if="chartDateLabels.length" class="chart-date-labels">
                                        <view class="chart-date-inner">
                                            <text v-for="date in chartDateLabels" :key="date.key" class="chart-date-text">{{ date.label }}</text>
                                        </view>
                                    </view>
                                </view>
                            </scroll-view>
                        </view>
                    </view>

                    <text class="shell-section-h">Your Metrics</text>
                    <text class="shell-section-sub">Something about your Metrics here</text>
                    <view class="shell-card shell-radar-wrap">
                        <view class="radar-chart-core">
                            <svg class="shell-radar-svg" viewBox="0 0 200 200">
                                <g>
                                    <circle v-for="level in 4" :key="`grid-${level}`" cx="100" cy="100" :r="20 * level" fill="none" stroke="#E5E7EB" stroke-width="1" />
                                </g>
                                <g>
                                    <line v-for="(axis, index) in radarMetrics" :key="axis" x1="100" y1="100" :x2="axisPositions[index].x" :y2="axisPositions[index].y" stroke="#E5E7EB" stroke-width="1" />
                                </g>
                                <block v-if="hasRadarData">
                                    <polygon :points="firstScanPolygon" fill="rgba(107,33,200,0.15)" stroke="none" />
                                    <polygon :points="currentScanPolygon" fill="rgba(77,163,240,0.35)" stroke="none" />
                                    <polygon :points="firstScanPolygon" fill="none" stroke="#6B21C8" stroke-width="2" />
                                    <polygon :points="currentScanPolygon" fill="none" stroke="#4DA3F0" stroke-width="1.5" />
                                </block>
                            </svg>
                            <view class="radar-labels">
                                <view v-for="(axis, index) in radarMetrics" :key="`label-${axis}`" class="radar-label" :style="labelStyle(index)">
                                    <text>{{ axis }}</text>
                                </view>
                            </view>
                        </view>
                        <view class="shell-legend">
                            <view class="legend-item">
                                <view class="shell-lg-sq" style="background:#6B21C8" />
                                <text>First Scan</text>
                            </view>
                            <view class="legend-item">
                                <view class="shell-lg-sq" style="background:#4DA3F0" />
                                <text>Current</text>
                            </view>
                        </view>
                    </view>

                    <template v-if="beforeAfterPair">
                        <text class="shell-section-h">Before &amp; After</text>
                        <text class="shell-section-sub">Drag to compare your baseline and latest scan</text>
                        <view class="shell-card ba-card">
                            <view
                                class="shell-ba"
                                @touchstart.stop.prevent="onBaStart"
                                @touchmove.stop.prevent="onBaMove"
                                @touchend.stop="onBaEnd"
                                @touchcancel.stop="onBaEnd"
                            >
                                <view
                                    class="shell-ba-layer shell-ba-after shell-ba-photo"
                                    :style="beforeAfterPair.latestImg ? getSelfieBaStyle(beforeAfterPair.latestImg) : { '--h': '262deg' }"
                                >
                                    <TablerIcon v-if="!beforeAfterPair.latestImg" name="user-scan" :size="46" color="rgba(255,255,255,0.85)" />
                                </view>
                                <view
                                    class="shell-ba-layer shell-ba-before shell-ba-photo"
                                    :style="[baBeforeStyle, beforeAfterPair.baselineImg ? getSelfieBaStyle(beforeAfterPair.baselineImg) : { '--h': '28deg' }]"
                                >
                                    <TablerIcon v-if="!beforeAfterPair.baselineImg" name="user-scan" :size="46" color="rgba(255,255,255,0.85)" />
                                </view>
                                <text class="shell-ba-tag shell-ba-tag-l">Before · {{ beforeAfterPair.baselineDate }}</text>
                                <text class="shell-ba-tag shell-ba-tag-r">After · {{ beforeAfterPair.latestDate }}</text>
                                <view class="shell-ba-handle" :style="baHandleStyle">
                                    <view class="shell-ba-knob">
                                        <TablerIcon name="arrows-horizontal" :size="16" color="#6B21C8" />
                                    </view>
                                </view>
                            </view>
                            <view class="shell-ba-foot">
                                <view>
                                    <text class="shell-ba-fnum ba-muted">{{ beforeAfterPair.baselineScore }}</text>
                                    <text class="shell-ba-flbl">Baseline</text>
                                </view>
                                <text v-if="beforeAfterPair.densityDelta" class="shell-pill shell-pill-g ba-pill">
                                    <TablerIcon name="trending-up" :size="12" color="#0E9E62" />
                                    {{ beforeAfterPair.densityDelta > 0 ? '+' : '' }}{{ beforeAfterPair.densityDelta }} pts
                                </text>
                                <view class="ba-foot-right">
                                    <text class="shell-ba-fnum ba-primary">{{ beforeAfterPair.latestScore }}</text>
                                    <text class="shell-ba-flbl">Latest</text>
                                </view>
                            </view>
                        </view>
                    </template>

                    <view v-if="whatChangedRows.length" class="shell-card what-changed-card">
                        <text class="shell-label what-changed-label">what changed</text>
                        <view v-for="row in whatChangedRows" :key="row.label" class="shell-row">
                            <text class="shell-row-label">{{ row.label }}</text>
                            <text :class="row.pillClass">{{ row.text }}</text>
                        </view>
                    </view>
                </template>
            </view>

            <!-- HISTORY LOG -->
            <view v-if="activeTab === 1" class="history-panel">
                <view class="shell-subtog">
                    <view class="shell-subtog-btn" :class="{ on: historyTab === 'selfie' }" @tap="historyTab = 'selfie'">{{ t('hair.selfieTab') }}</view>
                    <view class="shell-subtog-btn" :class="{ on: historyTab === 'trichoscan' }" @tap="historyTab = 'trichoscan'">{{ t('hair.trichoscanTab') }}</view>
                </view>

                <view class="shell-hist-bar">
                    <view class="hist-meta">
                        <text class="shell-hist-count">{{ histCountText }}</text>
                        <text v-if="histRangeText" class="shell-hist-range">{{ histRangeText }}</text>
                    </view>
                    <view class="shell-vswitch">
                        <view class="shell-vswitch-btn" :class="{ on: historyView === 'timeline' }" @tap="historyView = 'timeline'">
                            <TablerIcon name="timeline-event" :size="17" :color="historyView === 'timeline' ? '#fff' : '#8A82A0'" />
                        </view>
                        <view class="shell-vswitch-btn" :class="{ on: historyView === 'gallery' }" @tap="historyView = 'gallery'">
                            <TablerIcon name="layout-grid" :size="17" :color="historyView === 'gallery' ? '#fff' : '#8A82A0'" />
                        </view>
                    </view>
                </view>

                <view class="shell-chip-row">
                    <view class="shell-chip" :class="{ on: dateChip === 'all' && !selectedDateFilter }" @tap="setDateChip('all')">
                        <TablerIcon name="calendar" :size="14" color="#6B21C8" />
                        {{ t('hair.allDates') }}
                    </view>
                    <view class="shell-chip" :class="{ on: dateChip === 'last90' }" @tap="setDateChip('last90')">{{ t('hair.last90Days') || 'Last 90 days' }}</view>
                    <view class="shell-chip" @tap="toggleDatePicker">
                        <TablerIcon name="calendar" :size="14" color="#8A82A0" />
                        {{ getFilterDisplayText() }}
                    </view>
                </view>

                <view v-if="showDatePicker" class="date-picker-overlay" @tap="showDatePicker = false">
                    <view class="date-picker" @tap.stop>
                        <view class="date-picker-header">
                            <text class="picker-title">{{ t('hair.selectDate') }}</text>
                            <view class="picker-close" @tap="showDatePicker = false">×</view>
                        </view>
                        <view class="date-picker-content">
                            <view class="month-navigation">
                                <view class="nav-button" @tap="datePickerMonth = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1, 1)">‹</view>
                                <text class="month-text">{{ datePickerMonth.getFullYear() }}-{{ datePickerMonth.getMonth() + 1 }}</text>
                                <view class="nav-button" @tap="datePickerMonth = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 1)">›</view>
                            </view>
                            <view class="calendar-grid">
                                <view class="calendar-weekdays">
                                    <text v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="weekday">{{ d }}</text>
                                </view>
                                <view class="calendar-days">
                                    <view
                                        v-for="day in getCalendarDays()"
                                        :key="`${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`"
                                        class="calendar-day"
                                        :class="{ 'other-month': !day.isCurrentMonth, 'has-data': getRecordsCountByDate(day.date) > 0, selected: selectedDateFilter === formatDateKey(day.date) }"
                                        @tap="selectDateFromPicker(day.date)"
                                    >
                                        <text class="day-number">{{ day.date.getDate() }}</text>
                                        <text v-if="getRecordsCountByDate(day.date) > 0" class="day-count">{{ getRecordsCountByDate(day.date) }}</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <view v-if="isLoading" class="loading-state">
                    <text class="loading-text">{{ t('hair.loadingRecords') }}</text>
                </view>
                <view v-else-if="loadError" class="error-state">
                    <text class="error-text">{{ loadError }}</text>
                    <view class="retry-button" @tap="processHistoryData">
                        <text class="retry-text">{{ t('common.retry') || 'Retry' }}</text>
                    </view>
                </view>
                <view v-else-if="chipFilteredRecords.length === 0" class="empty-state">
                    <text class="empty-text">{{ t('hair.noRecordsFound') }}</text>
                </view>

                <view v-else-if="historyView === 'timeline'" class="shell-tl">
                    <view
                        v-for="(record, index) in chipFilteredRecords"
                        :key="record.id"
                        class="shell-tl-item"
                        @tap="viewRecordDetail(record)"
                    >
                        <view class="shell-tl-dot" :class="{ now: index === 0 }" />
                        <view class="shell-tl-card">
                            <TablerIcon name="chevron-right" :size="18" color="#8A82A0" class="shell-tl-go" />
                            <view v-if="record.type === 'advancedScan'" class="delete-fab" @tap.stop="deleteRecord(record)">
                                <TablerIcon name="x" :size="14" color="#E0556B" />
                            </view>
                            <view class="shell-tl-top">
                                <text class="shell-tl-when">{{ getTimelineWhen(record, index, chipFilteredRecords.length) }}</text>
                                <view class="shell-src-badge">
                                    <TablerIcon name="device-mobile" :size="11" color="#fff" />
                                    <text>{{ record.typeLabel }}</text>
                                </view>
                            </view>
                            <!-- Selfie: stage only, no /100 score -->
                            <template v-if="record.type === 'phoneCamera'">
                                <view class="shell-tl-hero-row">
                                    <view class="shell-tl-hero-stage">
                                        <text class="shell-tl-lvl-hero">{{ t('hair.level') }} {{ record.hairLossPattern.level }}</text>
                                        <text class="shell-tl-lvl-of">/ {{ record.hairLossPattern.total }}</text>
                                    </view>
                                    <text
                                        v-if="index === chipFilteredRecords.length - 1"
                                        class="shell-pill shell-pill-p"
                                    >{{ t('hair.firstScan') }}</text>
                                    <text
                                        v-else-if="getRecordStageChange(record, index, chipFilteredRecords)"
                                        :class="getRecordStageChange(record, index, chipFilteredRecords)!.pillClass"
                                    >
                                        {{ getRecordStageChange(record, index, chipFilteredRecords)!.status }}
                                        · {{ getRecordStageChange(record, index, chipFilteredRecords)!.detail }}
                                    </text>
                                </view>
                                <view class="shell-tl-type-row">
                                    <text class="shell-tl-type">{{ getSelfieTypeLabel(record) }} · {{ t('hair.hairLossStage') }}</text>
                                </view>
                                <view class="shell-stage-meter">
                                    <view
                                        v-for="i in record.hairLossPattern.total"
                                        :key="i"
                                        class="stage-seg"
                                        :class="{ on: i <= record.hairLossPattern.level }"
                                    />
                                </view>
                            </template>

                            <!-- Trichoscan: overall /100 + sub-scores -->
                            <template v-else>
                                <view class="shell-tl-score shell-tl-score--tricho">
                                    <text class="shell-tl-num">{{ getTrichoscanScores(record).overall }}</text>
                                    <text class="shell-tl-of">/100</text>
                                    <text v-if="index === chipFilteredRecords.length - 1" class="shell-pill shell-pill-p">{{ t('hair.firstScan') }}</text>
                                    <text
                                        v-else-if="getTrichoscanOverallDelta(record, index, chipFilteredRecords) !== 0"
                                        :class="getScoreDeltaClass(getTrichoscanOverallDelta(record, index, chipFilteredRecords))"
                                    >
                                        {{ formatMetricDelta(getTrichoscanOverallDelta(record, index, chipFilteredRecords)) }}
                                    </text>
                                </view>
                                <text class="shell-tl-subtitle">{{ t('hair.overallScore') }}</text>
                                <view class="shell-tl-metrics">
                                    <view
                                        v-for="metric in getTrichoscanMetricRows(record, index, chipFilteredRecords)"
                                        :key="metric.key"
                                        class="shell-tl-metric-chip"
                                    >
                                        <text class="shell-tl-metric-label">{{ metric.label }}</text>
                                        <view class="shell-tl-metric-valrow">
                                            <text class="shell-tl-metric-value">{{ metric.value }}</text>
                                            <text
                                                v-if="index < chipFilteredRecords.length - 1"
                                                :class="getMetricDeltaClass(metric.delta)"
                                            >{{ formatMetricDelta(metric.delta) }}</text>
                                        </view>
                                    </view>
                                </view>
                            </template>
                        </view>
                    </view>
                </view>

                <view v-else class="shell-gal">
                    <view
                        v-for="(record, index) in chipFilteredRecords"
                        :key="`gal-${record.id}`"
                        class="shell-gal-item"
                        @tap="viewRecordDetail(record)"
                    >
                        <view class="shell-gal-thumb" :style="getGalThumbStyle(record)">
                            <TablerIcon
                                v-if="record.type === 'phoneCamera' && !getSelfieImage(record)"
                                name="user-scan"
                                :size="40"
                                color="rgba(255,255,255,0.85)"
                            />
                            <TablerIcon
                                v-else-if="record.type === 'advancedScan' && !getTrichoThumbUrl(record)"
                                name="scan"
                                :size="40"
                                color="rgba(255,255,255,0.85)"
                            />
                        </view>
                        <text class="shell-gal-score">{{ getGalleryPrimaryText(record, index, chipFilteredRecords.length) }}</text>
                        <view class="shell-gal-meta">
                            <text class="shell-gal-date">{{ getGalDate(record) }}</text>
                            <text class="shell-gal-tag">
                                <template v-if="record.type === 'phoneCamera'">
                                    {{ getSelfieTypeLabel(record) }} · L{{ record.hairLossPattern.level }}/{{ record.hairLossPattern.total }}
                                </template>
                                <template v-else>
                                    {{ t('hair.overallScore') }} · {{ getTrichoscanScores(record).overall }}/100
                                </template>
                            </text>
                        </view>
                    </view>
                    <view class="shell-gal-item shell-gal-add" @tap="goToScanTab">
                        <TablerIcon name="plus" :size="26" color="#6B21C8" />
                        <text>New scan</text>
                    </view>
                </view>
            </view>
        </view>
    </MainTabLayout>
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';
@import '@/styles/hair-page.scss';
</style>
