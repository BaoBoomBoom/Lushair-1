import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import i18n from './i18n.js';
import VueTelInput from 'vue-tel-input';
import 'vue-tel-input/vue-tel-input.css';

// 创建 Pinia 实例
const pinia = createPinia();
const globalOptions = {
    mode: 'auto',
};

export function createApp() {
    const app = createSSRApp(App);

    // 使用 Pinia
    app.use(pinia);
    app.use(i18n);
    app.use(VueTelInput, globalOptions);

    return {
        app,
        pinia, // 导出 pinia 实例以便在其他地方使用
    };
}
