/**
 * env.ts
 * 环境变量辅助工具，用于在代码中获取当前环境信息
 */

// 声明 process 类型，解决 TypeScript 错误
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production';
    APP_MODE?: string;
    APP_ENV?: string;
    API_URL?: string;
    APP_VERSION?: string;
  }
};

// 环境类型
export enum EnvType {
  Development = 'development',
  Production = 'production',
}

// 环境变量帮助类
class EnvHelper {
  /**
   * 判断当前是否为开发环境
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === EnvType.Development;
  }

  /**
   * 判断当前是否为生产环境
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === EnvType.Production;
  }

  /**
   * 获取当前环境类型
   */
  getEnvType(): EnvType {
    return this.isDevelopment() ? EnvType.Development : EnvType.Production;
  }

  /**
   * 获取环境名称
   */
  getEnvName(): string {
    return this.isDevelopment() ? '开发环境' : '生产环境';
  }

  /**
   * 获取API基础URL
   */
  getApiBaseUrl(): string {
    return process.env.API_URL || 'https://union.lushair.cn/api';
  }

  /**
   * 获取应用版本号
   */
  getAppVersion(): string {
    return process.env.APP_VERSION || '0.0.0';
  }

  /**
   * 获取环境标识（用于调试等场景）
   */
  getEnvLabel(): string {
    return process.env.APP_ENV || (this.isDevelopment() ? 'dev' : 'prod');
  }

  /**
   * 打印环境信息，方便调试
   */
  logEnvInfo(): void {
    console.group('环境信息');
    console.log('环境类型:', this.getEnvName());
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('API URL:', this.getApiBaseUrl());
    console.log('应用版本:', this.getAppVersion());
    console.log('环境标识:', this.getEnvLabel());
    console.groupEnd();
  }
}

// 导出单例
export const env = new EnvHelper();

// 默认导出
export default env; 