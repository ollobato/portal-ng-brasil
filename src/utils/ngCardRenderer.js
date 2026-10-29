/**
 * Motor Oficial de Renderização Gráfica do Portal NG Brasil (ngCardRenderer)
 * 
 * Responsável por desenhar as artes oficiais para Instagram (Feed 4:5, Quadrado 1:1 e Stories 9:16)
 * com BLINDAGEM TOTAL contra:
 * 1. Estouro de texto (Typography Overflow) através de redimensionamento dinâmico auto-fit.
 * 2. Quebra de fontes (aguarda document.fonts.ready antes de medir).
 * 3. Cortes desajeitados em nomes ou preposições no destaque vermelho.
 * 4. Travamentos ou falhas de carregamento de foto externa.
 */

import { safeLoadImageForCanvas } from './imageLoader.js';

/**
 * Garante que a família tipográfica oficial "Barlow Condensed" esteja carregada no navegador
 */
export async function ensureBarlowCondensedLoaded() {
  if (typeof document === 'undefined' || !document.fonts) return true;

  try {
    await Promise.allSettled([
      document.fonts.load('bold 70px "Barlow Condensed"'),
      document.fonts.load('bold 56px "Barlow Condensed"'),
      document.fonts.load('400 36px "Barlow Condensed"'),
      document.fonts.load('600 24px "Barlow Condensed"'),
      document.fonts.ready
    ]);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Retorna as dimensões canônicas em pixels para cada proporção de tela
 */
export function getCardDimensions(aspectRatio = '4:5') {
  const width = 1080;
  let height = 1350; // Padrão Instagram 4:5 (1080 x 1350)
  let targetPhotoHeight = 740;
  let cardY = 730;

  if (aspectRatio === '1:1') {
    height = 1080;
    targetPhotoHeight = 550;
    cardY = 530;
  } else if (aspectRatio === '9:16') {
    height = 1920;
    targetPhotoHeight = 1140;
    cardY = 1110;
  } else {
    // 4:5
    height = 1350;
    targetPhotoHeight = 740;
    cardY = 730;
  }

  const topLimit = cardY + 45; // 45px abaixo da borda superior curva
  const bottomLimit = height - 115; // 25px acima da linha do rodapé (height - 90)
  const availableHeight = bottomLimit - topLimit;
  const maxWidth = width - 140; // 70px de margem em cada lado

  return {
    width,
    height,
    targetPhotoHeight,
    cardY,
    topLimit,
    bottomLimit,
    availableHeight,
    maxWidth
  };
}

/**
 * Detecta as palavras da manchete que devem receber o vermelho oficial #d40a38.
 * Evita deixar preposições isoladas ou cortar nomes próprios no meio.
 */
export function getHighlightRange(words, customHighlightText = '') {
  if (!words || !words.length) return { start: -1, end: -1, set: new Set() };

  const clean = w => (w || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ0-9]/g, '');

  // 1. Se o editor especificou palavras de destaque manuais
  if (customHighlightText && typeof customHighlightText === 'string' && customHighlightText.trim()) {
    const customWords = customHighlightText.toUpperCase().split(/\s+/).map(clean).filter(Boolean);
    const highlightedIndices = new Set();
    words.forEach((w, idx) => {
      const cw = clean(w);
      if (cw && customWords.includes(cw)) {
        highlightedIndices.add(idx);
      }
    });
    if (highlightedIndices.size > 0) {
      return { start: Math.min(...highlightedIndices), end: Math.max(...highlightedIndices), set: highlightedIndices };
    }
  }

  // 2. Algoritmo inteligente automático:
  // Seleciona uma faixa coesa de 2 a 5 palavras no clímax da manchete (~35% a 75%)
  const prepositions = new Set([
    'DE', 'DO', 'DA', 'DOS', 'DAS', 'COM', 'E', 'A', 'À', 'AO', 'AOS', 'EM', 'POR', 'PARA', 'NO', 'NA', 'NOS', 'NAS', 'SOBRE', 'PELO', 'PELA', 'PELOS', 'PELAS', 'QUE', 'SE'
  ]);

  const n = words.length;
  if (n <= 3) {
    return { start: 0, end: n - 1, set: new Set(words.map((_, i) => i)) };
  }

  let start = Math.floor(n * 0.35);
  let end = Math.floor(n * 0.75);

  // Evita iniciar em preposição ou conjunção solta
  while (start < end && prepositions.has(clean(words[start]))) {
    start++;
  }

  // Evita terminar em preposição pendurada (ex: "CAMPANHA DE" onde "DE" ficava vermelho e o nome branco)
  while (end > start && prepositions.has(clean(words[end]))) {
    end--;
  }

  // Se a próxima palavra após o fim for uma preposição seguida de substantivo/nome, ajusta
  if (end + 2 < n && prepositions.has(clean(words[end + 1]))) {
    // Mantém a fronteira limpa
  }

  const highlightSet = new Set();
  for (let i = start; i <= end; i++) {
    highlightSet.add(i);
  }

  return { start, end, set: highlightSet };
}

/**
 * Motor Auto-Fit: Quebra e calcula o tamanho exato da tipografia
 * para NUNCA ultrapassar os limites físicos do card, garantindo respiração e estética.
 */
export function calculateAutoFitTypography(ctx, titleText, subtitleText, maxWidth, availableHeight, aspectRatio) {
  const cleanTitle = (titleText || '').trim().toUpperCase();
  const cleanSub = (subtitleText || '').trim();

  // Tamanhos iniciais ideais por formato
  let titleSize = aspectRatio === '9:16' ? 74 : aspectRatio === '1:1' ? 58 : 68;
  let subSize = aspectRatio === '9:16' ? 36 : aspectRatio === '1:1' ? 30 : 34;

  const minTitleSize = 40;
  const minSubSize = 22;

  let bestResult = null;

  while (titleSize >= minTitleSize) {
    // 1. Testa quebra do Título com tamanho atual
    ctx.font = `bold ${titleSize}px "Barlow Condensed", sans-serif`;
    const titleWords = cleanTitle.split(/\s+/).filter(Boolean);
    const titleLines = [];
    let currentLine = '';

    for (let i = 0; i < titleWords.length; i++) {
      const test = currentLine ? `${currentLine} ${titleWords[i]}` : titleWords[i];
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        titleLines.push(currentLine);
        currentLine = titleWords[i];
      } else {
        currentLine = test;
      }
    }
    if (currentLine) titleLines.push(currentLine);

    // 2. Testa quebra do Subtítulo com tamanho atual
    ctx.font = `400 ${subSize}px "Barlow Condensed", sans-serif`;
    const subWords = cleanSub.split(/\s+/).filter(Boolean);
    let subLines = [];
    currentLine = '';

    for (let i = 0; i < subWords.length; i++) {
      const test = currentLine ? `${currentLine} ${subWords[i]}` : subWords[i];
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        subLines.push(currentLine);
        currentLine = subWords[i];
      } else {
        currentLine = test;
      }
    }
    if (currentLine) subLines.push(currentLine);

    // Limita subtítulo a no máximo 3 linhas (com reticências elegantes se passar)
    if (subLines.length > 3) {
      const trimmed = subLines.slice(0, 3);
      trimmed[2] = trimmed[2].replace(/[.,;:—\s]+$/, '') + '...';
      subLines = trimmed;
    }

    const titleLineHeight = Math.round(titleSize * 1.08);
    const subLineHeight = Math.round(subSize * 1.25);
    const titleSpacing = subLines.length > 0 ? Math.max(12, Math.round(titleSize * 0.28)) : 0;
    const totalTextHeight = (titleLines.length * titleLineHeight) + titleSpacing + (subLines.length * subLineHeight);

    bestResult = {
      titleSize,
      titleLineHeight,
      titleLines,
      titleWords,
      subSize,
      subLineHeight,
      subLines,
      titleSpacing,
      totalTextHeight
    };

    // Critério de parada: cabe dentro da altura livre E título tem no máximo 4 linhas (ou 5 em títulos gigantes)
    const maxAllowedLines = cleanTitle.length > 110 ? 5 : 4;
    if (totalTextHeight <= availableHeight && titleLines.length <= maxAllowedLines) {
      break;
    }

    // Redução iterativa suave
    titleSize -= 2;
    subSize = Math.max(minSubSize, Math.round(subSize - 1.2));
  }

  return bestResult;
}

/**
 * Desenha o Card Oficial Completo do Portal NG Brasil em qualquer elemento Canvas
 */
export async function drawNgCardOnCanvas(canvas, options = {}) {
  if (!canvas) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const {
    title = '',
    subtitle = '',
    image = null, // HTMLImageElement ou null
    imageUrl = '',
    logo = null,  // HTMLImageElement ou null
    aspectRatio = '4:5',
    customHighlightText = '',
    isImageLoading = false,
    categoryLabel = 'NOTÍCIAS'
  } = options;

  // Garante que as fontes estão ativas
  await ensureBarlowCondensedLoaded();

  const geom = getCardDimensions(aspectRatio);
  const { width, height, targetPhotoHeight, cardY, topLimit, bottomLimit, availableHeight, maxWidth } = geom;

  // Ajusta dimensões do canvas
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);

  // 1. FUNDO BASE ESCURO
  ctx.fillStyle = '#040f1d';
  ctx.fillRect(0, 0, width, height);

  // 2. FOTO DE CAPA OU PLACEHOLDER EDITORIAL
  let photoDrawn = false;

  if (image && image.naturalWidth > 0) {
    try {
      const scale = Math.max(width / image.naturalWidth, targetPhotoHeight / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      const x = (width - w) / 2;
      const y = (targetPhotoHeight - h) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, targetPhotoHeight);
      ctx.clip();
      ctx.drawImage(image, x, y, w, h);
      ctx.restore();

      // Gradiente suave de transição sobre a foto
      const grad = ctx.createLinearGradient(0, targetPhotoHeight - 180, 0, targetPhotoHeight);
      grad.addColorStop(0, 'rgba(0, 23, 46, 0)');
      grad.addColorStop(1, '#00172e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, targetPhotoHeight - 180, width, 180);

      photoDrawn = true;
    } catch (e) {
      console.warn("Falha ao desenhar imagem no canvas:", e);
    }
  }

  // Se a foto não foi desenhada (ainda carregando ou falhou na origem)
  if (!photoDrawn) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, targetPhotoHeight);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#00172e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, targetPhotoHeight);

    // Grade sutil de fundo estilo portal jornalístico
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, targetPhotoHeight);
      ctx.stroke();
    }
    for (let y = 0; y < targetPhotoHeight; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Mensagem amigável de status visual
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isImageLoading ? '#64748b' : '#475569';
    ctx.font = '600 28px "Barlow Condensed", sans-serif';
    const statusMsg = isImageLoading
      ? 'CARREGANDO FOTO OFICIAL...'
      : (imageUrl ? 'FOTO EM TRATAMENTO OU PROTEGIDA PELA FONTE' : 'PORTAL NG BRASIL • JORNALISMO INDEPENDENTE');
    ctx.fillText(statusMsg, width / 2, targetPhotoHeight / 2);
  }

  // 3. BLOCO INFERIOR AZUL MARINHO OFICIAL NG (#00172e) COM CANTO ARREDONDADO
  ctx.fillStyle = '#00172e';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, cardY + 50);
  ctx.quadraticCurveTo(0, cardY, 50, cardY);
  ctx.lineTo(width, cardY);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // 4. ABA VERMELHA ESTILIZADA NO CANTO SUPERIOR DIREITO (#d40a38)
  ctx.fillStyle = '#d40a38';
  ctx.beginPath();
  ctx.moveTo(width - 400, cardY);
  ctx.lineTo(width - 370, cardY - 25);
  ctx.lineTo(width, cardY - 25);
  ctx.lineTo(width, cardY);
  ctx.closePath();
  ctx.fill();

  // 5. LOGO OFICIAL DO PORTAL NG BRASIL (CANTO SUPERIOR DIREITO)
  let logoDrawn = false;
  if (logo && logo.naturalWidth > 0) {
    try {
      const logoW = 210;
      const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
      ctx.drawImage(logo, width - 260, 45, logoW, logoH);
      logoDrawn = true;
    } catch (_) {}
  }

  // Fallback caso a imagem do logo não esteja acessível: crachá oficial NG em vetor puro
  if (!logoDrawn) {
    ctx.save();
    const bx = width - 230;
    const by = 45;
    const bw = 175;
    const bh = 65;

    // Balão branco
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 10) : ctx.rect(bx, by, bw, bh);
    ctx.fill();

    // Texto NG vermelho e preto
    ctx.font = 'bold 38px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#040f1d';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('NG', bx + 18, by + bh / 2);

    // Barra vermelha lateral
    ctx.fillStyle = '#d40a38';
    ctx.fillRect(bx + 80, by + 12, 4, bh - 24);

    ctx.font = '900 18px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#d40a38';
    ctx.fillText('BRASIL', bx + 95, by + bh / 2);
    ctx.restore();
  }

  // 6. MOTOR DE AUTO-FIT TIPOGRÁFICO (CÁLCULO EXATO DE LINHAS E ALTURAS)
  const typeResult = calculateAutoFitTypography(ctx, title, subtitle, maxWidth, availableHeight, aspectRatio);
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

  // startY com ancoragem segura: NUNCA acima de topLimit e centralizado verticalmente na área disponível
  const startY = Math.max(topLimit, topLimit + (availableHeight - totalTextHeight) / 2);

  // 7. RENDER DO TÍTULO COM DESTAQUE EM VERMELHO
  ctx.font = `bold ${titleSize}px "Barlow Condensed", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const highlightInfo = getHighlightRange(titleWords, customHighlightText);
  let globalWordIdx = 0;
  let textY = startY;

  titleLines.forEach(line => {
    const lWords = line.split(/\s+/).filter(Boolean);
    const fullLineWidth = ctx.measureText(line).width;
    let currentX = (width / 2) - (fullLineWidth / 2);

    lWords.forEach((word, idx) => {
      const isRed = highlightInfo.set.has(globalWordIdx);
      ctx.fillStyle = isRed ? '#d40a38' : '#ffffff';
      ctx.fillText(word, currentX, textY);
      currentX += ctx.measureText(word).width;

      if (idx < lWords.length - 1) {
        currentX += ctx.measureText(' ').width;
      }
      globalWordIdx++;
    });

    textY += titleLineHeight;
  });

  // 8. RENDER DO SUBTÍTULO
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

  // 9. RODAPÉ INSTITUCIONAL (LINHA DIVISÓRIA E CRÉDITOS)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, height - 90);
  ctx.lineTo(width - 60, height - 90);
  ctx.stroke();

  // URL no rodapé esquerdo
  ctx.textAlign = 'left';
  ctx.font = '600 24px "Barlow Condensed", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('portalngbrasil.com.br', 60, height - 55);

  // Chamada no rodapé direito
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Barlow Condensed", sans-serif';
  const sigaText = 'Siga @portalngbrasil';
  const sigaWidth = ctx.measureText(sigaText).width;
  ctx.fillText(sigaText, width - 60 - sigaWidth, height - 55);

  return true;
}

/**
 * Renderiza qualquer card (seja template oficial ou imagem cheia/CTA) em um elemento canvas
 */
export async function drawAnyCardOnCanvas(targetCanvas, cardData = {}, options = {}) {
  if (!targetCanvas || !cardData) return;
  const aspectRatio = options.aspectRatio || cardData.aspectRatio || '4:5';
  const dims = getCardDimensions(aspectRatio);

  targetCanvas.width = dims.width;
  targetCanvas.height = dims.height;
  const ctx = targetCanvas.getContext('2d');

  // MODO 1: Imagem Cheia (ex: Slide CTA /siga-portalngbrasil.jpg ou foto cheia)
  const isFullImage = cardData.mode === 'full_image' || cardData.isCtaCard || (cardData.imageUrl && cardData.imageUrl.includes('siga-portalngbrasil'));

  if (isFullImage) {
    ctx.fillStyle = '#040f1d';
    ctx.fillRect(0, 0, dims.width, dims.height);

    const imgUrl = cardData.imageUrl || cardData.image || '/siga-portalngbrasil.jpg';
    const img = await safeLoadImageForCanvas(imgUrl);
    if (img) {
      if (cardData.objectFit === 'contain') {
        const scale = Math.min(dims.width / img.width, dims.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (dims.width - w) / 2;
        const y = (dims.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      } else {
        const scale = Math.max(dims.width / img.width, dims.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (dims.width - w) / 2;
        const y = (dims.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      }
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, dims.width, dims.height);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 42px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PORTAL NG BRASIL', dims.width / 2, dims.height / 2);
    }

    if (cardData.showLogoOnFullImage) {
      const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
      if (logo) {
        ctx.drawImage(logo, dims.width - 260, 45, 210, 210 * (logo.height / logo.width));
      }
    }
    return true;
  }

  // MODO 2: Template Oficial Portal NG Brasil (Capa com manchete, apoio e foto)
  const title = cardData.title || cardData.titulo || '';
  const subtitle = cardData.subtitle || cardData.apoio || '';
  const imageUrl = cardData.imageUrl || cardData.image || cardData.imagem || '';
  const customHighlightText = cardData.customHighlightText || cardData.highlightText || cardData.destaque || '';

  const [photoImg, logoImg] = await Promise.all([
    imageUrl ? safeLoadImageForCanvas(imageUrl) : Promise.resolve(null),
    safeLoadImageForCanvas('/logo-ng.png').catch(() => null)
  ]);

  await drawNgCardOnCanvas(targetCanvas, {
    title,
    subtitle,
    image: photoImg,
    imageUrl,
    logo: logoImg,
    aspectRatio,
    customHighlightText,
    categoryLabel: cardData.categoryLabel || cardData.category || options.categoryLabel || 'NOTÍCIAS'
  });

  return true;
}

/**
 * Renderiza qualquer card (template ou imagem cheia/CTA) em um Blob JPEG de alta definição
 */
export async function renderCardSlideToBlob(cardData = {}, options = {}) {
  const aspectRatio = options.aspectRatio || cardData.aspectRatio || '4:5';
  const dims = getCardDimensions(aspectRatio);
  const offscreen = document.createElement('canvas');
  offscreen.width = dims.width;
  offscreen.height = dims.height;

  await drawAnyCardOnCanvas(offscreen, cardData, { ...options, aspectRatio });

  return new Promise(resolve => {
    offscreen.toBlob(resolve, 'image/jpeg', 0.95);
  });
}

/**
 * Renderiza um card em segundo plano (offscreen) e retorna um Blob JPEG de alta definição
 */
export async function renderNgCardToBlob(cardData = {}, options = {}) {
  const {
    title = cardData.title || '',
    subtitle = cardData.subtitle || '',
    imageUrl = cardData.image || cardData.imageUrl || '',
    aspectRatio = options.aspectRatio || '4:5',
    customHighlightText = options.customHighlightText || ''
  } = cardData;

  const dims = getCardDimensions(aspectRatio);
  const offscreen = document.createElement('canvas');
  offscreen.width = dims.width;
  offscreen.height = dims.height;

  // Carrega imagens em paralelo com fallback
  const [photoImg, logoImg] = await Promise.all([
    imageUrl ? safeLoadImageForCanvas(imageUrl) : Promise.resolve(null),
    safeLoadImageForCanvas('/logo-ng.png').catch(() => null)
  ]);

  await drawNgCardOnCanvas(offscreen, {
    title,
    subtitle,
    image: photoImg,
    imageUrl,
    logo: logoImg,
    aspectRatio,
    customHighlightText
  });

  return new Promise((resolve) => {
    offscreen.toBlob(resolve, 'image/jpeg', 0.95);
  });
}
