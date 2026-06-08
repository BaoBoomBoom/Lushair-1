import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 定义全局数据类型
export interface GlobalState {
  // 应用版本信息
  appVersion: string
  // 设备信息
  deviceInfo: {
    platform: string
    brand: string
    model: string
    system: string
    uuid: string
    screenWidth: number
    screenHeight: number
  }
  // 网络状态
  networkStatus: {
    isConnected: boolean
    networkType: string
    lastConnectedTime: string
  }
  // 缓存控制
  cache: {
    clearInterval: number // 清除缓存的间隔（天）
    lastClearTime: string // 最后一次清除缓存的时间
    cacheSize: number // 当前缓存大小（KB）
  }
  // 用户操作统计
  userActivity: {
    scanCount: number // 扫描次数
    dailyCheckInDays: number // 连续打卡天数
    lastCheckInDate: string // 最后打卡日期
    totalScreenTime: number // 总屏幕时间（分钟）
  }
  // API 统计
  apiStats: {
    totalRequests: number
    failedRequests: number
    averageResponseTime: number
  }
  // 上一次会话信息
  lastSession: {
    startTime: string
    endTime: string
    duration: number // 单位：秒
    screens: string[] // 访问的页面
  }
  // 功能使用统计
  featureUsage: Record<string, number>
  // 全局标志
  flags: {
    isFirstLaunch: boolean
    hasCompletedOnboarding: boolean
    hasGrantedPermissions: boolean
    hasRatedApp: boolean
    shouldShowUpdatePrompt: boolean
  }
  // 临时数据存储
  tempData: Record<string, any>
}

// 默认全局状态
const defaultGlobalState: GlobalState = {
  appVersion: '1.0.0',
  deviceInfo: {
    platform: '',
    brand: '',
    model: '',
    system: '',
    uuid: '',
    screenWidth: 0,
    screenHeight: 0
  },
  networkStatus: {
    isConnected: true,
    networkType: 'unknown',
    lastConnectedTime: new Date().toISOString()
  },
  cache: {
    clearInterval: 7,
    lastClearTime: new Date().toISOString(),
    cacheSize: 0
  },
  userActivity: {
    scanCount: 0,
    dailyCheckInDays: 0,
    lastCheckInDate: '',
    totalScreenTime: 0
  },
  apiStats: {
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  },
  lastSession: {
    startTime: '',
    endTime: '',
    duration: 0,
    screens: []
  },
  featureUsage: {},
  flags: {
    isFirstLaunch: true,
    hasCompletedOnboarding: false,
    hasGrantedPermissions: false,
    hasRatedApp: false,
    shouldShowUpdatePrompt: false
  },
  tempData: {}
}

// 存储键名
const STORAGE_KEY = 'globalState'

export const useGlobalStore = defineStore('global', () => {
  // 全局状态
  const globalState = ref<GlobalState>({ ...defaultGlobalState })
  
  // 初始化全局状态
  const initGlobalState = () => {
    try {
      const storedState = uni.getStorageSync(STORAGE_KEY)
      if (storedState) {
        // 合并存储的数据和默认数据
        globalState.value = deepMerge(defaultGlobalState, storedState)
      }
      
      // 检查用户状态并恢复 isFirstLaunch 标志
      restoreUserState()
      
      // 更新设备信息
      updateDeviceInfo()
      
      // 如果是新的一天，处理日期相关逻辑
      handleDailyTasks()
      
      // 记录会话开始
      startNewSession()
      
      // 保存更新后的状态
      saveGlobalState()
    } catch (error) {
      console.error('初始化全局状态失败:', error)
    }
  }

  // 恢复用户状态
  const restoreUserState = () => {
    try {
      // 检查是否有用户登录信息
      const userInfo = uni.getStorageSync('userInfo')
      const token = uni.getStorageSync('token')
      const userId = uni.getStorageSync('userId')
      
      // 如果有用户信息，确保 isFirstLaunch 为 false
      if (userInfo && (token || userId)) {
        globalState.value.flags.isFirstLaunch = false
        console.log('检测到用户登录信息，已设置 isFirstLaunch 为 false')
      }
      
      // 检查是否有其他用户状态信息
      const hasUserData = userInfo || token || userId
      if (hasUserData) {
        globalState.value.flags.hasCompletedOnboarding = true
        console.log('检测到用户数据，已设置 hasCompletedOnboarding 为 true')
      }
    } catch (error) {
      console.error('恢复用户状态失败:', error)
    }
  }
  
  // 更新设备信息
  const updateDeviceInfo = () => {
    try {
      const systemInfo = uni.getSystemInfoSync()
      globalState.value.deviceInfo = {
        platform: systemInfo.platform || '',
        brand: systemInfo.brand || '',
        model: systemInfo.model || '',
        system: systemInfo.system || '',
        uuid: systemInfo.deviceId || '',
        screenWidth: systemInfo.screenWidth || 0,
        screenHeight: systemInfo.screenHeight || 0
      }
    } catch (error) {
      console.error('获取设备信息失败:', error)
    }
  }
  
  // 处理每日任务
  const handleDailyTasks = () => {
    const today = new Date().toISOString().split('T')[0]
    const lastCheckIn = globalState.value.userActivity.lastCheckInDate
    
    // 如果不是同一天
    if (lastCheckIn !== today) {
      // 如果是连续的下一天，增加连续打卡天数
      if (lastCheckIn && isConsecutiveDay(lastCheckIn, today)) {
        globalState.value.userActivity.dailyCheckInDays++
      } else if (lastCheckIn) {
        // 如果不是连续的，重置连续打卡天数
        globalState.value.userActivity.dailyCheckInDays = 0
      }
      
      // 检查是否需要清除缓存
      const lastClearTime = new Date(globalState.value.cache.lastClearTime)
      const daysSinceLastClear = Math.floor((Date.now() - lastClearTime.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceLastClear >= globalState.value.cache.clearInterval) {
        clearAppCache()
      }
    }
  }
  
  // 检查是否是连续的天数
  const isConsecutiveDay = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    
    // 重置时间部分，只比较日期
    d1.setHours(0, 0, 0, 0)
    d2.setHours(0, 0, 0, 0)
    
    // 计算相差的毫秒数并转换为天数
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays === 1
  }
  
  // 清除应用缓存
  const clearAppCache = () => {
    try {
      // 保存关键的用户状态信息
      const criticalData = {
        globalState: globalState.value,
        userInfo: uni.getStorageSync('userInfo'),
        token: uni.getStorageSync('token'),
        userId: uni.getStorageSync('userId'),
        settings: uni.getStorageSync('settings')
      }
      
      // 清除所有存储
      uni.clearStorageSync()
      
      // 恢复关键数据
      if (criticalData.globalState) {
        // 确保 isFirstLaunch 标志被正确恢复
        if (criticalData.userInfo && criticalData.userInfo.userId) {
          criticalData.globalState.flags.isFirstLaunch = false
        }
        uni.setStorageSync(STORAGE_KEY, criticalData.globalState)
      }
      
      if (criticalData.userInfo) {
        uni.setStorageSync('userInfo', criticalData.userInfo)
      }
      
      if (criticalData.token) {
        uni.setStorageSync('token', criticalData.token)
      }
      
      if (criticalData.userId) {
        uni.setStorageSync('userId', criticalData.userId)
      }
      
      if (criticalData.settings) {
        uni.setStorageSync('settings', criticalData.settings)
      }
      
      // 更新缓存状态
      globalState.value.cache.lastClearTime = new Date().toISOString()
      globalState.value.cache.cacheSize = 0
      
      // 保存当前全局状态
      uni.setStorageSync(STORAGE_KEY, globalState.value)
      
      console.log('缓存清除完成，关键数据已恢复')
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }
  
  // 开始新会话
  const startNewSession = () => {
    const now = new Date().toISOString()
    globalState.value.lastSession = {
      startTime: now,
      endTime: '',
      duration: 0,
      screens: []
    }
  }
  
  // 结束当前会话
  const endCurrentSession = () => {
    const now = new Date().toISOString()
    globalState.value.lastSession.endTime = now
    
    // 计算会话时长
    const startTime = new Date(globalState.value.lastSession.startTime).getTime()
    const endTime = new Date(now).getTime()
    const durationInSeconds = Math.floor((endTime - startTime) / 1000)
    
    globalState.value.lastSession.duration = durationInSeconds
    
    // 更新总屏幕时间
    globalState.value.userActivity.totalScreenTime += Math.floor(durationInSeconds / 60)
    
    // 保存状态
    saveGlobalState()
  }
  
  // 记录页面访问
  const recordScreenVisit = (screenName: string) => {
    if (!globalState.value.lastSession.screens.includes(screenName)) {
      globalState.value.lastSession.screens.push(screenName)
      saveGlobalState()
    }
  }
  
  // 记录功能使用
  const recordFeatureUsage = (featureName: string) => {
    if (!globalState.value.featureUsage[featureName]) {
      globalState.value.featureUsage[featureName] = 0
    }
    
    globalState.value.featureUsage[featureName]++
    saveGlobalState()
  }
  
  // 记录每日签到
  const recordDailyCheckIn = () => {
    const today = new Date().toISOString().split('T')[0]
    const lastCheckIn = globalState.value.userActivity.lastCheckInDate
    
    // 如果今天还没有打卡
    if (lastCheckIn !== today) {
      // 设置最后打卡日期为今天
      globalState.value.userActivity.lastCheckInDate = today
      
      // 如果昨天打过卡，增加连续打卡天数
      if (lastCheckIn && isConsecutiveDay(lastCheckIn, today)) {
        globalState.value.userActivity.dailyCheckInDays++
      } else {
        // 否则重置为1
        globalState.value.userActivity.dailyCheckInDays = 1
      }
      
      // 保存状态
      saveGlobalState()
      
      return true
    }
    
    return false
  }
  
  // 记录扫描操作
  const recordScan = () => {
    globalState.value.userActivity.scanCount++
    saveGlobalState()
  }
  
  // 记录 API 请求
  const recordApiRequest = (success: boolean, responseTime: number) => {
    globalState.value.apiStats.totalRequests++
    
    if (!success) {
      globalState.value.apiStats.failedRequests++
    }
    
    // 更新平均响应时间
    const currentTotal = globalState.value.apiStats.averageResponseTime * (globalState.value.apiStats.totalRequests - 1)
    globalState.value.apiStats.averageResponseTime = (currentTotal + responseTime) / globalState.value.apiStats.totalRequests
    
    saveGlobalState()
  }
  
  // 更新网络状态
  const updateNetworkStatus = (isConnected: boolean, networkType: string) => {
    globalState.value.networkStatus.isConnected = isConnected
    globalState.value.networkStatus.networkType = networkType
    
    if (isConnected) {
      globalState.value.networkStatus.lastConnectedTime = new Date().toISOString()
    }
    
    saveGlobalState()
  }
  
  // 设置临时数据
  const setTempData = (key: string, value: any) => {
    globalState.value.tempData[key] = value
    saveGlobalState()
  }
  
  // 获取临时数据
  const getTempData = (key: string) => {
    return globalState.value.tempData[key]
  }
  
  // 清除临时数据
  const clearTempData = (key?: string) => {
    if (key) {
      delete globalState.value.tempData[key]
    } else {
      globalState.value.tempData = {}
    }
    saveGlobalState()
  }
  
  // 设置应用标志
  const setFlag = (flagName: keyof GlobalState['flags'], value: boolean) => {
    globalState.value.flags[flagName] = value
    saveGlobalState()
  }
  
  // 获取应用标志
  const getFlag = (flagName: keyof GlobalState['flags']): boolean => {
    return globalState.value.flags[flagName]
  }
  
  // 保存全局状态到存储
  const saveGlobalState = () => {
    try {
      uni.setStorageSync(STORAGE_KEY, globalState.value)
    } catch (error) {
      console.error('保存全局状态失败:', error)
    }
  }
  
  // 重置全局状态
  const resetGlobalState = () => {
    globalState.value = { ...defaultGlobalState }
    saveGlobalState()
  }
  
  // 深度合并对象
  const deepMerge = (target: any, source: any): any => {
    const result = { ...target }
    
    for (const key in source) {
      if (isObject(source[key]) && isObject(target[key])) {
        result[key] = deepMerge(target[key], source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }
  
  // 判断是否为对象
  const isObject = (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item)
  }
  
  // 计算属性：是否是首次启动
  const isFirstLaunch = computed(() => globalState.value.flags.isFirstLaunch)
  
  // 计算属性：连续打卡天数
  const consecutiveCheckInDays = computed(() => globalState.value.userActivity.dailyCheckInDays)
  
  // 计算属性：是否有网络连接
  const isNetworkConnected = computed(() => globalState.value.networkStatus.isConnected)
  
  return {
    globalState,
    initGlobalState,
    updateDeviceInfo,
    restoreUserState,
    recordScreenVisit,
    recordFeatureUsage,
    recordDailyCheckIn,
    recordScan,
    recordApiRequest,
    updateNetworkStatus,
    startNewSession,
    endCurrentSession,
    setTempData,
    getTempData,
    clearTempData,
    setFlag,
    getFlag,
    resetGlobalState,
    isFirstLaunch,
    consecutiveCheckInDays,
    isNetworkConnected
  }
}) 