<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';

const { t } = useI18n();

const step = ref<1 | 2>(1);
const phone = ref('');
const code = ref(['', '', '', '']);
const loading = ref(false);
const codeRefs = ref<(HTMLInputElement | null)[]>([]);

const pageSubtitle = computed(() =>
    step.value === 1 ? t('profile.enterPhoneTip') : t('profile.enterCodeTipPhone'),
);

const sendCode = () => {
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 15) {
        uni.showToast({ title: t('profile.invalidPhone'), icon: 'none' });
        return;
    }
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
        step.value = 2;
        nextTick(() => codeRefs.value[0]?.focus());
    }, 800);
};

const handleCodeInput = (index: number) => {
    const val = code.value[index];
    if (val && index < 3) codeRefs.value[index + 1]?.focus();
};

const handleKeydown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !code.value[index] && index > 0) {
        codeRefs.value[index - 1]?.focus();
    }
};

const verifyCode = () => {
    const finalCode = code.value.join('');
    if (finalCode.length < 4) {
        uni.showToast({ title: t('profile.incompleteCode'), icon: 'none' });
        return;
    }
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
        uni.showToast({
            title: t('profile.success'),
            icon: 'success',
            duration: 1500,
            success: () => setTimeout(() => uni.navigateBack(), 1500),
        });
    }, 800);
};

const backToPhone = () => {
    step.value = 1;
    code.value = ['', '', '', ''];
};

watch(code, (v) => {
    if (step.value === 2 && v.every((c) => c.length === 1)) verifyCode();
});
</script>

<template>
    <AccountSubLayout :title="t('profile.updatePhone')" :subtitle="pageSubtitle">
        <view class="account-step-row">
            <view class="account-step-pill" :class="{ active: step >= 1, current: step === 1 }" />
            <view class="account-step-pill" :class="{ active: step >= 2, current: step === 2 }" />
        </view>

        <view class="shell-card account-form-card">
            <template v-if="step === 1">
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.phoneNumber') }}</text>
                    <vue-tel-input v-model="phone" class="account-tel-input" />
                </view>
            </template>

            <template v-else>
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.verificationCode') }}</text>
                    <view class="shell-code-row">
                        <input
                            v-for="(_, i) in 4"
                            :key="i"
                            ref="codeRefs"
                            v-model="code[i]"
                            maxlength="1"
                            type="number"
                            class="shell-code-box"
                            @input="handleCodeInput(i)"
                            @keydown="handleKeydown($event, i)"
                        />
                    </view>
                </view>
                <text class="account-form-link" @tap="backToPhone">{{ t('profile.changePhone') }}</text>
            </template>
        </view>

        <template #footer>
            <button v-if="step === 1" class="shell-btn" :disabled="loading" @click="sendCode">
                {{ t('profile.sendCode') }}
            </button>
            <button v-else class="shell-btn" :disabled="loading" @click="verifyCode">
                {{ t('profile.verify') }}
            </button>
        </template>
    </AccountSubLayout>
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.shell-btn:disabled {
    opacity: 0.55;
}

:deep(.account-tel-input.vue-tel-input) {
    border: 1px solid $shell-border;
    border-radius: 12px;
    background: $shell-bg;
    min-height: 48px;
    box-shadow: none;
}

:deep(.account-tel-input.vue-tel-input:focus-within) {
    border-color: $shell-primary;
    box-shadow: 0 0 0 2px rgba(107, 33, 200, 0.1);
}

:deep(.account-tel-input .vti__input) {
    font-size: 14px;
    color: $shell-text;
}
</style>
