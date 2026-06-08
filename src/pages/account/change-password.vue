<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';

const { t } = useI18n();

const currentPw = ref('');
const newPw = ref('');
const confirmPw = ref('');
const submitting = ref(false);

const MIN_LEN = 8;

const saveNewPassword = () => {
    if (!currentPw.value || !newPw.value || !confirmPw.value) {
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
        });
    }, 1200);
};
</script>

<template>
    <AccountSubLayout :title="t('profile.changePassword')">
        <view class="shell-card">
            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.currentPassword') }}</text>
                <input v-model="currentPw" type="password" class="shell-input" />
            </view>

            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.newPassword') }}</text>
                <input v-model="newPw" type="password" class="shell-input" />
            </view>

            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.confirmNewPassword') }}</text>
                <input v-model="confirmPw" type="password" class="shell-input" />
            </view>
        </view>

        <template #footer>
            <button class="shell-btn" :disabled="submitting" @click="saveNewPassword">
                {{ t('profile.saveNewPassword') }}
            </button>
        </template>
    </AccountSubLayout>
</template>

<style scoped lang="scss">
.shell-btn:disabled {
    opacity: 0.55;
}
</style>
