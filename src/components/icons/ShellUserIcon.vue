<script setup lang="ts">
import TablerIcon from '@/components/icons/TablerIcon.vue';

withDefaults(
    defineProps<{
        /** header = ti-user-circle; account/chat = ti-user in purple circle */
        variant?: 'header' | 'account' | 'chat';
    }>(),
    { variant: 'account' }
);
</script>

<template>
    <view v-if="variant === 'header'" class="shell-user-icon shell-user-icon--header">
        <TablerIcon name="user-circle" :size="22" color="#6B21C8" />
    </view>
    <view v-else class="shell-user-icon" :class="`shell-user-icon--${variant}`">
        <TablerIcon name="user" :size="variant === 'account' ? 30 : 16" color="#6B21C8" />
    </view>
</template>

<style scoped lang="scss">
.shell-user-icon--header {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.shell-user-icon--account {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(107, 33, 200, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
}

.shell-user-icon--chat {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(107, 33, 200, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
</style>
