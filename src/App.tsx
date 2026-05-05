/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Code2, 
  Play, 
  TestTube2, 
  RefreshCcw, 
  MessageSquare, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  Layout,
  ChevronRight,
  Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { generateCode, testCode, GenerationResult, TestResult } from './services/aiService';
import { CodePreview } from './components/CodePreview';
import { Message, ProjectState } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [project, setProject] = useState<ProjectState>({
    code: '',
    language: 'tsx',
    status: 'idle'
  });
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'test'>('preview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || project.status === 'generating') return;

    if (windowWidth < 1024) setIsSidebarOpen(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setProject(prev => ({ ...prev, status: 'generating' }));

    try {
      const context = messages.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const result: GenerationResult = await generateCode(input, context + `\nEXISTING CODE:\n${project.code}`);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.explanation,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setProject(prev => ({ 
        ...prev, 
        code: result.code, 
        status: 'idle' 
      }));
      setActiveTab('preview');
    } catch (error) {
      setProject(prev => ({ ...prev, status: 'error' }));
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while generating the code.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleTest = async () => {
    if (!project.code || project.status === 'testing') return;

    setProject(prev => ({ ...prev, status: 'testing' }));
    setActiveTab('test');

    const lastUserRequest = messages.filter(m => m.role === 'user').pop()?.content || 'No specific requirements provided.';
    const result: TestResult = await testCode(project.code, lastUserRequest);

    setProject(prev => ({
      ...prev,
      status: 'idle',
      testResults: {
        passed: result.passed,
        errors: result.errors,
        logs: [result.feedback]
      }
    }));
  };

  const fixCode = async () => {
    if (!project.testResults || project.status === 'generating') return;
    
    const errorsMsg = project.testResults.errors.join('\n');
    const prompt = `The code failed testing. Please fix these issues:\n${errorsMsg}\n\nTesting Feedback: ${project.testResults.logs[0]}`;
    
    setInput(prompt);
    // Auto trigger send after a small delay to make UI feel intentional
    setTimeout(handleSend, 100);
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-slate-900 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Chat History */}
      <motion.div 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (window.innerWidth < 1024 ? '85%' : 340) : 0,
          x: isSidebarOpen ? 0 : -20
        }}
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col overflow-hidden fixed inset-y-0 left-0 z-50 lg:relative lg:flex",
          !isSidebarOpen && "pointer-events-none"
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between min-w-[280px]">
          <h1 className="font-bold flex items-center gap-2 text-indigo-600 text-lg">
            <Layout className="w-6 h-6" /> Nexus AI
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setMessages([])} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[280px]">
          {messages.length === 0 && (
            <div className="text-center py-10 px-4">
              <div className="bg-indigo-50 text-indigo-500 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Bắt đầu xây dựng ngay</p>
              <p className="text-xs text-slate-400 mt-1">Mô tả giao diện bạn muốn tạo...</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn(
              "p-3 rounded-2xl text-sm max-w-[90%] shadow-sm",
              m.role === 'user' 
                ? "bg-indigo-600 text-white ml-auto rounded-tr-none" 
                : "bg-white border border-slate-100 text-slate-800 mr-auto rounded-tl-none"
            )}>
              <ReactMarkdown className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed">
                {m.content}
              </ReactMarkdown>
            </div>
          ))}
          {project.status === 'generating' && (
            <div className="flex gap-1.5 p-4 bg-slate-50 rounded-2xl max-w-[70px] border border-slate-100">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 min-w-[280px] bg-slate-50/50">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Ví dụ: Tạo một landing page bán hàng hiện đại..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none resize-none h-28 transition-all shadow-sm"
            />
            <button 
              onClick={handleSend}
              disabled={project.status === 'generating' || !input.trim()}
              className="absolute right-2 bottom-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB]">
        <header className="h-16 lg:h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-6 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
              aria-label="Toggle Navigation"
            >
              <ChevronRight className={cn("w-5 h-5 transition-transform", isSidebarOpen && "rotate-180")} />
            </button>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PROJECT</span>
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px] lg:max-w-none">Live Architect Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl scale-90 sm:scale-100">
            {[
              { id: 'preview', icon: Play, label: 'Xem' },
              { id: 'code', icon: Code2, label: 'Code' },
              { id: 'test', icon: TestTube2, label: 'Test' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn("px-3 lg:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5", 
                  activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
             <button 
              onClick={handleTest}
              disabled={!project.code || project.status === 'testing'}
              className="p-2 lg:px-4 lg:py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-2 transition-all border border-indigo-100"
              title="Run Agent Tests"
            >
              <Terminal className="w-4 h-4" /> 
              <span className="hidden md:inline">Kiểm thử AI</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-3 sm:p-4 lg:p-6 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="w-full h-full shadow-2xl shadow-indigo-100/50"
              >
                <CodePreview code={project.code} language={project.language} />
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div 
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full bg-[#0a0c10] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
              >
                <div className="h-8 bg-[#161b22] flex items-center px-4 gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
                <pre className="p-6 font-mono text-xs sm:text-sm text-indigo-200/90 overflow-auto h-[calc(100%-32px)] scrollbar-thin scrollbar-thumb-slate-800">
                  <code>{project.code || "// Kết quả code sẽ hiển thị ở đây..."}</code>
                </pre>
              </motion.div>
            )}

            {activeTab === 'test' && (
              <motion.div 
                key="test"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 overflow-y-auto shadow-xl"
              >
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tight">
                      <div className="p-2 bg-indigo-50 rounded-xl">
                        <Terminal className="w-6 h-6 text-indigo-600" />
                      </div>
                      Logs Kiểm Thử
                    </h2>
                    {project.status === 'testing' && (
                      <span className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full text-xs font-bold animate-pulse">
                        <RefreshCcw className="w-3 h-3 animate-spin" /> Đang phân tích...
                      </span>
                    )}
                  </div>

                  {!project.testResults && project.status !== 'testing' && (
                    <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                        <Bug className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium whitespace-pre-wrap">Hệ thống AI sẽ quét code của bạn để tìm lỗi bản vẽ và logic.</p>
                      <button onClick={handleTest} className="mt-6 text-indigo-600 text-sm font-bold hover:underline">Chạy kiểm thử ngay →</button>
                    </div>
                  )}

                  {project.testResults && (
                    <div className="space-y-6">
                      <div className={cn(
                        "p-6 rounded-[32px] border-2 flex flex-col sm:flex-row items-start gap-4 transition-all duration-500",
                        project.testResults.passed 
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-900" 
                          : "bg-rose-50/50 border-rose-100 text-rose-900"
                      )}>
                        <div className={cn(
                          "p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform",
                          project.testResults.passed ? "bg-emerald-100" : "bg-rose-100"
                        )}>
                          {project.testResults.passed ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-rose-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-black text-lg uppercase tracking-tight">{project.testResults.passed ? "Mọi thứ hoàn hảo" : "Phát hiện vấn đề"}</h3>
                          <p className="mt-2 text-sm leading-relaxed font-medium opacity-80">{project.testResults.logs[0]}</p>
                        </div>
                      </div>

                      {project.testResults.errors.length > 0 && (
                        <div className="bg-slate-900 rounded-[32px] p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                          <h4 className="text-indigo-400 font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <Bug className="w-4 h-4" /> Danh sách lỗi & cải thiện
                          </h4>
                          <ul className="space-y-4">
                            {project.testResults.errors.map((err, i) => (
                              <li key={i} className="flex items-start gap-4 text-slate-300 text-sm group">
                                <span className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 transition-colors",
                                  "bg-slate-800 text-slate-500 group-hover:bg-indigo-900 group-hover:text-indigo-300"
                                )}>
                                  {i + 1}
                                </span>
                                <span className="leading-relaxed">{err}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <button 
                            onClick={fixCode}
                            className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                          >
                            <RefreshCcw className="w-4 h-4" /> Tự động sửa với AI
                          </button>
                        </div>
                      )}

                      {project.testResults.passed && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-600 rounded-[32px] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative"
                        >
                          <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                          <div className="relative z-10">
                            <p className="text-lg font-black uppercase tracking-tight">Tuyệt vời!</p>
                            <p className="text-sm font-medium opacity-90 mt-1">Sản phẩm của bạn đã sẵn sàng để triển khai.</p>
                          </div>
                          <CheckCircle2 className="w-12 h-12 text-emerald-300 relative z-10" strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

