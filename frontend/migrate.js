const fs = require('fs');
const path = require('path');

// 1. Move index.html
if (fs.existsSync('public/index.html')) {
  fs.renameSync('public/index.html', 'index.html');
  console.log('Moved public/index.html to index.html');
}

// 2. Update index.html
if (fs.existsSync('index.html')) {
  let html = fs.readFileSync('index.html', 'utf-8');
  html = html.replace(/%PUBLIC_URL%/g, '');
  if (!html.includes('src="/src/index.jsx"')) {
    html = html.replace('<div id="root"></div>', '<div id="root"></div>\n    <script type="module" src="/src/index.jsx"></script>');
  }
  fs.writeFileSync('index.html', html);
  console.log('Updated index.html template');
}

// 3. Rename .js to .jsx
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // If it looks like it has JSX or imports React
      if (content.includes("from 'react'") || content.includes('from "react"') || /<\w+/.test(content) || /<\//.test(content)) {
        const newPath = fullPath.replace(/\.js$/, '.jsx');
        fs.renameSync(fullPath, newPath);
        console.log(`Renamed ${fullPath} to ${newPath}`);
      }
    }
  }
}
walkDir('src');

// 4. Update process.env to import.meta.env
function updateEnv(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updateEnv(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('process.env.REACT_APP_')) {
        content = content.replace(/process\.env\.REACT_APP_/g, 'import.meta.env.REACT_APP_');
        fs.writeFileSync(fullPath, content);
        console.log(`Updated env references in ${fullPath}`);
      }
    }
  }
}
updateEnv('src');
