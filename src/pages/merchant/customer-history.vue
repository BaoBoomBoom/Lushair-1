<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad, onReachBottom } from '@dcloudio/uni-app';
import { get, post, ProjectBrand } from '@/utils/request';
import { decompressBase64Gzip } from '@/utils/decompress';
import { useMerchantScanCustomer } from '@/composables/useMerchantScanCustomer';
import { runLushairOneScan, runLushairProScan } from '@/composables/useScanActions';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { useUserStore } from '@/stores/userStore';

const { t, locale } = useI18n();
const { persistCustomer } = useMerchantScanCustomer();
const userStore = useUserStore();

interface Report {
  id: string;
  reportType: string;
  position?: string;
  stage?: number;
  overallScore?: number;
  generatedAt: string;
  coverImage?: string;
  device_model?: string;
  aiReportId?: string | null;
}

interface PaginationResponse {
  reports: Report[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const customerId = ref('');
const customerName = ref('');
const reports = ref<Report[]>([]);
const isLoading = ref(false);
const isRefreshing = ref(false); // 下拉刷新状态

// 检测设备类型：从URL参数获取（统一从scan/index.vue传递）
const scanDeviceType = ref<'lushairOne' | 'lushairPro'>('lushairOne');

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 20,
  hasMore: true,
  isLoadingMore: false,
});

async function fetchReports(isLoadMore = false) {
  if (isLoadMore && (pagination.value.isLoadingMore || !pagination.value.hasMore)) return;

  if (isLoadMore) {
    pagination.value.isLoadingMore = true;
  } else {
    isLoading.value = true;
  }

  try {
    const page = isLoadMore ? pagination.value.page + 1 : 1;
    const response = await get<PaginationResponse>(`report/by-customer/${customerId.value}`, {
      page,
      pageSize: pagination.value.pageSize,
    }, { brand: ProjectBrand.LUSHAIR_NEW });

    if (response && response.reports) {
      if (isLoadMore) {
        reports.value = [...reports.value, ...response.reports];
        pagination.value.page = page;
      } else {
        reports.value = response.reports;
        pagination.value.page = 1;
      }

      pagination.value.hasMore = response.hasMore;
    }
  } catch (error) {
    console.error('Fetch reports error:', error);
    uni.showToast({ title: t('merchant.failedToLoadReports'), icon: 'none' });
  } finally {
    isLoading.value = false;
    pagination.value.isLoadingMore = false;
  }
}

function getDeviceLabel(reportType: string, deviceModel?: string): string {
  if (deviceModel === 'lushairPro') return 'Lushair Pro';
  if (reportType === 'selfie') return 'Phone Camera';
  return 'Lushair One';
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch {
    return dateString;
  }
}

// Fetch report detail from hair_reports_detail table
async function fetchReportDetail(reportId: string): Promise<any> {
  try {
    const REPORT_DETAIL_PATH = `/report/detail/${reportId}`;
    const response = await get(REPORT_DETAIL_PATH, {}, { brand: ProjectBrand.LUSHAIR_NEW });
    return response;
  } catch (error) {
    console.error('Failed to fetch report detail:', error);
    return null;
  }
}

async function viewReportDetail(report: Report) {
  // 根据报告类型跳转到相应的详情页面
  if (report.reportType === 'selfie') {
    // 自拍照结果页 - 参考 hair/index.vue
    const reportIdParam = `&reportId=${encodeURIComponent(report.id)}`;
    const aiReportIdParam = report.aiReportId ? `&aiReportId=${encodeURIComponent(report.aiReportId)}` : '';
    const overallScoreParam = report.overallScore ? `&overallScore=${Math.round(report.overallScore)}` : '';

    uni.navigateTo({
      url: `/pages/Selfie/results?reportId=${encodeURIComponent(report.id)}&customerId=${customerId.value}&from=customer${aiReportIdParam}${overallScoreParam}`,
    });
  } else {
    // 毛囊镜结果页 - 参考 hair/index.vue
    const reportIdParam = `&reportId=${encodeURIComponent(report.id)}`;
    const aiReportIdParam = report.aiReportId ? `&aiReportId=${encodeURIComponent(report.aiReportId)}` : '';
    const overallScoreParam = report.overallScore ? `&overallScore=${Math.round(report.overallScore)}` : '';
    const deviceModelParam = report.device_model ? `&deviceModel=${encodeURIComponent(report.device_model)}` : '';

    let dataParam = '';
    // 如果有 reportId，尝试从 hair_reports_detail 获取详情
    if (report.id) {
      uni.showLoading({
        title: 'Loading...',
        mask: true
      });
      try {
        const detailResponse = await fetchReportDetail(report.id);
        if (detailResponse && detailResponse.detail) {
          const decompressed = await decompressBase64Gzip(detailResponse.detail);

          // 检查 output 字段
          if (decompressed?.output) {
            dataParam = '&data=' + encodeURIComponent(JSON.stringify(decompressed.output));
          }
        }
      } catch (error) {
        console.error('Failed to fetch/report detail for navigation:', error);
      } finally {
        uni.hideLoading();
      }
    }

    uni.navigateTo({
      url: `/pages/trichoscan/advanced-result?id=${report.id}&customerId=${customerId.value}&from=customer${reportIdParam}${aiReportIdParam}${dataParam}${overallScoreParam}${deviceModelParam}`,
    });
  }
}

async function onNext() {
  // 根据设备类型唤起对应的检测
  if (scanDeviceType.value === 'lushairOne') {
    await runLushairOneScan();
  } else {
    await runLushairProScan();
  }
}

// 下拉刷新
async function handleRefresh() {
  isRefreshing.value = true;
  try {
    // 重置分页状态
    pagination.value = {
      page: 1,
      pageSize: 20,
      hasMore: true,
      isLoadingMore: false,
    };
    await fetchReports(false);
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    isRefreshing.value = false;
  }
}

// 刷新完成回调
function handleRefreshRestore() {
  isRefreshing.value = false;
}

// 上拉加载更多
function handleReachBottom() {
  if (pagination.value.hasMore && !pagination.value.isLoadingMore) {
    fetchReports(true);
  }
}

// 注册生命周期钩子
onReachBottom(handleReachBottom);

function goBack() {
  if (typeof uni !== 'undefined') {
    uni.navigateBack();
  } else {
    history.back();
  }
}

onLoad((options: any) => {
  customerId.value = options.customerId || '';
  customerName.value = options.name || '';
  // 获取 scanDevice 参数
  if (options.scanDevice && (options.scanDevice === 'lushairOne' || options.scanDevice === 'lushairPro')) {
    scanDeviceType.value = options.scanDevice;
  }

  // 保存商家客户信息到 storage（用于传递给原生）
  if (customerId.value && options.userId && userStore.userInfo.userId) {
    persistCustomer({
      customerId: customerId.value,
      merchantId: userStore.userInfo.userId,
      userId: options.userId, // 客户的 userId
      name: customerName.value,
      gender: options.gender,
      birthDate: options.birthDate,
    });
  } else if (customerId.value && userStore.userInfo.userId) {
    console.warn('[customer-history] 缺少客户 userId，无法保存商家客户信息');
  }

  if (customerId.value) {
    fetchReports();
  }
});

onMounted(() => {
  if (!customerId.value) {
    uni.showToast({ title: t('merchant.customerIdRequired'), icon: 'none' });
  }
});
</script>

<template>
  <page-meta page-style="height: 100%; overflow: hidden;" />
  <view class="history-page">
    <view class="header">
      <view class="header-nav">
        <view class="back-button" @click="goBack">
          <TablerIcon name="chevron-left" :size="22" color="#1a1228" />
        </view>
        <text class="header-title">{{ customerName || t('merchant.customer') }}</text>
        <view style="width: 22px;"></view>
      </view>
      <text class="header-subtitle">{{ t('merchant.detectionHistory') }}</text>
    </view>

    <scroll-view
      scroll-y
      class="report-scroll"
      @scrolltolower="handleReachBottom"
      refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="handleRefresh"
      @refresherrestore="handleRefreshRestore"
      refresher-threshold="80"
    >
      <view v-if="isLoading && reports.length === 0" class="loading-state">
        <text class="loading-text">{{ t('common.loading') }}</text>
      </view>

      <view v-else-if="reports.length === 0" class="empty-state">
        <TablerIcon name="file-report" :size="48" color="#d8d2ea" />
        <text class="empty-text">{{ t('merchant.noReports') }}</text>
        <text class="empty-hint">{{ t('merchant.firstScanHint') }}</text>
      </view>

      <view v-else class="report-list">
        <view
          v-for="report in reports"
          :key="report.id"
          class="report-item"
          @click="viewReportDetail(report)"
        >
          <view class="report-cover">
            <image
              v-if="report.coverImage"
              :src="report.coverImage"
              class="cover-image"
              mode="aspectFill"
            />
            <view v-else class="cover-placeholder">
              <TablerIcon name="camera" :size="24" color="#d8d2ea" />
            </view>
            <view class="report-type-badge">
              <text class="type-text">{{ getDeviceLabel(report.reportType, report.device_model) }}</text>
            </view>
          </view>
          <view class="report-info">
            <text class="report-date">{{ formatDate(report.generatedAt) }}</text>
            <view v-if="report.overallScore" class="score-badge">
              <text class="score-text">{{ Math.round(report.overallScore) }}</text>
            </view>
          </view>
        </view>

        <view v-if="pagination.isLoadingMore" class="load-more">
          <text class="load-more-text">{{ t('common.loadingMore') }}</text>
        </view>

        <view v-else-if="!pagination.hasMore && reports.length > 0" class="load-more">
          <text class="load-more-text">{{ t('common.noMore') }}</text>
        </view>
      </view>

      <!-- 底部留白给 Next 按钮 -->
      <view style="height: 80px;"></view>
    </scroll-view>

    <view class="footer">
      <button class="next-button" @click="onNext">
        {{ t('common.next') }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.history-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #faf8ff;
}

.header {
  background-color: #ffffff;
  padding: calc(12px + env(safe-area-inset-top)) 16px 16px;
  border-bottom: 1px solid #e8e4f4;
}

.header-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  margin-bottom: 4px;
}

.back-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1228;
}

.header-subtitle {
  font-size: 13px;
  color: #8a82a0;
}

.report-scroll {
  flex: 1;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.empty-text {
  font-size: 16px;
  color: #1a1228;
  margin-top: 16px;
}

.empty-hint {
  font-size: 13px;
  color: #8a82a0;
  margin-top: 4px;
  text-align: center;
}

.report-list {
  padding: 12px 16px;
}

.report-item {
  background-color: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 10px;
}

.report-cover {
  position: relative;
  width: 100%;
  height: 160px;
  background-color: #f7f7f7;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(26, 18, 40, 0.75);
  padding: 4px 10px;
  border-radius: 6px;
}

.type-text {
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
}

.report-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
}

.report-date {
  font-size: 14px;
  color: #1a1228;
}

.score-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6b21c8, #9333ea);
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-text {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.load-more {
  padding: 20px;
  text-align: center;
}

.load-more-text {
  font-size: 13px;
  color: #8a82a0;
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #faf8ff 80%, transparent);
}

.next-button {
  width: 100%;
  height: 52px;
  border-radius: 26px;
  background: linear-gradient(135deg, #6b21c8, #9333ea);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(107, 33, 200, 0.3);
}
</style>
