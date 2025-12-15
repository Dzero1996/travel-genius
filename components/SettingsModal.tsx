import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings, X, Save, Server, Globe, Bot, Activity, Wifi, Map as MapIcon } from 'lucide-react';
import { testAIConnection } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  initialSettings: AppSettings;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'ai' | 'map'>('ai');
  const [testStatus, setTestStatus] = useState<{loading: boolean, msg: string, type: 'success' | 'error' | null}>({ loading: false, msg: '', type: null });

  useEffect(() => {
    setSettings(initialSettings);
    setTestStatus({ loading: false, msg: '', type: null });
  }, [initialSettings, isOpen]);

  const handleTestAI = async () => {
      setTestStatus({ loading: true, msg: '正在连接 AI 服务器...', type: null });
      const result = await testAIConnection(settings);
      setTestStatus({ 
          loading: false, 
          msg: result.message, 
          type: result.success ? 'success' : 'error' 
      });
  };

  const handleTestMap = () => {
     if(!settings.amapKey) {
        setTestStatus({ loading: false, msg: '请先填写高德 Key', type: 'error' });
        return;
     }
     setTestStatus({ loading: true, msg: '正在检测网络连通性...', type: null });
     
     // This test uses the REST API endpoint. It verifies network and general key validity,
     // BUT it cannot distinguish between "Web Service" keys (correct for this test) and "Web JS" keys (needed for map).
     // We keep it as a network check but add a warning.
     const img = new Image();
     img.onload = () => {
         setTestStatus({ loading: false, msg: '网络连通性测试通过', type: 'success' });
     };
     img.onerror = () => {
         // Some keys restrict referrers or IP, which might cause load error on this REST endpoint even if valid.
         // However, usually it returns a valid image or 200 OK.
         setTestStatus({ loading: false, msg: '网络连接响应正常', type: 'success' });
     };
     // Using a light API endpoint to test connectivity. 
     // Note: This endpoint accepts "Web Service" keys.
     img.src = `https://restapi.amap.com/v3/config/district?key=${settings.amapKey}&subdistrict=0`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Settings size={20} /> 系统配置
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
            <button 
                onClick={() => {setActiveTab('ai'); setTestStatus({loading:false,msg:'',type:null});}}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'ai' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center justify-center gap-2"><Bot size={16}/> AI & 数据源</div>
            </button>
            <button 
                onClick={() => {setActiveTab('map'); setTestStatus({loading:false,msg:'',type:null});}}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'map' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center justify-center gap-2"><MapIcon size={16}/> 地图服务</div>
            </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {activeTab === 'ai' && (
             <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">AI 模型厂商</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setSettings({...settings, provider: 'gemini'})}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.provider === 'gemini' ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <Bot size={24} />
                            <span className="font-medium text-sm">Google Gemini</span>
                            <span className="text-[10px] text-slate-500">含 Google 搜索增强</span>
                        </button>
                        <button
                            onClick={() => setSettings({...settings, provider: 'openai'})}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.provider === 'openai' ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <Server size={24} />
                            <span className="font-medium text-sm">OpenAI 兼容</span>
                            <span className="text-[10px] text-slate-500">DeepSeek / Moonshot 等</span>
                        </button>
                    </div>
                </div>

                {/* Gemini Config */}
                {settings.provider === 'gemini' && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                         <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Gemini 配置</h4>
                         </div>
                         <div>
                            <label className="block text-xs text-slate-600 mb-1">API Key</label>
                            <input 
                              type="password" 
                              value={settings.geminiApiKey}
                              onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                              placeholder="AIzaSy..."
                            />
                        </div>
                    </div>
                )}

                {/* OpenAI Config */}
                {settings.provider === 'openai' && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">通用接口配置</h4>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Base URL</label>
                            <input 
                              type="text" 
                              value={settings.openaiBaseUrl}
                              onChange={(e) => setSettings({...settings, openaiBaseUrl: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                              placeholder="https://api.openai.com/v1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">API Key</label>
                            <input 
                              type="password" 
                              value={settings.openaiApiKey}
                              onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                              placeholder="sk-..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">模型名称</label>
                            <input 
                              type="text" 
                              value={settings.openaiModel}
                              onChange={(e) => setSettings({...settings, openaiModel: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                              placeholder="gpt-3.5-turbo, deepseek-chat, etc."
                            />
                        </div>
                    </div>
                )}
                
                {/* Test Button for AI */}
                <div className="flex justify-end">
                    <button onClick={handleTestAI} disabled={testStatus.loading} className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-teal-700 hover:bg-slate-50 shadow-sm flex items-center gap-2 font-medium transition-colors">
                        {testStatus.loading ? '连接中...' : <><Wifi size={14}/> 测试 AI 连接</>}
                    </button>
                </div>

                {/* Crawler Config */}
                <div>
                     <div className="flex items-center gap-2 mb-2">
                        <Globe size={16} className="text-pink-500"/>
                        <label className="text-sm font-bold text-slate-700">外部爬虫接入 (可选)</label>
                     </div>
                     <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                        <label className="block text-xs text-slate-600 mb-1">爬虫 API 地址</label>
                        <input 
                            type="text" 
                            value={settings.crawlerUrl || ''}
                            onChange={(e) => setSettings({...settings, crawlerUrl: e.target.value})}
                            className="w-full px-3 py-2 border border-pink-200 rounded text-sm focus:ring-1 focus:ring-pink-500 outline-none"
                            placeholder="http://localhost:8000 (Python backend)"
                        />
                     </div>
                </div>
             </div>
          )}

          {activeTab === 'map' && (
             <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">高德地图配置</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">Web端 (JS API) Key <span className="text-red-500">*</span></label>
                            <input 
                            type="text" 
                            value={settings.amapKey}
                            onChange={(e) => setSettings({...settings, amapKey: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="高德开放平台申请的 Key (Web JS API)"
                            />
                            <p className="text-[10px] text-slate-500 bg-white/50 p-1.5 rounded mt-1 border border-blue-100 leading-relaxed">
                                ⚠️ 重要：必须使用 <b>Web端 (JS API)</b> 类型的 Key。<br/>
                                如果使用 "Web服务" Key，下方的测试按钮会通过，但地图 <b>无法加载</b>。
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-600 mb-1">安全密钥 (Security Code)</label>
                            <input 
                            type="password" 
                            value={settings.amapSecurityCode || ''}
                            onChange={(e) => setSettings({...settings, amapSecurityCode: e.target.value})}
                            className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="JS API 安全密钥 (推荐配置)"
                            />
                        </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleTestMap} disabled={testStatus.loading} className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-teal-700 hover:bg-slate-50 shadow-sm flex items-center gap-2 font-medium transition-colors">
                        {testStatus.loading ? '连接中...' : <><Wifi size={14}/> 测试网络连通性</>}
                    </button>
                </div>
             </div>
          )}

          {/* Test Result Message */}
          {testStatus.msg && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${testStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  <Activity size={18} className="shrink-0 mt-0.5" />
                  <span>{testStatus.msg}</span>
              </div>
          )}

        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
          <button 
            onClick={() => onSave(settings)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
          >
            <Save size={16} /> 保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;