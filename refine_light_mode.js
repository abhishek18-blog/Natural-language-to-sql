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
  console.log(`Refined ${file}`);
};

// MainApp.tsx
applyReplacements('MainApp.tsx', [
  // Change main background to slate-50
  { r: /bg-white dark:bg-\[\#09090b\]/g, t: 'bg-slate-50 dark:bg-[#09090b]' },
  // Text defaults
  { r: /text-black dark:text-zinc-100/g, t: 'text-slate-900 dark:text-zinc-100' },
  // Header background
  { r: /bg-zinc-50 dark:bg-zinc-950\/50/g, t: 'bg-white/80 dark:bg-zinc-950/50' },
  // Header border
  { r: /border-zinc-300 dark:border-zinc-800\/80/g, t: 'border-slate-200 dark:border-zinc-800/80' },
  // Role / BETA tags
  { r: /bg-zinc-200 dark:bg-zinc-800\/50/g, t: 'bg-slate-100 dark:bg-zinc-800/50' },
  { r: /border-zinc-400 dark:border-zinc-700/g, t: 'border-slate-200 dark:border-zinc-700' },
  { r: /text-zinc-600 dark:text-zinc-400/g, t: 'text-slate-500 dark:text-zinc-400' },
  { r: /text-zinc-800 dark:text-zinc-200/g, t: 'text-slate-700 dark:text-zinc-200' },
  // Theme toggle button
  { r: /bg-zinc-200 dark:bg-zinc-800/g, t: 'bg-slate-200 dark:bg-zinc-800' },
]);

// Sidebar.tsx
applyReplacements('Sidebar.tsx', [
  // Sidebar container
  { r: /bg-zinc-50 dark:bg-zinc-950/g, t: 'bg-white dark:bg-zinc-950' },
  { r: /border-zinc-300 dark:border-zinc-800\/80/g, t: 'border-slate-200 dark:border-zinc-800/80' },
  // Sidebar header sticky
  { r: /bg-zinc-50 dark:bg-zinc-950\/90/g, t: 'bg-white/90 dark:bg-zinc-950/90' },
  { r: /text-black dark:text-zinc-100/g, t: 'text-slate-900 dark:text-zinc-100' },
  // Saved count pill
  { r: /bg-zinc-100 dark:bg-zinc-900/g, t: 'bg-slate-100 dark:bg-zinc-900' },
  { r: /border-zinc-300 dark:border-zinc-800/g, t: 'border-slate-200 dark:border-zinc-800' },
  // Search input
  { r: /bg-zinc-100 dark:bg-zinc-900\/50/g, t: 'bg-slate-50 dark:bg-zinc-900/50' },
  { r: /text-zinc-800 dark:text-zinc-200/g, t: 'text-slate-900 dark:text-zinc-200' },
  { r: /placeholder-zinc-500/g, t: 'placeholder-slate-400 dark:placeholder-zinc-500' },
  // Empty history icon
  { r: /text-zinc-700/g, t: 'text-slate-400 dark:text-zinc-700' },
  // History list items
  { r: /bg-zinc-100 dark:bg-zinc-900\/30/g, t: 'bg-white dark:bg-zinc-900/30' },
  { r: /border-zinc-300 dark:border-zinc-800\/50/g, t: 'border-slate-200 dark:border-zinc-800/50' },
  { r: /hover:bg-zinc-100 dark:hover:bg-zinc-900/g, t: 'hover:bg-slate-50 dark:hover:bg-zinc-900' },
  { r: /hover:border-zinc-400 dark:hover:border-zinc-700/g, t: 'hover:border-slate-300 dark:hover:border-zinc-700' },
  // Item text
  { r: /text-zinc-700 dark:text-zinc-300/g, t: 'text-slate-700 dark:text-zinc-300' },
  { r: /text-zinc-500/g, t: 'text-slate-500 dark:text-zinc-500' },
  { r: /text-zinc-600/g, t: 'text-slate-400 dark:text-zinc-600' },
]);

// ConverterPanel.tsx
applyReplacements('ConverterPanel.tsx', [
  // Backgrounds
  { r: /bg-white dark:bg-\[\#09090b\]/g, t: 'bg-slate-50 dark:bg-[#09090b]' },
  // Glowing orbs (lighten them for light mode so they aren't overpowering)
  { r: /from-purple-600 dark:from-indigo-500\/5/g, t: 'from-purple-500/10 dark:from-indigo-500/5' },
  { r: /bg-purple-600 dark:bg-indigo-500\/10/g, t: 'bg-purple-400/20 dark:bg-indigo-500/10' },
  { r: /bg-purple-500\/10 blur-\[100px\]/g, t: 'bg-purple-300/20 dark:bg-purple-500/10 blur-[100px]' },
  // Main Textarea container
  { r: /shadow-\[0_8px_30px_rgb\(0,0,0,0\.4\)\]/g, t: 'shadow-xl shadow-purple-500/5 dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]' },
  { r: /bg-zinc-50 dark:bg-zinc-950\/60/g, t: 'bg-white dark:bg-zinc-950/60' },
  { r: /border-zinc-300 dark:border-zinc-800\/80/g, t: 'border-slate-200 dark:border-zinc-800/80' },
  { r: /text-black dark:text-zinc-100/g, t: 'text-slate-900 dark:text-zinc-100' },
  { r: /text-zinc-600 dark:text-zinc-400/g, t: 'text-slate-600 dark:text-zinc-400' },
  // Toolbar inside input
  { r: /bg-zinc-100 dark:bg-zinc-900\/80/g, t: 'bg-slate-50 dark:bg-zinc-900/80' },
  { r: /border-zinc-300 dark:border-zinc-800\/60/g, t: 'border-slate-200 dark:border-zinc-800/60' },
  // Dropdown buttons
  { r: /bg-zinc-50 dark:bg-zinc-950\/50/g, t: 'bg-white dark:bg-zinc-950/50' },
  { r: /border-zinc-300 dark:border-zinc-800/g, t: 'border-slate-200 dark:border-zinc-800' },
  { r: /hover:border-zinc-400 dark:hover:border-zinc-700/g, t: 'hover:border-slate-300 dark:hover:border-zinc-700' },
  { r: /hover:bg-zinc-200 dark:hover:bg-zinc-800\/50/g, t: 'hover:bg-slate-50 dark:hover:bg-zinc-800/50' },
  { r: /text-zinc-700 dark:text-zinc-300/g, t: 'text-slate-700 dark:text-zinc-300' },
  // Dropdown menus
  { r: /bg-zinc-100 dark:bg-zinc-900/g, t: 'bg-white dark:bg-zinc-900' },
  { r: /hover:bg-zinc-200 dark:hover:bg-zinc-800\/60/g, t: 'hover:bg-slate-50 dark:hover:bg-zinc-800/60' },
  { r: /text-zinc-800 dark:text-zinc-200/g, t: 'text-slate-800 dark:text-zinc-200' },
  // Keyboard shortcut hints
  { r: /bg-zinc-200 dark:bg-zinc-800/g, t: 'bg-slate-200 dark:bg-zinc-800' },
  // Loading pulse
  { r: /bg-zinc-50 dark:bg-zinc-950\/40/g, t: 'bg-white/80 dark:bg-zinc-950/40' },
  // Output sections (AI Response & Query)
  { r: /bg-zinc-50 dark:bg-zinc-950\/80/g, t: 'bg-white dark:bg-zinc-950/80' },
  { r: /bg-zinc-100 dark:bg-zinc-900\/40/g, t: 'bg-slate-50 dark:bg-zinc-900/40' }, // header
  { r: /bg-zinc-50 dark:bg-zinc-950/g, t: 'bg-white dark:bg-zinc-950' }, // Chat bubble & Table
  { r: /bg-zinc-100 dark:bg-zinc-900\/30/g, t: 'bg-slate-50 dark:bg-zinc-900/30' }, // Table header
  { r: /bg-zinc-100 dark:bg-zinc-900\/50/g, t: 'bg-slate-100 dark:bg-zinc-900/50' }, // Table thead
  { r: /hover:bg-zinc-100 dark:hover:bg-zinc-900\/30/g, t: 'hover:bg-slate-50 dark:hover:bg-zinc-900/30' }, // Table row hover
  // Notes / footers
  { r: /bg-zinc-100 dark:bg-zinc-900\/60/g, t: 'bg-slate-50 dark:bg-zinc-900/60' },
  { r: /bg-zinc-100 dark:bg-zinc-900\/20/g, t: 'bg-slate-50 dark:bg-zinc-900/20' }, // Prompt info
  // Code editor text and background
  { r: /bg-\[\#0d0d0f\]/g, t: 'bg-slate-900 dark:bg-[#0d0d0f]' }, // Make code block dark in light mode too, or very dark blue
  { r: /text-zinc-700 dark:text-zinc-300/g, t: 'text-slate-300 dark:text-zinc-300' }, // light text inside code block
]);

// Login.tsx & Signup.tsx (shared patterns)
['Login.tsx', 'Signup.tsx'].forEach(file => {
  applyReplacements(file, [
    { r: /bg-white dark:bg-\[\#09090b\]/g, t: 'bg-slate-50 dark:bg-[#09090b]' },
    { r: /text-black dark:text-zinc-100/g, t: 'text-slate-900 dark:text-zinc-100' },
    { r: /bg-zinc-100 dark:bg-zinc-900\/50/g, t: 'bg-white dark:bg-zinc-900/50' },
    { r: /border-zinc-300 dark:border-zinc-800\/80/g, t: 'border-slate-200 dark:border-zinc-800/80' },
    { r: /text-zinc-700 dark:text-zinc-300/g, t: 'text-slate-700 dark:text-zinc-300' },
    { r: /bg-zinc-50 dark:bg-zinc-950\/50/g, t: 'bg-slate-50 dark:bg-zinc-950/50' },
    { r: /border-zinc-300 dark:border-zinc-800/g, t: 'border-slate-200 dark:border-zinc-800' },
    // Inputs focus
    { r: /focus:ring-purple-600 dark:ring-indigo-500\/50/g, t: 'focus:ring-purple-500/30 dark:focus:ring-indigo-500/50' },
    // Secondary button
    { r: /bg-zinc-200 dark:bg-zinc-800/g, t: 'bg-white dark:bg-zinc-800' },
    { r: /border-zinc-400 dark:border-zinc-700/g, t: 'border-slate-200 dark:border-zinc-700' },
    { r: /hover:bg-zinc-700/g, t: 'hover:bg-slate-50 dark:hover:bg-zinc-700' },
    { r: /text-black dark:text-white/g, t: 'text-slate-700 dark:text-white' },
  ]);
});
