// 为request模块提供类型声明
declare module '../../utils/request' {
  interface RequestOptions {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    header?: Record<string, string>;
    [key: string]: any;
  }

  export function request(options: RequestOptions): Promise<any>;
  export function get(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>): Promise<any>;
  export function post(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>): Promise<any>;

  const api: {
    request: typeof request;
    get: typeof get;
    post: typeof post;
    baseURL: string;
  };

  export default api;
} 