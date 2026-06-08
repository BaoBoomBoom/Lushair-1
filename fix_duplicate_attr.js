const fs = require('fs');
const path = './src/pages/trichoscan/advanced-result-v2.vue';
let content = fs.readFileSync(path, 'utf8');

// Fix duplicate stroke-width="2" attribute issue caused by previous script
content = content.replace(/stroke="#A855F7" stroke-width="2"/g, 'stroke="#A855F7"');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed duplicate attribute issue.');
