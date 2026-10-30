import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatXCaption } from './socialExporter';

export const FALLBACK_X_SETTINGS = {
  xApiKey: 'teHpJ1Cmw3uXEIfWRIqRInZux',
  xApiSecret: 'tyAAWtBNCczs84PNnYHEJTcJAPWa31MlU3JLqIaQdX3tGmigS4',
  xClientId: 'QkdCUEZPZWtuYTdONVd5YkZISzQ6MTpjaQ',
  xClientSecret: 'LLzasof3DC6kGCREytzq2XgjCZbJARQxQUZbTUvqRiO_HRmWGK',
  xAccessToken: '2011249028273451008-a8oG3gCPkl7JxPS7uhI7eG7feWRYbe',
  xAccessSecret: 'dCFifuYoQNfVqz32MVdj1qx8STMUeHL59h6VkAUWy8r68',
  xBearerToken: 'AAAAAAAAAAAAAAAAAAAAALKGAAIAAAAAP98Fmf0pMDI7kWlwsrjsFU3JSLU%3DxuFdfZ65P69HQZeqAIgFLjSt2iQ7vq4pvjuGuVoKA3VJ8M0AOf',
  xUsername: 'portalngbrasi'
};

/**
 * Carrega as credenciais ativas do X (Twitter) (Firestore + localStorage + customSettings)
 */
export async function getLiveXSettings(customSettings = {}) {
  const merged = { ...FALLBACK_X_SETTINGS };

  try {
    const [globalSnap, configSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'global')).catch(() => null),
      getDoc(doc(db, 'config', 'settings')).catch(() => null)
    ]);

    const applyData = (data) => {
      if (!data) return;
      if (data.xApiKey && String(data.xApiKey).trim()) merged.xApiKey = String(data.xApiKey).trim();
      if (data.xApiSecret && String(data.xApiSecret).trim()) merged.xApiSecret = String(data.xApiSecret).trim();
      if (data.xAccessToken && String(data.xAccessToken).trim()) merged.xAccessToken = String(data.xAccessToken).trim();
      if (data.xAccessSecret && String(data.xAccessSecret).trim()) merged.xAccessSecret = String(data.xAccessSecret).trim();
      if (data.xBearerToken && String(data.xBearerToken).trim()) merged.xBearerToken = String(data.xBearerToken).trim();
      if (data.xUsername && String(data.xUsername).trim()) merged.xUsername = String(data.xUsername).trim();
    };

    if (configSnap && configSnap.exists()) applyData(configSnap.data());
    if (globalSnap && globalSnap.exists()) applyData(globalSnap.data());
  } catch (e) {
    console.warn('[X/Twitter] Falha ao ler Firestore, usando cache local:', e.message);
  }

  if (typeof window !== 'undefined') {
    const lsApiKey = localStorage.getItem('portal_ng_x_api_key');
    const lsApiSecret = localStorage.getItem('portal_ng_x_api_secret');
    const lsAccessToken = localStorage.getItem('portal_ng_x_access_token');
    const lsAccessSecret = localStorage.getItem('portal_ng_x_access_secret');
    const lsBearerToken = localStorage.getItem('portal_ng_x_bearer_token');
    const lsUsername = localStorage.getItem('portal_ng_x_username');

    if (lsApiKey && lsApiKey.trim()) merged.xApiKey = lsApiKey.trim();
    if (lsApiSecret && lsApiSecret.trim()) merged.xApiSecret = lsApiSecret.trim();
    if (lsAccessToken && lsAccessToken.trim()) merged.xAccessToken = lsAccessToken.trim();
    if (lsAccessSecret && lsAccessSecret.trim()) merged.xAccessSecret = lsAccessSecret.trim();
    if (lsBearerToken && lsBearerToken.trim()) merged.xBearerToken = lsBearerToken.trim();
    if (lsUsername && lsUsername.trim()) merged.xUsername = lsUsername.trim();
  }

  Object.entries(customSettings || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      merged[k] = typeof v === 'string' ? v.trim() : v;
    }
  });

  return merged;
}

/**
 * Converte um Blob em Base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Publica uma matéria diretamente no X (antigo Twitter) via endpoint seguro com suporte a OAuth 1.0a e 2.0
 */
export async function publishArticleToX({
  article,
  shareUrl = '',
  customCaption = '',
  mediaUrl = '',
  mediaBlob = null,
  settings = {}
}) {
  if (!article) {
    throw new Error('Matéria inválida para publicação no X.');
  }

  const liveSettings = await getLiveXSettings(settings);
  const username = (liveSettings.xUsername || FALLBACK_X_SETTINGS.xUsername).replace(/^@/, '');
  const profileUrl = `https://x.com/${username}`;

  const hasOAuth1 = liveSettings.xApiKey && liveSettings.xApiSecret && liveSettings.xAccessToken && liveSettings.xAccessSecret;
  const hasOAuth2 = Boolean(liveSettings.xBearerToken);

  if (!hasOAuth1 && !hasOAuth2) {
    return {
      success: false,
      url: profileUrl,
      error: 'Credenciais da API do X não configuradas. Preencha API Key, API Secret, Access Token e Access Secret nas Configurações.'
    };
  }

  const targetShareUrl = shareUrl || (article.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br');
  const tweetText = customCaption || formatXCaption(article, targetShareUrl);

  // Prepara mídia se houver
  let mediaData = '';
  if (mediaBlob) {
    try {
      mediaData = await blobToBase64(mediaBlob);
    } catch (e) {
      console.warn('[X/Twitter] Falha ao converter imagem para base64:', e);
    }
  }

  const payload = {
    text: tweetText,
    username: username,
    apiKey: liveSettings.xApiKey,
    apiSecret: liveSettings.xApiSecret,
    accessToken: liveSettings.xAccessToken,
    accessSecret: liveSettings.xAccessSecret,
    bearerToken: liveSettings.xBearerToken,
    mediaUrl: mediaUrl || '',
    mediaData: mediaData || ''
  };

  // Determina endpoint (relativo se estiver rodando no mesmo domínio ou caminho absoluto no servidor oficial)
  const isLocalOrPortal = typeof window !== 'undefined' && (
    window.location.hostname.includes('portalngbrasil') || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  
  const endpointCandidates = [
    '/x-publisher.php',
    'https://portalngbrasil.com.br/x-publisher.php'
  ];

  let lastError = null;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json().catch(() => ({}));

      if (response.ok && resData.success) {
        return {
          success: true,
          id: resData.id,
          url: resData.url || `https://x.com/${username}/status/${resData.id}`,
          error: null
        };
      }

      if (resData.error) {
        lastError = resData.error;
      } else {
        lastError = `Erro HTTP ${response.status}: ${response.statusText}`;
      }

      // Se o endpoint retornou erro da API do X (401, 403, 400), não precisa tentar o fallback
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        break;
      }
    } catch (fetchErr) {
      lastError = fetchErr.message;
      // Continua para o próximo endpoint candidato
    }
  }

  return {
    success: false,
    url: profileUrl,
    error: lastError || 'Falha ao conectar com o serviço de publicação do X.'
  };
}
