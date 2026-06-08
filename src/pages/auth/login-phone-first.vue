 <script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, computed } from 'vue';
import AuthStepProgress from '@/components/auth/AuthStepProgress.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import { sendPhoneCaptcha, navigateToSendCode } from '@/composables/useAuthFlow';
import { getCountries, getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import zhLocale from 'i18n-iso-countries/langs/zh.json';

const { t, locale } = useI18n();

// 注册语言包 (Register language packs)
countries.registerLocale(enLocale);
countries.registerLocale(zhLocale);

// 使用 libphonenumber-js 生成完整的国家代码列表 (Generate complete country code list using libphonenumber-js)
// 按国家名称首字母排序 (Sort by country name alphabetically)
const generateCountryCodes = () => {
    const allCountries = getCountries();
    const countryCodeMap = new Map();

    // 生成国家代码映射 (Generate country code mapping)
    allCountries.forEach(countryCode => {
        try {
            const callingCode = getCountryCallingCode(countryCode);
            const key = `+${callingCode}`;
            
            // 使用 i18n-iso-countries 获取国家名称 (Get country name using i18n-iso-countries)
            const currentLocale = locale.value === 'zh-Hans' ? 'zh' : 'en';
            const countryName = countries.getName(countryCode, currentLocale, { select: 'alias' }) || countryCode;
            
            if (!countryCodeMap.has(key)) {
                countryCodeMap.set(key, {
                    code: key,
                    country: countryCode,
                    name: countryName
                });
            }
        } catch (error) {
            // 忽略无效的国家代码 (Ignore invalid country codes)
        }
    });

    // 转换为数组并按国家名称字母顺序排序 (Convert to array and sort alphabetically by country name)
    const codes = Array.from(countryCodeMap.values());
    codes.sort((a, b) => a.name.localeCompare(b.name));

    return codes;
};

const countryCodes = generateCountryCodes();

// 查找 +1 区号的索引作为默认值 (Find index of +1 country code as default)
const defaultCountryIndex = countryCodes.findIndex(country => country.code === '+1');

// 表单数据 (Form data)
const selectedCountryIndex = ref(defaultCountryIndex !== -1 ? defaultCountryIndex : 0);
const phoneNumber = ref('');
const inviteCode = ref('');

// 下拉菜单状态
const showCountryDropdown = ref(false);
const searchQuery = ref('');
const isLoading = ref(false);

// 计算当前选中的国家代码
const selectedCountryCode = computed(() => countryCodes[selectedCountryIndex.value]);

// 过滤国家代码列表
const filteredCountryCodes = computed(() => {
    if (!searchQuery.value) return countryCodes;
    const query = searchQuery.value.toLowerCase();
    return countryCodes.filter(country => 
        country.name.toLowerCase().includes(query) || 
        country.code.includes(query) ||
        country.country.toLowerCase().includes(query)
    );
});

// 选择国家代码
const selectCountry = (index: number) => {
    selectedCountryIndex.value = index;
    showCountryDropdown.value = false;
    searchQuery.value = ''; // 清空搜索查询
};

// 切换下拉菜单显示状态
const toggleCountryDropdown = () => {
    showCountryDropdown.value = !showCountryDropdown.value;
};

// 点击外部区域关闭下拉菜单
const closeDropdown = () => {
    showCountryDropdown.value = false;
    searchQuery.value = ''; // 清空搜索查询
};

// 返回上一页
const goBack = () => {
    uni.navigateBack();
};

// 下一步
const handleNext = async () => {
    if (!phoneNumber.value.trim()) {
        uni.showToast({
            title: t('auth.register.phoneNumberRequired'),
            icon: 'none'
        });
        return;
    }


    // 使用 libphonenumber-js 验证手机号码格式 (Validate phone number format using libphonenumber-js)
    try {
        const fullPhoneNumber = `${selectedCountryCode.value.code}${phoneNumber.value}`;
        const isValid = isValidPhoneNumber(fullPhoneNumber, selectedCountryCode.value.country as any);
        
        if (!isValid) {
            uni.showToast({
                title: t('auth.register.invalidPhoneNumber'),
                icon: 'none'
            });
            return;
        }
    } catch (error) {
        // 如果验证失败,使用简单的正则验证作为后备 (If validation fails, use simple regex as fallback)
        const phoneRegex = /^\d{6,15}$/;
        if (!phoneRegex.test(phoneNumber.value.replace(/\D/g, ''))) {
            uni.showToast({
                title: t('auth.register.invalidPhoneNumber'),
                icon: 'none'
            });
            return;
        }
    }


    isLoading.value = true;
    try {
        await sendPhoneCaptcha(selectedCountryCode.value.code, phoneNumber.value);
        navigateToSendCode({
            pushType: '0',
            type: 'phone',
            phone: phoneNumber.value,
            countryCode: selectedCountryCode.value.code,
            inviteCode: inviteCode.value || undefined,
        });
    } catch (error) {
        console.error('发送验证码失败:', error);
    } finally {
        isLoading.value = false;
    }
};

// 计算按钮是否可用
const isNextButtonEnabled = computed(() => {
    return phoneNumber.value.trim().length > 0 && !isLoading.value;
});
</script>

<template>
    <view class="register-page auth-flow-page">
        <AuthStepProgress :step="1" />

        <view class="content">
            <view class="auth-header phone-header">
                <text class="auth-title">{{ t('auth.login.phoneNumberTitle') }}</text>
                <text class="auth-subtitle">{{ t('auth.login.phoneNumberSubtitle') }}</text>
            </view>

            <!-- 表单区域 -->
            <view class="form-section" @tap="closeDropdown">
                <!-- 手机号码输入区域 -->
                <view class="phone-input-section">
                    <text class="auth-label">{{ t('auth.register.phoneNumber') }}</text>
                    <view class="phone-input-row">
                        <view class="country-code-container">
                            <view class="country-code-selector" @tap.stop="toggleCountryDropdown">
                                <text class="country-code-text">{{ selectedCountryCode.code }}</text>
                                <view class="dropdown-icon" :class="{ 'rotated': showCountryDropdown }">
                                    <TablerIcon name="chevron-down" :size="14" />
                                </view>
                            </view>
                            
                            <!-- 国家代码下拉菜单 -->
                            <view v-if="showCountryDropdown" class="country-dropdown" @tap.stop>
                                <!-- 搜索框 -->
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
                            class="auth-input phone-input"
                            :placeholder="t('auth.register.phoneNumberPlaceholder')"
                            maxlength="15"
                        />
                    </view>
                </view>

                <!-- 邀请码输入区域 -->
                <!-- <view class="invite-code-section">
                    <text class="input-label">{{ t('auth.register.inviteCode') }}</text>
                    <input
                        v-model="inviteCode"
                        type="text"
                        class="invite-code-input"
                        :placeholder="t('auth.register.inviteCodePlaceholder')"
                        maxlength="10"
                    />
                </view> -->
            </view>
        </view>

        <!-- 底部按钮 -->
        <view class="button-section">
            <view class="button-row">
                <button class="back-button" @tap="goBack">
                    {{ t('common.back') }}
                </button>
                <button 
                    class="next-button" 
                    :class="{ 'disabled': !isNextButtonEnabled }"
                    :disabled="!isNextButtonEnabled"
                    @tap="handleNext"
                >
                    {{ isLoading ? t('auth.register.sendingCode') : t('common.next') }}
                </button>
            </view>
        </view>
    </view>
</template>

<style lang="less" scoped>
.register-page {
    min-height: 100vh;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
}

.progress-indicator {
    padding: 61px 16px 0;
}

.progress-bar {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.progress-step {
    width: 48px;
    height: 4px;
    border-radius: 12px;
    background-color: #e0e0e0;
}

.progress-step.completed {
    background-color: #6b21c8;
}

.progress-step.active {
    background-color: #6b21c8;
}

.content {
    flex: 1;
    padding: 0 16px;
    margin-top: 40px;
}

.phone-header {
    margin-bottom: 40px;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.phone-input-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.phone-input-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    flex-wrap: wrap;
}

.auth-label {
    margin-bottom: 4px;
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
    background-color: #f7f7f7;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    height: 46px;
    box-sizing: border-box;
}

.country-code-text {
    font-family: 'Inter', sans-serif;
    font-weight: 300;
    font-size: 16px;
    line-height: 1.5;
    color: #000000;
    flex: 1;
    text-align: left;
}

.dropdown-icon {
    transition: transform 0.2s ease;
    font-size: 12px;
    color: #6b21c8;
    flex-shrink: 0;
    margin-left: 8px;
}

.dropdown-icon.rotated {
    transform: rotate(180deg);
}

.country-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    width: 280px;
    background-color: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 300px;
    min-width: 280px;
}

.search-container {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.search-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 14px;
    background-color: #f9f9f9;
    box-sizing: border-box;
    height: 44px;
    line-height: 1.4;
}

.search-input::placeholder {
    color: #999;
}

.dropdown-scroll {
    max-height: 200px;
}

.dropdown-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    min-height: 44px;
}

.dropdown-item:hover {
    background-color: #f5f5f5;
}

.dropdown-item.selected {
    background-color: #f0f0f0;
}

.country-code {
    font-weight: 500;
    margin-right: 12px;
    min-width: 50px;
    font-size: 14px;
}

.country-name {
    font-size: 14px;
    color: #666;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.phone-input,
.invite-code-input {
    background-color: #f7f7f7;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-radius: 12px;
    padding: 10px;
    font-family: 'Inter', sans-serif;
    font-weight: 300;
    font-size: 16px;
    line-height: 1.5;
    color: #000000;
    height: 46px;
    flex: 1;
    box-sizing: border-box;
}

.phone-input::placeholder,
.invite-code-input::placeholder {
    color: #999;
}

.invite-code-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.button-section {
    padding: 20px 16px 34px;
}

.button-row {
    display: flex;
    gap: 16px;
}

.back-button,
.next-button {
    flex: 1;
    height: 56px;
    border-radius: 12px;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 600;
    font-size: 16px;
    line-height: 1.375;
    letter-spacing: 1.5625%;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.back-button {
    background-color: #ffffff;
    color: #6b21c8;
    border: 1px solid #6b21c8;
}

.next-button {
    background-color: #6b21c8;
    color: #ffffff;
}

.next-button.disabled {
    background-color: #cccccc;
    color: #666666;
    cursor: not-allowed;
}

.next-button:not(.disabled):hover {
    background-color: #5a2fa8;
}

.back-button:hover {
    background-color: #f8f5ff;
}
</style>
