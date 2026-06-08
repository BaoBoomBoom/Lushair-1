/**
 * logger.ts
 * 提供简单的日志工具函数，方便在任何地方使用
 */

// 日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 日志选项
export interface LogOptions {
  tag?: string;
  data?: any;
}

// 默认标签
const DEFAULT_TAG = 'App';

/**
 * 格式化日志消息
 * @param level 日志级别
 * @param message 日志消息
 * @param options 日志选项
 * @returns 格式化后的日志消息
 */
function formatLogMessage(level: LogLevel, message: string, options?: LogOptions): string {
  const tag = options?.tag || DEFAULT_TAG;
  return `[${tag}] ${message}`;
}

/**
 * 记录调试级别日志
 * @param message 日志消息
 * @param options 日志选项
 */
export function debug(message: string, options?: LogOptions): void {
  const formattedMessage = formatLogMessage(LogLevel.DEBUG, message, options);
  console.log(formattedMessage, options?.data || '');
}

/**
 * 记录信息级别日志
 * @param message 日志消息
 * @param options 日志选项
 */
export function info(message: string, options?: LogOptions): void {
  const formattedMessage = formatLogMessage(LogLevel.INFO, message, options);
  console.info(formattedMessage, options?.data || '');
}

/**
 * 记录警告级别日志
 * @param message 日志消息
 * @param options 日志选项
 */
export function warn(message: string, options?: LogOptions): void {
  const formattedMessage = formatLogMessage(LogLevel.WARN, message, options);
  console.warn(formattedMessage, options?.data || '');
}

/**
 * 记录错误级别日志
 * @param message 日志消息
 * @param options 日志选项
 */
export function error(message: string, options?: LogOptions): void {
  const formattedMessage = formatLogMessage(LogLevel.ERROR, message, options);
  console.error(formattedMessage, options?.data || '');
}

/**
 * 记录对象
 * @param obj 要记录的对象
 * @param label 对象标签
 */
export function logObject(obj: any, label: string = 'Object'): void {
  console.log(`===== ${label} =====`);
  console.log(obj);
  console.log(`=====/${label} =====`);
}

/**
 * 记录 API 请求
 * @param url 请求 URL
 * @param method 请求方法
 * @param data 请求数据
 * @param response 响应数据
 */
export function logApi(url: string, method: string, data?: any, response?: any): void {
  console.group(`API ${method} ${url}`);
  console.log('Request:', data || 'No data');
  if (response) {
    console.log('Response:', response);
  }
  console.groupEnd();
}

// 默认导出所有日志函数
export default {
  debug,
  info,
  warn,
  error,
  logObject,
  logApi
}; 