<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, computed } from 'vue';
import {
    isValidEmail,
    sendEmailCaptcha,
    navigateToSendCode,
} from '@/composables/useAuthFlow';

const { t } = useI18n();

const email = ref('');
const inviteCode = ref('');
const isLoading = ref(false);

const goBack = () => uni.navigateBack();

const isNextButtonEnabled = computed(
    () => isValidEmail(email.value) && !isLoading.value
);

const handleRegister = async () => {
    if (!email.value.trim()) {
        uni.showToast({ title: t('auth.login.enterEmail'), icon: 'none' });
        return;
    }
    if (!isValidEmail(email.value)) {
        uni.showToast({ title: t('auth.login.invalidEmail'), icon: 'none' });
        return;
    }

    isLoading.value = true;
    try {
        await sendEmailCaptcha(email.value, true);
        navigateToSendCode({
            pushType: '1',
            type: 'email',
            email: email.value.trim(),
            inviteCode: inviteCode.value || undefined,
        });
    } catch (error) {
        console.error('发送验证码失败:', error);
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <view class="register-page auth-flow-page">
        <view class="auth-content register-layout">
            <view class="auth-back" @click="goBack">
                <image src="@/static/icons/arrow_back.svg" class="auth-back__icon" />
                <text class="auth-back__text">{{ t('common.back') }}</text>
            </view>

            <view class="auth-header">
                <text class="auth-title">{{ t('auth.register.emailTitle') }}</text>
                <text class="auth-subtitle">{{ t('auth.register.emailSubtitle') }}</text>
            </view>

            <view class="form-section">
                <view class="field-group">
                    <text class="auth-label">{{ t('auth.login.email') }}</text>
                    <view class="input-container">
                        <input
                            v-model="email"
                            type="email"
                            class="auth-input input-field"
                            :placeholder="t('auth.login.enterEmail')"
                            :disabled="isLoading"
                        />
                    </view>
                </view>

                <view class="field-group">
                    <text class="auth-label">{{ t('auth.register.inviteCode') }}</text>
                    <view class="input-container">
                        <input
                            v-model="inviteCode"
                            type="text"
                            class="auth-input input-field"
                            :placeholder="t('auth.register.inviteCodePlaceholder')"
                            maxlength="10"
                            :disabled="isLoading"
                        />
                    </view>
                </view>
            </view>

            <view class="button-container">
                <button
                    class="auth-btn-primary"
                    :class="{ 'is-disabled': !isNextButtonEnabled }"
                    :disabled="!isNextButtonEnabled"
                    @click="handleRegister"
                >
                    {{ isLoading ? t('auth.sendCode.sending') : t('auth.register.createAccount') }}
                </button>
            </view>
        </view>
    </view>
</template>

<style scoped lang="scss">
.register-page {
    width: 100vw;
    min-height: 100vh;
    background-color: #fff;
}

.register-layout {
    min-height: 100vh;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 40px;
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.input-container {
    padding: 10px;
    background-color: #f7f7f7;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    min-height: 56px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus-within {
        border-color: #6b21c8;
        box-shadow: 0 0 0 2px rgba(107, 33, 200, 0.12);
    }
}

.input-field {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
}

.button-container {
    margin-top: auto;
    padding-bottom: 40px;
}
</style>
