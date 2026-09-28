import React, { useState } from 'react';
import { trackEvent } from '../utils/analytics';
import { 
  X, Bookmark, Share2, Volume2, VolumeX, Clock, Calendar, 
  Send, MessageSquare, Check, Sparkles, Type, ChevronLeft, Camera 
} from 'lucide-react';

export default function ArticleModal({ 
  article, 
  onClose, 
  onToggleBookmark, 
  isBookmarked,
  fontSize
}) {
  if (!article) return null;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(article.comments || []);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(1);

  const getBadgeClass = (cat) => {
    switch(cat) {
      case 'politica': return 'badge-politica';
      case 'turismo': return 'badge-turismo';
      case 'entretenimento': return 'badge-entretenimento';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newC = {
      id: Date.now().toString(),
      user: 'Você (Leitor NG)',
      text: commentText.trim(),
      time: 'Agora mesmo'
    };
    setComments([newC, ...comments]);
    setCommentText('');
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white text-slate-900 rounded-none md:rounded-2xl md:shadow-lg border-0 md:border md:border-slate-200 overflow-hidden my-4 md:my-8 flex flex-col relative animate-in fade-in duration-300">
      
      {/* Top Action Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shadow-sm">
          
          <button 
            onClick={() => { trackEvent('Interação', 'Fechar Matéria'); onClose(); }}
            className="flex items-center gap-1 text-xs font-bold text-title-blue hover:text-blue-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao Portal</span>
          </button>

          <div className="flex items-center gap-2">
            
            {/* Font Adjuster inside reader */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs text-slate-600">
              <Type className="w-3.5 h-3.5" />
              <button 
                onClick={() => setLocalFontSize(prev => Math.max(0.85, prev - 0.1))} 
                className="px-1.5 font-bold hover:text-title-blue"
              >-</button>
              <span className="font-semibold text-title-blue min-w-[32px] text-center">
                {Math.round(localFontSize * 100)}%
              </span>
              <button 
                onClick={() => setLocalFontSize(prev => Math.min(1.35, prev + 0.1))} 
                className="px-1.5 font-bold hover:text-title-blue"
              >+</button>
            </div>

            {/* Bookmark button */}
            <button 
              onClick={() => onToggleBookmark(article)}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isBookmarked(article.id)
                  ? 'bg-[#fff1f2] text-[#d40a38] border-[#fecdd3]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked(article.id) ? 'fill-[#006644]' : ''}`} />
              <span className="hidden sm:inline">{isBookmarked(article.id) ? 'Salvo' : 'Salvar'}</span>
            </button>

            {/* Close Modal X */}
            <button 
              onClick={() => { trackEvent('Interação', 'Fechar Matéria'); onClose(); }}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </div>

        {/* Scrollable Reader Content */}
        <div className="overflow-y-auto p-4 sm:p-8 lg:p-12 space-y-8 bg-white" style={{ fontSize: `${localFontSize * fontSize}rem` }}>
          
          {/* Header Metadata */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${getBadgeClass(article.category)}`}>
                {article.categoryLabel}
              </span>
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                📍 {article.praca}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading text-title-blue leading-tight mb-4">
              {article.title}
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed mb-6 font-serif italic">
              {article.subtitle}
            </p>

            {/* Author info & date bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-200 text-sm">
              <div className="flex items-center gap-3">
                <img src={article.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={article.author?.name || 'Redação'} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div>
                  <span className="font-bold text-slate-900 block">{article.author.name}</span>
                  <span className="text-slate-500 text-xs">{article.author.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-500 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#d40a38]" />
                  {article.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#d40a38]" />
                  {article.readTime}
                </span>
              </div>
            </div>
          </div>

          {/* AI Narração sintética player */}
          <div className="bg-[#f8fafc] p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-10 h-10 rounded-full btn-emerald flex items-center justify-center shrink-0 shadow-md"
              >
                {isPlayingAudio ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
              <div>
                <span className="text-xs font-bold text-title-blue uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#d40a38]" /> Ouvir Matéria com IA
                </span>
                <span className="text-xs text-slate-600 block font-medium mt-0.5">
                  {isPlayingAudio ? "Reproduzindo áudio do artigo..." : "Clique no play para escutar a matéria narrada."}
                </span>
              </div>
            </div>

            {isPlayingAudio && (
              <div className="flex items-center gap-1">
                <span className="w-1 h-4 bg-[#006644] animate-pulse"></span>
                <span className="w-1 h-6 bg-[#006644] animate-pulse delay-75"></span>
                <span className="w-1 h-3 bg-[#006644] animate-pulse delay-150"></span>
              </div>
            )}
          </div>

          {/* Featured Image with Caption */}
          <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
            <img src={article.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80'} alt={article.title} className="w-full max-h-[450px] object-cover" />
            <div className="p-3 bg-slate-50 text-slate-500 text-[10px] sm:text-xs font-medium border-t border-slate-200">
              Foto: Divulgação / Agência Portal NG Brasil. Todos os direitos reservados.
            </div>
          </div>

          {/* Key Highlights box */}
          {article.highlights && article.highlights.length > 0 && (
            <div className="bg-[#f0fdf4] p-5 rounded-r border-l-4 border-[#006644] shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#d40a38] font-heading">
                Destaques da Notícia
              </h3>
              <ul className="space-y-2 text-sm text-slate-800 font-medium">
                {article.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#d40a38] font-bold mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Article Body Paragraphs */}
          <div className="font-serif text-slate-800 leading-relaxed text-base sm:text-lg [&>p]:mb-5 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:font-heading [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:font-heading [&>h2]:mt-8 [&>h2]:mb-4 [&>img]:rounded-xl [&>img]:my-6 [&>img]:w-full [&>img]:object-cover [&>a]:text-blue-600 [&>a]:underline [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-5 [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:mb-5">
            {Array.isArray(article.content) 
              ? article.content.map((paragraph, index) => <p key={index} className="mb-5">{paragraph}</p>)
              : <div dangerouslySetInnerHTML={{ __html: article.content }} />
            }
          </div>

          {/* Instagram Follow Block */}
          <div className="mt-8 bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-100 p-5 rounded-xl flex flex-col sm:flex-row items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-800">Acompanhe os bastidores no Instagram</h4>
              <p className="text-xs text-slate-600 mt-0.5">Siga nossa redação e fique por dentro das notícias em tempo real.</p>
            </div>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              Seguir @portalngbrasil
            </a>
          </div>

          {/* Tags */}
          {article.tags && (
            <div className="pt-6 border-t border-slate-200 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags:</span>
              {article.tags.map((t, i) => (
                <span key={i} className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded border border-slate-200">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Social Share Bar */}
          <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 shadow-sm">
            <span className="text-sm font-bold text-title-blue flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#d40a38]" />
              Gostou? Compartilhe com sua rede:
            </span>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyShare}
                className="px-4 py-2 btn-emerald rounded text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="pt-8 mt-8 border-t border-slate-200 space-y-6">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-heading text-title-blue flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#d40a38]" />
                Comentários ({comments.length})
              </h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Participe da discussão..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-4 py-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006644]"
              />
              <button 
                type="submit"
                className="btn-emerald px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 sm:w-auto w-full shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Enviar</span>
              </button>
            </form>

            {/* Comment List */}
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{c.user}</span>
                    <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">{c.time}</span>
                  </div>
                  <p className="text-slate-600 font-medium">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}
