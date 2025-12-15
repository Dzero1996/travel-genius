import React, { useState } from 'react';
import { UserPreferences, TravelStyle } from '../types';
import { Plane, Calendar, Wallet, Users, MapPin, Sparkles } from 'lucide-react';

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

const TravelForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [prefs, setPrefs] = useState<UserPreferences>({
    destination: '',
    duration: 3,
    budget: '5000元',
    travelers: 2,
    style: TravelStyle.RELAXED,
    interests: []
  });

  const [currentInterest, setCurrentInterest] = useState('');

  const handleInterestAdd = () => {
    if (currentInterest && !prefs.interests.includes(currentInterest)) {
      setPrefs(p => ({ ...p, interests: [...p.interests, currentInterest] }));
      setCurrentInterest('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Sparkles className="text-teal-500" /> 开启智能规划
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Destination */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">目的地</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              placeholder="例如: 成都, 长沙, 东京"
              value={prefs.destination}
              onChange={(e) => setPrefs({ ...prefs, destination: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">天数</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="number"
              min="1"
              max="14"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={prefs.duration}
              onChange={(e) => setPrefs({ ...prefs, duration: parseInt(e.target.value) || 1 })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Travelers */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">人数</label>
          <div className="relative">
            <Users className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="number"
              min="1"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={prefs.travelers}
              onChange={(e) => setPrefs({ ...prefs, travelers: parseInt(e.target.value) || 1 })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">总预算 (CNY)</label>
          <div className="relative">
            <Wallet className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={prefs.budget}
              onChange={(e) => setPrefs({ ...prefs, budget: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Style */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">旅行风格</label>
          <select
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            value={prefs.style}
            onChange={(e) => setPrefs({ ...prefs, style: e.target.value as TravelStyle })}
            disabled={isLoading}
          >
            {Object.values(TravelStyle).map(style => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>

        {/* Interests */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">兴趣偏好</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              placeholder="输入兴趣点 (如: 火锅, 爬山, 看展)"
              value={currentInterest}
              onChange={(e) => setCurrentInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInterestAdd()}
              disabled={isLoading}
            />
            <button 
              onClick={handleInterestAdd}
              type="button"
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition"
              disabled={isLoading}
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {prefs.interests.map(interest => (
              <span key={interest} className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm border border-teal-100 flex items-center gap-1">
                {interest}
                <button 
                  onClick={() => setPrefs(p => ({...p, interests: p.interests.filter(i => i !== interest)}))}
                  className="hover:text-teal-900 ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onSubmit(prefs)}
        disabled={isLoading || !prefs.destination}
        className={`w-full mt-8 py-3 rounded-lg text-white font-semibold shadow-lg transition-all transform hover:scale-[1.02] flex justify-center items-center gap-2
          ${isLoading || !prefs.destination ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-indigo-600 hover:shadow-xl'}`}
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