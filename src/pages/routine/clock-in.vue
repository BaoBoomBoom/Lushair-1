<template>
  <view class="clock-in-container">
    <!-- 头部区域 -->
    <view class="header" :style="headerPaddingStyle(15)">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
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
      <view class="placeholder"></view>
    </view>

    <!-- 日历滑动区域 -->
    <scroll-view class="calendar-scroll" scroll-x="true" show-scrollbar="false" @scroll="handleScroll">
      <view class="calendar-days">
        <view 
          v-for="(day, index) in calendarDays" 
          :key="index" 
          class="day-item" 
          :class="{ 'active': isSelectedDay(day.date) }"
          @tap="selectDay(day.date)"
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
        <text>All</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'pre-wash' }"
        @tap="setFilter('pre-wash')"
      >
        <text>Pre-Wash</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'shampoo' }"
        @tap="setFilter('shampoo')"
      >
        <text>Shampoo</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'condition' }"
        @tap="setFilter('condition')"
      >
        <text>Condition</text>
      </view>
      <view 
        class="filter-button" 
        :class="{ 'active': selectedFilter === 'serum' }"
        @tap="setFilter('serum')"
      >
        <text>Serum</text>
      </view>
    </view>

    <!-- 产品列表 -->
    <view class="product-list" @scroll="handleScroll">
      <view class="filter-tabs">
        <view 
          class="filter-tab" 
          :class="{ active: selectedFilter === 'all' }" 
          @tap="setFilter('all')"
        >
          <text>All Products</text>
        </view>
        <view 
          class="filter-tab" 
          :class="{ active: selectedFilter === 'uncompleted' }" 
          @tap="setFilter('uncompleted')"
        >
          <text>Not Completed</text>
        </view>
      </view>
      <view class="products">
        <view 
          v-for="product in filteredProducts" 
          :key="product.id" 
          class="product-item"
          :class="{ 'clocked-in': isProductClocked(product.id) }"
          @tap="toggleClockIn(product.id)"
        >
          <image class="product-image" :src="product.image" mode="aspectFit"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
          </view>
          <view 
            class="clock-button" 
            :class="{ 'checked': isProductClocked(product.id) }"
            @tap="toggleClockIn(product.id)"
          >
            <text v-if="!isProductClocked(product.id)" class="button-text">Clock in</text>
            <TablerIcon v-else name="check" :size="16" color="#ffffff" class="check-icon" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

// 使用状态栏高度 composable
// Use status bar height composable
import { useStatusBar } from '@/composables/useStatusBar';
const { statusBarHeight, headerPaddingStyle } = useStatusBar();

// 定义类型
interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
}

type ClockInRecords = Record<string, string[]>;

// 选中的日期
const selectedDate = ref<Date>(new Date());
// 选中的筛选类型
const selectedFilter = ref<string>('all');
// 打卡记录
const clockInRecords = ref<ClockInRecords>({});

// 生成日历数据
const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = [];
  const currentDate = new Date();
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  for (let i = 1; i <= endDate.getDate(); i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    days.push({
      date: date,
      dayNumber: i,
      isToday: i === currentDate.getDate()
    });
  }
  
  return days;
});

// 产品数据
const products = ref<ProductItem[]>([
  { 
    id: '1', 
    name: 'Kerastase Blond Absolu Hydrating Illuminating Shampoo', 
    type: 'shampoo',
    image: '/static/routine/product1.png'
  },
  { 
    id: '2', 
    name: 'Kerastase Blond Absolu Hydrating Illuminating Shampoo', 
    type: 'shampoo',
    image: '/static/routine/product2.png'
  },
  { 
    id: '3', 
    name: 'Kerastase Blond Absolu Hydrating Illuminating Shampoo', 
    type: 'shampoo',
    image: '/static/routine/product3.png'
  },
  { 
    id: '4', 
    name: 'Kerastase Blond Absolu Hydrating Illuminating Shampoo', 
    type: 'condition',
    image: '/static/routine/product4.png'
  },
  { 
    id: '5', 
    name: 'Kerastase Blond Absolu Hydrating Illuminating Shampoo', 
    type: 'serum',
    image: '/static/routine/product5.png'
  }
]);

// 筛选后的产品列表
const filteredProducts = computed((): ProductItem[] => {
  if (selectedFilter.value === 'all') {
    return products.value;
  } else if (selectedFilter.value === 'uncompleted') {
    return products.value.filter(product => !isProductClocked(product.id));
  } else {
    return products.value;
  }
});

// 返回上一页
const goBack = (): void => {
  uni.navigateBack();
};

// 导航到前一天
const navigatePrevDay = (): void => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() - 1);
  selectedDate.value = newDate;
};

// 导航到后一天
const navigateNextDay = (): void => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + 1);
  selectedDate.value = newDate;
};

// 处理滚动事件
const handleScroll = (e: any): void => {
  // 可以根据需要实现滚动逻辑
};

// 选择日期
const selectDay = (date: Date): void => {
  selectedDate.value = date;
};

// 判断是否是选中的日期
const isSelectedDay = (date: Date): boolean => {
  return date.getDate() === selectedDate.value.getDate() &&
         date.getMonth() === selectedDate.value.getMonth() &&
         date.getFullYear() === selectedDate.value.getFullYear();
};

// 设置筛选条件
const setFilter = (filter: string): void => {
  selectedFilter.value = filter;
};

// 日期格式化为字符串，用于存储
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// 判断产品是否已打卡
const isProductClocked = (productId: string): boolean => {
  const dateKey = formatDateKey(selectedDate.value);
  return clockInRecords.value[dateKey]?.includes(productId) || false;
};

// 切换打卡状态
const toggleClockIn = (productId: string): void => {
  const dateKey = formatDateKey(selectedDate.value);
  
  if (!clockInRecords.value[dateKey]) {
    clockInRecords.value[dateKey] = [];
  }
  
  if (isProductClocked(productId)) {
    // 取消打卡
    clockInRecords.value[dateKey] = clockInRecords.value[dateKey].filter((id: string) => id !== productId);
  } else {
    // 打卡
    clockInRecords.value[dateKey].push(productId);
  }
  
  // 保存打卡记录到本地存储
  saveClockInRecords();
  
  // 添加动画效果
  addClockInAnimation(productId);
};

// 保存打卡记录到本地存储
const saveClockInRecords = (): void => {
  uni.setStorageSync('clockInRecords', JSON.stringify(clockInRecords.value));
};

// 从本地存储加载打卡记录
const loadClockInRecords = (): void => {
  try {
    const records = uni.getStorageSync('clockInRecords');
    if (records) {
      clockInRecords.value = JSON.parse(records);
    }
  } catch (error) {
    console.error('Failed to load clock-in records:', error);
  }
};

// 添加打卡动画效果
const addClockInAnimation = (productId: string): void => {
  // 可以根据需要实现动画效果
};

// 前一天
const previousDay = (): void => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() - 1);
  selectedDate.value = newDate;
};

// 后一天
const nextDay = (): void => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + 1);
  selectedDate.value = newDate;
};

// 格式化显示日期
const formatDisplayDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString(undefined, options);
};

onMounted(() => {
  // 加载打卡记录
  loadClockInRecords();
  
  // 设置当前日期选中对应的日历日期
  const today = new Date();
  selectedDate.value = today;
});
</script>

<style lang="scss" scoped>
.clock-in-container {
  min-height: 100vh;
  background-color: #fff;
  padding-bottom: 30px;
}

/* 头部样式 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px; /* padding-top is set dynamically via inline style */
  padding-top: 0; /* overridden by inline style */
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.back-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 20px;
  color: #333;
}

.date-navigation {
  display: flex;
  align-items: center;
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
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.placeholder {
  width: 30px;
}

/* 日历滚动区域样式 */
.calendar-scroll {
  padding: 15px 0;
  background-color: #f8f8f8;
  white-space: nowrap;
}

.calendar-days {
  display: flex;
  padding: 0 15px;
}

.day-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 40px;
  margin-right: 15px;
  border-radius: 5px;
  background-color: #fff;
}

.day-item.active {
  background-color: #8b5cf6;
}

.day-number {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.day-item.active .day-number {
  color: #fff;
}

/* 筛选按钮样式 */
.filter-buttons {
  display: flex;
  padding: 15px;
  overflow-x: auto;
  white-space: nowrap;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.filter-button {
  padding: 8px 15px;
  margin-right: 10px;
  border-radius: 20px;
  background-color: #f5f5f5;
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

/* 产品列表样式 */
.product-list {
  padding: 15px;
}

.filter-tabs {
  display: flex;
  justify-content: space-around;
  padding: 10px 20px;
  margin-bottom: 10px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-tab {
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
  
  &.active {
    background-color: #f2c3da;
    color: #e56298;
    font-weight: 600;
  }
  
  text {
    font-size: 14px;
  }
}

.products {
  padding: 0 15px;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  
  &.clocked-in {
    background-color: rgba(229, 98, 152, 0.05);
    border: 1px solid rgba(229, 98, 152, 0.2);
    
    .product-info {
      .product-name, .product-time {
        color: #e56298;
      }
    }
  }
}

.product-image {
  width: 40px;
  height: 80px;
  margin-right: 15px;
}

.product-info {
  flex: 1;
  padding-right: 15px;
}

.product-name {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.clock-button {
  min-width: 90px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #8b5cf6;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.clock-button.checked {
  background-color: #4ade80;
  border-radius: 18px;
  animation: checkAnimation 0.5s ease;
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

.button-text {
  font-size: 14px;
  color: #fff;
}

.check-icon {
  font-size: 18px;
  color: #fff;
}
</style> 