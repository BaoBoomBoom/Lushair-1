<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';

const { t } = useI18n();

const step = ref(1);
const phone = ref('');
const code = ref(['', '', '', '']);

const sendCode = () => {
    if (!/^\d{6,15}$/.test(phone.value)) {
        uni.showToast({ title: t('profile.invalidPhone'), icon: 'none' });
        return;
    }
    step.value = 2;
};

const verifyCode = () => {
    const finalCode = code.value.join('');
    if (finalCode.length < 4) {
        uni.showToast({ title: t('profile.incompleteCode'), icon: 'none' });
        return;
    }

    uni.showToast({
        title: t('profile.success'),
        icon: 'success',
        duration: 1500,
        success() {
            setTimeout(() => {
                uni.navigateBack();
            }, 1500);
        },
    });
};
</script>

<template>
    <AccountSubLayout :title="t('profile.updatePhone')">
        <view class="shell-card">
            <template v-if="step === 1">
                <text class="shell-form-hint">{{ t('profile.enterPhoneTip') }}</text>
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.countryCode') }}</text>
                    <vue-tel-input v-model="phone" />
                </view>
            </template>

            <template v-else>
                <text class="shell-form-hint">{{ t('profile.enterCodeTipPhone') }}</text>
                <view class="shell-form-field">
                    <text class="shell-form-label">{{ t('profile.verificationCode') }}</text>
                    <view class="shell-code-row">
                        <input
                            v-for="(c, index) in code"
                            :key="index"
                            v-model="code[index]"
                            maxlength="1"
                            type="number"
                            class="shell-code-box"
                        />
                    </view>
                </view>
            </template>
        </view>

        <template #footer>
            <button v-if="step === 1" class="shell-btn" @click="sendCode">
                {{ t('profile.sendCode') }}
            </button>
            <button v-else class="shell-btn" @click="verifyCode">
                {{ t('profile.verify') }}
            </button>
        </template>
    </AccountSubLayout>
</template>

<style scoped lang="scss">
:deep(.vue-tel-input) {
    border: 1px solid #e8e4f4;
    border-radius: 12px;
    background: #fff;
    min-height: 48px;
}

:deep(.vue-tel-input:focus-within) {
    border-color: #6b21c8;
    box-shadow: 0 0 0 2px rgba(107, 33, 200, 0.1);
}
</style>
