const fs = require('fs');
const path = require('path');

const applyReplacements = (file, replacements) => {
  const filePath = path.join(__dirname, 'frontend/src/app/components', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(({ r, t }) => {
    content = content.replace(r, t);
  });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refined ${file} to Monochrome`);
};

['Login.tsx', 'Signup.tsx'].forEach(file => {
  applyReplacements(file, [
    { r: /selection:bg-purple-600/g, t: 'selection:bg-slate-300' },
    { r: /from-purple-600 dark:from-indigo-500 to-purple-600/g, t: 'from-slate-900 dark:from-indigo-500 to-black dark:to-indigo-500' },
    { r: /shadow-xl shadow-purple-600 dark:shadow-indigo-500\/20/g, t: 'shadow-xl shadow-slate-900/20 dark:shadow-indigo-500/20' },
    { r: /focus:border-purple-600/g, t: 'focus:border-slate-900' },
    { r: /text-purple-600/g, t: 'text-slate-900' },
    { r: /bg-purple-600/g, t: 'bg-slate-900' },
    { r: /hover:bg-purple-700/g, t: 'hover:bg-slate-800' },
    { r: /shadow-lg shadow-purple-600 dark:shadow-indigo-500\/20/g, t: 'shadow-lg shadow-slate-900/20 dark:shadow-indigo-500/20' },
  ]);
});
