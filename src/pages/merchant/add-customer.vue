<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCountries, getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import zhLocale from 'i18n-iso-countries/langs/zh.json';
import { useUserStore } from '@/stores/userStore';
import { post, ProjectBrand } from '@/utils/request';
import { useMerchantScanCustomer } from '@/composables/useMerchantScanCustomer';
import { runLushairOneScan, runLushairProScan } from '@/composables/useScanActions';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t, locale } = useI18n();
const userStore = useUserStore();
const { registerCustomer, getMerchantScanPayload } = useMerchantScanCustomer();

// 注册语言包
countries.registerLocale(enLocale);
countries.registerLocale(zhLocale);

// 生成国家代码列表
const generateCountryCodes = () => {
  const allCountries = getCountries();
  const countryCodeMap = new Map();

  allCountries.forEach(countryCode => {
    try {
      const callingCode = getCountryCallingCode(countryCode);
      const key = `+${callingCode}`;

      const currentLocale = locale.value === 'zh-Hans' ? 'zh' : 'en';
      const countryName = countries.getName(countryCode, currentLocale, { select: 'alias' }) || countryCode;

      if (!countryCodeMap.has(key)) {
        countryCodeMap.set(key, {
          code: key,
          country: countryCode,
          name: countryName
        });
      }
    } catch {
      // 忽略无效的国家代码
    }
  });

  const codes = Array.from(countryCodeMap.values());
  codes.sort((a, b) => a.name.localeCompare(b.name));
  return codes;
};

const countryCodes = generateCountryCodes();
const defaultCountryIndex = countryCodes.findIndex(country => country.code === '+1');

// 表单数据
const selectedCountryIndex = ref(defaultCountryIndex !== -1 ? defaultCountryIndex : 0);
const phoneNumber = ref('');
const emailAddress = ref('');
const customerName = ref('');
const contactType = ref<'phone' | 'email'>('phone');
const gender = ref('');
const birthDate = ref('2000-01-01'); // 选择器默认定位到2000年
const hasUserSelectedBirthDate = ref(false); // 标记用户是否主动选择过

// 格式化日期显示
const formattedBirthDate = computed(() => {
  if (!hasUserSelectedBirthDate.value) return ''; // 用户未选择时不显示
  if (!birthDate.value) return '';
  const date = new Date(birthDate.value);
  const lang = locale.value === 'zh-Hans' ? 'zh-CN' : 'en-US';
  return date.toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// 检测设备类型： lushairOne | lushairPro（从URL参数获取，默认 lushairOne）
const scanDeviceType = ref<'lushairOne' | 'lushairPro'>('lushairOne');

// 获取页面传递的 scanDevice 参数
onMounted(() => {
  // 初始化用户信息（确保 merchantId 可用）
  userStore.initUserInfo();

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any).options || {};
  if (options.scanDevice && (options.scanDevice === 'lushairOne' || options.scanDevice === 'lushairPro')) {
    scanDeviceType.value = options.scanDevice;
  }
});

// 下拉菜单状态
const showCountryDropdown = ref(false);
const searchQuery = ref('');
const isLoading = ref(false);
const isDatePickerOpen = ref(false); // 日期选择器是否打开

// 计算属性
const selectedCountryCode = computed(() => countryCodes[selectedCountryIndex.value]);
const filteredCountryCodes = computed(() => {
  if (!searchQuery.value) return countryCodes;
  const query = searchQuery.value.toLowerCase();
  return countryCodes.filter(country =>
    country.name.toLowerCase().includes(query) ||
    country.code.includes(query) ||
    country.country.toLowerCase().includes(query)
  );
});

// 方法
function selectCountry(index: number) {
  selectedCountryIndex.value = index;
  showCountryDropdown.value = false;
  searchQuery.value = '';
}

function toggleCountryDropdown() {
  showCountryDropdown.value = !showCountryDropdown.value;
}

function closeDropdown() {
  showCountryDropdown.value = false;
  searchQuery.value = '';
}

function goBack() {
  uni.navigateBack();
}

function onBirthDateChange(value: string) {
  birthDate.value = value;
  hasUserSelectedBirthDate.value = true;
  isDatePickerOpen.value = false;
}

function onDatePickerClick() {
  isDatePickerOpen.value = true;
}

async function launchScanForCustomer() {
  // 计算年龄
  let customerAge: number | undefined = undefined;
  if (birthDate.value) {
    const today = new Date();
    const birth = new Date(birthDate.value);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    customerAge = age;
  }

  // 传递商家信息和客户信息给iOS
  const merchantPayload = getMerchantScanPayload();
  if (merchantPayload.merchantId) {
    try {
      const nativeWindow = window as Window & { webkit?: any; android?: any };
      if (nativeWindow.webkit?.messageHandlers?.setMerchantInfo) {
        nativeWindow.webkit.messageHandlers.setMerchantInfo.postMessage({
          merchantId: merchantPayload.merchantId,
          customerId: merchantPayload.customerId,
          userId: merchantPayload.userId,
          gender: gender.value || undefined,
          age: customerAge,
        });
      } else if (nativeWindow.android?.setMerchantInfo) {
        nativeWindow.android.setMerchantInfo({
          merchantId: merchantPayload.merchantId,
          customerId: merchantPayload.customerId,
          userId: merchantPayload.userId,
          gender: gender.value || undefined,
          age: customerAge,
        });
      }
    } catch (e) {
      console.log('[add-customer] Set merchant info to native failed:', e);
    }
  }

  // 根据设备类型唤起对应的检测
  if (scanDeviceType.value === 'lushairOne') {
    await runLushairOneScan();
  } else {
    await runLushairProScan();
  }
}

async function handleSubmit() {
  if (!customerName.value.trim()) {
    uni.showToast({ title: t('merchant.nameRequired'), icon: 'none' });
    return;
  }

  // 验证性别（必填）
  if (!gender.value) {
    uni.showToast({ title: t('merchant.genderRequired'), icon: 'none' });
    return;
  }

  // 验证出生日期（必填）
  if (!hasUserSelectedBirthDate.value) {
    uni.showToast({ title: t('merchant.birthRequired'), icon: 'none' });
    return;
  }

  if (contactType.value === 'phone') {
    if (!phoneNumber.value.trim()) {
      uni.showToast({ title: t('merchant.phoneRequired'), icon: 'none' });
      return;
    }

    // 验证手机号格式
    try {
      const fullPhoneNumber = `${selectedCountryCode.value.code}${phoneNumber.value}`;
      const isValid = isValidPhoneNumber(fullPhoneNumber, selectedCountryCode.value.country as any);
      if (!isValid) {
        uni.showToast({ title: t('merchant.invalidPhone'), icon: 'none' });
        return;
      }
    } catch {
      const phoneRegex = /^\d{6,15}$/;
      if (!phoneRegex.test(phoneNumber.value.replace(/\D/g, ''))) {
        uni.showToast({ title: t('merchant.invalidPhone'), icon: 'none' });
        return;
      }
    }
  } else {
    if (!emailAddress.value.trim()) {
      uni.showToast({ title: t('merchant.emailRequired'), icon: 'none' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress.value)) {
      uni.showToast({ title: t('merchant.invalidEmail'), icon: 'none' });
      return;
    }
  }

  isLoading.value = true;
  try {
    const result = await registerCustomer({
      name: customerName.value,
      contactType: contactType.value,
      phone: contactType.value === 'phone' ? phoneNumber.value : undefined,
      email: contactType.value === 'email' ? emailAddress.value : undefined,
      gender: gender.value || undefined,
      birthDate: birthDate.value || undefined,
    });

    if (result) {
      // 客户首次添加成功，直接唤起iOS App进行检测
      // 使用eventBus或页面参数通知customer-list刷新
      uni.setStorageSync('needRefreshCustomerList', 'true');

      // 延迟一下确保存储完成
      setTimeout(() => {
        launchScanForCustomer();
      }, 100);
    }
  } catch (error: any) {
    console.error('Register customer error:', error);

    // 检查是否是"客户已存在"的错误
    const errorMessage = error?.message || error?.toString() || '';
    if (errorMessage.includes('exists') || errorMessage.includes('already') || error?.customer) {
      const existingCustomer = error.customer;
      uni.showModal({
        title: t('merchant.customerExists'),
        content: t('merchant.customerExistsMessage'),
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        success: (res) => {
          if (res.confirm && existingCustomer?.id) {
            // 跳转到客户检测记录页面
            uni.navigateTo({
              url: `/pages/merchant/customer-history?customerId=${existingCustomer.id}&name=${encodeURIComponent(existingCustomer.name || '')}`,
            });
          }
        },
      });
    } else {
      uni.showToast({ title: t('merchant.addFailed'), icon: 'none' });
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <view class="add-customer-page">
    <view class="header">
      <view class="header-nav">
        <view class="back-button" @click="goBack">
          <TablerIcon name="chevron-left" :size="22" color="#1a1228" />
        </view>
        <text class="header-title">{{ t('merchant.addCustomer') }}</text>
        <view style="width: 22px;"></view>
      </view>
    </view>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <!-- 姓名 -->
        <view class="form-field">
          <text class="form-label">{{ t('merchant.name') }} *</text>
          <input
            v-model="customerName"
            class="form-input"
            type="text"
            :placeholder="t('merchant.namePlaceholder')"
          />
        </view>

        <!-- 联系方式类型切换 -->
        <view class="contact-toggle">
          <view
            class="contact-chip"
            :class="{ on: contactType === 'phone' }"
            @click="contactType = 'phone'"
          >
            {{ t('merchant.phone') }}
          </view>
          <view
            class="contact-chip"
            :class="{ on: contactType === 'email' }"
            @click="contactType = 'email'"
          >
            {{ t('merchant.email') }}
          </view>
        </view>

        <!-- 手机号 -->
        <view v-show="contactType === 'phone'" class="form-field" :key="'phone'">
          <text class="form-label">{{ t('merchant.phoneNumber') }} *</text>
          <view class="phone-input-row">
            <view class="country-code-container">
              <view class="country-code-selector" @tap.stop="toggleCountryDropdown">
                <text class="country-code-text">{{ selectedCountryCode.code }}</text>
                <view class="dropdown-icon" :class="{ 'rotated': showCountryDropdown }">
                  <TablerIcon name="chevron-down" :size="14" color="#6b21c8" />
                </view>
              </view>

              <!-- 国家代码下拉菜单 -->
              <view v-if="showCountryDropdown" class="dropdown-overlay" @tap="closeDropdown" />
              <view v-if="showCountryDropdown" class="country-dropdown" @tap.stop>
                <view class="search-container">
                  <input
                    v-model="searchQuery"
                    type="text"
                    class="search-input"
                    :placeholder="t('auth.register.searchCountryPlaceholder')"
                    @tap.stop
                  />
                </view>
                <scroll-view scroll-y class="dropdown-scroll">
                  <view
                    v-for="(country, index) in filteredCountryCodes"
                    :key="index"
                    class="dropdown-item"
                    :class="{ 'selected': countryCodes.indexOf(country) === selectedCountryIndex }"
                    @tap="selectCountry(countryCodes.indexOf(country))"
                  >
                    <text class="country-code">{{ country.code }}</text>
                    <text class="country-name">{{ country.name }}</text>
                  </view>
                </scroll-view>
              </view>
            </view>

            <input
              v-model="phoneNumber"
              type="tel"
              class="form-input phone-input"
              :placeholder="t('merchant.phonePlaceholder')"
              maxlength="15"
            />
          </view>
        </view>

        <!-- 邮箱 -->
        <view v-if="contactType === 'email'" class="form-field" :key="'email'">
          <text class="form-label">{{ t('merchant.emailAddress') }} *</text>
          <input
            v-model="emailAddress"
            class="form-input"
            type="email"
            inputmode="email"
            :placeholder="t('merchant.emailPlaceholder')"
          />
        </view>

        <!-- 性别（必选） -->
        <view class="form-field">
          <text class="form-label">{{ t('merchant.gender') }} *</text>
          <view class="gender-options">
            <view
              class="gender-chip"
              :class="{ on: gender === 'male' }"
              @click="gender = 'male'"
            >
              {{ t('merchant.male') }}
            </view>
            <view
              class="gender-chip"
              :class="{ on: gender === 'female' }"
              @click="gender = 'female'"
            >
              {{ t('merchant.female') }}
            </view>
            <view
              class="gender-chip"
              :class="{ on: gender === 'other' }"
              @click="gender = 'other'"
            >
              {{ t('merchant.other') }}
            </view>
          </view>
        </view>

        <!-- 出生日期（必选） -->
        <view class="form-field">
          <text class="form-label">{{ t('merchant.birthDate') }} *</text>
          <uni-datetime-picker type="date" v-model="birthDate" :locale="locale === 'zh-Hans' ? 'zh' : 'en'" :end="new Date().toISOString().split('T')[0]" @change="onBirthDateChange">
            <view class="picker-input" @click="onDatePickerClick">
              <text :class="{ 'placeholder': !hasUserSelectedBirthDate }">
                {{ formattedBirthDate || t('merchant.selectDate') }}
              </text>
              <TablerIcon name="calendar" :size="18" color="#8a82a0" />
            </view>
          </uni-datetime-picker>
        </view>
      </view>
    </scroll-view>

    <!-- Save按钮固定底部 -->
    <view class="footer">
      <button
        class="submit-button"
        :disabled="isLoading"
        @click="handleSubmit"
      >
        {{ isLoading ? t('common.saving') : t('merchant.saveAndScan') }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.add-customer-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #faf8ff;
  position: relative;
}

.header {
  background-color: #ffffff;
  padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
  border-bottom: 1px solid #e8e4f4;
}

.header-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
}

.back-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1228;
}

.form-scroll {
  flex: 1;
  padding: 16px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1228;
}

.form-input {
  height: 48px;
  background-color: #ffffff;
  border: 1px solid #e8e4f4;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 15px;
  color: #1a1228;
}

.form-input::placeholder {
  color: #8a82a0;
}

.contact-toggle {
  display: flex;
  gap: 8px;
}

.contact-chip {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid #e8e4f4;
  background: #ffffff;
  font-size: 14px;
  font-weight: 600;
  color: #6b21c8;

  &.on {
    border-color: #6b21c8;
    background: rgba(107, 33, 200, 0.08);
  }
}

.phone-input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  width: 100%;
}

.country-code-container {
  position: relative;
  width: 94px;
  flex-shrink: 0;
}

.country-code-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border: 1px solid #e8e4f4;
  border-radius: 12px;
  padding: 0 10px;
  height: 48px;
  box-sizing: border-box;
}

.country-code-text {
  font-family: 'Inter', sans-serif;
  font-weight: 300;
  font-size: 15px;
  color: #1a1228;
}

.dropdown-icon {
  transition: transform 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
}

.country-dropdown {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 400px;
  max-height: 70vh;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.search-container {
  padding: 16px;
  border-bottom: 1px solid #e8e4f4;
}

.search-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e8e4f4;
  border-radius: 10px;
  font-size: 14px;
  height: 44px;
  box-sizing: border-box;
}

.dropdown-scroll {
  flex: 1;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e8e4f4;
  min-height: 48px;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &.selected {
    background-color: rgba(107, 33, 200, 0.08);
  }
}

.country-code {
  font-weight: 600;
  margin-right: 12px;
  font-size: 15px;
  min-width: 50px;
  color: #6b21c8;
}

.country-name {
  font-size: 15px;
  color: #1a1228;
  flex: 1;
}

.phone-input {
  flex: 1;
  min-width: 0;
}

.gender-options {
  display: flex;
  gap: 8px;
}

.gender-chip {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid #e8e4f4;
  background: #ffffff;
  font-size: 14px;
  font-weight: 600;
  color: #6b21c8;

  &.on {
    border-color: #6b21c8;
    background: rgba(107, 33, 200, 0.08);
  }
}

.device-options {
  display: flex;
  gap: 8px;
}

.device-chip {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid #e8e4f4;
  background: #ffffff;
  font-size: 14px;
  font-weight: 600;
  color: #6b21c8;

  &.on {
    border-color: #6b21c8;
    background: rgba(107, 33, 200, 0.08);
  }
}

.picker-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background-color: #ffffff;
  border: 1px solid #e8e4f4;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 15px;
  color: #1a1228;

  .placeholder {
    color: #8a82a0;
  }
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1px solid #e8e4f4;
}

.submit-button {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6b21c8, #9333ea);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}

.submit-button:disabled {
  opacity: 0.6;
}

/* 修复日期选择器z-index被底部按钮遮挡的问题 */
:deep(.uni-datetime-picker__container),
:deep(.uni-datetime-picker--fix),
:deep(.uni-datetime-picker__popup),
:deep(.uni-popup__wrapper),
:deep(.uni-popup) {
  z-index: 99999 !important;
}

/* 确保email输入框在iOS上正确显示 */
.form-input[type="email"] {
  appearance: none;
  -webkit-appearance: none;
  -webkit-user-select: text;
  user-select: text;
}
</style>
