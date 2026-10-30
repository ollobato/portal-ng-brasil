import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  MessageCircle, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  Layers,
  RefreshCw
} from 'lucide-react';
import { retryPlatformPublish } from '../utils/metaPublisher.js';

const InstagramIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const ThreadsIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm5.727 12.604c-.396.993-1.01 1.79-1.842 2.39-1.077.78-2.457 1.055-3.885.772-2.38-.47-4.11-2.483-4.11-4.766 0-2.673 2.167-4.84 4.84-4.84 2.45 0 4.49 1.835 4.79 4.25h-1.98c-.27-1.35-1.44-2.35-2.81-2.35-1.57 0-2.85 1.28-2.85 2.85 0 1.57 1.28 2.85 2.85 2.85.91 0 1.7-.44 2.19-1.12l1.64.91c-.08.13-.17.26-.26.39l1.45.86z"/>
  </svg>
);

const LinkedInIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default function PublishSuccessModal({
  isOpen,
  onClose,
  data,
  onRetryPlatform
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [retryingPlatform, setRetryingPlatform] = useState(null);
  const [localLinks, setLocalLinks] = useState({});
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    if (data) {
      setLocalLinks(data.links || {});
      setLocalErrors(data.errors || {});
      setRetryingPlatform(null);
    }
  }, [data?.article?.id, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const {
    isPublishing = false,
    statusText = '',
    article = {},
    target = 'all',
    targetPlatforms = ['facebook', 'instagram']
  } = data;

  const handleRetry = async (platform) => {
    if (retryingPlatform) return;
    setRetryingPlatform(platform);

    try {
      let result = null;
      if (typeof onRetryPlatform === 'function') {
        result = await onRetryPlatform(platform, { ...data, links: localLinks, errors: localErrors });
      } else {
        result = await retryPlatformPublish({
          platform,
          article,
          shareUrl: localLinks.share || localLinks.site,
          settings: {
            metaToken: localStorage.getItem("portal_ng_meta_token"),
            metaFbPageId: localStorage.getItem("portal_ng_meta_fb_page_id"),
            metaIgAccountId: localStorage.getItem("portal_ng_meta_ig_account_id"),
            threadsToken: localStorage.getItem("portal_ng_threads_token"),
            threadsUserId: localStorage.getItem("portal_ng_threads_user_id"),
            imgbbKey: localStorage.getItem("portal_ng_imgbb_key")
          }
        });
      }

      if (result?.success || result?.url) {
        const newUrl = result.url || (
          platform === 'instagram' ? 'https://www.instagram.com/portalngbrasil/' :
          platform === 'facebook' ? (localStorage.getItem("portal_ng_meta_fb_page_id") ? `https://www.facebook.com/${localStorage.getItem("portal_ng_meta_fb_page_id")}` : 'https://www.facebook.com/portalngbrasil') :
          platform === 'threads' ? 'https://www.threads.net/@portalngbrasil' :
          'https://www.linkedin.com/company/portalngbrasil'
        );

        setLocalLinks(prev => ({ ...prev, [platform]: newUrl }));
        setLocalErrors(prev => {
          const next = { ...prev };
          delete next[platform];
          return next;
        });
      }
    } catch (err) {
      console.error(`Erro ao reenviar para ${platform}:`, err);
      setLocalErrors(prev => ({
        ...prev,
        [platform]: err.message || `Erro ao reenviar para ${platform}`
      }));
    } finally {
      setRetryingPlatform(null);
    }
  };

  const handleCopy = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `🚨 *${article.title || 'Notícia em Destaque'}*\n\n${article.subtitle ? article.subtitle + '\n\n' : ''}Confira a matéria completa no Portal NG Brasil:\n${localLinks.site || localLinks.share || 'https://portalngbrasil.com.br'}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isPortalRequested = true; // Sempre publica no portal
  const isInstagramRequested = target === 'all' || target === 'instagram' || targetPlatforms.includes('instagram');
  const isFacebookRequested = target === 'all' || target === 'facebook' || targetPlatforms.includes('facebook');
  const isThreadsRequested = target === 'all' || target === 'threads' || targetPlatforms.includes('threads');
  const isLinkedinRequested = target === 'all' || target === 'linkedin' || targetPlatforms.includes('linkedin');
  const isXRequested = target === 'all' || target === 'x' || targetPlatforms.includes('x');

  const siteUrl = localLinks.site || `https://portalngbrasil.com.br/#/noticia/${article.id}`;
  const instagramUrl = localLinks.instagram || 'https://www.instagram.com/portalngbrasil/';
  const facebookUrl = localLinks.facebook || 'https://www.facebook.com/portalngbrasil';
  const threadsUrl = localLinks.threads || 'https://www.threads.net/@portalngbrasil';
  const linkedinUrl = localLinks.linkedin || 'https://www.linkedin.com/company/portalngbrasil';
  const xUrl = localLinks.x || 'https://x.com/portalngbrasil';

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPublishing ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isPublishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {isPublishing ? 'Processando Publicação...' : 'Matéria Publicada com Sucesso!'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {statusText || (isPublishing ? 'Enviando conteúdo para as plataformas solicitadas' : 'Conteúdo disponível para acesso e compartilhamento')}
              </p>
            </div>
          </div>

          {/* Botão X para fechar e ir para o Gestor de Matérias */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Sair e abrir o Gestor de Matérias"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Card Resumo da Matéria */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4 items-center">
            {article.image && (
              <img 
                src={article.image} 
                alt="Miniatura" 
                className="w-20 h-20 rounded-lg object-cover shrink-0 border border-slate-200 bg-slate-200"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="min-w-0 flex-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[#d40a38] mb-1.5">
                {article.categoryLabel || article.category || 'Portal NG Brasil'}
              </span>
              <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                {article.title || 'Título da Notícia'}
              </h4>
              {article.subtitle && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                  {article.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Lista de Links e Plataformas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              Links Oficiais da Publicação
            </h4>

            {/* 1. Site do Portal NG */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Site do Portal NG</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                      Disponível
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5 font-mono">
                    {siteUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleCopy('site', siteUrl)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'site' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Link</>
                  )}
                </button>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir no Site
                </a>
              </div>
            </div>

            {/* 2. Instagram */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isInstagramRequested ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-75'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Instagram (@portalngbrasil)</span>
                    {isInstagramRequested ? (
                      (isPublishing || retryingPlatform === 'instagram') ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> {retryingPlatform === 'instagram' ? 'Reenviando...' : 'Processando...'}
                        </span>
                      ) : localErrors.instagram ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700" title={localErrors.instagram}>
                            Erro no Envio
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRetry('instagram')}
                            disabled={Boolean(retryingPlatform)}
                            className="p-1 rounded-md bg-rose-100/80 hover:bg-rose-200 text-rose-700 hover:text-rose-900 border border-rose-200/60 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                            title="Tentar postar novamente no Instagram (forçar reenvio)"
                            aria-label="Tentar novamente no Instagram"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingPlatform === 'instagram' ? 'animate-spin text-rose-600' : ''}`} />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                          Publicado no Feed
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
                        Não selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5 font-mono">
                    {instagramUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {localErrors.instagram && (
                  <button
                    type="button"
                    onClick={() => handleRetry('instagram')}
                    disabled={Boolean(retryingPlatform)}
                    className="p-1.5 px-2 text-xs font-bold rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Tentar postar novamente no Instagram (forçar reenvio)"
                    aria-label="Tentar novamente no Instagram"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retryingPlatform === 'instagram' ? 'animate-spin text-rose-600' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy('instagram', instagramUrl)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'instagram' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Link</>
                  )}
                </button>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no Instagram
                </a>
              </div>
            </div>

            {/* 3. Facebook */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isFacebookRequested ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-75'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <FacebookIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Facebook (Página Oficial)</span>
                    {isFacebookRequested ? (
                      (isPublishing || retryingPlatform === 'facebook') ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> {retryingPlatform === 'facebook' ? 'Reenviando...' : 'Enviando...'}
                        </span>
                      ) : localErrors.facebook ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700" title={localErrors.facebook}>
                            Erro no Envio
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRetry('facebook')}
                            disabled={Boolean(retryingPlatform)}
                            className="p-1 rounded-md bg-rose-100/80 hover:bg-rose-200 text-rose-700 hover:text-rose-900 border border-rose-200/60 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                            title="Tentar postar novamente no Facebook (forçar reenvio)"
                            aria-label="Tentar novamente no Facebook"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingPlatform === 'facebook' ? 'animate-spin text-rose-600' : ''}`} />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                          Publicado
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
                        Não selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5 font-mono">
                    {facebookUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {localErrors.facebook && (
                  <button
                    type="button"
                    onClick={() => handleRetry('facebook')}
                    disabled={Boolean(retryingPlatform)}
                    className="p-1.5 px-2 text-xs font-bold rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Tentar postar novamente no Facebook (forçar reenvio)"
                    aria-label="Tentar novamente no Facebook"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retryingPlatform === 'facebook' ? 'animate-spin text-rose-600' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy('facebook', facebookUrl)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'facebook' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Link</>
                  )}
                </button>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no Facebook
                </a>
              </div>
            </div>

            {/* 4. Threads */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isThreadsRequested ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-75'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 border border-zinc-800">
                  <ThreadsIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Threads (@portalngbrasil)</span>
                    {isThreadsRequested ? (
                      (isPublishing || retryingPlatform === 'threads') ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> {retryingPlatform === 'threads' ? 'Reenviando...' : 'Enviando...'}
                        </span>
                      ) : localErrors.threads ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700" title={localErrors.threads}>
                            Erro no Envio
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRetry('threads')}
                            disabled={Boolean(retryingPlatform)}
                            className="p-1 rounded-md bg-rose-100/80 hover:bg-rose-200 text-rose-700 hover:text-rose-900 border border-rose-200/60 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                            title="Tentar postar novamente no Threads (forçar reenvio)"
                            aria-label="Tentar novamente no Threads"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingPlatform === 'threads' ? 'animate-spin text-rose-600' : ''}`} />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                          Publicado
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
                        Não selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5 font-mono">
                    {threadsUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {localErrors.threads && (
                  <button
                    type="button"
                    onClick={() => handleRetry('threads')}
                    disabled={Boolean(retryingPlatform)}
                    className="p-1.5 px-2 text-xs font-bold rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Tentar postar novamente no Threads (forçar reenvio)"
                    aria-label="Tentar novamente no Threads"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retryingPlatform === 'threads' ? 'animate-spin text-rose-600' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy('threads', threadsUrl)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'threads' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Link</>
                  )}
                </button>
                <a
                  href={threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-black text-white hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no Threads
                </a>
              </div>
            </div>

            {/* 5. LinkedIn */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isLinkedinRequested ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-75'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#0077b5] text-white flex items-center justify-center shrink-0 border border-[#006097]">
                  <LinkedInIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">LinkedIn (Página Oficial)</span>
                    {isLinkedinRequested ? (
                      (isPublishing || retryingPlatform === 'linkedin') ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> {retryingPlatform === 'linkedin' ? 'Reenviando...' : 'Enviando...'}
                        </span>
                      ) : localErrors.linkedin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700" title={localErrors.linkedin}>
                            {localErrors.linkedin.includes('Token') ? 'Token Ausente' : 'Erro no Envio'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRetry('linkedin')}
                            disabled={Boolean(retryingPlatform)}
                            className="p-1 rounded-md bg-rose-100/80 hover:bg-rose-200 text-rose-700 hover:text-rose-900 border border-rose-200/60 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                            title="Tentar postar novamente no LinkedIn (forçar reenvio)"
                            aria-label="Tentar novamente no LinkedIn"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingPlatform === 'linkedin' ? 'animate-spin text-rose-600' : ''}`} />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                          Publicado
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
                        Não selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5 font-mono">
                    {linkedinUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {localErrors.linkedin && (
                  <button
                    type="button"
                    onClick={() => handleRetry('linkedin')}
                    disabled={Boolean(retryingPlatform)}
                    className="p-1.5 px-2 text-xs font-bold rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Tentar postar novamente no LinkedIn (forçar reenvio)"
                    aria-label="Tentar novamente no LinkedIn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retryingPlatform === 'linkedin' ? 'animate-spin text-rose-600' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy('linkedin', linkedinUrl)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'linkedin' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Link</>
                  )}
                </button>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0077b5] text-white hover:bg-[#005f93] flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no LinkedIn
                </a>
              </div>
            </div>

            {/* 6. X (antigo Twitter) */}
            <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isXRequested ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-75'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0 border border-zinc-800">
                  <XIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">X / Twitter (@portalngbrasil)</span>
                    {isXRequested ? (
                      (isPublishing || retryingPlatform === 'x') ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> {retryingPlatform === 'x' ? 'Reenviando...' : 'Enviando...'}
                        </span>
                      ) : localErrors.x ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700" title={localErrors.x}>
                            {localErrors.x.includes('não configuradas') ? 'Chaves Ausentes' : 'Erro no Envio'}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                          Publicado
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
                        Não selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5 font-mono">
                    {xUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleCopy('x', xUrl)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'x' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Link</>
                  )}
                </button>
                <a
                  href={xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-black text-white hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no X
                </a>
              </div>
            </div>

            {/* 7. WhatsApp Quick Share */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">Grupos e WhatsApp</h5>
                  <p className="text-xs text-slate-600 mt-0.5">Dispare a manchete e o link formatado com 1 clique</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm self-end sm:self-center"
              >
                <MessageCircle className="w-4 h-4" /> Disparar no WhatsApp
              </button>
            </div>

          </div>

          {/* Erros pontuais, se houver */}
          {(localErrors.general || localErrors.instagram || localErrors.facebook || localErrors.threads || localErrors.linkedin) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Aviso sobre redes sociais:</p>
                <p className="mt-0.5">{localErrors.general || localErrors.instagram || localErrors.facebook || localErrors.threads || localErrors.linkedin}</p>
                <p className="mt-1 text-slate-500">
                  Você pode forçar a postagem individual clicando no ícone de recarregar (🔄) ao lado da rede com erro.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Clique no <strong>X</strong> ou no botão abaixo para abrir o Gestor de Matérias.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4" /> Ir para o Gestor de Matérias <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
