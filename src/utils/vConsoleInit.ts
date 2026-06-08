/**
 * vConsoleInit.ts
 * 初始化 VConsole 并只在开发环境下启用
 */

import VConsole from 'vconsole';
import logger from './logger';
import env from './env';

let vConsoleInstance: VConsole | null = null;

/**
 * 初始化 VConsole
 * @param forceEnable 是否强制启用，不考虑环境
 * @returns VConsole 实例或 null
 */
export function initVConsole(forceEnable = false): VConsole | null {
  // 检查是否已经初始化
  if (vConsoleInstance) {
    return vConsoleInstance;
  }

  // 判断是否为开发环境或强制启用
  const isDev = env.isDevelopment();
  
  // 检查是否通过 URL 参数启用
  const isEnabledByUrl = checkUrlForDebug();
  
  // 检查是否通过本地存储启用
  const isEnabledByStorage = uni.getStorageSync('vconsole_enabled') === 'true';
  
  if (isDev || forceEnable || isEnabledByUrl || isEnabledByStorage) {
    try {
      // 创建 VConsole 实例
      vConsoleInstance = new VConsole({
        theme: 'dark', // 设置主题为暗色
        maxLogNumber: 1000, // 设置最大日志数量
        onReady: () => {
          logger.info('VConsole 初始化完成');
          
          // 输出环境信息
          env.logEnvInfo();
        }
      });
      
      // 添加自定义插件或配置
      // 例如：添加一个自定义插件来显示设备信息
      addDeviceInfoPlugin();
      
      return vConsoleInstance;
    } catch (error) {
      logger.error('VConsole 初始化失败', { data: error });
      return null;
    }
  }
  
  return null;
}

/**
 * 检查 URL 参数是否包含调试标志
 * @returns 是否通过 URL 启用调试
 */
function checkUrlForDebug(): boolean {
  try {
    // 获取当前页面 URL
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    // @ts-ignore
    const options = currentPage?.$page?.options || {};
    
    // 检查是否包含 debug=true 参数
    return options.debug === 'true' || options.vconsole === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * 销毁 VConsole 实例
 */
export function destroyVConsole(): void {
  if (vConsoleInstance) {
    vConsoleInstance.destroy();
    vConsoleInstance = null;
    logger.info('VConsole 已销毁');
  }
}

/**
 * 切换 VConsole 的显示状态
 */
export function toggleVConsole(): void {
  if (vConsoleInstance) {
    // VConsole 3.x 版本中，show 是方法而不是属性
    // 检查 vConsoleInstance 是否可见
    const isVisible = (vConsoleInstance as any)._isShow || false;
    if (isVisible) {
      vConsoleInstance.hide();
    } else {
      vConsoleInstance.show();
    }
  } else {
    initVConsole(true);
    
    // 保存启用状态到本地存储
    uni.setStorageSync('vconsole_enabled', 'true');
  }
}

/**
 * 添加设备信息插件
 */
function addDeviceInfoPlugin(): void {
  if (!vConsoleInstance) return;
  
  // 获取系统信息
  try {
    const systemInfo = uni.getSystemInfoSync();
    
    // 在 console 中输出设备信息
    logger.info('===== 设备信息 =====');
    logger.info(`平台: ${systemInfo.platform}`);
    logger.info(`操作系统: ${systemInfo.system}`);
    logger.info(`设备型号: ${systemInfo.model}`);
    logger.info(`屏幕宽度: ${systemInfo.screenWidth}`);
    logger.info(`屏幕高度: ${systemInfo.screenHeight}`);
    logger.info(`窗口宽度: ${systemInfo.windowWidth}`);
    logger.info(`窗口高度: ${systemInfo.windowHeight}`);
    logger.info(`状态栏高度: ${systemInfo.statusBarHeight}`);
    logger.info(`语言: ${systemInfo.language}`);
    logger.info(`版本号: ${systemInfo.version}`);
    logger.info(`UniApp 运行环境: ${systemInfo.uniPlatform}`);
    logger.info(`环境: ${env.getEnvName()}`);
    logger.info('====================');
  } catch (error) {
    logger.error('获取设备信息失败', { data: error });
  }
}

/**
 * 在真机上通过摇晃手势启用 VConsole
 */
export function setupShakeToShowVConsole(): void {
  // 检查是否支持加速度计
  try {
    uni.onAccelerometerChange((res) => {
      const { x, y, z } = res;
      // 摇晃阈值
      const threshold = 2.0;
      
      // 检查是否有足够强度的摇晃
      if (Math.abs(x) > threshold || Math.abs(y) > threshold || Math.abs(z) > threshold) {
        // 防抖 - 记录上次摇晃时间，避免过于频繁的切换
        const now = Date.now();
        const lastShake = uni.getStorageSync('last_shake_time') || 0;
        
        if (now - lastShake > 2000) { // 2秒内不重复处理
          // 切换 VConsole 显示状态
          toggleVConsole();
          
          // 保存状态
          uni.setStorageSync('last_shake_time', now);
          
          // 震动反馈
          uni.vibrateShort();
        }
      }
    });
    
    logger.info('VConsole 摇晃手势监听已启用，摇晃设备可显示/隐藏调试面板');
  } catch (error) {
    logger.error('设置摇晃手势失败', { data: error });
  }
} 