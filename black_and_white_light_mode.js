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

// MainApp.tsx
applyReplacements('MainApp.tsx', [
  { r: /selection:bg-purple-600 dark:bg-indigo-500\/30/g, t: 'selection:bg-slate-300 dark:bg-indigo-500/30 dark:selection:bg-indigo-500/30' },
]);

// Sidebar.tsx
applyReplacements('Sidebar.tsx', [
  // Icons & Active Text
  { r: /text-purple-600/g, t: 'text-slate-900' },
  { r: /text-purple-900/g, t: 'text-slate-900' },
  // Selected state background & border
  { r: /bg-purple-50/g, t: 'bg-slate-200' },
  { r: /border-purple-200/g, t: 'border-slate-300' },
  // Side bar accent for selected
  { r: /w-1 bg-purple-600/g, t: 'w-1 bg-slate-900' },
  // Online tag
  { r: /border border-purple-600/g, t: 'border border-slate-900' },
]);

// ConverterPanel.tsx
applyReplacements('ConverterPanel.tsx', [
  // Glowing orbs (remove color in light mode, just soft white/gray glow or hide entirely)
  { r: /from-purple-500\/10/g, t: 'from-slate-300/20' },
  { r: /bg-purple-400\/20/g, t: 'bg-slate-200/30' },
  { r: /bg-purple-300\/20/g, t: 'bg-slate-100/30' },
  // Title gradient
  { r: /from-blue-400 via-indigo-400 to-cyan-400/g, t: 'from-slate-900 via-slate-800 to-slate-900 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400' },
  // Focus ring/border on main text area
  { r: /focus-within:border-purple-600/g, t: 'focus-within:border-slate-900' },
  { r: /focus-within:shadow-\[0_0_40px_rgba\(99,102,241,0\.15\)\]/g, t: 'focus-within:shadow-[0_0_20px_rgba(0,0,0,0.05)]' },
  // Button gradient
  { r: /from-purple-600 dark:from-indigo-500 to-blue-600/g, t: 'from-slate-900 dark:from-indigo-500 to-black dark:to-blue-600' },
  { r: /hover:from-purple-500 dark:from-indigo-400 hover:to-blue-500/g, t: 'hover:from-slate-800 dark:from-indigo-400 hover:to-slate-900 dark:hover:to-blue-500' },
  { r: /shadow-purple-600/g, t: 'shadow-slate-900/20' },
  // Text icons
  { r: /text-purple-600/g, t: 'text-slate-900' },
  // Outline rings
  { r: /focus:ring-purple-600/g, t: 'focus:ring-slate-900' },
  { r: /focus:border-purple-600/g, t: 'focus:border-slate-900' },
  { r: /ring-purple-600/g, t: 'ring-slate-300' },
  { r: /bg-purple-400\/20/g, t: 'bg-slate-200' }, // For Bot Icon Wrapper
  // Chat bubble side line
  { r: /from-purple-600 dark:from-indigo-500 to-cyan-500/g, t: 'from-slate-900 dark:from-indigo-500 to-slate-600 dark:to-cyan-500' },
]);

// Shared patterns for Login/Signup
['Login.tsx', 'Signup.tsx'].forEach(file => {
  applyReplacements(file, [
    // Inputs focus
    { r: /focus:ring-purple-500\/30/g, t: 'focus:ring-slate-900/10' },
    { r: /focus:border-purple-500/g, t: 'focus:border-slate-900' },
    // Buttons
    { r: /bg-gradient-to-r from-purple-600 to-indigo-600/g, t: 'bg-slate-900 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600' },
    { r: /hover:from-purple-500 hover:to-indigo-500/g, t: 'hover:bg-slate-800 dark:hover:from-purple-500 dark:hover:to-indigo-500' },
    { r: /shadow-purple-500\/25/g, t: 'shadow-slate-900/20 dark:shadow-purple-500/25' },
    // Brand header
    { r: /text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400/g, t: 'text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-purple-400 dark:to-indigo-400' },
  ]);
});
