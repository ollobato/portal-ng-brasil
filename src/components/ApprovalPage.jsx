import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Send, 
  Eye, 
  FileText, 
  Globe, 
  Sparkles, 
  ShieldAlert, 
  ArrowLeft, 
  MessageSquare, 
  Video, 
  Layers, 
  Loader2,
  RefreshCw,
  ThumbsUp,
  X,
  Compass,
  Calendar,
  User,
  Quote
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { formatInstagramCaption, copyToClipboard } from '../utils/socialExporter';
import { publishArticleToAllChannels } from '../utils/metaPublisher';
import { safeLoadImageForCanvas } from '../utils/imageLoader';

// Ícones SVG para Redes Sociais
const Instagram = ({ className = "w-5 h-5" }) => (
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

const Facebook = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function ApprovalPage({ onNavigateHome }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('portal'); // 'portal' | 'instagram' | 'facebook' | 'sources' | 'review'
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedVideo, setCopiedVideo] = useState(false);
  const [copiedFbText, setCopiedFbText] = useState(false);
  
  // Modais de Ação
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalMode, setApprovalMode] = useState('auto_publish'); // 'auto_publish' | 'only_approve'
  const [autoPublishSuccessModal, setAutoPublishSuccessModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [reviewerName, setReviewerName] = useState(localStorage.getItem('portal_ng_reviewer_name') || 'Editora-Chefe');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postProgressText, setPostProgressText] = useState('');
  const [publishedSocialLinks, setPublishedSocialLinks] = useState(null);
  const [publishedSocialErrors, setPublishedSocialErrors] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Canvas do Card do Instagram
  const canvasRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState('4:5'); // '1:1' | '4:5' | '9:16'
  const [canvasDrawn, setCanvasDrawn] = useState(false);

  // Extrai o ID da matéria da URL
  const getArticleIdFromUrl = () => {
    // 1. Redirecionamento SPA do GitHub Pages (ex: ?/aprovacao/123456)
    if (window.location.search && window.location.search.startsWith('?/')) {
      const cleanPath = window.location.search.substring(2).split('?')[0].split('&')[0];
      const parts = cleanPath.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && !['aprovacao', 'revisao', 'aprovar'].includes(last)) {
        return last;
      }
    }

    // 2. Query param: ?id=... ou ?aprovacao=... ou ?materia=...
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id') || params.get('aprovacao') || params.get('revisao') || params.get('materia');
    if (queryId) return queryId;

    // 3. Pathname: /aprovacao/:id ou /revisao/:id
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== 'aprovacao' && lastPart !== 'revisao' && lastPart !== 'aprovar') {
      return lastPart;
    }

    // 4. Hash: #/aprovacao/:id
    if (window.location.hash) {
      const hashParts = window.location.hash.replace('#/', '').split('/').filter(Boolean);
      const hashLast = hashParts[hashParts.length - 1];
      if (hashLast && hashLast !== 'aprovacao' && hashLast !== 'revisao') {
        return hashLast;
      }
    }

    return null;
  };

  const articleId = getArticleIdFromUrl();

  // Tenta autenticar anonimamente em segundo plano para permitir gravação nas regras do Firestore
  useEffect(() => {
    try {
      if (auth && !auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.warn("Autenticação anônima opcional:", err?.message);
        });
      }
    } catch (e) {
      console.warn("Auth initialization warning:", e);
    }
  }, []);

  // Carrega a matéria em tempo real do Firestore (busca em 'drafts', com fallback para 'news')
  useEffect(() => {
    if (!articleId) {
      setLoading(false);
      setError("Link de aprovação inválido ou nenhum identificador de matéria foi informado.");
      return;
    }

    setLoading(true);
    let unsubDraft = null;

    // 1. Tenta escutar em tempo real a coleção 'drafts'
    const draftRef = doc(db, 'drafts', String(articleId));
    unsubDraft = onSnapshot(draftRef, async (snap) => {
      if (snap.exists()) {
        setArticle({ id: snap.id, ...snap.data(), _sourceCol: 'drafts' });
        setLoading(false);
        setError(null);
      } else {
        // Fallback: se não estiver em drafts, busca em 'news'
        try {
          const newsRef = doc(db, 'news', String(articleId));
          const newsSnap = await getDoc(newsRef);
          if (newsSnap.exists()) {
            setArticle({ id: newsSnap.id, ...newsSnap.data(), _sourceCol: 'news' });
            setLoading(false);
            setError(null);
          } else {
            setLoading(false);
            setError("Matéria não encontrada no sistema. Ela pode ter sido excluída ou já arquivada.");
          }
        } catch (err) {
          console.error("Erro ao buscar matéria:", err);
          setLoading(false);
          setError("Erro ao carregar os dados da matéria.");
        }
      }
    }, (err) => {
      console.warn("Erro no listener de drafts:", err);
      // Tenta getDoc direto de fallback
      getDoc(doc(db, 'news', String(articleId))).then((nSnap) => {
        if (nSnap.exists()) {
          setArticle({ id: nSnap.id, ...nSnap.data(), _sourceCol: 'news' });
          setLoading(false);
          setError(null);
        } else {
          setLoading(false);
          setError("Matéria não encontrada.");
        }
      }).catch(() => {
        setLoading(false);
        setError("Erro de permissão ou conexão ao carregar a matéria.");
      });
    });

    return () => {
      if (unsubDraft) unsubDraft();
    };
  }, [articleId]);

  // Atualiza o título da aba do navegador para o título da matéria
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | Aprovação Portal NG`;
    }
  }, [article?.title]);

  // Render do Canvas do Instagram com design oficial Portal NG
  useEffect(() => {
    if (!article || activeTab !== 'instagram') return;
    
    const timer = setTimeout(() => {
      drawInstagramCard();
    }, 150);

    return () => clearTimeout(timer);
  }, [article, activeTab, aspectRatio]);

  const drawInstagramCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !article) return;
    const ctx = canvas.getContext('2d');

    const width = 1080;
    const height = aspectRatio === '1:1' ? 1080 : aspectRatio === '9:16' ? 1920 : 1440;
    canvas.width = width;
    canvas.height = height;

    // Fundo base
    ctx.fillStyle = '#040f1d';
    ctx.fillRect(0, 0, width, height);

    const titleText = (article.cardInstagram?.titulo || article.title || '').trim();
    const subtitleText = (article.cardInstagram?.apoio || article.subtitle || '').trim();
    const coverUrl = (article.image || '').trim();

    const targetHeight = height * 0.58;

    if (coverUrl) {
      const img = await safeLoadImageForCanvas(coverUrl);
      if (img && canvasRef.current === canvas) {
        const scale = Math.max(width / img.width, targetHeight / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (targetHeight / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Gradiente suave sobre a foto
        const grad = ctx.createLinearGradient(0, targetHeight - 160, 0, targetHeight);
        grad.addColorStop(0, 'rgba(0, 23, 46, 0)');
        grad.addColorStop(1, '#00172e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, targetHeight - 160, width, 160);
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, targetHeight);
      }
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, targetHeight);
    }

    // Carrega o logo do Portal NG
    const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
    finalizeDrawCanvas(ctx, width, height, logo, titleText, subtitleText);
  };

  const finalizeDrawCanvas = (ctx, width, height, logo, titleText, subtitleText) => {
    const cardHeight = height * 0.45;
    const cardY = height - cardHeight;
    
    // Fundo azul escuro oficial com canto arredondado
    ctx.fillStyle = '#00172e';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, cardY + 50);
    ctx.quadraticCurveTo(0, cardY, 50, cardY);
    ctx.lineTo(width, cardY);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Aba vermelha estilizada no canto direito
    ctx.fillStyle = '#d40a38';
    ctx.beginPath();
    ctx.moveTo(width - 400, cardY);
    ctx.lineTo(width - 370, cardY - 25);
    ctx.lineTo(width, cardY - 25);
    ctx.lineTo(width, cardY);
    ctx.closePath();
    ctx.fill();
    
    // Logo no canto superior direito
    if (logo) {
      ctx.drawImage(logo, width - 260, 45, 210, 210 * (logo.height / logo.width));
    }

    // Calcula linhas do Título
    ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
    const titleWords = titleText.toUpperCase().split(' ');
    let titleLines = [];
    let currentLine = '';
    const maxWidth = width - 120;

    for (let n = 0; n < titleWords.length; n++) {
      const testLine = currentLine + titleWords[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        titleLines.push(currentLine.trim());
        currentLine = titleWords[n] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    titleLines.push(currentLine.trim());

    // Calcula linhas do Subtítulo
    ctx.font = '400 36px "Barlow Condensed", sans-serif';
    const subWords = subtitleText.split(' ');
    let subLines = [];
    currentLine = '';
    for (let n = 0; n < subWords.length; n++) {
      const testLine = currentLine + subWords[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        subLines.push(currentLine.trim());
        currentLine = subWords[n] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    subLines.push(currentLine.trim());

    // Centralização vertical no card
    const titleLineHeight = 75;
    const subLineHeight = 46;
    const titleSpacing = 15;
    const totalTextHeight = (titleLines.length * titleLineHeight) + titleSpacing + (subLines.length * subLineHeight);
    
    const bottomLimit = height - 120;
    const topLimit = cardY + 30;
    const availableHeight = bottomLimit - topLimit;
    const startY = topLimit + (availableHeight - totalTextHeight) / 2;

    // Desenha o Título com palavras de destaque em vermelho
    ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    
    let globalWordIndex = 0;
    let textY = startY;

    titleLines.forEach(l => {
      const lWords = l.split(' ');
      const fullLineWidth = ctx.measureText(l).width;
      let currentX = (width / 2) - (fullLineWidth / 2);
      
      lWords.forEach((w, idx) => {
        const isRed = globalWordIndex >= titleWords.length * 0.45 && globalWordIndex <= titleWords.length * 0.85;
        ctx.fillStyle = isRed ? '#d40a38' : '#ffffff';
        ctx.fillText(w, currentX, textY);
        currentX += ctx.measureText(w).width;
        if (idx < lWords.length - 1) {
          currentX += ctx.measureText(' ').width;
        }
        globalWordIndex++;
      });
      textY += titleLineHeight;
    });

    // Desenha o Subtítulo
    ctx.font = '400 36px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    
    let subY = textY + titleSpacing;
    subLines.forEach(l => {
      ctx.fillText(l, width / 2, subY);
      subY += subLineHeight;
    });

    // Rodapé com linha divisória
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, height - 90);
    ctx.lineTo(width - 60, height - 90);
    ctx.stroke();

    // Texto do Rodapé
    ctx.textAlign = 'left';
    ctx.font = '600 24px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('portalngbrasil.com.br', 60, height - 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Barlow Condensed", sans-serif';
    const sigaText = 'Siga @portalngbrasil';
    const sigaWidth = ctx.measureText(sigaText).width;
    ctx.fillText(sigaText, width - 60 - sigaWidth, height - 55);

    setCanvasDrawn(true);
  };

  const handleDownloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `portal-ng-arte-${article?.id || 'materia'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Ações de Aprovação e Publicação Automática em Todos os Canais
  const handleConfirmApproval = async (autoPublish = true) => {
    if (!article) return;
    setIsSubmitting(true);
    try {
      const name = reviewerName.trim() || 'Editora-Chefe';
      localStorage.setItem('portal_ng_reviewer_name', name);
      const notes = approvalNotes.trim() || (autoPublish ? 'Aprovado e publicado imediatamente em todos os canais pela editora-chefe.' : 'Aprovado sem ressalvas.');

      if (autoPublish) {
        setPostProgressText('🚀 Publicando no Portal NG Brasil, Instagram e Facebook...');
        const publishResult = await publishArticleToAllChannels({
          article,
          canvas: canvasRef.current,
          reviewerName: name,
          approvalNotes: notes,
          onProgress: ({ message }) => setPostProgressText(message)
        });

        setPublishedSocialLinks(publishResult.links);
        setPublishedSocialErrors(publishResult.errors);
        setAutoPublishSuccessModal(true);
        setActionSuccessMessage(`🎉 Matéria aprovada e publicada em todos os canais com sucesso por ${name}!`);
        setArticle(prev => ({ 
          ...prev, 
          approvalStatus: 'approved', 
          approvedBy: name, 
          published: true,
          socialLinks: publishResult.links 
        }));
      } else {
        const now = new Date();
        const updatePayload = {
          approvalStatus: 'approved',
          approvedAt: now.toISOString(),
          approvedBy: name,
          approvalNotes: notes,
          autoPublished: false,
          published: false
        };
        const targetCol = article._sourceCol || 'drafts';
        const docRef = doc(db, targetCol, String(article.id));
        await updateDoc(docRef, updatePayload);
        setActionSuccessMessage(`Matéria aprovada com sucesso por ${name}!`);
        setArticle(prev => ({ ...prev, ...updatePayload }));
      }

      setShowApproveModal(false);
      setTimeout(() => setActionSuccessMessage(''), 6000);
    } catch (err) {
      console.error("Erro ao aprovar matéria:", err);
      alert("Erro ao registrar aprovação: " + err.message);
    } finally {
      setIsSubmitting(false);
      setPostProgressText('');
    }
  };

  const handleConfirmRevision = async () => {
    if (!article) return;
    if (!revisionNotes.trim()) {
      alert("Por favor, descreva quais alterações são necessárias.");
      return;
    }

    setIsSubmitting(true);
    try {
      const name = reviewerName.trim() || 'Editor Revisor';
      localStorage.setItem('portal_ng_reviewer_name', name);

      const updatePayload = {
        approvalStatus: 'needs_revision',
        revisionRequestedAt: new Date().toISOString(),
        revisionRequestedBy: name,
        revisionNotes: revisionNotes.trim()
      };

      const targetCol = article._sourceCol || 'drafts';
      const docRef = doc(db, targetCol, String(article.id));
      await updateDoc(docRef, updatePayload);

      setArticle(prev => ({ ...prev, ...updatePayload }));
      setShowRevisionModal(false);
      setActionSuccessMessage(`Solicitação de ajuste enviada para a redação!`);
      setTimeout(() => setActionSuccessMessage(''), 5000);
    } catch (err) {
      console.error("Erro ao solicitar revisão:", err);
      alert("Erro ao enviar solicitação: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const msg = `🚨 *Prévia para Aprovação de Matéria — Portal NG Brasil*\n\n📰 *${article?.title || 'Notícia'}*\n\nVisualize a matéria completa, card do Instagram e aprove pelo link:\n👉 ${window.location.href}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Legenda do Instagram (usa a gerada pela IA ou monta a padrão do portal)
  const instagramCaption = article?.legendaInstagram || article?.metadata?.legenda_instagram || formatInstagramCaption({
    title: article?.title,
    subtitle: article?.subtitle,
    category: article?.categoryLabel || article?.category,
    praca: article?.praca,
    id: article?.id,
    content: article?.content
  });

  const videoScript = article?.roteiroVideo || article?.metadata?.roteiro_video || '';
  const cardImpacto = article?.cardInstagram || article?.metadata?.card_instagram || null;
  const jogada = article?.jogada || article?.metadata?.jogada || '';
  const alertas = article?.alertas || article?.metadata?.alertas || [];
  const titulosOpcoes = article?.titulos || article?.metadata?.titulos_sugeridos || [article?.title];
  const citacoes = article?.citacoesLiterais || article?.metadata?.citacoes_literais || [];

  // Texto formatado para o Post no Facebook
  const facebookPostText = `${article?.title || ''}\n\n${article?.subtitle ? article.subtitle + '\n\n' : ''}Confira todos os desdobramentos completos no Portal NG Brasil:\n👉 https://portalngbrasil.com.br/#/noticia/${article?.id}\n\n#PortalNGBrasil #Noticias #${(article?.categoryLabel || article?.category || 'Brasil').replace(/\s+/g, '')}`;

  const handleCopyFacebookText = async () => {
    const success = await copyToClipboard(facebookPostText);
    if (success) {
      setCopiedFbText(true);
      setTimeout(() => setCopiedFbText(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 mb-4 animate-pulse">
          <img src="/logo-ng.png" alt="Portal NG" className="w-10 h-10 object-contain" onError={(e) => e.target.style.display = 'none'} />
        </div>
        <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
        <h2 className="text-white font-bold text-lg">Carregando Matéria para Aprovação...</h2>
        <p className="text-slate-400 text-sm mt-1">Conectando ao banco de dados editorial do Portal NG Brasil</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-800/60 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Matéria Não Encontrada</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">{error || "O link fornecido não corresponde a nenhum rascunho ativo."}</p>
        <button
          onClick={() => onNavigateHome ? onNavigateHome() : window.location.href = '/'}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all shadow-md flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Ir para a Página Inicial
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* BARRA SUPERIOR FIXA / HEADER DE APROVAÇÃO */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo e Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white font-black text-sm tracking-tighter">NG</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Portal NG Brasil</span>
                <span className="text-xs text-slate-400 hidden sm:inline">• Central de Aprovação</span>
              </div>
              
              {/* Badge de Status */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {article.approvalStatus === 'approved' ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Aprovada por {article.approvedBy || 'Revisor'}
                  </span>
                ) : article.approvalStatus === 'needs_revision' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Ajustes Solicitados ({article.revisionRequestedBy || 'Revisor'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    <Clock className="w-3 h-3" /> Pendente de Aprovação
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação Principais */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copiar Link de Aprovação"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              title="Compartilhar no WhatsApp"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={() => setShowRevisionModal(true)}
              className="px-3.5 py-1.5 bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Ajustes</span>
            </button>

            <button
              onClick={() => {
                setApprovalMode('only_approve');
                setShowApproveModal(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Apenas Aprovar</span>
            </button>

            <button
              onClick={() => {
                setApprovalMode('auto_publish');
                setShowApproveModal(true);
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovar e Postar Agora</span>
            </button>
          </div>
        </div>

        {/* Notificação Temporária de Ação Concluída */}
        {actionSuccessMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center animate-in fade-in">
            {actionSuccessMessage}
          </div>
        )}

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-7xl mx-auto px-4 border-t border-slate-800/80 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('portal')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'portal'
                ? 'border-red-500 text-white bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-red-500" />
            1. Matéria no Portal
          </button>

          <button
            onClick={() => setActiveTab('instagram')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'instagram'
                ? 'border-red-500 text-white bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Instagram className="w-3.5 h-3.5 text-pink-500" />
            2. Materiais do Instagram & Redes
          </button>

          <button
            onClick={() => setActiveTab('facebook')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'facebook'
                ? 'border-[#1877F2] text-white bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
            3. Preview do Facebook
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'sources'
                ? 'border-red-500 text-white bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            4. Fontes & Auditoria (Prompt v3)
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'review'
                ? 'border-red-500 text-white bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            5. Histórico de Pareceres
            {article.revisionNotes && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
        
        {/* ALERTA SE HOUVER AJUSTES SOLICITADOS */}
        {article.approvalStatus === 'needs_revision' && article.revisionNotes && (
          <div className="mb-6 p-4 bg-amber-950/60 border border-amber-600/50 rounded-xl flex items-start gap-3 text-amber-200 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-amber-300 text-sm mb-1">
                Ajustes Solicitados pelo Revisor ({article.revisionRequestedBy || 'Editor'}):
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{article.revisionNotes}</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 1: MATÉRIA NO PORTAL (SIMULAÇÃO FIEL DO LEITOR)          */}
        {/* ============================================================ */}
        {activeTab === 'portal' && (
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Header da Simulação */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-red-600" /> Visualização Exata do Portal NG Brasil
              </span>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                {article.praca || 'Nacional'}
              </span>
            </div>

            <article className="p-6 md:p-10 max-w-3xl mx-auto">
              
              {/* Badges de Categoria e Praça */}
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#d40a38] text-white text-[11px] uppercase font-black px-2.5 py-1 rounded">
                  {article.categoryLabel || article.category || 'NOTÍCIAS'}
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                  {article.praca || 'Nacional'}
                </span>
                <span className="text-xs text-slate-400">
                  {article.readTime || '3 min de leitura'}
                </span>
              </div>

              {/* Manchete Principal */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 leading-tight mb-4 tracking-tight">
                {article.title}
              </h1>

              {/* Subtítulo / Linha Fina */}
              {article.subtitle && (
                <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed mb-6 border-l-4 border-red-600 pl-3">
                  {article.subtitle}
                </p>
              )}

              {/* Metadados do Autor e Data */}
              <div className="flex items-center justify-between py-4 border-y border-slate-200 mb-6 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                    <img 
                      src={article.author?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"} 
                      alt={article.author?.name || "Redação"} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{article.author?.name || 'Redação NG Brasil'}</span>
                    <span className="text-[11px] text-slate-500">{article.author?.role || 'Jornalismo Investigativo'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block font-medium text-slate-700">{article.date || new Date().toLocaleDateString('pt-BR')}</span>
                  <span className="text-[10px] text-slate-400">Portal NG Brasil Oficial</span>
                </div>
              </div>

              {/* Imagem de Capa */}
              {article.image && (
                <div className="mb-8 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full max-h-[480px] object-cover" 
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <div className="bg-slate-50 px-4 py-2 text-[11px] text-slate-500 italic border-t border-slate-100 flex items-center justify-between">
                    <span>Foto: Reprodução / {article.source || article.sourceName || 'Divulgação'}</span>
                    <span>Portal NG Brasil</span>
                  </div>
                </div>
              )}

              {/* Corpo da Matéria (HTML) */}
              <div 
                className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: article.content || '<p>Conteúdo não informado.</p>' }}
              />

              {/* Frase Institucional de Encerramento */}
              <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 italic">
                Portal NG Brasil — As notícias que impactam o país e o mundo com independência e coragem.
              </div>
            </article>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: MATERIAIS PARA INSTAGRAM & REDES SOCIAIS              */}
        {/* ============================================================ */}
        {activeTab === 'instagram' && (
          <div className="space-y-8">
            
            {/* 1. Card do Instagram */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    Arte Oficial para o Instagram (Modelo Barlow Condensed)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Renderizado automaticamente com a foto tratada, manchete bicolor e rodapé oficial do Portal NG.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Seletor de Aspect Ratio */}
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setAspectRatio('4:5')}
                      className={`px-2.5 py-1 text-xs font-bold rounded ${aspectRatio === '4:5' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Feed 4:5
                    </button>
                    <button
                      onClick={() => setAspectRatio('1:1')}
                      className={`px-2.5 py-1 text-xs font-bold rounded ${aspectRatio === '1:1' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Quadrado 1:1
                    </button>
                    <button
                      onClick={() => setAspectRatio('9:16')}
                      className={`px-2.5 py-1 text-xs font-bold rounded ${aspectRatio === '9:16' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Stories 9:16
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadCard}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar Imagem
                  </button>
                </div>
              </div>

              {/* Preview Central do Canvas */}
              <div className="flex justify-center p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="w-full max-w-[420px] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
                  <canvas ref={canvasRef} className="w-full h-auto object-contain block" />
                </div>
              </div>
            </div>

            {/* 2. Legenda do Instagram */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Legenda Oficial do Instagram
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Com gancho nos 3 primeiros segundos, citações atribuídas e call-to-action para a bio.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    const success = await copyToClipboard(instagramCaption);
                    if (success) {
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2500);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Copiada!' : 'Copiar Legenda'}</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                {instagramCaption}
              </div>
            </div>

            {/* 3. Card de Impacto & Roteiro de Vídeo (Prompt v3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card de Impacto (Stories/Feed) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-500" />
                  Frase de Impacto (Card Stories)
                </h3>
                <p className="text-xs text-slate-400 mb-4">Formato mais direto para o leitor que rola rápido.</p>
                
                <div className="p-4 bg-gradient-to-br from-red-950/40 to-slate-900 border border-red-900/40 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">Frase Bomba (até ~12 palavras):</span>
                  <p className="text-base font-black text-white leading-snug mb-3">
                    "{cardImpacto?.titulo || article.title}"
                  </p>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Linha de Apoio:</span>
                  <p className="text-xs text-slate-300">
                    {cardImpacto?.apoio || article.subtitle || 'Confira os desdobramentos completos no portal.'}
                  </p>
                </div>
              </div>

              {/* Roteiro de Vídeo / Reels / Narração */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-500" />
                    Roteiro de Vídeo / Reels (45-60s)
                  </h3>
                  {videoScript && (
                    <button
                      onClick={async () => {
                        const success = await copyToClipboard(videoScript);
                        if (success) {
                          setCopiedVideo(true);
                          setTimeout(() => setCopiedVideo(false), 2500);
                        }
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedVideo ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedVideo ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-4">Gancho nos primeiros 3s, frases curtas e próximo passo.</p>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[190px] overflow-y-auto">
                  {videoScript || (
                    <span className="text-slate-500 italic">
                      "Olha o que acabou de acontecer... {article.title}. {article.subtitle}. Todas as atualizações completas no link da bio do Portal NG Brasil."
                    </span>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: PREVIEW DO FACEBOOK                                   */}
        {/* ============================================================ */}
        {activeTab === 'facebook' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header com Ações */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-[#1877F2]" /> Simulação de Post no Feed do Facebook
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Prévia fiel de como os seguidores e leitores verão a publicação na Página Oficial do Portal NG Brasil.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyFacebookText}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedFbText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedFbText ? 'Texto Copiado!' : 'Copiar Texto do Post'}
                </button>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://portalngbrasil.com.br/#/noticia/' + article.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Compartilhar no FB ↗
                </a>
              </div>
            </div>

            {/* Grid: Preview do Feed do Facebook e Informações */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Coluna Central: O Feed do Facebook */}
              <div className="lg:col-span-8 flex justify-center">
                <div className="w-full max-w-[580px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-slate-900 font-sans">
                  
                  {/* Cabeçalho do Post do Facebook */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        <img 
                          src="/logo-ng.png" 
                          alt="Portal NG Brasil" 
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = '<span class="text-white font-bold text-xs">NG</span>';
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-slate-900 hover:underline cursor-pointer">Portal NG Brasil</span>
                          {/* Selo azul de verificado */}
                          <svg className="w-4 h-4 text-[#1877F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.3-5.3 1.4 1.4-6.7 6.7z" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-1 text-[12px] text-slate-500">
                          <span>Publicado agora</span>
                          <span>•</span>
                          <span title="Público">🌐</span>
                        </div>
                      </div>
                    </div>

                    <button className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors">
                      <span className="font-bold text-base leading-none">•••</span>
                    </button>
                  </div>

                  {/* Texto do Post do Facebook */}
                  <div className="px-3.5 pb-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    <p className="font-semibold text-slate-900 mb-1">{article.title}</p>
                    {article.subtitle && <p className="text-slate-600 mb-2">{article.subtitle}</p>}
                    <p className="text-[#1877F2] hover:underline cursor-pointer">
                      portalngbrasil.com.br/#/noticia/{article.id}
                    </p>
                    <div className="mt-2 text-slate-500 text-xs">
                      #{article.category || 'noticias'} #PortalNGBrasil #Brasil #Politica
                    </div>
                  </div>

                  {/* Open Graph Link Card Oficial do Facebook */}
                  <div className="border-t border-b border-slate-200 bg-slate-100 cursor-pointer group">
                    <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-slate-900">
                      {article.image && !article.image.includes('unsplash') && !article.image.includes('pollinations.ai') ? (
                        <img 
                          src={article.image} 
                          alt="Capa" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white">
                          <img src="/logo-ng.png" alt="Portal NG Brasil" className="h-14 w-auto opacity-40 object-contain" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-[#f0f2f5] border-t border-slate-200">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
                        PORTALNGBRASIL.COM.BR
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                        {article.title}
                      </h4>
                      {article.subtitle && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                          {article.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reações e Estatísticas do Facebook */}
                  <div className="px-3.5 py-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[9px] shadow-xs">👍</span>
                        <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow-xs">❤️</span>
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] shadow-xs">😮</span>
                      </div>
                      <span className="hover:underline cursor-pointer">Você e outras 328 pessoas</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="hover:underline cursor-pointer">42 comentários</span>
                      <span>•</span>
                      <span className="hover:underline cursor-pointer">19 compartilhamentos</span>
                    </div>
                  </div>

                  {/* Botões de Ação do Facebook */}
                  <div className="p-1 px-2 grid grid-cols-3 gap-1 text-slate-600 font-semibold text-xs text-center">
                    <button className="py-2 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <ThumbsUp className="w-4 h-4 text-slate-500" />
                      <span>Curtir</span>
                    </button>
                    <button className="py-2 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      <span>Comentar</span>
                    </button>
                    <button className="py-2 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <Share2 className="w-4 h-4 text-slate-500" />
                      <span>Compartilhar</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Coluna Lateral: Ferramentas e Recursos do Facebook */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-[#1877F2]" /> Texto Formatado para Facebook
                  </h4>
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto mb-3 font-mono">
                    {facebookPostText}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyFacebookText}
                    className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    {copiedFbText ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copiedFbText ? 'Texto Copiado!' : 'Copiar Texto Pronto'}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs text-slate-400 space-y-2.5">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automação com Meta Graph API
                  </h4>
                  <p>
                    Quando esta matéria for postada no Facebook pelo painel, a API oficial gera automaticamente o card interativo com a foto em alta resolução e o link rastreado para o Portal NG.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: FONTES & AUDITORIA EDITORIAL (PROMPT v3)              */}
        {/* ============================================================ */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            
            {/* Box: A Jogada & Alertas do Redator */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              
              {/* A Jogada */}
              {jogada && (
                <div className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" /> A Jogada (Conflito / Virada do Fato)
                  </div>
                  <p className="text-sm text-amber-100 font-medium leading-relaxed">
                    {jogada}
                  </p>
                </div>
              )}

              {/* Alertas do Redator */}
              {alertas && alertas.length > 0 && (
                <div className="p-4 bg-red-950/30 border border-red-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-4 h-4" /> Pontos de Atenção (Conferir Antes de Publicar)
                  </div>
                  <ul className="text-xs text-red-200/90 space-y-1.5 list-disc list-inside leading-relaxed">
                    {alertas.map((alerta, i) => (
                      <li key={i}>{alerta}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opções de Título (PNL para o Clique) */}
              {titulosOpcoes && titulosOpcoes.length > 1 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Opções de Manchete (PNL para o Clique):
                  </h4>
                  <div className="space-y-2">
                    {titulosOpcoes.map((t, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Opção {idx + 1}: {t}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{t.length} caracteres</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citações Literais */}
              {citacoes && citacoes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-blue-400" /> Citações Literais Atribuídas:
                  </h4>
                  <div className="space-y-2">
                    {citacoes.map((cit, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs italic text-slate-300">
                        {cit}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Comparação Lado a Lado com a Fonte Original */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    Comparação Editorial com a Matéria Original
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Permite ao auditor verificar a exatidão dos fatos e conferir se nenhuma afirmação foi inventada.
                  </p>
                </div>

                {(article.originalUrl || article.metadata?.link_fonte || article.metadata?.url) && (
                  <a
                    href={article.originalUrl || article.metadata?.link_fonte || article.metadata?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Abrir Fonte Original</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Coluna da Fonte Original */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Texto na Fonte Original:</span>
                    <span className="text-xs font-bold text-blue-400">
                      {article.source || article.sourceName || article.metadata?.fonte || 'Veículo Original'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Título Capturado:</span>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">
                      {article.originalTitle || article.metadata?.titulo_original || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Resumo / Fatos Originais:</span>
                    <div className="text-xs text-slate-400 mt-1 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans">
                      {article.originalContent || article.metadata?.conteudo_original || 'Nenhum texto bruto foi armazenado junto a este rascunho.'}
                    </div>
                  </div>
                </div>

                {/* Coluna da Versão Redigida pelo Portal NG */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold uppercase text-red-400">Versão Portal NG Brasil:</span>
                    <span className="text-xs font-bold text-emerald-400">Reescrita Autoral</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Nova Manchete de Alto Impacto:</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {article.title}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Subtítulo e Lide:</span>
                    <p className="text-xs text-slate-300 mt-1 italic">
                      {article.subtitle}
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: HISTÓRICO DE PARECERES & AVALIAÇÃO                    */}
        {/* ============================================================ */}
        {activeTab === 'review' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Histórico Editorial e Parecer do Revisor
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Registra a assinatura de quem aprovou, solicitações de ajuste e notas de redação.
              </p>
            </div>

            {/* Status Atual */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase text-slate-400 block">Status Geral:</span>
              
              {article.approvalStatus === 'approved' ? (
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 shrink-0" />
                  <div>
                    <p className="font-bold text-base text-white">Matéria Aprovada pelo Revisor</p>
                    <p className="text-xs text-emerald-300">
                      Assinado por <strong>{article.approvedBy || 'Editor'}</strong> em {article.approvedAt ? new Date(article.approvedAt).toLocaleString('pt-BR') : 'Data não registrada'}.
                    </p>
                    {article.approvalNotes && (
                      <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                        "{article.approvalNotes}"
                      </p>
                    )}
                  </div>
                </div>
              ) : article.approvalStatus === 'needs_revision' ? (
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertTriangle className="w-8 h-8 shrink-0" />
                  <div>
                    <p className="font-bold text-base text-white">Ajustes Solicitados</p>
                    <p className="text-xs text-amber-300">
                      Solicitado por <strong>{article.revisionRequestedBy || 'Revisor'}</strong> em {article.revisionRequestedAt ? new Date(article.revisionRequestedAt).toLocaleString('pt-BR') : 'Data não registrada'}.
                    </p>
                    <p className="text-xs text-slate-200 mt-2 bg-slate-950 p-2.5 rounded border border-slate-800 whitespace-pre-wrap">
                      "{article.revisionNotes}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-yellow-400">
                  <Clock className="w-8 h-8 shrink-0" />
                  <div>
                    <p className="font-bold text-base text-white">Aguardando Avaliação do Revisor</p>
                    <p className="text-xs text-slate-400">
                      Esta matéria ainda não recebeu aprovação ou solicitação de ajustes. Utilize os botões no topo para emitir o seu parecer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ações Rápidas de Avaliação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(true)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> Aprovar Matéria Imediatamente
              </button>

              <button
                onClick={() => setShowRevisionModal(true)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" /> Solicitar Ajustes na Redação
              </button>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Portal NG Brasil • Sistema de Gestão Editorial e Aprovação em Tempo Real</p>
      </footer>

      {/* ============================================================ */}
      {/* MODAL: CONFIRMAR APROVAÇÃO                                   */}
      {/* ============================================================ */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" /> Parecer de Aprovação Editorial
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de Modo de Aprovação */}
            <div className="mb-4 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Como deseja aprovar?</label>
              
              <div 
                onClick={() => setApprovalMode('auto_publish')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  approvalMode === 'auto_publish' 
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input 
                  type="radio" 
                  name="approvalMode" 
                  checked={approvalMode === 'auto_publish'} 
                  onChange={() => setApprovalMode('auto_publish')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm">⚡ Aprovar e Postar Automaticamente</span>
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm">Imediato</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    A matéria vai ao ar instantaneamente no Portal NG Brasil na categoria correspondente, com capas, autoria e formatação finalizadas.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setApprovalMode('only_approve')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  approvalMode === 'only_approve' 
                    ? 'bg-slate-800/60 border-slate-600 shadow-md ring-1 ring-slate-500' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input 
                  type="radio" 
                  name="approvalMode" 
                  checked={approvalMode === 'only_approve'} 
                  onChange={() => setApprovalMode('only_approve')}
                  className="mt-1 text-slate-400 focus:ring-slate-500" 
                />
                <div>
                  <span className="font-bold text-white text-xs sm:text-sm">✓ Apenas Aprovar (Sem Publicar Ainda)</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Registra o parecer de aprovação no painel da redação para que a equipe poste no momento mais oportuno.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 mb-5 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nome / Cargo:</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Ex: Editora-Chefe ou André (Diretor)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Observações Opcionais:</label>
                <input
                  type="text"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Ex: Liberado para destaque principal."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApproval(approvalMode === 'auto_publish')}
                disabled={isSubmitting}
                className={`px-5 py-2.5 font-bold rounded-lg text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-75 text-white ${
                  approvalMode === 'auto_publish' 
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{postProgressText || 'Publicando em todos os canais...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{approvalMode === 'auto_publish' ? '⚡ Aprovar e Postar Agora em Todos os Canais' : 'Confirmar Aprovação'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SUCESSO DE PUBLICAÇÃO MULTICANAL AUTOMÁTICA            */}
      {/* ============================================================ */}
      {autoPublishSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 text-left">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Matéria Aprovada e Postada com Sucesso!</h3>
                <p className="text-xs text-slate-400">
                  Assinado pela Editora-Chefe e disparado imediatamente para todos os canais oficiais.
                </p>
              </div>
            </div>

            {/* Links Ativos dos Canais */}
            <div className="space-y-2.5 mb-5">
              {/* Portal NG Brasil */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-300 block uppercase">Portal NG Brasil (Ao Vivo)</span>
                    <span className="text-xs text-emerald-400 font-medium truncate block">
                      {publishedSocialLinks?.site || `https://portalngbrasil.com.br/#/noticia/${article?.id}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(publishedSocialLinks?.site || `https://portalngbrasil.com.br/#/noticia/${article?.id}`)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Copiar Link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={publishedSocialLinks?.site || `https://portalngbrasil.com.br/#/noticia/${article?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    Abrir ↗
                  </a>
                </div>
              </div>

              {/* Instagram Feed */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/20">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-300 block uppercase">Instagram Feed (@portalngbrasil)</span>
                    <span className="text-xs text-pink-400 font-medium truncate block">
                      {publishedSocialLinks?.instagram || 'Publicado no Feed Oficial'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(publishedSocialLinks?.instagram || 'https://www.instagram.com/portalngbrasil/')}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Copiar Link do Instagram"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={publishedSocialLinks?.instagram || 'https://www.instagram.com/portalngbrasil/'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    Abrir ↗
                  </a>
                </div>
              </div>

              {/* Facebook Page */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <Facebook className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-300 block uppercase">Página do Facebook</span>
                    <span className="text-xs text-blue-400 font-medium truncate block">
                      {publishedSocialLinks?.facebook || 'Publicado na Página Oficial'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(publishedSocialLinks?.facebook || 'https://www.facebook.com/portalngbrasil')}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Copiar Link do Facebook"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={publishedSocialLinks?.facebook || 'https://www.facebook.com/portalngbrasil'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    Abrir ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Ações Finais */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `📢 *${article?.title}*\n\nConfira nos nossos canais oficiais:\n🌐 *Portal:* ${publishedSocialLinks?.site || `https://portalngbrasil.com.br/#/noticia/${article?.id}`}\n📸 *Instagram:* ${publishedSocialLinks?.instagram || 'https://www.instagram.com/portalngbrasil/'}\n📘 *Facebook:* ${publishedSocialLinks?.facebook || 'https://www.facebook.com/portalngbrasil'}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-slate-950" /> Compartilhar Pacote no WhatsApp
              </a>

              <button
                type="button"
                onClick={() => setAutoPublishSuccessModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar e Voltar para a Página de Revisão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SOLICITAR AJUSTES                                      */}
      {/* ============================================================ */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5" /> Solicitar Ajustes na Matéria
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Descreva com clareza quais alterações o redator deve realizar no texto, título ou arte do Instagram antes de publicar.
            </p>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nome / Cargo:</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Ex: André (Diretor) ou Revisor"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instruções de Ajuste (Obrigatório):</label>
                <textarea
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Ex: Trocar a foto por uma oficial da sessão do Senado e reforçar as aspas da defesa no segundo parágrafo."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevision}
                disabled={isSubmitting || !revisionNotes.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Ajustes para Redação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
