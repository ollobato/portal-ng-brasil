import React from 'react';
import { trackEvent } from '../utils/analytics';
import { Bookmark, Clock, Flame, ChevronRight, TrendingUp } from 'lucide-react';

export default function HeroSection({ 
  featuredNews, 
  trendingNews, 
  onSelectArticle,
  onToggleBookmark,
  isBookmarked
}) {
  if (!featuredNews) return null;

  const getBadgeClass = (category) => {
    switch(category) {
      case 'politica': return 'badge-politica';
      case 'turismo': return 'badge-turismo';
      case 'entretenimento': return 'badge-entretenimento';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <section className="mb-12">
      
      {/* Hero Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-title-blue" />
          <h2 className="text-2xl font-black tracking-tight text-title-blue font-heading uppercase">
            Manchetes
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Super Manchete (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <div 
            onClick={() => onSelectArticle(featuredNews)}
            className="news-card rounded-none overflow-hidden flex flex-col h-full group cursor-pointer border border-slate-200"
          >
            {/* Main Image */}
            <div className="relative h-[300px] sm:h-[400px] w-full overflow-hidden bg-slate-100">
              <img 
                src={featuredNews.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'} 
                alt={featuredNews.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              
              {/* Badges Overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <span className={`px-3 py-1 rounded-sm text-xs font-black uppercase tracking-wider ${getBadgeClass(featuredNews.category)} shadow-sm`}>
                  {featuredNews.categoryLabel}
                </span>
              </div>

              {/* Bookmark Toggle Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleBookmark(featuredNews); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm border border-slate-200 transition-transform active:scale-95 z-10"
                title={isBookmarked(featuredNews.id) ? "Remover dos favoritos" : "Salvar notícia"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked(featuredNews.id) ? 'fill-[#006644] text-[#d40a38]' : 'text-slate-400'}`} />
              </button>
            </div>
            
            {/* Text Content Below Image */}
            <div className="p-6 bg-white flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-[#d40a38] uppercase tracking-wider">
                <span>{featuredNews.praca}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {featuredNews.readTime}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-title-blue leading-snug mb-3 group-hover:text-blue-700 transition-colors font-heading">
                {featuredNews.title}
              </h1>

              <p className="text-slate-600 text-sm sm:text-base line-clamp-3 mb-5 font-normal leading-relaxed">
                {featuredNews.subtitle}
              </p>

              {/* Author info */}
              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
                <img src={featuredNews.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={featuredNews.author?.name || 'Redação'} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">{featuredNews.author.name}</span>
                  <span className="text-slate-500 text-[10px] uppercase">{featuredNews.author.role}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Side Trending Cards (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-4">
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide font-heading">
              Mais Lidas
            </h3>
            <TrendingUp className="w-4 h-4 text-[#d40a38]" />
          </div>

          <div className="flex flex-col gap-0 divide-y divide-slate-200 border-b border-slate-200">
            {trendingNews.slice(0, 4).map((item, idx) => (
              <div 
                key={item.id}
                onClick={() => onSelectArticle(item)}
                className="py-4 cursor-pointer hover:bg-slate-50 flex gap-4 items-start group transition-all"
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getBadgeClass(item.category)}`}>
                      {item.categoryLabel}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-title-blue group-hover:text-blue-700 line-clamp-3 transition-colors leading-snug">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-medium">
                    <span className="uppercase">{item.praca}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>
                </div>
                
                <div className="w-24 h-24 rounded-md overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                  <img src={item.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
