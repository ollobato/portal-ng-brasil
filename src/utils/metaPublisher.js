import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadImageForSocial, uploadVideoForSocial } from './imageUploader';
import { formatInstagramCaption, formatFacebookCaption, formatThreadsCaption } from './socialExporter';
import { renderCardSlideToBlob, renderNgCardToBlob } from './ngCardRenderer.js';
import { publishArticleToLinkedIn } from './linkedinPublisher';
import { publishArticleToX } from './xPublisher';

export const FALLBACK_META_SETTINGS = {
  metaToken: "EAAfkmL0QDnwBS82apn4Xc0VDUKhZAc1JyIBkUQYlZAVwZALJ7AVNvUKSHyXROrKiHRGbId2WP4CzE5Qsw4BuRv11yTHOQave839MIqz3wMOx49KE8lfl2KJpkKQegnqTdiRgtmAXgEAyhx7ltrRIZAH5v2knzZAR8aUXrUhpI5MkwBnXqLlBvb2bnJKgwbmtaGhLcbjk5jvZB7Dcv9cE6ZAnteNvbouoIvHWGyEOA7JsXvgZAUjb4dpoEiA0SMywZAIFToKgC4K2jF2KbTgxJ7DqaEn8NzwZDZD",
  metaFbPageId: "109031887591187",
  metaIgAccountId: "17841455465356006",
  imgbbKey: "813f88f11b22e11a7a08ef94bfa29fa9",
  threadsToken: "THAAVZB1HEtu6ZABYlk5QU0yRTVqZAFJyWENyQWdXOEZAIa3VhUVFSUHJ5S3BIbXdJSnNSSnVQR2V3OWY5OXhwQWFtVGJqQ1phOFU0enpGYWE0Tk5tRHBYTHFPc0dYUEJlWTh2MlJRWkt6WXBuaXdZAcGYtamVqeWw4dW9Fb1pBNkFoZAjA1bVB3cUc4eWFjdk11aHMZD",
  threadsUserId: "29313904888222414"
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
      if (data.threadsToken && String(data.threadsToken).trim()) merged.threadsToken = String(data.threadsToken).trim();
      if (data.threadsUserId && String(data.threadsUserId).trim()) merged.threadsUserId = String(data.threadsUserId).trim();
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
    const lsThreadsToken = localStorage.getItem('portal_ng_threads_token');
    const lsThreadsUserId = localStorage.getItem('portal_ng_threads_user_id');
    if (lsToken && lsToken.trim()) merged.metaToken = lsToken.trim();
    if (lsFbId && lsFbId.trim()) merged.metaFbPageId = lsFbId.trim();
    if (lsIgId && lsIgId.trim()) merged.metaIgAccountId = lsIgId.trim();
    if (lsImgbb && lsImgbb.trim()) merged.imgbbKey = lsImgbb.trim();
    if (lsThreadsToken && lsThreadsToken.trim()) merged.threadsToken = lsThreadsToken.trim();
    if (lsThreadsUserId && lsThreadsUserId.trim()) merged.threadsUserId = lsThreadsUserId.trim();
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
 * Publica na Página do Facebook com resolução automática de Page Token.
 * Por padrão, quando linkUrl é fornecido, publica como Post de Link nativo no feed
 * gerando o card com prévia do portal (og:image, og:title, og:description) e legenda chamativa.
 */
export async function publishToFacebookPage({
  pageId = FALLBACK_META_SETTINGS.metaFbPageId,
  token,
  blob = null,
  publicImageUrl = null,
  blobs = null,
  publicImageUrls = null,
  message = '',
  linkUrl = null,
  asPhoto = false
}) {
  const effectivePageId = (pageId || FALLBACK_META_SETTINGS.metaFbPageId).trim();
  const { pageToken } = await resolveFacebookPageToken(token, effectivePageId);

  let lastError = null;

  // PRIORIDADE 1: Publicação com Link Clicável e Prévia Nativa do Site no /{page-id}/feed
  // Isso gera o card nativo do Facebook com a imagem e chamada do portal (sem o card do Instagram)
  if (linkUrl && !asPhoto) {
    try {
      const payload = {
        message,
        link: linkUrl,
        access_token: pageToken
      };

      const feedRes = await fetch(`https://graph.facebook.com/v20.0/${effectivePageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
        if (feedData.error.code === 200 || feedData.error.code === 190) {
          throw new Error(formatFacebookGraphError(feedData.error));
        }
      }
    } catch (linkErr) {
      if (linkErr.message.includes('pages_manage_posts') || linkErr.message.includes('#190')) throw linkErr;
      lastError = { message: linkErr.message };
    }
  }

  // Suporte a Carrossel / Múltiplas Fotos no Facebook (caso solicitado como foto)
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

  // Tentativa de Foto: Upload binário direto da imagem via FormData em /{page-id}/photos
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
        if (fbData.error.code === 200 || fbData.error.code === 190) {
          throw new Error(formatFacebookGraphError(fbData.error));
        }
      }
    } catch (err) {
      if (err.message.includes('pages_manage_posts') || err.message.includes('#190')) throw err;
      lastError = { message: err.message };
    }
  }

  // Tentativa de Foto via URL pública hospedada em /{page-id}/photos
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

  // Fallback: Post de Feed direto com Link ou Texto
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
 * Formata erros da API do Threads em mensagens claras em português.
 */
export function formatThreadsGraphError(errorObj) {
  if (!errorObj) return 'Erro desconhecido na API do Threads.';
  const rawMsg = errorObj.error_user_msg || errorObj.message || String(errorObj);
  const code = errorObj.code;
  if (code === 190) {
    return 'O Token de Acesso do Threads expirou (#190). Gere um novo token nas Configurações.';
  }
  return rawMsg;
}

/**
 * Executa requisição à API do Threads com suporte direto a URLSearchParams (CORS Simple Request sem preflight)
 * e com fallback automático para o proxy nativo do servidor do portal.
 */
async function callThreadsApi(endpoint, method = 'GET', params = {}) {
  const cleanEndpoint = String(endpoint).replace(/^\//, '');

  // 1. Tentativa Direta do Navegador via URLSearchParams (evita OPTIONS preflight HTTP 500 da Meta)
  try {
    let res;
    if (method === 'POST') {
      const formBody = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formBody.append(k, String(v));
      });
      res = await fetch(`https://graph.threads.net/v1.0/${cleanEndpoint}`, {
        method: 'POST',
        body: formBody
      });
    } else {
      const qParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qParams.append(k, String(v));
      });
      res = await fetch(`https://graph.threads.net/v1.0/${cleanEndpoint}?${qParams.toString()}`);
    }

    if (res && res.ok) {
      const data = await res.json();
      return data;
    }
    if (res) {
      const errData = await res.json().catch(() => null);
      if (errData && errData.error) {
        throw new Error(formatThreadsGraphError(errData.error));
      }
    }
  } catch (directErr) {
    console.warn("Chamada direta ao Threads via browser requer proxy ou falhou:", directErr.message);
  }

  // 2. Fallback via Proxy do Servidor do Portal NG Brasil
  try {
    const proxyRes = await fetch('https://portalngbrasil.com.br/upload.php?action=threads_proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: cleanEndpoint,
        method,
        params
      })
    });
    if (proxyRes.ok) {
      const pData = await proxyRes.json();
      if (pData.error) throw new Error(formatThreadsGraphError(pData.error));
      return pData;
    }
  } catch (proxyErr) {
    console.error("Falha no proxy Threads:", proxyErr.message);
  }

  throw new Error("Falha ao comunicar com a API do Threads (CORS/Rede).");
}

/**
 * Publica no Threads oficial (@portalngbrasil) com suporte a imagem ou texto + link.
 */
export async function publishToThreads({
  userId = FALLBACK_META_SETTINGS.threadsUserId,
  token = FALLBACK_META_SETTINGS.threadsToken,
  publicImageUrl = null,
  text = '',
  linkUrl = null
}) {
  const cleanToken = (token || FALLBACK_META_SETTINGS.threadsToken || '').trim();
  const cleanUserId = (userId || FALLBACK_META_SETTINGS.threadsUserId || '').trim();
  if (!cleanToken) throw new Error("Token do Threads não configurado.");
  if (!cleanUserId) throw new Error("ID de usuário do Threads não configurado.");

  // Etapa 1: Criar Container no Threads
  const containerParams = {
    access_token: cleanToken,
    text: text || ''
  };

  if (publicImageUrl) {
    containerParams.media_type = 'IMAGE';
    containerParams.image_url = publicImageUrl;
  } else {
    containerParams.media_type = 'TEXT';
  }

  const containerData = await callThreadsApi(`${cleanUserId}/threads`, 'POST', containerParams);
  if (!containerData || !containerData.id) {
    throw new Error("Erro ao criar container no Threads");
  }

  const creationId = containerData.id;

  // Etapa 2: Se for imagem, aguardar o processamento da mídia
  if (publicImageUrl) {
    let retries = 10;
    while (retries > 0) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const stData = await callThreadsApi(creationId, 'GET', {
          fields: 'status,error_message',
          access_token: cleanToken
        });
        if (stData.status === 'FINISHED') break;
        if (stData.status === 'ERROR') {
          throw new Error("Processamento no Threads falhou: " + (stData.error_message || "Erro de imagem"));
        }
      } catch (pollErr) {
        if (pollErr.message.includes('Processamento no Threads')) throw pollErr;
      }
      retries--;
    }
  }

  // Etapa 3: Publicar Container
  const pubData = await callThreadsApi(`${cleanUserId}/threads_publish`, 'POST', {
    creation_id: creationId,
    access_token: cleanToken
  });

  if (!pubData || !pubData.id) {
    throw new Error("Falha ao publicar container no Threads");
  }

  const publishedId = pubData.id;
  let postUrl = `https://www.threads.net/@portalngbrasil/post/${publishedId}`;

  try {
    const permaData = await callThreadsApi(publishedId, 'GET', {
      fields: 'permalink',
      access_token: cleanToken
    });
    if (permaData && permaData.permalink) {
      postUrl = permaData.permalink;
    }
  } catch (_) {}

  return {
    success: true,
    threadId: publishedId,
    url: postUrl
  };
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
      console.warn("Canvas existente indisponível para exportação, gerando canvas dedicado com auto-fit:", e);
    }
  }

  // Gera canvas dedicado usando o motor gráfico oficial blindado do Portal NG Brasil
  return await renderNgCardToBlob({
    title: article.cardInstagram?.titulo || article.title || '',
    subtitle: article.cardInstagram?.apoio || article.subtitle || '',
    image: article.cardInstagram?.imagem || article.image || article.metadata?.imagem || ''
  }, { aspectRatio: '4:5' });
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
  cards = null,
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
      facebook: null,
      threads: null,
      linkedin: null,
      x: null
    },
    errors: {}
  };

  try {
    // -------------------------------------------------------------
    // ETAPA 1: RESOLVER CARDS DO CARROSSEL (PADRÃO 2 CARDS OU CARROSSEL COMPLETO)
    // -------------------------------------------------------------
    let effectiveCards = cards || article.socialCards || article.cards || null;

    if (!Array.isArray(effectiveCards) || effectiveCards.length === 0) {
      effectiveCards = [
        {
          id: 'card-1',
          mode: 'template',
          mediaType: 'image',
          imageUrl: (article.cardInstagram?.imagem || article.image || article.metadata?.imagem || '').trim(),
          title: article.cardInstagram?.titulo || article.title || '',
          subtitle: article.cardInstagram?.apoio || article.subtitle || '',
          highlightText: article.cardInstagram?.destaque || '',
          categoryLabel: article.categoryLabel || article.category || 'NOTÍCIAS'
        },
        {
          id: 'card-cta',
          mode: 'full_image',
          mediaType: 'image',
          imageUrl: '/siga-portalngbrasil.jpg',
          title: 'Siga @portalngbrasil',
          subtitle: 'Acompanhe as notícias que impactam o país e o mundo.',
          isCtaCard: true
        }
      ];
    } else {
      // Se houver apenas 1 card nos dados e não for o card de CTA, anexa o card oficial de CTA por padrão
      const hasCta = effectiveCards.some(c => c.isCtaCard || (c.imageUrl && c.imageUrl.includes('siga-portalngbrasil')));
      if (effectiveCards.length === 1 && !hasCta) {
        effectiveCards = [
          ...effectiveCards,
          {
            id: 'card-cta',
            mode: 'full_image',
            mediaType: 'image',
            imageUrl: '/siga-portalngbrasil.jpg',
            title: 'Siga @portalngbrasil',
            subtitle: 'Acompanhe as notícias que impactam o país e o mundo.',
            isCtaCard: true
          }
        ];
      }
    }

    // -------------------------------------------------------------
    // ETAPA 2: SALVAR NO PORTAL NG BRASIL (FIRESTORE 'news' e 'drafts')
    // -------------------------------------------------------------
    onProgress({ step: 'portal', message: '🚀 Publicando no Portal NG Brasil...' });
    
    // Garante que a foto de capa do portal use a imagem do card/customizada pelo usuário com máxima prioridade
    const resolvedCoverImage = (
      article.cardInstagram?.imagem ||
      effectiveCards?.[0]?.imageUrl ||
      article.socialCards?.[0]?.imageUrl ||
      article.cards?.[0]?.imageUrl ||
      article.image ||
      article.metadata?.imagem ||
      ''
    ).trim();

    const publishedPayload = {
      ...article,
      id: finalArticleId,
      title: article.title || '',
      subtitle: article.subtitle || '',
      category: article.category || 'geral',
      categoryLabel: article.category ? (article.category.charAt(0).toUpperCase() + article.category.slice(1)) : 'Geral',
      praca: article.praca || 'Nacional',
      image: resolvedCoverImage,
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
      socialCards: effectiveCards,
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
        approvalNotes: approvalNotes,
        socialCards: effectiveCards
      });
    } catch (e) {
      // Se não estiver em drafts, tudo bem
    }

    result.links.site = siteUrl;
    result.links.share = shareUrl;

    // -------------------------------------------------------------
    // ETAPA 3: GERAR E HOSPEDAR TODAS AS ARTES DAS REDES SOCIAIS (CARROSSEL)
    // -------------------------------------------------------------
    onProgress({ step: 'image', message: `🎨 Renderizando ${effectiveCards.length} cards para Instagram e Redes Sociais...` });

    const mediaItems = [];
    const imageBlobs = [];
    const imageUrls = [];

    for (let i = 0; i < effectiveCards.length; i++) {
      const card = effectiveCards[i];
      const isFirstCard = i === 0;

      if (card.mediaType === 'video' && (card.videoFile || card.videoUrl)) {
        onProgress({ step: 'video_upload', message: `🎥 Hospedando vídeo do slide ${i + 1} de ${effectiveCards.length}...` });
        try {
          const uploadedVideoUrl = await uploadVideoForSocial(card.videoFile || card.videoUrl);
          mediaItems.push({
            type: 'video',
            url: uploadedVideoUrl,
            blob: card.videoFile || null
          });
        } catch (vidErr) {
          console.warn(`Erro no upload do vídeo ${i + 1}:`, vidErr.message);
          result.errors[`videoUpload_${i + 1}`] = vidErr.message;
        }
      } else {
        onProgress({ step: 'image_render', message: `🎨 Renderizando arte do card ${i + 1} de ${effectiveCards.length}...` });
        
        let cardBlob = null;
        if (isFirstCard && canvas && canvas.width > 0 && canvas.height > 0) {
          try {
            cardBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
          } catch (e) {
            console.warn("Falha ao capturar blob do canvas:", e);
          }
        }

        if (!cardBlob) {
          try {
            cardBlob = await renderCardSlideToBlob(card, {
              aspectRatio: '4:5',
              title: card.title || publishedPayload.cardInstagram?.titulo || publishedPayload.title,
              subtitle: card.subtitle || publishedPayload.cardInstagram?.apoio || publishedPayload.subtitle,
              imageUrl: card.imageUrl || card.image || publishedPayload.cardInstagram?.imagem || publishedPayload.image,
              customHighlightText: card.highlightText || publishedPayload.cardInstagram?.destaque
            });
          } catch (renderErr) {
            console.warn(`Erro ao renderizar card ${i + 1}:`, renderErr);
          }
        }

        if (cardBlob) {
          imageBlobs.push(cardBlob);
          onProgress({ step: 'upload', message: `☁️ Hospedando arte ${i + 1} de ${effectiveCards.length} em alta definição...` });
          try {
            const uploadedUrl = await uploadImageForSocial(cardBlob, conf.imgbbKey);
            if (uploadedUrl) {
              imageUrls.push(uploadedUrl);
              mediaItems.push({
                type: 'image',
                url: uploadedUrl,
                blob: cardBlob
              });
            }
          } catch (upErr) {
            console.warn(`Falha no upload da arte ${i + 1}:`, upErr.message);
            result.errors[`imageUpload_${i + 1}`] = upErr.message;
          }
        }
      }
    }

    const publicImageUrl = imageUrls[0] || null;
    const caption = formatInstagramCaption(publishedPayload);
    const fbCaption = formatFacebookCaption(publishedPayload, shareUrl);

    // -------------------------------------------------------------
    // ETAPA 4: PUBLICAR NO FACEBOOK (COM LINK E PRÉVIA DO PORTAL)
    // -------------------------------------------------------------
    if (conf.metaFbPageId && conf.metaToken) {
      onProgress({ step: 'facebook', message: '📘 Publicando no Facebook com link e prévia do portal...' });
      try {
        const fbRes = await publishToFacebookPage({
          pageId: conf.metaFbPageId,
          token: conf.metaToken,
          message: fbCaption,
          linkUrl: shareUrl,
          asPhoto: false
        });
        if (fbRes && (fbRes.postId || fbRes.url)) {
          result.links.facebook = fbRes.url || `https://www.facebook.com/${fbRes.postId}`;
          console.log("Facebook postado com sucesso:", result.links.facebook);
        } else {
          result.errors.facebook = "Falha ao publicar no Facebook (resposta sem confirmação de ID).";
        }
      } catch (fbErr) {
        console.error("Exceção ao postar no Facebook:", fbErr);
        result.errors.facebook = fbErr.message;
      }
    } else {
      result.errors.facebook = "Token da Meta ou ID da Página do Facebook não configurados.";
    }

    // -------------------------------------------------------------
    // ETAPA 5: PUBLICAR NO INSTAGRAM FEED (CARD ÚNICO OU CARROSSEL COMPLETO)
    // -------------------------------------------------------------
    if (!conf.metaIgAccountId || !conf.metaToken) {
      result.errors.instagram = "Token da Meta ou ID da Conta do Instagram não configurados.";
    } else if (mediaItems.length === 0) {
      result.errors.instagram = "Falha ao renderizar ou hospedar a arte dos cards para o Instagram.";
    } else {
      try {
        const safeCaption = caption.length > 2100 ? caption.substring(0, 2100) + '...' : caption;

        if (mediaItems.length === 1) {
          // Publicação de Card Único no Instagram
          const single = mediaItems[0];
          onProgress({ step: 'instagram_container', message: '📸 Criando publicação no Instagram...' });

          const payload = single.type === 'video'
            ? { media_type: 'REELS', video_url: single.url, caption: safeCaption, access_token: conf.metaToken }
            : { image_url: single.url, caption: safeCaption, access_token: conf.metaToken };

          const igMediaRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const igMediaData = await igMediaRes.json();
          if (igMediaData.error) {
            throw new Error("Container Instagram: " + (igMediaData.error.error_user_msg || igMediaData.error.message));
          }

          const creationId = igMediaData.id;
          onProgress({ step: 'instagram_processing', message: '⏳ Instagram processando imagem em alta resolução...' });

          let retries = single.type === 'video' ? 24 : 12;
          while (retries > 0) {
            await new Promise(r => setTimeout(r, 3000));
            try {
              const statusRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${conf.metaToken}`);
              const statusData = await statusRes.json();
              if (statusData.status_code === 'FINISHED') {
                break;
              } else if (statusData.status_code === 'ERROR') {
                throw new Error("Processamento Instagram falhou: " + (statusData.status || "Formato de mídia"));
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

          if (igPublishData.id) {
            result.links.instagram = `https://www.instagram.com/p/${igPublishData.id}/`;
            try {
              const permaRes = await fetch(`https://graph.facebook.com/v20.0/${igPublishData.id}?fields=permalink&access_token=${conf.metaToken}`);
              const permaData = await permaRes.json();
              if (permaData.permalink) result.links.instagram = permaData.permalink;
            } catch (_) {}
          }
        } else {
          // Publicação de CARROSSEL COMPLETO (Fotos e Vídeos)
          onProgress({ step: 'instagram_carousel', message: `📸 Criando carrossel de ${mediaItems.length} cards no Instagram...` });

          const childrenIds = [];
          for (let i = 0; i < mediaItems.length; i++) {
            const item = mediaItems[i];
            onProgress({
              step: 'instagram_slide',
              message: `Slide ${i + 1} de ${mediaItems.length} (${item.type === 'video' ? 'Vídeo' : 'Foto'}) no Instagram...`
            });

            const childPayload = item.type === 'video'
              ? {
                  media_type: 'VIDEO',
                  video_url: item.url,
                  is_carousel_item: true,
                  access_token: conf.metaToken
                }
              : {
                  image_url: item.url,
                  is_carousel_item: true,
                  access_token: conf.metaToken
                };

            const itemRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(childPayload)
            });
            const itemData = await itemRes.json();
            if (itemData.error) {
              throw new Error(`Slide ${i + 1} Instagram: ` + (itemData.error.error_user_msg || itemData.error.message));
            }

            if (itemData.id) {
              if (item.type === 'video') {
                let childRetries = 24;
                while (childRetries > 0) {
                  onProgress({ step: 'instagram_video_proc', message: `Processando vídeo do slide ${i + 1}...` });
                  await new Promise(r => setTimeout(r, 4000));
                  try {
                    const stRes = await fetch(`https://graph.facebook.com/v20.0/${itemData.id}?fields=status_code,status&access_token=${conf.metaToken}`);
                    const stData = await stRes.json();
                    if (stData.status_code === 'FINISHED') break;
                    if (stData.status_code === 'ERROR') throw new Error(`Processamento do vídeo ${i + 1} falhou.`);
                  } catch (errVid) {
                    if (errVid.message.includes('Processamento do vídeo')) throw errVid;
                  }
                  childRetries--;
                }
              }
              childrenIds.push(itemData.id);
            }
          }

          if (childrenIds.length < 2) {
            throw new Error("Carrossel requer pelo menos 2 slides processados com sucesso pelo Instagram.");
          }

          onProgress({ step: 'instagram_carousel_container', message: 'Montando Carrossel oficial no Instagram...' });
          const carouselRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              children: childrenIds,
              caption: safeCaption,
              access_token: conf.metaToken
            })
          });
          const carouselData = await carouselRes.json();
          if (carouselData.error) {
            throw new Error("Container Carrossel Instagram: " + (carouselData.error.error_user_msg || carouselData.error.message));
          }

          const carouselCreationId = carouselData.id;
          onProgress({ step: 'instagram_carousel_proc', message: 'Aguardando processamento do Carrossel pelo Instagram...' });

          let retries = 18;
          while (retries > 0) {
            await new Promise(r => setTimeout(r, 3500));
            try {
              const statusRes = await fetch(`https://graph.facebook.com/v20.0/${carouselCreationId}?fields=status_code,status&access_token=${conf.metaToken}`);
              const statusData = await statusRes.json();
              if (statusData.status_code === 'FINISHED') {
                break;
              } else if (statusData.status_code === 'ERROR') {
                throw new Error("Processamento do Carrossel falhou: " + (statusData.status || "Formato rejeitado"));
              }
            } catch (stErr) {
              if (stErr.message.includes('Processamento do Carrossel')) throw stErr;
            }
            retries--;
          }

          onProgress({ step: 'instagram_publish', message: `✨ Publicando Carrossel (${childrenIds.length} cards) no Feed do Instagram...` });
          const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: carouselCreationId,
              access_token: conf.metaToken
            })
          });
          const igPublishData = await igPublishRes.json();
          if (igPublishData.error) {
            throw new Error("Publicação Carrossel Instagram: " + (igPublishData.error.error_user_msg || igPublishData.error.message));
          }

          if (igPublishData.id) {
            result.links.instagram = `https://www.instagram.com/p/${igPublishData.id}/`;
            try {
              const permaRes = await fetch(`https://graph.facebook.com/v20.0/${igPublishData.id}?fields=permalink&access_token=${conf.metaToken}`);
              const permaData = await permaRes.json();
              if (permaData.permalink) result.links.instagram = permaData.permalink;
            } catch (_) {}
          }
          console.log("Carrossel Instagram publicado com sucesso:", result.links.instagram);
        }
      } catch (igErr) {
        console.error("Exceção ao postar no Instagram:", igErr);
        result.errors.instagram = igErr.message;
      }
    }

    // -------------------------------------------------------------
    // ETAPA 4.5: PUBLICAR NO THREADS (@portalngbrasil)
    // -------------------------------------------------------------
    const effectiveThreadsToken = (conf.threadsToken || FALLBACK_META_SETTINGS.threadsToken || '').trim();
    const effectiveThreadsUserId = (conf.threadsUserId || FALLBACK_META_SETTINGS.threadsUserId || '').trim();

    if (effectiveThreadsToken && effectiveThreadsUserId) {
      onProgress({ step: 'threads', message: '🧵 Publicando no Threads (@portalngbrasil)...' });
      try {
        const threadsCaption = formatThreadsCaption(publishedPayload, shareUrl);
        const thRes = await publishToThreads({
          userId: effectiveThreadsUserId,
          token: effectiveThreadsToken,
          publicImageUrl,
          text: threadsCaption,
          linkUrl: shareUrl
        });
        result.links.threads = thRes.url || `https://www.threads.net/@portalngbrasil`;
        console.log("Threads publicado com sucesso:", result.links.threads);
      } catch (thErr) {
        console.error("Exceção ao postar no Threads:", thErr);
        result.errors.threads = thErr.message;
      }
    }

    // -------------------------------------------------------------
    // ETAPA 4.6: PUBLICAR NO LINKEDIN (Company Page Oficial)
    // -------------------------------------------------------------
    try {
      onProgress({ step: 'linkedin', message: '💼 Publicando na Company Page do LinkedIn...' });
      const liRes = await publishArticleToLinkedIn({
        article: publishedPayload,
        shareUrl,
        settings: {
          linkedinToken: settings?.linkedinToken,
          linkedinOrgId: settings?.linkedinOrgId
        }
      });
      if (liRes.success) {
        result.links.linkedin = liRes.url;
        console.log("LinkedIn publicado com sucesso:", result.links.linkedin);
      } else if (liRes.error && !liRes.error.includes('não configurado')) {
        result.errors.linkedin = liRes.error;
      }
    } catch (liErr) {
      console.warn("Aviso ao postar no LinkedIn:", liErr.message);
      result.errors.linkedin = liErr.message;
    }

    // -------------------------------------------------------------
    // ETAPA 4.7: PUBLICAR NO X / TWITTER (@portalngbrasil)
    // -------------------------------------------------------------
    try {
      onProgress({ step: 'x', message: '🐦 Publicando no X (@portalngbrasil)...' });
      const xRes = await publishArticleToX({
        article: publishedPayload,
        shareUrl,
        mediaBlob: imageBlobs[0] || null,
        mediaUrl: publicImageUrl,
        settings: {
          xApiKey: settings?.xApiKey,
          xApiSecret: settings?.xApiSecret,
          xAccessToken: settings?.xAccessToken,
          xAccessSecret: settings?.xAccessSecret,
          xBearerToken: settings?.xBearerToken,
          xUsername: settings?.xUsername
        }
      });
      if (xRes.success) {
        result.links.x = xRes.url;
        console.log("X (Twitter) publicado com sucesso:", result.links.x);
      } else if (xRes.error && !xRes.error.includes('não configuradas')) {
        result.errors.x = xRes.error;
      }
    } catch (xErr) {
      console.warn("Aviso ao postar no X:", xErr.message);
      result.errors.x = xErr.message;
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

/**
 * Reenvia a publicação de uma matéria para uma rede social específica (retry pontual)
 */
export async function retryPlatformPublish({
  platform,
  article,
  shareUrl = null,
  canvas = null,
  cards = null,
  settings = {},
  onProgress = () => {}
}) {
  if (!article) throw new Error("Artigo não informado para reenvio.");
  const conf = await getLiveMetaSettings(settings);
  const finalArticleId = String(article.id || `news-${Date.now()}`);
  const effectiveShareUrl = shareUrl || `https://portalngbrasil.com.br/share.php?id=${finalArticleId}`;

  let resultUrl = null;

  if (platform === 'facebook') {
    onProgress({ step: 'facebook', message: 'Reenviando para o Facebook...' });
    if (!conf.metaFbPageId || !conf.metaToken) {
      throw new Error("Token do Meta ou ID da Página do Facebook não configurados.");
    }
    const fbCaption = formatFacebookCaption(article, effectiveShareUrl);
    const fbRes = await publishToFacebookPage({
      pageId: conf.metaFbPageId,
      token: conf.metaToken,
      message: fbCaption,
      linkUrl: effectiveShareUrl,
      asPhoto: false
    });
    resultUrl = fbRes.url || (fbRes.postId ? `https://www.facebook.com/${fbRes.postId}` : null);
    if (!resultUrl) throw new Error("Facebook não retornou confirmação da publicação.");

  } else if (platform === 'instagram') {
    onProgress({ step: 'instagram', message: 'Reenviando para o Instagram...' });
    if (!conf.metaIgAccountId || !conf.metaToken) {
      throw new Error("Token do Meta ou ID da Conta do Instagram não configurados.");
    }

    let effectiveCards = cards || article.socialCards || article.cards || null;
    if (!Array.isArray(effectiveCards) || effectiveCards.length === 0) {
      effectiveCards = [
        {
          id: 'card-1',
          mode: 'template',
          mediaType: 'image',
          imageUrl: (article.cardInstagram?.imagem || article.image || article.metadata?.imagem || '').trim(),
          title: article.cardInstagram?.titulo || article.title || '',
          subtitle: article.cardInstagram?.apoio || article.subtitle || '',
          highlightText: article.cardInstagram?.destaque || '',
          categoryLabel: article.categoryLabel || article.category || 'NOTÍCIAS'
        },
        {
          id: 'card-cta',
          mode: 'full_image',
          mediaType: 'image',
          imageUrl: '/siga-portalngbrasil.jpg',
          title: 'Siga @portalngbrasil',
          subtitle: 'Acompanhe as notícias que impactam o país e o mundo.',
          isCtaCard: true
        }
      ];
    } else if (effectiveCards.length === 1 && !effectiveCards.some(c => c.isCtaCard || (c.imageUrl && c.imageUrl.includes('siga-portalngbrasil')))) {
      effectiveCards = [
        ...effectiveCards,
        {
          id: 'card-cta',
          mode: 'full_image',
          mediaType: 'image',
          imageUrl: '/siga-portalngbrasil.jpg',
          title: 'Siga @portalngbrasil',
          subtitle: 'Acompanhe as notícias que impactam o país e o mundo.',
          isCtaCard: true
        }
      ];
    }

    const mediaItems = [];
    for (let i = 0; i < effectiveCards.length; i++) {
      const card = effectiveCards[i];
      if (card.mediaType === 'video' && (card.videoFile || card.videoUrl)) {
        const upVidUrl = await uploadVideoForSocial(card.videoFile || card.videoUrl);
        mediaItems.push({ type: 'video', url: upVidUrl });
      } else {
        let cardBlob = null;
        if (i === 0 && canvas && canvas.width > 0 && canvas.height > 0) {
          try {
            cardBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
          } catch (_) {}
        }
        if (!cardBlob) {
          cardBlob = await renderCardSlideToBlob(card, {
            aspectRatio: '4:5',
            title: card.title || article.cardInstagram?.titulo || article.title,
            subtitle: card.subtitle || article.cardInstagram?.apoio || article.subtitle,
            imageUrl: card.imageUrl || card.image || article.cardInstagram?.imagem || article.image,
            customHighlightText: card.highlightText || article.cardInstagram?.destaque
          });
        }
        if (cardBlob) {
          const upUrl = await uploadImageForSocial(cardBlob, conf.imgbbKey);
          if (upUrl) mediaItems.push({ type: 'image', url: upUrl });
        }
      }
    }

    if (mediaItems.length === 0) {
      throw new Error("Falha ao gerar/hospedar os cards da notícia para o Instagram.");
    }

    const caption = formatInstagramCaption(article);
    const safeCaption = caption.length > 2100 ? caption.substring(0, 2100) + '...' : caption;
    resultUrl = null;

    if (mediaItems.length === 1) {
      const single = mediaItems[0];
      const payload = single.type === 'video'
        ? { media_type: 'REELS', video_url: single.url, caption: safeCaption, access_token: conf.metaToken }
        : { image_url: single.url, caption: safeCaption, access_token: conf.metaToken };

      const mRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const mData = await mRes.json();
      if (mData.error) throw new Error("Instagram: " + (mData.error.error_user_msg || mData.error.message));

      const creationId = mData.id;
      let retries = single.type === 'video' ? 24 : 12;
      while (retries > 0) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const stRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${conf.metaToken}`);
          const stData = await stRes.json();
          if (stData.status_code === 'FINISHED') break;
          if (stData.status_code === 'ERROR') throw new Error("Processamento Instagram falhou.");
        } catch (stErr) {
          if (stErr.message.includes('Processamento Instagram')) throw stErr;
        }
        retries--;
      }

      const pubRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationId, access_token: conf.metaToken })
      });
      const pubData = await pubRes.json();
      if (pubData.error) throw new Error("Publicação Instagram: " + (pubData.error.error_user_msg || pubData.error.message));
      if (pubData.id) {
        resultUrl = `https://www.instagram.com/p/${pubData.id}/`;
        try {
          const pRes = await fetch(`https://graph.facebook.com/v20.0/${pubData.id}?fields=permalink&access_token=${conf.metaToken}`);
          const pData = await pRes.json();
          if (pData.permalink) resultUrl = pData.permalink;
        } catch (_) {}
      }
    } else {
      // Carrossel
      const childrenIds = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const childPayload = item.type === 'video'
          ? { media_type: 'VIDEO', video_url: item.url, is_carousel_item: true, access_token: conf.metaToken }
          : { image_url: item.url, is_carousel_item: true, access_token: conf.metaToken };

        const cRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(childPayload)
        });
        const cData = await cRes.json();
        if (cData.error) throw new Error(`Slide ${i + 1} Instagram: ` + (cData.error.error_user_msg || cData.error.message));
        if (cData.id) childrenIds.push(cData.id);
      }

      if (childrenIds.length < 2) {
        throw new Error("Carrossel requer pelo menos 2 slides no Instagram.");
      }

      const carRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childrenIds,
          caption: safeCaption,
          access_token: conf.metaToken
        })
      });
      const carData = await carRes.json();
      if (carData.error) throw new Error("Container Carrossel: " + (carData.error.error_user_msg || carData.error.message));

      const carouselCreationId = carData.id;
      let retries = 18;
      while (retries > 0) {
        await new Promise(r => setTimeout(r, 3500));
        try {
          const stRes = await fetch(`https://graph.facebook.com/v20.0/${carouselCreationId}?fields=status_code,status&access_token=${conf.metaToken}`);
          const stData = await stRes.json();
          if (stData.status_code === 'FINISHED') break;
          if (stData.status_code === 'ERROR') throw new Error("Processamento Carrossel falhou.");
        } catch (stErr) {
          if (stErr.message.includes('Processamento Carrossel')) throw stErr;
        }
        retries--;
      }

      const carPubRes = await fetch(`https://graph.facebook.com/v20.0/${conf.metaIgAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: carouselCreationId, access_token: conf.metaToken })
      });
      const carPubData = await carPubRes.json();
      if (carPubData.error) throw new Error("Publicação Carrossel: " + (carPubData.error.error_user_msg || carPubData.error.message));
      if (carPubData.id) {
        resultUrl = `https://www.instagram.com/p/${carPubData.id}/`;
        try {
          const pRes = await fetch(`https://graph.facebook.com/v20.0/${carPubData.id}?fields=permalink&access_token=${conf.metaToken}`);
          const pData = await pRes.json();
          if (pData.permalink) resultUrl = pData.permalink;
        } catch (_) {}
      }
    }

    if (!resultUrl) {
      throw new Error("Instagram não confirmou a publicação da publicação.");
    }

  } else if (platform === 'threads') {
    onProgress({ step: 'threads', message: 'Reenviando para o Threads...' });
    const effectiveThreadsToken = (conf.threadsToken || FALLBACK_META_SETTINGS.threadsToken || '').trim();
    const effectiveThreadsUserId = (conf.threadsUserId || FALLBACK_META_SETTINGS.threadsUserId || '').trim();
    if (!effectiveThreadsToken || !effectiveThreadsUserId) {
      throw new Error("Token e ID do Threads não configurados.");
    }
    const text = formatThreadsCaption(article, effectiveShareUrl);
    const publicImageUrl = (article.image || '').trim() || null;
    const thRes = await publishToThreads({
      userId: effectiveThreadsUserId,
      token: effectiveThreadsToken,
      publicImageUrl,
      text,
      linkUrl: effectiveShareUrl
    });
    resultUrl = thRes.url || 'https://www.threads.net/@portalngbrasil';

  } else if (platform === 'linkedin') {
    onProgress({ step: 'linkedin', message: 'Reenviando para o LinkedIn...' });
    const liRes = await publishArticleToLinkedIn({
      article,
      shareUrl: effectiveShareUrl,
      settings: {
        linkedinToken: settings?.linkedinToken || localStorage.getItem('portal_ng_linkedin_token'),
        linkedinOrgId: settings?.linkedinOrgId || localStorage.getItem('portal_ng_linkedin_org_id')
      }
    });
    if (liRes.success) {
      resultUrl = liRes.url;
    } else {
      throw new Error(liRes.error || "Falha ao reenviar para o LinkedIn.");
    }

  } else if (platform === 'x') {
    onProgress({ step: 'x', message: 'Reenviando para o X (Twitter)...' });
    const xRes = await publishArticleToX({
      article,
      shareUrl: effectiveShareUrl,
      settings: {
        xApiKey: settings?.xApiKey || localStorage.getItem('portal_ng_x_api_key'),
        xApiSecret: settings?.xApiSecret || localStorage.getItem('portal_ng_x_api_secret'),
        xAccessToken: settings?.xAccessToken || localStorage.getItem('portal_ng_x_access_token'),
        xAccessSecret: settings?.xAccessSecret || localStorage.getItem('portal_ng_x_access_secret'),
        xBearerToken: settings?.xBearerToken || localStorage.getItem('portal_ng_x_bearer_token'),
        xUsername: settings?.xUsername || localStorage.getItem('portal_ng_x_username')
      }
    });
    if (xRes.success) {
      resultUrl = xRes.url;
    } else {
      throw new Error(xRes.error || "Falha ao reenviar para o X.");
    }
  } else {
    throw new Error(`Plataforma ${platform} não suportada.`);
  }

  // Atualiza Firestore com o novo link
  if (article.id && resultUrl) {
    try {
      await updateDoc(doc(db, 'news', String(article.id)), {
        [`socialLinks.${platform}`]: resultUrl,
        [`socialErrors.${platform}`]: null
      });
      await updateDoc(doc(db, 'drafts', String(article.id)), {
        [`socialLinks.${platform}`]: resultUrl,
        [`socialErrors.${platform}`]: null
      });
    } catch (_) {}
  }

  return {
    success: true,
    url: resultUrl
  };
}
