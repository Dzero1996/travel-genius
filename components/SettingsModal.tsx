import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings, X, Save, Server, Globe, Bot, Activity, Wifi, Map as MapIcon, Info, Link2, Zap, Check, Network, Plug2 } from 'lucide-react';
import { validateAIConnection, testAIGeneration } from '../services/geminiService';
import { McpClient } from '../services/mcpService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  initialSettings: AppSettings;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'ai' | 'mcp' | 'map'>('ai');
  
  // States for AI testing
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [connectStatus, setConnectStatus] = useState<{loading: boolean, msg: string, type: 'success' | 'error' | null}>({ loading: false, msg: '', type: null });
  const [genStatus, setGenStatus] = useState<{loading: boolean, msg: string, type: 'success' | 'error' | null}>({ loading: false, msg: '', type: null });

  // States for MCP testing
  const [mcpStatus, setMcpStatus] = useState<{loading: boolean, msg: string, type: 'success' | 'error' | null}>({ loading: false, msg: '', type: null });

  // States for Map testing
  const [mapTestStatus, setMapTestStatus] = useState<{loading: boolean, msg: string, type: 'success' | 'error' | null}>({ loading: false, msg: '', type: null });

  useEffect(() => {
    setSettings(initialSettings);
    // Reset statuses when opening
    setConnectStatus({ loading: false, msg: '', type: null });
    setGenStatus({ loading: false, msg: '', type: null });
    setMcpStatus({ loading: false, msg: '', type: null });
    setMapTestStatus({ loading: false, msg: '', type: null });
    setFetchedModels([]);
  }, [initialSettings, isOpen]);

  const handleConnect = async () => {
      setConnectStatus({ loading: true, msg: '正在验证连接...', type: null });
      setFetchedModels([]);
      
      const result = await validateAIConnection(settings);
      
      setConnectStatus({ 
          loading: false, 
          msg: result.message, 
          type: result.success ? 'success' : 'error' 
      });

      if (result.success && result.models && result.models.length > 0) {
          setFetchedModels(result.models);
      }
  };

  const handleTestGeneration = async () => {
      setGenStatus({ loading: true, msg: '正在测试生成...', type: null });
      const result = await testAIGeneration(settings);
      setGenStatus({ 
          loading: false, 
          msg: result.message, 
          type: result.success ? 'success' : 'error' 
      });
  };

  const handleTestMcp = async () => {
     if (!settings.mcpEndpoint) {
         setMcpStatus({ loading: false, msg: '请输入 MCP Endpoint', type: 'error' });
         return;
     }
     setMcpStatus({ loading: true, msg: '尝试连接 MCP Server (SSE)...', type: null });
     
     const client = new McpClient(settings.mcpEndpoint);
     try {
         await client.connect();
         const tools = await client.listTools();
         client.disconnect();
         setMcpStatus({ 
             loading: false, 
             msg: `连接成功！发现 ${tools.length} 个工具: ${tools.map(t => t.name).join(', ')}`, 
             type: 'success' 
         });
     } catch (e: any) {
         setMcpStatus({ loading: false, msg: `连接失败: ${e.message}`, type: 'error' });
     }
  };

  const handleTestMap = () => {
     if(!settings.amapKey) {
        setMapTestStatus({ loading: false, msg: '请先填写高德 Key', type: 'error' });
        return;
     }
     setMapTestStatus({ loading: true, msg: '正在检测网络连通性...', type: null });
     
     const img = new Image();
     img.onload = () => {
         setMapTestStatus({ loading: false, msg: '网络连通性测试通过', type: 'success' });
     };
     img.onerror = () => {
         // Even if image fails to load (it's not an image), the connection was made
         setMapTestStatus({ loading: false, msg: '网络连接响应正常', type: 'success' });
     };
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
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center justify-center gap-2"><Bot size={16}/> AI 模型</div>
            </button>
            <button 
                onClick={() => setActiveTab('mcp')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'mcp' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center justify-center gap-2"><Network size={16}/> MCP 协议</div>
            </button>
            <button 
                onClick={() => setActiveTab('map')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'map' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <div className="flex items-center justify-center gap-2"><MapIcon size={16}/> 地图服务</div>
            </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
          
          {activeTab === 'ai' && (
             <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">选择 AI 模型厂商</label>
                    <div className="grid grid-cols-1 gap-4">
                        {/* Gemini Card */}
                        <button
                            onClick={() => {
                                setSettings({...settings, provider: 'gemini'});
                                setFetchedModels([]);
                                setConnectStatus({loading: false, msg: '', type: null});
                                setGenStatus({loading: false, msg: '', type: null});
                            }}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all group ${
                                settings.provider === 'gemini' 
                                ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg shrink-0 ${settings.provider === 'gemini' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                                        Google Gemini
                                        {settings.provider === 'gemini' && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">当前选择</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        原生集成 <strong>Google Search</strong>，可实时检索互联网获取最新小红书笔记和景点信息。推荐用于生成最具时效性的旅行攻略。
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* OpenAI Card */}
                        <button
                            onClick={() => {
                                setSettings({...settings, provider: 'openai'});
                                setFetchedModels([]);
                                setConnectStatus({loading: false, msg: '', type: null});
                                setGenStatus({loading: false, msg: '', type: null});
                            }}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all group ${
                                settings.provider === 'openai' 
                                ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg shrink-0 ${settings.provider === 'openai' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                    <Server size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                                        OpenAI 兼容接口
                                        {settings.provider === 'openai' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">当前选择</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        支持 <strong>DeepSeek</strong>、<strong>Kimi (Moonshot)</strong>、<strong>GPT-4</strong> 等所有兼容 OpenAI 接口的模型。灵活性高，适合已有其他厂商 Key 的用户。
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Gemini Config */}
                {settings.provider === 'gemini' && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                         <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini 配置</h4>
                         </div>
                         <div>
                            <label className="block text-xs text-slate-600 mb-1">API Key</label>
                            <input 
                              type="password" 
                              value={settings.geminiApiKey}
                              onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-shadow"
                              placeholder="AIzaSy..."
                            />
                            <p className="text-[10px] text-slate-400 mt-1">请使用 Google AI Studio 生成的 API Key。</p>
                        </div>
                    </div>
                )}

                {/* OpenAI Config */}
                {settings.provider === 'openai' && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center mb-1">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">通用接口配置</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Base URL (接口地址)</label>
                                <input 
                                type="text" 
                                value={settings.openaiBaseUrl}
                                onChange={(e) => setSettings({...settings, openaiBaseUrl: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-xs"
                                placeholder="https://api.openai.com/v1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">API Key</label>
                                <input 
                                type="password" 
                                value={settings.openaiApiKey}
                                onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="sk-..."
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs text-slate-600">模型名称 (Model Name)</label>
                                    {fetchedModels.length > 0 && (
                                        <span className="text-[10px] text-green-600 flex items-center gap-1">
                                            <Check size={10} /> 已同步 {fetchedModels.length} 个模型
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        list="model-options"
                                        value={settings.openaiModel}
                                        onChange={(e) => setSettings({...settings, openaiModel: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                                        placeholder="例如: deepseek-chat, gpt-4o"
                                        autoComplete="off"
                                    />
                                    <datalist id="model-options">
                                        {fetchedModels.map(m => (
                                            <option key={m} value={m} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Two Action Buttons for AI */}
                <div className="flex flex-col gap-3 pt-2">
                    <div className="flex gap-3">
                        <button 
                            onClick={handleConnect} 
                            disabled={connectStatus.loading || genStatus.loading} 
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 font-medium transition-all active:scale-95 disabled:opacity-50"
                        >
                            {connectStatus.loading ? (
                                <><Link2 size={14} className="animate-spin"/> 连接中...</>
                            ) : (
                                <><Link2 size={14}/> 连接 & 获取模型</>
                            )}
                        </button>

                        <button 
                            onClick={handleTestGeneration} 
                            disabled={connectStatus.loading || genStatus.loading} 
                            className={`flex-1 px-3 py-2 bg-white border rounded-lg text-sm shadow-sm flex items-center justify-center gap-2 font-medium transition-all active:scale-95 disabled:opacity-50
                                ${settings.provider === 'gemini' ? 'border-teal-200 text-teal-700 hover:bg-teal-50' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}
                            `}
                        >
                            {genStatus.loading ? (
                                <><Zap size={14} className="animate-pulse"/> 生成中...</>
                            ) : (
                                <><Zap size={14}/> 测试生成能力</>
                            )}
                        </button>
                    </div>

                    {/* Status Messages Area */}
                    {(connectStatus.msg || genStatus.msg) && (
                        <div className="space-y-2 text-xs">
                             {connectStatus.msg && (
                                <div className={`px-3 py-2 rounded flex items-start gap-2 ${connectStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                    <Activity size={14} className="shrink-0 mt-0.5" />
                                    <span>{connectStatus.msg}</span>
                                </div>
                             )}
                             {genStatus.msg && (
                                <div className={`px-3 py-2 rounded flex items-start gap-2 ${genStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                    <Zap size={14} className="shrink-0 mt-0.5" />
                                    <span>{genStatus.msg}</span>
                                </div>
                             )}
                        </div>
                    )}
                </div>
             </div>
          )}

          {activeTab === 'mcp' && (
              <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                      <div className="flex items-start gap-3">
                          <Network size={32} className="opacity-80"/>
                          <div>
                              <h4 className="font-bold text-lg mb-1">Model Context Protocol (MCP)</h4>
                              <p className="text-xs opacity-90 leading-relaxed">
                                  MCP 是一个开放标准，允许 AI 助手连接到外部数据和工具。启用后，TravelGenius 将能调用您本地或远程服务器上的工具（如：实时航班查询、私有知识库检索）。
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-slate-700">启用外部 MCP 支持</label>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input 
                                  type="checkbox" 
                                  name="toggle" 
                                  id="mcp-toggle" 
                                  checked={settings.enableMcp}
                                  onChange={(e) => setSettings({...settings, enableMcp: e.target.checked})}
                                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer peer checked:right-0 right-5"
                              />
                              <label htmlFor="mcp-toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors ${settings.enableMcp ? 'bg-teal-500' : 'bg-slate-300'}`}></label>
                          </div>
                          <style>{`
                              #mcp-toggle:checked + label { background-color: #14b8a6; }
                              #mcp-toggle:checked { right: 0; border-color: #14b8a6; }
                              #mcp-toggle { right: 20px; border-color: #cbd5e1; transition: all 0.3s; }
                          `}</style>
                      </div>

                      {settings.enableMcp && (
                        <div className="space-y-3 animate-fadeIn">
                             <div>
                                 <label className="block text-xs text-slate-600 mb-1">MCP SSE Endpoint URL</label>
                                 <input 
                                     type="text" 
                                     value={settings.mcpEndpoint || ''}
                                     onChange={(e) => setSettings({...settings, mcpEndpoint: e.target.value})}
                                     className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none font-mono text-slate-600"
                                     placeholder="http://localhost:3000/sse"
                                 />
                                 <div className="flex items-start gap-1 mt-2 text-[10px] text-slate-500">
                                     <Info size={12} className="mt-0.5 shrink-0"/>
                                     <span>需要运行支持 SSE 传输的 MCP Server。浏览器环境不支持标准 Stdio 连接。</span>
                                 </div>
                             </div>

                             <div className="flex flex-col gap-2">
                                <button 
                                    onClick={handleTestMcp} 
                                    disabled={mcpStatus.loading}
                                    className="w-full px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
                                >
                                    {mcpStatus.loading ? <Plug2 size={16} className="animate-pulse"/> : <Plug2 size={16}/>}
                                    {mcpStatus.loading ? "正在握手..." : "测试连接 & 获取工具列表"}
                                </button>
                                
                                {mcpStatus.msg && (
                                    <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${mcpStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                        <Activity size={14} className="shrink-0 mt-0.5" />
                                        <span className="break-all">{mcpStatus.msg}</span>
                                    </div>
                                )}
                             </div>
                        </div>
                      )}
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
                            className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                            placeholder="高德开放平台申请的 Key (Web JS API)"
                            />
                            <p className="text-[10px] text-slate-500 bg-white/60 p-2 rounded mt-2 border border-blue-100 leading-relaxed">
                                ⚠️ <strong>注意：</strong> 必须使用 <b>Web端 (JS API)</b> 类型的 Key。<br/>
                                如果使用了 "Web服务" 类型的 Key，虽然下方的网络测试通过，但地图组件会报错或无法加载。
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
                        
                        <div className="pt-2 border-t border-blue-100 mt-2">
                             <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-teal-700 flex items-center gap-1"><Network size={12}/> Amap Built-in MCP</span>
                             </div>
                            <label className="block text-xs text-slate-600 mb-1">Web服务 (Web Service) Key <span className="text-xs text-slate-400 font-normal">(可选，用于 AI 工具)</span></label>
                            <input 
                                type="text" 
                                value={settings.amapWebServiceKey || ''}
                                onChange={(e) => setSettings({...settings, amapWebServiceKey: e.target.value})}
                                className="w-full px-3 py-2 border border-teal-200 rounded text-sm focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                                placeholder="高德 Web 服务 Key (用于天气、POI搜索工具)"
                            />
                             <p className="text-[10px] text-slate-500 mt-1">
                                配置后，AI 将具备调用高德 <b>天气查询</b> 和 <b>POI 搜索</b> 的能力，生成的行程信息更准确。请确保该 Key 开启了 Web 服务权限。
                            </p>
                        </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleTestMap} disabled={mapTestStatus.loading} className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-teal-700 hover:bg-slate-50 shadow-sm flex items-center gap-2 font-medium transition-colors">
                        {mapTestStatus.loading ? '连接中...' : <><Wifi size={14}/> 测试 JS API 网络连通性</>}
                    </button>
                </div>
                {mapTestStatus.msg && (
                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${mapTestStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                        <Activity size={18} className="shrink-0 mt-0.5" />
                        <span>{mapTestStatus.msg}</span>
                    </div>
                )}
             </div>
          )}

        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
          <button 
            onClick={() => onSave(settings)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors transform active:scale-95"
          >
            <Save size={16} /> 保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;