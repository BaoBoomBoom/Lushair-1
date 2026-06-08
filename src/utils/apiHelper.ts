/**
 * API辅助工具
 * 提供简化的API调用方法，避免硬编码URL
 */

import { getApiUrl as getApiUrlFromConfig, ProjectBrand } from './apiConfig';

/**
 * 获取当前项目品牌的所有接口URL
 * @param endpoint 接口端点
 */
export function getApiUrl(endpoint: string): string {
  return getApiUrlFromConfig(endpoint, ProjectBrand.SIYUEJIA);
}

/**
 * 获取Lushair品牌接口的完整URL
 * @param endpoint 接口端点
 */
export function getLushairApiUrl(endpoint: string): string {
  return getApiUrlFromConfig(endpoint, ProjectBrand.LUSHAIR);
}

/**
 * 获取Siyuejia品牌接口的完整URL
 * @param endpoint 接口端点
 */
export function getSiyuejiaApiUrl(endpoint: string): string {
  return getApiUrlFromConfig(endpoint, ProjectBrand.SIYUEJIA);
}

/**
 * 获取用户相关接口URL
 */
export const UserApiUrls = {
  LOGIN: () => getApiUrl('user/login'),
  REGISTER: () => getApiUrl('user/register'),
  GET_DETECTION_RECORDS: () => getApiUrl('user/getDetectionRecordList'),
  GET_PROFILE: () => getApiUrl('user/profile'),
  UPDATE_PROFILE: () => getApiUrl('user/updateProfile')
};

/**
 * 获取分析相关接口URL
 */
export const AnalysisApiUrls = {
  LATEST_SUMMARY: () => getApiUrl('analyse/latest/summary'),
  GET_RECORDS: () => getApiUrl('analyse/records'),
  UPLOAD_IMAGE: () => getApiUrl('analyse/upload'),
  GO_HISTORY: () => getApiUrl('analyse/goHis'),
  DETAIL: () => getApiUrl('analyse/detail')
};

/**
 * 获取产品相关接口URL
 */
export const ProductApiUrls = {
  RECOMMEND: () => getApiUrl('product/recommend'),
  GET_DETAILS: () => getApiUrl('product/details'),
  GET_LIST: () => getApiUrl('product/list')
};

/**
 * 获取AI相关接口URL
 */
export const AiApiUrls = {
  CHAT: () => getApiUrl('ai/chat'),
  CHAT_STREAM: () => getApiUrl('ai/chat/stream')
};

/**
 * 便捷的fetch包装器
 */
export const apiFetch = {
  /**
   * 调用AI聊天接口
   */
  async aiChat(data: any): Promise<Response> {
    return fetch(AiApiUrls.CHAT(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },

  /**
   * 调用API接口
   */
  async api(endpoint: string, data: any, options: RequestInit = {}): Promise<Response> {
    const url = getApiUrl(endpoint);
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });
  }
};

/**
 * 便捷的uni.request包装器
 * Convenient uni.request wrapper
 */
export const apiRequest = {
  /**
   * 调用API接口（使用uni.request）
   * Call API endpoint (using uni.request)
   * @param endpoint 接口端点 API endpoint
   * @param data 请求数据 Request data
   * @param options 可选配置 Optional configuration
   */
  async api(endpoint: string, data: any, options?: { token?: string; timeout?: number }): Promise<any> {
    const url = getApiUrl(endpoint);
    const authToken = options?.token || uni.getStorageSync('token');
    const timeout = options?.timeout; // 自定义超时时间 Custom timeout

    return new Promise((resolve, reject) => {
      const requestConfig: any = {
        url,
        method: 'POST',
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        success: (res: any) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            uni.showToast({
              title: `请求失败(${res.statusCode})`,
              icon: 'none',
              duration: 2000
            });
            reject(res);
          }
        },
        fail: (err: any) => {
          console.error('Request failed:', err);
          uni.showToast({
            title: '网络异常，请稍后重试',
            icon: 'none',
            duration: 2000
          });
          reject(err);
        }
      };

      // 如果指定了超时时间，添加到配置中
      // If timeout is specified, add to config
      if (timeout) {
        requestConfig.timeout = timeout;
      }

      uni.request(requestConfig);
    });
  }
};

export default {
  getApiUrl,
  getLushairApiUrl,
  getSiyuejiaApiUrl,
  UserApiUrls,
  AnalysisApiUrls,
  ProductApiUrls,
  AiApiUrls,
  apiFetch,
  apiRequest
};