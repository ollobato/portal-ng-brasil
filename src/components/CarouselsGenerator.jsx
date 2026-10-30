import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Image as ImageIcon, Download, Sparkles, Loader2, Bot, Plus, Send, Clock, Trash2, Settings2, ShieldCheck, FileText, Copy, Check } from 'lucide-react';
import { useFirebaseSync, useFirebaseDoc } from '../hooks/useFirebaseSync';
import { uploadImageForSocial } from '../utils/imageUploader';
import { safeLoadImageForCanvas } from '../utils/imageLoader';

const BACKGROUNDS = [
  { id: 'plantao', label: 'Plantão NG', type: 'image', url: '/backgrounds/plantao2.png' },
  { id: 'black', label: 'Preto Clássico', type: 'color', value: '#000000' },
  { id: 'gradient-blue', label: 'Azul Noturno', type: 'gradient', color1: '#0f172a', color2: '#1e1b4b' },
  { id: 'gradient-red', label: 'Vermelho Intenso', type: 'gradient', color1: '#450a0a', color2: '#000000' },
  { id: 'gradient-green', label: 'Verde Esmeralda', type: 'gradient', color1: '#064e3b', color2: '#000000' },
  { id: 'gradient-purple', label: 'Roxo Profundo', type: 'gradient', color1: '#2e1065', color2: '#000000' },
  { id: 'white', label: 'Branco Limpo', type: 'color', value: '#ffffff' },
  { id: 'dark-gray', label: 'Cinza Chumbo', type: 'color', value: '#1e293b' }
];

export function extractSlidesFromAiResponse(obj, defaultBg = 'plantao') {
  if (!obj) return [];
  let slidesList = [];

  if (Array.isArray(obj)) {
    slidesList = obj;
  } else if (typeof obj === 'object') {
    if (Array.isArray(obj.slides)) {
      slidesList = obj.slides;
    } else if (Array.isArray(obj.stories)) {
      slidesList = obj.stories;
    } else if (Array.isArray(obj.news)) {
      slidesList = obj.news;
    } else if (Array.isArray(obj.noticias)) {
      slidesList = obj.noticias;
    } else if (Array.isArray(obj.items)) {
      slidesList = obj.items;
    } else if (Array.isArray(obj.telas)) {
      slidesList = obj.telas;
    } else if (Array.isArray(obj.pautas)) {
      slidesList = obj.pautas;
    } else {
      const anyArray = Object.values(obj).find(val => Array.isArray(val) && val.length > 0);
      if (anyArray) {
        slidesList = anyArray;
      } else if (obj.text || obj.title || obj.slide) {
        slidesList = [obj];
      }
    }
  } else if (typeof obj === 'string') {
    const lines = obj.split(/\n\s*\n|\n(?=\d+[\.\)]|\bSlide\s+\d+:?|\bTela\s+\d+:?)/i)
      .map(s => s.replace(/^\d+[\.\)]\s*|^(?:Slide|Tela)\s+\d+:?\s*/i, '').trim())
      .filter(s => s.length > 15);
    if (lines.length > 0) {
      slidesList = lines.map(text => ({ text }));
    }
  }

  return slidesList.map(s => {
    if (typeof s === 'string') {
      return { text: s, bgId: defaultBg };
    }
    if (s && typeof s === 'object') {
      let text = s.text || s.content || s.slide || s.story || s.noticia || '';
      if (!text && s.title) {
        text = s.subtitle ? `${s.title}\n\n${s.subtitle}` : s.description ? `${s.title}\n\n${s.description}` : s.title;
      }
      if (!text) {
        const firstStr = Object.values(s).find(v => typeof v === 'string' && v.length > 10);
        text = firstStr || JSON.stringify(s);
      }
      return {
        ...s,
        text,
        bgId: s.bgId || defaultBg
      };
    }
    return { text: String(s), bgId: defaultBg };
  }).filter(s => s.text && s.text.trim().length > 0);
}

export default function CarouselsGenerator({ perplexityKey, geminiKey, metaToken, metaIgAccountId, imgbbKey, newsData = [], draftData = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [copiedLogId, setCopiedLogId] = useState(null);
  const [pautasCount, setPautasCount] = useState('5');
  const [globalBackground, setGlobalBackground] = useState('plantao');
  
  const defaultPrompt = `Você é um jornalista e copywriter do Portal NG Brasil (linha editorial conservadora, foco em economia, segurança e liberdade).
Sua missão é criar um roteiro de CARROSSEL para o Feed do Instagram.
O carrossel DEVE contar uma história coesa, com início, meio e fim. Uma tela deve completar a outra.

Regras Estritas para o formato Carrossel:
1. Tela 1 (Capa): Deve conter um título forte e muito instigante para atrair o clique.
2. Telas do Meio: Desenvolva o assunto de forma didática. Uma tela "puxa" a próxima.
3. Última Tela (CTA): Reflexão ou chamada para ação (ex: 'Deixe sua opinião', 'Siga o Portal NG para mais').
4. Mantenha os textos bem curtos (1 a 2 frases por tela). Lembre-se que o espaço de texto será reduzido pois haverá uma foto acima dele.
5. Use emojis conservadores moderadamente.

Retorne APENAS um JSON válido no formato abaixo:
{ "slides": [
  {
    "text": "Texto da Tela..."
  }
] }`;

  const [basePrompt, setBasePrompt] = useState(defaultPrompt);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingEngine, setLoadingEngine] = useState(''); // 'all' or 'perplexity'
  const [status, setStatus] = useState('');
  
  const [rawAiLog, setRawAiLog] = useState('');

  const [stories, setStories] = useState([]); // array of slides
  const [storiesLog, setStoriesLog] = useFirebaseSync('carousels_logs', []);
  const [showPromptConfig, setShowPromptConfig] = useState(false);

  const [automationSettings, setAutomationSettings] = useFirebaseDoc('settings', 'automation', { carousel: { enabled: false, intervalMinutes: 30, pautasCount: 5, lastRun: 0 }, stories: { enabled: false, intervalMinutes: 30, pautasCount: 5, lastRun: 0 } });
  
  const autoPostEnabled = Boolean(automationSettings?.carousel?.enabled);
  const autoPostInterval = Number(automationSettings?.carousel?.intervalMinutes) || 30;
  const autoPostCount = Number(automationSettings?.carousel?.pautasCount) || 5;

  // Relógio ativo para sincronização segundo a segundo da contagem regressiva
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Próximo disparo salvo de forma persistente no Firestore (não reseta ao recarregar a página)
  const nextRunTimestamp = useMemo(() => {
    if (!autoPostEnabled) return null;
    const stored = automationSettings?.carousel?.nextRun;
    if (stored && typeof stored === 'number' && stored > 0) {
      return stored;
    }
    const last = automationSettings?.carousel?.lastRun;
    if (last && typeof last === 'number' && last > 0) {
      return last + autoPostInterval * 60000;
    }
    return null;
  }, [autoPostEnabled, automationSettings?.carousel?.nextRun, automationSettings?.carousel?.lastRun, autoPostInterval]);

  const nextRunTime = useMemo(() => {
    return nextRunTimestamp ? new Date(nextRunTimestamp) : null;
  }, [nextRunTimestamp]);

  const remainingMs = useMemo(() => {
    if (!nextRunTimestamp) return 0;
    return Math.max(0, nextRunTimestamp - nowTick);
  }, [nextRunTimestamp, nowTick]);

  const formattedCountdown = useMemo(() => {
    if (!nextRunTimestamp) return '';
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }, [remainingMs, nextRunTimestamp]);

  const [isAutoPosting, setIsAutoPosting] = useState(false);
  const isAutoPostingRef = useRef(false);

  // Se o piloto automático de carrossel estiver ativado mas sem nextRun salvo no Firebase, inicializa
  useEffect(() => {
    if (autoPostEnabled && (!automationSettings?.carousel?.nextRun || automationSettings.carousel.nextRun <= 0)) {
      const scheduled = Date.now() + autoPostInterval * 60000;
      setAutomationSettings(prev => ({
        ...prev,
        carousel: {
          ...(prev?.carousel || {}),
          lastRun: prev?.carousel?.lastRun || Date.now(),
          nextRun: scheduled,
          status: 'idle'
        }
      }));
    }
  }, [autoPostEnabled, automationSettings?.carousel?.nextRun, autoPostInterval]);

  // Ordena do mais recente para o mais antigo de forma garantida
  const sortedStoriesLog = useMemo(() => {
    return [...(storiesLog || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [storiesLog]);

  const storiesLogRef = useRef(sortedStoriesLog);
  useEffect(() => {
      storiesLogRef.current = sortedStoriesLog;
  }, [sortedStoriesLog]);

  // Extrai lista unificada de notícias/pautas/carrosséis recentes para evitar repetições
  const antiRepetitionList = useMemo(() => {
    const seen = new Set();
    const items = [];

    // 1. Dos carrosséis já gerados
    (sortedStoriesLog || []).slice(0, 30).forEach(log => {
      if (log.pauta && !log.pauta.toLowerCase().includes('notícias quentes') && !log.pauta.toLowerCase().includes('auto-post')) {
        const cleanPauta = log.pauta.trim();
        if (cleanPauta.length > 5 && !seen.has(cleanPauta.toLowerCase())) {
          seen.add(cleanPauta.toLowerCase());
          items.push(`Pauta Carrossel: ${cleanPauta}`);
        }
      }
      (log.stories || []).forEach(s => {
        const raw = typeof s === 'string' ? s : (s.title || s.text || '');
        const cleanHeadline = raw.replace(/^[🚨🛑🇧🇷⚖️📢⚠️\s]+/, '').split('\n')[0].split('.')[0].trim();
        if (cleanHeadline.length > 12 && !seen.has(cleanHeadline.toLowerCase())) {
          seen.add(cleanHeadline.toLowerCase());
          items.push(`Slide: ${cleanHeadline}`);
        }
      });
    });

    // 2. Do portal (notícias publicadas e na fila)
    [...(newsData || []), ...(draftData || [])].slice(0, 30).forEach(n => {
      if (n.title) {
        const cleanTitle = n.title.trim();
        if (cleanTitle.length > 10 && !seen.has(cleanTitle.toLowerCase())) {
          seen.add(cleanTitle.toLowerCase());
          items.push(`Portal: ${cleanTitle}`);
        }
      }
    });

    return items.slice(0, 45);
  }, [sortedStoriesLog, newsData, draftData]);

  const getAntiRepetitionPrompt = (customList = null) => {
    const list = customList || antiRepetitionList;
    if (!list || list.length === 0) return '';
    return `
🚨 DIRETRIZ DE NÃO REPETIÇÃO (COBERTURAS RECENTES) 🚨
Evite focar exatamente nos mesmos fatos das coberturas recentes abaixo, priorizando novos desdobramentos ou outros acontecimentos quentes:
${list.slice(0, 15).map(item => `• ${item}`).join('\n')}

OBRIGATÓRIO: Retorne SEMPRE a quantidade de telas solicitada. NUNCA retorne a lista vazia.
`;
  };

  const createStoryBlob = async (storyObj, index, total) => {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1440;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const bgId = storyObj.bgId || globalBackground;
    const activeBg = BACKGROUNDS.find(b => b.id === bgId) || BACKGROUNDS[0];
    const text = storyObj.text || '';

    // 1. Desenha o fundo
    if (activeBg.type === 'image') {
      try {
        const bgImg = await safeLoadImageForCanvas(activeBg.url);
        if (bgImg) {
          ctx.drawImage(bgImg, 0, 0, width, height);
        } else {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width, height);
        }
      } catch (_) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }
    } else if (activeBg.type === 'color') {
      ctx.fillStyle = activeBg.value;
      ctx.fillRect(0, 0, width, height);
    } else if (activeBg.type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, activeBg.color1);
      grad.addColorStop(1, activeBg.color2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Desenha a foto da notícia / slide com safeLoadImageForCanvas (CORS safe)
    let photoDrawn = false;
    if (storyObj.imageUrl) {
      try {
        const imgPhoto = await safeLoadImageForCanvas(storyObj.imageUrl);
        if (imgPhoto) {
          const scale = Math.max(1080 / imgPhoto.width, 1080 / imgPhoto.height);
          const scaledW = imgPhoto.width * scale;
          const scaledH = imgPhoto.height * scale;
          const dx = (1080 - scaledW) / 2;
          const dy = (1080 - scaledH) / 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 1080, 1080);
          ctx.clip();
          ctx.drawImage(imgPhoto, dx, dy, scaledW, scaledH);
          ctx.restore();
          photoDrawn = true;
        }
      } catch (err) {
        console.warn("createStoryBlob: Erro ao carregar foto do slide:", err);
      }
    }

    // 3. Desenha o texto do slide
    const hasCustomImage = photoDrawn || !!storyObj.imageUrl;
    const textRect = hasCustomImage 
        ? { x: 0, y: 1080, width: 1080, height: 360 } 
        : { x: 0, y: 0, width: 1080, height: 1440 };

    ctx.font = hasCustomImage ? 'bold 45px sans-serif' : 'bold 55px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    const maxLineWidth = textRect.width - 120;

    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth && i > 0) {
            lines.push(currentLine.trim());
            currentLine = words[i] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    const lineHeight = hasCustomImage ? 60 : 75;
    const totalTextHeight = lines.length * lineHeight;
    const startY = textRect.y + (textRect.height / 2) - (totalTextHeight / 2);

    lines.forEach((line, idx) => {
        ctx.fillText(line, textRect.x + (textRect.width / 2), startY + (idx * lineHeight));
    });

    // Indicador de Slide (ex: 1 / 5)
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(`${index + 1} / ${total}`, width - 60, height - 60);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      }, 'image/jpeg', 0.9);
    });
  };

  const backgroundGenerateAndPost = async () => {
      if (!perplexityKey && !geminiKey) return;
      setIsAutoPosting(true);
      isAutoPostingRef.current = true;

      try {
          const topic = 'Notícias de Última Hora - Quentes do Momento';
          const recentLogItems = [];
          (storiesLogRef.current || []).slice(0, 30).forEach(l => {
              if (l.pauta && !l.pauta.toLowerCase().includes('notícias quentes') && !l.pauta.toLowerCase().includes('auto-post')) {
                  recentLogItems.push(`Pauta: ${l.pauta.trim()}`);
              }
              (l.stories || []).forEach(s => {
                  const raw = typeof s === 'string' ? s : (s.title || s.text || '');
                  const clean = raw.replace(/^[🚨🛑🇧🇷⚖️📢⚠️\s]+/, '').split('\n')[0].split('.')[0].trim();
                  if (clean.length > 12) recentLogItems.push(`Slide: ${clean}`);
              });
          });
          const antiRepetitionPrompt = getAntiRepetitionPrompt(Array.from(new Set(recentLogItems)).slice(0, 40));

          const finalPrompt = `
${basePrompt}
${antiRepetitionPrompt}
Assunto Solicitado: "${topic}"
Data e Hora Atual (Para buscar notícias AGORA): ${new Date().toLocaleString('pt-BR')}
Quantidade de Telas Solicitadas: ${autoPostCount}
          `;

          const obj = await callAI(finalPrompt, 'all');
          const mappedStories = extractSlidesFromAiResponse(obj, globalBackground);

          if (mappedStories.length > 0) {
              const mappedStoriesWithCta = [
                ...mappedStories,
                {
                  title: "Siga o @portalngbrasil",
                  text: "Acompanhe todos os dias as notícias que impactam o país e o mundo.",
                  imageUrl: "/siga-portalngbrasil.jpg",
                  source: "Portal NG Brasil",
                  isCta: true
                }
              ];

              setStoriesLog(prev => [{
                  id: Date.now().toString(),
                  pauta: "Auto-Post Bot (Carrossel Nuvem/Servidor)",
                  searchQuery: topic,
                  engine: 'Perplexity',
                  status: 'success',
                  storiesCount: mappedStoriesWithCta.length,
                  stories: mappedStoriesWithCta,
                  date: new Date().toISOString()
              }, ...prev]);

              if (metaToken && imgbbKey && metaIgAccountId) {
                  let childrenIds = [];
                  for (let i = 0; i < mappedStoriesWithCta.length; i++) {
                      try {
                          const blob = await createStoryBlob(mappedStoriesWithCta[i], i, mappedStoriesWithCta.length);
                          const imageUrl = await uploadImageForSocial(blob, imgbbKey);
                          if (imageUrl) {
                              const itemRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ image_url: imageUrl, is_carousel_item: true, access_token: metaToken })
                              });
                              const itemData = await itemRes.json();
                              if (itemData.id) {
                                  childrenIds.push(itemData.id);
                              }
                          }
                      } catch (e) {
                          console.error("AutoPost Meta Error Item:", e);
                      }
                  }

                  if (childrenIds.length > 0) {
                      const containerRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                              media_type: 'CAROUSEL', 
                              children: childrenIds, 
                              caption: topic,
                              access_token: metaToken 
                          })
                      });
                      const containerData = await containerRes.json();
                      
                      if (containerData.id) {
                          let igPublishData;
                          let retries = 10;
                          while (retries > 0) {
                              await new Promise(r => setTimeout(r, 5000));
                              const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media_publish`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ creation_id: containerData.id, access_token: metaToken })
                              });
                              igPublishData = await igPublishRes.json();
                              
                              const isTransient = igPublishData.error && (
                                  igPublishData.error.code === 9007 ||
                                  igPublishData.error.message.toLowerCase().includes('not exist') ||
                                  igPublishData.error.message.toLowerCase().includes('not ready') ||
                                  igPublishData.error.message.toLowerCase().includes('processing') ||
                                  igPublishData.error.message.toLowerCase().includes('in progress')
                              );

                              if (isTransient) {
                                  retries--;
                                  if (retries === 0) console.error("AutoPost Meta Error Publish Timeout");
                              } else if (igPublishData.error) {
                                  console.error("AutoPost Meta Error Publish:", igPublishData.error.message);
                                  break;
                              } else {
                                  break;
                              }
                          }
                      }
                  }
              }

              // Atualiza o agendamento de sucesso e grava o novo nextRun no Firestore
              const nextTime = Date.now() + autoPostInterval * 60000;
              setAutomationSettings(prev => ({
                ...prev,
                carousel: {
                  ...(prev?.carousel || {}),
                  lastRun: Date.now(),
                  nextRun: nextTime,
                  status: 'idle',
                  lastSuccess: new Date().toISOString(),
                  lastStoriesCount: mappedStories.length,
                  lastError: null
                }
              }));
          }
      } catch (e) {
          console.error("AutoPost error:", e);
          setAutomationSettings(prev => ({
            ...prev,
            carousel: {
              ...(prev?.carousel || {}),
              status: 'error',
              lastError: e.message || 'Erro ao publicar carrossel'
            }
          }));
      } finally {
          setIsAutoPosting(false);
          isAutoPostingRef.current = false;
      }
  };

  // Disparo automático garantido quando o horário agendado de carrossel é atingido
  useEffect(() => {
    if (!autoPostEnabled || !nextRunTimestamp) return;

    if (nowTick >= nextRunTimestamp && !isAutoPosting && !isAutoPostingRef.current) {
      const currentStatus = automationSettings?.carousel?.status;
      if (currentStatus === 'running') return;

      isAutoPostingRef.current = true;
      console.log("[Piloto Automático Carrossel] Executando ciclo agendado...");

      // Já avança o próximo horário de imediato no Firebase para evitar disparos duplicados
      const nextCycle = Date.now() + autoPostInterval * 60000;
      setAutomationSettings(prev => ({
        ...prev,
        carousel: {
          ...(prev?.carousel || {}),
          status: 'running',
          nextRun: nextCycle
        }
      }));

      backgroundGenerateAndPost().finally(() => {
        isAutoPostingRef.current = false;
      });
    }
  }, [nowTick, autoPostEnabled, nextRunTimestamp, isAutoPosting, autoPostInterval, automationSettings?.carousel?.status]);

  // Disparo manual forçado de carrossel
  const handleForceAutoPostNow = async () => {
    if (isAutoPosting || isAutoPostingRef.current) return;
    if (!metaToken || !metaIgAccountId || !imgbbKey) {
      alert("Faltam chaves do Meta ou ImgBB nas configurações.");
      return;
    }
    isAutoPostingRef.current = true;
    const nextCycle = Date.now() + autoPostInterval * 60000;
    setAutomationSettings(prev => ({
      ...prev,
      carousel: {
        ...(prev?.carousel || {}),
        status: 'running',
        nextRun: nextCycle
      }
    }));
    try {
      await backgroundGenerateAndPost();
    } finally {
      isAutoPostingRef.current = false;
    }
  };



  const callAI = async (prompt, aiChoice) => {
    let generatedText = null;

    const tryParse = (str) => {
      if (!str) return null;
      if (typeof str !== 'string') return str;
      let clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
      try { return JSON.parse(clean); } catch (e) {}

      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          const candidate = clean.substring(firstBrace, lastBrace + 1);
          return JSON.parse(candidate);
        } catch (e) {
          try {
            const fixed = clean.substring(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(fixed);
          } catch (e2) {}
        }
      }

      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          const candidate = clean.substring(firstBracket, lastBracket + 1);
          return JSON.parse(candidate);
        } catch (e) {}
      }

      return clean;
    };

    // Para busca de notícias e carrosséis em tempo real, Perplexity é o motor principal
    if (aiChoice === 'perplexity' || aiChoice === 'all') {
      if (perplexityKey) {
        setStatus('Pesquisando dados em tempo real com Perplexity...');
        try {
          const res = await fetch('https://api.perplexity.ai/v1/agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${perplexityKey.trim()}`
            },
            body: JSON.stringify({
              preset: 'fast',
              instructions: 'Retorne estritamente um JSON no formato solicitado com a lista "slides". Não use markdown adicional.',
              input: prompt,
              background: false
            })
          });

          if (res.ok) {
            const rawText = await res.text();
            try { 
              const data = JSON.parse(rawText); 
              if (data.output) {
                if (Array.isArray(data.output)) {
                  const msg = data.output.find(o => o.type === 'message' || o.role === 'assistant');
                  if (msg) {
                    if (Array.isArray(msg.content)) {
                      const textObj = msg.content.find(c => c && (c.text || c.type === 'output_text'));
                      if (textObj && textObj.text) generatedText = textObj.text;
                      else if (typeof msg.content[0] === 'string') generatedText = msg.content[0];
                    } else if (typeof msg.content === 'string') {
                      generatedText = msg.content;
                    } else if (msg.text) {
                      generatedText = msg.text;
                    }
                  }
                  if (!generatedText) {
                    const anyText = data.output.find(o => o && o.text);
                    if (anyText) generatedText = anyText.text;
                  }
                } else if (typeof data.output === 'string') {
                  generatedText = data.output;
                } else if (typeof data.output === 'object') {
                  return data.output;
                }
              } else if (data.choices && data.choices[0] && data.choices[0].message) {
                generatedText = data.choices[0].message.content;
              }
            } catch (e) {
              generatedText = rawText;
            }
          } else {
            console.warn(`Perplexity /v1/agent retornou HTTP ${res.status}. Tentando /chat/completions...`);
            const fallbackRes = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${perplexityKey.trim()}`
              },
              body: JSON.stringify({
                model: 'sonar',
                messages: [
                  { role: 'system', content: 'Você retorna estritamente um objeto JSON válido.' },
                  { role: 'user', content: prompt }
                ]
              })
            });
            if (fallbackRes.ok) {
              const fbData = await fallbackRes.json();
              if (fbData.choices && fbData.choices[0] && fbData.choices[0].message) {
                generatedText = fbData.choices[0].message.content;
              }
            }
          }
        } catch (e) {
          console.warn("Erro ao consultar Perplexity:", e);
        }
      }
    }

    // Se Perplexity não respondeu ou aiChoice for 'gemini' ou 'all', consulta Gemini
    if (!generatedText && (aiChoice === 'gemini' || aiChoice === 'all' || !generatedText)) {
      if (geminiKey) {
        setStatus('Consultando Gemini...');
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          });
          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          }
        } catch (e) {
          console.warn("Erro ao consultar Gemini:", e);
        }
      }
    }

    if (!generatedText) {
      throw new Error("Não foi possível gerar a resposta. Verifique as chaves (Perplexity/Gemini) na aba de Chaves do Robô.");
    }
    
    return tryParse(generatedText);
  };

  const handleGenerateCarousels = async (aiChoice) => {
    if (!perplexityKey && !geminiKey) {
        alert("Nenhuma chave de IA configurada (Gemini ou Perplexity). Configure na aba de Chaves do Robô.");
        return;
    }

    setIsLoading(true);
    setLoadingEngine(aiChoice);
    setStories([]);
    setRawAiLog('');
    setStatus('Consultando histórico e gerando Carrossel...');

    const topic = searchQuery.trim() || 'Notícias quentes do momento (Geral)';

    try {
      const antiDuplicationContext = getAntiRepetitionPrompt();

      const finalPrompt = `
${basePrompt}
${antiDuplicationContext}
Assunto Solicitado: "${topic}"
Data e Hora Atual (Para buscar notícias AGORA): ${new Date().toLocaleString('pt-BR')}
Quantidade de Telas Solicitadas: ${pautasCount}
      `;

      const obj = await callAI(finalPrompt, aiChoice);
      setRawAiLog(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));

      let mappedStories = extractSlidesFromAiResponse(obj, globalBackground);

      // Redundância instantânea: se vier vazio, recupera automaticamente
      if (mappedStories.length === 0) {
          setStatus('Ajustando critérios para garantir geração imediata do carrossel...');
          if (geminiKey) {
              try {
                  const gPrompt = `${basePrompt}\nAssunto Solicitado: "${topic}". Crie exatamente ${pautasCount} telas para o Carrossel. Retorne estritamente JSON com ${pautasCount} slides.`;
                  const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          contents: [{ parts: [{ text: gPrompt }] }],
                          generationConfig: { responseMimeType: 'application/json' }
                      })
                  });
                  if (gRes.ok) {
                      const gData = await gRes.json();
                      const gText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (gText) {
                          mappedStories = extractSlidesFromAiResponse(JSON.parse(gText), globalBackground);
                      }
                  }
              } catch (e) {
                  console.warn("Fallback Gemini:", e);
              }
          }

          if (mappedStories.length === 0 && perplexityKey) {
              try {
                  const cleanPrompt = `${basePrompt}\nAssunto Solicitado: "${topic}". Crie exatamente ${pautasCount} telas para o Carrossel com fatos quentes e relevantes. Retorne estritamente JSON com ${pautasCount} slides.`;
                  const retryObj = await callAI(cleanPrompt, 'perplexity');
                  mappedStories = extractSlidesFromAiResponse(retryObj, globalBackground);
              } catch (e) {
                  console.warn("Retry Perplexity:", e);
              }
          }
      }

      if (mappedStories.length > 0) {
          const storiesWithCta = [
            ...mappedStories,
            {
              title: "Siga o @portalngbrasil",
              text: "Acompanhe todos os dias as notícias que impactam o país e o mundo.",
              imageUrl: "/siga-portalngbrasil.jpg",
              source: "Portal NG Brasil",
              isCta: true
            }
          ];
          setStories(storiesWithCta);
          setStatus('Carrossel gerado com sucesso!');
          
          const newLog = {
              id: Date.now().toString(),
              pauta: topic,
              searchQuery: searchQuery.trim(),
              engine: aiChoice === 'perplexity' ? 'Perplexity (Busca Web)' : aiChoice === 'gemini' ? 'Gemini' : 'Perplexity + IA',
              status: 'success',
              storiesCount: storiesWithCta.length,
              stories: storiesWithCta,
              date: new Date().toISOString()
          };
          setStoriesLog(prev => [newLog, ...prev]);
      } else {
          console.error("Recebido inválido:", obj);
          throw new Error("A IA respondeu, mas não foi possível extrair os slides do carrossel. Tente novamente.");
      }

    } catch (err) {
      console.error(err);
      setStatus("Erro: " + err.message);
      const errorLog = {
          id: Date.now().toString(),
          pauta: topic,
          searchQuery: searchQuery.trim(),
          engine: aiChoice === 'perplexity' ? 'Perplexity' : aiChoice === 'gemini' ? 'Gemini' : 'Perplexity + IA',
          status: 'error',
          error: err.message,
          storiesCount: 0,
          stories: [],
          date: new Date().toISOString()
      };
      setStoriesLog(prev => [errorLog, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualScreen = () => {
      setStories(prev => [...prev, "Novo texto para o slide..."]);
  };

  return (
    <div className="w-full py-4 px-2 sm:px-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-indigo-600" /> Gerador Direto de Carrosséis
            </h2>
            <button 
                onClick={() => setShowPromptConfig(!showPromptConfig)}
                className="text-sm font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
            >
                <Settings2 className="w-4 h-4" /> Configurar Prompt IA
            </button>
        </div>

        {showPromptConfig && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="block text-sm font-bold text-slate-700 mb-2">Prompt Base para a IA:</label>
                <textarea 
                    value={basePrompt}
                    onChange={(e) => setBasePrompt(e.target.value)}
                    className="w-full h-40 p-3 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-xs text-slate-500 mt-2">Você pode alterar este texto para ajustar o tom, os emojis, etc. O sistema incluirá a quantidade de telas e o assunto automaticamente ao final.</p>
            </div>
        )}

        <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-600" /> Regras Atuais da Geração de Carrosséis
            </h3>
            <ul className="text-xs text-yellow-800 space-y-1.5 list-disc list-inside">
                <li><strong>Atualização Máxima:</strong> Apenas notícias de última hora ou desdobramentos didáticos de relevância atual.</li>
                <li><strong>Formato Carrossel:</strong> Capa chamativa, desenvolvimento do meio e Call to Action no final.</li>
                <li><strong>Estilo Visual:</strong> Formato 1080x1350 (Portrait) ideal para retenção no feed do Instagram.</li>
            </ul>
        </div>

        <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-xs">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> Piloto Automático (Auto-Post Carrossel)
                    </h3>
                    {autoPostEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Servidor Ativo 24/7
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-700">
                        Inativo
                      </span>
                    )}
                </div>
                
                <p className="text-xs text-indigo-800">
                  Gera e publica carrosséis no Instagram de forma autônoma na nuvem e no servidor. 
                  <span className="font-semibold text-indigo-950 ml-1">O horário fica sincronizado e não recomeça ao atualizar a página.</span>
                </p>

                {autoPostEnabled && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        {isAutoPosting || automationSettings?.carousel?.status === 'running' ? (
                           <div className="flex items-center gap-2 text-indigo-900 font-bold bg-indigo-100/90 px-3 py-1.5 rounded-md border border-indigo-200">
                             <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> 
                             <span>Gerando roteiro e publicando carrossel no Instagram agora...</span>
                           </div>
                        ) : nextRunTime ? (
                           <div className="flex items-center gap-2 text-indigo-950 bg-white px-3 py-1.5 rounded-md border border-indigo-200 shadow-2xs">
                             <Clock className="w-3.5 h-3.5 text-indigo-600" />
                             <span>Próxima geração agendada para: <strong>{nextRunTime.toLocaleTimeString('pt-BR')}</strong></span>
                             <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                               (em {formattedCountdown || 'instantes'})
                             </span>
                           </div>
                        ) : null}

                        {automationSettings?.carousel?.lastSuccess && (
                          <span className="text-[11px] text-gray-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Último envio: {new Date(automationSettings.carousel.lastSuccess).toLocaleTimeString('pt-BR')}
                            {automationSettings?.carousel?.lastStoriesCount ? ` (${automationSettings.carousel.lastStoriesCount} slides)` : ''}
                          </span>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-indigo-800 uppercase">A cada (Minutos)</label>
                    <input 
                      type="number" 
                      value={autoPostInterval} 
                      onChange={e => {
                        const val = Math.max(5, Number(e.target.value) || 30);
                        const now = Date.now();
                        setAutomationSettings(prev => ({
                          ...prev, 
                          carousel: {
                            ...(prev?.carousel || {}), 
                            intervalMinutes: val,
                            nextRun: (prev?.carousel?.lastRun ? prev.carousel.lastRun + val * 60000 : now + val * 60000)
                          }
                        }));
                      }} 
                      className="w-20 px-2 py-1.5 border border-indigo-200 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 bg-white" 
                      min="5" 
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-indigo-800 uppercase">Qtd. Telas</label>
                    <input 
                      type="number" 
                      value={autoPostCount} 
                      onChange={e => {
                        const val = Math.max(1, Math.min(10, Number(e.target.value) || 5));
                        setAutomationSettings(prev => ({
                          ...prev, 
                          carousel: {
                            ...(prev?.carousel || {}), 
                            pautasCount: val
                          }
                        }));
                      }} 
                      className="w-20 px-2 py-1.5 border border-indigo-200 rounded text-sm text-center focus:ring-2 focus:ring-indigo-500 bg-white" 
                      min="1" 
                      max="10" 
                    />
                </div>
                
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  {autoPostEnabled && (
                    <button
                      type="button"
                      onClick={handleForceAutoPostNow}
                      disabled={isAutoPosting || automationSettings?.carousel?.status === 'running'}
                      title="Disparar a geração e publicação imediatamente no Instagram"
                      className="px-3 py-2 rounded font-semibold text-xs text-indigo-900 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Publicar Agora
                    </button>
                  )}
                  
                  <button 
                      type="button"
                      onClick={() => {
                          if (!metaToken || !metaIgAccountId || !imgbbKey) {
                              alert("Faltam chaves do Meta ou ImgBB nas configurações.");
                              return;
                          }
                          const willEnable = !autoPostEnabled;
                          const now = Date.now();
                          const interval = autoPostInterval || 30;
                          const targetNext = (automationSettings?.carousel?.nextRun && automationSettings.carousel.nextRun > now)
                              ? automationSettings.carousel.nextRun
                              : now + interval * 60000;

                          setAutomationSettings(prev => ({
                            ...prev, 
                            carousel: {
                              ...(prev?.carousel || {}), 
                              enabled: willEnable,
                              intervalMinutes: interval,
                              pautasCount: autoPostCount || 5,
                              lastRun: willEnable ? (prev?.carousel?.lastRun || now) : (prev?.carousel?.lastRun || 0),
                              nextRun: willEnable ? targetNext : null,
                              status: 'idle',
                              lastError: null
                            }
                          }));
                      }}
                      className={`px-4 py-2 rounded font-bold text-sm text-white transition-colors flex items-center gap-2 shadow-xs ${autoPostEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                      {autoPostEnabled ? <>🛑 Parar Automação</> : <><Bot className="w-4 h-4"/> Iniciar Automação</>}
                  </button>
                </div>
            </div>
        </div>

        {/* Banner de Proteção Antiduplicidade */}
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                Proteção Antiduplicidade Ativa 
                <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Conteúdo Inédito</span>
              </p>
              <p className="text-[11px] text-emerald-700">
                O gerador consulta o histórico de <strong>{antiRepetitionList.length} pautas e notícias recentes</strong> para não repetir nenhum assunto anterior.
              </p>
            </div>
          </div>
          <a 
            href="#carousels-history" 
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" /> Ver Log de Pesquisas ({sortedStoriesLog.length})
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Pesquisar Assunto</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Ex: Prisão do Deolane, Queimadas no Pantanal, Economia..." 
                className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Qtd. Telas</label>
            <select 
              value={pautasCount} 
              onChange={e => setPautasCount(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="1">1 Tela</option>
              <option value="3">3 Telas</option>
              <option value="5">5 Telas</option>
              <option value="10">10 Telas</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-slate-800 mb-2">Fundo Padrão</label>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map(bg => (
                <button 
                  key={bg.id}
                  onClick={() => setGlobalBackground(bg.id)}
                  title={bg.label}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${globalBackground === bg.id ? 'border-indigo-600 scale-110 shadow-md' : 'border-slate-200 hover:scale-105'} overflow-hidden shrink-0`}
                  style={{
                    background: bg.type === 'color' ? bg.value : bg.type === 'gradient' ? `linear-gradient(to bottom, ${bg.color1}, ${bg.color2})` : `url(${bg.url}) center/cover`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button 
            type="button" 
            onClick={() => handleGenerateCarousels('all')}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-70"
          >
            {isLoading && loadingEngine === 'all' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
            Gerar Carrossel Imediatamente (Gemini/ChatGPT)
          </button>
          <button 
            type="button" 
            onClick={() => handleGenerateCarousels('perplexity')}
            disabled={isLoading}
            className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg hover:bg-black transition-all disabled:opacity-70"
          >
            {isLoading && loadingEngine === 'perplexity' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Pesquisar & Gerar com Perplexity
          </button>
        </div>

        {status && <p className="text-sm font-semibold text-indigo-600 mt-4 text-center">{status}</p>}
      </div>

      {rawAiLog && (
        <div className="bg-slate-900 rounded-xl p-4 mb-8">
            <h3 className="text-white text-xs font-bold uppercase mb-2 text-slate-400">Log de Retorno da IA (Para Debug)</h3>
            <pre className="text-green-400 text-xs whitespace-pre-wrap overflow-x-auto">
                {rawAiLog}
            </pre>
        </div>
      )}

      {stories.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">
                    Resultado: <span className="text-indigo-600">{stories.length} Telas Geradas</span>
                </h3>
                <button 
                    onClick={handleAddManualScreen}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> Adicionar Tela Extra
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stories.map((storyObj, idx) => (
                <CarouselCard 
                    key={idx} 
                    storyObj={typeof storyObj === 'string' ? {text: storyObj} : storyObj} 
                    index={idx} 
                    total={stories.length} 
                    metaToken={metaToken}
                    metaIgAccountId={metaIgAccountId}
                    imgbbKey={imgbbKey}
                    onChangeText={(newText) => {
                        const newArr = [...stories];
                        if (typeof newArr[idx] === 'string') {
                            newArr[idx] = newText;
                        } else {
                            newArr[idx] = { ...newArr[idx], text: newText };
                        }
                        setStories(newArr);
                    }}
                    onChangeImage={(newImageUrl) => {
                        const newArr = [...stories];
                        if (typeof newArr[idx] === 'string') {
                            newArr[idx] = { text: newArr[idx], imageUrl: newImageUrl };
                        } else {
                            newArr[idx] = { ...newArr[idx], imageUrl: newImageUrl };
                        }
                        setStories(newArr);
                    }}
                />
            ))}
            </div>
        </div>
      )}

      <div id="carousels-history" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" /> Log de Pesquisas & Histórico de Carrosséis
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registro auditável de todas as pautas de carrossel geradas para consulta e prevenção de duplicidades.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> {sortedStoriesLog.length} pesquisas salvas
            </span>
          </div>
        </div>

        {sortedStoriesLog.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <input 
                type="text"
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                placeholder="Filtrar histórico por assunto, slide, data..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {logFilter && (
                <button 
                  onClick={() => setLogFilter('')} 
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}
        
        {(() => {
          const filteredLogs = sortedStoriesLog.filter(log => {
            if (!logFilter.trim()) return true;
            const q = logFilter.toLowerCase();
            const pautaMatch = log.pauta?.toLowerCase().includes(q);
            const queryMatch = log.searchQuery?.toLowerCase().includes(q);
            const storiesMatch = (log.stories || []).some(s => (typeof s === 'string' ? s : (s.title || s.text || '')).toLowerCase().includes(q));
            return pautaMatch || queryMatch || storiesMatch;
          });

          if (sortedStoriesLog.length === 0) {
            return (
              <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Nenhum registro no histórico de carrosséis ainda.</p>
              </div>
            );
          }

          if (filteredLogs.length === 0) {
            return (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">Nenhum item do histórico corresponde ao filtro "{logFilter}".</p>
                <button onClick={() => setLogFilter('')} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                  Ver todas as {sortedStoriesLog.length} pesquisas
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {filteredLogs.map(log => {
                const isError = log.status === 'error';
                const storiesList = log.stories || [];

                return (
                  <div key={log.id} className={`border rounded-lg p-4 transition-all ${isError ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isError ? 'ERRO' : 'SUCESSO'}
                          </span>
                          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-bold">
                            {log.engine || 'Perplexity'}
                          </span>
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded font-bold">
                            {log.storiesCount || storiesList.length} Slides
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(log.date).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Pauta: {log.pauta}</span>
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {storiesList.length > 0 && (
                          <>
                            <button
                              onClick={() => {
                                const allTexts = storiesList.map((s, idx) => `Slide ${idx + 1}: ${typeof s === 'string' ? s : (s.title || s.text)}`).join('\n\n');
                                navigator.clipboard.writeText(allTexts);
                                setCopiedLogId(log.id);
                                setTimeout(() => setCopiedLogId(null), 2500);
                              }}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                              title="Copiar texto de todos os slides"
                            >
                              {copiedLogId === log.id ? <><Check className="w-3 h-3 text-emerald-600" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                            </button>
                            <button
                              onClick={() => {
                                setSearchQuery(log.searchQuery || log.pauta);
                                setStories(storiesList);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded text-xs font-bold transition-colors"
                            >
                              Abrir no Editor
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setStoriesLog(prev => prev.filter(item => item.id !== log.id))}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Excluir do Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isError ? (
                      <p className="text-xs text-red-600 bg-white p-2.5 rounded border border-red-200 font-mono">
                        {log.error || 'Falha ao gerar carrossel.'}
                      </p>
                    ) : (
                      <div className="text-xs text-slate-600 space-y-1.5 bg-white p-3 rounded border border-slate-200">
                        {storiesList.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="font-bold text-indigo-600 text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                              Slide {i + 1}
                            </span>
                            <p className="line-clamp-2 text-slate-700">
                              {typeof s === 'string' ? s : (s.title || s.text)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

    </div>
  );
}

function CarouselCard({ storyObj, index, total, onChangeText, onChangeImage, metaToken, metaIgAccountId, imgbbKey }) {
    const canvasRef = useRef(null);
    const [localBgId, setLocalBgId] = useState(storyObj?.bgId || 'plantao');
    const fileInputRef = useRef(null);
    
    const text = storyObj?.text || '';
    const imageUrl = storyObj?.imageUrl || null;

    useEffect(() => {
        renderStory();
    }, [text, total, localBgId, imageUrl]);

    const renderStory = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const width = 1080;
        const height = 1440;
        canvas.width = width;
        canvas.height = height;

        const activeBg = BACKGROUNDS.find(b => b.id === localBgId) || BACKGROUNDS[0];

        // 1. Desenha o fundo
        if (activeBg.type === 'image') {
            try {
                const bgImg = await safeLoadImageForCanvas(activeBg.url);
                if (bgImg) {
                    ctx.drawImage(bgImg, 0, 0, width, height);
                } else {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, width, height);
                }
            } catch (_) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);
            }
        } else if (activeBg.type === 'color') {
            ctx.fillStyle = activeBg.value;
            ctx.fillRect(0, 0, width, height);
        } else if (activeBg.type === 'gradient') {
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, activeBg.color1);
            grad.addColorStop(1, activeBg.color2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Desenha a foto do slide de forma segura
        if (imageUrl) {
            try {
                const imgPhoto = await safeLoadImageForCanvas(imageUrl);
                if (imgPhoto) {
                    const scale = Math.max(1080 / imgPhoto.width, 1080 / imgPhoto.height);
                    const scaledW = imgPhoto.width * scale;
                    const scaledH = imgPhoto.height * scale;
                    const dx = (1080 - scaledW) / 2;
                    const dy = (1080 - scaledH) / 2;
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, 1080, 1080);
                    ctx.clip();
                    ctx.drawImage(imgPhoto, dx, dy, scaledW, scaledH);
                    ctx.restore();

                    // Gradiente suave na transição foto / texto
                    const grad = ctx.createLinearGradient(0, 880, 0, 1080);
                    grad.addColorStop(0, 'rgba(0,0,0,0)');
                    grad.addColorStop(1, 'rgba(0,0,0,0.8)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 880, 1080, 200);
                }
            } catch (err) {
                console.warn("renderStory: Erro ao carregar imagem:", err);
            }
        }

        drawTextContent(ctx, width, height);
    };

    const drawTextContent = (ctx, width, height) => {
        const textRect = imageUrl 
            ? { x: 0, y: 1080, width: 1080, height: 360 } 
            : { x: 0, y: 0, width: 1080, height: 1440 };

        ctx.font = imageUrl ? 'bold 45px sans-serif' : 'bold 55px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = (text || '').split(' ');
        let lines = [];
        let currentLine = '';
        const maxLineWidth = textRect.width - 120;

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxLineWidth && i > 0) {
                lines.push(currentLine.trim());
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());

        const lineHeight = imageUrl ? 60 : 75;
        const totalTextHeight = lines.length * lineHeight;
        const startY = textRect.y + (textRect.height / 2) - (totalTextHeight / 2);

        lines.forEach((line, idx) => {
            ctx.fillText(line, textRect.x + (textRect.width / 2), startY + (idx * lineHeight));
        });

        // Draw Slide Indicator
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'right';
        ctx.fillText(`${index + 1} / ${total}`, width - 60, height - 60);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            onChangeImage(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `carrossel_ng_${index + 1}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    };

    return (
        <div className="flex flex-col bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 relative">
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
                Tela {index + 1}/{total}
            </div>
            <div className="relative w-full aspect-[3/4] bg-black">
                <canvas 
                    ref={canvasRef} 
                    className="w-full h-full object-contain"
                />
            </div>
            <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Fundo:</span>
                    {BACKGROUNDS.map(bg => (
                        <button 
                            key={bg.id}
                            onClick={() => setLocalBgId(bg.id)}
                            title={bg.label}
                            className={`w-6 h-6 rounded-full border-2 shrink-0 transition-all ${localBgId === bg.id ? 'border-indigo-500 scale-110' : 'border-slate-600 hover:border-slate-400'} overflow-hidden`}
                            style={{
                                background: bg.type === 'color' ? bg.value : bg.type === 'gradient' ? `linear-gradient(to bottom, ${bg.color1}, ${bg.color2})` : `url(${bg.url}) center/cover`
                            }}
                        />
                    ))}
                </div>
                <textarea 
                    value={text}
                    onChange={(e) => onChangeText(e.target.value)}
                    className="w-full bg-slate-700 text-white text-sm rounded p-2 outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20"
                    placeholder="Edite o texto do slide..."
                />

                <div className="flex gap-2">
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-indigo-300 font-bold py-2 px-3 rounded border border-slate-600 transition-colors flex items-center justify-center gap-2 text-xs"
                    >
                        <ImageIcon className="w-4 h-4" /> {imageUrl ? 'Trocar Foto' : 'Add Foto'}
                    </button>
                    {imageUrl && (
                        <button 
                            onClick={() => onChangeImage(null)}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/40 font-bold py-2 px-3 rounded transition-colors flex items-center justify-center text-xs"
                            title="Remover Foto"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                {(storyObj?.source || storyObj?.title) && (
                    <div className="bg-slate-900 rounded p-3 text-xs text-slate-300 space-y-2 mt-1 border border-slate-700/50">
                        <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-white text-[11px] leading-tight line-clamp-2">{storyObj.title}</span>
                            {storyObj.relevance && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">{storyObj.relevance}°C</span>}
                        </div>
                        <div className="flex justify-between items-center opacity-80 pt-1 border-t border-slate-800">
                            <span className="flex items-center gap-1.5 text-[10px]"><Search className="w-3 h-3" /> {storyObj.source}</span>
                            <span className="flex items-center gap-1.5 text-[10px]"><Clock className="w-3 h-3" /> {storyObj.date}</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={handleDownload}
                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 text-xs"
                    >
                        <Download className="w-4 h-4" /> Baixar
                    </button>
                </div>
            </div>
        </div>
    );
}
