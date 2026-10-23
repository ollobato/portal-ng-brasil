import { uploadImageForSocial } from './imageUploader';
import { safeLoadImageForCanvas } from './imageLoader';

export const autoPublishToMeta = async ({ article, metaToken, metaFbPageId, metaIgAccountId, imgbbKey }) => {
  try {
    const articleUrl = `https://portalngbrasil.com.br/share.php?id=${article.id}`;
    const caption = `${article.title}\n\nLeia a matéria completa no site: ${articleUrl}`;
    
    // 1. Postar na Página do Facebook (Link nativo com Preview)
    if (metaFbPageId) {
      console.log("Postando no Facebook (Link)...");
      const fbRes = await fetch(`https://graph.facebook.com/v20.0/${metaFbPageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: articleUrl,
          message: caption,
          access_token: metaToken
        })
      });
      const fbData = await fbRes.json();
      if (fbData.error) console.error("Erro ao postar no Facebook:", fbData.error);
      else console.log("Facebook postado com sucesso:", fbData.id);
    }

    return { success: true };
  } catch (error) {
    console.error("Erro na automação de postagem:", error);
    return { success: false, error };
  }
};

const generateStoryImageAndUpload = async (article, imgbbKey) => {
  try {
    const canvas = document.createElement('canvas');
    // Story aspect ratio 9:16 (e.g. 1080x1920)
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw Background Image
    if (article.image) {
      const bgImage = await safeLoadImageForCanvas(article.image);
      if (bgImage) {
        const scale = Math.max(width / bgImage.width, height / bgImage.height);
        const scaledWidth = bgImage.width * scale;
        const scaledHeight = bgImage.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        ctx.drawImage(bgImage, x, y, scaledWidth, scaledHeight);
      } else {
        ctx.fillStyle = '#00172e';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = '#00172e';
      ctx.fillRect(0, 0, width, height);
    }

    // Draw dark gradient over image
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw bottom dark blue shape
    const cardHeight = height * 0.40;
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

    // Red Tab on the right side
    ctx.fillStyle = '#d40a38';
    ctx.beginPath();
    ctx.moveTo(width - 300, cardY);
    ctx.lineTo(width - 270, cardY - 25);
    ctx.lineTo(width, cardY - 25);
    ctx.lineTo(width, cardY);
    ctx.closePath();
    ctx.fill();

    // Draw Title
    ctx.font = 'bold 80px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'white';
    
    const title = article.title.toUpperCase();
    const titleWords = title.split(' ');
    let titleLines = [];
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

    let yPosition = cardY + 120;
    for (const line of titleLines) {
      ctx.fillText(line, 60, yPosition);
      yPosition += 85;
    }

    // Draw Subtitle
    ctx.font = '400 45px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    
    const subtitle = article.subtitle || '';
    const subWords = subtitle.split(' ');
    let subLines = [];
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

    yPosition += 20;
    for (const line of subLines) {
      ctx.fillText(line, 60, yPosition);
      yPosition += 55;
    }

    // Draw Link prompt
    ctx.font = 'bold 40px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#d40a38';
    ctx.fillText('LEIA A MATÉRIA COMPLETA', 60, height - 80);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return await uploadImageForSocial(blob, imgbbKey);
  } catch (err) {
    console.error("Erro ao gerar arte do story:", err);
    return null;
  }
};
