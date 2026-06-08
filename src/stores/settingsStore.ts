import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AppSettings {
  // 应用主题设置
  theme: 'light' | 'dark' | 'system'
  // 语言设置
  language: string
  // 通知设置
  notifications: {
    enabled: boolean
    reminderTime: string // HH:mm 格式
    scanReminder: boolean
    hairCareReminder: boolean
    productReminder: boolean
  }
  // 隐私设置
  privacy: {
    shareData: boolean
    analyticsEnabled: boolean
  }
  // 显示设置
  display: {
    showScoreCard: boolean
    showWarnings: boolean
    showHighlights: boolean
  }
  // 单位设置
  units: {
    temperature: 'celsius' | 'fahrenheit'
    length: 'cm' | 'inch'
  }
  // 自动同步设置
  sync: {
    enabled: boolean
    frequency: 'realtime' | 'daily' | 'weekly'
    lastSyncTime: string // ISO 日期字符串
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // 默认设置
  const defaultSettings: AppSettings = {
    theme: 'system',
    language: 'zh-CN',
    notifications: {
      enabled: true,
      reminderTime: '09:00',
      scanReminder: true,
      hairCareReminder: true,
      productReminder: true
    },
    privacy: {
      shareData: false,
      analyticsEnabled: true
    },
    display: {
      showScoreCard: true,
      showWarnings: true,
      showHighlights: true
    },
    units: {
      temperature: 'celsius',
      length: 'cm'
    },
    sync: {
      enabled: true,
      frequency: 'daily',
      lastSyncTime: new Date().toISOString()
    }
  }

  const settings = ref<AppSettings>(defaultSettings)

  // 初始化设置
  const initSettings = () => {
    const storedSettings = uni.getStorageSync('appSettings')
    if (storedSettings) {
      // 合并存储的设置和默认设置，确保新添加的设置项也有默认值
      settings.value = { ...defaultSettings, ...storedSettings }
    }
    // 持久化合并后的设置
    saveSettings()
  }

  // 更新设置
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    // 深度合并设置
    settings.value = deepMerge(settings.value, newSettings)
    // 保存到本地存储
    saveSettings()
  }

  // 保存设置到本地存储
  const saveSettings = () => {
    uni.setStorageSync('appSettings', settings.value)
  }

  // 重置设置为默认值
  const resetSettings = () => {
    settings.value = { ...defaultSettings }
    saveSettings()
  }

  // 更新特定设置项
  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    settings.value[key] = value
    saveSettings()
  }

  // 获取特定设置项
  const getSetting = <K extends keyof AppSettings>(
    key: K
  ): AppSettings[K] => {
    return settings.value[key]
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

  // 导出设置
  const exportSettings = (): string => {
    return JSON.stringify(settings.value)
  }

  // 导入设置
  const importSettings = (settingsJson: string) => {
    try {
      const importedSettings = JSON.parse(settingsJson)
      // 验证导入的设置是否符合预期结构
      if (validateSettings(importedSettings)) {
        settings.value = { ...defaultSettings, ...importedSettings }
        saveSettings()
        return true
      }
      return false
    } catch (error) {
      console.error('导入设置失败:', error)
      return false
    }
  }

  // 验证设置对象的结构
  const validateSettings = (obj: any): obj is AppSettings => {
    // 这里可以添加更详细的验证逻辑
    return obj && typeof obj === 'object'
  }

  // 监听系统主题变化
  const setupThemeListener = () => {
    // 根据平台实现主题监听
    // 示例：
    // uni.onThemeChange(({ theme }) => {
    //   if (settings.value.theme === 'system') {
    //     // 更新应用主题
    //   }
    // })
  }

  return {
    settings,
    initSettings,
    updateSettings,
    resetSettings,
    updateSetting,
    getSetting,
    exportSettings,
    importSettings,
    setupThemeListener
  }
}) 