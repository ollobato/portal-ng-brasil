import React from 'react';
import { trackEvent } from '../utils/analytics';
import { Bookmark, Type, Activity } from 'lucide-react';

export default function TickerBar({ 
  tickerItems, 
  weatherCities, 
  currencyRates, 
  savedCount,
  dailyViews,
  onOpenSavedModal,
  fontSize,
  setFontSize
}) {
  const todayDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedDate = todayDate.charAt(0).toUpperCase() + todayDate.slice(1);

  return (
    <div className="bg-[#d40a38] text-white border-b border-red-900 text-xs py-1.5 px-4 select-none transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Ticker Plantão */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
          <div className="flex items-center gap-1.5 bg-white text-[#d40a38] font-black px-2.5 py-0.5 rounded-sm text-[10px] tracking-wider uppercase shrink-0 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d40a38] pulse-red"></span>
            PLANTÃO
          </div>

          <div className="overflow-hidden relative w-full md:w-[460px] lg:w-[580px] h-5 flex items-center">
            <div className="animate-ticker space-x-8 font-semibold">
              {tickerItems.map((item, idx) => (
                <span key={idx} className="inline-flex items-center gap-2 cursor-pointer hover:text-amber-400 transition-colors">
                  <span className="text-amber-400 font-bold">•</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Date, Weather, Currencies & Controls */}
        <div className="flex items-center flex-wrap justify-end gap-4 text-slate-100 shrink-0">
          
          {/* Daily Views */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded border border-white/20" title="Acessos do Dia">
            <Activity className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] uppercase font-bold text-white tracking-wider">Acessos: <span className="text-white">{dailyViews}</span></span>
          </div>

          {/* Weather preview */}
          <div className="hidden lg:flex items-center gap-2 bg-white/10 px-2 py-0.5 rounded border border-white/20">
            <span>{weatherCities[0].icon}</span>
            <span className="text-slate-100 font-medium">{weatherCities[0].city}:</span>
            <span className="text-white font-bold">{weatherCities[0].temp}</span>
          </div>

          {/* Currencies */}
          <div className="hidden sm:flex items-center gap-3 bg-white/10 px-2 py-0.5 rounded border border-white/20">
            {currencyRates.slice(0, 2).map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-slate-300 font-medium">{c.pair}:</span>
                <span className="text-white font-bold">{c.val}</span>
                <span className={c.positive ? "text-emerald-400 text-[10px] font-bold" : "text-rose-400 text-[10px] font-bold"}>{c.change}</span>
              </span>
            ))}
          </div>

          {/* Date */}
          <span className="hidden xl:inline-block text-slate-100 capitalize font-medium">{formattedDate}</span>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded border border-white/20">
            <Type className="w-3.5 h-3.5 text-slate-100" />
            <button 
              onClick={() => setFontSize(prev => Math.max(0.9, prev - 0.1))} 
              className="px-1 text-slate-100 hover:text-white font-bold hover:bg-white/20 rounded" 
              title="Diminuir fonte"
            >-</button>
            <span className="text-[10px] text-white font-bold w-5 text-center">
              {Math.round(fontSize * 100)}%
            </span>
            <button 
              onClick={() => setFontSize(prev => Math.min(1.3, prev + 0.1))} 
              className="px-1 text-slate-100 hover:text-white font-bold hover:bg-white/20 rounded" 
              title="Aumentar fonte"
            >+</button>
          </div>

          {/* Bookmarks Counter */}
          <button 
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 bg-[#040f1d] text-white hover:bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded transition-colors"
            title="Ver notícias salvas"
          >
            <Bookmark className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-bold">{savedCount}</span>
          </button>

        </div>

      </div>
    </div>
  );
}
