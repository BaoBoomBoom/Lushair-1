<script setup lang="ts">
defineProps<{
    step: 1 | 2;
}>();
</script>

<template>
    <view class="auth-progress">
        <view class="auth-progress-bar">
            <view class="auth-progress-step" :class="{ completed: step > 1, active: step === 1 }" />
            <view class="auth-progress-step" :class="{ active: step === 2 }" />
        </view>
    </view>
</template>

<style scoped lang="scss">
.auth-progress {
    display: flex;
    justify-content: center;
    padding: 48px 0 0;
}

.auth-progress-bar {
    display: flex;
    gap: 8px;
    align-items: center;
}

.auth-progress-step {
    width: 16px;
    height: 4px;
    background-color: #e8e4f4;
    border-radius: 2px;
    transition: width 0.25s ease, background-color 0.25s ease;

    &.active {
        width: 48px;
        background-color: #6b21c8;
    }

    &.completed {
        background-color: #8b3fe8;
    }
}
</style>
