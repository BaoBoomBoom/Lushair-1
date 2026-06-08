/**
 * 状态栏高度 Composable
 * Status Bar Height Composable
 * 
 * 用于获取手机状态栏高度，统一管理状态栏适配逻辑
 * Used to get the phone's status bar height, centrally manage status bar adaptation logic
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useStatusBar } from '@/composables/useStatusBar';
 * const { statusBarHeight, headerPaddingStyle, contentMarginStyle } = useStatusBar();
 * </script>
 * 
 * <template>
 *   <view class="header" :style="headerPaddingStyle(15)">...</view>
 *   <view class="content" :style="contentMarginStyle(60)">...</view>
 * </template>
 * ```
 */

// 获取系统状态栏高度（只执行一次，缓存结果）
// Get system status bar height (executed only once, cache the result)
const systemInfo = uni.getSystemInfoSync();
const statusBarHeightValue = systemInfo.statusBarHeight || 44;

export function useStatusBar() {
    /**
     * 状态栏高度（像素）
     * Status bar height (in pixels)
     */
    const statusBarHeight = statusBarHeightValue;

    /**
     * 获取带有 paddingTop 的样式对象
     * Get style object with paddingTop
     * @param basePadding - 基础 padding 值（像素），会与状态栏高度相加
     * @returns 样式对象 { paddingTop: 'Xpx' }
     */
    const headerPaddingStyle = (basePadding: number = 0) => ({
        paddingTop: (basePadding + statusBarHeight) + 'px'
    });

    /**
     * 获取带有 marginTop 的样式对象
     * Get style object with marginTop
     * @param baseMargin - 基础 margin 值（像素），会与状态栏高度相加
     * @returns 样式对象 { marginTop: 'Xpx' }
     */
    const contentMarginStyle = (baseMargin: number = 0) => ({
        marginTop: (baseMargin + statusBarHeight) + 'px'
    });

    /**
     * 获取带有 top 的样式对象
     * Get style object with top
     * @param baseTop - 基础 top 值（像素），会与状态栏高度相加
     * @returns 样式对象 { top: 'Xpx' }
     */
    const topPositionStyle = (baseTop: number = 0) => ({
        top: (baseTop + statusBarHeight) + 'px'
    });

    return {
        statusBarHeight,
        headerPaddingStyle,
        contentMarginStyle,
        topPositionStyle
    };
}
