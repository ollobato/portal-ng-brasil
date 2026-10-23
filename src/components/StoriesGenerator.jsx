import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Image as ImageIcon, Download, Sparkles, Loader2, Bot, Plus, Send, Clock, Trash2, Settings2, ShieldCheck, CheckCircle2, AlertTriangle, FileText, RefreshCw, Copy, Check } from 'lucide-react';
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

export function extractStoriesFromAiResponse(obj, defaultBg = 'plantao') {
  if (!obj) return [];
  let storiesList = [];

  // 1. Se já for um array direto
  if (Array.isArray(obj)) {
    storiesList = obj;
  } else if (typeof obj === 'object') {
    // 2. Se a IA separou por Brasil e Internacional / Mundo
    if (Array.isArray(obj.brasil) || Array.isArray(obj.internacional) || Array.isArray(obj.mundo)) {
      storiesList = [
        ...(Array.isArray(obj.brasil) ? obj.brasil : []),
        ...(Array.isArray(obj.internacional) ? obj.internacional : Array.isArray(obj.mundo) ? obj.mundo : [])
      ];
    } else if (Array.isArray(obj.stories)) {
      storiesList = obj.stories;
    } else if (obj.stories && typeof obj.stories === 'object') {
      const innerArrays = Object.values(obj.stories).filter(Array.isArray);
      if (innerArrays.length > 0) storiesList = innerArrays.flat();
    } else if (Array.isArray(obj.slides)) {
      storiesList = obj.slides;
    } else if (Array.isArray(obj.news)) {
      storiesList = obj.news;
    } else if (Array.isArray(obj.noticias)) {
      storiesList = obj.noticias;
    } else if (Array.isArray(obj.pautas)) {
      storiesList = obj.pautas;
    } else if (Array.isArray(obj.telas)) {
      storiesList = obj.telas;
    } else if (Array.isArray(obj.items)) {
      storiesList = obj.items;
    } else if (Array.isArray(obj.posts)) {
      storiesList = obj.posts;
    } else {
      // 3. Procura QUALQUER array existente no objeto retornado
      const anyArray = Object.values(obj).find(val => Array.isArray(val) && val.length > 0);
      if (anyArray) {
        storiesList = anyArray;
      } else if (obj.text || obj.title || obj.noticia || obj.story) {
        storiesList = [obj];
      }
    }
  } else if (typeof obj === 'string') {
    // 4. Se a IA retornou texto puro (ex: lista numerada de notícias)
    const lines = obj.split(/\n\s*\n|\n(?=\d+[\.\)]|\bTela\s+\d+:?)/i)
      .map(s => s.replace(/^\d+[\.\)]\s*|^Tela\s+\d+:?\s*/i, '').trim())
      .filter(s => s.length > 15);
    if (lines.length > 0) {
      storiesList = lines.map(text => ({ text }));
    }
  }

  // Normaliza cada item garantindo que tenha .text preenchido e legível
  return storiesList.map(s => {
    if (typeof s === 'string') {
      return { text: s, bgId: defaultBg };
    }
    if (s && typeof s === 'object') {
      let text = s.text || s.content || s.story || s.noticia || s.slide || s.pauta || '';
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

export default function StoriesGenerator({ perplexityKey, geminiKey, metaToken, metaIgAccountId, imgbbKey, newsData = [], draftData = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [copiedLogId, setCopiedLogId] = useState(null);
  const [pautasCount, setPautasCount] = useState('5');
  const [globalBackground, setGlobalBackground] = useState('plantao');
  
const defaultPrompt = `Você é um editor de social media conservador e ágil do Portal NG Brasil. 
Crie telas curtas para Stories do Instagram com as NOTÍCIAS MAIS QUENTES E IMPORTANTES DO MOMENTO.

Regras Fundamentais:
1. DIVISÃO EQUILIBRADA: Metade das notícias sobre o Brasil (política, economia, segurança, justiça) e metade Internacional (EUA, geopolítica, mundo).
2. CONTEÚDO RECENTE: Priorize fatos quentes e recentes de hoje ou dos últimos dias. Foque em acontecimentos de alto impacto e repercussão pública.
3. NÃO REPETIR: Evite focar exatamente nos mesmos fatos das coberturas recentes enviadas abaixo, buscando novos desdobramentos ou outros acontecimentos quentes de relevância.
4. OBRIGATÓRIO: Retorne SEMPRE a quantidade de notícias solicitada. NUNCA retorne a lista vazia. Se uma pauta já foi coberta, escolha outro acontecimento quente do momento.
5. FORMATO DE CADA TELA: Um resumo direto e impactante de 1 a 2 frases com emojis conservadores (🇧🇷, 🚨, ⚖️, 🛑, 🌍). Fácil de ler no celular.

Retorne estritamente um JSON no formato abaixo, com todas as notícias dentro do array "stories":
{ "stories": [
  {
    "text": "Texto com emoji e resumo da notícia...",
    "source": "Fonte da notícia (ex: G1, Folha, Reuters, AP)",
    "date": "Data e hora",
    "title": "Título original",
    "relevance": 95
  }
] }`;

  const [basePrompt, setBasePrompt] = useState(defaultPrompt);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingEngine, setLoadingEngine] = useState(''); // 'all' or 'perplexity'
  const [status, setStatus] = useState('');
  
  const [rawAiLog, setRawAiLog] = useState('');

  const [stories, setStories] = useState([]); // array of strings for screens
  const [storiesLog, setStoriesLog] = useFirebaseSync('stories_logs', []);
  const [showPromptConfig, setShowPromptConfig] = useState(false);

  const [automationSettings, setAutomationSettings] = useFirebaseDoc('settings', 'automation', { carousel: { enabled: false, intervalMinutes: 30, pautasCount: 5, lastRun: 0 }, stories: { enabled: false, intervalMinutes: 30, pautasCount: 5, lastRun: 0 } });
  
  const autoPostEnabled = Boolean(automationSettings?.stories?.enabled);
  const autoPostInterval = Number(automationSettings?.stories?.intervalMinutes) || 30;
  const autoPostCount = Number(automationSettings?.stories?.pautasCount) || 5;

  // Relógio ativo para sincronização segundo a segundo da contagem regressiva
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Próximo disparo salvo de forma persistente no Firestore (não reseta ao recarregar a página)
  const nextRunTimestamp = useMemo(() => {
    if (!autoPostEnabled) return null;
    const stored = automationSettings?.stories?.nextRun;
    if (stored && typeof stored === 'number' && stored > 0) {
      return stored;
    }
    const last = automationSettings?.stories?.lastRun;
    if (last && typeof last === 'number' && last > 0) {
      return last + autoPostInterval * 60000;
    }
    return null;
  }, [autoPostEnabled, automationSettings?.stories?.nextRun, automationSettings?.stories?.lastRun, autoPostInterval]);

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

  // Se o piloto automático estiver ativado mas sem nextRun salvo no Firebase, inicializa para não resetar
  useEffect(() => {
    if (autoPostEnabled && (!automationSettings?.stories?.nextRun || automationSettings.stories.nextRun <= 0)) {
      const scheduled = Date.now() + autoPostInterval * 60000;
      setAutomationSettings(prev => ({
        ...prev,
        stories: {
          ...(prev?.stories || {}),
          lastRun: prev?.stories?.lastRun || Date.now(),
          nextRun: scheduled,
          status: 'idle'
        }
      }));
    }
  }, [autoPostEnabled, automationSettings?.stories?.nextRun, autoPostInterval]);
  // Ordena do mais recente para o mais antigo de forma garantida
  const sortedStoriesLog = useMemo(() => {
    return [...(storiesLog || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [storiesLog]);

  const storiesLogRef = useRef(sortedStoriesLog);
  useEffect(() => {
      storiesLogRef.current = sortedStoriesLog;
  }, [sortedStoriesLog]);

  // Extrai lista de notícias/pautas/stories recentes para consulta e bloqueio rigoroso de repetições
  const antiRepetitionList = useMemo(() => {
    const seen = new Set();
    const items = [];

    // 1. Stories gerados anteriormente (últimos 35 registros)
    (sortedStoriesLog || []).slice(0, 35).forEach(log => {
      if (log.pauta && !log.pauta.toLowerCase().includes('notícias quentes') && !log.pauta.toLowerCase().includes('auto-post')) {
        const cleanPauta = log.pauta.trim();
        if (cleanPauta.length > 5 && !seen.has(cleanPauta.toLowerCase())) {
          seen.add(cleanPauta.toLowerCase());
          items.push(`Pauta: ${cleanPauta}`);
        }
      }
      (log.stories || []).forEach(s => {
        const raw = typeof s === 'string' ? s : (s.title || s.text || '');
        const cleanHeadline = raw.replace(/^[🚨🛑🇧🇷⚖️📢⚠️\s]+/, '').split('\n')[0].split('.')[0].trim();
        if (cleanHeadline.length > 12 && !seen.has(cleanHeadline.toLowerCase())) {
          seen.add(cleanHeadline.toLowerCase());
          items.push(`Story: ${cleanHeadline}`);
        }
      });
    });

    // 2. Notícias recentes publicadas ou em rascunho no portal
    [...(newsData || []), ...(draftData || [])].slice(0, 35).forEach(n => {
      if (n.title) {
        const cleanTitle = n.title.trim();
        if (cleanTitle.length > 10 && !seen.has(cleanTitle.toLowerCase())) {
          seen.add(cleanTitle.toLowerCase());
          items.push(`Portal: ${cleanTitle}`);
        }
      }
    });

    return items.slice(0, 50);
  }, [sortedStoriesLog, newsData, draftData]);

  const getAntiRepetitionPrompt = (customList = null) => {
    const list = customList || antiRepetitionList;
    if (!list || list.length === 0) return '';
    return `
🚨 DIRETRIZ DE NÃO REPETIÇÃO (COBERTURAS RECENTES) 🚨
Evite focar exatamente nos mesmos fatos das coberturas recentes abaixo, priorizando novos desdobramentos ou outros acontecimentos quentes:
${list.slice(0, 15).map(item => `• ${item}`).join('\n')}

OBRIGATÓRIO: Retorne SEMPRE a quantidade de notícias solicitada. NUNCA retorne a lista vazia. Se uma pauta acima já foi coberta, escolha outro acontecimento quente do momento.
`;
  };

  const createStoryBlob = async (storyObj, index, total) => {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const bgId = storyObj.bgId || globalBackground;
    const activeBg = BACKGROUNDS.find(b => b.id === bgId) || BACKGROUNDS[0];
    const text = storyObj.text || '';

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

    ctx.font = 'bold 65px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    const maxWidth = width - 160;

    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            lines.push(currentLine.trim());
            currentLine = words[i] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    const lineHeight = 85;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (height / 2) - (totalTextHeight / 2) + 180;

    lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + (idx * lineHeight));
    });

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
          (storiesLogRef.current || []).slice(0, 35).forEach(l => {
              if (l.pauta && !l.pauta.toLowerCase().includes('notícias quentes') && !l.pauta.toLowerCase().includes('auto-post')) {
                  recentLogItems.push(`Pauta: ${l.pauta.trim()}`);
              }
              (l.stories || []).forEach(s => {
                  const raw = typeof s === 'string' ? s : (s.title || s.text || '');
                  const clean = raw.replace(/^[🚨🛑🇧🇷⚖️📢⚠️\s]+/, '').split('\n')[0].split('.')[0].trim();
                  if (clean.length > 12) recentLogItems.push(`Story: ${clean}`);
              });
          });
          const antiRepetitionPrompt = getAntiRepetitionPrompt(Array.from(new Set(recentLogItems)).slice(0, 45));

          const finalPrompt = `
${basePrompt}
${antiRepetitionPrompt}
Assunto Solicitado: "${topic}"
Data e Hora Atual (Para buscar notícias AGORA): ${new Date().toLocaleString('pt-BR')}
Quantidade de Telas Solicitadas: ${autoPostCount}
          `;

           const obj = await callAI(finalPrompt, 'all');
           const mappedStories = extractStoriesFromAiResponse(obj, globalBackground);

           if (mappedStories.length > 0) {
               setStoriesLog(prev => [{
                  id: Date.now().toString(),
                  pauta: "Auto-Post Bot (Nuvem/Servidor)",
                  searchQuery: topic,
                  engine: 'Perplexity',
                  status: 'success',
                  storiesCount: mappedStories.length,
                  stories: mappedStories,
                  date: new Date().toISOString()
              }, ...prev]);

              if (metaToken && imgbbKey && metaIgAccountId) {
                  for (let i = 0; i < mappedStories.length; i++) {
                      try {
                          const blob = await createStoryBlob(mappedStories[i], i, mappedStories.length);
                          const imageUrl = await uploadImageForSocial(blob, imgbbKey);
                          if (imageUrl) {
                              const containerRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ image_url: imageUrl, media_type: 'STORIES', access_token: metaToken })
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
                      } catch (e) {
                          console.error("AutoPost Meta Error:", e);
                      }
                  }
              }

              // Atualiza o agendamento de sucesso e grava o novo nextRun no Firestore
              const nextTime = Date.now() + autoPostInterval * 60000;
              setAutomationSettings(prev => ({
                ...prev,
                stories: {
                  ...(prev?.stories || {}),
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
            stories: {
              ...(prev?.stories || {}),
              status: 'error',
              lastError: e.message || 'Erro ao publicar stories'
            }
          }));
      } finally {
          setIsAutoPosting(false);
          isAutoPostingRef.current = false;
      }
  };

  // Disparo automático garantido quando o horário agendado é atingido
  useEffect(() => {
    if (!autoPostEnabled || !nextRunTimestamp) return;

    if (nowTick >= nextRunTimestamp && !isAutoPosting && !isAutoPostingRef.current) {
      const currentStatus = automationSettings?.stories?.status;
      if (currentStatus === 'running') return;

      isAutoPostingRef.current = true;
      console.log("[Piloto Automático Stories] Executando ciclo agendado...");

      // Já avança o próximo horário de imediato no Firebase para evitar disparos duplicados
      const nextCycle = Date.now() + autoPostInterval * 60000;
      setAutomationSettings(prev => ({
        ...prev,
        stories: {
          ...(prev?.stories || {}),
          status: 'running',
          nextRun: nextCycle
        }
      }));

      backgroundGenerateAndPost().finally(() => {
        isAutoPostingRef.current = false;
      });
    }
  }, [nowTick, autoPostEnabled, nextRunTimestamp, isAutoPosting, autoPostInterval, automationSettings?.stories?.status]);

  // Disparo manual forçado
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
      stories: {
        ...(prev?.stories || {}),
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

      // Tenta extrair entre primeiro { e último }
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

      // Tenta extrair entre primeiro [ e último ]
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

    // Para busca de notícias em tempo real, Perplexity é o motor principal de pesquisa web
    if (aiChoice === 'perplexity' || aiChoice === 'all') {
      if (perplexityKey) {
        setStatus('Pesquisando notícias em tempo real na Web com Perplexity...');
        try {
          const res = await fetch('https://api.perplexity.ai/v1/agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${perplexityKey.trim()}`
            },
            body: JSON.stringify({
              preset: 'fast',
              instructions: 'Retorne estritamente um JSON no formato solicitado com a lista "stories". Não use markdown adicional.',
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

    // Se Perplexity não respondeu ou aiChoice for 'gemini' ou 'all', consulta Gemini como redundância
    if (!generatedText && (aiChoice === 'gemini' || aiChoice === 'all' || !generatedText)) {
      if (geminiKey) {
        setStatus('Consultando Gemini com notícias em tempo real...');
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
      throw new Error("Não foi possível obter resposta das IAs. Verifique as chaves de API (Perplexity/Gemini) na aba de Chaves do Robô.");
    }
    
    return tryParse(generatedText);
  };

  const handleGenerateStories = async (aiChoice) => {
    if (!perplexityKey && !geminiKey) {
        alert("Nenhuma chave de IA configurada (Gemini ou Perplexity). Configure na aba de Chaves do Robô.");
        return;
    }

    setIsLoading(true);
    setLoadingEngine(aiChoice);
    setStories([]);
    setRawAiLog('');
    setStatus('Consultando histórico e pesquisando notícias em tempo real...');

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

      let mappedStories = extractStoriesFromAiResponse(obj, globalBackground);

      // Redundância instantânea: se vier vazio (ex: filtros rígidos), recupera automaticamente
      if (mappedStories.length === 0) {
          setStatus('Ajustando critérios para garantir geração imediata...');
          // 1. Tenta Gemini imediatamente se disponível
          if (geminiKey) {
              try {
                  const gPrompt = `${basePrompt}\nAssunto Solicitado: "${topic}". Traga exatamente ${pautasCount} notícias quentes recentes (50% Brasil e 50% Internacional). Retorne estritamente JSON.`;
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
                          mappedStories = extractStoriesFromAiResponse(JSON.parse(gText), globalBackground);
                      }
                  }
              } catch (e) {
                  console.warn("Fallback Gemini:", e);
              }
          }

          // 2. Se ainda assim estiver vazio e for Perplexity, faz uma busca direta sem filtros impeditivos
          if (mappedStories.length === 0 && perplexityKey) {
              try {
                  const cleanPrompt = `${basePrompt}\nAssunto Solicitado: "${topic}". Traga exatamente ${pautasCount} notícias quentes de hoje ou dos últimos dias (50% Brasil e 50% Internacional). Retorne estritamente JSON com ${pautasCount} notícias.`;
                  const retryObj = await callAI(cleanPrompt, 'perplexity');
                  mappedStories = extractStoriesFromAiResponse(retryObj, globalBackground);
              } catch (e) {
                  console.warn("Retry Perplexity:", e);
              }
          }
      }

      if (mappedStories.length > 0) {
          setStories(mappedStories);
          setStatus('Stories gerados com sucesso!');
          
          const newLog = {
              id: Date.now().toString(),
              pauta: topic,
              searchQuery: searchQuery.trim(),
              engine: aiChoice === 'perplexity' ? 'Perplexity (Busca Web)' : aiChoice === 'gemini' ? 'Gemini' : 'Perplexity + IA',
              status: 'success',
              storiesCount: mappedStories.length,
              stories: mappedStories,
              date: new Date().toISOString()
          };
          setStoriesLog(prev => [newLog, ...prev]);
      } else {
          console.error("Recebido inválido:", obj);
          throw new Error("A IA respondeu, mas não foi possível extrair as telas de notícia. Tente novamente.");
      }

    } catch (err) {
      console.error(err);
      setStatus("Erro: " + err.message);
      // Salva a tentativa no log para manter registro permanente das pesquisas
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
      setStories(prev => [...prev, "Novo texto para o Story..."]);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-indigo-600" /> Gerador Direto de Stories
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
                <Sparkles className="w-4 h-4 text-yellow-600" /> Regras Atuais da Geração de Stories
            </h3>
            <ul className="text-xs text-yellow-800 space-y-1.5 list-disc list-inside">
                <li><strong>Divisão 50/50:</strong> Metade das notícias sobre o Brasil e metade Internacionais.</li>
                <li><strong>Atualização Máxima:</strong> Apenas notícias de última hora, preferencialmente do dia atual. Proibido notícias velhas ou de ontem.</li>
                <li><strong>Sem Repetição:</strong> O sistema analisa automaticamente o triplo (as últimas 30 notícias geradas) e instrui a IA a procurar pautas ativas diferentes.</li>
                <li><strong>Formato Direto:</strong> Cada tela representa UMA pauta com uma explicação curtíssima. Sem textos gigantes (fácil de ler no celular).</li>
                <li><strong>Estilo e Tom:</strong> Emojis conservadores quando necessário (🇧🇷, 🚨, ⚖️, 🛑).</li>
            </ul>
        </div>

        <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-xs">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> Piloto Automático (Auto-Post Stories)
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
                  Gera e publica stories no Instagram de forma autônoma na nuvem e no servidor. 
                  <span className="font-semibold text-indigo-950 ml-1">O horário fica sincronizado e não recomeça ao atualizar a página.</span>
                </p>

                {autoPostEnabled && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        {isAutoPosting || automationSettings?.stories?.status === 'running' ? (
                           <div className="flex items-center gap-2 text-indigo-900 font-bold bg-indigo-100/90 px-3 py-1.5 rounded-md border border-indigo-200">
                             <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> 
                             <span>Gerando notícias e publicando stories no Instagram agora...</span>
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

                        {automationSettings?.stories?.lastSuccess && (
                          <span className="text-[11px] text-gray-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Último envio: {new Date(automationSettings.stories.lastSuccess).toLocaleTimeString('pt-BR')}
                            {automationSettings?.stories?.lastStoriesCount ? ` (${automationSettings.stories.lastStoriesCount} telas)` : ''}
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
                          stories: {
                            ...(prev?.stories || {}), 
                            intervalMinutes: val,
                            nextRun: (prev?.stories?.lastRun ? prev.stories.lastRun + val * 60000 : now + val * 60000)
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
                          stories: {
                            ...(prev?.stories || {}), 
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
                      disabled={isAutoPosting || automationSettings?.stories?.status === 'running'}
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
                          const targetNext = (automationSettings?.stories?.nextRun && automationSettings.stories.nextRun > now)
                              ? automationSettings.stories.nextRun
                              : now + interval * 60000;

                          setAutomationSettings(prev => ({
                            ...prev, 
                            stories: {
                              ...(prev?.stories || {}), 
                              enabled: willEnable,
                              intervalMinutes: interval,
                              pautasCount: autoPostCount || 5,
                              lastRun: willEnable ? (prev?.stories?.lastRun || now) : (prev?.stories?.lastRun || 0),
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
                <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">50% Brasil / 50% Mundo</span>
              </p>
              <p className="text-[11px] text-emerald-700">
                O gerador consulta o histórico de <strong>{antiRepetitionList.length} notícias e pautas recentes</strong> para garantir que NENHUMA pauta seja repetida.
              </p>
            </div>
          </div>
          <a 
            href="#stories-history" 
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
            onClick={() => handleGenerateStories('all')}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-70"
          >
            {isLoading && loadingEngine === 'all' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
            Gerar Telas Imediatamente (Gemini/ChatGPT)
          </button>
          <button 
            type="button" 
            onClick={() => handleGenerateStories('perplexity')}
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
                <StoryCard 
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
                />
            ))}
            </div>
        </div>
      )}

      <div id="stories-history" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" /> Log de Pesquisas & Histórico de Stories
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registro permanente e auditável das pesquisas realizadas. O robô consulta este histórico para <strong>garantir zero repetição</strong> de notícias.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> {sortedStoriesLog.length} pesquisas salvas
            </span>
          </div>
        </div>

        {/* Barra de Filtro de Histórico */}
        {sortedStoriesLog.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <input 
                type="text"
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                placeholder="Filtrar histórico por assunto, notícia, data..."
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
                <p className="text-sm font-semibold text-slate-600">Nenhum registro no log de pesquisas ainda.</p>
                <p className="text-xs text-slate-400 mt-1">Ao pesquisar ou gerar novos stories, o registro aparecerá aqui automaticamente.</p>
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
                            {log.storiesCount || storiesList.length} Telas
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
                                const allTexts = storiesList.map((s, idx) => `Tela ${idx + 1}: ${typeof s === 'string' ? s : (s.title || s.text)}`).join('\n\n');
                                navigator.clipboard.writeText(allTexts);
                                setCopiedLogId(log.id);
                                setTimeout(() => setCopiedLogId(null), 2500);
                              }}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                              title="Copiar texto de todas as telas"
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
                        {log.error || 'Falha ao gerar notícias.'}
                      </p>
                    ) : (
                      <div className="text-xs text-slate-600 space-y-1.5 bg-white p-3 rounded border border-slate-200">
                        {storiesList.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="font-bold text-indigo-600 text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                              Tela {i + 1}
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

function StoryCard({ storyObj, index, total, onChangeText, metaToken, metaIgAccountId, imgbbKey }) {
    const canvasRef = useRef(null);
    const [isPosting, setIsPosting] = useState(false);
    const [localBgId, setLocalBgId] = useState(storyObj?.bgId || 'plantao');
    
    const text = storyObj?.text || '';

    useEffect(() => {
        renderStory();
    }, [text, total, localBgId]);

    const renderStory = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const width = 1080;
        const height = 1920;
        canvas.width = width;
        canvas.height = height;

        const activeBg = BACKGROUNDS.find(b => b.id === localBgId) || BACKGROUNDS[0];

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

        drawTextContent(ctx, width, height);
    };

    const drawTextContent = (ctx, width, height) => {
        ctx.font = 'bold 65px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = (text || '').split(' ');
        let lines = [];
        let currentLine = '';
        const maxWidth = width - 160;

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(currentLine.trim());
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());

        const lineHeight = 85;
        const totalTextHeight = lines.length * lineHeight;
        const startY = (height / 2) - (totalTextHeight / 2) + 180;

        lines.forEach((line, idx) => {
            ctx.fillText(line, width / 2, startY + (idx * lineHeight));
        });
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `story_ng_${index + 1}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    };

    const handlePostToInstagram = async () => {
        if (!metaToken || !imgbbKey || !metaIgAccountId) {
            alert("Configure as credenciais do Meta e ImgBB nas Configurações do painel.");
            return;
        }
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            setIsPosting(true);
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            const publicImageUrl = await uploadImageForSocial(blob, imgbbKey);

            const igMediaRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ media_type: 'STORIES', image_url: publicImageUrl, access_token: metaToken })
            });
            const igMediaData = await igMediaRes.json();
            if (igMediaData.error) throw new Error("Erro Instagram (Media): " + igMediaData.error.message);
            
            const creationId = igMediaData.id;

            let igPublishData;
            let retries = 10;
            while (retries > 0) {
                await new Promise(r => setTimeout(r, 5000)); // Aguarda 5s antes de cada tentativa
                const igPublishRes = await fetch(`https://graph.facebook.com/v20.0/${metaIgAccountId}/media_publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ creation_id: creationId, access_token: metaToken })
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
                    if (retries === 0) throw new Error("Erro Instagram (Publish - Timeout): O Instagram demorou muito para processar a imagem.");
                    console.log(`Instagram ainda processando. Tentativas restantes: ${retries}`);
                } else if (igPublishData.error) {
                    throw new Error("Erro Instagram (Publish): " + igPublishData.error.message);
                } else {
                    break;
                }
            }

            alert("Story postado com sucesso no Instagram!");
        } catch (err) {
            console.error(err);
            alert("Erro ao postar: " + err.message);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="flex flex-col bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 relative">
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
                Tela {index + 1}/{total}
            </div>
            <div className="relative w-full aspect-[9/16] bg-black">
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
                    className="w-full bg-slate-700 text-white text-sm rounded p-2 outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-24"
                    placeholder="Edite o texto do story..."
                />
                
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
                    <button 
                        onClick={handlePostToInstagram}
                        disabled={isPosting || (!metaToken || !imgbbKey || !metaIgAccountId)}
                        className={`flex-1 ${isPosting ? 'bg-slate-500' : 'bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600'} text-white font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 text-xs`}
                    >
                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isPosting ? 'Postando...' : 'Postar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
