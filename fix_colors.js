const fs = require('fs');
const path = './src/pages/trichoscan/advanced-result-v2.vue';
let content = fs.readFileSync(path, 'utf8');

// The dark gradient score card
content = content.replace(/background:\s*linear-gradient\([^)]+#848484[^)]+\);/g, 'background: #FFFFFF;');
content = content.replace(/background:\s*radial-gradient\([^)]+\);/g, 'display: none;');
content = content.replace(/color:\s*white;/g, 'color: #333333;');
content = content.replace(/color:\s*#e0e0e0;/ig, 'color: #666666;');

// Remove text clipping from score to make it visible on white
content = content.replace(/background:\s*#ffffff;\s*-webkit-background-clip:\s*text;\s*-webkit-text-fill-color:\s*transparent;\s*background-clip:\s*text;/g, 'color: #000000; font-weight: bold;');

// Bell curve and progress bar colors
// Previous accent 1: #7622FF (Dark purple)
content = content.replace(/#7622FF/gi, '#8E71F1');
// Previous accent 2: #9FDDF2 (Light blue) -> light purple
content = content.replace(/#9FDDF2/gi, '#C4B5FD');
// Previous accent 3: #dfff60 (Lime green) -> yellow warning
content = content.replace(/#dfff60/gi, '#FCD34D');

// Make sure trend-chart-scroll has a visible background if white
content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.2\);/g, 'background: #F8F9FA;');

// Tags / status styles. The screenshots show 正常 as purple (#8E71F1), 偏低 as yellow (#FCD34D)
// We see some tags like "tags-label", "tag", etc. We'll update the tag background
content = content.replace(/background:\s*linear-gradient\([^)]+#848484[^)]+\);\s*border:\s*0\.5px\s*solid\s*#b8b8b8;/g, 'background: #8E71F1; border: none; color: white;');
content = content.replace(/color:\s*#f5f5f5;/ig, 'color: #333333;');

fs.writeFileSync(path, content, 'utf8');
console.log('Colors replaced successfully!');
