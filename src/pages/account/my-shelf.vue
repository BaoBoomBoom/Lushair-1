<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import TitleLayout from '@/components/layout/TitleLayout.vue';

const { t } = useI18n();
</script>

<template>
    <TitleLayout :title="t('profile.myShelfTitle')">
         todo
    </TitleLayout>
</template>
