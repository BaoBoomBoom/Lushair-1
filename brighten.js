const fs = require('fs');
const path = './src/pages/trichoscan/advanced-result-v2.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Overall page brightness: Page background from #F9FAFB to #FFFFFF
content = content.replace(/background-color:\s*#F9FAFB;/gi, 'background-color: #FFFFFF;');
content = content.replace(/background:\s*#F9FAFB;/gi, 'background: #FFFFFF;');

// 2. Trend scroll brightness: #F3F4F6 to #FFFFFF with a subtle soft shadow
content = content.replace(/background:\s*#F3F4F6;/gi, 'background: #FFFFFF; /* was F3F4F6 */\n  box-shadow: 0 4px 14px rgba(107, 60, 238, 0.05);');

// 3. Make lines brighter!
// The trend lines are currently #E2D9FF. Let's make them bright Purple-500 (#A855F7).
content = content.replace(/\.line-connector\.scalp\s*\{\s*background-color:\s*#E2D9FF;\s*\}/g, '.line-connector.scalp {\n  background-color: #A855F7;\n}');
content = content.replace(/\.chart-point\.scalp\s*\.point-dot\s*\{\s*background-color:\s*#E2D9FF;\s*border:\s*2px\s*solid\s*#111827;\s*\}/g, '.chart-point.scalp .point-dot {\n  background-color: #FFFFFF;\n  border: 2px solid #A855F7;\n}');
// And the legend color:
content = content.replace(/\.legend-color\.scalp\s*\{\s*background-color:\s*#E2D9FF;\s*\}/g, '.legend-color.scalp {\n  background-color: #A855F7;\n}');

// 4. Update the stroke of the bell curve (which was using Slate Blue #6B3CEE, let's change to the extremely bright Purple-500 #A855F7)
// It was stroke="#6B3CEE" in advanced-result-v2.vue
content = content.replace(/stroke="#6B3CEE"/g, 'stroke="#A855F7" stroke-width="2"');

// 5. Update overall shadows to be brighter and colored instead of stark black.
content = content.replace(/box-shadow: 0 2px 4px rgba\(0, 0, 0, 0\.25\);/g, 'box-shadow: 0 8px 24px rgba(107, 60, 238, 0.08);');
content = content.replace(/box-shadow: 0 2px 9px rgba\(0, 0, 0, 0\.18\);/g, 'box-shadow: 0 4px 16px rgba(107, 60, 238, 0.06);'); // header shadow

// 6. Ensure default border color for point dot is also lighter, instead of #111827 (Black) 
content = content.replace(/border:\s*2px\s*solid\s*#111827;/g, 'border: 2px solid #6B3CEE;');

fs.writeFileSync(path, content, 'utf8');
console.log('Brightness optimized successfully.');
