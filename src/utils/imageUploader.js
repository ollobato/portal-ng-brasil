/**
 * Image & Video Uploader para Redes Sociais (Instagram e Facebook)
 * Fornece URLs públicas diretas e compatíveis com a Meta Graph API.
 */

export async function uploadVideoForSocial(videoBlobOrUrl) {
  if (!videoBlobOrUrl) {
    throw new Error("Nenhum vídeo fornecido para upload.");
  }

  // Se já for uma URL pública http(s), retorna diretamente
  if (typeof videoBlobOrUrl === 'string' && videoBlobOrUrl.startsWith('http')) {
    return videoBlobOrUrl;
  }

  let blob = videoBlobOrUrl;
  if (typeof videoBlobOrUrl === 'string' && (videoBlobOrUrl.startsWith('data:') || videoBlobOrUrl.startsWith('blob:'))) {
    const res = await fetch(videoBlobOrUrl);
    blob = await res.blob();
  }

  const errors = [];
  const ext = blob.type?.includes('quicktime') ? 'mov' : blob.type?.includes('webm') ? 'webm' : 'mp4';

  // 1. Upload via FormData para upload.php no servidor do Portal NG Brasil
  try {
    const formData = new FormData();
    formData.append('file', blob, `social_video_${Date.now()}.${ext}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const res = await fetch('https://portalngbrasil.com.br/upload.php', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        console.log("Vídeo hospedado com sucesso no Portal NG:", data.url);
        return data.url;
      } else if (data && data.error) {
        errors.push(`Portal: ${data.error}`);
      }
    } else {
      errors.push(`Portal HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn("Falha no upload de vídeo do Portal NG:", err.message);
    errors.push(`Portal: ${err.message}`);
  }

  // 2. Fallback Base64 para upload.php
  try {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await fetch('https://portalngbrasil.com.br/upload.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    errors.push(`Fallback Base64: ${err.message}`);
  }

  throw new Error(`Não foi possível hospedar o vídeo para o Instagram: ${errors.join(' | ')}`);
}

export async function uploadImageForSocial(blob, customImgbbKey = null) {
  if (!blob) {
    throw new Error("Nenhuma imagem fornecida para upload.");
  }

  if (blob.type && blob.type.startsWith('video/')) {
    return uploadVideoForSocial(blob);
  }

  const errors = [];

  // 1. Tentar upload direto no servidor do Portal NG Brasil (Hostinger)
  // Endpoint próprio com CORS liberado e sem limites de terceiros
  try {
    const formData = new FormData();
    formData.append('image', blob, `social_${Date.now()}.jpg`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    const res = await fetch('https://portalngbrasil.com.br/upload.php', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        console.log("Imagem hospedada com sucesso no Portal NG:", data.url);
        return data.url;
      } else if (data && data.error) {
        errors.push(`Portal: ${data.error}`);
      }
    } else {
      errors.push(`Portal HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn("Falha no upload do Portal NG:", err.message);
    errors.push(`Portal: ${err.message}`);
  }

  // 2. Se o usuário configurou uma chave própria do ImgBB (e não a antiga chave bloqueada)
  const isDefaultBlockedKey = customImgbbKey === '16be6a5efa6c25b8e50bf9ae6ef9b9bf';
  if (customImgbbKey && !isDefaultBlockedKey && customImgbbKey.length > 10) {
    try {
      const formData = new FormData();
      formData.append('image', blob);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${customImgbbKey}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data && data.success && data.data?.url) {
        console.log("Imagem hospedada no ImgBB:", data.data.url);
        return data.data.url;
      } else if (data?.error?.message) {
        errors.push(`ImgBB: ${data.error.message}`);
      }
    } catch (err) {
      console.warn("Falha no ImgBB:", err.message);
      errors.push(`ImgBB: ${err.message}`);
    }
  }

  // 3. Fallback: Envio Base64 para upload.php caso FormData tenha falhado
  try {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await fetch('https://portalngbrasil.com.br/upload.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    errors.push(`Fallback Base64: ${err.message}`);
  }

  throw new Error(`Não foi possível hospedar a imagem para o Instagram: ${errors.join(' | ')}`);
}
