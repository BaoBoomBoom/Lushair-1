<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(
    defineProps<{
        compact?: boolean;
    }>(),
    { compact: false },
);

const { t } = useI18n();
</script>

<template>
    <text class="shell-disclaimer" :class="{ compact }">{{ t('common.screeningDisclaimer') }}</text>
</template>

<style scoped lang="scss">
.shell-disclaimer {
    display: block;
    text-align: center;
    font-size: 11.5px;
    line-height: 1.55;
    color: #8a8990;
    padding: 16px 8px 4px;
    margin-top: 8px;

    &.compact {
        padding: 12px 4px 2px;
        font-size: 11px;
    }
}
</style>
