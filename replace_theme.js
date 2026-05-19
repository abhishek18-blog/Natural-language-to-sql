const fs = require('fs');
const path = require('path');

const files = [
  'src/app/components/MainApp.tsx',
  'src/app/components/Sidebar.tsx',
  'src/app/components/ConverterPanel.tsx',
  'src/app/components/Login.tsx',
  'src/app/components/Signup.tsx'
];

const replacements = [
  { regex: /bg-\[\#09090b\]/g, replacement: 'bg-white dark:bg-[#09090b]' },
  { regex: /bg-zinc-950/g, replacement: 'bg-zinc-50 dark:bg-zinc-950' },
  { regex: /bg-zinc-900/g, replacement: 'bg-zinc-100 dark:bg-zinc-900' },
  { regex: /bg-zinc-800/g, replacement: 'bg-zinc-200 dark:bg-zinc-800' },
  { regex: /border-zinc-800/g, replacement: 'border-zinc-300 dark:border-zinc-800' },
  { regex: /border-zinc-700/g, replacement: 'border-zinc-400 dark:border-zinc-700' },
  { regex: /text-zinc-100/g, replacement: 'text-black dark:text-zinc-100' },
  { regex: /text-zinc-200/g, replacement: 'text-zinc-800 dark:text-zinc-200' },
  { regex: /text-zinc-300/g, replacement: 'text-zinc-700 dark:text-zinc-300' },
  { regex: /text-zinc-400/g, replacement: 'text-zinc-600 dark:text-zinc-400' },
  { regex: /text-white/g, replacement: 'text-black dark:text-white' },
  { regex: /bg-indigo-500/g, replacement: 'bg-purple-600 dark:bg-indigo-500' },
  { regex: /text-indigo-400/g, replacement: 'text-purple-600 dark:text-indigo-400' },
  { regex: /text-indigo-500/g, replacement: 'text-purple-600 dark:text-indigo-500' },
  { regex: /ring-indigo-500/g, replacement: 'ring-purple-600 dark:ring-indigo-500' },
  { regex: /from-indigo-500/g, replacement: 'from-purple-600 dark:from-indigo-500' },
  { regex: /from-indigo-400/g, replacement: 'from-purple-500 dark:from-indigo-400' },
  { regex: /to-indigo-400/g, replacement: 'to-purple-500 dark:to-indigo-400' },
  { regex: /shadow-indigo-500/g, replacement: 'shadow-purple-600 dark:shadow-indigo-500' },
  { regex: /border-indigo-500/g, replacement: 'border-purple-600 dark:border-indigo-500' },
];

files.forEach(file => {
  const filePath = path.join(__dirname, 'frontend', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath}, does not exist`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});
