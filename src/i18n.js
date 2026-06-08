import en from './locale/en.json'
import zhHans from './locale/zh-Hans.json'
import zhHantHK from './locale/zh-Hant-HK.json'
import zhHantTW from './locale/zh-Hant-TW.json'
import ja from './locale/ja.json'
import ko from './locale/ko.json'
import es from './locale/es.json'
import fr from './locale/fr.json'
import pt from './locale/pt.json'
import it from './locale/it.json'
import ar from './locale/ar.json'
import th from './locale/th.json'
import vi from './locale/vi.json'
import id from './locale/id.json'
import fil from './locale/fil.json'
import pl from './locale/pl.json'
import de from './locale/de.json'
import ru from './locale/ru.json'

// 导入VueI18n相关依赖
import { createI18n } from 'vue-i18n'

// 获取系统语言
const getSystemLocale = () => {
  // 尝试从本地存储获取用户之前选择的语言
  const savedLocale = uni.getStorageSync('locale')
  if (savedLocale) {
    return savedLocale
  }

  // 默认使用英文
  return 'en'
}

// 更新tabbar文本的方法
export const updateTabBarTexts = (i18nInstance) => {
  try {
    const i18nToUse = i18nInstance || i18n;

    // 确保i18n实例已初始化
    if (!i18nToUse || !i18nToUse.global) {
      console.warn('i18n实例未初始化，无法更新tabbar');
      return;
    }

    // 添加延迟确保tabbar已经创建
    setTimeout(() => {
      const tabs = [
        { index: 0, textKey: 'tabbar.home', icon: '/static/tabbar/home.svg', iconActive: '/static/tabbar/home-active.svg' },
        { index: 1, textKey: 'tabbar.scan', icon: '/static/tabbar/scan.svg', iconActive: '/static/tabbar/scan-active.svg' },
        { index: 2, textKey: 'tabbar.aiChat', icon: '/static/tabbar/chat.svg', iconActive: '/static/tabbar/chat-active.svg' },
        { index: 3, textKey: 'tabbar.routine', icon: '/static/tabbar/routine.svg', iconActive: '/static/tabbar/routine-active.svg' },
        { index: 4, textKey: 'tabbar.hair', icon: '/static/tabbar/hair.svg', iconActive: '/static/tabbar/hair-active.svg' },
      ];

      tabs.forEach(({ index, textKey, icon, iconActive }) => {
        uni.setTabBarItem({
          index,
          text: i18nToUse.global.t(textKey),
          iconPath: icon,
          selectedIconPath: iconActive,
        });
      });

      console.log('Tabbar文本已更新为:', i18nToUse.global.locale.value);
    }, 200); // 延迟200ms执行
  } catch (e) {
    console.error('更新tabbar文本失败:', e);
  }
}

// 创建i18n实例
const i18n = createI18n({
  locale: getSystemLocale(),
  legacy: false, // 使用组合式API
  globalInjection: true, // 全局注册$t方法
  fallbackLocale: 'en', // 回退语言为英文
  messages: {
    en,
    'zh-Hans': zhHans,
    'zh-Hant-HK': zhHantHK,
    'zh-Hant-TW': zhHantTW,
    ja,
    ko,
    es,
    fr,
    pt,
    it,
    ar,
    th,
    vi,
    id,
    fil,
    pl,
    de,
    ru
  }
})

// 通知App语言变更的方法
const notifyAppLanguageChange = (locale) => {
  try {
    // 如果在App环境中，调用原生方法
    if (typeof uni.getSystemInfoSync !== 'undefined') {
      const systemInfo = uni.getSystemInfoSync();
      if (systemInfo.platform !== 'devtools') {
        // 尝试调用原生方法
        if (typeof window !== 'undefined') {
          if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.languageChange) {
            window.webkit.messageHandlers.languageChange.postMessage({ locale });
          } else if (window.android && window.android.onLanguageChange) {
            window.android.onLanguageChange(locale);
          }
        }
      }
    }

    console.log('Language change notified to app:', locale);
  } catch (error) {
    console.error('Failed to notify app about language change:', error);
  }
}

// 设置语言的方法
export const setLocale = (locale) => {
  // 更新i18n实例的语言
  i18n.global.locale.value = locale

  // 保存到本地存储
  uni.setStorageSync('locale', locale)

  // 更新tabbar文本
  updateTabBarTexts(i18n)

  // 触发语言变更事件
  uni.$emit('localeChange', locale)

  // 通知App语言变更
  notifyAppLanguageChange(locale)
}

// 获取当前语言
export const getLocale = () => {
  return i18n.global.locale.value
}

// 创建实例后立即尝试更新tabbar
setTimeout(() => {
  updateTabBarTexts(i18n);
}, 500); // 给足够时间让应用初始化完成

export default i18n 