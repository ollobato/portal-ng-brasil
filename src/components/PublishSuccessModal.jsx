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
  Layers
} from 'lucide-react';

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

export default function PublishSuccessModal({
  isOpen,
  onClose,
  data
}) {
  const [copiedKey, setCopiedKey] = useState(null);

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
    targetPlatforms = ['facebook', 'instagram'],
    links = {},
    errors = {}
  } = data;

  const handleCopy = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `🚨 *${article.title || 'Notícia em Destaque'}*\n\n${article.subtitle ? article.subtitle + '\n\n' : ''}Confira a matéria completa no Portal NG Brasil:\n${links.site || links.share || 'https://portalngbrasil.com.br'}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isPortalRequested = true; // Sempre publica no portal
  const isInstagramRequested = target === 'all' || target === 'instagram' || targetPlatforms.includes('instagram');
  const isFacebookRequested = target === 'all' || target === 'facebook' || targetPlatforms.includes('facebook');

  const siteUrl = links.site || `https://portalngbrasil.com.br/#/noticia/${article.id}`;
  const instagramUrl = links.instagram || 'https://www.instagram.com/portalngbrasil/';
  const facebookUrl = links.facebook || 'https://www.facebook.com/portalngbrasil';

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
                      isPublishing ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processando...
                        </span>
                      ) : errors.instagram ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                          Erro no Envio
                        </span>
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
                      isPublishing ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Enviando...
                        </span>
                      ) : errors.facebook ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                          Erro no Envio
                        </span>
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

            {/* 4. WhatsApp Quick Share */}
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
          {(errors.general || errors.instagram || errors.facebook) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Aviso sobre redes sociais:</p>
                <p className="mt-0.5">{errors.general || errors.instagram || errors.facebook}</p>
                <p className="mt-1 text-slate-500">A matéria foi salva com segurança no portal.</p>
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
