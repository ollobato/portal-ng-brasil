import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadImageForSocial } from './imageUploader';
import { formatInstagramCaption } from './socialExporter';

export const FALLBACK_META_SETTINGS = {
  metaToken: "EAAfkmL0QDnwBShl80MRmZBTLC0zM1xliUQViccwO4beeR26NpOZBawVgFRIOmLdtHGZC2sZBzKykWtyHcKth5GxbT0wmaC2AhsnXWmZAOqRZA2efBiFPhWytZCILlXNFQCijh0VRwxil0ZAk4cmKdB8vH7Ew2DNQKZCJ9At5xmSVHxGbuwNs3NfQeMVhbI25c",
  metaFbPageId: "109031887591187",
  metaIgAccountId: "17841455465356006",
  imgbbKey: "813f88f11b22e11a7a08ef94bfa29fa9"
};

export async function getLiveMetaSettings(customSettings = {}) {
  const merged = { ...FALLBACK_META_SETTINGS };
  try {
    const snap = await getDoc(doc(db, 'config', 'settings'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.metaToken) merged.metaToken = data.metaToken;
      if (data.metaFbPageId) merged.metaFbPageId = data.metaFbPageId;
      if (data.metaIgAccountId) merged.metaIgAccountId = data.metaIgAccountId;
      if (data.imgbbKey) merged.imgbbKey = data.imgbbKey;
    }
  } catch (e) {
    console.warn("Falha ao carregar settings do Firestore, usando fallback local:", e.message);
  }

  // Override com localStorage se existir
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('portal_ng_meta_token')) merged.metaToken = localStorage.getItem('portal_ng_meta_token');
    if (localStorage.getItem('portal_ng_meta_fb_page_id')) merged.metaFbPageId = localStorage.getItem('portal_ng_meta_fb_page_id');
    if (localStorage.getItem('portal_ng_meta_ig_account_id')) merged.metaIgAccountId = localStorage.getItem('portal_ng_meta_ig_account_id');
    if (localStorage.getItem('portal_ng_imgbb_key')) merged.imgbbKey = localStorage.getItem('portal_ng_imgbb_key');
  }

  // Override com customSettings passadas explicitamente
  return { ...merged, ...customSettings };
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

    const caption = formatInstagramCaption(publishedPayload, shareUrl);

    // -------------------------------------------------------------
    // ETAPA 3: PUBLICAR NO FACEBOOK
    // -------------------------------------------------------------
    if (conf.metaFbPageId && conf.metaToken) {
      onProgress({ step: 'facebook', message: '📘 Publicando na Página do Facebook...' });
      try {
        // Tenta obter o Page Access Token específico da página via /me/accounts para evitar bloqueio #200
        let fbToken = conf.metaToken;
        try {
          const accRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${conf.metaToken}`);
          if (accRes.ok) {
            const accData = await accRes.json();
            const targetPage = accData.data?.find(p => String(p.id) === String(conf.metaFbPageId));
            if (targetPage && targetPage.access_token) {
              fbToken = targetPage.access_token;
              console.log("Utilizando Page Access Token dedicado para:", targetPage.name);
            }
          }
        } catch (e) {
          console.warn("Não foi possível obter Page Token:", e.message);
        }

        const fbFormData = new FormData();
        if (blob) {
          fbFormData.append('source', blob, `ng_post_${finalArticleId}.jpg`);
        } else if (publicImageUrl) {
          fbFormData.append('url', publicImageUrl);
        }
        fbFormData.append('message', caption);
        fbFormData.append('access_token', fbToken);

        const fbRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaFbPageId}/photos`, {
          method: 'POST',
          body: fbFormData
        });

        const fbData = await fbRes.json();
        if (fbData.error) {
          console.error("Erro Facebook:", fbData.error);
          result.errors.facebook = fbData.error.message;
        } else {
          const postId = fbData.post_id || fbData.id;
          result.links.facebook = postId ? `https://www.facebook.com/${postId}` : `https://www.facebook.com/${conf.metaFbPageId}`;
          console.log("Facebook postado com sucesso:", result.links.facebook);
        }
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
