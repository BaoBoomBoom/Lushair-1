<script setup lang="ts">
import { computed } from 'vue';
import { TABLER_ICONS, type TablerIconName } from './tabler-icons';

const props = withDefaults(
    defineProps<{
        name: TablerIconName | string;
        size?: number;
        color?: string;
        strokeWidth?: number;
    }>(),
    {
        size: 20,
        color: '#6b21c8',
        strokeWidth: 1.75,
    }
);

const iconDef = computed(() => TABLER_ICONS[props.name as TablerIconName]);
</script>

<template>
    <svg
        v-if="iconDef"
        class="tabler-icon"
        :width="size"
        :height="size"
        :viewBox="iconDef.viewBox || '0 0 24 24'"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            v-for="(d, i) in iconDef.paths"
            :key="i"
            :d="d"
            :stroke="iconDef.fill ? 'none' : color"
            :fill="iconDef.fill ? color : 'none'"
            :stroke-width="iconDef.fill ? 0 : strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
</template>

<style scoped>
.tabler-icon {
    flex-shrink: 0;
    display: block;
}
</style>
