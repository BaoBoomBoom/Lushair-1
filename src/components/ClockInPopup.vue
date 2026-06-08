<template>
  <!-- 打卡弹窗 -->
  <view class="popup-mask" v-if="visible" @tap="onClose"></view>
  <view class="clock-in-popup" v-if="visible">
    <!-- 弹窗头部 -->
    <view class="popup-header">
      <view class="close-button" @tap="onClose">
        <text class="close-icon">×</text>
      </view>
      <text class="popup-title">{{ $t('common.dailyCheckIn') }}</text>
      <view class="placeholder"></view>
    </view>

    <!-- 日期选择 -->
    <view class="date-navigation">
      <view class="nav-button" @tap="navigatePrevDay">
        <text>&lt;</text>
      </view>
      <view class="current-date">
        <text>{{ formatDisplayDate(selectedDate) }}</text>
      </view>
      <view class="nav-button" @tap="navigateNextDay">
        <text>&gt;</text>
      </view>
    </view>

    <!-- 日历滑动区域 -->
    <scroll-view 
      class="calendar-scroll" 
      scroll-x="true" 
      show-scrollbar="false"
      :scroll-left="calendarScrollPosition"
      :scroll-with-animation="true"
      id="calendarScroll">
      <view class="calendar-days">
        <view 
          v-for="(day, index) in calendarDays" 
          :key="index" 
          class="day-item" 
          :class="{ 'active': isSelectedDay(day.date) }"
          @tap="selectDay(day.date)"
          :id="`day-${day.dayNumber}`"
        >
          <text class="day-number">{{ day.dayNumber }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 筛选按钮 -->
    <view class="filter-buttons">
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'all' }"
        @tap="setFilter('all')"
      >
        <text>{{ $t('common.all') }}</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'PRE_WASH' }"
        @tap="setFilter('PRE_WASH')"
      >
        <text>{{ $t('product.preWash') }}</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'SHAMPOO' }"
        @tap="setFilter('SHAMPOO')"
      >
        <text>{{ $t('product.shampoo') }}</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'CONDITIONER' }"
        @tap="setFilter('CONDITIONER')"
      >
        <text>{{ $t('product.conditioner') }}</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'SERUM' }"
        @tap="setFilter('SERUM')"
      >
        <text>{{ $t('product.serum') }}</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'HAIR_MASK' }"
        @tap="setFilter('HAIR_MASK')"
      >
        <text>{{ $t('product.mask') }}</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'DRUG' }"
        @tap="setFilter('DRUG')"
      >
        <text>{{ $t('product.finasteride') }}</text>
      </view>
    </view>

    <!-- 产品列表 -->
    <view class="popup-product-list">
      <view v-if="filteredProducts.length > 0">
        <view 
          v-for="(product, index) in filteredProducts" 
          :key="index"
          class="popup-product-item"
          :class="{ 'clocked-in': isProductClocked(getProductId(product)) }"
        >
          <image class="popup-product-image" :src="getProductImage(product)" mode="aspectFit"></image>
          <view class="popup-product-info">
            <text class="popup-product-name">{{ getProductName(product) }}</text>
          </view>
          <view 
            class="popup-clock-button" 
            :class="{ 
              'checked': isProductClocked(getProductId(product)),
              'disabled': !isDateToday(selectedDate)
            }"
            @tap="toggleClockIn(getProductId(product))"
          >
            <text v-if="!isProductClocked(getProductId(product))" class="popup-button-text">{{ $t('common.clockIn') }}</text>
            <TablerIcon v-else name="check" :size="14" color="#ffffff" class="popup-check-icon" />
          </view>
        </view>
      </view>
      <view v-else class="no-records-message">
        <text>{{ $t('common.noClockInRecords') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch, onMounted } from 'vue';
import { useUserStore } from '../stores/userStore';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { getAchievementTracker } from '@/utils/achievementTracker';

// 使用i18n
const { t } = useI18n();

// 使用用户Store获取userId
const userStore = useUserStore();

// 组件接收的参数
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  initialProducts: {
    type: Array as () => (ProductItem | ApiProductItem)[],
    default: () => []
  }
});

// 组件事件
const emit = defineEmits(['update:visible', 'clock-in-updated']);

// 产品类型定义
interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
}

// API返回的产品数据类型
interface ApiProductItem {
  type: string; // e.g., PRE_WASH
  typeDesc: string;
  productId: number;
  productTitle: string;
  productDesc: string | null;
  productUrl: string;
  clockIn?: boolean;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
}

type ClockInRecords = Record<string, string[]>;

// 内部状态
const selectedDate = ref<Date>(new Date());
const selectedFilter = ref<string>('all');
const clockInRecords = ref<ClockInRecords>({});
const products = ref<ProductItem[]>([]);
const apiProducts = ref<ApiProductItem[]>([]);
const isLoading = ref<boolean>(false);

// 添加计算属性，计算日历应该滚动的位置
const calendarScrollPosition = ref(0);

// 监听产品数据变化
watch(() => props.initialProducts, (newProducts) => {
  // Handle products based on their shape
  if (newProducts && newProducts.length > 0) {
    // Check if we're dealing with API format objects
    if ('productId' in newProducts[0]) {
      apiProducts.value = [...newProducts as ApiProductItem[]];
      products.value = [];  // Clear old format
    } else {
      // Traditional format
      products.value = [...newProducts as ProductItem[]];
    }
  } else {
    products.value = [];
    apiProducts.value = [];
  }
}, { immediate: true });

// 监听弹窗可见性
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    // 当弹窗打开时，设置为当前日期
    selectedDate.value = new Date();
    
    // 加载当前日期的数据
    fetchProductClockInData(selectedDate.value);
    
    // 计算并设置滚动位置，显示当前日期
    calculateScrollPosition();
  }
}, { immediate: true });

// 监听选中日期变化
watch(() => selectedDate.value, (newDate) => {
  // 日期变化时重新加载数据
  if (props.visible) {
    fetchProductClockInData(newDate);
    // 计算并设置滚动位置
    calculateScrollPosition();
  }
});

// 关闭弹窗
const onClose = () => {
  emit('update:visible', false);
};

// 生成日历数据
const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = [];
  const date = selectedDate.value;
  const currentDate = new Date(); // 用于判断是否为今天
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  for (let i = 1; i <= endDate.getDate(); i++) {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), i);
    const isToday = dayDate.getDate() === currentDate.getDate() && 
                   dayDate.getMonth() === currentDate.getMonth() && 
                   dayDate.getFullYear() === currentDate.getFullYear();
    
    days.push({
      date: dayDate,
      dayNumber: i,
      isToday: isToday
    });
  }
  
  return days;
});

// 筛选后的产品列表
const filteredProducts = computed(() => {
  if (selectedFilter.value === 'all') {
    // 如果有API产品数据，优先使用
    if (apiProducts.value && apiProducts.value.length > 0) {
      return apiProducts.value;
    }
    return products.value;
  } else {
    // 如果有API产品数据，优先筛选API数据
    if (apiProducts.value && apiProducts.value.length > 0) {
      return apiProducts.value.filter(product => product.type === selectedFilter.value);
    }
    // 兼容原始格式
    const legacyFilter = selectedFilter.value.toLowerCase().replace('_', '-');
    return products.value.filter(product => product.type === legacyFilter);
  }
});

// 导航到前一天
const navigatePrevDay = () => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() - 1);
  selectedDate.value = newDate;
};

// 导航到后一天
const navigateNextDay = () => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + 1);
  selectedDate.value = newDate;
};

// 选择日期
const selectDay = (date: Date) => {
  selectedDate.value = date;
};

// 判断是否是选中的日期
const isSelectedDay = (date: Date) => {
  return date.getDate() === selectedDate.value.getDate() &&
         date.getMonth() === selectedDate.value.getMonth() &&
         date.getFullYear() === selectedDate.value.getFullYear();
};

// 设置筛选条件
const setFilter = (filter: string) => {
  selectedFilter.value = filter;
};

// 日期格式化为YYYY-MM-DD格式，用于存储
const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// 日期格式化为YYYYMMDD格式，用于API调用
const formatDateForApi = (date: Date) => {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
};

// 判断产品是否已打卡
const isProductClocked = (productId: string) => {
  // 如果不是今天，所有产品都视为已打卡
  if (!isDateToday(selectedDate.value)) {
    return true;
  }
  
  // 优先检查API产品数据
  const product = apiProducts.value.find(p => p.productId.toString() === productId);
  if (product) {
    return product.clockIn === true;
  }
  
  // 兼容本地缓存方式
  const dateKey = formatDateKey(selectedDate.value);
  return clockInRecords.value[dateKey]?.includes(productId) || false;
};

// 获取产品ID（兼容不同数据格式）
const getProductId = (product: ProductItem | ApiProductItem) => {
  if ('id' in product) {
    return product.id;
  }
  return product.productId.toString();
};

// 获取产品名称（兼容不同数据格式）
const getProductName = (product: ProductItem | ApiProductItem) => {
  if ('name' in product) {
    return product.name;
  }
  return product.productTitle;
};

// 获取产品图片（兼容不同数据格式）
const getProductImage = (product: ProductItem | ApiProductItem) => {
  if ('image' in product) {
    return product.image;
  }
  return product.productUrl;
};

// 获取API产品打卡数据
const fetchProductClockInData = async (date: Date) => {
  try {
    isLoading.value = true;
    const userId = userStore.userInfo.userId;
    if (!userId) {
      console.error('用户ID不可用，无法获取打卡记录');
      return;
    }
    
    // 格式化日期为YYYYMMDD格式
    const dateStr = formatDateForApi(date);
    
    // 检查是否是今天的日期
    const isToday = isDateToday(date);
    
    if (isToday) {
      // 如果是今天，先获取推荐产品列表
      await fetchRecommendedProducts(userId, dateStr);
    } else {
      // 如果不是今天，清空推荐产品列表
      apiProducts.value = [];
    }
    
    // 获取打卡记录
    const response = await post('encr/clockIn/product/query', { 
      userId: userId,
      dateStr: dateStr
    });
    
    if (response && Array.isArray(response)) {
      if (isToday) {
        // 如果是今天，合并推荐产品和打卡记录
        mergeProductsWithClockInStatus(response);
      } else {
        // 如果不是今天，直接使用打卡记录
        apiProducts.value = response;
      }
      
      // 同步到本地缓存，以兼容现有逻辑
      const dateKey = formatDateKey(date);
      clockInRecords.value[dateKey] = apiProducts.value
        .filter(product => product.clockIn)
        .map(product => product.productId.toString());
      
      // 保存到本地存储
      saveClockInRecords();
    } else if (!isToday) {
      // 如果不是今天且没有打卡记录，清空产品列表
      apiProducts.value = [];
      const dateKey = formatDateKey(date);
      clockInRecords.value[dateKey] = [];
    }
  } catch (error) {
    console.error('获取打卡记录失败:', error);
    if (!isDateToday(date)) {
      apiProducts.value = [];
    }
  } finally {
    isLoading.value = false;
  }
};

// 获取推荐产品列表
const fetchRecommendedProducts = async (userId: string, dateStr: string) => {
  try {
    const response = await post('/product/recommend', { userId });
    
    if (response && Array.isArray(response)) {
      // 设置推荐产品列表，初始化都未打卡
      apiProducts.value = response.map(product => ({
        ...product,
        clockIn: false
      }));
    } else {
      apiProducts.value = [];
    }
  } catch (error) {
    console.error('获取推荐产品失败:', error);
    apiProducts.value = [];
  }
};

// 合并推荐产品和打卡记录
const mergeProductsWithClockInStatus = (clockInProducts: ApiProductItem[]) => {
  if (!clockInProducts || clockInProducts.length === 0) {
    return;
  }
  
  // 将打卡状态设置到对应的推荐产品上
  const recommendedProductIds = new Set(apiProducts.value.map(p => p.productId));
  const additionalProducts: ApiProductItem[] = [];
  
  // 处理每个打卡产品
  clockInProducts.forEach(clockedProduct => {
    // 如果在推荐产品中找到匹配ID的产品，设置其打卡状态
    const existingProductIndex = apiProducts.value.findIndex(p => p.productId === clockedProduct.productId);
    
    if (existingProductIndex >= 0) {
      // 产品已存在于推荐列表中，更新打卡状态
      apiProducts.value[existingProductIndex].clockIn = true;
    } else {
      // 产品不在推荐列表中，添加到额外产品列表
      clockedProduct.clockIn = true;
      additionalProducts.push(clockedProduct);
    }
  });
  
  // 将额外的打卡产品添加到推荐产品列表的顶部
  if (additionalProducts.length > 0) {
    apiProducts.value = [...additionalProducts, ...apiProducts.value];
  }
};

// 检查日期是否是今天
const isDateToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
};

// 切换打卡状态
const toggleClockIn = async (productId: string) => {
  // 如果不是今天，不允许打卡
  if (!isDateToday(selectedDate.value)) {
    return;
  }
  
  // 查找产品
  const product = apiProducts.value.find(p => p.productId.toString() === productId);
  if (!product) {
    console.error('未找到产品:', productId);
    return;
  }
  
  // 如果已经打卡，不允许再次打卡
  if (product.clockIn) {
    return;
  }
  
  try {
    const userId = userStore.userInfo.userId;
    if (!userId) {
      console.error('用户ID不可用，无法更新打卡记录');
      return;
    }
    
    // 调用打卡接口
    await post('encr/clockIn/product', {
      userId: userId,
      productId: parseInt(productId),
      productType: product.type,
      content: ""  // 内容为空
    });
    
    // 更新本地状态
    const productIndex = apiProducts.value.findIndex(p => p.productId.toString() === productId);
    if (productIndex !== -1) {
      apiProducts.value[productIndex].clockIn = true;
    }
    
    // 更新本地缓存
    const dateKey = formatDateKey(selectedDate.value);
    if (!clockInRecords.value[dateKey]) {
      clockInRecords.value[dateKey] = [];
    }
    
    if (!clockInRecords.value[dateKey].includes(productId)) {
      clockInRecords.value[dateKey].push(productId);
    }
    
    // 保存打卡记录
    saveClockInRecords();
    
    // 显示打卡成功动画和提示
    uni.showToast({
      title: '打卡成功',
      icon: 'success',
      duration: 1500
    });
    
    // 如果是今天的日期，可能需要重新获取最新的数据状态
    if (isDateToday(selectedDate.value)) {
      // 延迟一小段时间后刷新数据，确保后端数据已更新
      setTimeout(() => {
        fetchProductClockInData(selectedDate.value);
      }, 500);
    }
    
    // 向父组件发送更新事件
    emit('clock-in-updated', {
      date: dateKey,
      records: [...clockInRecords.value[dateKey]],
      allRecords: { ...clockInRecords.value }
    });

    // 记录成就进度
    try {
      const tracker = getAchievementTracker();
      // 假设这里可以获取到连续打卡天数和总打卡天数
      // 实际项目中可能需要从API或本地存储获取这些数据
      const consecutiveDays = getConsecutiveClockInDays();
      const totalDays = getTotalClockInDays();
      tracker.trackClockIn(consecutiveDays, totalDays);
    } catch (error) {
      console.error('记录成就进度失败:', error);
    }
  } catch (error) {
    console.error('打卡失败:', error);
    uni.showToast({
      title: '打卡失败',
      icon: 'none',
      duration: 1500
    });
  }
};

// 保存打卡记录到本地存储
const saveClockInRecords = () => {
  try {
    uni.setStorageSync('clock_in_records', JSON.stringify(clockInRecords.value));
  } catch (e) {
    console.error('保存打卡记录失败', e);
  }
};

// 从本地存储加载打卡记录
const loadClockInRecords = () => {
  try {
    const records = uni.getStorageSync('clock_in_records');
    if (records) {
      clockInRecords.value = JSON.parse(records);
    }
  } catch (e) {
    console.error('加载打卡记录失败', e);
  }
};

// 格式化显示日期
const formatDisplayDate = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString(undefined, options);
};

// 计算日期对应的滚动位置
const calculateScrollPosition = () => {
  try {
    const currentDay = selectedDate.value.getDate();
    const dayWidth = 60; // 每个日期项宽度 (含margin)
    
    // 计算滚动位置，保证当前日期居中
    const scrollLeft = Math.max(0, (currentDay - 2) * dayWidth);
    
    // 设置滚动位置
    calendarScrollPosition.value = scrollLeft;
    console.log('设置日历滚动位置:', scrollLeft, '当前日期:', currentDay);
  } catch (error) {
    console.error('计算滚动位置失败:', error);
  }
};

// 添加 onMounted 钩子
onMounted(() => {
  // 加载本地缓存的打卡记录
  loadClockInRecords();
});

// 获取连续打卡天数（示例实现）
const getConsecutiveClockInDays = () => {
  // 实际项目中可能需要从API或本地存储获取
  // 这里简单模拟
  let count = 1;
  const today = new Date();
  const dateKey = formatDateKey(today);
  
  // 检查前几天是否有打卡记录
  for (let i = 1; i <= 100; i++) {
    const prevDate = new Date();
    prevDate.setDate(today.getDate() - i);
    const prevDateKey = formatDateKey(prevDate);
    
    if (clockInRecords.value[prevDateKey] && clockInRecords.value[prevDateKey].length > 0) {
      count++;
    } else {
      break;
    }
  }
  
  return count;
};

// 获取总打卡天数（示例实现）
const getTotalClockInDays = () => {
  // 统计所有有打卡记录的日期数量
  return Object.keys(clockInRecords.value).filter(
    dateKey => clockInRecords.value[dateKey] && clockInRecords.value[dateKey].length > 0
  ).length;
};
</script>

<style>
/* 弹窗相关样式 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.clock-in-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  background-color: #fff;
  border-radius: 10px;
  z-index: 1001;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.close-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  font-size: 24px;
  color: #999;
}

.popup-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  flex: 1;
  text-align: center;
}

.placeholder {
  width: 30px;
}

.date-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
}

.nav-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
}

.current-date {
  padding: 0 15px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.calendar-scroll {
  padding: 10px 0;
  background-color: #f8f8f8;
  white-space: nowrap;
  margin-bottom: 15px;
}

.calendar-days {
  display: flex;
  padding: 0 10px;
}

.day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  min-width: 50px;
  max-width: 50px;
  height: 50px;
  min-height: 50px;
  max-height: 50px;
  margin-right: 10px;
  border-radius: 5px;
  background-color: #fff;
  box-sizing: border-box;
}

.day-item.active {
  background-color: #8b5cf6;
}

.day-number {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.day-item.active .day-number {
  color: #fff;
}

.filter-buttons {
  display: flex;
  padding: 5px 0;
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: 15px;
}

.filter-button {
  padding: 6px 12px;
  margin-right: 8px;
  border-radius: 20px;
  background-color: #f5f5f5;
  min-width: max-content;
  white-space: nowrap;
}

.filter-button.active {
  background-color: #8b5cf6;
}

.filter-button text {
  font-size: 14px;
  color: #666;
}

.filter-button.active text {
  color: #fff;
}

.popup-product-list {
  max-height: 40vh;
  overflow-y: auto;
}

.popup-product-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.popup-product-item.clocked-in {
  background-color: rgba(139, 92, 246, 0.05);
}

.popup-product-image {
  width: 35px;
  height: 70px;
  margin-right: 10px;
}

.popup-product-info {
  flex: 1;
  padding-right: 10px;
}

.popup-product-name {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.popup-clock-button {
  min-width: 90px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #8b5cf6;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.popup-clock-button.checked {
  background-color: #4ade80;
  border-radius: 18px;
  animation: checkAnimation 0.5s ease;
}

.popup-clock-button.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

@keyframes checkAnimation {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.popup-button-text {
  font-size: 14px;
  color: #fff;
}

.popup-check-icon {
  font-size: 18px;
  color: #fff;
}

.no-records-message {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 10px;
  color: #666;
  font-size: 14px;
}
</style> 