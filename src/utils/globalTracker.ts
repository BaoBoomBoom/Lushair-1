import { useGlobalStore } from '../stores/globalStore'

// 全局数据追踪器
export class GlobalTracker {
  private static instance: GlobalTracker
  private _globalStore: ReturnType<typeof useGlobalStore> | null = null
  
  // 私有构造函数
  private constructor() {}
  
  // 单例模式
  public static getInstance(): GlobalTracker {
    if (!GlobalTracker.instance) {
      GlobalTracker.instance = new GlobalTracker()
    }
    return GlobalTracker.instance
  }
  
  // 延迟获取 globalStore，确保 Pinia 已经初始化
  private get globalStore(): ReturnType<typeof useGlobalStore> {
    if (!this._globalStore) {
      try {
        this._globalStore = useGlobalStore()
      } catch (error) {
        console.error('获取 globalStore 失败，Pinia 可能尚未初始化:', error)
        throw new Error('Pinia 未初始化，请确保在使用 GlobalTracker 前初始化 Pinia')
      }
    }
    return this._globalStore
  }
  
  // 追踪页面访问
  public trackScreen(pageName: string): void {
    this.globalStore.recordScreenVisit(pageName)
  }
  
  // 追踪功能使用
  public trackFeature(featureName: string): void {
    this.globalStore.recordFeatureUsage(featureName)
  }
  
  // 追踪每日签到
  public trackDailyCheckIn(): boolean {
    return this.globalStore.recordDailyCheckIn()
  }
  
  // 追踪扫描操作
  public trackScan(): void {
    this.globalStore.recordScan()
  }
  
  // 追踪 API 请求
  public trackApiRequest(success: boolean, responseTime: number): void {
    this.globalStore.recordApiRequest(success, responseTime)
  }
  
  // 设置临时数据
  public setTempData(key: string, value: any): void {
    this.globalStore.setTempData(key, value)
  }
  
  // 获取临时数据
  public getTempData(key: string): any {
    return this.globalStore.getTempData(key)
  }
  
  // 清除临时数据
  public clearTempData(key?: string): void {
    this.globalStore.clearTempData(key)
  }
  
  // 获取设备信息
  public getDeviceInfo(): any {
    return this.globalStore.globalState.deviceInfo
  }
  
  // 获取用户活动信息
  public getUserActivity(): any {
    return this.globalStore.globalState.userActivity
  }
  
  // 获取连续打卡天数
  public getConsecutiveCheckInDays(): number {
    return this.globalStore.consecutiveCheckInDays
  }
  
  // 检查网络状态
  public isNetworkConnected(): boolean {
    return this.globalStore.isNetworkConnected
  }
  
  // 获取网络类型
  public getNetworkType(): string {
    return this.globalStore.globalState.networkStatus.networkType
  }
}

// 不要在这里立即创建实例，而是导出一个懒加载的 getter
let _globalTrackerInstance: GlobalTracker | null = null;

export const getGlobalTracker = (): GlobalTracker => {
  if (!_globalTrackerInstance) {
    _globalTrackerInstance = GlobalTracker.getInstance()
  }
  return _globalTrackerInstance
}

// 添加 Vue 混入，自动追踪页面访问
// 注意：在确保 Pinia 已初始化的地方使用
export const trackingMixin = {
  onLoad(options: any) {
    try {
      // 使用当前页面路径作为页面名称
      // @ts-ignore
      const pagePath = this.$scope?.route || 'unknown-page'
      // 延迟获取 tracker 实例
      setTimeout(() => {
        getGlobalTracker().trackScreen(pagePath)
      }, 100)
    } catch (error) {
      console.error('记录页面访问失败:', error)
    }
  }
}

// 网络请求拦截器
// 注意：在确保 Pinia 已初始化的地方调用此函数
export const setupApiTracker = () => {
  try {
    // 保存原始的 uni.request 方法
    const originalRequest = uni.request
    
    // 重写 uni.request 方法
    // @ts-ignore - 忽略类型错误，实际运行时没问题
    uni.request = function(options: any) {
      const startTime = Date.now()
      
      // 记录成功和失败
      const successCallback = options.success
      const failCallback = options.fail
      
      options.success = function(res: any) {
        const responseTime = Date.now() - startTime
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300
        
        try {
          getGlobalTracker().trackApiRequest(isSuccess, responseTime)
        } catch (error) {
          console.error('记录 API 请求失败:', error)
        }
        
        if (successCallback) {
          successCallback(res)
        }
      }
      
      options.fail = function(err: any) {
        const responseTime = Date.now() - startTime
        
        try {
          getGlobalTracker().trackApiRequest(false, responseTime)
        } catch (error) {
          console.error('记录 API 请求失败:', error)
        }
        
        if (failCallback) {
          failCallback(err)
        }
      }
      
      // 调用原始方法
      return originalRequest(options)
    }
    
    // 监听网络状态变化
    uni.onNetworkStatusChange(function(res) {
      try {
        const { isConnected, networkType } = res
        const globalStore = useGlobalStore()
        globalStore.updateNetworkStatus(isConnected, networkType)
      } catch (error) {
        console.error('更新网络状态失败:', error)
      }
    })
  } catch (error) {
    console.error('设置 API 追踪器失败:', error)
  }
} 