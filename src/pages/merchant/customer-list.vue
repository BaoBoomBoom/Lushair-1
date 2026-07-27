<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/userStore';
import { get, ProjectBrand } from '@/utils/request';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t } = useI18n();
const userStore = useUserStore();

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

interface PaginationResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const customers = ref<Customer[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');

// 保存从 scan 页面传递的 scanDevice 参数
const scanDevice = ref<string>('');

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 20,
  hasMore: true,
  isLoadingMore: false,
});

async function fetchCustomers(isRefresh = false, isLoadMore = false) {
  if (isLoadMore && (pagination.value.isLoadingMore || !pagination.value.hasMore)) return;

  if (isLoadMore) {
    pagination.value.isLoadingMore = true;
  } else {
    isLoading.value = true;
    if (isRefresh) pagination.value.page = 1;
  }

  try {
    const merchantId = userStore.userInfo.userId || '';
    if (!merchantId) {
      uni.showToast({ title: 'Merchant not found', icon: 'none' });
      return;
    }

    const page = isRefresh ? 1 : pagination.value.page;
    const response = await get<PaginationResponse>('customer', {
      merchantId,
      page,
      pageSize: pagination.value.pageSize,
      search: searchQuery.value || undefined,
    }, { brand: ProjectBrand.LUSHAIR_NEW });

    if (response && response.customers) {
      if (isRefresh || page === 1) {
        customers.value = response.customers;
      } else {
        customers.value = [...customers.value, ...response.customers];
      }

      pagination.value = {
        page: response.page,
        pageSize: response.pageSize,
        hasMore: response.hasMore,
        isLoadingMore: false,
      };
    }
  } catch (error) {
    console.error('Fetch customers error:', error);
    uni.showToast({ title: t('merchant.addFailed'), icon: 'none' });
  } finally {
    isLoading.value = false;
    pagination.value.isLoadingMore = false;
  }
}

function onSearch() {
  fetchCustomers(true, false);
}

function selectCustomer(customer: Customer) {
  // 跳转到客户历史检测页面
  uni.navigateTo({
    url: `/pages/merchant/customer-history?customerId=${customer.id}&name=${encodeURIComponent(customer.name)}`,
  });
}

function goToAddCustomer() {
  const url = scanDevice.value
    ? `/pages/merchant/add-customer?scanDevice=${scanDevice.value}`
    : '/pages/merchant/add-customer';
  uni.navigateTo({ url });
}

function goBack() {
  uni.navigateBack();
}

function formatPhone(phone?: string): string {
  if (!phone) return '';
  // 简单格式化：+1 234567890
  if (phone.startsWith('+') && phone.length > 10) {
    const code = phone.slice(0, 3);
    const num = phone.slice(3);
    return `${code} ${num}`;
  }
  return phone;
}

onMounted(() => {
  // 获取页面传递的 scanDevice 参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any).options || {};
  if (options.scanDevice) {
    scanDevice.value = options.scanDevice;
  }

  fetchCustomers();
});

// 页面显示时检查是否需要刷新（从添加客户页面返回）
onShow(() => {
  const needRefresh = uni.getStorageSync('needRefreshCustomerList');
  if (needRefresh === 'true') {
    uni.removeStorageSync('needRefreshCustomerList');
    fetchCustomers(true, false);
  }
});

// 下拉刷新
onPullDownRefresh(async () => {
  await fetchCustomers(true, false);
  uni.stopPullDownRefresh();
});

// 上拉加载更多
onReachBottom(() => {
  if (pagination.value.hasMore && !pagination.value.isLoadingMore) {
    pagination.value.page++;
    fetchCustomers(false, true);
  }
});
</script>

<template>
  <page-meta page-style="height: 100%; overflow: hidden;" />
  <view class="customer-list-page">
    <view class="header">
      <view class="header-nav">
        <view class="back-button" @click="goBack">
          <TablerIcon name="chevron-left" :size="22" color="#1a1228" />
        </view>
        <text class="header-title">{{ t('merchant.customerList') }}</text>
        <view style="width: 22px;"></view>
      </view>
      <view class="search-bar">
        <TablerIcon name="search" :size="18" color="#8a82a0" />
        <input
          v-model="searchQuery"
          class="search-input"
          type="text"
          :placeholder="t('merchant.searchPlaceholder')"
          @confirm="onSearch"
        />
      </view>
    </view>

    <scroll-view scroll-y class="customer-scroll" @scrolltolower="onReachBottom">
      <view v-if="isLoading && customers.length === 0" class="loading-state">
        <text class="loading-text">{{ t('common.loading') }}</text>
      </view>

      <view v-else-if="customers.length === 0" class="empty-state">
        <TablerIcon name="users" :size="48" color="#d8d2ea" />
        <text class="empty-text">{{ t('merchant.noCustomers') }}</text>
        <text class="empty-hint">{{ t('merchant.addCustomerFirst') }}</text>
      </view>

      <view v-else class="customer-list">
        <view
          v-for="customer in customers"
          :key="customer.id"
          class="customer-item"
          @click="selectCustomer(customer)"
        >
          <view class="customer-avatar">
            <text class="avatar-text">{{ customer.name?.[0] || '?' }}</text>
          </view>
          <view class="customer-info">
            <text class="customer-name">{{ customer.name || 'Unnamed' }}</text>
            <text v-if="customer.phone" class="customer-contact">{{ formatPhone(customer.phone) }}</text>
            <text v-else-if="customer.email" class="customer-contact">{{ customer.email }}</text>
          </view>
          <TablerIcon name="chevron-right" :size="18" color="#d8d2ea" />
        </view>

        <view v-if="pagination.isLoadingMore" class="load-more">
          <text class="load-more-text">{{ t('common.loading') }}</text>
        </view>

        <view v-else-if="!pagination.hasMore && customers.length > 0" class="load-more">
          <text class="load-more-text">{{ t('common.noMoreData') }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="fab-container">
      <view class="fab" @click="goToAddCustomer">
        <TablerIcon name="plus" :size="28" color="#ffffff" />
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.customer-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #faf8ff;
}

.header {
  background-color: #ffffff;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e4f4;
}

.header-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  margin-bottom: 12px;
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f7f7f7;
  border-radius: 12px;
  padding: 10px 12px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #1a1228;
}

.search-input::placeholder {
  color: #8a82a0;
}

.customer-scroll {
  flex: 1;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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
}

.customer-list {
  padding: 12px 16px;
}

.customer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}

.customer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6b21c8, #9333ea);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.customer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1228;
}

.customer-contact {
  font-size: 13px;
  color: #8a82a0;
}

.load-more {
  padding: 20px;
  text-align: center;
}

.load-more-text {
  font-size: 13px;
  color: #8a82a0;
}

.fab-container {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6b21c8, #9333ea);
  box-shadow: 0 4px 12px rgba(107, 33, 200, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.fab:active {
  opacity: 0.8;
}
</style>
