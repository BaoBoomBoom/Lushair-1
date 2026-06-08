const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'dist/build/h5'); // 你的h5打包输出目录，比如dist
const exts = ['.html', '.js', '.css']; // 要处理的文件类型

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 把以 / 开头但不是 //（避免改到 https://xxx） 的链接，改成相对路径
    content = content.replace(/(src|href)=["']\/(?!\/)([^"']+)["']/g, (match, p1, p2) => {
        return `${p1}="${p2}"`;
    });
    content = content.replace(/url\(["']\/(?!\/)([^"')]+)["']\)/g, (match, p1) => {
        return `url("${p1}")`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 修正完成: ${filePath}`);
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            if (exts.includes(path.extname(fullPath))) {
                fixFile(fullPath);
            }
        }
    });
}

// 开始执行
walkDir(rootDir);