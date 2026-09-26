import React from 'react';
import { trackEvent } from '../utils/analytics';
import { Search, Mail, Compass, Landmark, Film, Globe, Filter, Sparkles, UserCircle, Cpu, HeartPulse, Newspaper } from 'lucide-react';

export default function Header({ 
  activeCategory, 
  setActiveCategory, 
  searchQuery, 
  setSearchQuery,
  onOpenNewsletter,
  selectedPraca,
  setSelectedPraca,
  onNavigateLogin
}) {
  const navItems = [
    { id: 'all', label: 'Início', icon: Globe },
    { id: 'brasil', label: 'Brasil', icon: Newspaper, color: 'text-emerald-500' },
    { id: 'politica', label: 'Política', icon: Landmark, color: 'text-sky-500' },
    { id: 'tecnologia', label: 'Tecnologia', icon: Cpu, color: 'text-purple-500' },
    { id: 'saude', label: 'Saúde', icon: HeartPulse, color: 'text-rose-500' },
    { id: 'turismo', label: 'Turismo', icon: Compass, color: 'text-[#006644]' },
    { id: 'entretenimento', label: 'Entretenimento', icon: Film, color: 'text-amber-500' },
  ];

  return (
    <header className="relative z-40 bg-gradient-to-b from-[#040f1d] to-[#092244] text-white border-b border-slate-800 shadow-lg transition-colors duration-300">
      
      {/* Top Utility Bar (Login) */}
      <div className="bg-[#040f1d] border-b border-slate-800/50 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-end">
          <button 
            onClick={() => { trackEvent('Navegação', 'Clique Login'); onNavigateLogin(); }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 hover:text-white uppercase tracking-wider"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span>Acesso Restrito</span>
          </button>
        </div>
      </div>

      {/* Brand Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={() => { trackEvent('Navegação', 'Clique Logo Home'); setActiveCategory('all'); setSelectedPraca('Todas'); }}
          className="flex items-center gap-5 cursor-pointer group"
        >
          {/* Logo Container */}
          <div className="relative w-20 h-20 md:w-28 md:h-28 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <img 
              src="/logo/logo-transparent.png" 
              alt="Logo Portal NG Brasil" 
              className="w-full h-full object-contain drop-shadow-md"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-4xl md:text-5xl font-black tracking-tight text-[#F1EAD7] font-heading">
                PORTAL <span className="text-[#d40a38]">NG</span> BRASIL
              </span>
            </div>
            <span className="text-sm md:text-base font-medium text-slate-300 mt-1 italic tracking-wide">
              Jornalismo Digital • Informação Completa para o seu Dia a Dia
            </span>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 w-full md:max-w-sm">
          
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar no portal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#d40a38] transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => { trackEvent('Busca', 'Limpar Busca'); setSearchQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button 
            onClick={() => { trackEvent('Interação', 'Abrir Modal Newsletter'); onOpenNewsletter(); }}
            className="hidden sm:flex items-center gap-1.5 bg-[#d40a38] hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shrink-0 shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Newsletter</span>
          </button>

        </div>

      </div>

      {/* Navigation Links Bar */}
      <div className="bg-[#040f1d]/60 backdrop-blur-md border-t border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar py-2.5">
          
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveCategory(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active Praça Filter Badge */}
          {selectedPraca !== 'Todas' && (
            <div className="flex items-center gap-1.5 text-xs text-[#d40a38] font-bold bg-[#2d070f] px-3 py-1.5 rounded-md border border-[#d40a38] shrink-0 ml-4">
              <Filter className="w-3.5 h-3.5" />
              <span>{selectedPraca}</span>
              <button 
                onClick={() => setSelectedPraca('Todas')}
                className="ml-1 text-[#d40a38] hover:text-white font-bold"
              >✕</button>
            </div>
          )}

        </div>
      </div>

    </header>
  );
}
