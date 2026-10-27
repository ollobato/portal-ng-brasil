import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadImageForSocial } from './imageUploader';
import { formatInstagramCaption, formatFacebookCaption } from './socialExporter';

export const FALLBACK_META_SETTINGS = {
  metaToken: "EAAfkmL0QDnwBShl80MRmZBTLC0zM1xliUQViccwO4beeR26NpOZBawVgFRIOmLdtHGZC2sZBzKykWtyHcKth5GxbT0wmaC2AhsnXWmZAOqRZA2efBiFPhWytZCILlXNFQCijh0VRwxil0ZAk4cmKdB8vH7Ew2DNQKZCJ9At5xmSVHxGbuwNs3NfQeMVhbI25c",
  metaFbPageId: "109031887591187",
  metaIgAccountId: "17841455465356006",
  imgbbKey: "813f88f11b22e11a7a08ef94bfa29fa9"
};

export async function getLiveMetaSettings(customSettings = {}) {
  const merged = { ...FALLBACK_META_SETTINGS };
  try {
    const [globalSnap, configSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'global')).catch(() => null),
      getDoc(doc(db, 'config', 'settings')).catch(() => null)
    ]);

    const applyNonEmpty = (data) => {
      if (!data) return;
      if (data.metaToken && String(data.metaToken).trim()) merged.metaToken = String(data.metaToken).trim();
      if (data.metaFbPageId && String(data.metaFbPageId).trim()) merged.metaFbPageId = String(data.metaFbPageId).trim();
      if (data.metaIgAccountId && String(data.metaIgAccountId).trim()) merged.metaIgAccountId = String(data.metaIgAccountId).trim();
      if (data.imgbbKey && String(data.imgbbKey).trim()) merged.imgbbKey = String(data.imgbbKey).trim();
    };

    if (configSnap && configSnap.exists()) applyNonEmpty(configSnap.data());
    if (globalSnap && globalSnap.exists()) applyNonEmpty(globalSnap.data());
  } catch (e) {
    console.warn("Falha ao carregar settings do Firestore, usando fallback local:", e.message);
  }

  // Override com localStorage se existir (e não estiver em branco)
  if (typeof window !== 'undefined') {
    const lsToken = localStorage.getItem('portal_ng_meta_token');
    const lsFbId = localStorage.getItem('portal_ng_meta_fb_page_id');
    const lsIgId = localStorage.getItem('portal_ng_meta_ig_account_id');
    const lsImgbb = localStorage.getItem('portal_ng_imgbb_key');
    if (lsToken && lsToken.trim()) merged.metaToken = lsToken.trim();
    if (lsFbId && lsFbId.trim()) merged.metaFbPageId = lsFbId.trim();
    if (lsIgId && lsIgId.trim()) merged.metaIgAccountId = lsIgId.trim();
    if (lsImgbb && lsImgbb.trim()) merged.imgbbKey = lsImgbb.trim();
  }

  // Override com customSettings passadas explicitamente (apenas chaves preenchidas)
  Object.entries(customSettings || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      merged[k] = typeof v === 'string' ? v.trim() : v;
    }
  });

  return merged;
}

/**
 * Resolve o Page Access Token dedicado da página do Facebook a partir de um User Token ou Page Token.
 */
export async function resolveFacebookPageToken(token, pageId = FALLBACK_META_SETTINGS.metaFbPageId) {
  const cleanToken = (token || '').trim();
  const cleanPageId = (pageId || FALLBACK_META_SETTINGS.metaFbPageId).trim();
  if (!cleanToken) throw new Error("Token da Meta não configurado.");

  // 1. Consulta direta ao nó da Página (funciona tanto com User Token quanto com Page Token)
  try {
    const pageRes = await fetch(
      `https://graph.facebook.com/v20.0/${cleanPageId}?fields=id,name,access_token&access_token=${encodeURIComponent(cleanToken)}`
    );
    if (pageRes.ok) {
      const pageData = await pageRes.json();
      if (pageData && pageData.access_token) {
        return {
          pageToken: pageData.access_token,
          pageName: pageData.name || 'Portal NG Brasil',
          pageId: pageData.id || cleanPageId,
          source: 'page_node'
        };
      }
    }
  } catch (e) {
    console.warn("Aviso ao consultar nó da página directamente:", e.message);
  }

  // 2. Fallback via /me/accounts
  try {
    const accRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,tasks&access_token=${encodeURIComponent(cleanToken)}`
    );
    if (accRes.ok) {
      const accData = await accRes.json();
      const targetPage =
        accData.data?.find(p => String(p.id) === String(cleanPageId)) ||
        accData.data?.[0];
      if (targetPage && targetPage.access_token) {
        return {
          pageToken: targetPage.access_token,
          pageName: targetPage.name || 'Portal NG Brasil',
          pageId: targetPage.id || cleanPageId,
          source: 'me_accounts'
        };
      }
    }
  } catch (e) {
    console.warn("Aviso ao consultar /me/accounts:", e.message);
  }

  // 3. Caso o próprio token colado pelo usuário já seja um Page Token
  return {
    pageToken: cleanToken,
    pageName: 'Portal NG Brasil',
    pageId: cleanPageId,
    source: 'direct_token'
  };
}

/**
 * Formata erros da Graph API do Facebook em mensagens claras e acionáveis em português.
 */
export function formatFacebookGraphError(errorObj) {
  if (!errorObj) return 'Erro desconhecido na API do Facebook.';
  const rawMsg = errorObj.error_user_msg || errorObj.message || String(errorObj);
  const code = errorObj.code;

  if (code === 200 || rawMsg.includes('pages_manage_posts')) {
    return 'Falta a permissão "pages_manage_posts" no Token da Meta (#200). Gere um novo token no Meta Graph API Explorer marcando a permissão "pages_manage_posts" e salve nas Configurações.';
  }
  if (code === 190 || rawMsg.toLowerCase().includes('session has expired') || rawMsg.toLowerCase().includes('access token')) {
    return 'O Token de Acesso da Meta expirou ou foi invalidado (#190). Gere um novo token nas Configurações.';
  }
  return rawMsg;
}

/**
 * Publica na Página do Facebook com resolução automática de Page Token e fallbacks (Blob -> URL -> Link Feed).
 */
export async function publishToFacebookPage({
  pageId = FALLBACK_META_SETTINGS.metaFbPageId,
  token,
  blob = null,
  publicImageUrl = null,
  blobs = null,
  publicImageUrls = null,
  message = '',
  linkUrl = null
}) {
  const effectivePageId = (pageId || FALLBACK_META_SETTINGS.metaFbPageId).trim();
  const { pageToken } = await resolveFacebookPageToken(token, effectivePageId);

  let lastError = null;

  // Suporte a Carrossel / Múltiplas Fotos no Facebook
  const multiBlobs = Array.isArray(blobs) && blobs.length > 1 ? blobs : null;
  const multiUrls = Array.isArray(publicImageUrls) && publicImageUrls.length > 1 ? publicImageUrls : null;
  const totalMulti = Math.max(multiBlobs ? multiBlobs.length : 0, multiUrls ? multiUrls.length : 0);

  if (totalMulti > 1) {
    try {
      const attachedMedia = [];
      for (let i = 0; i < totalMulti; i++) {
        let photoId = null;
        const itemBlob = multiBlobs?.[i];
        const itemUrl = multiUrls?.[i];

        if (itemBlob) {
          try {
            const fbFormData = new FormData();
            fbFormData.append('source', itemBlob, `ng_carousel_${i + 1}_${Date.now()}.jpg`);
            fbFormData.append('published', 'false');
            fbFormData.append('access_token', pageToken);

            const fbRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/photos`, {
              method: 'POST',
              body: fbFormData
            });
            const fbData = await fbRes.json();
            if (!fbData.error && fbData.id) {
              photoId = fbData.id;
            }
          } catch (_) {}
        }

        if (!photoId && itemUrl) {
          try {
            const fbRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: itemUrl,
                published: false,
                access_token: pageToken
              })
            });
            const fbData = await fbRes.json();
            if (!fbData.error && fbData.id) {
              photoId = fbData.id;
            }
          } catch (_) {}
        }

        if (photoId) {
          attachedMedia.push({ media_fbid: photoId });
        }
      }

      if (attachedMedia.length > 0) {
        const feedRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            attached_media: attachedMedia,
            access_token: pageToken
          })
        });
        const feedData = await feedRes.json();
        if (!feedData.error && feedData.id) {
          return {
            success: true,
            postId: feedData.id,
            url: `https://www.facebook.com/${feedData.id}`
          };
        }
        if (feedData.error) {
          lastError = feedData.error;
        }
      }
    } catch (multiErr) {
      console.warn("Aviso ao publicar múltiplas fotos no Facebook, tentando fallback para foto única:", multiErr.message);
    }
  }

  // Tentativa 1: Upload binário direto da imagem via FormData em /{page-id}/photos
  if (blob) {
    try {
      const fbFormData = new FormData();
      fbFormData.append('source', blob, `ng_post_${Date.now()}.jpg`);
      fbFormData.append('message', message);
      fbFormData.append('access_token', pageToken);

      const fbRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/photos`, {
        method: 'POST',
        body: fbFormData
      });
      const fbData = await fbRes.json();
      if (!fbData.error && (fbData.post_id || fbData.id)) {
        const postId = fbData.post_id || fbData.id;
        return {
          success: true,
          postId,
          url: `https://www.facebook.com/${postId}`
        };
      }
      if (fbData.error) {
        lastError = fbData.error;
        // Se for erro de permissão (#200) ou token (#190), não adianta tentar fallback
        if (fbData.error.code === 200 || fbData.error.code === 190) {
          throw new Error(formatFacebookGraphError(fbData.error));
        }
      }
    } catch (err) {
      if (err.message.includes('pages_manage_posts') || err.message.includes('#190')) throw err;
      lastError = { message: err.message };
    }
  }

  // Tentativa 2: Publicar foto via URL pública hospedada em /{page-id}/photos
  if (publicImageUrl) {
    try {
      const fbRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: publicImageUrl,
          message,
          access_token: pageToken
        })
      });
      const fbData = await fbRes.json();
      if (!fbData.error && (fbData.post_id || fbData.id)) {
        const postId = fbData.post_id || fbData.id;
        return {
          success: true,
          postId,
          url: `https://www.facebook.com/${postId}`
        };
      }
      if (fbData.error) {
        lastError = fbData.error;
        if (fbData.error.code === 200 || fbData.error.code === 190) {
          throw new Error(formatFacebookGraphError(fbData.error));
        }
      }
    } catch (err) {
      if (err.message.includes('pages_manage_posts') || err.message.includes('#190')) throw err;
      lastError = { message: err.message };
    }
  }

  // Tentativa 3: Publicar Link / Texto direto no /{page-id}/feed
  try {
    const payload = {
      message,
      access_token: pageToken
    };
    if (linkUrl) payload.link = linkUrl;

    const fbRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const fbData = await fbRes.json();
    if (!fbData.error && fbData.id) {
      return {
        success: true,
        postId: fbData.id,
        url: `https://www.facebook.com/${fbData.id}`
      };
    }
    if (fbData.error) {
      lastError = fbData.error;
    }
  } catch (err) {
    lastError = { message: err.message };
  }

  throw new Error(formatFacebookGraphError(lastError));
}

/**
 * Executa diagnóstico completo ao vivo da conexão com Facebook e Instagram na Meta Graph API v20.0.
 */
export async function diagnoseMetaConnection(customSettings = {}) {
  const conf = await getLiveMetaSettings(customSettings);
  const token = (conf.metaToken || '').trim();
  const pageId = (conf.metaFbPageId || FALLBACK_META_SETTINGS.metaFbPageId).trim();
  const igId = (conf.metaIgAccountId || FALLBACK_META_SETTINGS.metaIgAccountId).trim();

  const REQUIRED_SCOPES = [
    { scope: 'pages_show_list', label: 'Listar Páginas (pages_show_list)', channel: 'facebook' },
    { scope: 'pages_read_engagement', label: 'Ler Engajamento da Página (pages_read_engagement)', channel: 'facebook' },
    { scope: 'pages_manage_posts', label: 'Publicar na Página do Facebook (pages_manage_posts)', channel: 'facebook', criticalForFbPost: true },
    { scope: 'instagram_basic', label: 'Acesso Básico Instagram (instagram_basic)', channel: 'instagram' },
    { scope: 'instagram_content_publish', label: 'Publicar no Instagram (instagram_content_publish)', channel: 'instagram' }
  ];

  const report = {
    checkedAt: new Date().toISOString(),
    tokenValid: false,
    appId: '2221669495082620',
    appName: 'Portal NG Brasil',
    userName: null,
    grantedScopes: [],
    missingScopes: [],
    scopeDetails: [],
    facebook: {
      connected: false,
      canPublish: false,
      pageId,
      pageName: null,
      followersCount: null,
      hasPageToken: false,
      error: null
    },
    instagram: {
      connected: false,
      canPublish: false,
      igId,
      username: null,
      followersCount: null,
      error: null
    }
  };

  if (!token) {
    report.facebook.error = 'Nenhum Token de Acesso configurado.';
    report.instagram.error = 'Nenhum Token de Acesso configurado.';
    return report;
  }

  try {
    const [meRes, permRes, pageRes, igRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`).catch(() => null),
      fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${encodeURIComponent(token)}`).catch(() => null),
      fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=id,name,fan_count,followers_count,access_token,instagram_business_account&access_token=${encodeURIComponent(token)}`).catch(() => null),
      fetch(`https://graph.facebook.com/v20.0/${igId}?fields=id,username,name,followers_count&access_token=${encodeURIComponent(token)}`).catch(() => null)
    ]);

    if (meRes && meRes.ok) {
      const meData = await meRes.json();
      if (!meData.error) {
        report.tokenValid = true;
        report.userName = meData.name || null;
      } else {
        report.facebook.error = formatFacebookGraphError(meData.error);
      }
    }

    if (permRes && permRes.ok) {
      const permData = await permRes.json();
      if (Array.isArray(permData.data)) {
        report.grantedScopes = permData.data
          .filter(p => p.status === 'granted')
          .map(p => p.permission);
      }
    }

    report.scopeDetails = REQUIRED_SCOPES.map(req => {
      const granted = report.grantedScopes.includes(req.scope);
      return { ...req, granted };
    });
    report.missingScopes = report.scopeDetails.filter(s => !s.granted).map(s => s.scope);

    if (pageRes) {
      const pageData = await pageRes.json();
      if (!pageData.error && pageData.id) {
        report.tokenValid = true;
        report.facebook.connected = true;
        report.facebook.pageId = pageData.id;
        report.facebook.pageName = pageData.name || 'Portal NG Brasil';
        report.facebook.followersCount = pageData.followers_count || pageData.fan_count || null;
        report.facebook.hasPageToken = Boolean(pageData.access_token);

        const hasManagePosts = report.grantedScopes.includes('pages_manage_posts');
        if (hasManagePosts && pageData.access_token) {
          report.facebook.canPublish = true;
        } else if (!hasManagePosts) {
          report.facebook.canPublish = false;
          report.facebook.error = 'O token está conectado à página "Portal NG Brasil", mas NÃO possui a permissão "pages_manage_posts". Por isso o Instagram publica normalmente, mas o Facebook bloqueia a postagem com erro #200.';
        }
      } else if (pageData.error) {
        report.facebook.error = formatFacebookGraphError(pageData.error);
      }
    }

    if (igRes) {
      const igData = await igRes.json();
      if (!igData.error && igData.id) {
        report.tokenValid = true;
        report.instagram.connected = true;
        report.instagram.igId = igData.id;
        report.instagram.username = igData.username || 'portalngbrasil';
        report.instagram.followersCount = igData.followers_count || null;
        report.instagram.canPublish = report.grantedScopes.includes('instagram_content_publish') || report.grantedScopes.length === 0;
      } else if (igData.error) {
        report.instagram.error = igData.error.message;
      }
    }
  } catch (err) {
    report.facebook.error = err.message;
  }

  return report;
}

import { safeLoadImageForCanvas } from './imageLoader';

// Renderiza a arte do Instagram (4:5) em canvas headless garantindo carregamento da foto de capa
export async function generateSocialCardBlob(article, existingCanvas = null) {
  if (existingCanvas && existingCanvas.width > 0 && existingCanvas.height > 0) {
    try {
      const blob = await new Promise(resolve => existingCanvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (blob && blob.size > 1000) {
        return blob;
      }
    } catch (e) {
      console.warn("Canvas existente indisponível para exportação, gerando canvas dedicado:", e);
    }
  }

  const width = 1080;
  const height = 1350; // proporção 4:5 padrão Instagram
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fundo
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  // Foto de Capa trazida da fonte (com contorno de CORS via proxy e blob local)
  const targetHeight = height * 0.58;
  if (article.image) {
    const bgImg = await safeLoadImageForCanvas(article.image);
    if (bgImg) {
      const scale = Math.max(width / bgImg.width, targetHeight / bgImg.height);
      const scaledW = bgImg.width * scale;
      const scaledH = bgImg.height * scale;
      const x = (width - scaledW) / 2;
      const y = (targetHeight - scaledH) / 2;
      ctx.drawImage(bgImg, x, y, scaledW, scaledH);

      // Gradiente suave sobre a foto
      const grad = ctx.createLinearGradient(0, targetHeight - 180, 0, targetHeight);
      grad.addColorStop(0, 'rgba(0, 23, 46, 0)');
      grad.addColorStop(1, '#00172e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, targetHeight - 180, width, 180);
    } else {
      // Caso a foto realmente não exista, deixa fundo escuro elegante
      ctx.fillStyle = '#040f1d';
      ctx.fillRect(0, 0, width, targetHeight);
    }
  }

  // Bloco Inferior Azul Marinho NG
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

  // Aba Vermelha NG
  ctx.fillStyle = '#d40a38';
  ctx.beginPath();
  ctx.moveTo(width - 400, cardY);
  ctx.lineTo(width - 370, cardY - 25);
  ctx.lineTo(width, cardY - 25);
  ctx.lineTo(width, cardY);
  ctx.closePath();
  ctx.fill();

  // Logo Oficial NG no topo direito
  const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
  if (logo) {
    ctx.drawImage(logo, width - 260, 45, 210, 210 * (logo.height / logo.width));
  }

  // Título
  const titleText = (article.title || '').toUpperCase();
  ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
  const titleWords = titleText.split(' ');
  const titleLines = [];
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

  // Subtítulo
  const subtitleText = article.subtitle || '';
  ctx.font = '400 36px "Barlow Condensed", sans-serif';
  const subWords = subtitleText.split(' ');
  const subLines = [];
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

  // Cálculo de Posição Vertical
  const titleLineHeight = 75;
  const subLineHeight = 46;
  const titleSpacing = 15;
  const totalTextHeight = (titleLines.length * titleLineHeight) + titleSpacing + (subLines.length * subLineHeight);
  const bottomLimit = height - 120;
  const topLimit = cardY + 30;
  const availableHeight = bottomLimit - topLimit;
  const startY = topLimit + (availableHeight - totalTextHeight) / 2;

  // Renderiza Título (com palavras centrais em vermelho destaque)
  ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  let globalWordIndex = 0;
  let textY = startY;

  titleLines.forEach(l => {
    const lWords = l.split(' ');
    const fullLineWidth = ctx.measureText(l).width;
    let curX = (width / 2) - (fullLineWidth / 2);
    lWords.forEach((w, idx) => {
      const isRed = globalWordIndex >= titleWords.length * 0.45 && globalWordIndex <= titleWords.length * 0.85;
      ctx.fillStyle = isRed ? '#d40a38' : '#ffffff';
      ctx.fillText(w, curX, textY);
      curX += ctx.measureText(w).width;
      if (idx < lWords.length - 1) curX += ctx.measureText(' ').width;
      globalWordIndex++;
    });
    textY += titleLineHeight;
  });

  // Renderiza Subtítulo
  ctx.font = '400 36px "Barlow Condensed", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'center';
  let subY = textY + titleSpacing;
  subLines.forEach(l => {
    ctx.fillText(l, width / 2, subY);
    subY += subLineHeight;
  });

  // Linha e Marca d'água no rodapé
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, height - 90);
  ctx.lineTo(width - 60, height - 90);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '600 24px "Barlow Condensed", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('portalngbrasil.com.br', 60, height - 55);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
}

/**
 * Publica a matéria instantaneamente em TODOS OS CANAIS:
 * 1. Portal NG Brasil (coleção 'news' no Firestore)
 * 2. Feed do Instagram via Meta Graph API
 * 3. Página do Facebook via Meta Graph API
 */
export async function publishArticleToAllChannels({
  article,
  canvas = null,
  settings = {},
  reviewerName = 'Editora-Chefe',
  approvalNotes = 'Aprovado e publicado imediatamente em todos os canais.',
  onProgress = () => {}
}) {
  if (!article) throw new Error("Nenhum artigo fornecido para publicação.");

  const conf = await getLiveMetaSettings(settings);
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const finalArticleId = String(article.id);
  const siteUrl = `https://portalngbrasil.com.br/#/noticia/${finalArticleId}`;
  const shareUrl = `https://portalngbrasil.com.br/share.php?id=${finalArticleId}`;

  const result = {
    success: false,
    articleId: finalArticleId,
    links: {
      site: siteUrl,
      share: shareUrl,
      instagram: null,
      facebook: null
    },
    errors: {}
  };

  try {
    // -------------------------------------------------------------
    // ETAPA 1: SALVAR NO PORTAL NG BRASIL (FIRESTORE 'news')
    // -------------------------------------------------------------
    onProgress({ step: 'portal', message: '🚀 Publicando no Portal NG Brasil...' });
    
    const publishedPayload = {
      ...article,
      id: finalArticleId,
      title: article.title || '',
      subtitle: article.subtitle || '',
      category: article.category || 'geral',
      categoryLabel: article.category ? (article.category.charAt(0).toUpperCase() + article.category.slice(1)) : 'Geral',
      praca: article.praca || 'Nacional',
      image: article.image || '',
      content: article.content || '',
      date: article.date || dateStr,
      readTime: article.readTime || '3 min de leitura',
      isFeatured: true,
      published: true,
      publishedAt: now.toISOString(),
      approvalStatus: 'approved',
      approvedBy: reviewerName,
      approvedAt: now.toISOString(),
      approvalNotes: approvalNotes,
      autoPublished: true,
      metadata: {
        ...(article.metadata || {}),
        aprovado_por: reviewerName,
        aprovado_em: now.toISOString(),
        publicado_em_todos_canais: true
      }
    };

    await setDoc(doc(db, 'news', finalArticleId), publishedPayload, { merge: true });

    // Atualiza drafts se existir
    try {
      await updateDoc(doc(db, 'drafts', finalArticleId), {
        published: true,
        publishedAt: now.toISOString(),
        approvalStatus: 'approved',
        approvedBy: reviewerName,
        approvedAt: now.toISOString(),
        approvalNotes: approvalNotes
      });
    } catch (e) {
      // Se não estiver em drafts, tudo bem
    }

    result.links.site = siteUrl;
    result.links.share = shareUrl;

    // -------------------------------------------------------------
    // ETAPA 2: GERAR E HOSPEDAR A ARTE OFICIAL DAS REDES SOCIAIS
    // -------------------------------------------------------------
    onProgress({ step: 'image', message: '🎨 Renderizando arte do Instagram e Facebook...' });
    
    let blob = null;
    try {
      blob = await generateSocialCardBlob(publishedPayload, canvas);
    } catch (imgErr) {
      console.warn("Falha ao gerar blob do canvas:", imgErr);
    }

    let publicImageUrl = null;
    if (blob) {
      onProgress({ step: 'upload', message: '☁️ Hospedando arte em alta definição...' });
      try {
        publicImageUrl = await uploadImageForSocial(blob, conf.imgbbKey);
      } catch (upErr) {
        console.warn("Falha no upload da arte:", upErr.message);
        result.errors.imageUpload = upErr.message;
      }
    }

    const caption = formatInstagramCaption(publishedPayload);
    const fbCaption = formatFacebookCaption(publishedPayload, shareUrl);

    // -------------------------------------------------------------
    // ETAPA 3: PUBLICAR NO FACEBOOK
    // -------------------------------------------------------------
    if (conf.metaFbPageId && conf.metaToken) {
      onProgress({ step: 'facebook', message: '📘 Publicando na Página do Facebook...' });
      try {
        const fbRes = await publishToFacebookPage({
          pageId: conf.metaFbPageId,
          token: conf.metaToken,
          blob,
          publicImageUrl,
          message: fbCaption,
          linkUrl: shareUrl
        });
        result.links.facebook = fbRes.url || `https://www.facebook.com/${conf.metaFbPageId}`;
        console.log("Facebook postado com sucesso:", result.links.facebook);
      } catch (fbErr) {
        console.error("Exceção ao postar no Facebook:", fbErr);
        result.errors.facebook = fbErr.message;
      }
    }

    // -------------------------------------------------------------
    // ETAPA 4: PUBLICAR NO INSTAGRAM FEED
    // -------------------------------------------------------------
    if (conf.metaIgAccountId && conf.metaToken && publicImageUrl) {
      onProgress({ step: 'instagram_container', message: '📸 Criando publicação no Instagram...' });
      try {
        const safeCaption = caption.length > 2100 ? caption.substring(0, 2100) + '...' : caption;

        const igMediaRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: publicImageUrl,
            caption: safeCaption,
            access_token: conf.metaToken
          })
        });

        const igMediaData = await igMediaRes.json();
        if (igMediaData.error) {
          throw new Error("Container Instagram: " + (igMediaData.error.error_user_msg || igMediaData.error.message));
        }

        const creationId = igMediaData.id;
        onProgress({ step: 'instagram_processing', message: '⏳ Instagram processando imagem em alta resolução...' });

        // Polling para aguardar o status FINISHED
        let isReady = false;
        let retries = 12; // até 36 segundos
        while (retries > 0) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            const statusRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${conf.metaToken}`);
            const statusData = await statusRes.json();
            if (statusData.status_code === 'FINISHED') {
              isReady = true;
              break;
            } else if (statusData.status_code === 'ERROR') {
              throw new Error("Processamento Instagram falhou: " + (statusData.status || "Formato de imagem"));
            }
          } catch (stErr) {
            if (stErr.message.includes('Processamento Instagram')) throw stErr;
          }
          retries--;
        }

        onProgress({ step: 'instagram_publish', message: '✨ Publicando card no Feed do Instagram...' });
        const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: conf.metaToken
          })
        });

        const igPublishData = await igPublishRes.json();
        if (igPublishData.error) {
          throw new Error("Publicação Instagram: " + (igPublishData.error.error_user_msg || igPublishData.error.message));
        }

        result.links.instagram = 'https://www.instagram.com/portalngbrasil/';
        try {
          const permaRes = await fetch(`https://graph.facebook.com/v20.0/${igPublishData.id}?fields=permalink&access_token=${conf.metaToken}`);
          const permaData = await permaRes.json();
          if (permaData.permalink) {
            result.links.instagram = permaData.permalink;
          }
        } catch (pErr) {
          console.warn("Erro ao buscar permalink Instagram:", pErr);
        }
        console.log("Instagram publicado com sucesso:", result.links.instagram);
      } catch (igErr) {
        console.error("Exceção ao postar no Instagram:", igErr);
        result.errors.instagram = igErr.message;
      }
    }

    // -------------------------------------------------------------
    // ETAPA 5: ATUALIZAR LINKS SOCIAIS NO FIRESTORE
    // -------------------------------------------------------------
    try {
      await updateDoc(doc(db, 'news', finalArticleId), {
        socialLinks: result.links,
        socialErrors: result.errors
      });
      await updateDoc(doc(db, 'drafts', finalArticleId), {
        socialLinks: result.links,
        socialErrors: result.errors
      });
    } catch (e) {}

    result.success = true;
    onProgress({ step: 'done', message: '🎉 Publicado com sucesso em todos os canais!' });
    return result;

  } catch (err) {
    console.error("Erro geral na publicação multicanal:", err);
    result.errors.general = err.message;
    throw err;
  }
}
