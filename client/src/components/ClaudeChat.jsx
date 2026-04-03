import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { Zap, Send, X, MessageCircle, Loader, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_QUESTIONS = [
  'Why was my claim auto-filed?',
  'How is my premium calculated?',
  'When will I get paid?',
  'What does my policy cover?',
];

export default function ClaudeChat() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Cover Drive assistant 👋 Ask me anything about your claims, policy, or coverage.",
    }
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoad]  = useState(false);
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');

    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoad(true);

    try {
      const { data } = await api.post('/claude/chat', {
        messages: newMessages,
        context: { includeProfile: true },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Please try again!",
      }]);
    } finally {
      setLoad(false);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-500 hover:bg-brand-600 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
      >
        {open ? <X size={22}/> : <MessageCircle size={22}/>}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ maxHeight: '500px' }}
          >
            {/* Header */}
            <div className="bg-brand-500 px-4 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Zap size={16} className="text-white"/>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Cover Drive AI</p>
                <p className="text-brand-100 text-xs">Powered by Claude</p>
              </div>
              <div className="ml-auto w-2 h-2 bg-green-300 rounded-full animate-pulse"/>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5
                    ${m.role === 'assistant' ? 'bg-brand-100' : 'bg-gray-200'}`}>
                    {m.role === 'assistant'
                      ? <Bot size={12} className="text-brand-600"/>
                      : <User size={12} className="text-gray-600"/>}
                  </div>
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${m.role === 'assistant'
                      ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                      : 'bg-brand-500 text-white rounded-tr-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                    <Bot size={12} className="text-brand-600"/>
                  </div>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <Loader size={14} className="text-brand-400 animate-spin"/>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick Questions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-gray-100 bg-white">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full hover:bg-brand-100 transition font-medium border border-brand-100">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about your policy or claims..."
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 bg-gray-50"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition flex-shrink-0"
              >
                <Send size={15}/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}