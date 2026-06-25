// 请求封装与类型定义
import { getApiConfig, getApiUrl, ProjectBrand, getCurrentProjectBrand } from './apiConfig';
import { getClerkToken } from './clerk';

const getUni = () => (globalThis as any).uni;

const showToast = (title: string) => {
  const uniRef = getUni();
  if (uniRef && typeof uniRef.showToast === 'function') {
    uniRef.showToast({
      title,
      icon: 'none',
      duration: 2000
    });
  } else {
    console.warn(title);
  }
};

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  brand?: ProjectBrand; // 新增：指定项目品牌
  timeout?: number; // 新增：自定义超时时间
  [key: string]: any;
}

// 接口响应数据类型
interface ApiResponse {
  code: number;
  data?: any;
  message?: string;
  [key: string]: any;
}

// 封装uni.request，统一处理接口请求
export const request = (options: RequestOptions) => {
  return new Promise((resolve, reject) => {
    // 自动根据环境变量选择品牌，如果没有指定则使用当前配置的品牌
    const brand = options.brand || getCurrentProjectBrand();
    const apiConfig = getApiConfig(brand);

    // 拼接完整的URL
    let url: string;
    if (/^(http|https):\/\//.test(options.url)) {
      // 如果已经是完整URL，就不加前缀
      url = options.url;
    } else if (options.url.startsWith('/ai-api')) {
      // 运行时检测是否在 iOS Bundle (GCDWebServer) 环境下
      const _isLocalBundle = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.protocol === 'file:');
      const AI_SERVER_BASE = 'http://43.156.213.63:5011';

      if (_isLocalBundle) {
        // 如果是本地环境，直接连服务器
        url = AI_SERVER_BASE + options.url.replace('/ai-api', '');
      } else {
        // 如果是 AI 接口代理路径，直接使用相对路径，让 Vite 代理拦截
        url = options.url;
      }
    } else {
      // 使用配置的API服务
      url = getApiUrl(options.url, brand);
    }

    const uniRef = getUni();

    // 获取 Clerk Token 并添加到请求头
    const clerkToken = getClerkToken();
    const headers = {
      ...apiConfig.headers,
      ...options.header,
      ...(clerkToken ? { 'Authorization': `Bearer ${clerkToken}` } : {}),
    };

    const method = options.method || 'GET';
    const data = options.data || {};

    if (uniRef && typeof uniRef.request === 'function') {
      uniRef.request({
        url,
        method,
        data,
        header: headers,
        timeout: options.timeout || apiConfig.timeout, // 优先使用options中的超时配置
        success: (res: any) => {
          // API响应格式统一处理
          if (res.statusCode === 200) {
            // 确保响应数据是对象类型
            const responseData = res.data as ApiResponse;

            if (responseData.code === 0 || responseData.code === 200) {
              // 请求成功，返回数据
              resolve(responseData.data);
            } else {
              // 业务错误
              showToast(responseData.message || '请求失败');
              reject(responseData);
            }
          } else {
            // HTTP状态码错误
            showToast(`请求失败(${res.statusCode})`);
            reject(res);
          }
        },
        fail: (err: any) => {
          // 网络错误等
          showToast('网络异常，请稍后重试');
          reject(err);
        }
      });
      return;
    }

    const controller = new AbortController();
    const timeoutMs = options.timeout || apiConfig.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let finalUrl = url;
    let body: BodyInit | undefined;

    if (method === 'GET' && data && Object.keys(data).length > 0) {
      const params = new URLSearchParams(data).toString();
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}${params}`;
    } else if (method !== 'GET') {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = JSON.stringify(data);
    }

    fetch(finalUrl, {
      method,
      headers,
      body,
      signal: controller.signal
    })
      .then(async (res) => {
        if (res.status !== 200) {
          showToast(`请求失败(${res.status})`);
          reject(res);
          return;
        }
        const responseData = (await res.json()) as ApiResponse;
        if (responseData.code === 0 || responseData.code === 200) {
          resolve(responseData.data);
          return;
        }
        showToast(responseData.message || '请求失败');
        reject(responseData);
      })
      .catch((err) => {
        showToast('网络异常，请稍后重试');
        reject(err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  });
};

// 导出其他便捷方法
export const get = (url: string, data: any = {}, options: Omit<RequestOptions, 'url' | 'method' | 'data'> = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
};

export const post = (url: string, data: any = {}, options: Omit<RequestOptions, 'url' | 'method' | 'data'> = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
};

// 新增：Siyuejia brand dedicated methodology
export const siyuejiaRequest = (options: RequestOptions) => {
  return request({
    ...options,
    brand: ProjectBrand.SIYUEJIA
  });
};

export const siyuejiaPost = (url: string, data: any = {}, options: Omit<RequestOptions, 'url' | 'method' | 'data'> = {}) => {
  return post(url, data, {
    ...options,
    brand: ProjectBrand.SIYUEJIA
  });
};

export default {
  request,
  get,
  post,
  siyuejiaRequest,
  siyuejiaPost,
  ProjectBrand
};
