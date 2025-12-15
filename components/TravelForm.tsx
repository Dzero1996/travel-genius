import React, { useState, useEffect } from 'react';
import { UserPreferences, DestinationItem } from '../types';
import { Plane, Calendar, Wallet, Users, MapPin, Sparkles, Plus, X, GripVertical, Tag, MessageSquareText } from 'lucide-react';

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

const INTEREST_TAGS = [
  "特种兵打卡", "城市漫步(Citywalk)", "自然风光", "历史古迹", 
  "博物馆", "地道美食", "网红店", "亲子游", 
  "夜生活", "购物血拼", "温泉度假", "露营",
  "二次元", "摄影", "看展"
];

const PRESET_STYLES = ["休闲度假", "户外探险", "人文历史", "美食之旅", "紧凑打卡"];

const TravelForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  // Init Dates
  const today = new Date().toISOString().split('T')[0];
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [prefs, setPrefs] = useState<UserPreferences>({
    destinations: [{ id: '1', name: '' }],
    startDate: today,
    endDate: threeDaysLater,
    budget: '5000元',
    travelers: 2,
    style: '休闲度假',
    interests: [],
    additionalRequirements: ''
  });

  const [duration, setDuration] = useState(4);
  const [isCustomStyle, setIsCustomStyle] = useState(false);
  const [destInput, setDestInput] = useState('');

  // Auto calculate duration
  useEffect(() => {
    const start = new Date(prefs.startDate);
    const end = new Date(prefs.endDate);
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1;
    setDuration(days > 0 ? days : 0);
  }, [prefs.startDate, prefs.endDate]);

  const handleAddDest = () => {
    if (destInput.trim()) {
      setPrefs(p => ({
        ...p,
        destinations: [...p.destinations.filter(d => d.name), { id: Date.now().toString(), name: destInput }]
      }));
      setDestInput('');
    }
  };

  const handleRemoveDest = (id: string) => {
    setPrefs(p => ({ ...p, destinations: p.destinations.filter(d => d.id !== id) }));
  };

  const toggleInterest = (tag: string) => {
    setPrefs(p => {
      const exists = p.interests.includes(tag);
      return {
        ...p,
        interests: exists ? p.interests.filter(i => i !== tag) : [...p.interests, tag]
      };
    });
  };

  const handleSwapDest = (index: number, direction: -1 | 1) => {
      const newDests = [...prefs.destinations];
      if (index + direction >= 0 && index + direction < newDests.length) {
          [newDests[index], newDests[index + direction]] = [newDests[index + direction], newDests[index]];
          setPrefs({...prefs, destinations: newDests});
      }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Sparkles className="text-teal-500" /> 开启智能规划
      </h2>
      
      <div className="space-y-6">
        {/* Destinations */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">目的地 (支持多地排序)</label>
          <div className="space-y-2 mb-2">
            {prefs.destinations.filter(d => d.name).map((dest, idx) => (
                <div key={dest.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200 group">
                    <span className="text-xs font-mono text-slate-400 w-4">{idx + 1}</span>
                    <MapPin size={16} className="text-teal-500 shrink-0" />
                    <span className="flex-1 font-medium text-slate-700">{dest.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleSwapDest(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><GripVertical size={12} className="rotate-180"/></button>
                         <button onClick={() => handleSwapDest(idx, 1)} disabled={idx === prefs.destinations.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><GripVertical size={12}/></button>
                    </div>
                    <button onClick={() => handleRemoveDest(dest.id)} className="text-slate-400 hover:text-red-500 p-1"><X size={16}/></button>
                </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="输入城市或景点 (如: 成都)"
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDest()}
                    disabled={isLoading}
                />
            </div>
            <button 
                onClick={handleAddDest}
                disabled={!destInput}
                className="bg-teal-50 text-teal-700 px-4 py-2 rounded-lg border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition"
            >
                <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">开始日期</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="date" 
                        value={prefs.startDate}
                        onChange={(e) => setPrefs({...prefs, startDate: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                </div>
            </div>
            <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">结束日期</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="date" 
                        value={prefs.endDate}
                        min={prefs.startDate}
                        onChange={(e) => setPrefs({...prefs, endDate: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                </div>
            </div>
            <div className="col-span-2 text-right">
                <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded">共 {duration} 天</span>
            </div>
        </div>

        {/* People & Budget */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">人数</label>
                <div className="relative">
                    <Users className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                    type="number"
                    min="1"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                    value={prefs.travelers}
                    onChange={(e) => setPrefs({ ...prefs, travelers: parseInt(e.target.value) || 1 })}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">预算</label>
                <div className="relative">
                    <Wallet className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none"
                    value={prefs.budget}
                    onChange={(e) => setPrefs({ ...prefs, budget: e.target.value })}
                    />
                </div>
            </div>
        </div>

        {/* Style */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">旅行风格</label>
          <div className="flex gap-2 mb-2">
              {PRESET_STYLES.map(style => (
                  <button 
                    key={style}
                    onClick={() => { setPrefs({...prefs, style}); setIsCustomStyle(false); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${prefs.style === style && !isCustomStyle ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                  >
                      {style}
                  </button>
              ))}
              <button 
                onClick={() => { setIsCustomStyle(true); setPrefs({...prefs, style: ''}); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${isCustomStyle ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                  自定义
              </button>
          </div>
          {isCustomStyle && (
              <input 
                type="text"
                placeholder="输入你的独特风格 (如: 建筑摄影之旅)"
                value={prefs.style}
                onChange={(e) => setPrefs({...prefs, style: e.target.value})}
                className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 animate-fadeIn"
                autoFocus
              />
          )}
        </div>

        {/* Interests Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
              <Tag size={14}/> 兴趣偏好 (多选)
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map(tag => (
                <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                        prefs.interests.includes(tag) 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {tag}
                </button>
            ))}
          </div>
        </div>

        {/* Additional Requirements */}
        <div>
             <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                 <MessageSquareText size={14}/> 额外要求 (可选)
             </label>
             <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-none h-20"
                placeholder="例如：不想太累，每天睡到自然醒；或者必须包含某家特定的餐厅..."
                value={prefs.additionalRequirements}
                onChange={(e) => setPrefs({...prefs, additionalRequirements: e.target.value})}
             />
        </div>
      </div>

      <button
        onClick={() => onSubmit(prefs)}
        disabled={isLoading || prefs.destinations.filter(d => d.name).length === 0}
        className={`w-full mt-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all transform hover:scale-[1.01] flex justify-center items-center gap-2
          ${isLoading || prefs.destinations.filter(d => d.name).length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-indigo-600 hover:shadow-xl'}`}
      >
        {isLoading ? (
          <>系统分析中...</>
        ) : (
          <><Plane className="rotate-45" size={20} /> 生成旅行方案</>
        )}
      </button>
    </div>
  );
};

export default TravelForm;