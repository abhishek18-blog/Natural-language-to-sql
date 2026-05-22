import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { ConverterPanel } from './ConverterPanel';
import { useNavigate } from 'react-router';
import { LogOut, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';

export interface HistoryItem {
  id: string;
  query: string;
  sql?: string;
  timestamp: number;
  provider: 'local' | 'online';
  database: string;
  aiResponse?: string;
  results?: any[] | null;
  logs?: string[];
}

// We removed the mock DB functions since we now call the real API

export function MainApp() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentSql, setCurrentSql] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryUsedForOutput, setQueryUsedForOutput] = useState('');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('User');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const role = localStorage.getItem('user-role') || 'User';
    setUserRole(role);
  }, []);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('sql-converter-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('sql-converter-history', JSON.stringify(history));
    }
  }, [history]);

  const handleConvert = async (query: string, provider: 'local' | 'online', database: string) => {
    setIsLoading(true);
    setCurrentQuery(query);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const timeoutId = setTimeout(() => {
      // 5 seconds buffer: if online AI is selected and no internet is detected, abort
      if (provider === 'online' && !navigator.onLine) {
        controller.abort(new Error('offline'));
      }
    }, 5000);

    try {
      const response = await fetch('http://localhost:3000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: query,
          role: userRole.toLowerCase(),
          provider,
          database
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'API request failed');
      }

      setQueryUsedForOutput(query);

      // RBAC guard: if the AI denied access, never show any table data
      const ACCESS_DENIED_PHRASES = [
        'you need to be an admin',
        'admin to access this data',
      ];
      const isAccessDenied = ACCESS_DENIED_PHRASES.some(phrase =>
        (data.answer || '').toLowerCase().includes(phrase)
      );

      const parsedResults = isAccessDenied
        ? null
        : data.results
          ? (typeof data.results === 'string' ? [{ result: data.results }] : data.results)
          : null;
      
      setCurrentSql(data.sql_query || '');
      setQueryResult(parsedResults);
      setAiResponse(data.answer);
      setServerLogs(data.logs || []);

      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        query,
        sql: data.sql_query,
        timestamp: Date.now(),
        provider,
        database,
        aiResponse: data.answer,
        results: parsedResults,
        logs: data.logs || []
      };

      setHistory(prev => [newItem, ...prev]);
      setSelectedId(newItem.id);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Conversion failed:', error);
      
      const errorMsg = error.message?.toLowerCase() || '';
      const isCancelled = error.name === 'AbortError' || errorMsg.includes('cancel') || errorMsg.includes('abort');
      const isNetworkError = !isCancelled && (
                             errorMsg === 'offline' ||
                             errorMsg.includes('failed to fetch') || 
                             errorMsg.includes('fetch failed') || 
                             errorMsg.includes('enotfound') || 
                             errorMsg.includes('econnrefused') || 
                             errorMsg.includes('network connection'));

      if (isCancelled) {
        setCurrentSql('-- Process aborted by user');
        setAiResponse('User aborted the process');
        toast.info("User aborted the process");
        // Add a slight delay so the UI shows the "Cancelling..." spin state
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (provider === 'online' && (isNetworkError || !navigator.onLine)) {
        setCurrentSql('-- Error: Network connection failed.');
        setAiResponse("Network issue detected. Please check your internet connection and try again.");
        toast.error("Network error. Try again");
      } else {
        setCurrentSql(`-- Error: ${error.message || 'Failed to communicate with AI provider'}`);
        setAiResponse("I encountered an issue generating a response.");
        toast.error("An error occurred during generation.");
      }

      setQueryUsedForOutput(query);
      setQueryResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setCurrentQuery(item.query);
    setCurrentSql(item.sql || '');
    setSelectedId(item.id);
    setQueryUsedForOutput(item.query);
    setQueryResult(item.results || null);
    setAiResponse(item.aiResponse || '');
    setServerLogs(item.logs || []);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      localStorage.removeItem('sql-converter-history');
      setCurrentQuery('');
      setCurrentSql('');
      setQueryUsedForOutput('');
      setQueryResult(null);
      setAiResponse('');
      setServerLogs([]);
      setSelectedId(null);
    }
  };

  return (
    <div className="h-screen w-full flex bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans selection:bg-slate-300 dark:bg-indigo-500/30 dark:selection:bg-indigo-500/30">
      <Sidebar
        history={history}
        onSelectHistory={handleSelectHistory}
        onClearHistory={handleClearHistory}
        selectedId={selectedId}
      />
      
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-slate-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/50 backdrop-blur flex items-center justify-between px-6 z-10 w-full overflow-hidden">
          <div className="flex items-center gap-4 flex-wrap flex-1 max-w-full min-w-0 pr-4">
            <div className="flex items-center shrink-0">
              <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 mr-2">Role: <span className="text-slate-700 dark:text-zinc-200">{userRole}</span></span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-[10px] text-slate-500 dark:text-zinc-400 font-medium tracking-wide">
                BETA
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-100 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="flex shrink-0 items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-zinc-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>
        
        <ConverterPanel
          onConvert={handleConvert}
          onCancel={() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          }}
          currentQuery={currentQuery}
          currentSql={currentSql}
          isLoading={isLoading}
          queryUsedForOutput={queryUsedForOutput}
          queryResult={queryResult}
          aiResponse={aiResponse}
          userRole={userRole}
          serverLogs={serverLogs}
        />
      </div>
    </div>
  );
}
