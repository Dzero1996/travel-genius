import React, { useState, useEffect } from 'react';
import { UserPreferences, Itinerary, AppSettings } from './types';
import { generateItinerary } from './services/geminiService';
import TravelForm from './components/TravelForm';
import MapComponent from './components/MapComponent';
import ProcessingView from './components/ProcessingLog';
import SettingsModal from './components/SettingsModal';
import { Map, Calendar, Sun, DollarSign, Star, ShieldCheck, Clock, Navigation, Settings, Download, Share2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0); 
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('travel_genius_settings');
    // Default fallback settings
    const defaults: AppSettings = {
      provider: 'gemini',
      geminiApiKey: '',
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiApiKey: '',
      openaiModel: 'gpt-3.5-turbo',
      amapKey: '',
      amapSecurityCode: '',
      crawlerUrl: ''
    };
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return { ...defaults, ...parsed }; // Merge to ensure new fields exist
        } catch (e) {
            return defaults;
        }
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('travel_genius_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSubmit = async (prefs: UserPreferences) => {
    // Validation based on provider
    if (settings.provider === 'gemini' && !settings.geminiApiKey) {
        setShowSettings(true);
        setError("请配置 Google Gemini API Key");
        return;
    }
    if (settings.provider === 'openai' && !settings.openaiApiKey) {
        setShowSettings(true);
        setError("请配置 OpenAI API Key");
        return;
    }

    setLoading(true);
    setError(null);
    setItinerary(null);
    try {
      const result = await generateItinerary(prefs, settings);
      setItinerary(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成失败，请检查配置或网络连接");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col h-screen overflow-hidden">
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        initialSettings={settings}
        onSave={(newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
            setError(null);
        }}
      />

      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shadow-sm shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-teal-500 to-indigo-600 p-2 rounded-lg text-white">
            <Navigation size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-indigo-600">智游 AI</h1>
            <p className="text-xs text-slate-500">小红书数据驱动的旅行规划师</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1 text-slate-600 hover:text-teal-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <Settings size={16} /> 设置
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel */}
        <div className="w-full lg:w-[480px] bg-white border-r border-slate-200 overflow-y-auto z-10 shadow-lg flex flex-col print-only w-full">
          
          {/* Input Form Section */}
          <div className={`${itinerary ? 'hidden' : 'block'} p-6 no-print`}>
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">下一站，去哪儿？</h2>
                <p className="text-slate-500">
                    {settings.provider === 'gemini' ? 'Google Gemini 联网搜索中...' : 'AI Agent 准备就绪'}
                </p>
              </div>
              <TravelForm onSubmit={handleSubmit} isLoading={loading} />
              
              <div className="mt-12 flex flex-wrap justify-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs font-mono">{settings.provider === 'gemini' ? 'Gemini 2.5' : settings.openaiModel}</span>
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs font-mono">React</span>
                <span className={`px-2 py-1 rounded border text-xs font-mono ${settings.crawlerUrl ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-slate-100 border-slate-200'}`}>
                    {settings.crawlerUrl ? '外部爬虫: On' : '小红书模拟: On'}
                </span>
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs font-mono">AMap</span>
              </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-6 flex-1 flex flex-col justify-center">
               <ProcessingView isProcessing={loading} />
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="p-6 m-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setShowSettings(true)} className="underline text-sm">去配置</button>
            </div>
          )}

          {/* Itinerary Display */}
          {itinerary && !loading && (
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {/* Header Card */}
              <div className="bg-white p-6 border-b border-slate-200 sticky top-0 z-10 shadow-sm no-print">
                 <div className="flex justify-between items-start mb-2">
                    <button 
                        onClick={() => setItinerary(null)}
                        className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                    >
                        <RefreshCw size={12} /> 重新规划
                    </button>
                    <div className="flex gap-2">
                         <button onClick={handleExport} className="text-slate-500 hover:text-teal-600 p-1.5 rounded hover:bg-slate-100" title="导出 PDF">
                             <Download size={18} />
                         </button>
                    </div>
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800">{itinerary.tripTitle}</h2>
                 <p className="text-slate-600 text-sm mt-1 mb-3">{itinerary.summary}</p>
                 
                 <div className="flex gap-4 text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1"><DollarSign size={14} className="text-teal-500"/> {itinerary.totalCostEstimate}</div>
                    <div className="flex items-center gap-1"><Calendar size={14} className="text-teal-500"/> {itinerary.days.length} 天</div>
                 </div>
              </div>

              {/* Suggestions */}
              <div className="p-4 grid grid-cols-1 gap-4 print-only">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">推荐住宿</h3>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-semibold text-slate-800">{itinerary.hotelSuggestion.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{itinerary.hotelSuggestion.location.name}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-teal-600 font-bold">{itinerary.hotelSuggestion.pricePerNight}</div>
                             <div className="text-[10px] text-slate-400">/晚</div>
                        </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                         <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-100 flex items-center gap-1">
                            <Star size={10} fill="currentColor" /> {itinerary.hotelSuggestion.rating}
                         </span>
                    </div>
                 </div>

                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">交通建议</h3>
                    <div className="flex justify-between items-center">
                        <div className="font-semibold text-slate-800">{itinerary.flightSuggestion.airline}</div>
                        <div className="text-teal-600 font-bold">{itinerary.flightSuggestion.price}</div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{itinerary.flightSuggestion.notes}</p>
                 </div>
              </div>

              {/* Day Tabs */}
              <div className="sticky top-[160px] bg-slate-50 px-4 py-2 flex gap-2 overflow-x-auto z-10 border-b border-slate-200 no-scrollbar no-print">
                <button
                    onClick={() => setSelectedDay(0)}
                    className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedDay === 0 ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    总览
                </button>
                {itinerary.days.map(day => (
                    <button
                        key={day.day}
                        onClick={() => setSelectedDay(day.day)}
                        className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedDay === day.day ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        第 {day.day} 天
                    </button>
                ))}
              </div>

              {/* Timeline */}
              <div className="p-4 space-y-6">
                {itinerary.days.filter(d => selectedDay === 0 || d.day === selectedDay).map((day) => (
                    <div key={day.day} className="relative pl-4 border-l-2 border-slate-200 ml-2">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-teal-100 border-2 border-teal-500"></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1 pl-2">第 {day.day} 天</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 pl-2">
                            <Sun size={14} className="text-orange-400" /> {day.weatherForecast}
                        </div>

                        <div className="space-y-4">
                            {day.activities.map((act, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow ml-2 relative group break-inside-avoid">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono text-teal-600 bg-teal-50 px-1.5 rounded">{act.time}</span>
                                                <span className={`text-[10px] uppercase tracking-wider px-1.5 rounded border ${
                                                    act.category === 'food' ? 'text-orange-600 border-orange-200 bg-orange-50' : 
                                                    act.category === 'sightseeing' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                                                    'text-slate-500 border-slate-200 bg-slate-50'
                                                }`}>{act.category === 'food' ? '美食' : act.category === 'sightseeing' ? '景点' : '活动'}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800">{act.title}</h4>
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{act.description}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <ShieldCheck size={12} className={act.confidenceScore > 85 ? 'text-green-500' : 'text-yellow-500'} />
                                            小红书热度: {act.confidenceScore}%
                                        </div>
                                        <div className="font-mono text-slate-700 font-medium">
                                            预估 {act.costEstimate}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Map */}
        <div className="hidden lg:block flex-1 bg-slate-100 relative h-full no-print">
           <MapComponent itinerary={itinerary} selectedDay={selectedDay} settings={settings} />
           
           <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md z-[400] text-xs space-y-2">
                <div className="font-semibold text-slate-700 px-1">图例</div>
                <div className="flex items-center gap-2 px-1">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full border border-white shadow"></div>
                    <span>酒店</span>
                </div>
                <div className="flex items-center gap-2 px-1">
                    <div className="w-3 h-3 bg-teal-500 rounded-full border border-white shadow"></div>
                    <span>景点/活动</span>
                </div>
                <div className="flex items-center gap-2 px-1">
                    <div className="w-3 h-3 bg-orange-500 rounded-full border border-white shadow"></div>
                    <span>美食</span>
                </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;