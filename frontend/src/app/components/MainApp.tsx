import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ConverterPanel } from './ConverterPanel';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export interface HistoryItem {
  id: string;
  query: string;
  sql?: string;
  timestamp: number;
  provider: 'local' | 'online';
  aiResponse?: string;
  results?: any[] | null;
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
  const [aiResponse, setAiResponse] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('User');

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

  const handleConvert = async (query: string, provider: 'local' | 'online') => {
    setIsLoading(true);
    setCurrentQuery(query);

    const controller = new AbortController();
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
          provider
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'API request failed');
      }

      setQueryUsedForOutput(query);
      
      const parsedResults = data.results ? (typeof data.results === 'string' ? [{ result: data.results }] : data.results) : null;
      
      setCurrentSql(data.sql_query || '');
      setQueryResult(parsedResults);
      setAiResponse(data.answer);

      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        query,
        sql: data.sql_query,
        timestamp: Date.now(),
        provider,
        aiResponse: data.answer,
        results: parsedResults
      };

      setHistory(prev => [newItem, ...prev]);
      setSelectedId(newItem.id);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Conversion failed:', error);
      
      const errorMsg = error.message?.toLowerCase() || '';
      const isNetworkError = error.name === 'AbortError' ||
                             errorMsg === 'offline' ||
                             errorMsg.includes('failed to fetch') || 
                             errorMsg.includes('fetch failed') || 
                             errorMsg.includes('enotfound') || 
                             errorMsg.includes('econnrefused') || 
                             errorMsg.includes('network connection');

      // navigator.onLine is also a good check for browser internet connection
      if (provider === 'online' && (isNetworkError || !navigator.onLine)) {
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
      setSelectedId(null);
    }
  };

  return (
    <div className="h-screen w-full flex bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Sidebar
        history={history}
        onSelectHistory={handleSelectHistory}
        onClearHistory={handleClearHistory}
        selectedId={selectedId}
      />
      
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/50 backdrop-blur flex items-center justify-between px-6 z-10 w-full overflow-hidden">
          <div className="flex items-center gap-4 flex-wrap flex-1 max-w-full min-w-0 pr-4">
            <div className="flex items-center shrink-0">
              <span className="text-sm font-medium text-zinc-400 mr-2">Role: <span className="text-zinc-200">{userRole}</span></span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700 text-[10px] text-zinc-400 font-medium tracking-wide">
                BETA
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="flex shrink-0 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>
        
        <ConverterPanel
          onConvert={handleConvert}
          currentQuery={currentQuery}
          currentSql={currentSql}
          isLoading={isLoading}
          queryUsedForOutput={queryUsedForOutput}
          queryResult={queryResult}
          aiResponse={aiResponse}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
