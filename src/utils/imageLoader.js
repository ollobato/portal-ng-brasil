/**
 * Carregador de Imagens Seguro para Canvas (Portal NG Brasil)
 * 
 * Garante que imagens de fontes externas (G1, UOL, CNN, Folha, etc.)
 * sejam carregadas e desenhadas em elementos <canvas> sem erro de CORS
 * e sem contaminar (taint) o canvas na hora de exportar para o Instagram/Facebook.
 */

// Helper para carregar um Image element a partir de uma URL com timeout
function loadHtmlImage(src, crossOrigin = 'anonymous', timeoutMs = 6000) {
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

    img.onerror = (e) => {
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
      // Deixa o objectUrl ativo para o drawImage
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
 * Carrega qualquer imagem de notícia de forma 100% segura para uso no Canvas.
 * @param {string} rawUrl - URL da foto da matéria
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function safeLoadImageForCanvas(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }

  const url = rawUrl.trim();

  // 1. Data URLs ou Blob URLs locais já são seguras
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    try {
      return await loadHtmlImage(url, '', 6000);
    } catch (_) {
      return null;
    }
  }

  // 2. Se for uma URL do mesmo domínio ou caminho relativo
  if (url.startsWith('/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
    try {
      return await loadHtmlImage(url, 'anonymous', 5000);
    } catch (_) {
      // continua para os proxies
    }
  }

  // 3. Tenta carregamento direto com CORS (funciona em Unsplash, ImgBB, CDNs com CORS aberto)
  try {
    const directImg = await loadHtmlImage(url, 'anonymous', 3500);
    if (directImg && directImg.naturalWidth > 10) {
      return directImg;
    }
  } catch (_) {
    // Falhou CORS direto (esperado para a maioria dos portais de notícias). Segue para os proxies.
  }

  // 4. Lista ordenada de proxies para contornar bloqueios e obter o Blob com mesma origem
  const proxyEndpoints = [
    // Proxy interno do próprio Portal NG Brasil (Hostinger cURL com User-Agent de navegador)
    (u) => `/image-proxy.php?url=${encodeURIComponent(u)}`,
    (u) => `https://portalngbrasil.com.br/image-proxy.php?url=${encodeURIComponent(u)}`,
    // Proxies mundiais de alta performance
    (u) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&output=jpg&we=1`,
    (u) => `https://images.weserv.nl/?url=${encodeURIComponent(u)}&output=jpg&we=1`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  for (const getProxyUrl of proxyEndpoints) {
    try {
      const proxyUrl = getProxyUrl(url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(proxyUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 200 && blob.type.startsWith('image/')) {
          const img = await blobToImage(blob);
          if (img && img.naturalWidth > 10) {
            return img;
          }
        }
      }
    } catch (e) {
      // Tenta o próximo proxy silenciosamente
      continue;
    }
  }

  // 5. Última tentativa: carrega como imagem de proxy direto via tag Image
  try {
    const wsrvImg = await loadHtmlImage(`https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`, 'anonymous', 5000);
    if (wsrvImg && wsrvImg.naturalWidth > 10) {
      return wsrvImg;
    }
  } catch (_) {}

  console.warn("safeLoadImageForCanvas: Não foi possível carregar a imagem da matéria:", url);
  return null;
}
