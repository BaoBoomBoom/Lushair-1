<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useStatusBar } from '@/composables/useStatusBar';

const { statusBarHeight } = useStatusBar();

interface Props {
    show?: boolean;
    urls?: string[];
    current?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
    show: false,
    urls: () => [],
    current: 0
});

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'change', e: any): void;
}>();

const currentIndex = ref(0);

watch(() => props.show, (val) => {
    // uni-app 不需要手动控制 body 滚动
    // 预览组件有最高的 z-index，会覆盖所有内容
});

onMounted(() => {
    // 设置初始索引
    if (typeof props.current === 'number') {
        currentIndex.value = props.current;
    } else if (typeof props.current === 'string') {
        const idx = props.urls.indexOf(props.current);
        currentIndex.value = idx >= 0 ? idx : 0;
    }
});

const close = () => {
    emit('update:show', false);
};

const handleTap = () => {
    close();
};

// 计算当前图片 URL
const currentImageUrl = computed(() => {
    return props.urls[currentIndex.value] || '';
});
</script>

<template>
    <view v-if="show" class="image-preview-overlay" @tap="close">
        <!-- 关闭按钮 - 底部中间位置 -->
        <view
            class="image-preview-close"
            :style="{ bottom: (40 + 16) + 'px' }"
            @tap.stop="close"
        >
            <view class="close-icon">×</view>
        </view>

        <!-- 图片容器 -->
        <swiper
            v-if="urls.length > 1"
            class="image-preview-swiper"
            :current="currentIndex"
            @change="(e: any) => currentIndex = e.detail.current"
            circular
        >
            <swiper-item v-for="(url, index) in urls" :key="index">
                <image
                    :src="url"
                    class="preview-image"
                    mode="aspectFit"
                    @tap.stop="handleTap"
                />
            </swiper-item>
        </swiper>

        <!-- 单张图片 -->
        <image
            v-else
            :src="urls[0] || ''"
            class="preview-image single"
            mode="aspectFit"
            @tap.stop="handleTap"
        />

        <!-- 指示器 -->
        <view v-if="urls.length > 1" class="image-preview-indicator">
            {{ currentIndex + 1 }} / {{ urls.length }}
        </view>
    </view>
</template>

<style lang="scss" scoped>
.image-preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-preview-close {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;

    &:active {
        background: rgba(255, 255, 255, 0.25);
    }
}

.close-icon {
    color: #fff;
    font-size: 32px;
    font-weight: 300;
    line-height: 1;
    margin-top: -2px;
}

.image-preview-swiper {
    width: 100%;
    height: 100%;
}

.preview-image {
    width: 100%;
    height: 100%;

    &.single {
        max-width: 100%;
        max-height: 100%;
    }
}

.image-preview-indicator {
    position: absolute;
    bottom: calc(100px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 20px;
    backdrop-filter: blur(8px);
}
</style>
