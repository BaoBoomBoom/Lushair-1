import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post } from '../utils/request'

export interface UserInfo {
  userId: string
  name: string
  avatar: string // 用户头像链接
  gender: number
  age: number 
  dob: string // 生日日期
  phone: string
  email: string
  region: string
  scalpHealth: string
  follicleHealth: string
  hairHealth: string
  totalScore: number
  weekProgress: number
  hairPoints: number
  checkTimes: number
  invitationCode: string
}

export interface UserResponse {
  userId: string
  name: string
  avatar: string // 用户头像链接
  gender: number
  age: number
  dob: string
  region: string
  scalpHealth: string
  follicleHealth: string
  hairHealth: string
  totalScore: number
  weekProgress: number
  hairPoints: number
  checkTimes: number
  invitationCode: string
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo>({
    userId: '',
    name: '<First Name>',
    avatar: '',
    gender: 0,
    age: 0,
    dob: '',
    phone: '',
    email: '',
    region: 'Earth',
    scalpHealth: '--',
    follicleHealth: '--',
    hairHealth: '--',
    totalScore: 0,
    weekProgress: 0,
    hairPoints: 0,
    checkTimes: 0,
    invitationCode: '',
    apiCustomer: undefined,
    apiKey: undefined
  })

    // 更新本地用户信息
    const updateLocalUserInfo = (info: Partial<UserInfo>) => {
      const { avatar: _ignored, ...rest } = info
      Object.assign(userInfo.value, rest)
      userInfo.value.avatar = ''
      uni.setStorageSync('userInfo', userInfo.value)
    }
  

  // 更新用户信息
  const updateUserInfo = async (updateData: Partial<UserInfo>) => {
    try {
      // 确保请求中包含userId
      const requestData = {
        userId: userInfo.value.userId,
        ...updateData
      }
      
      // 调用后端接口更新用户信息
      const response = await post('user/update', requestData) 
      updateLocalUserInfo(updateData);
        
      console.log('用户信息已更新:', userInfo.value)
      
      return {
        success: true,
        data: userInfo.value
      }
    } catch (error) {
      console.error('更新用户信息出错:', error)
      return {
        success: false,
        message: '更新用户信息出错',
        error
      }
    }
  }

  // 从服务器获取用户信息
  const fetchUserInfo = async (userId: string) => {
    try {
      const response = await post('user/info', { userId })
      const userData = response as UserResponse
      updateLocalUserInfo(userData)
      return userData
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果请求失败，尝试从本地存储获取
      const localUserInfo = uni.getStorageSync('userInfo')
      if (localUserInfo) {
        updateLocalUserInfo(localUserInfo)
        return localUserInfo
      }
      return null
    }
  }

  // 初始化用户信息
  const initUserInfo = () => {
    const localUserInfo = uni.getStorageSync('userInfo')
    if (localUserInfo) {
      updateLocalUserInfo(localUserInfo)
    }
    userInfo.value.avatar = ''
  }

  // 清除用户信息
  const clearUserInfo = () => {
    userInfo.value = {
      userId: '',
      name: '<First Name>',
      avatar: '',
      gender: 0,
      age: 0,
      dob: '',
      phone: '',
      email: '',
      region: '',
      scalpHealth: '--',
      follicleHealth: '--',
      hairHealth: '--',
      totalScore: 0,
      weekProgress: 0,
      hairPoints: 0,
      checkTimes: 0,
      invitationCode: '',
      apiCustomer: undefined,
      apiKey: undefined
    }
    uni.removeStorageSync('userInfo')
  }

  return {
    userInfo,
    updateUserInfo,
    fetchUserInfo,
    initUserInfo,
    clearUserInfo
  }
}) 