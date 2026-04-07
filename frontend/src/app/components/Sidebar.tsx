import { Search, History, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface HistoryItem {
  id: string;
  query: string;
  sql?: string;
  timestamp: number;
  provider: 'local' | 'online';
  aiResponse?: string;
  results?: any[] | null;
}

interface SidebarProps {
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
  selectedId: string | null;
}

export function Sidebar({ history, onSelectHistory, onClearHistory, selectedId }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item =>
    item.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sql && item.sql.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-80 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-full z-20 shadow-2xl">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-zinc-100 font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Query History
          </h2>
          <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-2.5 py-1 rounded-full font-medium shadow-inner">
            {history.length} Saved
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 transition-colors group-focus-within:text-indigo-400" />
          <input
            type="text"
            placeholder="Search saved queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl pl-10 pr-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3 opacity-80">
            <Clock className="w-8 h-8 text-zinc-700" />
            <p className="text-sm">
              {searchTerm ? 'No matches found' : 'Your history is empty'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectHistory(item)}
                className={`w-full text-left p-4 rounded-xl transition-all group relative overflow-hidden ${
                  selectedId === item.id
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700'
                } border shadow-sm`}
              >
                {selectedId === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                )}
                
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <CheckCircle2 className={`w-4 h-4 ${selectedId === item.id ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium mb-1.5 leading-snug line-clamp-2 ${selectedId === item.id ? 'text-indigo-100' : 'text-zinc-300'}`}>
                      {item.query}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                        item.provider === 'local'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {item.provider}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear History Button */}
      {history.length > 0 && (
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
          <button
            onClick={onClearHistory}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/5 border border-red-500/10 text-red-400/80 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all font-medium text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear All History
          </button>
        </div>
      )}
    </div>
  );
}
