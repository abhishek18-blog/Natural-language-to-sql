import { useState, useRef, useEffect } from 'react';
import { Sparkles, Copy, Check, Cpu, Globe, ChevronDown, Database, Terminal, Code2, Play, Table as TableIcon, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConverterPanelProps {
  onConvert: (query: string, provider: 'local' | 'online') => void;
  currentQuery: string;
  currentSql: string;
  isLoading: boolean;
  queryUsedForOutput: string;
  queryResult?: any[] | null;
  aiResponse?: string;
  userRole: string;
}

export function ConverterPanel({ onConvert, currentQuery, currentSql, isLoading, queryUsedForOutput, queryResult, aiResponse, userRole }: ConverterPanelProps) {
  const [query, setQuery] = useState(currentQuery);
  const [provider, setProvider] = useState<'local' | 'online'>('online');
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProviderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim() && !isLoading) {
      onConvert(query, provider);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = async () => {
    if (currentSql) {
      await navigator.clipboard.writeText(currentSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Sync external currentQuery to internal state if changed externally (e.g., from history)
  useEffect(() => {
    if (currentQuery !== undefined) {
      setQuery(currentQuery);
    }
  }, [currentQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 z-10 flex flex-col relative max-w-5xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl mb-2 shadow-sm">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Natural Language to SQL
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm md:text-base">
            Translate plain English into optimized, production-ready SQL queries instantly using advanced AI models.
          </p>
        </div>

        {/* Input Area Container */}
        <div className="w-full relative shadow-2xl rounded-3xl bg-zinc-950/40 border border-zinc-800/80 backdrop-blur-sm mb-12">
          
          <form onSubmit={handleSubmit} className="p-1 flex flex-col">
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g., Find all users who purchased a pro subscription in the last 30 days..."
              className="w-full min-h-[140px] bg-transparent rounded-t-3xl px-6 py-5 text-zinc-100 text-base md:text-lg placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
              disabled={isLoading}
            />

            {/* Toolbar inside input */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 rounded-b-[22px] border-t border-zinc-800/60 mt-auto">
              {/* AI Provider Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setProviderMenuOpen(!providerMenuOpen)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all text-sm font-medium text-zinc-300 disabled:opacity-50"
                >
                  {provider === 'online' ? (
                    <Globe className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Cpu className="w-4 h-4 text-green-400" />
                  )}
                  {provider === 'online' ? 'Online AI' : 'Local AI'}
                  <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${providerMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {providerMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden p-1 z-50 origin-bottom-left"
                    >
                      <button
                        type="button"
                        onClick={() => { setProvider('online'); setProviderMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group"
                      >
                        <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md group-hover:bg-indigo-500/20">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-200">Online AI</span>
                          <span className="text-[10px] text-zinc-500">Fast & precise (Cloud)</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setProvider('local'); setProviderMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group mt-1"
                      >
                        <div className="p-1.5 bg-green-500/10 text-green-400 rounded-md group-hover:bg-green-500/20">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-200">Local AI</span>
                          <span className="text-[10px] text-zinc-500">Private & offline (Slow)</span>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 hidden sm:inline-block">Press <kbd className="font-sans px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 text-[10px]">⌘</kbd> + <kbd className="font-sans px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 text-[10px]">Enter</kbd></span>
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Generate SQL
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Generated Output Area */}
        {(currentSql || aiResponse || isLoading) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col lg:flex-row gap-6 relative"
          >
            {isLoading && !aiResponse && (
              <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl border border-zinc-800/60 animate-pulse">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-zinc-400 font-medium">AI is analyzing your database...</p>
                <p className="text-xs text-zinc-600 mt-1">This might take a moment depending on the complexity.</p>
              </div>
            )}

            {/* Left Column: AI Answer and Table */}
            <div className="flex-1 flex flex-col rounded-3xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm overflow-hidden shadow-2xl">
              {/* Context Info */}
              <div className="px-6 py-4 border-b border-zinc-800/40 bg-zinc-900/20 flex items-center gap-3 text-sm">
                <div className="p-1.5 bg-indigo-500/10 rounded-md">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-zinc-100">AI Response</h3>
              </div>

              {/* Chat Bubble Response */}
              <div className="p-6 bg-[#0d0d0f]">
                <p className="text-zinc-200 text-base leading-relaxed">
                  {aiResponse || "I have generated the query and retrieved the data for you."}
                </p>
              </div>

              {/* Mock Database Results */}
              {queryResult && (
                <div className="border-t border-zinc-800/60 bg-zinc-950 flex flex-col flex-1">
                  <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/30">
                    <TableIcon className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Query Results <span className="text-zinc-500 font-normal ml-1">({queryResult.length} rows)</span></h3>
                  </div>
                  <div className="p-4 overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
                      <thead className="text-xs uppercase bg-zinc-900/50 text-zinc-400">
                        <tr>
                          {queryResult.length > 0 && Object.keys(queryResult[0] || {}).map((key) => (
                            <th key={key} className="px-4 py-3 font-medium tracking-wider">
                              {key.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {queryResult.map((row, i) => (
                          <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-4 py-3">
                                {val?.toString() ?? 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {queryResult.length === 0 && (
                      <div className="text-center py-6 text-zinc-500">No results found.</div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Warning Disclaimer */}
              <div className="px-6 py-4 bg-zinc-900/40 border-t border-zinc-800/40 flex flex-col gap-2">
                <p className="text-xs text-zinc-500 leading-relaxed italic">
                  Note: AI can make mistakes, so always cross-check the results. For privacy and security, standard users cannot view the underlying SQL queries or see other users' history. Only authorized database admins can track and evaluate the actual queries executed.
                </p>
              </div>
            </div>

            {/* Right Column: Query Used (Admins only) */}
            {(currentSql && userRole.toLowerCase() === 'admin') && (
              <div className="flex-1 lg:max-w-md xl:max-w-lg flex flex-col rounded-3xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm overflow-hidden shadow-2xl h-fit">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-zinc-800 rounded-md">
                    <Terminal className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">Query Used</h3>
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-indigo-500/30"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Prompt Info */}
              <div className="px-6 py-3 border-b border-zinc-800/40 bg-zinc-900/20 text-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="text-zinc-500 flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold">
                    <Code2 className="w-3.5 h-3.5" />
                    Prompt
                  </span>
                  <span className="text-indigo-200/90 font-medium italic line-clamp-2" title={queryUsedForOutput}>
                    "{queryUsedForOutput}"
                  </span>
                </div>
              </div>

              {/* Read-only Code Area */}
              <div className="flex-1 p-6 overflow-auto bg-[#0d0d0f] relative min-h-[200px]">
                <pre className="font-mono text-[13px] leading-relaxed text-zinc-300">
                  <code className="text-[#a5b4fc]">{currentSql}</code>
                </pre>
              </div>

              {/* Footer Warning */}
              <div className="px-6 py-4 bg-zinc-900/60 border-t border-zinc-800/60 flex items-start gap-3">
                <div className="p-1 rounded bg-amber-500/10 mt-0.5">
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xs text-amber-500/80 leading-relaxed">
                  <span className="font-semibold text-amber-500">Read-Only View:</span> Review this generated query to ensure accuracy before running it.
                </p>
              </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
