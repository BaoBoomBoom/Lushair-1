/**
 * API配置文件
 * 用于管理不同环境的API地址前缀和接口配置
 */

// 项目品牌类型枚举
export enum ProjectBrand {
  LUSHAIR = 'lushair',        // Lushair品牌旧后端 (https://tool.lushair.net/api)
  LUSHAIR_NEW = 'lushair_new', // Lushair品牌新后端 (Next.js)
  SIYUEJIA = 'siyuejia'       // Siyuejia品牌 (https://union.lushair.cn/api)
}

// API配置接口
interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// API配置映射
const API_CONFIGS: Record<ProjectBrand, ApiConfig> = {
  [ProjectBrand.LUSHAIR]: {
    baseUrl: 'https://tool.lushair.net/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  },
  [ProjectBrand.LUSHAIR_NEW]: {
    // 新后端服务地址 - 根据部署环境修改
    // 本地开发: http://localhost:3001/api
    // 生产环境: 修改为实际部署地址
    baseUrl: 'https://backend.lushair.ai/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  },
  [ProjectBrand.SIYUEJIA]: {
    baseUrl: 'https://union.lushair.cn/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  }
};

// 获取当前项目品牌（可通过环境变量配置）
export function getCurrentProjectBrand(): ProjectBrand {
  // 可以通过环境变量配置当前项目品牌
  const brand = (globalThis as any).PROJECT_BRAND || 'siyuejia';
  if (brand === 'lushair') return ProjectBrand.LUSHAIR;
  if (brand === 'lushair_new') return ProjectBrand.LUSHAIR_NEW;
  return ProjectBrand.SIYUEJIA;
}

// 获取API配置
export function getApiConfig(brand: ProjectBrand = getCurrentProjectBrand()): ApiConfig {
  return API_CONFIGS[brand];
}

// 获取完整的API URL
export function getApiUrl(endpoint: string, brand: ProjectBrand = getCurrentProjectBrand()): string {
  const config = getApiConfig(brand);
  const baseUrl = config.baseUrl.replace(/\/$/, ''); // 移除末尾的斜杠
  const cleanEndpoint = endpoint.replace(/^\//, ''); // 移除开头的斜杠
  return `${baseUrl}/${cleanEndpoint}`;
}

// 获取API基础URL
export function getApiBaseUrl(brand: ProjectBrand = getCurrentProjectBrand()): string {
  return getApiConfig(brand).baseUrl;
}

// 获取API超时时间
export function getApiTimeout(brand: ProjectBrand = getCurrentProjectBrand()): number {
  return getApiConfig(brand).timeout || 10000;
}

// 获取API请求头
export function getApiHeaders(brand: ProjectBrand = getCurrentProjectBrand()): Record<string, string> {
  return getApiConfig(brand).headers || {};
}

// 常用接口端点配置
export const API_ENDPOINTS = {
  // 用户相关接口 (主服务)
  USER: {
    LOGIN: 'user/login',
    REGISTER: 'user/register',
    GET_DETECTION_RECORDS: 'user/getDetectionRecordList',
    GET_PROFILE: 'user/profile',
    UPDATE_PROFILE: 'user/updateProfile'
  },
  
  // 分析相关接口 (主服务)
  ANALYSIS: {
    LATEST_SUMMARY: 'analyse/latest/summary',
    GET_RECORDS: 'analyse/records',
    UPLOAD_IMAGE: 'analyse/upload'
  },
  
  // 产品相关接口 (主服务)
  PRODUCT: {
    RECOMMEND: 'product/recommend',
    GET_DETAILS: 'product/details',
    GET_LIST: 'product/list'
  },
  
  // AI聊天接口 (AI服务)
  AI: {
    CHAT: 'ai/chat',
    CHAT_STREAM: 'ai/chat/stream'
  }
} as const;

// 导出默认配置
export default {
  getApiConfig,
  getApiUrl,
  getApiBaseUrl,
  getApiTimeout,
  getApiHeaders,
  API_ENDPOINTS,
  ProjectBrand
};