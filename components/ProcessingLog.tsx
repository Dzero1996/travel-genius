import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Database, Search, ShieldCheck, Instagram } from 'lucide-react';
import { ProcessingLog } from '../types';

interface Props {
  isProcessing: boolean;
}

const steps = [
  { msg: "正在唤醒智能 Agent...", icon: <Loader2 className="animate-spin" /> },
  { msg: "连接小红书笔记数据库...", icon: <Search className="text-pink-500" /> },
  { msg: "抓取目的地热门打卡点 & 避雷指南...", icon: <Instagram className="text-pink-500" /> },
  { msg: "分析历史天气与人流数据...", icon: <Database /> },
  { msg: "验证景点营业时间 & 门票信息...", icon: <Search /> },
  { msg: "计算路线最优解与数据置信度...", icon: <ShieldCheck /> },
  { msg: "生成多维度旅行方案...", icon: <Loader2 className="animate-spin" /> },
  { msg: "最终方案生成完毕！", icon: <CheckCircle className="text-green-500" /> }
];

const ProcessingView: React.FC<Props> = ({ isProcessing }) => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  useEffect(() => {
    if (isProcessing) {
      setLogs([]);
      let stepIndex = 0;
      
      const interval = setInterval(() => {
        if (stepIndex >= steps.length) {
          clearInterval(interval);
          return;
        }
        
        const newLog: ProcessingLog = {
          id: Math.random().toString(),
          message: steps[stepIndex].msg,
          status: 'active',
          timestamp: Date.now()
        };

        setLogs(prev => {
            const updated = prev.map(l => ({...l, status: 'completed' as const}));
            return [...updated, newLog];
        });

        stepIndex++;
      }, 1200); // Slower for dramatic effect

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  if (!isProcessing && logs.length === 0) return null;

  return (
    <div className="bg-slate-900 text-slate-200 p-6 rounded-xl shadow-2xl max-w-md mx-auto border border-slate-700 font-mono text-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="ml-2 text-slate-400">系统终端 - 数据爬虫运行中</span>
      </div>
      <div className="space-y-3 h-64 overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className={`flex items-center gap-3 ${log.status === 'active' ? 'text-teal-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 flex items-center justify-center">
              {log.status === 'active' ? steps.find(s => s.msg === log.message)?.icon : <CheckCircle size={16} />}
            </span>
            <span>{log.message}</span>
          </div>
        ))}
        {isProcessing && (
            <div className="animate-pulse text-teal-500 mt-2">_</div>
        )}
      </div>
    </div>
  );
};

export default ProcessingView;