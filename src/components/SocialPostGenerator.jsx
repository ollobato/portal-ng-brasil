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
  Video
} from 'lucide-react';
import { formatInstagramCaption, formatFacebookCaption, shareToWhatsApp, copyToClipboard } from '../utils/socialExporter';
import { uploadImageForSocial, uploadVideoForSocial } from '../utils/imageUploader';
import { safeLoadImageForCanvas } from '../utils/imageLoader';
import { publishToFacebookPage, resolveFacebookPageToken, FALLBACK_META_SETTINGS } from '../utils/metaPublisher';

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

const SocialPostGenerator = forwardRef(({ showToast, article, onClose, inline = false, metaToken, metaFbPageId, metaIgAccountId, imgbbKey, hideButtons = false, onPostSuccess }, ref) => {
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

  const safeActiveIndex = Math.min(activeCardIndex, Math.max(0, cards.length - 1));
  const activeCard = cards[safeActiveIndex] || cards[0];

  // Sincroniza o Card 1 com os dados da matéria quando ela é alterada no formulário
  useEffect(() => {
    if (!article) return;

    const isDifferentArticle = article.id && article.id !== lastArticleIdRef.current;
    lastArticleIdRef.current = article.id;

    setCategory(article.categoryLabel || article.category || 'NOTÍCIAS');

    if (isDifferentArticle) {
      setCards(createDefaultCards(article));
      setActiveCardIndex(0);
      setIsCaptionCustomized(false);
    } else {
      setCards(prev => {
        if (!prev.length) return createDefaultCards(article);
        const first = prev[0];
        const updatedFirst = {
          ...first,
          title: first.customTitle ? first.title : (formatText(article.title) || first.title),
          subtitle: first.customSubtitle ? first.subtitle : (formatText(article.subtitle) || first.subtitle),
          imageUrl: first.customImage ? first.imageUrl : getInitialImage(article)
        };
        return [updatedFirst, ...prev.slice(1)];
      });
    }
  }, [article]);

  // Atualiza a legenda padrão com base no Card 1 e no texto da matéria do portal
  const firstCardTitle = cards[0]?.title || '';
  const firstCardSubtitle = cards[0]?.subtitle || '';
  useEffect(() => {
    if (isCaptionCustomized) return;

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
  }, [firstCardTitle, firstCardSubtitle, category, article?.content, article?.title, article?.subtitle, article?.praca, article?.id, isCaptionCustomized]);

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
      showToast('Legenda atualizada com o resumo do portal!', false);
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

    const width = 1080;
    const height = ratio === '1:1' ? 1080 : ratio === '9:16' ? 1920 : 1440;
    targetCanvas.width = width;
    targetCanvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!transparentVideoTop) {
      ctx.fillStyle = '#040f1d';
      ctx.fillRect(0, 0, width, height);
    }

    // MODO 1: APENAS IMAGEM/VÍDEO INTEIRO
    if (cardData.mode === 'full_image') {
      if (cardData.mediaType === 'video') {
        if (cardData.showLogoOnFullImage) {
          const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
          if (logo) {
            ctx.drawImage(logo, width - 260, 45, 210, 210 * (logo.height / logo.width));
          }
        }
        return;
      }

      const img = await safeLoadImageForCanvas(cardData.imageUrl);
      if (img) {
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
        const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
        if (logo) {
          ctx.drawImage(logo, width - 260, 45, 210, 210 * (logo.height / logo.width));
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
      const [img1, img2] = await Promise.all([
        safeLoadImageForCanvas(cardData.imageUrl),
        cardData.useTwoPhotos ? safeLoadImageForCanvas(cardData.secondImageUrl) : Promise.resolve(null)
      ]);

      if (!cardData.useTwoPhotos || !img2) {
        if (img1) {
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
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, width, targetHeight);
        }
      } else {
        const halfWidth = width / 2;

        if (img1) {
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

        if (img2) {
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

    const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
    finalizeTemplateDraw(ctx, width, height, logo, cardData.title || '', cardData.subtitle || '');
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

    // Logo no topo direito
    if (logo) {
      ctx.drawImage(logo, width - 260, 45, 210, 210 * (logo.height / logo.width));
    }

    // Cálculo das linhas do Título
    ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
    const titleWords = (cardTitle || '').toUpperCase().split(' ').filter(Boolean);
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
    if (currentLine.trim()) titleLines.push(currentLine.trim());

    // Cálculo das linhas do Subtítulo
    ctx.font = '400 36px "Barlow Condensed", sans-serif';
    const subWords = (cardSubtitle || '').split(' ').filter(Boolean);
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
    if (currentLine.trim()) subLines.push(currentLine.trim());

    const titleLineHeight = 75;
    const subLineHeight = 46;
    const titleSpacing = subLines.length > 0 ? 15 : 0;
    const totalTextHeight = (titleLines.length * titleLineHeight) + titleSpacing + (subLines.length * subLineHeight);

    const bottomLimit = height - 120;
    const topLimit = cardY + 30;
    const availableHeight = bottomLimit - topLimit;

    const startY = topLimit + (availableHeight - totalTextHeight) / 2;

    // Desenha Título
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

    // Desenha Subtítulo
    ctx.font = '400 36px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';

    let subY = textY + titleSpacing;
    subLines.forEach(l => {
      ctx.fillText(l, width / 2, subY);
      subY += subLineHeight;
    });

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
    const timer = setTimeout(() => {
      if (canvasRef.current && activeCard) {
        const isVideoOverlay = activeCard.mediaType === 'video' && Boolean(activeCard.videoUrl);
        drawCardOnCanvas(canvasRef.current, activeCard, aspectRatio, isVideoOverlay);
      }
    }, 80);
    return () => clearTimeout(timer);
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

  const handleCopyCaption = async () => {
    const success = await copyToClipboard(captionText);
    if (success) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    shareToWhatsApp(article || { title: firstCardTitle, subtitle: firstCardSubtitle, category, praca: article?.praca, id: article?.id });
  };

  useImperativeHandle(ref, () => ({
    postToMeta: async (platforms = ['facebook', 'instagram']) => {
      return await handlePostToMeta(platforms);
    }
  }));

  const handlePostToMeta = async (platforms = ['facebook', 'instagram']) => {
    const effectiveToken = (metaToken || FALLBACK_META_SETTINGS.metaToken || '').trim();
    const effectiveFbPageId = (metaFbPageId || FALLBACK_META_SETTINGS.metaFbPageId || '').trim();
    const effectiveIgAccountId = (metaIgAccountId || FALLBACK_META_SETTINGS.metaIgAccountId || '').trim();
    const effectiveImgbbKey = (imgbbKey || FALLBACK_META_SETTINGS.imgbbKey || '').trim();

    if (!effectiveToken) {
      const msg = "Configure o Token de Acesso do Meta nas Configurações.";
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

      // 2. Postar no Facebook
      if (effectiveFbPageId && platforms.includes('facebook')) {
        setPostStatus(isCarousel ? `Postando ${cards.length} itens na Página do Facebook...` : 'Postando na Página do Facebook...');
        try {
          const shareUrl = article?.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br';
          const fbMessage = captionText && !captionText.includes('Link na bio')
            ? captionText
            : formatFacebookCaption({ title: firstCardTitle, subtitle: firstCardSubtitle, categoryLabel: category, id: article?.id }, shareUrl);

          if (mediaItems.length === 1 && mediaItems[0].type === 'video') {
            // Post de vídeo único no Facebook Page
            const { pageToken } = await resolveFacebookPageToken(effectiveToken, effectiveFbPageId);
            const fbVidRes = await fetch(`https://graph.facebook.com/v20.0/${effectiveFbPageId}/videos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_url: mediaItems[0].url,
                description: fbMessage,
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
            const fbRes = await publishToFacebookPage({
              pageId: effectiveFbPageId,
              token: effectiveToken,
              blob: imageBlobs[0] || null,
              publicImageUrl: imageUrls[0] || null,
              blobs: imageBlobs,
              publicImageUrls: imageUrls,
              message: fbMessage,
              linkUrl: shareUrl
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

      if (fbError && igError) {
        showToast ? showToast(`FB: ${fbError} | IG: ${igError}`, true) : null;
      } else if (fbError) {
        showToast ? showToast(`Falha no Facebook: ${fbError}`, true) : null;
      } else if (igError) {
        showToast ? showToast(`Falhou no Instagram: ${igError}`, true) : null;
      } else {
        showToast
          ? showToast(isCarousel ? `Carrossel (${cards.length} cards) publicado com sucesso!` : "Publicado com sucesso nas redes sociais!")
          : alert("Publicado com sucesso!");
      }

      const postResult = {
        success: !fbError && !igError,
        facebook: fbPostUrl || (effectiveFbPageId ? `https://www.facebook.com/${effectiveFbPageId}` : 'https://www.facebook.com/portalngbrasil'),
        instagram: igPostUrl || 'https://www.instagram.com/portalngbrasil/',
        fbError,
        igError
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

  const content = (
    <div className={`bg-white shadow-sm overflow-hidden flex flex-col ${inline ? 'rounded-xl border border-slate-200 h-full' : 'md:flex-row rounded-2xl max-w-5xl w-full my-8 border border-slate-200'}`}>
      
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
      <div className={`w-full ${inline ? '' : 'md:w-1/2'} bg-slate-950 p-6 flex flex-col items-center justify-center relative ${inline ? 'border-b' : 'border-r'} border-slate-800`}>
        
        {/* Top Header Pill */}
        <div className="flex items-center gap-2 mb-4 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800">
          <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">Pré-visualização da Arte</span>
          {cards.length > 1 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30 rounded-full">
              Carrossel {safeActiveIndex + 1}/{cards.length}
            </span>
          )}
          <button
            type="button"
            onClick={handleForceImageRefresh}
            title="Forçar recarregamento da mídia"
            className="ml-1 bg-slate-800 hover:bg-slate-700 p-1 rounded-full text-slate-300 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Row: Prev Arrow + Card Preview + Next Arrow + Botão "+" ao lado */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
          
          {/* Seta Anterior (se houver mais de 1 card) */}
          {cards.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveCardIndex(prev => Math.max(0, prev - 1))}
              disabled={safeActiveIndex === 0}
              title="Card anterior"
              className={`p-2.5 rounded-full border transition-all shrink-0 ${
                safeActiveIndex === 0
                  ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white shadow-lg'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Card Preview Box */}
          <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center group">
            
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

            {/* Badge superior indicando o card atual e ações rápidas */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
              <span className="bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-700/80 shadow flex items-center gap-1">
                {activeCard?.mediaType === 'video' && <Video className="w-3 h-3 text-red-400" />}
                <span>Card {safeActiveIndex + 1} de {cards.length}</span>
              </span>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => directUploadInputRef.current?.click()}
                  title="Fazer upload de foto ou vídeo para este card"
                  className="bg-slate-950/80 hover:bg-red-600 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-700/80 transition-colors flex items-center gap-1 shadow"
                >
                  <Upload className="w-3 h-3" />
                  <span>{hasMediaInActiveCard ? 'Trocar Mídia' : 'Subir Foto/Vídeo'}</span>
                </button>

                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(safeActiveIndex)}
                    title="Remover este card do carrossel"
                    className="bg-red-600/90 hover:bg-red-700 text-white p-1.5 rounded-full shadow transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
                <div className="w-11 h-11 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">
                  Clique ou solte Foto ou Vídeo no Card {safeActiveIndex + 1}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Suporta imagens (JPG/PNG) e vídeos (MP4/MOV)
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
              className={`p-2.5 rounded-full border transition-all shrink-0 ${
                safeActiveIndex === cards.length - 1
                  ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white shadow-lg'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Botão "+" ao lado do card para adicionar mais cards / subir fotos ou vídeos */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleAddCard('', 'full_image')}
              title="Adicionar novo card ao lado (Carrossel)"
              className="group flex flex-col items-center justify-center w-16 sm:w-20 h-28 sm:h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-red-500 bg-slate-900/70 hover:bg-slate-900 text-slate-300 hover:text-white transition-all shadow-lg hover:shadow-red-950/30"
            >
              <div className="w-10 h-10 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform mb-2">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold leading-tight text-center px-1">
                Novo Card
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5">
                Carrossel
              </span>
            </button>

            <button
              type="button"
              onClick={() => multiUploadInputRef.current?.click()}
              title="Fazer upload de fotos ou vídeos direto para o carrossel"
              className="flex flex-col items-center justify-center w-16 sm:w-20 py-2.5 px-2 rounded-xl border border-slate-800 hover:border-slate-600 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-center"
            >
              <Upload className="w-4 h-4 text-red-400 mb-1" />
              <span className="text-[10px] font-bold leading-tight">
                Subir Foto/Vídeo
              </span>
            </button>
          </div>
        </div>

        {/* Barra de Miniaturas / Navegação dos Slides do Carrossel */}
        <div className="flex items-center gap-2 mt-4 max-w-full overflow-x-auto py-1 px-2">
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
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                      : 'bg-red-600 text-white border-red-500 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <span>{idx === 0 ? 'Capa' : isCta ? 'Siga NG (Final)' : `Card ${idx + 1}`}</span>
                <span className="text-[10px] opacity-75">
                  ({isCta ? 'CTA' : c.mediaType === 'video' ? '🎬 Vídeo' : c.mode === 'full_image' ? 'Imagem' : 'Template'})
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleAddCard('', 'full_image')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-red-400 border border-dashed border-slate-700 hover:border-red-500 transition-all shrink-0"
            title="Adicionar mais um card"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>

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

        {/* Aspect Ratio Selector */}
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          <button
            type="button"
            onClick={() => setAspectRatio('1:1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '1:1' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Feed 1:1
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('4:5')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '4:5' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Portrait 4:5
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('9:16')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '9:16' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Stories/Reels 9:16
          </button>
        </div>
      </div>

      {/* Right / Bottom Column: Controls & Actions */}
      <div className={`w-full ${inline ? '' : 'md:w-1/2'} p-6 flex flex-col justify-between space-y-6 ${inline ? '' : 'max-h-[85vh] overflow-y-auto'}`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Estúdio Criativo (Artes & Carrossel)</span>
              {cards.length > 1 && (
                <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full font-extrabold">
                  {cards.length} Cards
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Personalize cada card individualmente ou envie fotos e vídeos para carrossel
            </p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1">✕</button>
          )}
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          
          {/* Barra de controle do Card Ativo */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold">
                Editando: {activeCard?.isCtaCard || activeCard?.imageUrl === DEFAULT_CTA_IMAGE_URL
                  ? `Card ${safeActiveIndex + 1} de ${cards.length} (📢 Slide Final: Siga NG)`
                  : `Card ${safeActiveIndex + 1} de ${cards.length} ${safeActiveIndex === 0 ? '(Capa)' : ''}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {cards.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleMoveCard(safeActiveIndex, -1)}
                    disabled={safeActiveIndex === 0}
                    title="Mover card para trás"
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold"
                  >
                    ← Mover
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCard(safeActiveIndex, 1)}
                    disabled={safeActiveIndex === cards.length - 1}
                    title="Mover card para frente"
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold"
                  >
                    Mover →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(safeActiveIndex)}
                    title="Excluir este card"
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir Card
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleAddCard('', 'full_image')}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> + Card
              </button>
            </div>
          </div>

          {/* Seletor de Estilo do Card: Mídia Inteira vs Template NG com Texto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => updateActiveCard({ mode: 'template' })}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeCard?.mode === 'template'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span>Template NG (Mídia + Texto)</span>
            </button>

            <button
              type="button"
              onClick={() => updateActiveCard({ mode: 'full_image' })}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeCard?.mode === 'full_image'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {activeCard?.mediaType === 'video' ? (
                <Video className="w-4 h-4 text-indigo-600" />
              ) : (
                <ImageIcon className="w-4 h-4 text-indigo-600" />
              )}
              <span>Apenas Foto/Vídeo Inteiro</span>
            </button>
          </div>

          {/* Upload da Mídia (Foto ou Vídeo) deste Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>{activeCard?.mediaType === 'video' ? '🎬 Vídeo' : '📸 Foto / Vídeo'} do Card {safeActiveIndex + 1}</span>
              </label>
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
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  Restaurar foto da matéria
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
                  className="text-[11px] font-bold text-amber-600 hover:underline"
                >
                  Restaurar imagem padrão Siga NG
                </button>
              )}
            </div>

            <div
              className="w-full h-20 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-lg flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors relative"
              onPaste={(e) => {
                const items = e.clipboardData?.items || [];
                const pastedFiles = [];
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
                    const f = items[i].getAsFile();
                    if (f) pastedFiles.push(f);
                  }
                }
                if (pastedFiles.length) {
                  handleFilesToCarousel(pastedFiles, 'replace_active');
                  e.preventDefault();
                }
              }}
            >
              <div className="text-center text-slate-500 pointer-events-none flex flex-col items-center px-2">
                <Upload className="w-4 h-4 mb-1 text-red-500" />
                <span className="text-xs font-bold text-slate-700">
                  Clique para enviar Foto(s) ou Vídeo(s) (MP4/MOV) ou cole com Ctrl+V
                </span>
                <span className="text-[10px] text-slate-400">
                  Selecione vários arquivos de uma vez para criar múltiplos slides no carrossel
                </span>
              </div>
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime,video/webm,video/*"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFilesToCarousel(e.target.files, 'replace_active');
                    e.target.value = '';
                  }
                }}
              />
            </div>

            <input
              type="text"
              placeholder="Ou cole o link (URL) de uma imagem ou vídeo (.mp4)..."
              value={
                activeCard?.mediaType === 'video'
                  ? activeCard.videoUrl && activeCard.videoUrl.startsWith('http')
                    ? activeCard.videoUrl
                    : ''
                  : activeCard?.imageUrl && activeCard.imageUrl.startsWith('http')
                    ? activeCard.imageUrl
                    : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (isVideoFileOrUrl(val)) {
                  updateActiveCard({ mediaType: 'video', videoUrl: val, videoFile: null, customImage: true });
                } else {
                  updateActiveCard({ mediaType: 'image', imageUrl: val, videoUrl: '', videoFile: null, customImage: true });
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />

            {/* Opções extras quando em modo Foto/Vídeo Inteiro */}
            {activeCard?.mode === 'full_image' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">Ajuste:</span>
                  <button
                    type="button"
                    onClick={() => updateActiveCard({ objectFit: 'cover' })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                      activeCard.objectFit !== 'contain'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Preencher tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveCard({ objectFit: 'contain' })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                      activeCard.objectFit === 'contain'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Inteiro (sem corte)
                  </button>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activeCard.showLogoOnFullImage)}
                    onChange={(e) => updateActiveCard({ showLogoOnFullImage: e.target.checked })}
                    className="w-3.5 h-3.5 text-red-600 rounded border-slate-300"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Aplicar Logo NG no topo</span>
                </label>
              </div>
            )}
          </div>

          {/* Controles exclusivos do modo Template NG (Foto Dupla, Título e Subtítulo) */}
          {activeCard?.mode === 'template' && (
            <>
              {activeCard?.mediaType !== 'video' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(activeCard.useTwoPhotos)}
                      onChange={(e) => updateActiveCard({ useTwoPhotos: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Usar duas fotos lado a lado neste card (Tela Dividida)
                    </span>
                  </label>

                  {activeCard.useTwoPhotos && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        📸 Segunda Imagem (Metade Direita)
                      </label>
                      <div
                        className="w-full h-14 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors relative"
                        onPaste={(e) => {
                          const items = e.clipboardData?.items || [];
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                              const blob = items[i].getAsFile();
                              const reader = new FileReader();
                              reader.onloadend = () => updateActiveCard({ secondImageUrl: reader.result });
                              reader.readAsDataURL(blob);
                              e.preventDefault();
                            }
                          }
                        }}
                      >
                        <div className="text-center text-slate-500 pointer-events-none flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Upload ou Ctrl+V da segunda foto</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => updateActiveCard({ secondImageUrl: reader.result });
                            reader.readAsDataURL(file);
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Ou cole o link da segunda imagem..."
                        value={activeCard.secondImageUrl && activeCard.secondImageUrl.startsWith('http') ? activeCard.secondImageUrl : ''}
                        onChange={(e) => updateActiveCard({ secondImageUrl: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título da Arte (Card {safeActiveIndex + 1})
                </label>
                <textarea
                  value={activeCard.title}
                  onChange={(e) => updateActiveCard({ title: e.target.value, customTitle: true })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo / Linha Fina (Card {safeActiveIndex + 1})
                </label>
                <textarea
                  value={activeCard.subtitle}
                  onChange={(e) => updateActiveCard({ subtitle: e.target.value, customSubtitle: true })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Legenda Geral da Publicação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex justify-between items-center">
              <span>Legenda para Redes Sociais</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateCaption}
                  title="Atualizar legenda gerando resumo automático do texto da matéria"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Atualizar Resumo
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="text-xs text-[#d40a38] flex items-center gap-1 hover:underline"
                >
                  {copiedCaption ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedCaption ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </label>
            <textarea
              value={captionText}
              onChange={(e) => {
                setCaptionText(e.target.value);
                setIsCaptionCustomized(true);
              }}
              rows={8}
              placeholder="A legenda com resumo automático do texto do portal aparecerá aqui..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Botões rápidos de download mesmo quando integrado ao formulário */}
        {hideButtons && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDownloadCurrent}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {cards.length > 1
                ? `Baixar Card ${safeActiveIndex + 1} (${activeCard?.mediaType === 'video' ? 'MP4' : 'PNG'})`
                : `Baixar Arte (${activeCard?.mediaType === 'video' ? 'MP4' : 'PNG'})`}
            </button>
            {cards.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="flex-1 bg-[#d40a38] hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Todos ({cards.length} Cards)
              </button>
            )}
          </div>
        )}

        {/* Action Buttons (Modal Standalone) */}
        {!hideButtons && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handlePostToMeta(['facebook', 'instagram'])}
              disabled={isPosting || (!metaToken || !imgbbKey)}
              className={`w-full ${isPosting ? 'bg-slate-400' : (!metaToken || !imgbbKey) ? 'bg-slate-300' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all text-sm`}
              title={(!metaToken || !imgbbKey) ? "Configure as chaves do Meta e ImgBB nas Configurações primeiro" : "Postar simultaneamente no Facebook e Instagram"}
            >
              {isPosting ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> {postStatus}</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {cards.length > 1
                    ? `Postar Carrossel (${cards.length} Cards) no Instagram e Facebook`
                    : 'Postar no Instagram e Facebook'}
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
    <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {content}
    </div>
  );
});

export default SocialPostGenerator;
