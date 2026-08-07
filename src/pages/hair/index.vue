<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onPullDownRefresh, onReachBottom, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/userStore';
import { get, post, request, ProjectBrand } from '@/utils/request';
import { getSelfieReports, getTrichoReports } from '@/utils/clerk';
import { decompressBase64Gzip } from '@/utils/decompress';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ImagePreview from '@/components/common/ImagePreview.vue';
import { captureShareCard, shareCapturedImage } from '@/composables/useShareCardCapture';

const { t, locale } = useI18n();
const userStore = useUserStore();

// 商家客户相关 (type/userType: 0=consumer, 1=merchant)
const isMerchant = computed(() =>
    (userStore.userInfo.type === 1) || (userStore.userInfo.userType === 1)
);
const selectedCustomer = ref<{ customerId: string; userId: string; name: string; gender?: string; birthDate?: string } | null>(null);
const customerList = ref<{ customerId: string; userId: string; name: string; phone?: string; gender?: string; birthDate?: string }[]>([]);
const customerSearchKeyword = ref('');
const customerPagination = ref({
    page: 1,
    pageSize: 20,
    hasMore: true,
    isLoadingMore: false,
});
const isLoadingCustomers = ref(false);
// 保存来源 tab 页面 URL
const fromTabUrl = ref<string>('/pages/scan/index');

// 初始化时检查是否有已选择的客户
const initSelectedCustomer = () => {
    if (!isMerchant.value) return;
    const stored = uni.getStorageSync('selectedHairCustomer');
    if (stored) {
        try {
            selectedCustomer.value = JSON.parse(stored);
        } catch {
            selectedCustomer.value = null;
        }
    }
};

// 获取客户列表
const fetchCustomerList = async (isLoadMore = false) => {
    if (isLoadMore && (customerPagination.value.isLoadingMore || !customerPagination.value.hasMore)) return;

    if (isLoadMore) {
        customerPagination.value.isLoadingMore = true;
    } else {
        isLoadingCustomers.value = true;
    }

    try {
        const page = isLoadMore ? customerPagination.value.page + 1 : 1;
        const merchantId = userStore.userInfo.userId; // 商家的 userId 就是 merchantId
        const response = await get('/customer', {
            page,
            pageSize: customerPagination.value.pageSize,
            search: customerSearchKeyword.value || undefined,
            merchantId,
        }, { brand: ProjectBrand.LUSHAIR_NEW });

        if (response && response.customers) {
            if (isLoadMore) {
                customerList.value = [...customerList.value, ...response.customers];
                customerPagination.value.page = page;
            } else {
                customerList.value = response.customers;
                customerPagination.value.page = 1;
            }
            customerPagination.value.hasMore = response.hasMore;
        }
    } catch (error) {
        console.error('Fetch customer list error:', error);
        uni.showToast({ title: t('merchant.failedToLoadCustomers') || 'Failed to load customers', icon: 'none' });
    } finally {
        isLoadingCustomers.value = false;
        customerPagination.value.isLoadingMore = false;
    }
};

// 选择客户
const selectCustomer = (customer: typeof selectedCustomer.value) => {
    if (!customer) return;
    selectedCustomer.value = customer;
    uni.setStorageSync('selectedHairCustomer', JSON.stringify(customer));
    // 重新加载数据
    reloadPageData();
};

// 切换客户（清除当前选择，显示选择器）
const switchCustomer = () => {
    // 在进入客户选择器前，保存上一个 tab（不是 hair）
    const lastTab = uni.getStorageSync('lastActiveTab');
    if (lastTab && lastTab !== '/pages/hair/index') {
        fromTabUrl.value = lastTab;
        console.log('[hair] switchCustomer: saved fromTabUrl', fromTabUrl.value);
    }
    selectedCustomer.value = null;
    uni.removeStorageSync('selectedHairCustomer');
    customerList.value = [];
    customerSearchKeyword.value = '';
    fetchCustomerList();
};

// 返回按钮处理
const handleBack = () => {
    console.log('[hair] handleBack called');
    console.log('[hair] fromTabUrl:', fromTabUrl.value);
    console.log('[hair] isMerchant:', isMerchant.value);
    console.log('[hair] selectedCustomer:', selectedCustomer.value);

    // 确保 fromTabUrl 有效
    const targetUrl = fromTabUrl.value || '/pages/scan/index';
    console.log('[hair] switching to:', targetUrl);

    uni.switchTab({
        url: targetUrl,
        success: () => console.log('[hair] switchTab success'),
        fail: (err: any) => console.error('[hair] switchTab fail:', err)
    });
};


// 重新加载页面数据
const reloadPageData = async () => {
    if (!selectedCustomer.value?.userId && !userStore.userInfo.userId) return;
    const userId = isMerchant.value ? selectedCustomer.value?.userId : userStore.userInfo.userId;
    if (userId) {
        const { detectionRecords, selfieResults } = await processHistoryData();
        await fetchLatestScalpScore(detectionRecords, selfieResults);
    }
};

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
    aiReportId?: string | null;  // AI分析报告ID
    scalp: string;
    scalpScore: string;
    userId: string;
    deviceModel?: string;  // 设备型号：lushairPro 或其他
    coverImage?: string;  // 封面图片
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
    aiReportId: string | null;  // AI分析报告ID
    scalp: string | null;
    scurf: number;
    sleep: number;
    stage: number;
    userId: string;
    // 新增字段匹配 hair_reports 表
    generatedAt?: string | null;
    hair?: number | null;
    scalp?: number | null;
    follicle?: number | null;
    overallScore?: number | null;
}

interface ProductUsageData {
    dateKey: string;
    productIds: string[];
    productNames: string[];
}

interface TrendItem {
    date: string;
    score: number;
}

interface RecommendedProduct {
    productId: number;
    productTitle: string;
}

// 统一的历史记录接口
interface HistoryRecord {
    id: number;
    userId: string;
    date: string;
    type: 'advancedScan' | 'phoneCamera' | 'productUsage';
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
    originalData: DetectionRecord | SelfieResult | ProductUsageData;
}

type ScoreMetricKey = 'hair' | 'follicle' | 'scalp';

// 响应式数据
const historyRecords = ref<HistoryRecord[]>([]);
const isLoading = ref(false);
const loadError = ref('');
const isDeletingRecord = ref(false); // 标记是否正在删除记录 Flag for deleting record
const savedScrollTop = ref(0); // 保存的滚动位置 Saved scroll position

// 分页状态
const selfiePagination = ref({
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoadingMore: false
});

const trichoPagination = ref({
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoadingMore: false
});

// 日期筛选器相关状态
const selectedDateFilter = ref<string | null>(null); // null表示"全部"，具体日期字符串表示选中日期
const showDatePicker = ref(false);
const datePickerMonth = ref(new Date());
const selectedFilterDate = ref<Date | null>(null);
const historyTab = ref<'all' | 'selfie' | 'trichoscan' | 'products'>('all');
const productNameMap = ref<Record<string, string>>({});
const scoreMetric = ref<ScoreMetricKey>('hair');
const showScoreMenu = ref(false);
const chartDetectionRecords = ref<DetectionRecord[]>([]);
const historyView = ref<'timeline' | 'gallery'>('timeline');
const trichoThumbCache = ref<Record<number, string>>({});
const dateChip = ref<'all' | 'last90'>('all');
const baSplit = ref(50);
const baDragging = ref(false);
const baStartX = ref(0);
const baStartY = ref(0);
const baRect = ref({ left: 0, top: 0, width: 0, height: 0 });

// 图片预览相关状态
const showImagePreview = ref(false);
const previewImages = ref<string[]>([]);
const previewCurrentIndex = ref(0);

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
            console.log('calculateSelfieScore - parsed extInfo:', info);
            const factors = ['oil', 'discomfort', 'scurfOrKeratin', 'overall', 'hairLoss'];

            factors.forEach(factor => {
                const value = info[factor];
                console.log(`calculateSelfieScore - factor: ${factor}, value: ${value}`);
                if (value === 1) baseScore -= 5;
                else if (value === 2) baseScore -= 10;
                else if (value === 3) baseScore -= 15;
            });
        } catch (error) {
            console.error('ExtInfo parsing error:', error);
        }
    } else {
        console.log('calculateSelfieScore - extInfo is null or empty');
    }

    const finalScore = Math.max(0, Math.min(100, baseScore));
    console.log('calculateSelfieScore - final score:', finalScore);
    return finalScore;
};

const loadLocalClockInRecords = (): Record<string, string[]> => {
    const merged: Record<string, string[]> = {};
    for (const key of ['clock_in_records', 'clockInRecords']) {
        try {
            const raw = uni.getStorageSync(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw) as Record<string, string[]>;
            for (const [dateKey, ids] of Object.entries(parsed)) {
                if (!ids?.length) continue;
                merged[dateKey] = [...new Set([...(merged[dateKey] || []), ...ids.map(String)])];
            }
        } catch (error) {
            console.warn('[hair] failed to parse clock-in storage', key, error);
        }
    }
    return merged;
};

const trendDateToKey = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '';
    const year = dateStr.slice(0, 4);
    const month = parseInt(dateStr.slice(4, 6), 10);
    const day = parseInt(dateStr.slice(6, 8), 10);
    return `${year}-${month}-${day}`;
};

const formatProductDateLabel = (dateKey: string): string => {
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return dateKey;
    return formatDate(new Date(year, month - 1, day).toISOString());
};

const fetchProductNameMap = async (userId: string): Promise<Record<string, string>> => {
    const map: Record<string, string> = {};
    try {
        const response = (await post('/product/recommend', { userId })) as RecommendedProduct[];
        if (Array.isArray(response)) {
            response.forEach((product) => {
                map[String(product.productId)] = product.productTitle;
            });
        }
    } catch (error) {
        console.warn('[hair] failed to fetch product names', error);
    }
    return map;
};

const fetchServerClockInRecords = async (
    userId: string,
    localRecords: Record<string, string[]>,
): Promise<Record<string, string[]>> => {
    const merged = { ...localRecords };
    try {
        const trend = (await post('/encr/clockIn/trend', { userId })) as TrendItem[];
        if (!Array.isArray(trend)) return merged;

        const missingDates = trend
            .map((item) => trendDateToKey(item.date))
            .filter((dateKey) => dateKey && (!merged[dateKey] || merged[dateKey].length === 0))
            .slice(-30);

        if (!missingDates.length) return merged;

        const results = await Promise.all(
            missingDates.map(async (dateKey) => {
                try {
                    const dateStr = dateKey.replace(/-/g, '');
                    const response = (await post('encr/clockIn/product/query', {
                        userId,
                        dateStr,
                    })) as Array<{ productId: number; clockIn?: boolean; productTitle?: string }>;
                    if (!Array.isArray(response)) return { dateKey, productIds: [] as string[] };

                    const productIds = response
                        .filter((product) => product.clockIn)
                        .map((product) => String(product.productId));

                    response.forEach((product) => {
                        if (product.productTitle) {
                            productNameMap.value[String(product.productId)] = product.productTitle;
                        }
                    });

                    return { dateKey, productIds };
                } catch {
                    return { dateKey, productIds: [] as string[] };
                }
            }),
        );

        results.forEach(({ dateKey, productIds }) => {
            if (!productIds.length) return;
            merged[dateKey] = [...new Set([...(merged[dateKey] || []), ...productIds])];
        });
    } catch (error) {
        console.warn('[hair] failed to fetch server clock-in history', error);
    }
    return merged;
};

interface RoutineLogEntry {
    dateKey: string;
    logs: string[];
}

const buildProductUsageRecords = (
    recordsMap: Record<string, string[]>,
    userId: string,
): HistoryRecord[] => {
    return Object.entries(recordsMap)
        .filter(([, productIds]) => productIds?.length)
        .map(([dateKey, productIds]) => {
            const uniqueIds = [...new Set(productIds.map(String))];
            const productNames = uniqueIds.map(
                (id) => productNameMap.value[id] || t('hair.productFallback', [id]),
            );
            const [year, month, day] = dateKey.split('-').map(Number);
            const numericId = year && month && day ? -(year * 10000 + month * 100 + day) : -Date.now();

            return {
                id: numericId,
                userId,
                date: formatProductDateLabel(dateKey),
                type: 'productUsage' as const,
                typeLabel: t('hair.productUsage'),
                typeIcon: '/static/trichoscan/shampoo.png',
                hairLossPattern: { level: 0, total: 7, improvement: 0 },
                hairScore: {
                    score: uniqueIds.length,
                    total: uniqueIds.length,
                    improvement: 0,
                },
                originalData: {
                    dateKey,
                    productIds: uniqueIds,
                    productNames,
                },
            };
        });
};

// 获取 routine 任务日志
const fetchRoutineLogs = async (userId: string): Promise<RoutineLogEntry[]> => {
    try {
        const response = await get('/user/routine-log?userId=' + encodeURIComponent(userId), {}, { brand: ProjectBrand.LUSHAIR_NEW }) as RoutineLogEntry[];
        console.log('[hair] routine logs response:', response);
        return response || [];
    } catch (error) {
        console.warn('[hair] failed to fetch routine logs', error);
        return [];
    }
};

// 构建 routine 日志记录
const buildRoutineLogRecords = (
    routineLogs: RoutineLogEntry[],
    userId: string,
): HistoryRecord[] => {
    return routineLogs.map((entry) => {
        const [year, month, day] = entry.dateKey.split('-').map(Number);
        const numericId = year && month && day ? -(year * 10000 + month * 100 + day + 0.5) : -Date.now();

        return {
            id: numericId,
            userId,
            date: formatProductDateLabel(entry.dateKey),
            type: 'productUsage' as const,
            typeLabel: t('hair.productRoutine'),
            typeIcon: '/static/routine/routine-icon.png',
            hairLossPattern: { level: 0, total: 7, improvement: 0 },
            hairScore: {
                score: entry.logs.length,
                total: entry.logs.length,
                improvement: 0,
            },
            originalData: {
                dateKey: entry.dateKey,
                productIds: [],
                productNames: entry.logs,
            },
        };
    });
};

// API调用函数 - 获取毛囊镜记录（用于 ANALYSIS 标签页，需要老系统的 recordId）
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

// API调用函数 - 获取毛囊镜报告列表（用于 HISTORY LOG 标签页的分页展示）
const fetchTrichoReportsForHistory = async (userId: string, page = 1, pageSize = 10): Promise<DetectionRecord[]> => {
    try {
        console.log('Fetching tricho reports for history, userId:', userId, 'page:', page);
        const result = await getTrichoReports(userId, page, pageSize);
        console.log('Tricho reports response:', result);

        // 更新分页状态
        trichoPagination.value = {
            page: result.page,
            pageSize: result.pageSize,
            hasMore: result.hasMore,
            isLoadingMore: false
        };

        // 转换 hair_reports 数据为 DetectionRecord 格式（用于展示，不需要 recordId）
        const reports = result.reports || [];
        const processedReports = reports.map((report: any) => {
            return {
                recordId: 0, // 不需要老系统的 recordId，用于展示即可
                userId: report.userId || userId,
                name: '',
                nickName: '',
                phone: 0,
                age: 0,
                createTime: report.generatedAt || report.created_at || new Date().toISOString(),
                scalp: report.scalp?.toString() || '0',
                follicle: report.follicle?.toString() || '0',
                hair: report.hair?.toString() || '0',
                scalpScore: report.overallScore?.toString() || '0',
                avatar: '',
                position: '',
                reportId: report.id || undefined,
                aiReportId: report.ai_report_id || report.aiReportId || null,  // AI分析报告ID
                deviceModel: report.device_model || undefined,  // 设备型号
                coverImage: report.coverImage || report.cover_image || ''  // 封面图片
            } as DetectionRecord;
        });

        return processedReports;
    } catch (error) {
        console.error('Failed to fetch tricho reports:', error);
        trichoPagination.value.isLoadingMore = false;
        return [];
    }
};

// Fetch report detail from hair_reports_detail table
const fetchReportDetail = async (reportId: string): Promise<any> => {
    try {
        console.log('Fetching report detail for reportId:', reportId);
        const REPORT_DETAIL_PATH = `/report/detail/${reportId}`;
        const response = await get(REPORT_DETAIL_PATH, {}, { brand: ProjectBrand.LUSHAIR_NEW });
        console.log('Report detail response:', response);
        return response;
    } catch (error) {
        console.error('Failed to fetch report detail:', error);
        return null;
    }
};

const fetchSelfieResults = async (userId: string, page = 1, pageSize = 10): Promise<SelfieResult[]> => {
    try {
        console.log('Fetching selfie results for userId:', userId, 'page:', page);
        // 使用新的 API 从 hair_reports 表获取自拍数据，传入 userId
        const result = await getSelfieReports(userId, page, pageSize);
        console.log('Selfie results response:', result);

        // 更新分页状态
        selfiePagination.value = {
            page: result.page,
            pageSize: result.pageSize,
            hasMore: result.hasMore,
            isLoadingMore: false
        };

        // 转换 hair_reports 数据为 SelfieResult 格式
        const reports = result.reports || [];

        // 处理数据格式，确保与原有 SelfieResult 接口兼容
        const processedReports = await Promise.all(reports.map(async (report: any, index: number) => {
            console.log(`Processing report ${index}:`, report);

            let detailData = null;
            let extInfo = null;

            // 如果报告有 detail 字段，直接使用
            if (report.detail) {
                console.log(`Report ${index} has detail field:`, report.detail.substring(0, 100) + '...');
                try {
                    detailData = await decompressBase64Gzip(report.detail);
                    console.log(`Report ${index} decompressed detail:`, detailData);
                    if (detailData?.input?.ext_info) {
                        extInfo = detailData.input.ext_info;
                        console.log(`Report ${index} extracted ext_info:`, extInfo);
                    }
                } catch (e) {
                    console.error(`Report ${index} detail decompression error:`, e);
                }
            }

            // 如果没有 detail 字段，尝试从 API 获取
            if (!detailData && report.id) {
                console.log(`Report ${index} fetching detail from API for reportId:`, report.id);
                try {
                    const detailResponse = await fetchReportDetail(report.id);
                    if (detailResponse && detailResponse.detail) {
                        console.log(`Report ${index} got detail from API:`, detailResponse.detail.substring(0, 100) + '...');
                        detailData = await decompressBase64Gzip(detailResponse.detail);
                        console.log(`Report ${index} decompressed detail from API:`, detailData);
                        if (detailData?.input?.ext_info) {
                            extInfo = detailData.input.ext_info;
                            console.log(`Report ${index} extracted ext_info from API:`, extInfo);
                        }
                    }
                } catch (e) {
                    console.error(`Report ${index} failed to fetch detail from API:`, e);
                }
            }

            // 如果还是没有，尝试从 extInfo 字段获取（兼容旧数据）
            if (!extInfo && report.extInfo) {
                console.log(`Report ${index} trying extInfo field:`, report.extInfo);
                try {
                    const parsedExtInfo = typeof report.extInfo === 'string' ? JSON.parse(report.extInfo) : report.extInfo;
                    if (parsedExtInfo?.input?.ext_info) {
                        extInfo = parsedExtInfo.input.ext_info;
                    } else {
                        extInfo = parsedExtInfo;
                    }
                    console.log(`Report ${index} parsed extInfo:`, extInfo);
                } catch (e) {
                    console.error(`Report ${index} extInfo parsing error:`, e);
                    try {
                        const decompressed = await decompressBase64Gzip(report.extInfo);
                        if (decompressed?.input?.ext_info) {
                            extInfo = decompressed.input.ext_info;
                            console.log(`Report ${index} decompressed extInfo:`, extInfo);
                        }
                    } catch (e2) {
                        console.error(`Report ${index} extInfo decompression error:`, e2);
                    }
                }
            }

            return {
                id: parseInt(report.id) || 0,
                userId: report.userId || userId,
                stage: report.stage || 1,
                position: report.position || 'none',
                image: report.coverImage || '',
                reportId: report.id || null,
                aiReportId: report.aiReportId || report.ai_report_id || null,
                createTime: report.generatedAt || report.created_at || null,
                createdTime: report.generatedAt || report.created_at || null,
                generatedAt: report.generatedAt || report.created_at || null,
                extInfo: extInfo ? JSON.stringify(extInfo) : null,
                hair: report.hair || null,
                scalp: report.scalp || null,
                follicle: report.follicle || null,
                overallScore: report.overallScore || null,
                approximateAge: detailData?.input?.approximateAge || extInfo?.approximateAge || 0,
                breakHair: detailData?.input?.break_hair || extInfo?.breakHair || 0,
                drink: detailData?.input?.drink || extInfo?.drink || 0,
                loseHair: detailData?.input?.lose_hair || extInfo?.loseHair || 0,
                scurf: detailData?.input?.scurf || extInfo?.scurf || 0,
                sleep: detailData?.input?.sleep || extInfo?.sleep || 0,
                gender: detailData?.input?.gender || extInfo?.gender || null,
            } as SelfieResult;
        }));

        return processedReports;
    } catch (error) {
        console.error('Failed to fetch selfie results:', error);
        selfiePagination.value.isLoadingMore = false;
        return [];
    }
};

// 数据处理和合并
const processHistoryData = async (): Promise<{ detectionRecords: DetectionRecord[], selfieResults: SelfieResult[] }> => {
    isLoading.value = true;
    loadError.value = '';

    try {
        // 获取当前userId（商家版用客户userId，用户版用自己的userId）
        let userId: string | undefined;
        if (isMerchant.value) {
            userId = selectedCustomer.value?.userId;
        } else {
            userId = userStore.userInfo.userId;
            if (!userId) {
                const localUserInfo = uni.getStorageSync('userInfo');
                const storedUserId = uni.getStorageSync('userId');
                userId = localUserInfo?.userId || storedUserId;
            }
        }

        if (!userId) {
            throw new Error('No userId available');
        }
        
        // 同时获取两套数据：
        // - detectionRecords: 老系统数据，用于 ANALYSIS 标签页（需要 recordId 调用 goHis）
        // - trichoReports: hair_reports 表数据，用于 HISTORY LOG 标签页（支持分页）
        const [detectionRecords, selfieResults, trichoReports] = await Promise.all([
            fetchDetectionRecords(userId),          // 老系统数据
            fetchSelfieResults(userId),              // 自拍数据（已有分页）
            fetchTrichoReportsForHistory(userId)    // hair_reports 表数据（分页）
        ]);

        productNameMap.value = await fetchProductNameMap(userId);
        const localClockIn = loadLocalClockInRecords();
        const clockInRecords = await fetchServerClockInRecords(userId, localClockIn);
        const productRecords = buildProductUsageRecords(clockInRecords, userId);

        // 获取 routine 任务日志
        const routineLogs = await fetchRoutineLogs(userId);
        const routineRecords = buildRoutineLogRecords(routineLogs, userId);

        // 保存原始顺序的数据（用于计算删除索引）
        originalDetectionRecords.value = [...detectionRecords];
        originalSelfieResults.value = [...selfieResults];

        const allRecords: HistoryRecord[] = [];

        // 处理检测记录（用于 HISTORY LOG，使用 hair_reports 表数据）
        trichoReports.forEach((record, index) => {
            const scalpScore = parseFloat(record.scalpScore);
            const level = calculateLevel(scalpScore);
            
            // 计算improvement - 与上一条记录比较（时间更早的记录）
            const prevRecord = detectionRecords[index + 1];
            const prevScalpScore = prevRecord ? parseFloat(prevRecord.scalpScore) : null;
            const prevLevel = prevRecord ? calculateLevel(prevScalpScore!) : null;
            
            // 计算实际差值（当前 - 之前），只有正数才显示
            const scoreImprovement = prevScalpScore !== null ? scalpScore - prevScalpScore : 0;
            const levelImprovement = prevLevel !== null ? level - prevLevel : 0;
            
            // 根据 deviceModel 设置 typeLabel
            const deviceLabel = record.deviceModel === 'lushairPro' ? 'Lushair Pro' : 'Lushair One';

            allRecords.push({
                id: record.recordId || Date.now() + Math.random(),  // 使用 recordId 或生成唯一 ID
                userId: record.userId,
                date: formatDate(record.createTime),
                type: 'advancedScan',
                typeLabel: deviceLabel,
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

        allRecords.push(...productRecords);
        allRecords.push(...routineRecords);
        
        // 按时间倒序排列
        allRecords.sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
        
        historyRecords.value = allRecords;
        scanStreak.value = calculateScanStreak(allRecords.filter((r) => r.type !== 'productUsage'));

        // 获取雷达图数据 Fetch radar data（使用老系统的 detectionRecords，因为它有正确的 recordId）
        if (detectionRecords.length > 0) {
            // 按时间排序是倒序的，所以最后一个是最早的，第一个是最新的
            // Sorted by time descending, so last is earliest, first is latest
            const firstRecord = detectionRecords[detectionRecords.length - 1];
            const currentRecord = detectionRecords[0];

            const firstId = firstRecord.recordId;
            const currentId = currentRecord.recordId;

            if (firstId && currentId) {
                fetchRadarData(firstId, currentId, userId);
            }
        }
        
        chartDetectionRecords.value = [...detectionRecords];
        processTimeSeriesData(detectionRecords, scoreMetric.value);
        fetchWhatChangedRows();

        // 更新扫描总数（老系统毛囊镜 + 自拍）
        totalScansCount.value = detectionRecords.length + selfieResults.length;
        
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
    // 获取页面传递的参数
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any).options || {};
    console.log('[hair] pages.length:', pages.length);
    console.log('[hair] currentPage:', (currentPage as any)?.route);
    console.log('[hair] options:', options);

    // 保存来源 tab 页面：优先使用参数，否则从本地存储获取
    if (options.fromTab) {
        fromTabUrl.value = decodeURIComponent(options.fromTab);
        console.log('[hair] fromTab param:', fromTabUrl.value);
    } else {
        // 从本地存储获取最后访问的 tab 页面（排除 hair 页面本身）
        const lastTab = uni.getStorageSync('lastActiveTab');
        if (lastTab && lastTab !== '/pages/hair/index') {
            fromTabUrl.value = lastTab;
            console.log('[hair] lastActiveTab from storage:', fromTabUrl.value);
        } else {
            console.log('[hair] no valid lastActiveTab, using default scan tab');
        }
    }

    // 初始化用户信息
    userStore.initUserInfo();

    // 商家版：初始化客户选择
    if (isMerchant.value) {
        initSelectedCustomer();
        if (!selectedCustomer.value) {
            // 未选择客户，加载客户列表
            await fetchCustomerList();
        }
    }

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

    // 商家版未选择客户时，不加载数据
    if (isMerchant.value && !selectedCustomer.value) {
        console.log('Merchant mode: no customer selected, skipping data load');
        return;
    }

    // 用户版或商家已选客户：加载数据

    if (userId) {
        // 优化：先获取历史数据，然后将数据传递给 fetchLatestScalpScore，避免重复请求
        const { detectionRecords, selfieResults } = await processHistoryData();
        await fetchLatestScalpScore(detectionRecords, selfieResults);
    } else {
        console.warn('No userId found, cannot fetch history data');
        loadError.value = 'User not logged in';
    }

    // 监听刷新数据事件（用于AI分析完成后刷新列表）
    uni.$on('refreshHairListData', async () => {
        console.log('Received refreshHairListData event, refreshing data...');
        try {
            let refreshUserId = userStore.userInfo.userId;
            if (!refreshUserId) {
                const localUserInfo = uni.getStorageSync('userInfo');
                const storedUserId = uni.getStorageSync('userId');
                refreshUserId = localUserInfo?.userId || storedUserId;
            }

            if (refreshUserId) {
                const { detectionRecords, selfieResults } = await processHistoryData();
                await fetchLatestScalpScore(detectionRecords, selfieResults);
                console.log('Hair list data refreshed successfully');
            }
        } catch (error) {
            console.error('Failed to refresh hair list data:', error);
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

    // 监听毛囊镜aiReportId更新事件
    uni.$on('trichoscanAiReportIdUpdated', (data: { reportId: string; aiReportId: string }) => {
        console.log('Received trichoscanAiReportIdUpdated event:', data);
        // 更新historyRecords中对应的记录
        const recordIndex = historyRecords.value.findIndex((r: HistoryRecord) =>
            r.type === 'advancedScan' && (r.originalData as DetectionRecord).reportId === data.reportId
        );
        console.log('Found record index:', recordIndex, 'total records:', historyRecords.value.length);
        if (recordIndex !== -1) {
            const trichoscanData = historyRecords.value[recordIndex].originalData as DetectionRecord;
            console.log('Before update - aiReportId:', trichoscanData.aiReportId);
            trichoscanData.aiReportId = data.aiReportId;
            console.log('After update - aiReportId:', trichoscanData.aiReportId);
            console.log('Updated aiReportId for trichoscan record:', data.reportId, data.aiReportId);
        } else {
            console.log('Record not found for reportId:', data.reportId);
        }
    });
});

// 下拉刷新
onPullDownRefresh(async () => {
    console.log('Refresh hair page data');
    try {
        // 重新初始化用户信息
        await userStore.initUserInfo();

        // 商家版：重新检查客户选择
        if (isMerchant.value && !selectedCustomer.value) {
            uni.stopPullDownRefresh();
            await fetchCustomerList();
            return;
        }
        
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

// 滚动到底部时自动加载更多自拍记录或毛囊镜记录
onReachBottom(async () => {
    if (activeTab.value !== 1) return;

    // 毛囊镜 tab 或 all tab 且还有更多毛囊镜数据时加载
    if ((historyTab.value === 'trichoscan' || historyTab.value === 'all') &&
        trichoPagination.value.hasMore && !trichoPagination.value.isLoadingMore) {
        await loadMoreTrichoResults();
        return;
    }

    // 自拍 tab 或 all tab 且还有更多自拍数据时加载
    if ((historyTab.value === 'selfie' || historyTab.value === 'all') &&
        selfiePagination.value.hasMore && !selfiePagination.value.isLoadingMore) {
        await loadMoreSelfieResults();
    }
});

// 页面显示时恢复滚动位置
onShow(() => {
    // 更新来源 tab 页面（每次进入 Hair 时获取最新的上一个页面）
    const lastTab = uni.getStorageSync('lastActiveTab');
    if (lastTab && lastTab !== '/pages/hair/index') {
        fromTabUrl.value = lastTab;
        console.log('[hair] onShow: updated fromTabUrl', fromTabUrl.value);
    }

    if (savedScrollTop.value > 0) {
        nextTick(() => {
            // 查找 .shell-body 元素并恢复滚动位置
            const query = uni.createSelectorQuery();
            query.select('.shell-body').boundingClientRect();
            query.exec((res) => {
                if (res && res[0]) {
                    // 设置滚动位置
                    const shellBody = document.querySelector('.shell-body');
                    if (shellBody) {
                        shellBody.scrollTop = savedScrollTop.value;
                    }
                }
            });
        });
    }
});

// 页面隐藏时保存滚动位置
onHide(() => {
    const shellBody = document.querySelector('.shell-body');
    if (shellBody) {
        savedScrollTop.value = shellBody.scrollTop;
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

const viewRecordDetail = async (record: HistoryRecord) => {
    console.log('View record detail:', record);

    // Daily routine 记录不点击进详情
    if (record.type === 'productUsage' && record.typeLabel === t('hair.productRoutine')) {
        return;
    }

    if (record.type === 'productUsage') {
        uni.navigateTo({ url: '/pages/analysis/index' });
        return;
    }

    // Check if it's a phone camera record
    if (record.type === 'phoneCamera') {
        // Navigate to selfie results page for phone camera records
        const data = record.originalData as SelfieResult;
        const reportIdParam = data.reportId ? `&reportId=${encodeURIComponent(data.reportId)}` : '';
        const aiReportIdParam = data.aiReportId ? `&aiReportId=${encodeURIComponent(data.aiReportId)}` : '';
        const overallScoreParam = `&overallScore=${record.hairScore.score}`;
        uni.navigateTo({
            url: `/pages/Selfie/results?position=${encodeURIComponent(data.position)}&stage=${data.stage}&image=${encodeURIComponent(data.image)}&extInfo=${encodeURIComponent(data.extInfo || '')}&userId=${record.userId}&from=history&createTime=${encodeURIComponent(data.createTime || '')}&id=${data.id}${reportIdParam}${aiReportIdParam}${overallScoreParam}`
        });
    } else {
        // Navigate to trichoscan results page for advanced scan records
        const trichoscanData = record.originalData as DetectionRecord;
        console.log('Clicking trichoscan record - reportId:', trichoscanData.reportId, 'aiReportId:', trichoscanData.aiReportId);
        const reportIdParam = trichoscanData.reportId ? `&reportId=${encodeURIComponent(trichoscanData.reportId)}` : '';
        const aiReportIdParam = trichoscanData.aiReportId ? `&aiReportId=${encodeURIComponent(trichoscanData.aiReportId)}` : '';
        console.log('aiReportIdParam:', aiReportIdParam);

        let dataParam = '';
        // 如果有 reportId，尝试从 hair_reports_detail 获取详情 (If reportId exists, try fetching detail from hair_reports_detail)
        if (trichoscanData.reportId) {
            uni.showLoading({
                title: 'Loading...',
                mask: true
            });
            try {
                const detailResponse = await fetchReportDetail(trichoscanData.reportId);
                if (detailResponse && detailResponse.detail) {
                    const hasRawAiData = !!detailResponse.rawAiData;
                    console.log('detailResponse.rawAiData exists:', hasRawAiData);

                    const decompressed = await decompressBase64Gzip(detailResponse.detail);
                    console.log('Decompressed detail from hair_reports_detail:', decompressed);
                    console.log('decompressed.output:', decompressed?.output);

                    // 检查 output 字段
                    if (decompressed?.output) {
                        dataParam = '&data=' + encodeURIComponent(JSON.stringify(decompressed.output));
                        console.log('Using output from decompressed');
                    } else if (decompressed) {
                        // 使用老格式数据调用 parse 接口
                        const bodyMap: Record<string, string> = {};
                        const VALID_POSITIONS = ['0', '1', '2', '3', '4', '5', '6', '7'];
                        let hasData = false;
                        for (const pos of VALID_POSITIONS) {
                            if (decompressed[pos]) {
                                hasData = true;
                                bodyMap[pos] = typeof decompressed[pos] === 'string'
                                    ? decompressed[pos]
                                    : JSON.stringify(decompressed[pos]);
                            }
                        }
                        if (hasData) {
                            const parseResponse = await post('analyse/parse', {
                                body: bodyMap,
                                userId: record.userId,
                                merchantId: trichoscanData.merchantId || '',
                                detectionType: trichoscanData.detectionType || null,
                                packageName: trichoscanData.packageName || '',
                                language: uni.getLocale ? uni.getLocale() : 'zh-Hans'
                            }) as any;
                            if (parseResponse) {
                                dataParam = '&data=' + encodeURIComponent(JSON.stringify(parseResponse));
                                console.log('Parsed through backend successfully:', parseResponse);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch/report detail for navigation:', error);
            } finally {
                uni.hideLoading();
            }
        }

        uni.navigateTo({
            url: '/pages/trichoscan/advanced-result?id=' + record.id + '&pushType=1' + '&userId=' + record.userId + reportIdParam + aiReportIdParam + dataParam + '&from=hair&overallScore=' + record.hairScore.score
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
const scanStreak = ref<number>(0);

const calculateScanStreak = (records: HistoryRecord[]): number => {
    if (!records.length) return 0;

    const dayTimestamps = records
        .map((record) => {
            const raw =
                record.type === 'advancedScan'
                    ? (record.originalData as DetectionRecord).createTime
                    : (record.originalData as SelfieResult).createTime ||
                      (record.originalData as SelfieResult).createdTime ||
                      '';
            if (!raw) return null;
            const date = new Date(raw);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        })
        .filter((value): value is number => value !== null);

    const uniqueDays = [...new Set(dayTimestamps)].sort((a, b) => b - a);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDays.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        if (uniqueDays[i] === expected.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
};

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

// 扫描总数（来自老系统数据 + 自拍数据，不受分页影响）
const totalScansCount = ref(0);

const summaryCards = computed(() => [
    { label: t('hair.scansTaken'), value: totalScansCount.value > 0 ? String(totalScansCount.value) : '--', icon: 'qrcode' },
    { label: t('hair.latestScore'), value: latestScalpScore.value, icon: 'battery-2' },
    { label: t('hair.scanStreak'), value: String(scanStreak.value), icon: 'calendar' },
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
        monthData = buildSampledSeries(monthRecords, metric, CHART_POINT_LIMITS.Month, formatMonthLabel);
    } else {
        monthData = buildSampledSeries(chronologicalRecords, metric, CHART_POINT_LIMITS.Month, formatMonthLabel);
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
        yearData = buildSampledSeries(yearRecords, metric, CHART_POINT_LIMITS.Year, formatYearLabel);
    } else {
        yearData = buildSampledSeries(chronologicalRecords, metric, CHART_POINT_LIMITS.Year, formatYearLabel);
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

const formatYearLabel = (date: Date): string => String(date.getFullYear());

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
    value: number;
    label: string;
    index: number;
};

const selectedChartIndex = ref<number | null>(null);

const chartCircles = computed<ChartCircle[]>(() => {
    const base: ChartCircle[] = chartDrawingPoints.value.map((point: ChartDrawingPoint, index: number) => ({
        x: point.x,
        y: point.y,
        projection: false,
        key: `data-${point.label}-${index}`,
        value: point.value,
        label: point.label,
        index,
    }));

    const projection = projectionDrawingPoint.value;
    if (projection) {
        base.push({
            x: projection.x,
            y: projection.y,
            projection: true,
            key: 'projection-point',
            value: projection.value,
            label: 'projection',
            index: base.length,
        });
    }

    return base;
});

const yAxisLabels = computed(() => [100, 75, 50, 25, 0]);

const selectedChartPoint = computed(() => {
    if (selectedChartIndex.value === null) return null;
    return chartCircles.value.find((circle) => circle.index === selectedChartIndex.value && !circle.projection) || null;
});

const chartTrendComment = computed(() => {
    const points = chartSeries.value;
    if (points.length < 2) {
        return t('hair.scanEveryThreeDays');
    }
    const first = points[0].value;
    const last = points[points.length - 1].value;
    const delta = last - first;
    if (delta > 5) {
        return `Your ${activeRange.value.toLowerCase()} score improved by ${Math.round(delta)} points. Keep your current routine and scan every 3 days.`;
    }
    if (delta < -5) {
        return `Your ${activeRange.value.toLowerCase()} score dropped by ${Math.abs(Math.round(delta))} points. Review your routine and consider a fresh scan.`;
    }
    return `Your score has stayed relatively stable this ${activeRange.value.toLowerCase()}. Scan every 3 days to catch changes earlier.`;
});

const selectChartPoint = (index: number) => {
    selectedChartIndex.value = selectedChartIndex.value === index ? null : index;
};

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
const getRecordDateKey = (record: HistoryRecord): string => {
    if (record.type === 'productUsage') {
        return (record.originalData as ProductUsageData).dateKey;
    }
    const recordData = record.originalData as DetectionRecord | SelfieResult;
    const timeString = recordData.createTime || (recordData as SelfieResult).createdTime || '';
    if (!timeString) return '';
    return formatDateKey(new Date(timeString));
};

const getRecordsCountByDate = (date: Date): number => {
    const dateKey = formatDateKey(date);
    return historyRecords.value.filter((record: HistoryRecord) => getRecordDateKey(record) === dateKey).length;
};

// 获取有数据的日期列表
const getDatesWithData = (): Date[] => {
    const datesWithData = new Set<string>();
    historyRecords.value.forEach((record: HistoryRecord) => {
        const key = getRecordDateKey(record);
        if (key) datesWithData.add(key);
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
    
    return historyRecords.value.filter((record: HistoryRecord) => getRecordDateKey(record) === selectedDateFilter.value);
});

const displayedHistoryRecords = computed(() => {
    let records = filteredHistoryRecords.value;
    if (historyTab.value === 'selfie') {
        return records.filter((r: HistoryRecord) => r.type === 'phoneCamera');
    }
    if (historyTab.value === 'trichoscan') {
        return records.filter((r: HistoryRecord) => r.type === 'advancedScan');
    }
    if (historyTab.value === 'products') {
        return records.filter((r: HistoryRecord) => r.type === 'productUsage');
    }
    return records;
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

        // 显示确认对话框
        uni.showModal({
            title: t('analysis.deleteConfirmTitle') || 'Delete Record',
            content: t('analysis.deleteConfirmMessage') || 'Are you sure you want to delete this record?',
            confirmText: t('common.confirm') || 'Confirm',
            cancelText: t('profile.cancel') || 'Cancel',
            success: async (res) => {
                if (res.confirm) {
                    uni.showLoading({ title: t('common.loading') || 'Deleting...' });
                    isDeletingRecord.value = true; // 标记删除开始 Mark deletion start
                    try {
                        console.log('Delete record - record type:', record.type, 'record:', record);

                        let response = false;

                        // 毛囊镜和自拍记录使用新的删除接口（从 hair_reports 表）
                        if (record.type === 'advancedScan' || record.type === 'phoneCamera') {
                            const reportId = (record.originalData as DetectionRecord | SelfieResult).reportId;
                            if (reportId) {
                                // 使用新的删除接口 DELETE /api/report/[id]
                                response = await deleteReport(reportId);
                                console.log('Delete report response:', response);
                            } else {
                                console.warn('No reportId found for record:', record);
                            }
                        } else {
                            // 产品使用记录不需要删除
                            console.log('Product usage records cannot be deleted');
                            uni.hideLoading();
                            uni.showToast({ title: 'Cannot delete product records', icon: 'none' });
                            return;
                        }

                        uni.hideLoading();

                        if (response) {
                            // 从本地数据源中移除记录
                            const recordIndex = historyRecords.value.findIndex((r: HistoryRecord) => r.id === record.id);
                            if (recordIndex !== -1) {
                                historyRecords.value.splice(recordIndex, 1);
                            }

                            // 同时从原始数据中移除
                            if (record.type === 'advancedScan') {
                                const detIndex = originalDetectionRecords.value.findIndex((r: DetectionRecord) => r.recordId === (record.originalData as DetectionRecord).recordId);
                                if (detIndex !== -1) {
                                    originalDetectionRecords.value.splice(detIndex, 1);
                                }
                            } else if (record.type === 'phoneCamera') {
                                const selfieIndex = originalSelfieResults.value.findIndex((r: SelfieResult) => r.id === (record.originalData as SelfieResult).id);
                                if (selfieIndex !== -1) {
                                    originalSelfieResults.value.splice(selfieIndex, 1);
                                }
                            }

                            // 更新扫描总数
                            totalScansCount.value = originalDetectionRecords.value.length + originalSelfieResults.value.length;

                            // 更新最新分数
                            await fetchLatestScalpScore(originalDetectionRecords.value, originalSelfieResults.value);

                            uni.showToast({ title: t('analysis.deleteSuccess') || 'Deleted successfully', icon: 'success' });
                            isDeletingRecord.value = false; // 删除完成 Deletion complete
                        } else {
                            uni.showToast({ title: t('analysis.deleteFailed') || 'Delete failed', icon: 'none' });
                            isDeletingRecord.value = false; // 删除完成（失败）Deletion complete (failed)
                        }
                    } catch (error) {
                        uni.hideLoading();
                        console.error('Delete record error:', error);
                        uni.showToast({ title: t('analysis.deleteFailed') || 'Delete failed', icon: 'none' });
                        isDeletingRecord.value = false; // 删除完成（错误）Deletion complete (error)
                    }
                }
            }
        });
    } catch (error) {
        console.error('Delete record error:', error);
        uni.showToast({ title: t('analysis.deleteFailed') || 'Delete failed', icon: 'none' });
        isDeletingRecord.value = false; // 删除完成（异常）Deletion complete (exception)
    }
};

// 删除报告记录（从 hair_reports 表）
const deleteReport = async (reportId: string): Promise<boolean> => {
    try {
        const REPORT_DELETE_PATH = `/report/${reportId}`;
        const response = await request({
            url: REPORT_DELETE_PATH,
            method: 'DELETE',
            data: {},
            brand: ProjectBrand.LUSHAIR_NEW
        });
        console.log('Delete report response:', response);
        return true;
    } catch (error) {
        console.error('Delete report error:', error);
        return false;
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

watch(historyTab, (tab) => {
    if (tab === 'products') historyView.value = 'timeline';
});

const averageScore = computed(() => {
    const vals = chartSeries.value.map((p) => p.value);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
});

const avgDelta = computed(() => formatDelta(currentScore.value - averageScore.value));

// 判断是否是真正的第一条记录（已加载完所有数据）
const isRealFirstRecord = (record: HistoryRecord, records: HistoryRecord[]): boolean => {
    // 如果是自拍类型，检查是否还有更多自拍数据
    if (record.type === 'phoneCamera') {
        return !selfiePagination.value.hasMore;
    }
    // 如果是毛囊镜类型，检查是否还有更多毛囊镜数据
    if (record.type === 'advancedScan') {
        return !trichoPagination.value.hasMore;
    }
    return true;
};

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
    if (record.type === 'productUsage') {
        const { dateKey } = record.originalData as ProductUsageData;
        const [year, month, day] = dateKey.split('-').map(Number);
        if (year && month && day) {
            return new Date(year, month - 1, day, 23, 59).getTime();
        }
        return 0;
    }
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

interface TimelineGroup {
    dateKey: string;
    label: string;
    records: HistoryRecord[];
}

const groupedTimeline = computed((): TimelineGroup[] => {
    const groups: TimelineGroup[] = [];
    let currentKey = '';

    chipFilteredRecords.value.forEach((record) => {
        const key = getRecordDateKey(record) || 'unknown';
        if (key !== currentKey) {
            const [year, month, day] = key.split('-').map(Number);
            const label =
                year && month && day
                    ? formatCompactDate(new Date(year, month - 1, day).toISOString())
                    : key;
            groups.push({ dateKey: key, label, records: [record] });
            currentKey = key;
        } else {
            groups[groups.length - 1].records.push(record);
        }
    });

    return groups;
});

const getGlobalRecordIndex = (record: HistoryRecord): number =>
    chipFilteredRecords.value.findIndex((r) => r.id === record.id && r.type === record.type);

const galleryHistoryRecords = computed(() =>
    chipFilteredRecords.value.filter((record) => record.type !== 'productUsage'),
);

const histCountText = computed(() => {
    const count = chipFilteredRecords.value.length;
    if (historyTab.value === 'products') return t('hair.productDaysCount', [count]);
    if (historyTab.value === 'all') return t('hair.eventsCount', [count]);
    return t('hair.scansCount', [count]);
});

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
    if (record.type === 'productUsage') {
        return t('hair.productRoutine');
    }
    if (index === 0) return `${t('hair.latest')} · ${short}`;
    if (index === total - 1) return `${short} · ${t('hair.baseline')}`;
    return short;
};

const getTimelineBadgeIcon = (record: HistoryRecord): string => {
    if (record.type === 'productUsage') return 'flask';
    if (record.type === 'phoneCamera') return 'device-mobile';
    return 'scan';
};

const getProductUsageData = (record: HistoryRecord): ProductUsageData =>
    record.originalData as ProductUsageData;

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

// prefetchTrichoThumbnails - 暂时注释，使用 goHis 接口
// const prefetchTrichoThumbnails = async (records: HistoryRecord[]) => {
//     const userId = userStore.userInfo.userId;
//     if (!userId) return;
//     const pending = records.filter((r) => {
//         if (r.type !== 'advancedScan') return false;
//         const recordId = (r.originalData as DetectionRecord).recordId;
//         return !trichoThumbCache.value[recordId];
//     });
//     if (!pending.length) return;
//     await Promise.all(
//         pending.map(async (record) => {
//             const recordId = (record.originalData as DetectionRecord).recordId;
//             try {
//                 const res = (await post('analyse/goHis', { userId, recordId }, { timeout: 15000 })) as Record<string, unknown>;
//                 const url = extractFirstFollicleUrl(res);
//                 if (url) {
//                     trichoThumbCache.value = { ...trichoThumbCache.value, [recordId]: url };
//                 }
//             } catch (err) {
//                 console.warn('Failed to fetch tricho thumbnail:', recordId, err);
//             }
//         }),
//     );
// };

// 临时空函数，避免调用时报错
const prefetchTrichoThumbnails = async (records: HistoryRecord[]) => {
    console.log('prefetchTrichoThumbnails disabled (goHis commented out)');
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
        const img = (record.originalData as DetectionRecord).coverImage || getTrichoThumbUrl(record);
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
        // 删除记录时跳过 Skip when deleting record
        if (isDeletingRecord.value) return;
        fetchWhatChangedRows();
    },
);

// HISTORY LOG 中的预加载毛囊镜缩略图 - 暂时注释（使用 goHis 接口）
// watch(
//     () => [historyView.value, historyTab.value, chipFilteredRecords.value.map((r) => r.id).join(',')],
//     () => {
//         if (historyView.value === 'gallery' && historyTab.value === 'trichoscan') {
//             prefetchTrichoThumbnails(chipFilteredRecords.value);
//         }
//     },
//     { immediate: true },
// );

const goToScanTab = () => {
    uni.switchTab({ url: '/pages/scan/index' });
};

const setDateChip = (chip: 'all' | 'last90') => {
    dateChip.value = chip;
    if (chip === 'all') clearDateFilter();
};

// Get bounding rect using uni-app API
const getBaRect = (): Promise<{ left: number; top: number; width: number; height: number }> => {
    return new Promise((resolve) => {
        const query = uni.createSelectorQuery();
        query.select('.shell-ba').boundingClientRect((rect: any) => {
            if (rect) {
                resolve({ left: rect.left || 0, top: rect.top || 0, width: rect.width || 0, height: rect.height || 0 });
            } else {
                resolve({ left: 0, top: 0, width: 0, height: 0 });
            }
        }).exec();
    });
};

const onBaStart = (e: any) => {
    // Check if touch originated from preview button
    const touch = e.touches ? e.touches[0] : e;
    const target = e.target || e.srcElement;
    if (target && target.classList && target.classList.contains('shell-ba-preview-btn')) {
        return; // Don't start drag if touching preview button
    }

    baDragging.value = true;
    const clientX = touch.clientX || 0;
    const clientY = touch.clientY || 0;
    baStartX.value = clientX;
    baStartY.value = clientY;

    // Get rect and update split position
    getBaRect().then((rect) => {
        baRect.value = rect;
        if (rect.width > 0) {
            baSplit.value = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        }
    });
};

const onBaMove = (e: any) => {
    if (!baDragging.value) return;
    const touch = e.touches ? e.touches[0] : e;
    const clientX = touch.clientX || 0;

    if (baRect.value.width > 0) {
        baSplit.value = Math.max(0, Math.min(100, ((clientX - baRect.value.left) / baRect.value.width) * 100));
    }
};

const onBaEnd = () => {
    baDragging.value = false;
};

const baBeforeStyle = computed(() => ({
    clipPath: `inset(0 ${100 - baSplit.value}% 0 0)`,
}));

const baHandleStyle = computed(() => ({
    left: `${baSplit.value}%`,
}));

// 点击图片预览功能
const previewBeforeImage = () => {
    if (beforeAfterPair.value?.baselineImg) {
        previewImages.value = [beforeAfterPair.value.baselineImg];
        previewCurrentIndex.value = 0;
        showImagePreview.value = true;
    }
};

const previewAfterImage = () => {
    if (beforeAfterPair.value?.latestImg) {
        previewImages.value = [beforeAfterPair.value.latestImg];
        previewCurrentIndex.value = 0;
        showImagePreview.value = true;
    }
};

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

// 加载更多自拍记录
const loadMoreSelfieResults = async () => {
    if (selfiePagination.value.isLoadingMore || !selfiePagination.value.hasMore) {
        return;
    }

    selfiePagination.value.isLoadingMore = true;

    try {
        // 获取当前userId
        let userId = userStore.userInfo.userId;
        if (!userId) {
            const localUserInfo = uni.getStorageSync('userInfo');
            const storedUserId = uni.getStorageSync('userId');
            userId = localUserInfo?.userId || storedUserId;
        }

        if (!userId) {
            console.warn('No userId available for loading more selfie results');
            return;
        }

        const nextPage = selfiePagination.value.page + 1;
        const moreResults = await fetchSelfieResults(userId, nextPage, selfiePagination.value.pageSize);

        // 合并数据
        if (moreResults.length > 0) {
            // 将新数据转换为 HistoryRecord 格式并添加到 existing records
            const newHistoryRecords: HistoryRecord[] = [];
            moreResults.forEach((result, index) => {
                const score = calculateSelfieScore(result.stage, result.extInfo);
                const level = result.stage;

                // 获取当前所有自拍记录中的上一条（用于计算 improvement）
                const currentSelfieResults = historyRecords.value
                    .filter((r: HistoryRecord) => r.type === 'phoneCamera')
                    .map((r: HistoryRecord) => r.originalData as SelfieResult);

                const prevResult = currentSelfieResults[currentSelfieResults.length - 1];
                const prevScore = prevResult ? calculateSelfieScore(prevResult.stage, prevResult.extInfo) : null;
                const prevLevel = prevResult ? prevResult.stage : null;

                const scoreImprovement = prevScore !== null ? score - prevScore : 0;
                const levelImprovement = prevLevel !== null ? level - prevLevel : 0;

                const dateString = result.createTime || result.createdTime || result.generatedAt || new Date().toISOString();

                newHistoryRecords.push({
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

            // 合并到现有记录并重新排序
            const allRecords = [...historyRecords.value, ...newHistoryRecords];
            allRecords.sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
            historyRecords.value = allRecords;
        }
    } catch (error) {
        console.error('Load more selfie results error:', error);
    } finally {
        selfiePagination.value.isLoadingMore = false;
    }
};

// 加载更多毛囊镜记录
const loadMoreTrichoResults = async () => {
    if (trichoPagination.value.isLoadingMore || !trichoPagination.value.hasMore) {
        return;
    }

    trichoPagination.value.isLoadingMore = true;

    try {
        // 获取当前userId
        let userId = userStore.userInfo.userId;
        if (!userId) {
            const localUserInfo = uni.getStorageSync('userInfo');
            const storedUserId = uni.getStorageSync('userId');
            userId = localUserInfo?.userId || storedUserId;
        }

        if (!userId) {
            console.warn('No userId available for loading more tricho results');
            return;
        }

        const nextPage = trichoPagination.value.page + 1;
        const moreResults = await fetchTrichoReportsForHistory(userId, nextPage, trichoPagination.value.pageSize);

        // 合并数据
        if (moreResults.length > 0) {
            // 将新数据转换为 HistoryRecord 格式并添加到 existing records
            const newHistoryRecords: HistoryRecord[] = [];
            moreResults.forEach((record, index) => {
                const scalpScore = parseFloat(record.scalpScore);
                const level = calculateLevel(scalpScore);

                // 获取当前所有毛囊镜记录中的上一条（用于计算 improvement）
                const currentTrichoResults = historyRecords.value
                    .filter((r: HistoryRecord) => r.type === 'advancedScan')
                    .map((r: HistoryRecord) => r.originalData as DetectionRecord);

                const prevRecord = currentTrichoResults[currentTrichoResults.length - 1];
                const prevScalpScore = prevRecord ? parseFloat(prevRecord.scalpScore) : null;
                const prevLevel = prevRecord ? calculateLevel(prevScalpScore!) : null;

                const scoreImprovement = prevScalpScore !== null ? scalpScore - prevScalpScore : 0;
                const levelImprovement = prevLevel !== null ? level - prevLevel : 0;

                // 根据 deviceModel 设置 typeLabel
                const deviceLabel = record.deviceModel === 'lushairPro' ? 'Lushair Pro' : 'Lushair One';

                newHistoryRecords.push({
                    id: record.recordId || Date.now() + Math.random(),  // 使用 recordId 或生成唯一 ID
                    userId: record.userId,
                    date: formatDate(record.createTime),
                    type: 'advancedScan',
                    typeLabel: deviceLabel,
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

            // 合并到现有记录并重新排序
            const allRecords = [...historyRecords.value, ...newHistoryRecords];
            allRecords.sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
            historyRecords.value = allRecords;
        }
    } catch (error) {
        console.error('Load more tricho results error:', error);
    } finally {
        trichoPagination.value.isLoadingMore = false;
    }
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

const shareProgressLabel = computed(() => {
    const records = chartDetectionRecords.value;
    if (!records.length) return '3-Month';

    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setDate(now.getDate() - 90);

    const oldestRecord = records.reduce((oldest, r) => {
        const rTime = new Date(r.createTime).getTime();
        const oldestTime = new Date(oldest.createTime).getTime();
        return rTime < oldestTime ? r : oldest;
    });

    const oldestTime = new Date(oldestRecord.createTime).getTime();
    const threeMonthsTime = threeMonthsAgo.getTime();

    if (oldestTime >= threeMonthsTime) {
        return '3-Month';
    }

    const monthsDiff = Math.round((now.getTime() - oldestTime) / (30 * 24 * 60 * 60 * 1000));
    return `${monthsDiff}-Month`;
});

const buildQuarterSeries = (metric: ScoreMetricKey) => {
    const records = chartDetectionRecords.value;
    if (!records.length) return [] as { label: string; value: number }[];

    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setDate(now.getDate() - 90);

    let filtered = [...records]
        .filter((record) => new Date(record.createTime) >= threeMonthsAgo)
        .sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());

    // 如果三个月内没有数据，使用所有记录（从最老到最新）
    if (!filtered.length) {
        filtered = [...records].sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
    }

    if (!filtered.length) return [] as { label: string; value: number }[];
    if (filtered.length <= 5) {
        return filtered.map((record) => ({
            label: formatMonthLabel(new Date(record.createTime)),
            value: getScoreFromRecord(record, metric),
        }));
    }
    return buildSampledSeries(filtered, metric, 5, formatMonthLabel);
};

const pctChange = (before: number, after: number) => {
    if (!before && !after) return 0;
    if (!before) return after > 0 ? 100 : 0;
    return Math.round(((after - before) / before) * 100);
};

const shareQuarterMetrics = computed(() => {
    const follicleSeries = buildQuarterSeries('follicle');
    const scalpSeries = buildQuarterSeries('scalp');
    const hairSeries = buildQuarterSeries('hair');

    const follicleFirst = follicleSeries[0]?.value ?? 0;
    const follicleLast = follicleSeries[follicleSeries.length - 1]?.value ?? follicleFirst;
    const scalpFirst = scalpSeries[0]?.value ?? 0;
    const scalpLast = scalpSeries[scalpSeries.length - 1]?.value ?? scalpFirst;
    const hairFirst = hairSeries[0]?.value ?? 0;
    const hairLast = hairSeries[hairSeries.length - 1]?.value ?? hairFirst;

    return {
        follicleDelta: pctChange(follicleFirst, follicleLast),
        healthDelta: pctChange(scalpFirst, scalpLast),
        comfortDelta: pctChange(hairFirst, hairLast),
        healthScore: scalpLast || latestScalpScore.value !== '--' ? Number(latestScalpScore.value) || scalpLast : 0,
    };
});

const shareQuarterSummary = computed(() => {
    const { follicleDelta, healthDelta, comfortDelta } = shareQuarterMetrics.value;
    const parts: string[] = [];
    if (follicleDelta > 0) parts.push(`follicle density up ${follicleDelta}%`);
    if (healthDelta > 0) parts.push(`health score up ${healthDelta}%`);
    if (comfortDelta > 0) parts.push(`hair comfort up ${comfortDelta}%`);
    if (!parts.length) {
        return t('hair.shareQuarterStable');
    }
    return t('hair.shareQuarterSummary', [parts.join(', ')]);
});

const shareRoutineLabel = computed(() => {
    const using = itemsFromPlan.value;
    return using || t('hair.shareQuarterRoutineFallback');
});

const itemsFromPlan = computed(() => {
    try {
        const stored = uni.getStorageSync('care_routine_plan');
        if (!stored) return '';
        const parsed = JSON.parse(stored) as Array<{ name: string; done?: boolean }>;
        const names = parsed.slice(0, 2).map((item) => item.name).filter(Boolean);
        return names.length ? names.join(' + ') : '';
    } catch {
        return '';
    }
});

const shareProgress = async () => {
    try {
        uni.showLoading({ title: t('common.loading') });
        const dataUrl = await captureShareCard('.hair-share-card');
        await shareCapturedImage(dataUrl, t('hair.shareProgressTitle'), t('hair.shareProgressSubtitle'));
    } catch (error) {
        console.error('Share progress failed', error);
        uni.showToast({ title: 'Share failed', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};
</script>

<template>
    <!-- 商家版未选客户：全屏客户选择器 -->
    <view v-if="isMerchant && !selectedCustomer" class="customer-selector-fullscreen">
        <view class="cs-header">
            <view class="cs-header-nav">
                <view v-if="customerList.length === 0" class="cs-back-button" @tap="handleBack">
                    <TablerIcon name="chevron-left" :size="22" color="#1a1228" />
                </view>
                <view v-else style="width: 44px;"></view>
                <text class="cs-header-title">{{ t('merchant.customerList') }}</text>
                <view style="width: 44px;"></view>
            </view>
            <view class="cs-search-bar">
                <TablerIcon name="search" :size="18" color="#8a82a0" />
                <input
                    v-model="customerSearchKeyword"
                    class="cs-search-input"
                    type="text"
                    :placeholder="t('merchant.searchPlaceholder')"
                    @confirm="fetchCustomerList"
                />
            </view>
        </view>
        <scroll-view
            class="cs-customer-list"
            scroll-y
            @scrolltolower="fetchCustomerList(true)"
        >
            <view v-if="isLoadingCustomers && customerList.length === 0" class="cs-loading">
                <text class="cs-loading-text">{{ t('common.loading') }}</text>
            </view>
            <view v-else-if="customerList.length === 0" class="cs-empty">
                <TablerIcon name="users" :size="48" color="#d8d2ea" />
                <text class="cs-empty-text">{{ t('merchant.noCustomers') }}</text>
                <text class="cs-empty-hint">{{ t('merchant.addCustomerFirst') }}</text>
            </view>
            <view v-else class="cs-list">
                <view
                    v-for="customer in customerList"
                    :key="customer.customerId"
                    class="cs-customer-item"
                    @tap="selectCustomer(customer)"
                >
                    <view class="cs-customer-avatar">
                        <text class="cs-avatar-text">{{ (customer.name || '?')[0].toUpperCase() }}</text>
                    </view>
                    <view class="cs-customer-info">
                        <text class="cs-customer-name">{{ customer.name }}</text>
                        <text v-if="customer.phone" class="cs-customer-phone">{{ customer.phone }}</text>
                        <text v-else-if="customer.email" class="cs-customer-phone">{{ customer.email }}</text>
                    </view>
                    <TablerIcon name="chevron-right" :size="20" color="#8A82A0" />
                </view>
                <view v-if="customerPagination.isLoadingMore" class="cs-load-more">
                    <text class="cs-load-more-text">{{ t('common.loadingMore') }}</text>
                </view>
                <view v-else-if="!customerPagination.hasMore && customerList.length > 0" class="cs-load-more">
                    <text class="cs-load-more-text">{{ t('common.noMore') }}</text>
                </view>
            </view>
        </scroll-view>
    </view>

    <!-- 已选客户 / 用户版：正常内容 -->
    <MainTabLayout v-else fixed-header>
        <view class="tab-page-scroll">
        <view class="your-hair-container">
            <view class="hair-page-head">
                <text class="shell-ptitle">{{ t('tabbar.hair') }}</text>
                <!-- 商家版显示切换客户按钮 -->
                <view v-if="isMerchant" class="hair-switch-customer-btn" @tap="switchCustomer">
                    <text class="switch-customer-text">{{ selectedCustomer?.name || t('merchant.customer') }}</text>
                    <TablerIcon name="chevron-down" :size="16" color="#6B21C8" />
                </view>
                <view v-else class="hair-share-btn" @tap="shareProgress">
                    <image src="/static/icons/share.svg" class="hair-share-icon" mode="aspectFit" />
                </view>
            </view>
            <text class="hair-scan-reminder">{{ t('hair.scanEveryThreeDays') }}</text>
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
                        <view v-if="selectedChartPoint" class="chart-point-callout">
                            <text>{{ selectedChartPoint.label }} · {{ t('hair.chartPointScore', [selectedChartPoint.value]) }}</text>
                        </view>
                        <view class="shell-chart-box hair-chart-with-axis">
                            <view class="chart-y-axis">
                                <text v-for="tick in yAxisLabels" :key="tick" class="chart-y-axis-label">{{ tick }}</text>
                            </view>
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
                                                :r="selectedChartIndex === circle.index ? chartConfig.pointRadius + 2 : chartConfig.pointRadius"
                                                :fill="circle.projection ? '#9ca3af' : '#6B21C8'"
                                                stroke="#ffffff"
                                                stroke-width="4"
                                                @click="!circle.projection && selectChartPoint(circle.index)"
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
                        <text class="chart-trend-comment">{{ chartTrendComment }}</text>
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
                                @touchstart.stop="onBaStart"
                                @touchmove.stop="onBaMove"
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
                                <!-- Preview buttons -->
                                <view
                                    class="shell-ba-preview-btn shell-ba-preview-btn--before"
                                    @touchstart.stop.prevent="previewBeforeImage"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1228" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                        <path d="M11 8v6"></path>
                                        <path d="M8 11h6"></path>
                                    </svg>
                                </view>
                                <view
                                    class="shell-ba-preview-btn shell-ba-preview-btn--after"
                                    @touchstart.stop.prevent="previewAfterImage"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1228" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                        <path d="M11 8v6"></path>
                                        <path d="M8 11h6"></path>
                                    </svg>
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
                <view class="shell-subtog hist-type-tog">
                    <view class="shell-subtog-btn" :class="{ on: historyTab === 'all' }" @tap="historyTab = 'all'">{{ t('hair.allTab') }}</view>
                    <view class="shell-subtog-btn" :class="{ on: historyTab === 'selfie' }" @tap="historyTab = 'selfie'">{{ t('hair.selfieTab') }}</view>
                    <view class="shell-subtog-btn" :class="{ on: historyTab === 'trichoscan' }" @tap="historyTab = 'trichoscan'">{{ t('hair.trichoscanTab') }}</view>
                    <view class="shell-subtog-btn" :class="{ on: historyTab === 'products' }" @tap="historyTab = 'products'">{{ t('hair.productsTab') }}</view>
                </view>

                <view class="shell-hist-bar">
                    <view class="hist-meta">
                        <text class="shell-hist-count">{{ histCountText }}</text>
                        <text v-if="histRangeText" class="shell-hist-range">{{ histRangeText }}</text>
                    </view>
                    <view class="shell-vswitch">
                        <view
                            v-if="historyTab !== 'products'"
                            class="shell-vswitch-btn"
                            :class="{ on: historyView === 'timeline' }"
                            @tap="historyView = 'timeline'"
                        >
                            <TablerIcon name="timeline-event" :size="17" :color="historyView === 'timeline' ? '#fff' : '#8A82A0'" />
                        </view>
                        <view
                            v-if="historyTab !== 'products'"
                            class="shell-vswitch-btn"
                            :class="{ on: historyView === 'gallery' }"
                            @tap="historyView = 'gallery'"
                        >
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

                <view v-else-if="historyView === 'timeline' || historyTab === 'products'" class="shell-tl">
                    <template v-for="group in groupedTimeline" :key="group.dateKey">
                        <text class="shell-tl-day">{{ group.label }}</text>
                        <view
                            v-for="record in group.records"
                            :key="`${record.type}-${record.id}`"
                            class="shell-tl-item"
                            @tap="viewRecordDetail(record)"
                        >
                            <view
                                class="shell-tl-dot"
                                :class="{
                                    now: getGlobalRecordIndex(record) === 0,
                                    product: record.type === 'productUsage',
                                    routine: record.typeLabel === t('hair.productRoutine'),
                                }"
                            />
                            <view class="shell-tl-card" :class="{ 'shell-tl-card--product': record.type === 'productUsage' }">
                                <TablerIcon
                                    v-if="record.type !== 'productUsage'"
                                    name="chevron-right"
                                    :size="18"
                                    color="#8A82A0"
                                    class="shell-tl-go"
                                />
                                <view v-if="record.type === 'advancedScan'" class="delete-fab" @tap.stop="deleteRecord(record)">
                                    <TablerIcon name="x" :size="14" color="#E0556B" />
                                </view>
                                <view class="shell-tl-top">
                                    <text class="shell-tl-when">{{
                                        getTimelineWhen(
                                            record,
                                            getGlobalRecordIndex(record),
                                            chipFilteredRecords.length,
                                        )
                                    }}</text>
                                    <view class="shell-src-badge" :class="{ 'shell-src-badge--product': record.type === 'productUsage', 'shell-src-badge--routine': record.typeLabel === t('hair.productRoutine') }">
                                        <TablerIcon :name="getTimelineBadgeIcon(record)" :size="11" color="#fff" />
                                        <text>{{ record.typeLabel }}</text>
                                    </view>
                                </view>

                                <template v-if="record.type === 'productUsage'">
                                    <view class="shell-tl-product-head">
                                        <text class="shell-tl-product-count">{{
                                            t('hair.productsUsedCount', [getProductUsageData(record).productNames.length])
                                        }}</text>
                                    </view>
                                    <view class="shell-tl-product-list">
                                        <text
                                            v-for="(name, pi) in getProductUsageData(record).productNames"
                                            :key="`${record.id}-${pi}`"
                                            class="shell-tl-product-chip"
                                            :class="{ 'shell-tl-product-chip--routine': record.typeLabel === t('hair.productRoutine') }"
                                        >{{ name }}</text>
                                    </view>
                                </template>

                                <!-- Selfie: stage only, no /100 score -->
                                <template v-else-if="record.type === 'phoneCamera'">
                                    <view class="shell-tl-hero-row">
                                        <view class="shell-tl-hero-stage">
                                            <text class="shell-tl-lvl-hero">{{ t('hair.level') }} {{ record.hairLossPattern.level }}</text>
                                            <text class="shell-tl-lvl-of">/ {{ record.hairLossPattern.total }}</text>
                                        </view>
                                        <text
                                            v-if="getGlobalRecordIndex(record) === chipFilteredRecords.length - 1 && isRealFirstRecord(record, chipFilteredRecords)"
                                            class="shell-pill shell-pill-p"
                                        >{{ t('hair.firstScan') }}</text>
                                        <text
                                            v-else-if="getRecordStageChange(record, getGlobalRecordIndex(record), chipFilteredRecords)"
                                            :class="getRecordStageChange(record, getGlobalRecordIndex(record), chipFilteredRecords)!.pillClass"
                                        >
                                            {{ getRecordStageChange(record, getGlobalRecordIndex(record), chipFilteredRecords)!.status }}
                                            · {{ getRecordStageChange(record, getGlobalRecordIndex(record), chipFilteredRecords)!.detail }}
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
                                <template v-else-if="record.type === 'advancedScan'">
                                    <view class="shell-tl-score shell-tl-score--tricho">
                                        <text class="shell-tl-num">{{ getTrichoscanScores(record).overall }}</text>
                                        <text class="shell-tl-of">/100</text>
                                        <text
                                            v-if="getGlobalRecordIndex(record) === chipFilteredRecords.length - 1 && isRealFirstRecord(record, chipFilteredRecords)"
                                            class="shell-pill shell-pill-p"
                                        >{{ t('hair.firstScan') }}</text>
                                        <text
                                            v-else-if="getTrichoscanOverallDelta(record, getGlobalRecordIndex(record), chipFilteredRecords) !== 0"
                                            :class="getScoreDeltaClass(getTrichoscanOverallDelta(record, getGlobalRecordIndex(record), chipFilteredRecords))"
                                        >
                                            {{ formatMetricDelta(getTrichoscanOverallDelta(record, getGlobalRecordIndex(record), chipFilteredRecords)) }}
                                        </text>
                                    </view>
                                    <text class="shell-tl-subtitle">{{ t('hair.overallScore') }}</text>
                                    <view class="shell-tl-metrics">
                                        <view
                                            v-for="metric in getTrichoscanMetricRows(record, getGlobalRecordIndex(record), chipFilteredRecords)"
                                            :key="metric.key"
                                            class="shell-tl-metric-chip"
                                        >
                                            <text class="shell-tl-metric-label">{{ metric.label }}</text>
                                            <view class="shell-tl-metric-valrow">
                                                <text class="shell-tl-metric-value">{{ metric.value }}</text>
                                                <text
                                                    v-if="getGlobalRecordIndex(record) < chipFilteredRecords.length - 1"
                                                    :class="getMetricDeltaClass(metric.delta)"
                                                >{{ formatMetricDelta(metric.delta) }}</text>
                                            </view>
                                        </view>
                                    </view>
                                </template>
                            </view>
                        </view>
                    </template>
                </view>

                <view v-else class="shell-gal">
                    <view
                        v-for="(record, index) in galleryHistoryRecords"
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
                        <text class="shell-gal-score">{{ getGalleryPrimaryText(record, index, galleryHistoryRecords.length) }}</text>
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

        <view class="hair-share-card">
            <text class="hair-share-kicker">SCALP HEALTH REPORT</text>
            <text class="hair-share-title">{{ t('hair.shareProgressTitle', [shareProgressLabel]) }}</text>
            <text class="hair-share-sub">{{ shareQuarterSummary }}</text>
            <view class="hair-share-metric">
                <text class="hair-share-metric-label">{{ t('hair.shareMetricFollicle') }}</text>
                <text class="hair-share-metric-value">{{ shareQuarterMetrics.follicleDelta >= 0 ? '+' : '' }}{{ shareQuarterMetrics.follicleDelta }}%</text>
            </view>
            <view class="hair-share-metric">
                <text class="hair-share-metric-label">{{ t('hair.shareMetricHealth') }}</text>
                <text class="hair-share-metric-value">{{ shareQuarterMetrics.healthDelta >= 0 ? '+' : '' }}{{ shareQuarterMetrics.healthDelta }}%</text>
            </view>
            <view class="hair-share-metric">
                <text class="hair-share-metric-label">{{ t('hair.shareMetricComfort') }}</text>
                <text class="hair-share-metric-value">{{ shareQuarterMetrics.comfortDelta >= 0 ? '+' : '' }}{{ shareQuarterMetrics.comfortDelta }}%</text>
            </view>
            <view v-if="shareRoutineLabel" class="hair-share-using">
                <text class="hair-share-using-label">{{ t('hair.shareUsing') }}</text>
                <text class="hair-share-using-value">{{ shareRoutineLabel }}</text>
            </view>
            <view class="hair-share-footer">
                <view>
                    <text class="hair-share-footer-cta">Download Lushair</text>
                    <text class="hair-share-footer-sub">Start your AI hair care journey</text>
                </view>
                <image class="hair-share-qr" src="/static/images/qrcode-download.png" mode="aspectFit" />
            </view>
            <text class="hair-share-url">Lushair.ai</text>
        </view>
        </view>
    </MainTabLayout>

    <!-- 图片预览组件 -->
    <ImagePreview
        v-model:show="showImagePreview"
        :urls="previewImages"
        :current="previewCurrentIndex"
    />
</template>

<style lang="scss" scoped>
@import '@/styles/app-shell.scss';
@import '@/styles/hair-page.scss';

/* 客户选择器全屏样式 */
.customer-selector-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #faf8ff;
    display: flex;
    flex-direction: column;
    z-index: 9999;
}

.cs-header {
    background-color: #ffffff;
    padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
    border-bottom: 1px solid #e8e4f4;
    padding-top: max(12px, env(safe-area-inset-top));
}

.cs-header-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    margin-bottom: 12px;
}

.cs-back-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    cursor: pointer;
}

.cs-header-title {
    font-size: 17px;
    font-weight: 600;
    color: #1a1228;
}

.cs-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #f7f7f7;
    border-radius: 12px;
    padding: 10px 12px;
}

.cs-search-input {
    flex: 1;
    font-size: 14px;
    color: #1a1228;
}

.cs-search-input::placeholder {
    color: #8a82a0;
}

.cs-customer-list {
    flex: 1;
}

.cs-loading,
.cs-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
}

.cs-loading-text {
    font-size: 14px;
    color: #8a82a0;
}

.cs-empty-text {
    font-size: 16px;
    color: #1a1228;
    margin-top: 16px;
}

.cs-empty-hint {
    font-size: 13px;
    color: #8a82a0;
    margin-top: 4px;
    text-align: center;
}

.cs-list {
    padding: 8px 16px;
}

.cs-customer-item {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 10px;
    gap: 14px;
    cursor: pointer;
}

.cs-customer-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6b21c8, #9333ea);
    display: flex;
    align-items: center;
    justify-content: center;
}

.cs-avatar-text {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
}

.cs-customer-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.cs-customer-name {
    font-size: 15px;
    font-weight: 500;
    color: #1a1228;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cs-customer-phone {
    font-size: 13px;
    color: #8a82a0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cs-load-more {
    padding: 20px;
    text-align: center;
}

.cs-load-more-text {
    font-size: 13px;
    color: #8a82a0;
}

/* 商家版切换客户按钮 */
.hair-switch-customer-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background-color: #f3f0ff;
    border-radius: 20px;
}

.switch-customer-text {
    font-size: 14px;
    font-weight: 500;
    color: #6b21c8;
}
</style>
