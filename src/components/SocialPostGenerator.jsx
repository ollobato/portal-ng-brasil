import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  Download,
  Copy,
  Share2,
  Image as ImageIcon,
  Sparkles,
  Check,
  RefreshCw,
  Upload,
  Send,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  Video,
  Camera,
  Link as LinkIcon,
  Briefcase,
  Heart,
  MessageCircle,
  MessageSquare,
  Bookmark,
  ThumbsUp,
  Repeat2,
  BarChart2,
  Globe,
  MoreHorizontal,
  Eye,
  Edit3
} from 'lucide-react';
import { formatInstagramCaption, formatFacebookCaption, formatThreadsCaption, formatLinkedInCaption, formatXCaption, calculateXTweetLength, shareToWhatsApp, copyToClipboard } from '../utils/socialExporter';
import { uploadImageForSocial, uploadVideoForSocial } from '../utils/imageUploader';
import { safeLoadImageForCanvas } from '../utils/imageLoader';
import { publishToFacebookPage, resolveFacebookPageToken, publishToThreads, FALLBACK_META_SETTINGS } from '../utils/metaPublisher';
import { publishArticleToLinkedIn, FALLBACK_LINKEDIN_SETTINGS } from '../utils/linkedinPublisher';
import { publishArticleToX, FALLBACK_X_SETTINGS } from '../utils/xPublisher';
import { calculateAutoFitTypography, getHighlightRange, ensureBarlowCondensedLoaded } from '../utils/ngCardRenderer.js';

export const XIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const ThreadsIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.186 24C5.466 24 0 18.534 0 11.814 0 5.094 5.466 0 12.186 0c6.643 0 11.96 5.253 12.174 11.895h-2.585c-.208-5.184-4.444-9.31-9.589-9.31-5.305 0-9.601 4.296-9.601 9.601 0 5.305 4.296 9.601 9.601 9.601 3.528 0 6.64-1.905 8.326-4.757l2.25 1.286C20.509 21.68 16.634 24 12.186 24zm4.498-8.156c-.66 2.052-2.38 3.522-4.498 3.522-2.673 0-4.84-2.167-4.84-4.84 0-2.673 2.167-4.84 4.84-4.84 2.673 0 4.84 2.167 4.84 4.84 0 .445-.06.877-.174 1.288h-4.666c.27 1.157 1.305 2.016 2.54 2.016 1.026 0 1.908-.594 2.334-1.46l2.164.974zm-2.028-2.616c-.23-1.077-1.185-1.874-2.31-1.874-1.125 0-2.08.797-2.31 1.874h4.62z"/>
  </svg>
);

const formatText = (text) => {
  if (!text) return '';
  const trimmed = text.trim();
  if (!['.', '!', '?'].includes(trimmed.slice(-1))) {
    return trimmed + '.';
  }
  return trimmed;
};

const getInitialImage = (art) => {
  const img = art?.image;
  if (!img || img.includes('pollinations.ai')) {
    return '';
  }
  return img;
};

const isVideoFileOrUrl = (fileOrUrl) => {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === 'object' && fileOrUrl.type) {
    if (fileOrUrl.type.startsWith('video/')) return true;
    const name = (fileOrUrl.name || '').toLowerCase();
    return /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(name);
  }
  if (typeof fileOrUrl === 'string') {
    if (fileOrUrl.startsWith('data:video/')) return true;
    const clean = fileOrUrl.split('?')[0].toLowerCase();
    return /\.(mp4|mov|webm|m4v)$/.test(clean);
  }
  return false;
};

export const DEFAULT_CTA_IMAGE_URL = '/siga-portalngbrasil.jpg';

const createDefaultFirstCard = (article) => ({
  id: 'card-1',
  mode: 'template', // 'template' | 'full_image'
  mediaType: 'image', // 'image' | 'video'
  imageUrl: getInitialImage(article),
  videoUrl: '',
  videoFile: null,
  customImage: false,
  customTitle: false,
  customSubtitle: false,
  title: formatText(article?.title) || 'Manchete da Notícia em Destaque.',
  subtitle: formatText(article?.subtitle) || 'Decisão impacta setor em expansão e levanta discussões sobre regulação.',
  useTwoPhotos: false,
  secondImageUrl: '',
  objectFit: 'cover',
  showLogoOnFullImage: false
});

export const createDefaultCtaCard = () => ({
  id: `card-cta-${Date.now()}`,
  mode: 'full_image',
  mediaType: 'image',
  imageUrl: DEFAULT_CTA_IMAGE_URL,
  videoUrl: '',
  videoFile: null,
  customImage: true,
  customTitle: false,
  customSubtitle: false,
  title: 'Siga @portalngbrasil',
  subtitle: 'Acompanhe as notícias que impactam o país e o mundo.',
  useTwoPhotos: false,
  secondImageUrl: '',
  objectFit: 'cover',
  showLogoOnFullImage: false,
  isCtaCard: true
});

export const createDefaultCards = (article) => [
  createDefaultFirstCard(article),
  createDefaultCtaCard()
];

const SocialPostGenerator = forwardRef(({ 
  showToast, 
  article, 
  onClose, 
  inline = false, 
  metaToken, 
  metaFbPageId, 
  metaIgAccountId, 
  threadsToken, 
  threadsUserId, 
  imgbbKey, 
  linkedinToken, 
  linkedinOrgId,
  xApiKey,
  xApiSecret,
  xAccessToken,
  xAccessSecret,
  xBearerToken,
  xUsername,
  hideButtons = false, 
  onPostSuccess, 
  onCardsChange 
}, ref) => {
  const canvasRef = useRef(null);
  const directUploadInputRef = useRef(null);
  const multiUploadInputRef = useRef(null);
  const lastArticleIdRef = useRef(article?.id);

  const [aspectRatio, setAspectRatio] = useState('4:5');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [cards, setCards] = useState(() => createDefaultCards(article));
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const [category, setCategory] = useState(article?.categoryLabel || article?.category || 'POLÍTICA');
  const [captionText, setCaptionText] = useState('');
  const [isCaptionCustomized, setIsCaptionCustomized] = useState(false);
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [isFbCaptionCustomized, setIsFbCaptionCustomized] = useState(false);
  const [captionThreads, setCaptionThreads] = useState('');
  const [isThreadsCaptionCustomized, setIsThreadsCaptionCustomized] = useState(false);
  const [captionLinkedin, setCaptionLinkedin] = useState('');
  const [isLinkedinCaptionCustomized, setIsLinkedinCaptionCustomized] = useState(false);
  const [captionX, setCaptionX] = useState('');
  const [isXCaptionCustomized, setIsXCaptionCustomized] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState('');
  const [editingPlatforms, setEditingPlatforms] = useState({});
  const [cardPreviewUrl, setCardPreviewUrl] = useState('');

  const safeActiveIndex = Math.min(activeCardIndex, Math.max(0, cards.length - 1));
  const activeCard = cards[safeActiveIndex] || cards[0];

  // Sincroniza o Card 1 com os dados da matéria quando ela é alterada no formulário
  useEffect(() => {
    if (!article) return;

    const isDifferentArticle = article.id && article.id !== lastArticleIdRef.current;
    lastArticleIdRef.current = article.id;

    setCategory(article.categoryLabel || article.category || 'NOTÍCIAS');

    if (isDifferentArticle) {
      if (Array.isArray(article.socialCards) && article.socialCards.length > 0) {
        setCards(article.socialCards);
      } else {
        setCards(createDefaultCards(article));
      }
      setActiveCardIndex(0);
      setIsCaptionCustomized(false);
      setIsFbCaptionCustomized(false);
      setIsThreadsCaptionCustomized(false);
      setIsLinkedinCaptionCustomized(false);
      setIsXCaptionCustomized(false);
    } else {
      setCards(prev => {
        if (!prev.length) return createDefaultCards(article);
        const first = prev[0];
        const nextTitle = first.customTitle ? first.title : (formatText(article.title) || first.title);
        const nextSub = first.customSubtitle ? first.subtitle : (formatText(article.subtitle) || first.subtitle);
        const nextImg = first.customImage ? first.imageUrl : getInitialImage(article);

        // Se nenhum dado do Card 1 mudou, não recria o array para evitar loops
        if (first.title === nextTitle && first.subtitle === nextSub && first.imageUrl === nextImg) {
          return prev;
        }

        const updatedFirst = {
          ...first,
          title: nextTitle,
          subtitle: nextSub,
          imageUrl: nextImg
        };
        return [updatedFirst, ...prev.slice(1)];
      });
    }
  }, [article?.id, article?.title, article?.subtitle, article?.image, article?.category, article?.categoryLabel, article?.socialCards]);

  // Notifica o componente pai sobre alterações nos cards do carrossel com blindagem contra re-renders
  const lastCardsJsonRef = useRef('');
  useEffect(() => {
    if (typeof onCardsChange === 'function' && Array.isArray(cards)) {
      const json = JSON.stringify(cards.map(c => ({ id: c.id, mode: c.mode, title: c.title, imageUrl: c.imageUrl })));
      if (json !== lastCardsJsonRef.current) {
        lastCardsJsonRef.current = json;
        onCardsChange(cards);
      }
    }
  }, [cards, onCardsChange]);

  // Atualiza as legendas padrão (Instagram com resumo e Facebook com chamada curta e impactante)
  const firstCardTitle = cards[0]?.title || '';
  const firstCardSubtitle = cards[0]?.subtitle || '';
  useEffect(() => {
    const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';

    if (!isCaptionCustomized) {
      setCaptionText(
        formatInstagramCaption({
          title: firstCardTitle || article?.title,
          subtitle: firstCardSubtitle || article?.subtitle,
          category,
          praca: article?.praca,
          id: article?.id,
          content: article?.content
        })
      );
    }

    if (!isFbCaptionCustomized) {
      setCaptionFacebook(
        formatFacebookCaption({
          title: firstCardTitle || article?.title,
          subtitle: firstCardSubtitle || article?.subtitle,
          category,
          categoryLabel: category,
          praca: article?.praca,
          id: article?.id,
          content: article?.content,
          metadata: article?.metadata,
          jogada: article?.jogada || article?.metadata?.jogada
        }, shareUrl)
      );
    }

    if (!isThreadsCaptionCustomized) {
      setCaptionThreads(
        formatThreadsCaption({
          title: firstCardTitle || article?.title,
          subtitle: firstCardSubtitle || article?.subtitle,
          category,
          categoryLabel: category,
          id: article?.id
        }, shareUrl)
      );
    }

    if (!isLinkedinCaptionCustomized) {
      setCaptionLinkedin(
        formatLinkedInCaption({
          title: firstCardTitle || article?.title,
          subtitle: firstCardSubtitle || article?.subtitle,
          category,
          categoryLabel: category,
          praca: article?.praca,
          id: article?.id,
          content: article?.content
        }, shareUrl)
      );
    }

    if (!isXCaptionCustomized) {
      setCaptionX(
        formatXCaption({
          title: firstCardTitle || article?.title,
          subtitle: firstCardSubtitle || article?.subtitle,
          category,
          categoryLabel: category,
          praca: article?.praca,
          id: article?.id,
          content: article?.content
        }, shareUrl)
      );
    }
  }, [firstCardTitle, firstCardSubtitle, category, article?.content, article?.title, article?.subtitle, article?.praca, article?.id, article?.metadata, isCaptionCustomized, isFbCaptionCustomized, isLinkedinCaptionCustomized, isXCaptionCustomized]);

  const handleRegenerateCaption = () => {
    const fresh = formatInstagramCaption({
      title: cards[0]?.title || article?.title || '',
      subtitle: cards[0]?.subtitle || article?.subtitle || '',
      category,
      praca: article?.praca,
      id: article?.id,
      content: article?.content
    });
    setCaptionText(fresh);
    setIsCaptionCustomized(false);
    if (showToast) {
      showToast('Legenda do Instagram atualizada com o resumo do portal!', false);
    }
  };

  const handleRegenerateFbCaption = () => {
    const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';
    const fresh = formatFacebookCaption({
      title: cards[0]?.title || article?.title || '',
      subtitle: cards[0]?.subtitle || article?.subtitle || '',
      category,
      categoryLabel: category,
      praca: article?.praca,
      id: article?.id,
      content: article?.content,
      metadata: article?.metadata,
      jogada: article?.jogada || article?.metadata?.jogada
    }, shareUrl);
    setCaptionFacebook(fresh);
    setIsFbCaptionCustomized(false);
    if (showToast) {
      showToast('Chamada do Facebook atualizada com sucesso!', false);
    }
  };

  const handleRegenerateLinkedinCaption = () => {
    const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';
    const fresh = formatLinkedInCaption({
      title: cards[0]?.title || article?.title || '',
      subtitle: cards[0]?.subtitle || article?.subtitle || '',
      category,
      categoryLabel: category,
      praca: article?.praca,
      id: article?.id,
      content: article?.content
    }, shareUrl);
    setCaptionLinkedin(fresh);
    setIsLinkedinCaptionCustomized(false);
    if (showToast) {
      showToast('Texto do LinkedIn atualizado com sucesso!', false);
    }
  };

  const handleRegenerateXCaption = () => {
    const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';
    const fresh = formatXCaption({
      title: cards[0]?.title || article?.title || '',
      subtitle: cards[0]?.subtitle || article?.subtitle || '',
      category,
      categoryLabel: category,
      praca: article?.praca,
      id: article?.id,
      content: article?.content
    }, shareUrl);
    setCaptionX(fresh);
    setIsXCaptionCustomized(false);
    if (showToast) {
      showToast('Texto do X (Twitter) atualizado com sucesso!', false);
    }
  };

  const handleRegenerateThreadsCaption = () => {
    const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';
    const fresh = formatThreadsCaption({
      title: cards[0]?.title || article?.title || '',
      subtitle: cards[0]?.subtitle || article?.subtitle || '',
      category,
      categoryLabel: category,
      id: article?.id
    }, shareUrl);
    setCaptionThreads(fresh);
    setIsThreadsCaptionCustomized(false);
    if (showToast) {
      showToast('Texto do Threads atualizado com sucesso!', false);
    }
  };

  const handleRegenerateAllCaptions = () => {
    handleRegenerateCaption();
    handleRegenerateFbCaption();
    handleRegenerateThreadsCaption();
    handleRegenerateLinkedinCaption();
    handleRegenerateXCaption();
    if (showToast) {
      showToast('Textos de todas as 5 redes atualizados com sucesso!', false);
    }
  };

  const toggleEditing = (platform) => {
    setEditingPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleCopyPlatformCaption = async (platform) => {
    let text = '';
    if (platform === 'instagram') text = captionText;
    else if (platform === 'facebook') text = captionFacebook;
    else if (platform === 'threads') text = captionThreads;
    else if (platform === 'linkedin') text = captionLinkedin;
    else if (platform === 'x') text = captionX;

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(''), 2500);
      if (showToast) {
        showToast(`Texto do ${platform.toUpperCase()} copiado!`, false);
      }
    }
  };

  const updateCard = (index, patch) => {
    setCards(prev => prev.map((c, idx) => (idx === index ? { ...c, ...patch } : c)));
  };

  const updateActiveCard = (patch) => {
    updateCard(safeActiveIndex, patch);
  };

  // Adiciona o card padrão de CTA (Siga NG) no final
  const handleAddCtaCard = () => {
    if (cards.length >= 10) {
      const msg = 'O limite máximo do Carrossel no Instagram é de 10 cards.';
      showToast ? showToast(msg, true) : alert(msg);
      return;
    }
    const ctaCard = createDefaultCtaCard();
    setCards(prev => [...prev, ctaCard]);
    setTimeout(() => setActiveCardIndex(cards.length), 20);
  };

  // Adiciona um novo card ao carrossel (mantendo o CTA sempre no final se existir)
  const handleAddCard = (initialImageUrl = '', initialMode = 'full_image') => {
    if (cards.length >= 10) {
      const msg = 'O limite máximo do Carrossel no Instagram é de 10 cards.';
      showToast ? showToast(msg, true) : alert(msg);
      return;
    }
    const newCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode: initialMode,
      mediaType: 'image',
      imageUrl: initialImageUrl,
      videoUrl: '',
      videoFile: null,
      customImage: Boolean(initialImageUrl),
      customTitle: false,
      customSubtitle: false,
      title: formatText(article?.title) || 'Título do Card.',
      subtitle: formatText(article?.subtitle) || 'Adicione informações complementares neste slide.',
      useTwoPhotos: false,
      secondImageUrl: '',
      objectFit: 'cover',
      showLogoOnFullImage: false
    };

    setCards(prev => {
      const lastIdx = prev.length - 1;
      const hasCtaAtEnd = lastIdx >= 0 && (prev[lastIdx].isCtaCard || prev[lastIdx].imageUrl === DEFAULT_CTA_IMAGE_URL);
      if (hasCtaAtEnd) {
        // Insere imediatamente antes do card final de CTA
        const copy = [...prev];
        copy.splice(lastIdx, 0, newCard);
        setTimeout(() => setActiveCardIndex(lastIdx), 20);
        return copy;
      }
      const nextIndex = prev.length;
      setTimeout(() => setActiveCardIndex(nextIndex), 20);
      return [...prev, newCard];
    });
  };

  // Upload de 1 ou mais fotos OU vídeos criando/preenchendo cards do carrossel
  const handleFilesToCarousel = (fileList, targetMode = 'replace_or_add') => {
    const files = Array.from(fileList || []).filter(
      f => (f.type && (f.type.startsWith('image/') || f.type.startsWith('video/'))) || isVideoFileOrUrl(f)
    );
    if (!files.length) return;

    Promise.all(
      files.map(
        file =>
          new Promise(resolve => {
            if (isVideoFileOrUrl(file)) {
              const objUrl = URL.createObjectURL(file);
              resolve({
                mediaType: 'video',
                url: objUrl,
                videoFile: file
              });
            } else {
              const reader = new FileReader();
              reader.onloadend = () =>
                resolve({
                  mediaType: 'image',
                  url: reader.result,
                  videoFile: null
                });
              reader.readAsDataURL(file);
            }
          })
      )
    ).then(items => {
      const validItems = items.filter(it => it && it.url);
      if (!validItems.length) return;

      if (targetMode === 'replace_active') {
        const [firstItem, ...restItems] = validItems;
        setCards(prev => {
          const updated = prev.map((c, idx) =>
            idx === safeActiveIndex
              ? {
                  ...c,
                  mediaType: firstItem.mediaType,
                  imageUrl: firstItem.mediaType === 'image' ? firstItem.url : c.imageUrl,
                  videoUrl: firstItem.mediaType === 'video' ? firstItem.url : '',
                  videoFile: firstItem.mediaType === 'video' ? firstItem.videoFile : null,
                  mode: firstItem.mediaType === 'video' && idx > 0 ? 'full_image' : c.mode,
                  customImage: true
                }
              : c
          );
          const remainingSlots = Math.max(0, 10 - updated.length);
          const extraCards = restItems.slice(0, remainingSlots).map((item, i) => ({
            id: `card-${Date.now()}-${i}`,
            mode: 'full_image',
            mediaType: item.mediaType,
            imageUrl: item.mediaType === 'image' ? item.url : '',
            videoUrl: item.mediaType === 'video' ? item.url : '',
            videoFile: item.mediaType === 'video' ? item.videoFile : null,
            customImage: true,
            customTitle: false,
            customSubtitle: false,
            title: formatText(article?.title) || 'Título do Card.',
            subtitle: formatText(article?.subtitle) || '',
            useTwoPhotos: false,
            secondImageUrl: '',
            objectFit: 'cover',
            showLogoOnFullImage: false
          }));

          const lastIdx = updated.length - 1;
          const hasCtaAtEnd = lastIdx >= 0 && (updated[lastIdx].isCtaCard || updated[lastIdx].imageUrl === DEFAULT_CTA_IMAGE_URL);
          if (hasCtaAtEnd) {
            const copy = [...updated];
            copy.splice(lastIdx, 0, ...extraCards);
            return copy;
          }
          return [...updated, ...extraCards];
        });
      } else {
        setCards(prev => {
          const remainingSlots = Math.max(0, 10 - prev.length);
          if (remainingSlots <= 0) {
            const msg = 'O limite máximo do Carrossel é de 10 cards.';
            showToast ? showToast(msg, true) : alert(msg);
            return prev;
          }
          const extraCards = validItems.slice(0, remainingSlots).map((item, i) => ({
            id: `card-${Date.now()}-${i}`,
            mode: 'full_image',
            mediaType: item.mediaType,
            imageUrl: item.mediaType === 'image' ? item.url : '',
            videoUrl: item.mediaType === 'video' ? item.url : '',
            videoFile: item.mediaType === 'video' ? item.videoFile : null,
            customImage: true,
            customTitle: false,
            customSubtitle: false,
            title: formatText(article?.title) || 'Título do Card.',
            subtitle: formatText(article?.subtitle) || '',
            useTwoPhotos: false,
            secondImageUrl: '',
            objectFit: 'cover',
            showLogoOnFullImage: false
          }));

          const lastIdx = prev.length - 1;
          const hasCtaAtEnd = lastIdx >= 0 && (prev[lastIdx].isCtaCard || prev[lastIdx].imageUrl === DEFAULT_CTA_IMAGE_URL);
          if (hasCtaAtEnd) {
            const copy = [...prev];
            copy.splice(lastIdx, 0, ...extraCards);
            setTimeout(() => setActiveCardIndex(lastIdx), 20);
            return copy;
          }

          const nextIdx = prev.length;
          setTimeout(() => setActiveCardIndex(nextIdx), 20);
          return [...prev, ...extraCards];
        });
      }
    });
  };

  const handleRemoveCard = (indexToRemove) => {
    if (cards.length <= 1) return;
    setCards(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setActiveCardIndex(prevIdx => {
      if (prevIdx >= indexToRemove && prevIdx > 0) {
        return prevIdx - 1;
      }
      return Math.min(prevIdx, cards.length - 2);
    });
  };

  const handleMoveCard = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= cards.length) return;
    setCards(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setActiveCardIndex(toIndex);
  };

  // Renderiza qualquer card em um elemento canvas específico
  const drawCardOnCanvas = async (targetCanvas, cardData, ratio = aspectRatio, transparentVideoTop = false) => {
    if (!targetCanvas || !cardData) return;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = ratio === '1:1' ? 1080 : ratio === '9:16' ? 1920 : 1350;
    if (targetCanvas.width !== width || targetCanvas.height !== height) {
      targetCanvas.width = width;
      targetCanvas.height = height;
    }

    try {
      await ensureBarlowCondensedLoaded();

      ctx.clearRect(0, 0, width, height);

      if (!transparentVideoTop) {
        ctx.fillStyle = '#040f1d';
        ctx.fillRect(0, 0, width, height);
      }

      // MODO 1: APENAS IMAGEM/VÍDEO INTEIRO
      if (cardData.mode === 'full_image') {
        if (cardData.mediaType === 'video') {
          if (cardData.showLogoOnFullImage) {
            let logo = null;
            try {
              logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
            } catch (_) {}
            if (logo && logo.naturalWidth > 0) {
              ctx.drawImage(logo, width - 165, 45, 125, 125 * (logo.height / logo.width));
            }
          }
          return;
        }

        let img = null;
        try {
          if (cardData.imageUrl) {
            img = await safeLoadImageForCanvas(cardData.imageUrl);
          }
        } catch (_) {}

        if (img && img.naturalWidth > 0) {
          if (cardData.objectFit === 'contain') {
            const scale = Math.min(width / img.width, height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (width - w) / 2;
            const y = (height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
          } else {
            const scale = Math.max(width / img.width, height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (width - w) / 2;
            const y = (height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
          }
        } else {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 42px "Barlow Condensed", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('FAÇA UPLOAD DA FOTO OU VÍDEO', width / 2, height / 2);
        }

        if (cardData.showLogoOnFullImage) {
          let logo = null;
          try {
            logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
          } catch (_) {}
          if (logo && logo.naturalWidth > 0) {
            ctx.drawImage(logo, width - 165, 45, 125, 125 * (logo.height / logo.width));
          }
        }
        return;
      }

      // MODO 2: TEMPLATE OFICIAL PORTAL NG BRASIL (FOTO/VÍDEO + TEXTO)
      const targetHeight = height * 0.58;

      if (cardData.mediaType === 'video' && transparentVideoTop) {
        // Deixa o topo transparente para o elemento <video> aparecer ao vivo e aplica apenas o gradiente na transição
        const grad = ctx.createLinearGradient(0, targetHeight - 160, 0, targetHeight);
        grad.addColorStop(0, 'rgba(0, 23, 46, 0)');
        grad.addColorStop(1, '#00172e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, targetHeight - 160, width, 160);
      } else {
        let img1 = null;
        let img2 = null;
        try {
          const loadPromises = [
            cardData.imageUrl ? safeLoadImageForCanvas(cardData.imageUrl) : Promise.resolve(null),
            cardData.useTwoPhotos && cardData.secondImageUrl ? safeLoadImageForCanvas(cardData.secondImageUrl) : Promise.resolve(null)
          ];
          const results = await Promise.all(loadPromises);
          img1 = results[0];
          img2 = results[1];
        } catch (_) {}

        if (!cardData.useTwoPhotos || !img2) {
          if (img1 && img1.naturalWidth > 0) {
            const scale = Math.max(width / img1.width, targetHeight / img1.height);
            const x = (width / 2) - (img1.width / 2) * scale;
            const y = (targetHeight / 2) - (img1.height / 2) * scale;
            ctx.drawImage(img1, x, y, img1.width * scale, img1.height * scale);

            const grad = ctx.createLinearGradient(0, targetHeight - 160, 0, targetHeight);
            grad.addColorStop(0, 'rgba(0, 23, 46, 0)');
            grad.addColorStop(1, '#00172e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, targetHeight - 160, width, 160);
          } else {
            const bgGrad = ctx.createLinearGradient(0, 0, width, targetHeight);
            bgGrad.addColorStop(0, '#0a1628');
            bgGrad.addColorStop(1, '#00172e');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, targetHeight);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#475569';
            ctx.font = '600 28px "Barlow Condensed", sans-serif';
            ctx.fillText(cardData.imageUrl ? 'FOTO EM TRATAMENTO OU PROTEGIDA' : 'PORTAL NG BRASIL • JORNALISMO INDEPENDENTE', width / 2, targetHeight / 2);
          }
        } else {
          const halfWidth = width / 2;

          if (img1 && img1.naturalWidth > 0) {
            const scale1 = Math.max(halfWidth / img1.width, targetHeight / img1.height);
            const w1 = img1.width * scale1;
            const h1 = img1.height * scale1;
            const x1 = (halfWidth / 2) - (w1 / 2);
            const y1 = (targetHeight / 2) - (h1 / 2);

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, halfWidth, targetHeight);
            ctx.clip();
            ctx.drawImage(img1, x1, y1, w1, h1);
            ctx.restore();
          } else {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, halfWidth, targetHeight);
          }

          if (img2 && img2.naturalWidth > 0) {
            const scale2 = Math.max(halfWidth / img2.width, targetHeight / img2.height);
            const w2 = img2.width * scale2;
            const h2 = img2.height * scale2;
            const x2 = halfWidth + (halfWidth / 2) - (w2 / 2);
            const y2 = (targetHeight / 2) - (h2 / 2);

            ctx.save();
            ctx.beginPath();
            ctx.rect(halfWidth, 0, halfWidth, targetHeight);
            ctx.clip();
            ctx.drawImage(img2, x2, y2, w2, h2);
            ctx.restore();
          } else {
            ctx.fillStyle = '#020617';
            ctx.fillRect(halfWidth, 0, halfWidth, targetHeight);
          }

          ctx.fillStyle = '#00172e';
          ctx.fillRect(halfWidth - 2, 0, 4, targetHeight);
        }
      }

      let logo = null;
      try {
        logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
      } catch (_) {}

      finalizeTemplateDraw(ctx, width, height, logo, cardData.title || '', cardData.subtitle || '');
      
      if (targetCanvas === canvasRef.current) {
        try {
          const previewUrl = targetCanvas.toDataURL('image/jpeg', 0.95);
          if (previewUrl && previewUrl.length > 50) {
            setCardPreviewUrl(previewUrl);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error("Erro ao desenhar card no canvas:", err);
    }
  };

  const finalizeTemplateDraw = (ctx, width, height, logo, cardTitle, cardSubtitle) => {
    const cardHeight = height * 0.45;
    const cardY = height - cardHeight;

    ctx.fillStyle = '#00172e';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, cardY + 50);
    ctx.quadraticCurveTo(0, cardY, 50, cardY);
    ctx.lineTo(width, cardY);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Aba vermelha no lado direito
    ctx.fillStyle = '#d40a38';
    ctx.beginPath();
    ctx.moveTo(width - 400, cardY);
    ctx.lineTo(width - 370, cardY - 25);
    ctx.lineTo(width, cardY - 25);
    ctx.lineTo(width, cardY);
    ctx.closePath();
    ctx.fill();

    // Logo no topo direito com fallback de vetor puro
    let logoDrawn = false;
    if (logo && logo.naturalWidth > 0) {
      try {
        ctx.drawImage(logo, width - 165, 45, 125, 125 * (logo.height / logo.width));
        logoDrawn = true;
      } catch (_) {}
    }

    if (!logoDrawn) {
      ctx.save();
      const bw = 115;
      const bh = 46;
      const bx = width - bw - 40;
      const by = 45;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 8) : ctx.rect(bx, by, bw, bh);
      ctx.fill();

      ctx.font = 'bold 26px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#040f1d';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('NG', bx + 12, by + bh / 2);

      ctx.fillStyle = '#d40a38';
      ctx.fillRect(bx + 52, by + 8, 3, bh - 16);

      ctx.font = '900 13px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#d40a38';
      ctx.fillText('BRASIL', bx + 62, by + bh / 2);
      ctx.restore();
    }

    const topLimit = cardY + 45;
    const bottomLimit = height - 115;
    const availableHeight = bottomLimit - topLimit;
    const maxWidth = width - 140;

    // Cálculo dinâmico auto-fit (zero overflow)
    const typeResult = calculateAutoFitTypography(ctx, cardTitle, cardSubtitle, maxWidth, availableHeight, aspectRatio);
    if (typeResult) {
      const {
        titleSize,
        titleLineHeight,
        titleLines,
        titleWords,
        subSize,
        subLineHeight,
        subLines,
        titleSpacing,
        totalTextHeight
      } = typeResult;

      const startY = Math.max(topLimit, topLimit + (availableHeight - totalTextHeight) / 2);

      // Desenha Título com destaque inteligente
      ctx.font = `bold ${titleSize}px "Barlow Condensed", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      const highlightInfo = getHighlightRange(titleWords);
      let globalWordIndex = 0;
      let textY = startY;

      titleLines.forEach(l => {
        const lWords = l.split(/\s+/).filter(Boolean);
        const fullLineWidth = ctx.measureText(l).width;
        let currentX = (width / 2) - (fullLineWidth / 2);

        lWords.forEach((w, idx) => {
          const isRed = highlightInfo.set.has(globalWordIndex);
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

      // Desenha Subtítulo
      if (subLines.length > 0) {
        ctx.font = `400 ${subSize}px "Barlow Condensed", sans-serif`;
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';

        let subY = textY + titleSpacing;
        subLines.forEach(l => {
          ctx.fillText(l, width / 2, subY);
          subY += subLineHeight;
        });
      }
    }

    // Rodapé
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, height - 90);
    ctx.lineTo(width - 60, height - 90);
    ctx.stroke();

    ctx.font = '600 24px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('portalngbrasil.com.br', 60, height - 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Barlow Condensed", sans-serif';

    const sigaText = 'Siga @portalngbrasil';
    const sigaWidth = ctx.measureText(sigaText).width;
    ctx.fillText(sigaText, width - 60 - sigaWidth, height - 55);
  };

  // Renderiza um card de imagem em um Blob (offscreen)
  const renderCardToBlob = async (cardData, mimeType = 'image/jpeg', quality = 0.95) => {
    const offscreen = document.createElement('canvas');
    await drawCardOnCanvas(offscreen, cardData, aspectRatio, false);
    return new Promise(resolve => offscreen.toBlob(resolve, mimeType, quality));
  };

  useEffect(() => {
    let isMounted = true;
    if (canvasRef.current && activeCard) {
      const isVideoOverlay = activeCard.mediaType === 'video' && Boolean(activeCard.videoUrl);
      drawCardOnCanvas(canvasRef.current, activeCard, aspectRatio, isVideoOverlay).then(() => {
        if (isMounted && canvasRef.current) {
          try {
            const url = canvasRef.current.toDataURL('image/jpeg', 0.95);
            if (url && url.length > 50) {
              setCardPreviewUrl(url);
            }
          } catch (e) {
            console.warn("Failed to export preview url:", e);
          }
        }
      });
    }
    return () => { isMounted = false; };
  }, [activeCard, aspectRatio, refreshKey]);

  const handleForceImageRefresh = () => {
    const rawUrl = activeCard?.imageUrl || article?.image;
    if (rawUrl && rawUrl.startsWith('http')) {
      updateActiveCard({
        imageUrl: `${rawUrl.split('?t=')[0]}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
      });
    } else {
      setRefreshKey(prev => prev + 1);
    }
  };

  const downloadSingleCard = async (cardData, index) => {
    if (cardData.mediaType === 'video' && cardData.videoUrl) {
      const link = document.createElement('a');
      link.download = `carrossel-video-${index + 1}-${Date.now()}.mp4`;
      link.href = cardData.videoUrl;
      link.click();
      return;
    }
    const offscreen = document.createElement('canvas');
    await drawCardOnCanvas(offscreen, cardData, aspectRatio, false);
    const link = document.createElement('a');
    link.download = cards.length > 1
      ? `carrossel-card-${index + 1}-${Date.now()}.png`
      : `card-instagram-${Date.now()}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  };

  const handleDownloadCurrent = () => {
    downloadSingleCard(activeCard, safeActiveIndex);
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < cards.length; i++) {
      await downloadSingleCard(cards[i], i);
      await new Promise(r => setTimeout(r, 250));
    }
  };

  const handleCopyCaption = async (customText) => {
    const textToCopy = typeof customText === 'string' ? customText : (captionText || captionFacebook || captionThreads || captionLinkedin || captionX);
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    shareToWhatsApp(article || { title: firstCardTitle, subtitle: firstCardSubtitle, category, praca: article?.praca, id: article?.id });
  };

  useImperativeHandle(ref, () => ({
    postToMeta: async (platforms = ['facebook', 'instagram', 'threads', 'linkedin', 'x'], options = {}) => {
      return await handlePostToMeta(platforms, options);
    },
    getCards: () => cards,
    getCaptionText: () => captionText,
    getCaptionFacebook: () => captionFacebook,
    getCaptionThreads: () => captionThreads,
    getCaptionLinkedin: () => captionLinkedin,
    getCaptionX: () => captionX
  }));

  const handlePostToMeta = async (platforms = ['facebook', 'instagram', 'threads', 'linkedin', 'x'], options = {}) => {
    const effectiveToken = (metaToken || FALLBACK_META_SETTINGS.metaToken || '').trim();
    const effectiveFbPageId = (metaFbPageId || FALLBACK_META_SETTINGS.metaFbPageId || '').trim();
    const effectiveIgAccountId = (metaIgAccountId || FALLBACK_META_SETTINGS.metaIgAccountId || '').trim();
    const effectiveThreadsToken = (threadsToken || FALLBACK_META_SETTINGS.threadsToken || '').trim();
    const effectiveThreadsUserId = (threadsUserId || FALLBACK_META_SETTINGS.threadsUserId || '').trim();
    const effectiveImgbbKey = (imgbbKey || FALLBACK_META_SETTINGS.imgbbKey || '').trim();
    const effectiveLinkedinToken = (linkedinToken || '').trim();
    const effectiveLinkedinOrgId = (linkedinOrgId || FALLBACK_LINKEDIN_SETTINGS.linkedinOrgId || '145261110').trim();

    const effectiveXApiKey = (xApiKey || FALLBACK_X_SETTINGS.xApiKey || '').trim();
    const effectiveXApiSecret = (xApiSecret || FALLBACK_X_SETTINGS.xApiSecret || '').trim();
    const effectiveXAccessToken = (xAccessToken || FALLBACK_X_SETTINGS.xAccessToken || '').trim();
    const effectiveXAccessSecret = (xAccessSecret || FALLBACK_X_SETTINGS.xAccessSecret || '').trim();
    const effectiveXBearerToken = (xBearerToken || FALLBACK_X_SETTINGS.xBearerToken || '').trim();
    const effectiveXUsername = (xUsername || FALLBACK_X_SETTINGS.xUsername || 'portalngbrasil').trim();

    const requiresMeta = platforms.includes('facebook') || platforms.includes('instagram');
    const requiresThreads = platforms.includes('threads');
    const requiresLinkedin = platforms.includes('linkedin');
    const requiresX = platforms.includes('x');

    if (requiresMeta && !effectiveToken) {
      const msg = "Configure o Token de Acesso do Meta (Facebook/Instagram) nas Configurações.";
      showToast ? showToast(msg, true) : alert(msg);
      throw new Error(msg);
    }
    if (requiresThreads && (!effectiveThreadsToken || !effectiveThreadsUserId)) {
      const msg = "Configure o Token e ID do Threads nas Configurações.";
      showToast ? showToast(msg, true) : alert(msg);
      throw new Error(msg);
    }
    if (requiresX && (!effectiveXBearerToken && (!effectiveXApiKey || !effectiveXApiSecret || !effectiveXAccessToken || !effectiveXAccessSecret))) {
      const msg = "Configure as credenciais da API do X (Twitter) nas Configurações.";
      showToast ? showToast(msg, true) : alert(msg);
      throw new Error(msg);
    }

    try {
      setIsPosting(true);
      const isCarousel = cards.length > 1;

      // 1. Renderizar / Hospedar todos os cards (fotos e vídeos)
      const mediaItems = [];
      const imageBlobs = [];
      const imageUrls = [];

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (c.mediaType === 'video' && (c.videoFile || c.videoUrl)) {
          setPostStatus(
            isCarousel
              ? `Hospedando vídeo do card ${i + 1} de ${cards.length}...`
              : 'Hospedando vídeo para redes sociais...'
          );
          const uploadedVideoUrl = await uploadVideoForSocial(c.videoFile || c.videoUrl);
          mediaItems.push({
            type: 'video',
            url: uploadedVideoUrl,
            blob: c.videoFile || null
          });
        } else {
          setPostStatus(
            isCarousel
              ? `Renderizando e hospedando card ${i + 1} de ${cards.length}...`
              : 'Hospedando arte para redes sociais...'
          );
          const blob = await renderCardToBlob(c, 'image/jpeg', 0.95);
          imageBlobs.push(blob);
          let uploadedUrl = null;
          try {
            uploadedUrl = await uploadImageForSocial(blob, effectiveImgbbKey);
            if (uploadedUrl) imageUrls.push(uploadedUrl);
          } catch (upErr) {
            if (platforms.includes('instagram')) {
              throw upErr;
            }
            console.warn(`Aviso no upload da imagem ${i + 1}:`, upErr.message);
          }
          mediaItems.push({
            type: 'image',
            url: uploadedUrl,
            blob
          });
        }
      }

      let fbPostUrl = null;
      let igPostUrl = null;
      let fbError = null;
      let igError = null;

      // 2. Postar no Facebook (Com Link e Prévia Oficial da Matéria no Portal)
      if (effectiveFbPageId && platforms.includes('facebook')) {
        setPostStatus('Postando no Facebook com link e prévia do portal...');
        try {
          const effectiveArticle = options?.article || article;
          const targetArticleId = effectiveArticle?.id || article?.id;
          const shareUrl = options?.shareUrl || (targetArticleId ? `https://portalngbrasil.com.br/share.php?id=${targetArticleId}` : 'https://portalngbrasil.com.br');

          // Força o Facebook a raspar o Open Graph e cachear a foto da matéria em alta resolução antes da postagem
          if (shareUrl && shareUrl.includes('share.php') && effectiveToken) {
            try {
              const scRes = await fetch(`https://graph.facebook.com/v20.0/?id=${encodeURIComponent(shareUrl)}&scrape=true&access_token=${effectiveToken}`, { method: 'POST' });
              if (scRes.ok) {
                // Pequena pausa para garantir que o CDN de imagens da Meta baixou a capa da matéria
                await new Promise(r => setTimeout(r, 1200));
              }
            } catch (scErr) {
              console.warn("Aviso ao forçar scrape antecipado do Facebook:", scErr.message);
            }
          }

          let effectiveFbMessage = (captionFacebook && captionFacebook.trim()) || formatFacebookCaption({
            title: firstCardTitle || effectiveArticle?.title || article?.title,
            subtitle: firstCardSubtitle || effectiveArticle?.subtitle || article?.subtitle,
            categoryLabel: category,
            category,
            id: targetArticleId,
            content: effectiveArticle?.content || article?.content,
            metadata: effectiveArticle?.metadata || article?.metadata,
            jogada: effectiveArticle?.jogada || effectiveArticle?.metadata?.jogada
          }, shareUrl);

          // Se a legenda personalizada tiver link genérico sem o ID da matéria, substitui pelo link direto
          if (targetArticleId && effectiveFbMessage.includes('https://portalngbrasil.com.br') && !effectiveFbMessage.includes(shareUrl)) {
            effectiveFbMessage = effectiveFbMessage.replace('https://portalngbrasil.com.br', shareUrl);
          }

          if (mediaItems.length === 1 && mediaItems[0].type === 'video') {
            // Post de vídeo único no Facebook Page
            const { pageToken } = await resolveFacebookPageToken(effectiveToken, effectiveFbPageId);
            const fbVidRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveFbPageId}/videos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_url: mediaItems[0].url,
                description: effectiveFbMessage,
                access_token: pageToken
              })
            });
            const fbVidData = await fbVidRes.json();
            if (!fbVidData.error && fbVidData.id) {
              fbPostUrl = `https://www.facebook.com/${fbVidData.id}`;
            } else {
              throw new Error(fbVidData.error?.message || 'Falha ao publicar vídeo no Facebook');
            }
          } else {
            // Post no Feed do Facebook com Link Clicável e Prévia do Site (sem o card gerado do Instagram)
            const fbRes = await publishToFacebookPage({
              pageId: effectiveFbPageId,
              token: effectiveToken,
              message: effectiveFbMessage,
              linkUrl: shareUrl,
              asPhoto: false
            });
            fbPostUrl = fbRes.url || `https://www.facebook.com/${effectiveFbPageId}`;
          }
          console.log("Facebook publicado com sucesso:", fbPostUrl);
        } catch (e) {
          console.error("Erro ao publicar no Facebook:", e);
          fbError = e.message;
        }
      }

      // 3. Postar no Instagram (Imagem Única, Vídeo Único ou Carrossel Misto Fotos + Vídeos)
      if (effectiveIgAccountId && platforms.includes('instagram')) {
        try {
          const safeCaption = captionText.length > 2100 ? captionText.substring(0, 2100) + "..." : captionText;

          if (!isCarousel) {
            const single = mediaItems[0];
            setPostStatus('Criando container no Instagram...');
            const payload = single.type === 'video'
              ? { media_type: 'REELS', video_url: single.url, caption: safeCaption, access_token: effectiveToken }
              : { image_url: single.url, caption: safeCaption, access_token: effectiveToken };

            const igMediaRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveIgAccountId}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const igMediaData = await igMediaRes.json();
            if (igMediaData.error) {
              throw new Error("Container Instagram: " + (igMediaData.error.error_user_msg || igMediaData.error.message));
            }

            const creationId = igMediaData.id;
            setPostStatus('Aguardando processamento da mídia pelo Instagram...');

            let retries = single.type === 'video' ? 24 : 12;
            while (retries > 0) {
              await new Promise(r => setTimeout(r, 3500));
              try {
                const statusRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${effectiveToken}`);
                const statusData = await statusRes.json();
                if (statusData.status_code === 'FINISHED') {
                  break;
                } else if (statusData.status_code === 'ERROR') {
                  throw new Error("Processamento Instagram falhou: " + (statusData.status || "Formato de mídia rejeitado"));
                }
              } catch (stErr) {
                if (stErr.message.includes('Processamento Instagram')) throw stErr;
              }
              retries--;
            }

            setPostStatus('Publicando no Feed do Instagram...');
            const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveIgAccountId}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: creationId, access_token: effectiveToken })
            });
            const igPublishData = await igPublishRes.json();

            if (igPublishData.error) {
              throw new Error("Publicação Instagram: " + (igPublishData.error.error_user_msg || igPublishData.error.message));
            }

            igPostUrl = 'https://www.instagram.com/portalngbrasil/';
            try {
              const permaRes = await fetch(`https://graph.facebook.com/v20.0/${igPublishData.id}?fields=permalink&access_token=${effectiveToken}`);
              const permaData = await permaRes.json();
              if (permaData.permalink) {
                igPostUrl = permaData.permalink;
              }
            } catch (_) {}
          } else {
            // Publicação de CARROSSEL no Instagram (Suporta Fotos e Vídeos!)
            const childrenIds = [];
            for (let i = 0; i < mediaItems.length; i++) {
              const item = mediaItems[i];
              setPostStatus(`Preparando slide ${i + 1} de ${mediaItems.length} (${item.type === 'video' ? 'Vídeo' : 'Foto'}) no Instagram...`);

              const childPayload = item.type === 'video'
                ? {
                    media_type: 'VIDEO',
                    video_url: item.url,
                    is_carousel_item: true,
                    access_token: effectiveToken
                  }
                : {
                    image_url: item.url,
                    is_carousel_item: true,
                    access_token: effectiveToken
                  };

              const itemRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveIgAccountId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(childPayload)
              });
              const itemData = await itemRes.json();
              if (itemData.error) {
                throw new Error(`Slide ${i + 1} Instagram: ` + (itemData.error.error_user_msg || itemData.error.message));
              }
              if (itemData.id) {
                // Para vídeos em carrossel, a Meta exige que o container filho termine de processar (FINISHED) antes de criar o CAROUSEL pai
                if (item.type === 'video') {
                  let childRetries = 24;
                  while (childRetries > 0) {
                    setPostStatus(`Instagram processando vídeo do slide ${i + 1}...`);
                    await new Promise(r => setTimeout(r, 4000));
                    try {
                      const stRes = await fetch(`https://graph.facebook.com/v20.0/${itemData.id}?fields=status_code,status&access_token=${effectiveToken}`);
                      const stData = await stRes.json();
                      if (stData.status_code === 'FINISHED') {
                        break;
                      } else if (stData.status_code === 'ERROR') {
                        throw new Error(`Processamento do vídeo (Slide ${i + 1}) falhou: ` + (stData.status || 'Formato de vídeo não suportado'));
                      }
                    } catch (errVid) {
                      if (errVid.message.includes('Processamento do vídeo')) throw errVid;
                    }
                    childRetries--;
                  }
                }
                childrenIds.push(itemData.id);
              }
            }

            setPostStatus('Montando Carrossel no Instagram...');
            const carouselRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveIgAccountId}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                media_type: 'CAROUSEL',
                children: childrenIds,
                caption: safeCaption,
                access_token: effectiveToken
              })
            });
            const carouselData = await carouselRes.json();
            if (carouselData.error) {
              throw new Error("Container Carrossel Instagram: " + (carouselData.error.error_user_msg || carouselData.error.message));
            }

            const carouselCreationId = carouselData.id;
            setPostStatus('Aguardando processamento do Carrossel pelo Instagram...');

            let igPublishData = null;
            let retries = 18;
            while (retries > 0) {
              await new Promise(r => setTimeout(r, 3500));
              try {
                const statusRes = await fetch(`https://graph.facebook.com/v20.0/${carouselCreationId}?fields=status_code,status&access_token=${effectiveToken}`);
                const statusData = await statusRes.json();
                if (statusData.status_code === 'ERROR') {
                  throw new Error("Processamento do Carrossel falhou: " + (statusData.status || "Formato rejeitado"));
                }
              } catch (stErr) {
                if (stErr.message.includes('Processamento do Carrossel')) throw stErr;
              }

              setPostStatus('Publicando Carrossel no Feed do Instagram...');
              const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveIgAccountId}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creation_id: carouselCreationId, access_token: effectiveToken })
              });
              igPublishData = await igPublishRes.json();

              const isTransient = igPublishData.error && (
                igPublishData.error.code === 9007 ||
                (igPublishData.error.message || '').toLowerCase().includes('not ready') ||
                (igPublishData.error.message || '').toLowerCase().includes('processing') ||
                (igPublishData.error.message || '').toLowerCase().includes('in progress')
              );

              if (isTransient) {
                retries--;
                setPostStatus('Instagram finalizando processamento dos slides...');
              } else {
                break;
              }
            }

            if (igPublishData?.error) {
              throw new Error("Publicação Carrossel Instagram: " + (igPublishData.error.error_user_msg || igPublishData.error.message));
            }

            igPostUrl = 'https://www.instagram.com/portalngbrasil/';
            try {
              if (igPublishData?.id) {
                const permaRes = await fetch(`https://graph.facebook.com/v20.0/${igPublishData.id}?fields=permalink&access_token=${effectiveToken}`);
                const permaData = await permaRes.json();
                if (permaData.permalink) {
                  igPostUrl = permaData.permalink;
                }
              }
            } catch (_) {}
          }
          console.log("Instagram publicado com sucesso:", igPostUrl);
        } catch (e) {
          igError = e.message;
        }
      }

      // 4. Postar no Threads
      let thPostUrl = null;
      let thError = null;
      if (effectiveThreadsToken && effectiveThreadsUserId && platforms.includes('threads')) {
        setPostStatus('Postando no Threads (@portalngbrasil)...');
        try {
          const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';
          const thMessage = (isThreadsCaptionCustomized && captionThreads)
            ? captionThreads
            : formatThreadsCaption({ 
                title: firstCardTitle || article?.title, 
                subtitle: firstCardSubtitle || article?.subtitle, 
                categoryLabel: category, 
                id: article?.id 
              }, shareUrl);

          const thRes = await publishToThreads({
            userId: effectiveThreadsUserId,
            token: effectiveThreadsToken,
            publicImageUrl: imageUrls[0] || null,
            text: thMessage,
            linkUrl: shareUrl
          });
          thPostUrl = thRes.url;
          console.log("Threads publicado com sucesso:", thPostUrl);
        } catch (e) {
          console.error("Erro ao publicar no Threads:", e);
          thError = e.message;
        }
      }

      // 5. Postar no LinkedIn (Company Page oficial)
      let liPostUrl = null;
      let liError = null;
      if (platforms.includes('linkedin')) {
        setPostStatus('Postando no LinkedIn da empresa (Company Page)...');
        try {
          const effectiveArticle = options?.article || article;
          const shareUrl = options?.shareUrl || (effectiveArticle?.id ? `https://portalngbrasil.com.br/share.php?id=${effectiveArticle.id}` : 'https://portalngbrasil.com.br');
          const liCaption = isLinkedinCaptionCustomized ? captionLinkedin : undefined;

          const liRes = await publishArticleToLinkedIn({
            article: effectiveArticle,
            shareUrl,
            customCaption: liCaption,
            settings: {
              linkedinToken: effectiveLinkedinToken,
              linkedinOrgId: effectiveLinkedinOrgId
            }
          });

          if (liRes.success) {
            liPostUrl = liRes.url;
            console.log("LinkedIn publicado com sucesso:", liPostUrl);
          } else {
            liError = liRes.error;
            console.warn("Aviso na publicação do LinkedIn:", liError);
          }
        } catch (e) {
          console.error("Erro ao publicar no LinkedIn:", e);
          liError = e.message;
        }
      }

      // 6. Postar no X (antigo Twitter)
      let xPostUrl = null;
      let xError = null;
      if (platforms.includes('x')) {
        setPostStatus('Postando no X (@portalngbrasil)...');
        try {
          const effectiveArticle = options?.article || article;
          const shareUrl = options?.shareUrl || (effectiveArticle?.id ? `https://portalngbrasil.com.br/share.php?id=${effectiveArticle.id}` : 'https://portalngbrasil.com.br');
          const xCaption = isXCaptionCustomized ? captionX : undefined;

          const xRes = await publishArticleToX({
            article: effectiveArticle,
            shareUrl,
            customCaption: xCaption,
            mediaBlob: imageBlobs[0] || null,
            mediaUrl: imageUrls[0] || null,
            settings: {
              xApiKey: effectiveXApiKey,
              xApiSecret: effectiveXApiSecret,
              xAccessToken: effectiveXAccessToken,
              xAccessSecret: effectiveXAccessSecret,
              xBearerToken: effectiveXBearerToken,
              xUsername: effectiveXUsername
            }
          });

          if (xRes.success) {
            xPostUrl = xRes.url;
            console.log("X (Twitter) publicado com sucesso:", xPostUrl);
          } else {
            xError = xRes.error;
            console.warn("Aviso na publicação do X:", xError);
          }
        } catch (e) {
          console.error("Erro ao publicar no X:", e);
          xError = e.message;
        }
      }

      const hasErrors = fbError || igError || thError || liError || xError;
      if (hasErrors) {
        const errorMsgs = [];
        if (fbError) errorMsgs.push(`FB: ${fbError}`);
        if (igError) errorMsgs.push(`IG: ${igError}`);
        if (thError) errorMsgs.push(`Threads: ${thError}`);
        if (liError) errorMsgs.push(`LinkedIn: ${liError}`);
        if (xError) errorMsgs.push(`X: ${xError}`);
        showToast ? showToast(errorMsgs.join(' | '), true) : null;
      } else {
        showToast
          ? showToast(isCarousel ? `Carrossel (${cards.length} cards) publicado com sucesso!` : "Publicado com sucesso nas redes sociais!")
          : alert("Publicado com sucesso!");
      }

      const postResult = {
        success: (!platforms.includes('facebook') || !fbError) &&
                 (!platforms.includes('instagram') || !igError) &&
                 (!platforms.includes('threads') || !thError) &&
                 (!platforms.includes('linkedin') || !liError) &&
                 (!platforms.includes('x') || !xError),
        facebook: fbPostUrl || (effectiveFbPageId ? `https://www.facebook.com/${effectiveFbPageId}` : 'https://www.facebook.com/portalngbrasil'),
        instagram: igPostUrl || 'https://www.instagram.com/portalngbrasil/',
        threads: thPostUrl || 'https://www.threads.net/@portalngbrasil',
        linkedin: liPostUrl || (effectiveLinkedinOrgId ? `https://www.linkedin.com/company/${effectiveLinkedinOrgId}` : 'https://www.linkedin.com/company/portalngbrasil'),
        x: xPostUrl || (effectiveXUsername ? `https://x.com/${effectiveXUsername}` : 'https://x.com/portalngbrasil'),
        fbError,
        igError,
        thError,
        liError,
        xError
      };

      if (onPostSuccess) {
        onPostSuccess(postResult);
      }

      return postResult;
    } catch (err) {
      console.error(err);
      showToast ? showToast("Erro nas redes sociais: " + err.message, true) : alert("Erro: " + err.message);
      return {
        success: false,
        error: err.message,
        facebook: metaFbPageId ? `https://www.facebook.com/${metaFbPageId}` : 'https://www.facebook.com/portalngbrasil',
        instagram: 'https://www.instagram.com/portalngbrasil/'
      };
    } finally {
      setIsPosting(false);
      setPostStatus('');
    }
  };

  const hasMediaInActiveCard = activeCard?.mediaType === 'video' ? Boolean(activeCard?.videoUrl) : Boolean(activeCard?.imageUrl);

  // Renderiza a arte idêntica gerada pelo Canva (exatamente como em Imagem 2)
  const renderCanvaArtPreview = (extraClass = "aspect-[4/5] max-h-[300px]") => {
    return (
      <div className={`relative bg-[#00172e] w-full flex items-center justify-center overflow-hidden select-none ${aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/5]'} ${extraClass}`}>
        {cardPreviewUrl ? (
          <img
            src={cardPreviewUrl}
            alt="Arte Oficial do Canva Portal NG"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 bg-[#040f1d]">
            <RefreshCw className="w-5 h-5 animate-spin text-red-500 mb-2" />
            <span className="text-[10px] font-bold text-slate-300">Carregando arte do Canva...</span>
          </div>
        )}
      </div>
    );
  };

  const content = (
    <div className={`bg-white shadow-sm overflow-hidden flex flex-col ${inline ? 'rounded-xl border border-slate-200 h-full w-full' : 'md:flex-row rounded-2xl max-w-7xl w-full my-4 border border-slate-200'}`}>
      
      {/* Inputs ocultos para upload rápido de Fotos e Vídeos no preview */}
      <input
        ref={directUploadInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFilesToCarousel(e.target.files, 'replace_active');
            e.target.value = '';
          }
        }}
      />
      <input
        ref={multiUploadInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFilesToCarousel(e.target.files, 'add_new');
            e.target.value = '';
          }
        }}
      />

      {/* Left / Top Column: Canvas Preview & Carousel Builder */}
      <div className={`w-full ${inline ? '' : 'md:w-1/2'} bg-slate-950 flex flex-col md:flex-row relative ${inline ? 'border-b' : 'border-r'} border-slate-800`}>
        
        {/* Painel Esquerdo de Configuração (Sidebar sem espaço vazio na esquerda e com linha divisória à direita) */}
        <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-start space-y-4 bg-slate-950/70 overflow-y-auto max-h-[850px] scrollbar-thin">
          
          {/* Header do Painel Esquerdo */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Configurar Card
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              Card {safeActiveIndex + 1}/{cards.length}
            </span>
          </div>

          {/* Seletor de Modo (Template NG vs Foto Inteira) */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
              Tipo de Arte
            </span>
            <div className="inline-flex p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner w-full">
              <button
                type="button"
                onClick={() => updateActiveCard({ mode: 'template' })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeCard?.mode === 'template'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Template NG</span>
              </button>

              <button
                type="button"
                onClick={() => updateActiveCard({ mode: 'full_image' })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeCard?.mode === 'full_image'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {activeCard?.mediaType === 'video' ? (
                  <Video className="w-3.5 h-3.5" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span className="truncate">Foto Inteira</span>
              </button>
            </div>
          </div>

          {/* Formatos Lado a Lado (Espaçosos e com Proporção Clara) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Formato do Feed
              </span>
              <span className="text-[10px] font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40">
                {aspectRatio}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                type="button"
                onClick={() => setAspectRatio('4:5')}
                title="Feed Retrato Instagram (4:5 Oficial)"
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all ${
                  aspectRatio === '4:5'
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-white/20'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className={`w-3.5 h-4.5 rounded-xs border-2 mb-1 ${aspectRatio === '4:5' ? 'border-white bg-white/30' : 'border-slate-500'}`} />
                <span className="font-extrabold text-xs leading-tight">4:5</span>
                <span className="text-[9px] font-medium opacity-80 leading-tight">Portrait</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                title="Feed Quadrado (1:1)"
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-white/20'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-xs border-2 mb-1 ${aspectRatio === '1:1' ? 'border-white bg-white/30' : 'border-slate-500'}`} />
                <span className="font-extrabold text-xs leading-tight">1:1</span>
                <span className="text-[9px] font-medium opacity-80 leading-tight">Quadrado</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                title="Stories e Reels (9:16)"
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-white/20'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className={`w-2.5 h-5 rounded-xs border-2 mb-1 ${aspectRatio === '9:16' ? 'border-white bg-white/30' : 'border-slate-500'}`} />
                <span className="font-extrabold text-xs leading-tight">9:16</span>
                <span className="text-[9px] font-medium opacity-80 leading-tight">Stories</span>
              </button>
            </div>
          </div>

          {/* Item de Dividir Tela (Duas Fotos Lado a Lado) posicionado logo abaixo do formato */}
          {activeCard?.mode === 'template' && activeCard?.mediaType !== 'video' && (
            <div className="w-full p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(activeCard.useTwoPhotos)}
                  onChange={(e) => updateActiveCard({ useTwoPhotos: e.target.checked })}
                  className="w-4 h-4 mt-0.5 text-red-600 rounded border-slate-700 bg-slate-950 focus:ring-red-500 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-slate-200 leading-snug">
                  Usar duas fotos lado a lado neste card (Tela Dividida)
                </span>
              </label>

              {activeCard.useTwoPhotos && (
                <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>📸 2ª Foto (Metade Direita):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-red-500 rounded-lg py-2 px-3 flex items-center justify-center gap-1.5 text-xs text-slate-300 font-bold transition-colors">
                      <Upload className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>Upload da 2ª Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => updateActiveCard({ secondImageUrl: reader.result });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {activeCard.secondImageUrl && (
                      <button
                        type="button"
                        onClick={() => updateActiveCard({ secondImageUrl: '' })}
                        className="p-2 bg-slate-950 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 transition-colors shrink-0"
                        title="Remover 2ª foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ou cole o link (URL) da 2ª foto..."
                    value={activeCard.secondImageUrl && activeCard.secondImageUrl.startsWith('http') ? activeCard.secondImageUrl : ''}
                    onChange={(e) => updateActiveCard({ secondImageUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 bg-slate-950 focus:ring-1 focus:ring-red-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Personalização dos Textos da Arte (Título e Subtítulo) posicionado logo abaixo de Tela Dividida */}
          {activeCard?.mode === 'template' && (
            <div className="w-full p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {activeCard?.isCtaCard || activeCard?.imageUrl === DEFAULT_CTA_IMAGE_URL
                      ? `Card ${safeActiveIndex + 1} (CTA Final)`
                      : safeActiveIndex === 0
                      ? 'Capa Principal (Card 1)'
                      : `Card ${safeActiveIndex + 1} de ${cards.length}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {safeActiveIndex === 0 && activeCard?.customImage && article?.image && (
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveCard({
                          mediaType: 'image',
                          imageUrl: getInitialImage(article),
                          videoUrl: '',
                          videoFile: null,
                          customImage: false
                        })
                      }
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:underline bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900/40 transition-colors"
                      title="Restaurar a foto original da matéria"
                    >
                      Foto original
                    </button>
                  )}
                  {activeCard?.isCtaCard && activeCard?.imageUrl !== DEFAULT_CTA_IMAGE_URL && (
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveCard({
                          mediaType: 'image',
                          imageUrl: DEFAULT_CTA_IMAGE_URL,
                          videoUrl: '',
                          videoFile: null,
                          customImage: true
                        })
                      }
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/40 transition-colors"
                    >
                      CTA
                    </button>
                  )}
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    Template NG
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Título da Arte (Card {safeActiveIndex + 1})
                    </label>
                    {activeCard.customTitle && safeActiveIndex === 0 && article?.title && (
                      <button
                        type="button"
                        onClick={() => updateActiveCard({ title: article.title, customTitle: false })}
                        className="text-[9px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                  <textarea
                    value={activeCard.title || ''}
                    onChange={(e) => updateActiveCard({ title: e.target.value, customTitle: true })}
                    rows={2}
                    placeholder="Título da arte..."
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 bg-slate-950 focus:ring-1 focus:ring-red-500 focus:outline-none placeholder:text-slate-500 resize-y"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Subtítulo / Linha Fina (Card {safeActiveIndex + 1})
                    </label>
                    {activeCard.customSubtitle && safeActiveIndex === 0 && article?.subtitle && (
                      <button
                        type="button"
                        onClick={() => updateActiveCard({ subtitle: article.subtitle, customSubtitle: false })}
                        className="text-[9px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                  <textarea
                    value={activeCard.subtitle || ''}
                    onChange={(e) => updateActiveCard({ subtitle: e.target.value, customSubtitle: true })}
                    rows={2}
                    placeholder="Subtítulo da arte..."
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 bg-slate-950 focus:ring-1 focus:ring-red-500 focus:outline-none placeholder:text-slate-500 resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Opções extras quando em modo Foto/Vídeo Inteiro */}
          {activeCard?.mode === 'full_image' && (
            <div className="w-full p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3 shadow-inner">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enquadramento da Imagem</span>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => updateActiveCard({ objectFit: 'cover' })}
                    className={`py-1.5 rounded text-xs font-bold transition-colors ${
                      activeCard.objectFit !== 'contain' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Preencher tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveCard({ objectFit: 'contain' })}
                    className={`py-1.5 rounded text-xs font-bold transition-colors ${
                      activeCard.objectFit === 'contain' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sem corte
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-800/80">
                <input
                  type="checkbox"
                  checked={Boolean(activeCard.showLogoOnFullImage)}
                  onChange={(e) => updateActiveCard({ showLogoOnFullImage: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded border-slate-700 bg-slate-950 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300">Aplicar Logo NG no topo</span>
              </label>
            </div>
          )}
        </div>

        {/* Lado Direito do Estúdio: Área Visual do Card, Ações e Carrossel */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-between min-w-0 space-y-4">
          
          {/* Top Header Discreto: Status dos Slides & Botão de Recarregar */}
          <div className="flex items-center justify-between w-full max-w-[480px] px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Estúdio de Criação</span>
              {cards.length > 1 && (
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30 rounded-full">
                  Slide {safeActiveIndex + 1}/{cards.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleForceImageRefresh}
              title="Forçar recarregamento da mídia"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 py-1.5 px-2.5 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Recarregar</span>
            </button>
          </div>

          {/* Main Row: Prev + Preview Centralizado + Next + Dock de Ações (Direita) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3.5 w-full">

            {/* Seta Anterior (se houver mais de 1 card) */}
            {cards.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveCardIndex(prev => Math.max(0, prev - 1))}
              disabled={safeActiveIndex === 0}
              title="Card anterior"
              className={`p-1.5 sm:p-2 rounded-full border transition-all shrink-0 self-center ${
                safeActiveIndex === 0
                  ? 'bg-slate-900/30 border-slate-800/40 text-slate-700 cursor-not-allowed opacity-30'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white shadow-lg'
              }`}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Card Preview Box com Proporção Dinâmica */}
          <div className={`relative w-full ${
            aspectRatio === '1:1'
              ? 'max-w-[280px] sm:max-w-[310px] aspect-square'
              : aspectRatio === '9:16'
              ? 'max-w-[190px] sm:max-w-[215px] aspect-[9/16]'
              : 'max-w-[255px] xs:max-w-[285px] sm:max-w-[315px] aspect-[4/5]'
          } rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center group transition-all duration-200`}>
            
            {/* Player de Vídeo integrado ao card quando o slide atual é um vídeo */}
            {activeCard?.mediaType === 'video' && activeCard?.videoUrl && (
              <video
                key={activeCard.videoUrl}
                src={activeCard.videoUrl}
                controls={activeCard.mode === 'full_image'}
                autoPlay
                muted
                loop
                playsInline
                className={
                  activeCard.mode === 'full_image'
                    ? `w-full h-full ${activeCard.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`
                    : 'absolute top-0 left-0 w-full h-[58%] object-cover'
                }
              />
            )}

            <canvas
              ref={canvasRef}
              className={`w-full h-full object-contain ${
                activeCard?.mediaType === 'video' && activeCard?.videoUrl
                  ? 'absolute inset-0 pointer-events-none'
                  : ''
              }`}
            />

            {/* Badge superior com ações no canto esquerdo (mantendo o canto direito livre para a logo NG) */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-auto">
              <span className="bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full border border-slate-700/80 shadow flex items-center gap-1">
                {activeCard?.mediaType === 'video' && <Video className="w-3 h-3 text-red-400" />}
                <span>Card {safeActiveIndex + 1}/{cards.length}</span>
              </span>

              <button
                type="button"
                onClick={() => directUploadInputRef.current?.click()}
                title="Fazer upload de foto ou vídeo para este card"
                className="bg-slate-950/85 hover:bg-red-600 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700/80 transition-colors flex items-center gap-1 shadow"
              >
                <Upload className="w-3 h-3 text-red-400" />
                <span>{hasMediaInActiveCard ? 'Trocar Mídia' : 'Subir Mídia'}</span>
              </button>
            </div>

            {/* Overlay clicável quando o card ainda não possui imagem ou vídeo */}
            {!hasMediaInActiveCard && (
              <div
                onClick={() => directUploadInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) {
                    handleFilesToCarousel(e.dataTransfer.files, 'replace_active');
                  }
                }}
                className={`absolute inset-x-4 z-10 ${
                  activeCard?.mode === 'full_image' ? 'inset-y-12' : 'top-12 h-[44%]'
                } border-2 border-dashed border-slate-600 hover:border-red-500 rounded-xl bg-slate-950/75 hover:bg-slate-900/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all`}
              >
                <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-1.5">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">
                  Foto ou Vídeo para o Card {safeActiveIndex + 1}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG, WebP ou MP4/MOV
                </span>
              </div>
            )}
          </div>

          {/* Seta Próximo (se houver mais de 1 card) */}
          {cards.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveCardIndex(prev => Math.min(cards.length - 1, prev + 1))}
              disabled={safeActiveIndex === cards.length - 1}
              title="Próximo card"
              className={`p-1.5 sm:p-2 rounded-full border transition-all shrink-0 self-center ${
                safeActiveIndex === cards.length - 1
                  ? 'bg-slate-900/30 border-slate-800/40 text-slate-700 cursor-not-allowed opacity-30'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white shadow-lg'
              }`}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Dock de Ações Rápidas no Lado Direito */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0 self-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ações</span>
            <button
              type="button"
              onClick={() => handleAddCard('', 'full_image')}
              title="Adicionar novo card ao lado (Carrossel)"
              className="group flex flex-col items-center justify-center w-11 sm:w-14 py-1.5 sm:py-2 rounded-xl border border-dashed border-slate-700 hover:border-red-500 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-md"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-xs mb-0.5 sm:mb-1 group-hover:scale-110 transition-transform">
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold leading-tight text-center">
                + Card
              </span>
            </button>

            <button
              type="button"
              onClick={() => multiUploadInputRef.current?.click()}
              title="Fazer upload de fotos ou vídeos direto para o carrossel"
              className="flex flex-col items-center justify-center w-11 sm:w-14 py-1.5 sm:py-2 px-1 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-center"
            >
              <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400 mb-0.5 sm:mb-1" />
              <span className="text-[8px] sm:text-[9px] font-bold leading-tight">
                Upload
              </span>
            </button>
          </div>
        </div>

        {/* Barra de Miniaturas e Gerenciamento dos Slides do Carrossel */}
        <div className="flex flex-col items-center gap-2 mt-4 w-full">
          <div className="flex items-center gap-1.5 max-w-full overflow-x-auto py-1 px-2 scrollbar-none">
            {cards.map((c, idx) => {
              const isSelected = idx === safeActiveIndex;
              const isCta = c.isCtaCard || c.imageUrl === DEFAULT_CTA_IMAGE_URL;
              return (
                <button
                  key={c.id || idx}
                  type="button"
                  onClick={() => setActiveCardIndex(idx)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? isCta
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-red-600 text-white border-red-500 shadow-md ring-2 ring-red-500/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{idx === 0 ? 'Capa' : isCta ? 'Siga NG (Final)' : `Card ${idx + 1}`}</span>
                  <span className="text-[10px] opacity-75">
                    ({isCta ? 'CTA' : c.mediaType === 'video' ? 'Vídeo' : c.mode === 'full_image' ? 'Imagem' : 'Template'})
                  </span>
                </button>
              );
            })}

            {!cards.some(c => c.isCtaCard || c.imageUrl === DEFAULT_CTA_IMAGE_URL) && (
              <button
                type="button"
                onClick={handleAddCtaCard}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-400 border border-dashed border-amber-600/60 hover:border-amber-400 transition-all shrink-0"
                title="Adicionar o card final padrão (Siga @portalngbrasil)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Slide Final (Siga NG)</span>
              </button>
            )}
          </div>

          {/* Reordenar / Excluir Card Selecionado */}
          {cards.length > 1 && (
            <div className="flex items-center gap-2 pt-1 text-slate-400">
              <span className="text-[11px] text-slate-400">Card {safeActiveIndex + 1}:</span>
              <button
                type="button"
                onClick={() => handleMoveCard(safeActiveIndex, -1)}
                disabled={safeActiveIndex === 0}
                title="Mover card para a esquerda"
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-[11px] font-bold"
              >
                ← Mover
              </button>
              <button
                type="button"
                onClick={() => handleMoveCard(safeActiveIndex, 1)}
                disabled={safeActiveIndex === cards.length - 1}
                title="Mover card para a direita"
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-[11px] font-bold"
              >
                Mover →
              </button>
              <button
                type="button"
                onClick={() => handleRemoveCard(safeActiveIndex)}
                title="Excluir este card"
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-red-950/80 border border-slate-800 hover:border-red-800/80 text-red-400 text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </div>
          )}

          {/* Botões de Download Integrados ao Quadro Preto do Canva */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 pt-3 border-t border-slate-800/80 w-full max-w-[440px]">
            <button
              type="button"
              onClick={handleDownloadCurrent}
              className="flex-1 min-w-[140px] bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-md group"
            >
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              <span>
                {cards.length > 1
                  ? `Baixar Card ${safeActiveIndex + 1} (${activeCard?.mediaType === 'video' ? 'MP4' : 'PNG'})`
                  : `Baixar Arte (${activeCard?.mediaType === 'video' ? 'MP4' : 'PNG'})`}
              </span>
            </button>

            {cards.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="flex-1 min-w-[140px] bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-md shadow-red-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Todos ({cards.length} Cards)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Right / Bottom Column: Controls & Actions */}
      <div className={`w-full ${inline ? '' : 'md:w-1/2'} p-4 sm:p-6 flex flex-col justify-between space-y-4 sm:space-y-6 ${inline ? '' : 'max-h-[85vh] overflow-y-auto'}`}>
        {onClose && (
          <div className="flex justify-end pb-2">
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1">✕ Fechar</button>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          
          {/* Seção das Redes Sociais: 5 Pré-visualizações Lado a Lado (Instagram, Facebook, Threads, LinkedIn, X) */}
          <div className="space-y-3 pt-1">
            {/* Header da Seção de Redes Sociais */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Prévia das Redes Sociais (Lado a Lado)
                </h3>
                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  5 Plataformas
                </span>
              </div>

              {/* Botões rápidos de salto / atalho para cada card no scroll */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="hidden sm:flex items-center gap-1 mr-2 text-[11px] text-slate-500 font-medium">
                  <span>Ir para:</span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('preview-card-instagram')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                    className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 hover:bg-pink-100 font-bold transition-colors"
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('preview-card-facebook')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                    className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-colors"
                  >
                    Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('preview-card-threads')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                    className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-bold transition-colors"
                  >
                    Threads
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('preview-card-linkedin')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                    className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 hover:bg-sky-100 font-bold transition-colors"
                  >
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('preview-card-x')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                    className="px-1.5 py-0.5 rounded bg-zinc-900 text-white hover:bg-black font-bold transition-colors"
                  >
                    X
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerateAllCaptions}
                  title="Atualizar textos de todas as 5 redes com os dados da matéria"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold transition-colors bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Atualizar Todas</span>
                </button>
              </div>
            </div>

            {/* Container Lado a Lado com Scroll Horizontal Suave */}
            <div className="flex flex-row items-start gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
              
              {/* 1. INSTAGRAM */}
              <div id="preview-card-instagram" className="w-[285px] sm:w-[325px] shrink-0 snap-start flex flex-col space-y-2">
                {/* Header do Card Instagram */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-pink-50/70 rounded-lg border border-pink-200">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-pink-600" />
                    <span className="text-xs font-bold text-pink-900">Instagram (Card)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateCaption}
                      title="Regerar resumo do Instagram"
                      className="p-1 hover:bg-pink-100 rounded text-pink-700 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPlatformCaption('instagram')}
                      title="Copiar legenda do Instagram"
                      className="p-1 hover:bg-pink-100 rounded text-pink-700 transition-colors"
                    >
                      {copiedPlatform === 'instagram' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEditing('instagram')}
                      title={editingPlatforms.instagram ? "Ver prévia no feed" : "Editar texto"}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        editingPlatforms.instagram ? 'bg-pink-700 text-white' : 'bg-white text-pink-800 border border-pink-200 hover:bg-pink-50'
                      }`}
                    >
                      {editingPlatforms.instagram ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      <span>{editingPlatforms.instagram ? 'Prévia' : 'Editar'}</span>
                    </button>
                  </div>
                </div>

                {editingPlatforms.instagram ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                    <div className="text-[11px] text-slate-500 font-medium">
                      Legenda formatada para o feed do Instagram:
                    </div>
                    <textarea
                      value={captionText}
                      onChange={(e) => {
                        setCaptionText(e.target.value);
                        setIsCaptionCustomized(true);
                      }}
                      rows={9}
                      placeholder="Legenda do Instagram..."
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEditing('instagram')}
                      className="w-full py-1.5 bg-pink-700 hover:bg-pink-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3 h-3" /> Concluir e ver no feed
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-slate-900 font-sans flex flex-col justify-between">
                    <div>
                      {/* Top Bar Instagram */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                            <div className="w-full h-full rounded-full bg-white p-[1px] overflow-hidden">
                              <img src="/favicon.png" alt="Portal NG" className="w-full h-full object-cover rounded-full" />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 leading-none">
                              <span className="text-[11px] font-bold text-slate-900">portalngbrasil</span>
                              <span className="text-[9px] text-slate-400">•</span>
                              <span className="text-[10px] font-bold text-blue-500">Seguir</span>
                            </div>
                            <span className="text-[9px] text-slate-500 leading-tight">Portal NG Brasil</span>
                          </div>
                        </div>
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Mídia do Card com o Design Oficial do Canva */}
                      {renderCanvaArtPreview("aspect-[4/5] max-h-[260px]")}

                      {/* Ações e Legenda Instagram */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-3 text-slate-800">
                            <Heart className="w-4 h-4 hover:text-red-500 cursor-pointer" />
                            <MessageCircle className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                            <Send className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                          </div>
                          <Bookmark className="w-4 h-4 text-slate-800" />
                        </div>

                        <div className="text-[10px] font-semibold text-slate-900 mb-1">
                          Curtido por <span className="font-bold">portalngbrasil</span> e outras pessoas
                        </div>

                        <div className="text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap line-clamp-4">
                          <span className="font-bold text-slate-900 mr-1">portalngbrasil</span>
                          <span>{captionText || 'Resumo da notícia aparecerá aqui...'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 uppercase">HÁ 2 MINUTOS</span>
                      <button
                        type="button"
                        onClick={() => toggleEditing('instagram')}
                        className="text-pink-700 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. FACEBOOK */}
              <div id="preview-card-facebook" className="w-[285px] sm:w-[325px] shrink-0 snap-start flex flex-col space-y-2">
                {/* Header do Card Facebook */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/70 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">Facebook (Link da Matéria)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateFbCaption}
                      title="Regerar chamada do Facebook"
                      className="p-1 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPlatformCaption('facebook')}
                      title="Copiar texto do Facebook"
                      className="p-1 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                    >
                      {copiedPlatform === 'facebook' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEditing('facebook')}
                      title={editingPlatforms.facebook ? "Ver prévia no feed" : "Editar texto"}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        editingPlatforms.facebook ? 'bg-blue-700 text-white' : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {editingPlatforms.facebook ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      <span>{editingPlatforms.facebook ? 'Prévia' : 'Editar'}</span>
                    </button>
                  </div>
                </div>

                {editingPlatforms.facebook ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                    <div className="text-[11px] text-slate-500 font-medium">
                      Chamada curta que acompanha o link no Facebook:
                    </div>
                    <textarea
                      value={captionFacebook}
                      onChange={(e) => {
                        setCaptionFacebook(e.target.value);
                        setIsFbCaptionCustomized(true);
                      }}
                      rows={9}
                      placeholder="Chamada do Facebook..."
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEditing('facebook')}
                      className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3 h-3" /> Concluir e ver no feed
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-slate-900 font-sans flex flex-col justify-between">
                    <div>
                      {/* Top Bar Facebook */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border border-slate-200 p-[1px] bg-white overflow-hidden shrink-0">
                            <img src="/favicon.png" alt="Portal NG Brasil" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 leading-none">
                              <span className="text-xs font-bold text-slate-900">Portal NG Brasil</span>
                              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-600 text-white text-[7px] font-bold">✓</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                              <span>Agora</span>
                              <span>•</span>
                              <Globe className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        </div>
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Texto da Chamada */}
                      <div className="px-3 py-2 text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {captionFacebook || article?.subtitle || article?.title}
                      </div>

                      {/* Card de Link (Open Graph) */}
                      <div className="border-t border-b border-slate-200 bg-slate-50">
                        <div className="relative aspect-[1.91/1] w-full bg-slate-900 overflow-hidden">
                          {article?.image ? (
                            <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              Foto da matéria
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-slate-100/90 border-t border-slate-200">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                            PORTALNGBRASIL.COM.BR
                          </span>
                          <h4 className="text-[11px] font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5">
                            {article?.title || firstCardTitle}
                          </h4>
                          <p className="text-[9px] text-slate-600 line-clamp-1 mt-0.5">
                            {article?.subtitle || article?.excerpt}
                          </p>
                        </div>
                      </div>

                      {/* Barra de Ações Facebook */}
                      <div className="px-2 py-1.5 flex items-center justify-between border-b border-slate-100 text-slate-600 text-[10px] font-semibold">
                        <div className="flex-1 flex items-center justify-center gap-1 py-1 hover:bg-slate-50 rounded">
                          <ThumbsUp className="w-3 h-3" /> <span>Curtir</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-1 py-1 hover:bg-slate-50 rounded">
                          <MessageSquare className="w-3 h-3" /> <span>Comentar</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-1 py-1 hover:bg-slate-50 rounded">
                          <Share2 className="w-3 h-3" /> <span>Compartilhar</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[10px]">
                      <span className="text-blue-700 font-medium flex items-center gap-1">
                        <LinkIcon className="w-2.5 h-2.5" /> Link Clicável
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleEditing('facebook')}
                        className="text-blue-700 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. THREADS */}
              <div id="preview-card-threads" className="w-[285px] sm:w-[325px] shrink-0 snap-start flex flex-col space-y-2">
                {/* Header do Card Threads */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center">
                      <ThreadsIcon className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900">Threads (Card)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateThreadsCaption}
                      title="Regerar texto do Threads"
                      className="p-1 hover:bg-zinc-200 rounded text-zinc-700 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPlatformCaption('threads')}
                      title="Copiar texto do Threads"
                      className="p-1 hover:bg-zinc-200 rounded text-zinc-700 transition-colors"
                    >
                      {copiedPlatform === 'threads' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEditing('threads')}
                      title={editingPlatforms.threads ? "Ver prévia no feed" : "Editar texto"}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        editingPlatforms.threads ? 'bg-black text-white' : 'bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {editingPlatforms.threads ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      <span>{editingPlatforms.threads ? 'Prévia' : 'Editar'}</span>
                    </button>
                  </div>
                </div>

                {editingPlatforms.threads ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Limite da API Threads</span>
                      <span className={captionThreads.length > 500 ? 'text-red-500 font-bold' : ''}>
                        {captionThreads.length} / 500
                      </span>
                    </div>
                    <textarea
                      value={captionThreads}
                      onChange={(e) => {
                        setCaptionThreads(e.target.value);
                        setIsThreadsCaptionCustomized(true);
                      }}
                      rows={9}
                      placeholder="Texto do Threads..."
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEditing('threads')}
                      className="w-full py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3 h-3" /> Concluir e ver no feed
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-slate-900 font-sans p-3 flex flex-col justify-between">
                    <div>
                      {/* Top Bar Threads */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full border border-slate-200 bg-white overflow-hidden p-0.5 shrink-0">
                            <img src="/favicon.png" alt="Portal NG" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 leading-none">
                              <span className="text-[11px] font-bold text-slate-900">portalngbrasil</span>
                              <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-black text-white text-[6px] font-bold">✓</span>
                            </div>
                            <span className="text-[9px] text-slate-400">Agora</span>
                          </div>
                        </div>
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Texto do Post Threads */}
                      <div className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap line-clamp-4 mb-2">
                        {captionThreads || article?.title}
                      </div>

                      {/* Imagem do Threads com Design Canva */}
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 mb-2">
                        {renderCanvaArtPreview("aspect-[4/5] max-h-[250px]")}
                      </div>

                      {/* Ações Threads */}
                      <div className="flex items-center gap-3 text-slate-700 pt-0.5">
                        <Heart className="w-3.5 h-3.5 hover:text-red-500 cursor-pointer" />
                        <MessageCircle className="w-3.5 h-3.5 hover:text-black cursor-pointer" />
                        <Repeat2 className="w-3.5 h-3.5 hover:text-green-600 cursor-pointer" />
                        <Send className="w-3.5 h-3.5 hover:text-black cursor-pointer" />
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">24 curtidas · 4 respostas</span>
                      <button
                        type="button"
                        onClick={() => toggleEditing('threads')}
                        className="text-black font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. LINKEDIN */}
              <div id="preview-card-linkedin" className="w-[285px] sm:w-[325px] shrink-0 snap-start flex flex-col space-y-2">
                {/* Header do Card LinkedIn */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-sky-50/70 rounded-lg border border-sky-200">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0077b5]" />
                    <span className="text-xs font-bold text-sky-950">LinkedIn (Card)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateLinkedinCaption}
                      title="Regerar texto do LinkedIn"
                      className="p-1 hover:bg-sky-100 rounded text-sky-800 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPlatformCaption('linkedin')}
                      title="Copiar texto do LinkedIn"
                      className="p-1 hover:bg-sky-100 rounded text-sky-800 transition-colors"
                    >
                      {copiedPlatform === 'linkedin' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEditing('linkedin')}
                      title={editingPlatforms.linkedin ? "Ver prévia no feed" : "Editar texto"}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        editingPlatforms.linkedin ? 'bg-[#0077b5] text-white' : 'bg-white text-sky-900 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      {editingPlatforms.linkedin ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      <span>{editingPlatforms.linkedin ? 'Prévia' : 'Editar'}</span>
                    </button>
                  </div>
                </div>

                {editingPlatforms.linkedin ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                    <div className="text-[11px] text-slate-500 font-medium">
                      Texto corporativo e analítico para a Company Page:
                    </div>
                    <textarea
                      value={captionLinkedin}
                      onChange={(e) => {
                        setCaptionLinkedin(e.target.value);
                        setIsLinkedinCaptionCustomized(true);
                      }}
                      rows={9}
                      placeholder="Texto do LinkedIn..."
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-[#0077b5] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEditing('linkedin')}
                      className="w-full py-1.5 bg-[#0077b5] hover:bg-sky-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3 h-3" /> Concluir e ver no feed
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-slate-900 font-sans flex flex-col justify-between">
                    <div>
                      {/* Top Bar LinkedIn */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-sm border border-slate-200 bg-white overflow-hidden p-0.5 shrink-0">
                            <img src="/favicon.png" alt="Portal NG Brasil" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 leading-none">
                              <span className="text-xs font-bold text-slate-900">Portal NG Brasil</span>
                              <span className="text-[9px] text-slate-400">• 1º</span>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-tight">12.450 seguidores</p>
                            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                              <span>Agora</span>
                              <span>•</span>
                              <Globe className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        </div>
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Texto Corporativo */}
                      <div className="px-3 py-2 text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {captionLinkedin || captionFacebook || article?.subtitle || article?.title}
                      </div>

                      {/* Card Visual LinkedIn com Design Canva */}
                      <div className="mx-3 mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                        {renderCanvaArtPreview("aspect-[4/5] max-h-[250px]")}
                      </div>

                      {/* Ações LinkedIn */}
                      <div className="px-2 py-1.5 flex items-center justify-between border-t border-slate-100 text-slate-600 text-[10px] font-semibold">
                        <div className="flex-1 flex items-center justify-center gap-1 py-1 hover:bg-slate-50 rounded">
                          <ThumbsUp className="w-3 h-3" /> <span>Gostei</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-1 py-1 hover:bg-slate-50 rounded">
                          <MessageSquare className="w-3 h-3" /> <span>Comentar</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-1 py-1 hover:bg-slate-50 rounded">
                          <Share2 className="w-3 h-3" /> <span>Compartilhar</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-[#0077b5] font-medium flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5" /> Company Page
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleEditing('linkedin')}
                        className="text-[#0077b5] font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. X (TWITTER) */}
              <div id="preview-card-x" className="w-[285px] sm:w-[325px] shrink-0 snap-start flex flex-col space-y-2">
                {/* Header do Card X */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 rounded-lg text-white">
                  <div className="flex items-center gap-1.5">
                    <XIcon className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">X / Twitter (Card)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRegenerateXCaption}
                      title="Regerar tweet"
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-300 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPlatformCaption('x')}
                      title="Copiar tweet"
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-300 transition-colors"
                    >
                      {copiedPlatform === 'x' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEditing('x')}
                      title={editingPlatforms.x ? "Ver prévia no feed" : "Editar tweet"}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        editingPlatforms.x ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      {editingPlatforms.x ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      <span>{editingPlatforms.x ? 'Prévia' : 'Editar'}</span>
                    </button>
                  </div>
                </div>

                {editingPlatforms.x ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Limite de 280 caracteres</span>
                      <span className={calculateXTweetLength(captionX) > 280 ? 'text-red-500 font-bold' : ''}>
                        {calculateXTweetLength(captionX)} / 280
                      </span>
                    </div>
                    <textarea
                      value={captionX}
                      onChange={(e) => {
                        setCaptionX(e.target.value);
                        setIsXCaptionCustomized(true);
                      }}
                      rows={9}
                      placeholder="Tweet para o X..."
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEditing('x')}
                      className="w-full py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3 h-3" /> Concluir e ver no feed
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-slate-900 font-sans p-3 flex flex-col justify-between">
                    <div>
                      {/* Top Bar X */}
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full border border-slate-200 bg-white overflow-hidden shrink-0">
                          <img src="/favicon.png" alt="Portal NG" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-900">Portal NG Brasil</span>
                              <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-blue-500 text-white text-[6px] font-bold">✓</span>
                              <span className="text-[10px] text-slate-500">@portalngbrasil</span>
                              <span className="text-[10px] text-slate-400">· 1m</span>
                            </div>
                            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                          </div>

                          {/* Texto do Tweet */}
                          <div className="mt-1 text-[11px] text-slate-900 leading-normal whitespace-pre-wrap line-clamp-3">
                            {captionX || article?.title}
                          </div>
                        </div>
                      </div>

                      {/* Imagem do Tweet no X com Design Canva */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 mt-1 mb-2">
                        {renderCanvaArtPreview("aspect-[4/5] max-h-[250px]")}
                      </div>

                      {/* Ações X */}
                      <div className="flex items-center justify-between text-slate-500 text-[10px] px-1">
                        <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 8</div>
                        <div className="flex items-center gap-1"><Repeat2 className="w-3 h-3" /> 14</div>
                        <div className="flex items-center gap-1"><Heart className="w-3 h-3" /> 42</div>
                        <div className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> 1.8K</div>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-mono">
                        {calculateXTweetLength(captionX)} / 280
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleEditing('x')}
                        className="text-slate-900 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>



        {/* Action Buttons (Modal Standalone) */}
        {!hideButtons && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handlePostToMeta(['facebook', 'instagram', 'threads', 'linkedin', 'x'])}
              disabled={isPosting}
              className={`w-full ${isPosting ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 hover:opacity-95'} text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all text-sm`}
              title="Postar em todas as redes sociais configuradas (Facebook, Instagram, Threads, LinkedIn e X)"
            >
              {isPosting ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> {postStatus}</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {cards.length > 1
                    ? `Postar Carrossel (${cards.length} Cards) nas Redes Sociais`
                    : 'Postar Matéria nas Redes Sociais'}
                </>
              )}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cards.length > 1 ? handleDownloadAll : handleDownloadCurrent}
                className="flex-1 bg-[#d40a38] hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
              >
                <Download className="w-3 h-3" />
                {cards.length > 1 ? `Baixar Todos (${cards.length})` : 'Baixar Mídia'}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {content}
    </div>
  );
});

export default SocialPostGenerator;
