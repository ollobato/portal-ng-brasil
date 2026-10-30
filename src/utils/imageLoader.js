/**
 * Carregador de Imagens Seguro para Canvas (Portal NG Brasil)
 * 
 * Garante que imagens de fontes externas (G1, UOL, CNN, Folha, etc.)
 * sejam carregadas e desenhadas em elementos <canvas> sem erro de CORS,
 * sem atrasos excessivos e sem contaminar (taint) o canvas na hora de exportar.
 * 
 * Inclui:
 * - Cache em memória (instantâneo para chamadas repetidas)
 * - Desduplicação de requisições simultâneas (in-flight request deduplication)
 * - Priorização de proxies globais ultrarrápidos (wsrv.nl com conversão JPEG)
 * - Timeouts curtos e inteligentes para evitar travamento da interface
 */

// Cache em memória para instâncias HTMLImageElement já carregadas e validadas
const imageCache = new Map();
// Rastreio de requisições em andamento para a mesma URL
const inFlightLoads = new Map();

// Helper para carregar um Image element a partir de uma URL com timeout
function loadHtmlImage(src, crossOrigin = 'anonymous', timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      img.src = '';
      reject(new Error(`Timeout ao carregar imagem (${timeoutMs}ms)`));
    }, timeoutMs);

    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    img.onload = () => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!timedOut) {
        clearTimeout(timer);
        reject(new Error('Erro de carregamento da imagem'));
      }
    };

    img.src = src;
  });
}

// Converte um Blob de imagem em Image element local (mesma origem garantida)
async function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao instanciar imagem do Blob'));
    };
    img.src = objectUrl;
  });
}

/**
 * Pré-carrega uma imagem em segundo plano para o cache
 * @param {string} rawUrl 
 */
export function preloadImageForCanvas(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return;
  safeLoadImageForCanvas(rawUrl).catch(() => {});
}

/**
 * Limpa o cache em memória
 */
export function clearImageCache() {
  imageCache.clear();
}

/**
 * Carrega qualquer imagem de notícia de forma 100% segura para uso no Canvas.
 * @param {string} rawUrl - URL da foto da matéria
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function safeLoadImageForCanvas(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }

  const url = rawUrl.trim();

  // 1. Verifica cache em memória
  if (imageCache.has(url)) {
    const cached = imageCache.get(url);
    if (cached && (cached.naturalWidth > 0 || cached.width > 0)) {
      return cached;
    }
  }

  // 2. Se já existe uma requisição em andamento para esta mesma URL, aguarda ela
  if (inFlightLoads.has(url)) {
    try {
      return await inFlightLoads.get(url);
    } catch (_) {
      // continua para tentar novamente
    }
  }

  const loadPromise = (async () => {
    // 3. Data URLs ou Blob URLs locais já são 100% seguras
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      try {
        const img = await loadHtmlImage(url, '', 5000);
        if (img && img.naturalWidth > 0) {
          imageCache.set(url, img);
          return img;
        }
      } catch (_) {
        return null;
      }
    }

    // 4. Se for uma URL do mesmo domínio ou caminho relativo (ex: /logo-ng.png)
    const isSameOrigin = url.startsWith('/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin));
    if (isSameOrigin) {
      try {
        const localImg = await loadHtmlImage(url, 'anonymous', 4000);
        if (localImg && localImg.naturalWidth > 0) {
          imageCache.set(url, localImg);
          return localImg;
        }
      } catch (_) {
        // Se falhar com anonymous, tenta carregar sem crossOrigin para o mesmo domínio
        try {
          const directLocal = await loadHtmlImage(url, '', 3000);
          if (directLocal && directLocal.naturalWidth > 0) {
            imageCache.set(url, directLocal);
            return directLocal;
          }
        } catch (_) {}
      }
    }

    // 5. Tentativa rápida direta com CORS (funciona em Unsplash, ImgBB, Firebase Storage, CDNs abertas)
    try {
      const directImg = await loadHtmlImage(url, 'anonymous', 2000);
      if (directImg && directImg.naturalWidth > 10) {
        imageCache.set(url, directImg);
        return directImg;
      }
    } catch (_) {
      // Falhou CORS direto (esperado para notícias externas com hotlink protection)
    }

    // 6. Lista inteligente de proxies ordenados por velocidade e resiliência
    // Prioriza wsrv.nl: CDN Cloudflare global, converte avif/webp/heic para jpeg, adiciona CORS liberado
    const proxyEndpoints = [
      // 1º Proxy CDN mundial ultrarrápido (Cloudflare Edge, converte para JPG seguro)
      (u) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&output=jpg&we=1`,
      // 2º Espelho Weserv mundial
      (u) => `https://images.weserv.nl/?url=${encodeURIComponent(u)}&output=jpg&we=1`,
      // 3º Proxy do próprio Portal NG Brasil (se estiver em produção ou via domínio oficial)
      (u) => `https://portalngbrasil.com.br/image-proxy.php?url=${encodeURIComponent(u)}`,
      // 4º Proxy alternativo de CORS
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      // 5º Allorigins
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    ];

    // Se estivermos executando exatamente em portalngbrasil.com.br, coloca o proxy interno no topo
    if (typeof window !== 'undefined' && window.location.hostname === 'portalngbrasil.com.br') {
      proxyEndpoints.unshift((u) => `/image-proxy.php?url=${encodeURIComponent(u)}`);
    }

    for (const getProxyUrl of proxyEndpoints) {
      try {
        const proxyUrl = getProxyUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(proxyUrl, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          // Rejeita respostas que sejam HTML (como páginas de erro de fallback do SPA)
          if (contentType.includes('text/html') || contentType.includes('application/json')) {
            continue;
          }

          const blob = await response.blob();
          if (blob && blob.size > 200 && (blob.type.startsWith('image/') || !blob.type)) {
            const img = await blobToImage(blob);
            if (img && img.naturalWidth > 10) {
              imageCache.set(url, img);
              return img;
            }
          }
        }
      } catch (_) {
        // Tenta o próximo proxy imediatamente
        continue;
      }
    }

    // 7. Última tentativa: carregamento direto via tag de imagem no wsrv
    try {
      const wsrvImg = await loadHtmlImage(`https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`, 'anonymous', 4000);
      if (wsrvImg && wsrvImg.naturalWidth > 10) {
        imageCache.set(url, wsrvImg);
        return wsrvImg;
      }
    } catch (_) {}

    console.warn("safeLoadImageForCanvas: Não foi possível carregar a imagem da matéria por nenhum canal:", url);
    return null;
  })();

  inFlightLoads.set(url, loadPromise);

  try {
    const result = await loadPromise;
    return result;
  } finally {
    inFlightLoads.delete(url);
  }
}
