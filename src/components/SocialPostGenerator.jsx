import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Download, Copy, Share2, Image as ImageIcon, Sparkles, Check, RefreshCw, Upload, Send } from 'lucide-react';
import { formatInstagramCaption, formatWhatsAppMessage, shareToWhatsApp, copyToClipboard } from '../utils/socialExporter';
import { uploadImageForSocial } from '../utils/imageUploader';
import { safeLoadImageForCanvas } from '../utils/imageLoader';

const SocialPostGenerator = forwardRef(({showToast,  article, onClose, inline = false, metaToken, metaFbPageId, metaIgAccountId, imgbbKey, hideButtons = false, onPostSuccess }, ref) => {
  const canvasRef = useRef(null);
  
  const [aspectRatio, setAspectRatio] = useState('4:5'); 
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState('');
  
  const [useTwoPhotos, setUseTwoPhotos] = useState(false);
  const [secondImageUrl, setSecondImageUrl] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const formatText = (text) => {
    if (!text) return '';
    const trimmed = text.trim();
    if (!['.', '!', '?'].includes(trimmed.slice(-1))) {
      return trimmed + '.';
    }
    return trimmed;
  };

  // Editable post fields
  const [title, setTitle] = useState(formatText(article?.title) || 'Manchete da Notícia em Destaque.');
  const [subtitle, setSubtitle] = useState(formatText(article?.subtitle) || 'Decisão impacta setor em expansão e levanta discussões sobre regulação.');
  const [category, setCategory] = useState(article?.categoryLabel || article?.category || 'POLÍTICA');
  const [captionText, setCaptionText] = useState('');

  const getInitialImage = (art) => {
    const img = art?.image;
    if (!img || img.includes('pollinations.ai')) {
      return '';
    }
    return img;
  };

  const [imageUrl, setImageUrl] = useState(getInitialImage(article));

  useEffect(() => {
    if (article) {
      setTitle(formatText(article.title));
      setSubtitle(formatText(article.subtitle));
      setCategory(article.categoryLabel || article.category || 'NOTÍCIAS');
      setImageUrl(getInitialImage(article));
    }
  }, [article]);

  useEffect(() => {
    setCaptionText(formatInstagramCaption({ title, subtitle, category, praca: article?.praca, id: article?.id, content: article?.content }));
  }, [title, subtitle, category, article]);

  const renderCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = 1080;
    const height = aspectRatio === '1:1' ? 1080 : aspectRatio === '9:16' ? 1920 : 1440;
    canvas.width = width;
    canvas.height = height;

    // Background base
    ctx.fillStyle = '#040f1d';
    ctx.fillRect(0, 0, width, height);

    const [img1, img2] = await Promise.all([
      safeLoadImageForCanvas(imageUrl),
      useTwoPhotos ? safeLoadImageForCanvas(secondImageUrl) : Promise.resolve(null)
    ]);

    if (canvasRef.current === canvas) {
      await drawCanvas(ctx, img1, width, height, img2);
    }
  };

  const drawCanvas = async (ctx, img, width, height, img2) => {
      const targetHeight = height * 0.58;

      if (!useTwoPhotos || !img2) {
          // 1. Draw single image at top
          if (img) {
             const scale = Math.max(width / img.width, targetHeight / img.height);
             const x = (width / 2) - (img.width / 2) * scale;
             const y = (targetHeight / 2) - (img.height / 2) * scale;
             ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

             // Gradiente sutil
             const grad = ctx.createLinearGradient(0, targetHeight - 160, 0, targetHeight);
             grad.addColorStop(0, 'rgba(0, 23, 46, 0)');
             grad.addColorStop(1, '#00172e');
             ctx.fillStyle = grad;
             ctx.fillRect(0, targetHeight - 160, width, 160);
          } else {
             ctx.fillStyle = '#020617';
             ctx.fillRect(0, 0, width, targetHeight);
          }
      } else {
          // 2. Draw two images side-by-side
          const halfWidth = width / 2;
          
          if (img) {
             const scale1 = Math.max(halfWidth / img.width, targetHeight / img.height);
             const w1 = img.width * scale1;
             const h1 = img.height * scale1;
             const x1 = (halfWidth / 2) - (w1 / 2);
             const y1 = (targetHeight / 2) - (h1 / 2);
             
             ctx.save();
             ctx.beginPath();
             ctx.rect(0, 0, halfWidth, targetHeight);
             ctx.clip();
             ctx.drawImage(img, x1, y1, w1, h1);
             ctx.restore();
          } else {
             ctx.fillStyle = '#020617';
             ctx.fillRect(0, 0, halfWidth, targetHeight);
          }

          if (img2) {
             const scale2 = Math.max(halfWidth / img2.width, targetHeight / img2.height);
             const w2 = img2.width * scale2;
             const h2 = img2.height * scale2;
             const x2 = halfWidth + (halfWidth / 2) - (w2 / 2);
             const y2 = (targetHeight / 2) - (h2 / 2);
             
             ctx.save();
             ctx.beginPath();
             ctx.rect(halfWidth, 0, halfWidth, targetHeight);
             ctx.clip();
             ctx.drawImage(img2, x2, y2, w2, h2);
             ctx.restore();
          } else {
             ctx.fillStyle = '#020617';
             ctx.fillRect(halfWidth, 0, halfWidth, targetHeight);
          }
          
          // Draw separator line
          ctx.fillStyle = '#00172e';
          ctx.fillRect(halfWidth - 2, 0, 4, targetHeight);
      }

      // Load logo
      const logo = (await safeLoadImageForCanvas('/logo-ng.png')) || (await safeLoadImageForCanvas('/logo/logo-oficial.png'));
      finalizeDraw(ctx, width, height, logo);
  };

  const finalizeDraw = (ctx, width, height, logo) => {
      // 2. Draw dark blue bottom shape with rounded corner
      const cardHeight = height * 0.45;
      const cardY = height - cardHeight;
      
      ctx.fillStyle = '#00172e'; // dark blue requested
      ctx.beginPath();
      // top-left rounded
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
      ctx.moveTo(width - 400, cardY);
      ctx.lineTo(width - 370, cardY - 25);
      ctx.lineTo(width, cardY - 25);
      ctx.lineTo(width, cardY);
      ctx.closePath();
      ctx.fill();
      
      // Draw Logo at Top Right - Increased size
      if (logo) {
         ctx.drawImage(logo, width - 260, 45, 210, 210 * (logo.height / logo.width));
      }

      // Pre-calculate Title Lines
      ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
      const titleWords = title.toUpperCase().split(' ');
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

      // Pre-calculate Subtitle Lines
      ctx.font = '400 36px "Barlow Condensed", sans-serif';
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

      // Metrics for vertical centering
      const titleLineHeight = 75;
      const subLineHeight = 46;
      const titleSpacing = 15;
      const totalTextHeight = (titleLines.length * titleLineHeight) + titleSpacing + (subLines.length * subLineHeight);
      
      const bottomLimit = height - 120; // 30px above the divider line
      const topLimit = cardY + 30; // 30px below the card start
      const availableHeight = bottomLimit - topLimit;
      
      const startY = topLimit + (availableHeight - totalTextHeight) / 2;

      // Draw Title
      ctx.font = 'bold 70px "Barlow Condensed", sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left'; // We manually calculate X to support multi-color lines
      
      let globalWordIndex = 0;
      let textY = startY;

      titleLines.forEach(l => {
          const lWords = l.split(' ');
          const fullLineWidth = ctx.measureText(l).width;
          let currentX = (width / 2) - (fullLineWidth / 2);
          
          lWords.forEach((w, idx) => {
             const isRed = globalWordIndex >= titleWords.length * 0.45 && globalWordIndex <= titleWords.length * 0.85;
             ctx.fillStyle = isRed ? '#d40a38' : '#ffffff';
             
             ctx.fillText(w, currentX, textY);
             
             currentX += ctx.measureText(w).width;
             if (idx < lWords.length - 1) {
                currentX += ctx.measureText(' ').width;
             }
             globalWordIndex++;
          });
          textY += titleLineHeight;
      });

      // Draw Subtitle
      ctx.font = '400 36px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center'; // Subtitle is single color, so we can use native centering
      
      let subY = textY + titleSpacing;
      subLines.forEach(l => {
        ctx.fillText(l, width / 2, subY);
        subY += subLineHeight;
      });

      // Reset textAlign for footer
      ctx.textAlign = 'left';
      // Footer divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, height - 90);
      ctx.lineTo(width - 60, height - 90);
      ctx.stroke();

      // Footer Text & Website
      ctx.font = '600 24px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('portalngbrasil.com.br', 60, height - 55);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Barlow Condensed", sans-serif';
      
      // Siga @portalngbrasil aligned right
      const sigaText = 'Siga @portalngbrasil';
      const sigaWidth = ctx.measureText(sigaText).width;
      ctx.fillText(sigaText, width - 60 - sigaWidth, height - 55);

  };

  useEffect(() => {
    // Small delay to ensure font loads
    setTimeout(() => {
       renderCanvas();
    }, 100);
  }, [title, subtitle, category, imageUrl, aspectRatio, useTwoPhotos, secondImageUrl, refreshKey]);

  const handleForceImageRefresh = () => {
    const rawUrl = article?.image;
    if (rawUrl) {
      setImageUrl(`${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
    } else {
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `card-instagram-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyCaption = async () => {
    const success = await copyToClipboard(captionText);
    if (success) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    shareToWhatsApp(article || { title, subtitle, category, praca: article?.praca, id: article?.id });
  };


  useImperativeHandle(ref, () => ({
    postToMeta: async (platforms = ['facebook', 'instagram']) => {
      return await handlePostToMeta(platforms);
    }
  }));

  const handlePostToMeta = async (platforms = ['facebook', 'instagram']) => {
    if (!metaToken) {
      const msg = "Configure o Token de Acesso do Meta nas Configurações.";
      showToast ? showToast(msg, true) : alert(msg);
      throw new Error(msg);
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Canvas da arte ainda não está pronto para renderização.");
    }

    try {
      setIsPosting(true);
      
      // 1. Gerar imagem e hospedar em URL pública direta
      setPostStatus('Hospedando arte para redes sociais...');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      const publicImageUrl = await uploadImageForSocial(blob, imgbbKey);

      let fbPostUrl = null;
      let igPostUrl = null;
      let fbError = null;
      let igError = null;

      // 2. Postar no Facebook (se configurado e solicitado)
      if (metaFbPageId && platforms.includes('facebook')) {
        setPostStatus('Postando no Facebook...');
        try {
          let fbToken = metaToken;
          try {
            const accRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${metaToken}`);
            if (accRes.ok) {
              const accData = await accRes.json();
              const targetPage = accData.data?.find(p => String(p.id) === String(metaFbPageId));
              if (targetPage && targetPage.access_token) {
                fbToken = targetPage.access_token;
              }
            }
          } catch (e) {}

          const fbFormData = new FormData();
          fbFormData.append('source', blob, 'post.jpg');
          fbFormData.append('message', captionText);
          fbFormData.append('access_token', fbToken);

          const fbRes = await fetch(`https://graph.facebook.com/v20.0/${metaFbPageId}/photos`, {
            method: 'POST',
            body: fbFormData
          });
          
          const fbData = await fbRes.json();
          if (fbData.error) {
              console.error("Erro Facebook:", fbData.error);
              fbError = fbData.error.message;
          } else {
              const fbPostId = fbData.post_id || fbData.id;
              fbPostUrl = fbPostId ? `https://www.facebook.com/${fbPostId}` : `https://www.facebook.com/${metaFbPageId}`;
              console.log("Facebook publicado com sucesso:", fbPostUrl);
          }
        } catch (e) {
          fbError = e.message;
        }
      }

      // 3. Postar no Instagram (se configurado e solicitado)
      if (metaIgAccountId && platforms.includes('instagram')) {
        setPostStatus('Criando container no Instagram...');
        try {
          const safeCaption = captionText.length > 2100 ? captionText.substring(0, 2100) + "..." : captionText;
          
          const igMediaRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: publicImageUrl, caption: safeCaption, access_token: metaToken })
          });
          const igMediaData = await igMediaRes.json();
          if (igMediaData.error) {
              throw new Error("Container Instagram: " + (igMediaData.error.error_user_msg || igMediaData.error.message));
          }
          
          const creationId = igMediaData.id;

          setPostStatus('Aguardando processamento da imagem pelo Instagram...');

          // Aguarda o container ficar com status FINISHED antes de publicar
          let isReady = false;
          let retries = 12; // até 36 segundos
          while (retries > 0) {
              await new Promise(r => setTimeout(r, 3000));
              try {
                const statusRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${metaToken}`);
                const statusData = await statusRes.json();
                if (statusData.status_code === 'FINISHED') {
                    isReady = true;
                    break;
                } else if (statusData.status_code === 'ERROR') {
                    throw new Error("Processamento Instagram falhou: " + (statusData.status || "Formato de imagem rejeitado"));
                }
              } catch (stErr) {
                if (stErr.message.includes('Processamento Instagram')) throw stErr;
              }
              retries--;
          }

          setPostStatus('Publicando no Feed do Instagram...');
          const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: creationId, access_token: metaToken })
          });
          const igPublishData = await igPublishRes.json();
          
          if (igPublishData.error) {
              throw new Error("Publicação Instagram: " + (igPublishData.error.error_user_msg || igPublishData.error.message));
          }
          
          igPostUrl = 'https://www.instagram.com/portalngbrasil/';
          try {
            const permaRes = await fetch(`https://graph.facebook.com/v20.0/${igPublishData.id}?fields=permalink&access_token=${metaToken}`);
            const permaData = await permaRes.json();
            if (permaData.permalink) {
                igPostUrl = permaData.permalink;
            }
          } catch (_) {}
          console.log("Instagram publicado com sucesso:", igPostUrl);
        } catch (e) {
          igError = e.message;
        }
      }

      if (fbError && igError) {
        showToast ? showToast(`FB: ${fbError} | IG: ${igError}`, true) : null;
      } else if (fbError) {
        showToast ? showToast(`Postou no Instagram, mas falhou no Facebook: ${fbError}`, true) : null;
      } else if (igError) {
        showToast ? showToast(`Falhou no Instagram: ${igError}`, true) : null;
      } else {
        showToast ? showToast("Publicado com sucesso no Instagram e redes sociais!") : alert("Publicado com sucesso!");
      }

      const postResult = {
        success: !fbError && !igError,
        facebook: fbPostUrl || (metaFbPageId ? `https://www.facebook.com/${metaFbPageId}` : 'https://www.facebook.com/portalngbrasil'),
        instagram: igPostUrl || 'https://www.instagram.com/portalngbrasil/',
        fbError,
        igError
      };

      if (onPostSuccess) {
        onPostSuccess(postResult);
      }

      return postResult;
    } catch (err) {
      console.error(err);
      showToast ? showToast("Erro nas redes sociais: " + err.message, true) : alert("Erro: " + err.message);
      return {
        success: false,
        error: err.message,
        facebook: metaFbPageId ? `https://www.facebook.com/${metaFbPageId}` : 'https://www.facebook.com/portalngbrasil',
        instagram: 'https://www.instagram.com/portalngbrasil/'
      };
    } finally {
      setIsPosting(false);
      setPostStatus('');
    }
  };

  const content = (
    <div className={`bg-white shadow-sm overflow-hidden flex flex-col ${inline ? 'rounded-xl border border-slate-200 h-full' : 'md:flex-row rounded-2xl max-w-4xl w-full my-8 border border-slate-200'}`}>
      
      {/* Left Column: Canvas Preview */}
      <div className={`w-full ${inline ? '' : 'md:w-1/2'} bg-slate-950 p-6 flex flex-col items-center justify-center relative ${inline ? 'border-b' : 'border-r'} border-slate-800`}>
        <div className="flex items-center gap-2 mb-4 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">Pré-visualização da Arte</span>
            <button 
              type="button"
              onClick={handleForceImageRefresh} 
              title="Forçar recarregamento da imagem" 
              className="ml-1 bg-slate-800 hover:bg-slate-700 p-1 rounded-full text-slate-300 transition-colors flex items-center justify-center"
            >
               <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full max-w-[340px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            <button
              onClick={() => setAspectRatio('1:1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '1:1' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Feed 1:1
            </button>
            <button
              onClick={() => setAspectRatio('4:5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '4:5' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Portrait 4:5
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '9:16' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Stories/Reels 9:16
            </button>
          </div>
        </div>

      {/* Right Column: Controls & Actions */}
      <div className={`w-full ${inline ? '' : 'md:w-1/2'} p-6 flex flex-col justify-between space-y-6 ${inline ? '' : 'max-h-[80vh] overflow-y-auto'}`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Estúdio Criativo (Artes)</h2>
            <p className="text-xs text-slate-500">Exporte a arte no modelo oficial do Canva (Barlow Condensed)</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1">✕</button>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* Imagem Dupla (Instagram/Facebook) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useTwoPhotos}
                  onChange={(e) => setUseTwoPhotos(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <span className="text-xs font-bold text-slate-700">Usar duas fotos na imagem do instagram (Tela Dividida)</span>
              </label>

              {useTwoPhotos && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>📸 Segunda Imagem (Metade Direita)</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <div 
                      className="w-full h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors relative"
                      onPaste={(e) => {
                        const items = e.clipboardData.items;
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf('image') !== -1) {
                            const blob = items[i].getAsFile();
                            const reader = new FileReader();
                            reader.onloadend = () => setSecondImageUrl(reader.result);
                            reader.readAsDataURL(blob);
                            e.preventDefault();
                          }
                        }
                      }}
                    >
                      <div className="text-center text-slate-500 pointer-events-none flex flex-col items-center">
                        <Upload className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Upload ou Ctrl+V da segunda foto</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => setSecondImageUrl(reader.result);
                          reader.readAsDataURL(file);
                        }} 
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Ou cole o link de uma imagem da internet..." 
                      value={secondImageUrl && secondImageUrl.startsWith('http') ? secondImageUrl : ''}
                      onChange={(e) => setSecondImageUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título da Arte</label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo (Linha Fina)</label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex justify-between items-center">
                <span>Legenda para Redes Sociais</span>
                <button onClick={handleCopyCaption} className="text-xs text-[#d40a38] flex items-center gap-1 hover:underline">
                   {copiedCaption ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                   {copiedCaption ? 'Copiado!' : 'Copiar'}
                </button>
              </label>
              <textarea
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>


          </div>

        {/* Action Buttons */}
        {!hideButtons && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => handlePostToMeta(['facebook', 'instagram'])}
            disabled={isPosting || (!metaToken || !imgbbKey)}
            className={`w-full ${isPosting ? 'bg-slate-400' : (!metaToken || !imgbbKey) ? 'bg-slate-300' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all text-sm`}
            title={(!metaToken || !imgbbKey) ? "Configure as chaves do Meta e ImgBB nas Configurações primeiro" : "Postar simultaneamente no Facebook e Instagram"}
          >
            {isPosting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> {postStatus}</>
            ) : (
              <><Send className="w-4 h-4" /> Postar no Instagram e Facebook</>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 bg-[#d40a38] hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
            >
              <Download className="w-3 h-3" /> Baixar (PNG)
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {content}
    </div>
  );
});

export default SocialPostGenerator;
