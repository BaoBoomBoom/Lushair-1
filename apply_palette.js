const fs = require('fs');
const path = './src/pages/trichoscan/advanced-result-v2.vue';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
    // Primary (Slate Blue / s-500)
    { from: /#8E71F1/ig, to: '#6B3CEE' },
    // Secondary (Light Slate Blue / s-100)
    { from: /#C4B5FD/ig, to: '#E2D9FF' },
    { from: /#E2D9FF/ig, to: '#E2D9FF' }, // in case
    // Yellow (y-500)
    { from: /#FCD34D/ig, to: '#FFD819' },
    { from: /rgba\(252,\s*211,\s*77/ig, to: 'rgba(255, 216, 25' }, // yellow rgba
    // Light Backgrounds for cards (s-50)
    { from: /#F5F3FF/ig, to: '#F3F1FF' },
    // Light Backgrounds for buttons (s-100)
    { from: /#EAE5FF/ig, to: '#E2D9FF' },

    // Neutrals based on palette (N-900, N-500, N-400, N-50, N-100)
    { from: /#333333/ig, to: '#111827' },
    { from: /#666666/ig, to: '#6B7280' },
    { from: /#7a7a7a/ig, to: '#9CA3AF' },
    { from: /#F8F8F8/ig, to: '#F9FAFB' },
    { from: /#F8F9FA/ig, to: '#F3F4F6' },

    // Also replace any old #6739c6 from the navbar/icons to match the new slate blue
    { from: /#6739c6/ig, to: '#6B3CEE' }
];

replacements.forEach(r => {
    content = content.replace(r.from, r.to);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Palette applied successfully.');
