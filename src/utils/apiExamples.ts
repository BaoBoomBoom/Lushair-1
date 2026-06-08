/**
 * API使用示例
 * 展示如何使用新的API配置系统调用不同的服务
 */

import { post, siyuejiaPost } from './request';
import { getApiUrl, getApiBaseUrl, API_ENDPOINTS, ProjectBrand } from './apiConfig';

// 示例1: 调用Lushair品牌API (https://union.lushair.ai/api)
export const exampleLushairApiCalls = {
  // 获取用户检测记录
  async getUserDetectionRecords(userId: string) {
    return await post(API_ENDPOINTS.USER.GET_DETECTION_RECORDS, {
      userId
    });
  },

  // 获取最新分析摘要
  async getLatestAnalysisSummary() {
    return await post(API_ENDPOINTS.ANALYSIS.LATEST_SUMMARY, {});
  },

  // 获取产品推荐
  async getProductRecommendations(userId: string) {
    return await post(API_ENDPOINTS.PRODUCT.RECOMMEND, {
      userId
    });
  }
};

// 示例2: 调用Siyuejia品牌API (https://union.lushair.cn/api)
export const exampleSiyuejiaApiCalls = {
  // 发送AI聊天消息
  async sendAiChatMessage(message: string, chatId: string, userId: string) {
    return await siyuejiaPost(API_ENDPOINTS.AI.CHAT, {
      content: message,
      chatId,
      userId,
      language: 'zh-CN'
    });
  },

  // 使用fetch直接调用Siyuejia服务
  async sendAiChatWithFetch(message: string, chatId: string, userId: string) {
    const aiUrl = getApiUrl(API_ENDPOINTS.AI.CHAT, ProjectBrand.SIYUEJIA);
    
    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        chatId,
        userId,
        language: 'zh-CN'
      })
    });

    if (!response.ok) {
      throw new Error('Siyuejia服务请求失败');
    }

    return await response.json();
  }
};

// 示例3: 获取API配置信息
export const exampleApiConfig = {
  // 获取Lushair品牌基础URL
  getLushairApiBaseUrl() {
    return getApiBaseUrl(ProjectBrand.LUSHAIR);
  },

  // 获取Siyuejia品牌基础URL
  getSiyuejiaApiBaseUrl() {
    return getApiBaseUrl(ProjectBrand.SIYUEJIA);
  },

  // 构建完整的API URL
  buildApiUrl(endpoint: string, brand: ProjectBrand = ProjectBrand.SIYUEJIA) {
    return getApiUrl(endpoint, brand);
  }
};

// 示例4: 在组件中使用
export const exampleComponentUsage = `
// 在Vue组件中使用示例

import { post, aiPost, API_ENDPOINTS } from '@/utils/request';

// 在setup()中
const fetchUserData = async () => {
  try {
    // 调用主服务
    const userRecords = await post(API_ENDPOINTS.USER.GET_DETECTION_RECOMMENDATIONS, {
      userId: userStore.userInfo.userId
    });
    
    // 调用AI服务
    const aiResponse = await aiPost(API_ENDPOINTS.AI.CHAT, {
      content: '你好',
      chatId: 'chat123',
      userId: userStore.userInfo.userId
    });
    
    console.log('用户记录:', userRecords);
    console.log('AI响应:', aiResponse);
  } catch (error) {
    console.error('API调用失败:', error);
  }
};
`;

// 导出所有示例
export default {
  exampleLushairApiCalls,
  exampleSiyuejiaApiCalls,
  exampleApiConfig,
  exampleComponentUsage
};