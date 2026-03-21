import fs from 'fs';

fs.copyFileSync('public/icon-192.png', 'public/icon-192-maskable.png');
fs.copyFileSync('public/icon-512.png', 'public/icon-512-maskable.png');
console.log('Icons copied successfully');
