import React from 'react';
import { trackEvent } from '../utils/analytics';
import { X, Bookmark, Trash2, ArrowRight, Clock } from 'lucide-react';

export default function SavedArticlesModal({ 
  savedArticles, 
  onClose, 
  onSelectArticle, 
  onRemoveSaved 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      
      <div 
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[85vh] flex flex-col relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-red-500 fill-emerald-500/20" />
            <h2 className="text-lg font-bold font-heading">
              Seus Artigos Salvos ({savedArticles.length})
            </h2>
          </div>
          <button 
            onClick={() => { trackEvent('Interação', 'Fechar Modais Salvos'); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3">
          {savedArticles.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Você ainda não salvou nenhuma notícia.
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Clique no ícone de marcador nas matérias para ler mais tarde a qualquer momento.
              </p>
            </div>
          ) : (
            savedArticles.map((item) => (
              <div 
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-4 group transition-all"
              >
                <div 
                  onClick={() => { trackEvent('Conteúdo', 'Abrir Matéria Salva', item.title); onSelectArticle(item); onClose(); }}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <img src={item.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'} alt={item.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                      {item.categoryLabel} • {item.praca}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-500 line-clamp-2">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => onRemoveSaved(item.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors shrink-0"
                  title="Remover dos salvos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
