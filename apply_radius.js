const fs = require('fs');
const path = './src/pages/trichoscan/advanced-result-v2.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/border-radius:\s*2px;/g, 'border-radius: 16px;');

fs.writeFileSync(path, content, 'utf8');
console.log('Border radius updated.');
