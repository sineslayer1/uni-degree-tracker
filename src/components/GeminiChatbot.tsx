import React, { useState, useRef, useEffect } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { calculateAcademicMetrics, calculateUnitResult } from '../lib/grade-calculator';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Bot,
  User,
  Zap,
  Brain,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const GeminiChatbot: React.FC = () => {
  const { units, isWhatIfMode, metricView, degreeName, targetWam, displayName, tasks } =
    useDashboardStore();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'model',
      text: `Hello ${displayName || 'there'}! I'm your **Apex Academic Advisor** powered by Gemini. 

I can help you:
- **Calculate What-If scenarios** (e.g. *"What do I need in my final exam to keep a Distinction WAM?"*)
- **Navigate double-pass hurdles** and avoid automatic UF penalties
- **Plan revision schedules** for your enrolled units
- **Prioritize unweighted Canvas lab check-offs** before deadlines

How can I assist your study strategy today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelPreference, setModelPreference] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview'>('gemini-3.5-flash');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Construct real-time student context for Gemini
  const buildStudentContext = () => {
    const metrics = calculateAcademicMetrics(units, isWhatIfMode);
    const unitSummaries = units.map((u) => {
      const res = calculateUnitResult(u, isWhatIfMode);
      const hurdleList = u.assessments
        .filter((a) => a.isHurdle)
        .map((h) => `${h.title} (≥${h.hurdleMinMark}%)`)
        .join(', ');
      return `- ${u.code} (${u.name}, ${u.creditPoints} CP): Current ${res.earnedMark}%, Projected ${res.projectedFinalMark}%, Status: ${res.statusDisplay}. Hurdles: ${hurdleList || 'None'}`;
    });

    const pendingTasks = tasks.filter((t) => !t.completed).map((t) => `${t.title} [${t.unitCode || 'General'}]`);

    return `Degree Program: ${degreeName || 'Engineering'}
Target WAM: ${targetWam || 75}
Current WAM: ${metrics.wam.toFixed(1)} (SAM: ${metrics.sam.toFixed(1)})
Projected WAM: ${metrics.projectedWam.toFixed(1)}
Academic Standing: ${metrics.academicStanding}
Total Credit Points: ${metrics.totalCreditPoints}
Hurdles at Risk / Failed: ${metrics.failedHurdlesCount}

Enrolled Units:
${unitSummaries.join('\n')}

Upcoming Micro-Tasks (${pendingTasks.length} pending):
${pendingTasks.slice(0, 5).join('\n')}`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const studentContext = buildStudentContext();
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          history,
          studentContext,
          modelPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer from Academic Advisor');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Advisor Notice**: ${err?.message || 'Network connection issue. Please verify your connection and try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: `Conversation reset. How can I help you plan your engineering academics today, ${displayName || 'student'}?`,
        timestamp: new Date(),
      },
    ]);
  };

  // Format simple markdown (bold, lists, code)
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const item = line.trim().replace(/^[-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-emerald-500 font-bold">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              </div>
            );
          }

          // Numbered lists
          if (/^\d+\.\s/.test(line.trim())) {
            const match = line.trim().match(/^(\d+\.)\s+(.*)/);
            if (match) {
              return (
                <div key={idx} className="flex items-start gap-1.5 pl-1">
                  <span className="font-mono text-zinc-400 font-semibold">{match[1]}</span>
                  <span dangerouslySetInnerHTML={{ __html: formatInline(match[2]) }} />
                </div>
              );
            }
          }

          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInline = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-zinc-200/60 dark:bg-zinc-800 rounded font-mono text-[11px]">$1</code>');
  };

  const promptSuggestions = [
    'How do I maintain my Distinction WAM goal?',
    'Explain double-pass hurdle consequences',
    'What mark do I need on my final exam?',
    'Create a 3-week study roadmap for my units',
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-zinc-700/40 dark:border-zinc-300"
          aria-label="Open Apex Academic Advisor Chat"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-emerald-400 dark:text-emerald-600 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-zinc-900" />
          </div>
          <span className="text-xs font-semibold font-mono tracking-tight pr-1">
            Ask Gemini Advisor
          </span>
        </button>
      )}

      {/* Slide-out / Bottom Sheet Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[440px] sm:h-[620px] z-50 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold font-mono tracking-tight">Apex Academic Advisor</h3>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded">
                    Gemini AI
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Context-aware USYD WAM & Hurdle strategist
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Model Selector Bar */}
          <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span className="text-[10px] uppercase tracking-wider">Engine:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'gemini-3.5-flash', label: '3.5 Flash', icon: <Zap className="w-3 h-3 text-amber-500" /> },
                { id: 'gemini-3.1-flash-lite', label: '3.1 Lite (Fast)', icon: <Zap className="w-3 h-3 text-blue-500" /> },
                { id: 'gemini-3.1-pro-preview', label: '3.1 Pro (Deep)', icon: <Brain className="w-3 h-3 text-purple-500" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModelPreference(m.id as any)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                    modelPreference === m.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                      : 'hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Chat History Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-zinc-50/60 dark:bg-zinc-950/40">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                      isUser
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                      isUser
                        ? 'bg-zinc-900 text-white rounded-tr-none'
                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {renderMessageContent(m.text)}
                    <span
                      className={`text-[9px] font-mono block mt-1 ${
                        isUser ? 'text-zinc-400 text-right' : 'text-zinc-400 text-left'
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs font-mono text-zinc-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] ml-1">Analyzing WAM & course policies...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Prompt Chips */}
          <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {promptSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 text-[11px] font-mono rounded-lg transition-colors border border-zinc-200/50 dark:border-zinc-700 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about marks, hurdles, WAM, or study tips..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
