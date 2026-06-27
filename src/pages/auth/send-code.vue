<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, nextTick, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { get, post, ProjectBrand } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';
import AuthStepProgress from '@/components/auth/AuthStepProgress.vue';
import {
    maskEmail,
    maskPhone,
    sendEmailCaptcha,
    sendPhoneCaptcha,
    setUserIdToApp,
    type AuthPushType,
} from '@/composables/useAuthFlow';
import {
    createClerkUserAfterVerification,
    registerWithClerkToken,
    clearClerkSession,
} from '@/utils/clerk';

const { t } = useI18n();
const userStore = useUserStore();

const pushType = ref<AuthPushType>('0');
const type = ref<'email' | 'phone'>('email');
const email = ref('');
const phone = ref('');
const countryCode = ref('');
const inviteCode = ref('');
const isLoading = ref(false);
const shakeError = ref(false);
const resendSeconds = ref(0);
let resendTimer: ReturnType<typeof setInterval> | null = null;

const verificationCode = ref(['', '', '', '']);
const focusIndex = ref(0);
const inputRefs: Record<number, HTMLInputElement> = {} as Record<number, HTMLInputElement>;

const setInputRef = (index: number) => (el: unknown) => {
    if (el) inputRefs[index] = el as HTMLInputElement;
};

const contactDisplay = computed(() => {
    if (type.value === 'email' && email.value) return maskEmail(email.value);
    if (type.value === 'phone' && phone.value) return maskPhone(countryCode.value, phone.value);
    return '';
});

const subtitleText = computed(() => {
    if (contactDisplay.value) {
        return t('auth.sendCode.subtitleTo', { contact: contactDisplay.value });
    }
    return t('auth.sendCode.subtitle');
});

const canResend = computed(() => resendSeconds.value === 0 && !isLoading.value);

const goBack = () => uni.navigateBack();

const clearCode = () => {
    verificationCode.value = ['', '', '', ''];
    focusIndex.value = 0;
};

const triggerShake = () => {
    shakeError.value = true;
    setTimeout(() => {
        shakeError.value = false;
    }, 500);
};

const startResendCountdown = (seconds = 60) => {
    if (resendTimer) clearInterval(resendTimer);
    resendSeconds.value = seconds;
    resendTimer = setInterval(() => {
        resendSeconds.value -= 1;
        if (resendSeconds.value <= 0 && resendTimer) {
            clearInterval(resendTimer);
            resendTimer = null;
        }
    }, 1000);
};

const handleCodeInput = (index: number, event: { detail?: { value?: string }; target?: { value?: string } }) => {
    const value = event.detail?.value ?? event.target?.value ?? '';
    if (!/^\d*$/.test(value)) return;

    const lastChar = value.slice(-1);
    verificationCode.value[index] = lastChar;

    if (lastChar && index < 3) {
        nextTick(() => {
            focusIndex.value = index + 1;
        });
    }
};

const handleKeydown = (index: number, event: KeyboardEvent) => {
    if (event.key === 'Backspace' && !verificationCode.value[index] && index > 0) {
        nextTick(() => {
            focusIndex.value = index - 1;
        });
    }
};

const handlePaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    if (pastedData && /^\d{4}$/.test(pastedData)) {
        verificationCode.value = pastedData.split('');
        nextTick(() => {
            focusIndex.value = 3;
        });
    }
};

// 辅助函数：获取用户信息，支持新老后端兜底逻辑
const getUserInfoWithFallback = async (contactPayload: Record<string, string>): Promise<any> => {
    // 1. 先从新后端查询用户信息（通过 email/phone 查询参数，无需认证）
    let userInfoResponse = await get('user/profile', contactPayload, { brand: ProjectBrand.LUSHAIR_NEW }) as any;

    if (!userInfoResponse || !userInfoResponse.userId) {
        console.log('[UserSync] 新后端未找到用户，尝试从老后端查询...');

        // 2. 新后端没有，去老后端查询（用 try-catch 捕获 500 错误，表示用户不存在）
        let legacyUserInfo: any = null;
        try {
            legacyUserInfo = await post('user/info', contactPayload, { brand: ProjectBrand.LUSHAIR, silent: true }) as any;
        } catch (error: any) {
            // 老后端返回 500 表示用户不存在，继续执行注册流程
            console.log('[UserSync] 老后端查询失败(用户不存在):', error?.data?.message || 'error');
        }

        if (legacyUserInfo && legacyUserInfo.userId) {
            console.log('[UserSync] 老后端找到用户，同步到新后端:', legacyUserInfo.userId);

            // 3. 老后端查到了，同步到新后端
            await post('user/sync', legacyUserInfo, { brand: ProjectBrand.LUSHAIR_NEW });
            userInfoResponse = legacyUserInfo;
        } else {
            console.log('[UserSync] 老后端也未找到用户，调用 registUser 创建用户...');

            // 4. 老后端也没有，调用注册接口创建用户
            const registerResult = await post('login/registUser', contactPayload, { brand: ProjectBrand.LUSHAIR }) as any;

            if (registerResult && (registerResult.userId || registerResult.customerId)) {
                console.log('[UserSync] 老后端注册成功，同步到新后端:', registerResult.userId || registerResult.customerId);

                // 5. 注册成功后，同步到新后端
                // 处理老后端返回的数据格式（可能是 customerDO 或 responseMap）
                const userData = registerResult.userId ? registerResult : {
                    userId: registerResult.customerId || registerResult.userId,
                    ...registerResult,
                };

                await post('user/sync', userData, { brand: ProjectBrand.LUSHAIR_NEW });
                userInfoResponse = registerResult;
            } else {
                console.error('[UserSync] 老后端注册失败:', registerResult);
            }
        }
    } else {
        console.log('[UserSync] 新后端找到用户:', userInfoResponse.userId);
    }

    return userInfoResponse;
};

const persistSession = async (contactPayload: Record<string, string>, clerkToken?: string) => {
    // 如果有 Clerk token，使用它注册到后端
    if (clerkToken) {
        try {
            const registerResult = await registerWithClerkToken(clerkToken, contactPayload);
            if (registerResult.success) {
                // 注册成功后，从新后端 Vercel 数据库获取完整用户信息（支持兜底逻辑）
                const userInfoResponse = await getUserInfoWithFallback(contactPayload);
                // 合并用户信息
                Object.assign(userStore.userInfo, userInfoResponse, contactPayload);
                uni.setStorageSync('userInfo', userStore.userInfo);
                const userId = userInfoResponse?.userId || (userStore.userInfo as { userId?: string }).userId;
                if (userId) setUserIdToApp(userId);
            } else {
                throw new Error(registerResult.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Clerk registration error:', error);
            // Clerk 注册失败，清除 Clerk session
            clearClerkSession();
            throw error;
        }
    } else {
        // 无 Clerk token 时，直接从新后端获取用户信息（Clerk 用户已在后端创建，支持兜底逻辑）
        const userInfoResponse = await getUserInfoWithFallback(contactPayload);
        // 合并用户信息
        Object.assign(userStore.userInfo, userInfoResponse, contactPayload);
        uni.setStorageSync('userInfo', userStore.userInfo);
        const userId = userInfoResponse?.userId || (userStore.userInfo as { userId?: string }).userId;
        if (userId) setUserIdToApp(userId);
    }

    uni.showToast({
        title: t('auth.sendCode.verificationSuccess'),
        icon: 'success',
        duration: 500,
    });

    setTimeout(() => {
        uni.switchTab({ url: '/pages/index/home' });
    }, 450);
};

const handlePhoneVerification = async (captcha: string) => {
    // 1. 先验证验证码
    await post('login/verify', {
        phone: phone.value,
        countryCode: countryCode.value,
        captcha,
    });

    // 2. 验证成功后，创建或获取 Clerk 用户
    const clerkResult = await createClerkUserAfterVerification(
        phone.value,
        'phone',
        countryCode.value
    );

    // 3. 使用新后端完成登录流程（无论是否有 token）
    await persistSession({ phone: phone.value }, clerkResult.token);
};

const handleEmailVerification = async (captcha: string) => {
    // 1. 先验证验证码（使用新API）
    await post('login/verifyByEmail', {
        email: email.value,
        captcha,
    }, { brand: ProjectBrand.LUSHAIR_NEW });

    // 2. 验证成功后，创建或获取 Clerk 用户
    const clerkResult = await createClerkUserAfterVerification(
        email.value,
        'email'
    );

    // 3. 使用新后端完成登录流程（无论是否有 token）
    await persistSession({ email: email.value }, clerkResult.token);
};

const handleNext = async () => {
    const code = verificationCode.value.join('');
    if (code.length !== 4) {
        uni.showToast({ title: t('auth.sendCode.enterCompleteCode'), icon: 'none' });
        return;
    }
    if (isLoading.value) return;

    isLoading.value = true;
    try {
        if (type.value === 'phone') {
            await handlePhoneVerification(code);
        } else if (type.value === 'email') {
            await handleEmailVerification(code);
        }
    } catch (error) {
        console.error('验证失败:', error);
        clearCode();
        triggerShake();
    } finally {
        isLoading.value = false;
    }
};

const handleResend = async () => {
    if (!canResend.value) return;

    try {
        uni.showLoading({ title: t('auth.sendCode.sending'), mask: true });
        if (type.value === 'email') {
            await sendEmailCaptcha(email.value);
        } else {
            await sendPhoneCaptcha(countryCode.value, phone.value);
        }
        uni.hideLoading();
        uni.showToast({ title: t('auth.sendCode.codeResent'), icon: 'none', duration: 1500 });
        startResendCountdown();
        clearCode();
    } catch (error) {
        uni.hideLoading();
        console.error('重发验证码失败:', error);
    }
};

const isCodeComplete = computed(() => verificationCode.value.every((d) => d !== '') && !isLoading.value);

watch(
    () => verificationCode.value.join(''),
    (code) => {
        if (code.length === 4 && !isLoading.value) {
            nextTick(() => handleNext());
        }
    }
);

onLoad((options) => {
    pushType.value = (options?.pushType === '1' ? '1' : '0') as AuthPushType;
    type.value = options?.type === 'phone' ? 'phone' : 'email';
    email.value = decodeURIComponent(options?.email || '');
    phone.value = decodeURIComponent(options?.phone || '');
    countryCode.value = decodeURIComponent(options?.countryCode || '');
    inviteCode.value = decodeURIComponent(options?.inviteCode || '');
    startResendCountdown(60);
});
</script>

<template>
    <view class="send-code-page auth-flow-page">
        <AuthStepProgress :step="2" />

        <view class="content">
            <view class="auth-header send-code-header">
                <text class="auth-title">{{ t('auth.sendCode.title') }}</text>
                <text class="auth-subtitle">{{ subtitleText }}</text>
            </view>

            <view class="verification-section">
                <text class="auth-label">{{ t('auth.sendCode.verificationCode') }}</text>
                <view
                    class="code-input-container"
                    :class="{ shake: shakeError }"
                    @paste="handlePaste"
                >
                    <view
                        v-for="(digit, index) in verificationCode"
                        :key="index"
                        class="code-input-box"
                        :class="{ filled: digit !== '', focused: focusIndex === index }"
                    >
                        <input
                            :ref="setInputRef(index)"
                            :value="verificationCode[index]"
                            :focus="focusIndex === index"
                            type="number"
                            inputmode="numeric"
                            maxlength="1"
                            class="code-input"
                            :disabled="isLoading"
                            @input="handleCodeInput(index, $event)"
                            @keydown="handleKeydown(index, $event)"
                        />
                    </view>
                </view>

                <view class="resend-row">
                    <text class="resend-hint">{{ t('auth.sendCode.didNotReceive') }}</text>
                    <text
                        class="resend-action"
                        :class="{ disabled: !canResend }"
                        @click="handleResend"
                    >
                        {{
                            resendSeconds > 0
                                ? t('auth.sendCode.resendIn', { seconds: resendSeconds })
                                : t('auth.sendCode.resend')
                        }}
                    </text>
                </view>
            </view>
        </view>

        <view class="button-container">
            <button class="back-button" :disabled="isLoading" @click="goBack">
                {{ t('auth.sendCode.back') }}
            </button>
            <button
                class="next-button"
                :class="{ active: isCodeComplete, loading: isLoading }"
                :disabled="!isCodeComplete"
                @click="handleNext"
            >
                {{ isLoading ? t('auth.sendCode.verifying') : t('auth.sendCode.next') }}
            </button>
        </view>
    </view>
</template>

<style scoped lang="scss">
.send-code-page {
    width: 100vw;
    min-height: 100vh;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    padding: 0 16px;
    box-sizing: border-box;
}

.content {
    flex: 1;
    padding-top: 32px;
}

.send-code-header {
    margin-bottom: 48px;
}

.verification-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.code-input-container {
    display: flex;
    gap: 16px;
    justify-content: stretch;

    &.shake {
        animation: shake 0.45s ease;
    }
}

@keyframes shake {
    0%,
    100% {
        transform: translateX(0);
    }
    20%,
    60% {
        transform: translateX(-6px);
    }
    40%,
    80% {
        transform: translateX(6px);
    }
}

.code-input-box {
    flex: 1;
    height: 52px;
    background-color: #f7f7f7;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;

    &.filled,
    &.focused {
        border-color: #6b21c8;
        background-color: #fff;
        box-shadow: 0 0 0 2px rgba(107, 33, 200, 0.12);
    }
}

.code-input {
    width: 100%;
    height: 100%;
    text-align: center;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #1a1228;
    background: transparent;
    border: none;
    outline: none;
}

.resend-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
}

.resend-hint {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 13px;
    line-height: 1.5;
    color: #4a4060;
}

.resend-action {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    color: #6b21c8;

    &.disabled {
        color: #999;
    }
}

.button-container {
    display: flex;
    gap: 16px;
    padding-bottom: 34px;
}

.back-button {
    flex: 1;
    min-height: 48px;
    background-color: #fff;
    border: 1.5px solid rgba(107, 33, 200, 0.18);
    border-radius: 12px;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b21c8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s ease;

    &:disabled {
        opacity: 0.5;
    }
}

.next-button {
    flex: 1;
    min-height: 48px;
    background-color: #e8e4f4;
    border: none;
    border-radius: 12px;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;

    &.active {
        background-color: #6b21c8;
    }

    &.loading {
        opacity: 0.85;
    }

    &:disabled {
        cursor: not-allowed;
    }
}
</style>
