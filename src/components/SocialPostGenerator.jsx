import React, { useRef, useEffect, useState } from 'react';
import { Download, Copy, Share2, Image as ImageIcon, Sparkles, Check, RefreshCw, Upload } from 'lucide-react';
import { formatInstagramCaption, formatWhatsAppMessage, shareToWhatsApp, copyToClipboard } from '../utils/socialExporter';

export default function SocialPostGenerator({ article, onClose }) {
  const canvasRef = useRef(null);
  
  const [aspectRatio, setAspectRatio] = useState('4:5'); 
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [customOverlayImage, setCustomOverlayImage] = useState(null);

  // Editable post fields
  const [title, setTitle] = useState(article?.title || 'Manchete da Notícia em Destaque');
  const [subtitle, setSubtitle] = useState(article?.subtitle || 'Decisão impacta setor em expansão e levanta discussões sobre regulação.');
  const [category, setCategory] = useState(article?.categoryLabel || article?.category || 'POLÍTICA');
  const [imageUrl, setImageUrl] = useState(article?.image || `https://image.pollinations.ai/prompt/${encodeURIComponent("News photo about " + title + ", realistic, high quality")}?width=1200&height=1200&nologo=true`);

  useEffect(() => {
    if (article) {
      setTitle(article.title || '');
      setSubtitle(article.subtitle || '');
      setCategory(article.categoryLabel || article.category || 'NOTÍCIAS');
      setImageUrl(article.image || `https://image.pollinations.ai/prompt/${encodeURIComponent("News photo about " + article.title + ", realistic, high quality")}?width=1200&height=1200&nologo=true`);
    }
  }, [article]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = 1080;
    const height = aspectRatio === '1:1' ? 1080 : 1350;
    canvas.width = width;
    canvas.height = height;

    // Background base
    ctx.fillStyle = '#040f1d';
    ctx.fillRect(0, 0, width, height);

    // Draw main news image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      drawCanvas(ctx, img, width, height);
    };

    img.onerror = () => {
      // If error, just draw without image
      drawCanvas(ctx, null, width, height);
    };
  };

  const drawCanvas = (ctx, img, width, height) => {
      // 1. Draw image at top
      if (img) {
         const scale = Math.max(width / img.width, height / img.height);
         const x = (width / 2) - (img.width / 2) * scale;
         const y = 0;
         ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      } else {
         ctx.fillStyle = '#1e293b';
         ctx.fillRect(0, 0, width, height);
      }

      // Load logo
      const logo = new Image();
      logo.src = '/logo-ng.png';
      logo.onload = () => {
        finalizeDraw(ctx, width, height, logo);
      };
      logo.onerror = () => {
        finalizeDraw(ctx, width, height, null);
      }
  };

  const finalizeDraw = (ctx, width, height, logo) => {
      // 2. Draw dark blue bottom shape with rounded corner
      const cardHeight = height * 0.43;
      const cardY = height - cardHeight;
      
      ctx.fillStyle = '#04101e'; // dark navy from canva
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
      
      // Draw Logo at Top Right
      if (logo) {
         ctx.drawImage(logo, width - 220, 60, 160, 160 * (logo.height / logo.width));
      }

      // Title Text
      ctx.font = 'bold 85px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      
      const words = title.toUpperCase().split(' ');
      let line = '';
      let textY = cardY + 70;
      const maxWidth = width - 120;
      
      const lines = [];
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      let globalWordIndex = 0;
      lines.forEach(l => {
          let currentX = 60;
          const lWords = l.trim().split(' ');
          lWords.forEach(w => {
             // Heuristic for Canva effect: words in the middle/end are red
             const isRed = globalWordIndex >= words.length * 0.45 && globalWordIndex <= words.length * 0.85;
             ctx.fillStyle = isRed ? '#d40a38' : '#ffffff';
             
             ctx.fillText(w + ' ', currentX, textY);
             currentX += ctx.measureText(w + ' ').width;
             globalWordIndex++;
          });
          textY += 90;
      });

      // Subtitle
      ctx.font = '400 45px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      
      let subLine = '';
      let subY = textY + 40;
      const subWords = subtitle.split(' ');
      
      subWords.forEach((w, n) => {
        const testLine = subLine + w + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(subLine, 60, subY);
          subLine = w + ' ';
          subY += 55;
        } else {
          subLine = testLine;
        }
      });
      ctx.fillText(subLine, 60, subY);

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

      // Draw custom Canva overlay if provided
      if (customOverlayImage) {
        const overlay = new Image();
        overlay.src = customOverlayImage;
        overlay.onload = () => {
          ctx.drawImage(overlay, 0, 0, width, height);
        };
      }
  };

  useEffect(() => {
    // Small delay to ensure font loads
    setTimeout(() => {
       renderCanvas();
    }, 100);
  }, [title, subtitle, category, imageUrl, aspectRatio, customOverlayImage]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `card-instagram-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyCaption = async () => {
    const caption = formatInstagramCaption({ title, subtitle, category, praca: article?.praca });
    const success = await copyToClipboard(caption);
    if (success) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    shareToWhatsApp(article || { title, subtitle, category, praca: article?.praca, id: article?.id });
  };

  const handleCustomOverlayUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomOverlayImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateNewImage = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    const prompt = `News photo about ${title}, realistic, high quality`;
    setImageUrl(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=1200&nologo=true&seed=${randomSeed}`);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row border border-slate-200 my-8">
        
        {/* Left Column: Canvas Preview */}
        <div className="w-full md:w-1/2 bg-slate-950 p-6 flex flex-col items-center justify-center relative border-r border-slate-800">
          <div className="flex items-center gap-2 mb-4 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">Pré-visualização da Arte do Instagram</span>
          </div>

          <div className="w-full max-w-[340px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setAspectRatio('1:1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '1:1' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Feed 1:1 (Quadrado)
            </button>
            <button
              onClick={() => setAspectRatio('4:5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === '4:5' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Portrait 4:5 (Expandido)
            </button>
          </div>
        </div>

        {/* Right Column: Controls & Actions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gerador de Redes Sociais</h2>
              <p className="text-xs text-slate-500">Exporte a arte no modelo oficial do Canva (Barlow Condensed)</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1">✕</button>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-4">
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

            {/* Custom Canva PNG Moldura Upload */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>🎨 Usar Moldura PNG do Canva</span>
                {customOverlayImage && (
                  <button onClick={() => setCustomOverlayImage(null)} className="text-[10px] text-red-600 underline">Remover</button>
                )}
              </label>
              <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 bg-white rounded-lg cursor-pointer hover:bg-slate-100 transition-colors text-xs text-slate-600 font-bold">
                <Upload className="w-4 h-4 text-slate-500" />
                {customOverlayImage ? 'Trocar Moldura PNG' : 'Subir Moldura Transparente (Canva)'}
                <input type="file" accept="image/png" onChange={handleCustomOverlayUpload} className="hidden" />
              </label>
            </div>

            <button
              onClick={handleGenerateNewImage}
              className="w-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Gerar Nova Imagem de Fundo (IA)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleDownload}
              className="w-full bg-[#d40a38] hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" /> Baixar Imagem para o Instagram (PNG)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyCaption}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                {copiedCaption ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiedCaption ? 'Legenda Copiada!' : 'Copiar Legenda Insta'}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" /> Enviar no WhatsApp
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
