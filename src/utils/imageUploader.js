/**
 * Image Uploader para Redes Sociais (Instagram e Facebook)
 * Fornece URLs públicas diretas e compatíveis com a Meta Graph API.
 */

export async function uploadImageForSocial(blob, customImgbbKey = null) {
  if (!blob) {
    throw new Error("Nenhuma imagem fornecida para upload.");
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
