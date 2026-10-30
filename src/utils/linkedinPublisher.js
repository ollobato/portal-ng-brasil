import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatLinkedInCaption } from './socialExporter';

export const FALLBACK_LINKEDIN_SETTINGS = {
  linkedinOrgId: '145261110',
  linkedinToken: ''
};

/**
 * Carrega as configurações ativas do LinkedIn (Firestore + localStorage + fallbacks)
 */
export async function getLiveLinkedInSettings(customSettings = {}) {
  const merged = { ...FALLBACK_LINKEDIN_SETTINGS };

  try {
    const [globalSnap, configSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'global')).catch(() => null),
      getDoc(doc(db, 'config', 'settings')).catch(() => null)
    ]);

    const applyData = (data) => {
      if (!data) return;
      if (data.linkedinToken && String(data.linkedinToken).trim()) {
        merged.linkedinToken = String(data.linkedinToken).trim();
      }
      if (data.linkedinOrgId && String(data.linkedinOrgId).trim()) {
        merged.linkedinOrgId = String(data.linkedinOrgId).trim();
      }
    };

    if (configSnap && configSnap.exists()) applyData(configSnap.data());
    if (globalSnap && globalSnap.exists()) applyData(globalSnap.data());
  } catch (e) {
    console.warn('[LinkedIn] Falha ao ler Firestore, usando cache local:', e.message);
  }

  if (typeof window !== 'undefined') {
    const lsToken = localStorage.getItem('portal_ng_linkedin_token');
    const lsOrgId = localStorage.getItem('portal_ng_linkedin_org_id');
    if (lsToken && lsToken.trim()) merged.linkedinToken = lsToken.trim();
    if (lsOrgId && lsOrgId.trim()) merged.linkedinOrgId = lsOrgId.trim();
  }

  Object.entries(customSettings || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      merged[k] = typeof v === 'string' ? v.trim() : v;
    }
  });

  return merged;
}

/**
 * Publica uma matéria diretamente na Company Page do Portal NG Brasil no LinkedIn
 */
export async function publishArticleToLinkedIn({
  article,
  shareUrl = '',
  customCaption = '',
  settings = {}
}) {
  if (!article) {
    throw new Error('Matéria inválida para publicação no LinkedIn.');
  }

  const liveSettings = await getLiveLinkedInSettings(settings);
  const token = (liveSettings.linkedinToken || '').trim();
  const orgId = (liveSettings.linkedinOrgId || FALLBACK_LINKEDIN_SETTINGS.linkedinOrgId).trim();

  if (!token) {
    return {
      success: false,
      url: `https://www.linkedin.com/company/${orgId || 'portalngbrasil'}`,
      error: 'Token de Acesso do LinkedIn não configurado. Adicione o token no painel de configurações.'
    };
  }

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const targetUrl = shareUrl || (article.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br');
  const caption = customCaption || formatLinkedInCaption(article, targetUrl);

  const authorUrn = orgId.startsWith('urn:li:')
    ? orgId
    : `urn:li:organization:${orgId}`;

  // 1. Tenta publicação via ugcPosts API (padrão estável para Company Pages)
  try {
    const ugcPayload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: caption
          },
          shareMediaCategory: 'ARTICLE',
          media: [
            {
              status: 'READY',
              description: {
                text: subtitle || 'Acompanhe a matéria completa no Portal NG Brasil.'
              },
              originalUrl: targetUrl,
              title: {
                text: title
              }
            }
          ]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(ugcPayload)
    });

    if (res.ok) {
      const data = await res.json();
      const postId = data.id || '';
      const permalink = postId
        ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}/`
        : `https://www.linkedin.com/company/${orgId}/`;

      return {
        success: true,
        id: postId,
        url: permalink,
        error: null
      };
    }

    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.message || res.statusText || 'Erro ao publicar no LinkedIn';

    // Se for erro de permissão do autor
    if (res.status === 403) {
      return {
        success: false,
        url: `https://www.linkedin.com/company/${orgId}/`,
        error: `LinkedIn (403): Permissão corporativa pendente. Aguarde a aprovação da Community Management API pela Microsoft para seu token.`
      };
    }

    // Se a versão/endpoint pedir fallback para o endpoint /rest/posts
    if (res.status === 426 || res.status === 404) {
      const restPayload = {
        author: authorUrn,
        commentary: caption,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        content: {
          article: {
            source: targetUrl,
            title: title,
            description: subtitle || 'Portal NG Brasil'
          }
        },
        lifecycleState: 'PUBLISHED'
      };

      const restRes = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(restPayload)
      });

      if (restRes.ok) {
        const restData = await restRes.json().catch(() => ({}));
        return {
          success: true,
          id: restData.id || '',
          url: `https://www.linkedin.com/company/${orgId}/`,
          error: null
        };
      }
    }

    return {
      success: false,
      url: `https://www.linkedin.com/company/${orgId}/`,
      error: `Erro LinkedIn (${res.status}): ${errMsg}`
    };
  } catch (err) {
    console.error('[LinkedIn Publisher Error]:', err);
    return {
      success: false,
      url: `https://www.linkedin.com/company/${orgId}/`,
      error: err.message || 'Falha de conexão com a API do LinkedIn.'
    };
  }
}
