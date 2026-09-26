import React from 'react';
import { MapPin, Globe2 } from 'lucide-react';

export default function RegionalFilter({ 
  regionalPracas, 
  selectedPraca, 
  setSelectedPraca 
}) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      
      <div className="flex items-center gap-2 shrink-0">
        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-heading uppercase tracking-wide">
          Filtrar por Estados & Regiões:
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
        {regionalPracas.map((praca) => {
          const isSelected = selectedPraca === praca;
          return (
            <button
              key={praca}
              onClick={() => setSelectedPraca(praca)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {praca === 'Todas' ? '📍 Todas as Regiões' : praca}
            </button>
          );
        })}
      </div>

    </div>
  );
}
