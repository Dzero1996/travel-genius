import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Loader2, Sparkles, Edit3 } from 'lucide-react';
import { ChatMessage } from '../types';

interface Props {
  onSendMessage: (msg: string) => Promise<void>;
  isProcessing: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const ChatInterface: React.FC<Props> = ({ onSendMessage, isProcessing, isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '我对这份行程方案已经很熟悉了。您可以随时告诉我您的修改意见，比如："第二天太累了，减少一个景点" 或者 "把第三天的午餐换成火锅"。',
      timestamp: Date.now()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // Add temporary loading message
    const tempId = 'loading-' + Date.now();
    setMessages(prev => [...prev, {
        id: tempId,
        role: 'assistant',
        content: '正在重新规划行程...',
        timestamp: Date.now(),
        isUpdating: true
    }]);

    try {
      await onSendMessage(userMsg.content);
      // Replace loading with success
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, content: '已根据您的要求更新了行程方案！', isUpdating: false } : m
      ));
    } catch (e) {
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, content: '抱歉，修改行程时遇到了问题，请稍后重试。', isUpdating: false } : m
      ));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slideInRight">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <span className="font-bold">AI 行程调整</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition">
            <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
            }`}>
                {msg.isUpdating ? (
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Loader2 size={14} className="animate-spin" />
                        <span>AI 思考中...</span>
                    </div>
                ) : msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入修改意见..."
                disabled={isProcessing}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-shadow"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;