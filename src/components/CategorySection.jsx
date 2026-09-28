import React from 'react';
import { trackEvent } from '../utils/analytics';
import { Bookmark, Clock } from 'lucide-react';

export default function CategorySection({ 
  categoryKey, 
  title, 
  subtitle, 
  icon: CategoryIcon,
  articles, 
  onSelectArticle, 
  onToggleBookmark, 
  isBookmarked 
}) {
  if (!articles || articles.length === 0) return null;

  const getBadgeClass = (cat) => {
    switch(cat) {
      case 'policial': return 'badge-policial';
      case 'politica': return 'badge-politica';
      case 'turismo': return 'badge-turismo';
      case 'entretenimento': return 'badge-entretenimento';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getCategoryBorder = (cat) => {
    switch(cat) {
      case 'policial': return 'border-red-600';
      case 'politica': return 'border-sky-600';
      case 'turismo': return 'border-[#006644]';
      case 'entretenimento': return 'border-amber-500';
      default: return 'border-slate-300';
    }
  };

  return (
    <section className="mb-12">
      
      {/* Category Header */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between border-l-4 ${getCategoryBorder(categoryKey)} pl-3 pb-2 mb-6 gap-2 border-b border-b-slate-200`}>
        <div>
          <div className="flex items-center gap-2">
            {CategoryIcon && <CategoryIcon className="w-5 h-5 text-title-blue" />}
            <h2 className="text-xl sm:text-2xl font-black text-title-blue font-heading tracking-tight capitalize uppercase">
              {title}
            </h2>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Mais recentes
        </span>
      </div>

      {/* Grid of news */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((item) => (
          <article 
            key={item.id} 
            className="news-card border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between group cursor-pointer relative"
          >
            {/* Image */}
            <div 
              onClick={() => onSelectArticle(item)}
              className="relative h-48 w-full overflow-hidden bg-slate-100 border-b border-slate-200"
            >
              <img 
                src={item.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase shadow-sm ${getBadgeClass(item.category)}`}>
                  {item.categoryLabel}
                </span>
              </div>

              {/* Bookmark Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleBookmark(item); }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-sm transition-transform active:scale-95"
                title={isBookmarked(item.id) ? "Remover dos favoritos" : "Salvar notícia"}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked(item.id) ? 'fill-[#006644] text-[#006644]' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Content Body */}
            <div 
              onClick={() => onSelectArticle(item)}
              className="p-4 flex flex-col justify-between flex-1 bg-white"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  📍 {item.praca}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-title-blue group-hover:text-blue-700 line-clamp-2 transition-colors mb-2 font-heading leading-snug">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 mb-4">
                  {item.subtitle}
                </p>
              </div>

              {/* Footer Author & Read time */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-auto">
                <span className="truncate max-w-[150px] font-semibold text-slate-700">{item.author.name}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {item.readTime}
                </span>
              </div>

            </div>

          </article>
        ))}
      </div>

    </section>
  );
}
