<template>
  <view class="records-container">
    <!-- 固定部分：头部和搜索栏 -->
    <view class="fixed-header">
      <!-- Header with back button and title -->
      <view class="navbar">
        <view class="back-button" @tap="navigateBack">
          <text class="back-icon">&#8592;</text>
        </view>
        <text class="navbar-title"> {{ $t('analysis.records') }}</text>
      </view>

      <!-- Search bar -->
      <view class="search-bar">
        <view class="search-input">
          <uni-icons type="search" size="18" color="#999"></uni-icons>
          <input type="text" :placeholder="$t('analysis.search')" v-model="searchText" />
        </view>
      </view>

      <!-- Filter tabs -->
      <scroll-view scroll-x class="filter-tabs" :show-scrollbar="false">
        <view 
          v-for="(tab, index) in filterTabs" 
          :key="index" 
          class="tab" 
          :class="{ active: currentTab === tab.value }"
          @click="setCurrentTab(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 可滚动部分：记录列表 -->
    <scroll-view scroll-y class="records-list">
      <template v-for="(group, month) in groupedRecords" :key="month">
        <view class="month-header">
          <text>{{ month }}</text>
        </view>

        <view
          v-for="record in group"
          :key="record.id"
          class="record-item"
          @click="navigateToDetail(record.recordId)"
        >
          <view class="score-circle">
            <text class="score">{{ Math.round(record.scalpScore) }}</text>
          </view>
          <view class="record-info">
            <view class="record-date">{{ formatDate(record.createTime) }}</view>
            <view class="record-metrics">
              <view class="metric">
                <text>{{ $t('analysis.scalp') }}: {{ Math.round(record.scalp) }}</text>
              </view>
              <view class="metric">
                <text>{{ $t('analysis.follicle') }}: {{ Math.round(record.follicle) }}</text>
              </view>
              <view class="metric">
                <text>{{ $t('analysis.hair') }}: {{ Math.round(record.hair) }}</text>
              </view>
            </view>
          </view>
          <view class="record-actions">
            <view class="delete-button" @click.stop="confirmDeleteRecord(record)">
              <uni-icons type="trash" size="18" color="#e74c3c"></uni-icons>
            </view>
            <uni-icons type="right" size="16" color="#999"></uni-icons>
          </view>
        </view>
      </template>

      <!-- Empty state when no records -->
      <view v-if="Object.keys(groupedRecords).length === 0" class="empty-state">
        <text>{{ $t('analysis.noData') }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';

export default {
  setup() {
    const { t } = useI18n();
    const userStore = useUserStore();
    const records = ref([]);
    const searchText = ref('');
    const currentTab = ref('all');
    const loading = ref(false);

    // Custom post function to handle the specific API response structure
    const customPost = async (url, data) => {
      try {
        // 使用统一的API配置系统
        const { apiRequest } = await import('@/utils/apiHelper');
        return await apiRequest.mainApi(url, data, userStore.token);
      } catch (error) {
        console.error('Request error:', error);
        throw error;
      }
    };

    // Get all unique names/merchantNames for filter tabs
    const filterTabs = computed(() => {
      const tabs = [{ label: t('analysis.all'), value: 'all' }];
      
      if (records.value.length > 0) {
        const uniqueNames = new Set();
        
        records.value.forEach(record => {
          if (userStore.userInfo.type === 1) {
            // For merchant, get unique nickNames
            if (record.name && !uniqueNames.has(record.name)) {
              uniqueNames.add(record.name);
              tabs.push({ label: record.name, value: record.name });
            }
          } else {
            // For regular user, get unique merchantNames
            if (record.merchantName && !uniqueNames.has(record.merchantName)) {
              uniqueNames.add(record.merchantName);
              tabs.push({ label: record.merchantName, value: record.merchantName });
            }
          }
        });
      }
      
      return tabs;
    });

    // Filter and group records by month
    const groupedRecords = computed(() => {
      if (!records.value.length) return {};
      
      // 首先对所有记录按时间倒序排序（最新的在前面）
      const sortedRecords = [...records.value].sort((a, b) => {
        return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
      });
      
      // Filter records based on search text and selected tab
      const filteredRecords = sortedRecords.filter(record => {
        const matchesSearch = searchText.value ? 
          (record.name?.toLowerCase().includes(searchText.value.toLowerCase()) || 
           record.merchantName?.toLowerCase().includes(searchText.value.toLowerCase()) ||
           record.phone?.includes(searchText.value)) : 
          true;
          
        const matchesTab = currentTab.value === 'all' ? 
          true : 
          (userStore.userInfo.type === 1 ? 
            record.name === currentTab.value : 
            record.merchantName === currentTab.value);
            
        return matchesSearch && matchesTab;
      });
      
      // Group by month
      const grouped = {};
      
      filteredRecords.forEach(record => {
        const date = new Date(record.createTime);
        // 使用YYYY-MM格式作为键，确保月份按时间顺序排列
        const monthYearKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthYear = getMonthName(date.getMonth()) + ' ' + date.getFullYear();
        
        if (!grouped[monthYearKey]) {
          grouped[monthYearKey] = {
            displayName: monthYear,
            records: []
          };
        }
        
        grouped[monthYearKey].records.push(record);
      });
      
      // 将月份按时间倒序排列（最近的月份在前面）
      const sortedKeys = Object.keys(grouped).sort().reverse();
      
      // 创建最终的分组对象，保持月份顺序
      const result = {};
      sortedKeys.forEach(key => {
        result[grouped[key].displayName] = grouped[key].records;
      });
      
      return result;
    });

    // Get month name based on index
    const getMonthName = (monthIndex) => {
      const months = [
        t('analysis.january'), t('analysis.february'), t('analysis.march'),
        t('analysis.april'), t('analysis.may'), t('analysis.june'),
        t('analysis.july'), t('analysis.august'), t('analysis.september'),
        t('analysis.october'), t('analysis.november'), t('analysis.december')
      ];
      return months[monthIndex];
    };

    // Format date for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return `${date.getDate()} ${getMonthName(date.getMonth())} ${date.getFullYear()}`;
    };

    // Set current tab
    const setCurrentTab = (tab) => {
      currentTab.value = tab;
    };

    // Navigate back
    const navigateBack = () => {
      uni.navigateBack();
    };

    // Delete a specific record
    const confirmDeleteRecord = (record) => {
      uni.showModal({
        title: t('analysis.deleteConfirmTitle'),
        content: t('analysis.deleteConfirmMessage'),
        confirmColor: '#e74c3c',
        success: (res) => {
          if (res.confirm) {
            deleteRecord(record);
          }
        }
      });
    };

    const deleteRecord = async (record) => {
      try {
        const { apiRequest } = await import('@/utils/apiHelper');
        await apiRequest.mainApi('user/deleteDetectionRecord', {
          userId: userStore.userInfo.userId,
          recordId: record.recordId
        }, userStore.token);

        // Remove from local list
        records.value = records.value.filter(r => r.recordId !== record.recordId);

        uni.showToast({
          title: t('analysis.deleteSuccess'),
          icon: 'success',
          duration: 2000
        });
      } catch (error) {
        console.error('Failed to delete record:', error);
        uni.showToast({
          title: t('analysis.deleteFailed'),
          icon: 'none',
          duration: 2000
        });
      }
    };

    // Navigate to detail page
    const navigateToDetail = (id) => {
      uni.navigateTo({
        url: `/pages/trichoscan/index?id=${id}&pushType=1`
      });
    };

    // Fetch records from API
    const fetchRecords = async () => {
      loading.value = true;
      try {
        let endpoint, params;
        
        if (userStore.userInfo.type === 1) {
          // Merchant user
          // endpoint = 'user/getMerchantDetectionRecordListV2';
          // params = {
          //   merchantId: userStore.userInfo.userId,
          //   pageIndex: 1,
          //   pageSize: 99
          // };
          endpoint = 'user/getMerchantDetectionRecordList';
          params = {
            merchantId: userStore.userInfo.userId,
          };
        } else {
          // Regular user
          // endpoint = 'user/getDetectionRecordListV2';
          // params = {
          //   userId: userStore.userInfo.userId,
          //   pageIndex: 1,
          //   pageSize: 99
          // };
          endpoint = 'user/getDetectionRecordList';
          params = {
            userId: userStore.userInfo.userId,
          };
        }
        
        const response = await customPost(endpoint, params);
        console.log('Records response:', response);
        
        if (response && response.success && Array.isArray(response.data.list)) {
          // records.value = response.data;
          records.value = response.data.list;
          console.log('Records loaded:', records.value.length);
        } else {
          records.value = [];
          console.error('Unexpected response format:', response);
          
          if (response && response.errMessage) {
            uni.showToast({
              title: response.errMessage,
              icon: 'none',
              duration: 2000
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch records:', error);
        uni.showToast({
          title: t('analysis.loadError') || 'Failed to load records',
          icon: 'none',
          duration: 2000
        });
        records.value = [];
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchRecords();
    });

    return {
      records,
      searchText,
      currentTab,
      loading,
      filterTabs,
      groupedRecords,
      formatDate,
      setCurrentTab,
      navigateBack,
      navigateToDetail,
      confirmDeleteRecord
    };
  }
};
</script>

<style>
.records-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f8f8;
  overflow: hidden; /* 防止内容溢出 */
}

/* 导航栏样式 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.back-button {
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back-icon {
  font-size: 20px;
  color: #333;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-right: 36px; /* 与返回按钮对称 */
}

.fixed-header {
  position: relative;
  z-index: 10;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* 添加阴影效果，增强视觉分隔 */
}

.header {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: #fff;
}

.back-button {
  padding: 5px 10px;
}

.title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin-right: 30px; /* To offset the back button and center the title */
}

.search-bar {
  padding: 10px 15px;
  background-color: #fff;
}

.search-input {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 20px;
  padding: 8px 15px;
}

.search-input input {
  flex: 1;
  height: 24px;
  margin-left: 8px;
  font-size: 14px;
}

.filter-tabs {
  display: flex;
  white-space: nowrap;
  background-color: #fff;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.tab {
  display: inline-block;
  padding: 8px 20px;
  margin: 0 5px;
  border-radius: 20px;
  font-size: 14px;
  background-color: #f0f0f0;
}

.tab:first-child {
  margin-left: 15px;
}

.tab:last-child {
  margin-right: 15px;
}

.tab.active {
  background-color: #8b5cf6;
  color: #fff;
}

.records-list {
  flex: 1;
  height: 0; /* 关键：让flex布局自动分配剩余高度 */
  padding: 0 15px;
  overflow-y: auto; /* 允许内容溢出时滚动 */
  -webkit-overflow-scrolling: touch; /* 在iOS上提供平滑滚动 */
}

.month-header {
  padding: 15px 0 10px;
  font-size: 16px;
  font-weight: 600;
}

.record-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 10px;
}

.score-circle {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: #f0e6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.score {
  font-size: 20px;
  font-weight: 600;
  color: #8b5cf6;
}

.record-info {
  flex: 1;
}

.record-date {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.record-metrics {
  display: flex;
  flex-wrap: wrap;
}

.metric {
  background-color: #f0f0f0;
  border-radius: 15px;
  padding: 5px 10px;
  margin-right: 8px;
  margin-bottom: 5px;
  font-size: 12px;
}

.record-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.delete-button:active {
  background-color: #fde8e8;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
}
</style> 