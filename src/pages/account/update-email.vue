<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';

const { t } = useI18n();

const step = ref<1 | 2>(1);
const email = ref('');
const code = ref(['', '', '', '']);
const loading = ref(false);

const codeRefs = ref<(HTMLInputElement | null)[]>([]);

const sendCode = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        uni.showToast({ title: t('invalidEmail'), icon: 'none' });
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
        uni.showToast({ title: t('incompleteCode'), icon: 'none' });
        return;
    }
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
        uni.showToast({
            title: t('success'),
            icon: 'success',
            duration: 1500,
            success: () => setTimeout(() => uni.navigateBack(), 1500),
        });
    }, 800);
};

watch(code, (v) => {
    if (step.value === 2 && v.every((c) => c.length === 1)) verifyCode();
});
</script>

<template>
    <AccountSubLayout :title="t('profile.updateEmail')">
        <view class="shell-card">
            <template v-if="step === 1">
                <text class="shell-form-hint">{{ t('profile.enterEmailTip') }}</text>
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.email') }}</text>
                    <input v-model="email" class="shell-input" placeholder="emailaddress@provider.com" />
                </view>
            </template>

            <template v-else>
                <text class="shell-form-hint">{{ t('profile.enterCodeTip') }}</text>
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.verificationCode') }}</text>
                    <view class="shell-code-row">
                        <input
                            v-for="(_, i) in 4"
                            :key="i"
                            ref="codeRefs"
                            v-model="code[i]"
                            class="shell-code-box"
                            type="number"
                            maxlength="1"
                            @input="handleCodeInput(i)"
                            @keydown="handleKeydown($event, i)"
                        />
                    </view>
                </view>
            </template>
        </view>

        <template #footer>
            <button
                v-if="step === 1"
                class="shell-btn"
                :disabled="loading"
                @click="sendCode"
            >
                {{ t('profile.sendCode') }}
            </button>
            <button
                v-else
                class="shell-btn"
                :disabled="loading"
                @click="verifyCode"
            >
                {{ t('profile.verify') }}
            </button>
        </template>
    </AccountSubLayout>
</template>

<style scoped lang="scss">
.shell-btn:disabled {
    opacity: 0.55;
}
</style>
