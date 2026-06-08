<template>
  <view class="settings-container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="back-button" @tap="goBack">
        <text class="back-icon">&#8592;</text>
      </view>
      <text class="navbar-title">{{ $t('profile.settings') }}</text>
    </view>
    
    <!-- 设置项列表 -->
    <view class="settings-list">
      <view class="settings-item" @tap="goToGenderSettings">
        <view class="item-left">
          <text class="item-title">Gender</text>
          <text class="item-value">{{ userInfo.gender === 2 ? 'Female' : 'Male' }}</text>
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>

      <view class="settings-item" @tap="goToBirthdaySettings">
        <view class="item-left">
          <text class="item-title">Birthday</text>
          <text class="item-value">{{ userInfo.dob ? formatDate(userInfo.dob) : 'Not set' }}</text>
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>

      <view class="settings-item" @tap="showRegionInput">
        <view class="item-left">
          <text class="item-title">Region</text>
          <text class="item-value">{{ userInfo.region || 'Not set' }}</text>
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>

      <!-- 手机号码 -->
      <view class="settings-item" @tap="goToPhoneSettings">
        <view class="item-left">
          <text class="item-title">Phone Number</text>
          <text class="item-value">{{ userInfo.phone }}</text>
        </view>
        <!-- <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view> -->
      </view>
      
      <!-- 邮箱地址 -->
      <view class="settings-item" @tap="goToEmailSettings">
        <view class="item-left">
          <text class="item-title">Email Address</text>
          <text class="item-value">{{ userInfo.email || 'Not set' }}</text>
        </view>
        <!-- <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view> -->
      </view>
      
      <!-- 语言设置 -->
      <view class="settings-item" @tap="goToLanguageSettings">
        <view class="item-left">
          <text class="item-title">Language</text>
          <text class="item-value">{{ currentLanguageDisplay }}</text>
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>
      
      <!-- 日常记录 -->
      <view class="settings-item" @tap="showRoutineClockIn">
        <view class="item-left">
          <text class="item-title">Routine Records</text>
          <!-- <text class="item-value">{{ lastClockInTime }}</text> -->
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>
      
      <!-- 皮肤扫描记录 -->
      <view class="settings-item" @tap="goToDermaScanRecords">
        <view class="item-left">
          <text class="item-title">Derma Scan Records</text>
          <!-- <text class="item-value">2024.11.13 06:34:54</text> -->
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>
      
      <!-- 发分记录 -->
      <view class="settings-item" @tap="goToHairPointRecords">
        <view class="item-left">
          <text class="item-title">Hair Point Records</text>
          <!-- <text class="item-value">2024.11.13 06:34:54</text> -->
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>
      
      <!-- 获取Lushair头皮探索者 -->
      <view class="settings-item" @tap="goToScalpExplorer">
        <view class="item-left">
          <text class="item-title">Get Lushair Scalp Explorer</text>
          <!-- <text class="item-value">2024.11.13 06:34:54</text> -->
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>
      
      <!-- 追踪数据 -->
      <!-- <view class="settings-item" @tap="goToTrackerView">
        <view class="item-left">
          <text class="item-title">追踪数据</text>
          <text class="item-value">查看用户活动追踪数据</text>
        </view>
        <view class="item-right">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view> -->
    </view>
    
    <!-- 打卡弹窗 -->
    <ClockInPopup 
      :visible="showClockInPopup" 
      @update:visible="showClockInPopup = $event"
      :initial-products="products"
      @clock-in-updated="handleClockInUpdated"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import ClockInPopup from '@/components/ClockInPopup.vue';
// @ts-ignore
import { getLocale } from '@/i18n.js';

// 产品类型定义
interface ProductItem {
  id: string;
  name: string;
  type: string;
  image: string;
}

const userStore = useUserStore();
const { userInfo } = userStore;

declare var window: Window & { 
  webkit: any,
  android: any,
  receiveUserIdFromApp: Function
};

// 打卡弹窗相关状态
const showClockInPopup = ref(false);
const lastClockInTime = ref('');

// 当前语言显示
const currentLanguage = ref('');

// 计算当前语言显示文本
const currentLanguageDisplay = computed(() => {
  const locale = currentLanguage.value || getLocale();
  return locale === 'zh-Hans' ? '中文' : 'English';
});

// 获取最新的打卡记录时间
const getLastClockInTime = () => {
  try {
    const records = uni.getStorageSync('clock_in_records');
    if (records) {
      const clockInRecords = JSON.parse(records) as Record<string, string[]>;
      // 查找有记录的最新日期
      const dates = Object.keys(clockInRecords)
        .filter(date => clockInRecords[date] && clockInRecords[date].length > 0)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      if (dates.length > 0) {
        // 转换为友好的日期显示
        const latestDate = new Date(dates[0]);
        return formatClockInDate(latestDate);
      }
    }
    return 'No records yet';
  } catch (error) {
    console.error('获取打卡记录失败:', error);
    return 'No records yet';
  }
};

// 格式化打卡日期为显示格式
const formatClockInDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

// 产品数据
const products = ref<ProductItem[]>([
  { 
    id: '1', 
    name: 'Kerastase Blond Absolu Hydrating Illuminating Shampoo', 
    type: 'shampoo',
    image: '/static/trichoscan/shampoo.png'
  },
  { 
    id: '2', 
    name: 'Kerastase Blond Absolu Hydrating Conditioner', 
    type: 'condition',
    image: '/static/trichoscan/conditioner.png'
  },
  { 
    id: '3', 
    name: 'Kerastase Pre-Wash Treatment', 
    type: 'pre-wash',
    image: '/static/trichoscan/pre-wash.png'
  },
  { 
    id: '4', 
    name: 'Kerastase Hair Serum', 
    type: 'serum',
    image: '/static/trichoscan/serum.png'
  },
  { 
    id: '5', 
    name: 'Kerastase Hair Mask Treatment', 
    type: 'hair-mask',
    image: '/static/trichoscan/hair-mask.png'
  }
]);

// 格式化日期显示
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Not set';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // 如果日期无效，直接返回原字符串
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}.${month}.${day}`;
  } catch (e) {
    return dateStr;
  }
};

// 显示打卡弹窗
const showRoutineClockIn = () => {
  showClockInPopup.value = true;
};

// 处理打卡更新
const handleClockInUpdated = (data: {
  date: string;
  records: string[];
  allRecords: Record<string, string[]>;
}) => {
  console.log('打卡数据已更新:', data);
  // 更新最新打卡时间显示
  lastClockInTime.value = getLastClockInTime();
};

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 跳转到各设置项的编辑页面
const goToPhoneSettings = () => {
  uni.navigateTo({
    url: '/pages/profile/phone-settings'
  });
};

const goToEmailSettings = () => {
  uni.navigateTo({
    url: '/pages/profile/email-settings'
  });
};

const goToLanguageSettings = () => {
  uni.navigateTo({
    url: '/pages/profile/language-settings'
  });
};

const goToDermaScanRecords = () => {
  uni.navigateTo({
    url: '/pages/analysis/records'
  });
  // const u = navigator.userAgent
  // const isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
  // if (isiOS) {
  //   window.webkit.messageHandlers.dermaScanRecords.postMessage({data: 'dermaScanRecords'});
  // } else {
  //   window.android.dermaScanRecords(JSON.stringify({data: 'dermaScanRecords'}));
  // }
};

const goToHairPointRecords = () => {
  // uni.navigateTo({
  //   url: '/pages/profile/hair-point-records'
  // });
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.hairPointRecords.postMessage({data: 'hairPointRecords'});
  } else {
    window.android.hairPointRecords(JSON.stringify({data: 'hairPointRecords'}));
  }
};

const goToScalpExplorer = () => {
  // uni.navigateTo({
  //   url: '/pages/profile/scalp-explorer'
  // });
  const u = navigator.userAgent
  const isiOS = /iPad|iPhone|iPod/.test(u) ||
                (/Macintosh/.test(u) && 'ontouchend' in document)
  if (isiOS) {
    window.webkit.messageHandlers.scalpExplorer.postMessage({data: 'scalpExplorer'});
  } else {
    window.android.scalpExplorer(JSON.stringify({data: 'scalpExplorer'}));
  }
};

const goToGenderSettings = () => {
  uni.navigateTo({
    url: '/pages/profile/gender-settings'
  });
};

const goToBirthdaySettings = () => {
  uni.navigateTo({
    url: '/pages/profile/birthday-settings'
  });
};

// 显示区域输入框
const showRegionInput = () => {
  uni.showModal({
    title: 'Region',
    editable: true,
    placeholderText: 'Enter your region',
    content: userInfo.region || '',
    success: async (res) => {
      if (res.confirm && res.content && res.content.trim()) {
        // 用户点击确定，且输入内容不为空
        await updateRegion(res.content.trim());
      }
    }
  });
};

// 更新区域信息
const updateRegion = async (region: string) => {
  try {
    uni.showLoading({
      title: 'Saving...',
      mask: true
    });
    
    // 调用更新接口
    const result = await userStore.updateUserInfo({
      region: region
    });
    
    uni.hideLoading();
    
    if (result.success) {
      uni.showToast({
        title: 'Region updated',
        icon: 'success',
        duration: 2000
      });
    } else {
      uni.showToast({
        title: 'Update failed',
        icon: 'error',
        duration: 2000
      });
    }
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: 'Update error',
      icon: 'error',
      duration: 2000
    });
    console.error('保存区域设置失败:', error);
  }
};

const goToTrackerView = () => {
  uni.navigateTo({
    url: '/pages/profile/tracker-view'
  });
};

onMounted(() => {
  // 获取最新打卡时间
  lastClockInTime.value = getLastClockInTime();
  
  // 初始化当前语言
  currentLanguage.value = getLocale();
  
  // 监听语言变更事件  
  uni.$on('languageChanged', (locale) => {
    console.log('Settings页面接收到语言变更(新):', locale);
    currentLanguage.value = locale;
  });
});
</script>

<style>
.settings-container {
  min-height: 100vh;
  background-color: #fff;
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

/* 设置项列表 */
.settings-list {
  margin-top: 10px;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.item-left {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.item-value {
  font-size: 14px;
  color: #666;
}

.item-right {
  display: flex;
  align-items: center;
}

.arrow-icon {
  font-size: 18px;
  color: #999;
}
</style> 