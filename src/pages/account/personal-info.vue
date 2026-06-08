<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import AccountSubLayout from '@/components/layout/AccountSubLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';

const { t } = useI18n();
const userStore = useUserStore();
const { userInfo } = userStore;

const convertGenderToString = (genderNum: number): string => {
    switch (genderNum) {
        case 1: return 'Male';
        case 2: return 'Female';
        default: return 'Other';
    }
};

const convertStringToGender = (genderStr: string): number => {
    switch (genderStr) {
        case 'Male': return 1;
        case 'Female': return 2;
        default: return 0;
    }
};

const normalizeCity = (region?: string) => {
    const value = region?.trim() || '';
    return value === 'Earth' ? '' : value;
};

const form = reactive({
    name: userInfo.name || '',
    gender: convertGenderToString(userInfo.gender),
    birthday: userInfo.dob || '',
    city: normalizeCity(userInfo.region),
});
const submitting = ref(false);

onMounted(() => {
    form.name = userInfo.name || '';
    form.gender = convertGenderToString(userInfo.gender);
    form.birthday = userInfo.dob || '';
    form.city = normalizeCity(userInfo.region);
});

const genderOptions = ['Male', 'Female', 'Other'];
const genderIndex = ref(genderOptions.findIndex((g) => g === form.gender));

function onGenderChange(e: any) {
    genderIndex.value = e.detail.value;
    form.gender = genderOptions[genderIndex.value];
}

const minDate = '1900-01-01';
const maxDate = new Date().toISOString().split('T')[0];

function onBirthdayChange(e: any) {
    form.birthday = e.detail.value;
}

const displayBirthday = computed(() => {
    if (!form.birthday) return t('profile.birthday');
    const d = new Date(form.birthday);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
});

const saveDisabled = computed(() => submitting.value || !form.name.trim() || !form.birthday);

function saveChanges() {
    if (saveDisabled.value) return;
    submitting.value = true;

    userStore.updateUserInfo({
        name: form.name,
        gender: convertStringToGender(form.gender),
        dob: form.birthday,
        region: form.city.trim(),
    }).then((response: any) => {
        submitting.value = false;
        if (response.success) {
            uni.showToast({ title: t('success'), icon: 'success' });
            uni.navigateBack();
        } else {
            uni.showToast({ title: response.message || t('error'), icon: 'none' });
        }
    }).catch(() => {
        submitting.value = false;
        uni.showToast({ title: t('error'), icon: 'none' });
    });
}
</script>

<template>
    <AccountSubLayout :title="t('profile.personalInfo')">
        <view class="shell-card">
            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.name') }}</text>
                <input v-model="form.name" class="shell-input" :placeholder="t('profile.namePlaceholder')" />
            </view>

            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.gender') }}</text>
                <picker mode="selector" :range="genderOptions" :value="genderIndex" @change="onGenderChange">
                    <view class="shell-picker">
                        <text>{{ t(`profile.gender${form.gender}`) }}</text>
                        <TablerIcon name="chevron-down" :size="16" color="#6B21C8" />
                    </view>
                </picker>
            </view>

            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.birthday') }}</text>
                <picker mode="date" :value="form.birthday" :start="minDate" :end="maxDate" @change="onBirthdayChange">
                    <view class="shell-picker">
                        <text>{{ displayBirthday }}</text>
                        <TablerIcon name="calendar" :size="16" color="#6B21C8" />
                    </view>
                </picker>
            </view>

            <view class="shell-form-field">
                <text class="shell-form-label">{{ t('profile.city') }}</text>
                <input
                    v-model="form.city"
                    class="shell-input"
                    :placeholder="t('profile.cityPlaceholder')"
                />
                <text class="shell-form-hint">{{ t('profile.cityHint') }}</text>
            </view>
        </view>

        <template #footer>
            <button class="shell-btn" :disabled="saveDisabled" @click="saveChanges">
                {{ t('profile.saveChanges') }}
            </button>
        </template>
    </AccountSubLayout>
</template>

<style scoped lang="scss">
.shell-btn:disabled {
    opacity: 0.55;
}
</style>
