<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';

const { t } = useI18n();

const step = ref<1 | 2>(1);
const currentPw = ref('');
const newPw = ref('');
const confirmPw = ref('');
const submitting = ref(false);

const MIN_LEN = 8;

const pageSubtitle = computed(() =>
    step.value === 1 ? t('profile.changePasswordStep1Tip') : t('profile.changePasswordStep2Tip'),
);

const step1Disabled = computed(() => submitting.value || !currentPw.value.trim());

function goToStep2() {
    if (step1Disabled.value) return;
    step.value = 2;
}

function backToStep1() {
    step.value = 1;
    newPw.value = '';
    confirmPw.value = '';
}

const saveNewPassword = () => {
    if (!newPw.value || !confirmPw.value) {
        uni.showToast({ title: t('profile.passwordEmpty'), icon: 'none' });
        return;
    }
    if (newPw.value.length < MIN_LEN) {
        uni.showToast({ title: t('profile.passwordTooShort'), icon: 'none' });
        return;
    }
    if (newPw.value !== confirmPw.value) {
        uni.showToast({ title: t('profile.passwordNotMatch'), icon: 'none' });
        return;
    }

    submitting.value = true;
    setTimeout(() => {
        submitting.value = false;
        uni.showToast({
            title: t('profile.passwordChangedSuccess'),
            icon: 'success',
            duration: 1500,
            success: () => setTimeout(() => uni.navigateBack(), 1500),
        });
    }, 1200);
};
</script>

<template>
    <AccountSubLayout :title="t('profile.changePassword')" :subtitle="pageSubtitle">
        <view class="account-step-row">
            <view class="account-step-pill" :class="{ active: step >= 1, current: step === 1 }" />
            <view class="account-step-pill" :class="{ active: step >= 2, current: step === 2 }" />
        </view>

        <view class="shell-card account-form-card">
            <template v-if="step === 1">
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.currentPassword') }}</text>
                    <input
                        v-model="currentPw"
                        type="password"
                        class="shell-input"
                        :placeholder="t('profile.currentPassword')"
                    />
                </view>
            </template>

            <template v-else>
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.newPassword') }}</text>
                    <input
                        v-model="newPw"
                        type="password"
                        class="shell-input"
                        :placeholder="t('profile.newPassword')"
                    />
                    <text class="account-password-hint">{{ t('profile.passwordHint') }}</text>
                </view>

                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.confirmNewPassword') }}</text>
                    <input
                        v-model="confirmPw"
                        type="password"
                        class="shell-input"
                        :placeholder="t('profile.confirmNewPassword')"
                    />
                </view>

                <text class="account-form-link" @tap="backToStep1">{{ t('profile.reenterCurrentPassword') }}</text>
            </template>
        </view>

        <template #footer>
            <button v-if="step === 1" class="shell-btn" :disabled="step1Disabled" @click="goToStep2">
                {{ t('profile.continue') }}
            </button>
            <button v-else class="shell-btn" :disabled="submitting" @click="saveNewPassword">
                {{ t('profile.saveNewPassword') }}
            </button>
        </template>
    </AccountSubLayout>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.shell-btn:disabled {
    opacity: 0.55;
}
</style>
