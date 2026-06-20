import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 根据当前的构建模式来确定环境
    // mode 可能的值: 'development', 'production'
    const env = loadAppEnv(mode);

    console.log('当前构建模式:', mode);
    console.log('当前环境变量:', env);

    return {
        base: './',
        plugins: [
            uni(),
            legacy({
                targets: ['defaults', 'not IE 11'], //web配置=>启动HTTPS协议 (不勾选) //勾选了，本地启动项目会报错
            }),
        ],
        define: {
            // 在此处定义全局常量，会在构建时被替换
            // 注意：字符串需要包含引号，例如：JSON.stringify('development')
            'process.env.APP_MODE': JSON.stringify(mode),
            'process.env.APP_ENV': JSON.stringify(mode === 'production' ? 'prod' : 'dev'),
            'process.env.API_URL': JSON.stringify(env.BASE_URL),
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
            // 项目品牌配置 - 可以通过环境变量设置
            'globalThis.PROJECT_BRAND': JSON.stringify(env.PROJECT_BRAND),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'), // 让 @ 指向 src 目录
            },
        },
        server: {
            // 5175 is often taken by genpulse-site on localhost (IPv6); use 5176 for Lushair preview
            port: 5176,
            strictPort: true,
            open: '/#/pages/landing/intro',
            host: true,
            allowedHosts: [
                'localhost',
                '127.0.0.1',
                'lushair-universe.local',
                '.ngrok-free.app',
                '.ngrok.app',
                '.ngrok.io',
                '.loca.lt',
                '.trycloudflare.com',
            ],
            proxy: {
                '/api/lushair': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                },
                '/ai-api': {
                    target: 'http://43.156.213.63:5011',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/ai-api/, ''),
                },
                '/hair-loss-api': {
                    target: 'http://43.156.213.63:5000',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/hair-loss-api/, ''),
                },
                '/log': {
                    target: 'http://115.159.42.189:5000',
                    changeOrigin: true,
                    rewrite: (path) => path
                },
                '/hair-loss-log': {
                    target: 'http://43.156.213.63:5000',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/hair-loss-log/, '/log')
                },
            },
        },
    };
});

// 加载环境变量的辅助函数
function loadAppEnv(mode: string) {
    // 获取项目品牌配置
    const projectBrand = process.env.PROJECT_BRAND || 'siyuejia';

    // 根据品牌确定API基础URL
    const getApiBaseUrl = (brand: string) => {
        if (mode === 'development' && brand === 'lushair') {
            return '/api/lushair';
        }
        switch (brand) {
            case 'siyuejia':
                return 'https://union.lushair.cn/api';
            case 'lushair':
            default:
                return 'https://tool.lushair.net/api';
        }
    };

    return {
        MODE: mode,
        DEV: mode === 'development',
        PROD: mode === 'production',
        PROJECT_BRAND: projectBrand,
        BASE_URL: getApiBaseUrl(projectBrand),
    };
}

// export default defineConfig({
//   base: "./",
//   plugins: [
//     uni(),
//     legacy({
//       targets: ['defaults', 'not IE 11'] //web配置=>启动HTTPS协议 (不勾选) //勾选了，本地启动项目会报错
//     })
//   ]
// });

// import { defineConfig } from 'vite'
// import uni from "@dcloudio/vite-plugin-uni";
// import path from 'path'

// export default defineConfig({
//   plugins: [uni()],
//   base: './', // 🔥🔥🔥 最重要！一定是相对路径！
//   build: {
//     outDir: 'dist/build/h5', // 输出目录，随意改
//     assetsDir: 'static', // 静态资源目录
//     emptyOutDir: true,   // 打包前清空
//     rollupOptions: {
//       output: {
//         // 避免生成太多散文件，可以把静态资源合并一下
//         chunkFileNames: 'static/js/[name]-[hash].js',
//         entryFileNames: 'static/js/[name]-[hash].js',
//         assetFileNames: ({ name }) => {
//           if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
//             return 'static/img/[name]-[hash][extname]';
//           }
//           if (/\.css$/.test(name ?? '')) {
//             return 'static/css/[name]-[hash][extname]';
//           }
//           return 'static/[name]-[hash][extname]';
//         }
//       }
//     }
//   },
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'), // @符号别名
//     }
//   },
// })
