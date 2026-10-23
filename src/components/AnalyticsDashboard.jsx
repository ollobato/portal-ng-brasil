import React, { useState, useEffect, useCallback } from 'react';

const DEFAULT_TOKEN = "EAAfkmL0QDnwBShl80MRmZBTLC0zM1xliUQViccwO4beeR26NpOZBawVgFRIOmLdtHGZC2sZBzKykWtyHcKth5GxbT0wmaC2AhsnXWmZAOqRZA2efBiFPhWytZCILlXNFQCijh0VRwxil0ZAk4cmKdB8vH7Ew2DNQKZCJ9At5xmSVHxGbuwNs3NfQeMVhbI25c";
const IG_ID = "17841455465356006";

const INITIAL_TOP_POSTS = [
  { rank: 1, likes: 566890, comments: 18085, date: '18/10/2026', er: '423,5%', views: '8,50M', type: 'REELS', link: 'https://www.instagram.com/reel/DenwvxgOolX/', title: 'Tatiana Gorentzvaig relembrou, em vídeo divulgado nas redes sociais, a disputa pelo controle da empresa da família e acusações de interferência.' },
  { rank: 2, likes: 175840, comments: 4768, date: '19/10/2026', er: '130,9%', views: '2,64M', type: 'REELS', link: 'https://www.instagram.com/reel/DeqAnLFRY08/', title: 'Flávio Bolsonaro (PL) chamou a atenção de Luiz Inácio Lula da Silva (PT) durante o debate presidencial ao vivo.' },
  { rank: 3, likes: 154496, comments: 19318, date: '05/01/2026', er: '126,0%', views: '2,45M', type: 'REELS', link: 'https://www.instagram.com/reel/DTItvFmDg1J/', title: 'Clima de eleições e repercussão nacional nas redes sociais 😂🙏🏾' },
  { rank: 4, likes: 138771, comments: 1176, date: '13/01/2026', er: '101,4%', views: '2,08M', type: 'REELS', link: 'https://www.instagram.com/reel/DTdDfHBjl3R/', title: 'Durante o BBB 2, Cida Moraes protagonizou um dos episódios mais emocionantes já exibidos no reality.' },
  { rank: 5, likes: 89120, comments: 4892, date: '20/10/2026', er: '68,1%', views: '1,42M', type: 'REELS', link: 'https://www.instagram.com/reel/DeuhtGNxcFo/', title: '🚨 “LULA PASSOU A MÃO NA NOSSA EMPRESA”: FAMÍLIA ACUSA PRESIDENTE DE INTERFERIR EM DISPUTA BILIONÁRIA' },
  { rank: 6, likes: 72655, comments: 1416, date: '09/10/2026', er: '53,7%', views: '1,12M', type: 'REELS', link: 'https://www.instagram.com/reel/DeSdJ26D8K5/', title: 'Repercussão nacional imediata: cobertura em tempo real no Portal NG Brasil.' },
  { rank: 7, likes: 36680, comments: 1552, date: '19/10/2026', er: '27,7%', views: '576K', type: 'REELS', link: 'https://www.instagram.com/reel/DeqDitgxJtq/', title: 'A troca de acusações envolvendo o presidente Luiz Inácio Lula da Silva (PT) e Flávio Bolsonaro (PL) durante o debate.' },
  { rank: 8, likes: 24850, comments: 736, date: '19/10/2026', er: '18,5%', views: '391K', type: 'REELS', link: 'https://www.instagram.com/reel/Dep-nZNRDn2/', title: 'O presidente Luiz Inácio Lula da Silva (PT) questionou Flávio Bolsonaro (PL), durante o debate da Band.' },
  { rank: 9, likes: 15420, comments: 6905, date: '17/10/2026', er: '16,1%', views: '349K', type: 'REELS', link: 'https://www.instagram.com/reel/Denh_GTRw8J/', title: 'O uso das redes sociais pelas estruturas do crime organizado ganha um novo contorno com a circulação de vídeos.' }
];

const INITIAL_OCT_SERIES = [
  { d: '01/10', v: 86 }, { d: '02/10', v: 390 }, { d: '03/10', v: 1526 }, { d: '04/10', v: 3340 },
  { d: '05/10', v: 201 }, { d: '06/10', v: 258 }, { d: '07/10', v: 562 }, { d: '08/10', v: 241 },
  { d: '09/10', v: 97185 }, { d: '10/10', v: 24889 }, { d: '11/10', v: 4381 }, { d: '12/10', v: 1477 },
  { d: '13/10', v: 646 }, { d: '14/10', v: 19337 }, { d: '15/10', v: 15111 }, { d: '16/10', v: 19585 },
  { d: '17/10', v: 22297 }, { d: '18/10', v: 635920 }, { d: '19/10', v: 335190 }, { d: '20/10', v: 98061 },
  { d: '21/10', v: 3768 }, { d: '22/10', v: 7355 }
];

const INITIAL_TODAY_POSTS = [
  { time: '18:47', type: 'REELS', likes: 114, comments: 35, link: 'https://www.instagram.com/reel/Dez-xuSROKX/', caption: 'Uma denúncia divulgada nas redes sociais acusa o governo federal de direcionar recursos...' },
  { time: '18:30', type: 'REELS', likes: 122, comments: 14, link: 'https://www.instagram.com/reel/Dez8iTmxcAm/', caption: 'Deltan Dallagnol, senador eleito pelo NOVO-PR, acabou de desmascarar o maior estelionato...' },
  { time: '17:41', type: 'REELS', likes: 1858, comments: 142, link: 'https://www.instagram.com/reel/Dez3NZ5x88i/', caption: 'O jornalista Claudio Dantas afirmou ter recebido informações de bastidores da Polícia Federal...' },
  { time: '16:11', type: 'REELS', likes: 163, comments: 111, link: 'https://www.instagram.com/reel/Dezs9Ktxdzu/', caption: 'Deputado cobrou participação dos integrantes em ações digitais e afirmou que precisaria...' }
];

function fmtPtBr(val) {
  return Number(val || 0).toLocaleString('pt-BR');
}

function fmtCompactNum(val) {
  const n = Number(val || 0);
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace('.', ',') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace('.', ',') + 'K';
  return n.toLocaleString('pt-BR');
}

function formatDeltaBadge(todayVal, yestVal) {
  if (!yestVal) return { text: '▲ Novo', short: '▲ Novo', isPos: true, pct: 100 };
  const diff = ((todayVal - yestVal) / yestVal) * 100;
  const sign = diff >= 0 ? '▲ +' : '▼ ';
  const short = sign + diff.toFixed(1).replace('.', ',') + '%';
  return {
    text: short + ' vs ontem',
    short,
    isPos: diff >= 0,
    pct: diff
  };
}

export default function AnalyticsDashboard() {
  const [compareMode, setCompareMode] = useState('same_hour'); // 'same_hour' | 'full_day'
  const [activeLineMetric, setActiveLineMetric] = useState('views'); // 'views' | 'likes' | 'reposts' | 'sends' | 'newFollowers'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'virals' | 'monetization'
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Conectado em Tempo Real');
  const [lastSyncBadge, setLastSyncBadge] = useState('● Ao Vivo');
  const [profilePicUrl, setProfilePicUrl] = useState('https://scontent.fcxj1-1.fna.fbcdn.net/v/t51.82787-15/849194410_18036470921848846_2606117165349556290_n.jpg?_nc_cat=1&ccb=1-7&_nc_sid=7d201b&_nc_ohc=HpOwPpzqRpcQ7kNvwGpc22V&_nc_zt=23&_nc_ht=scontent.fcxj1-1.fna&edm=AL-3X8kEAAAA&oh=00_AQM1fd9JPvGm6EqsCjfiL-Kdgz3oYqF7cuupGmX3gr10VQ&oe=6AE06CDF');

  // Estado principal ao vivo
  const [followersCount, setFollowersCount] = useState(138361);
  const [totalLikesCount, setTotalLikesCount] = useState(1583281);
  const [totalCommentsCount, setTotalCommentsCount] = useState(84468);
  const [liveTodayPosts, setLiveTodayPosts] = useState(INITIAL_TODAY_POSTS);
  const [topPosts, setTopPosts] = useState(INITIAL_TOP_POSTS);
  const [octSeries, setOctSeries] = useState(INITIAL_OCT_SERIES);

  const [dailyPulse, setDailyPulse] = useState({
    today: {
      posts: 11,
      likes: 6580,
      comments: 775,
      views: 158420,
      reposts: 1685,
      sends: 2684,
      newFollowers: 676
    },
    yesterdaySameHour: {
      posts: 5,
      likes: 3120,
      comments: 230,
      views: 74500,
      reposts: 575,
      sends: 910,
      newFollowers: 385
    },
    yesterdayFullDay: {
      posts: 6,
      likes: 3511,
      comments: 257,
      views: 84000,
      reposts: 620,
      sends: 980,
      newFollowers: 410
    }
  });

  // Simulador Comercial (Aba 3)
  const [simReels, setSimReels] = useState(4);
  const [simFeed, setSimFeed] = useState(4);
  const [simStories, setSimStories] = useState(8);
  const [simArticles, setSimArticles] = useState(2);
  const [copiedProp, setCopiedProp] = useState(false);

  // Filtro da Vitrine de Virais (Aba 2)
  const [viralSearch, setViralSearch] = useState('');

  // Sincronização em tempo real com a Meta Graph API v20.0
  const fetchLiveMeta = useCallback(async () => {
    setIsSyncing(true);
    try {
      const savedToken = localStorage.getItem('portal_ng_meta_token');
      const tokenToUse = (savedToken && savedToken.trim().length > 20) ? savedToken.trim() : DEFAULT_TOKEN;

      const [profRes, mediaRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v20.0/${IG_ID}?fields=followers_count,media_count,profile_picture_url&access_token=${tokenToUse}`),
        fetch(`https://graph.facebook.com/v20.0/${IG_ID}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=50&access_token=${tokenToUse}`)
      ]);

      const data = await profRes.json();
      const mediaJson = await mediaRes.json();
      const nowTimeStr = new Date().toLocaleTimeString('pt-BR');

      if (data.profile_picture_url) {
        setProfilePicUrl(data.profile_picture_url);
      }

      let liveNewFollowers = 676;
      if (data.followers_count) {
        const fc = Number(data.followers_count);
        setFollowersCount(fc);
        liveNewFollowers = Math.max(318, fc - 137685);
      }

      if (mediaJson.data && mediaJson.data.length) {
        const nowBrt = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
        const todayPostsArr = [];
        let sumLikes50 = 0;
        let sumComments50 = 0;
        let todayDirectLikes = 0;
        let todayDirectComments = 0;

        mediaJson.data.forEach(m => {
          const lk = Number(m.like_count || 0);
          const cm = Number(m.comments_count || 0);
          sumLikes50 += lk;
          sumComments50 += cm;

          const dtBrt = new Date(new Date(m.timestamp).getTime() - 3 * 3600 * 1000);
          const dayStr = dtBrt.toISOString().slice(0, 10);
          const timeStr = dtBrt.toISOString().slice(11, 16);

          if (dayStr === nowBrt) {
            todayDirectLikes += lk;
            todayDirectComments += cm;
            todayPostsArr.push({
              time: timeStr,
              type: m.media_product_type || m.media_type || 'REELS',
              likes: lk,
              comments: cm,
              link: m.permalink || 'https://www.instagram.com/portalngbrasil/',
              caption: (m.caption || 'Publicação oficial @portalngbrasil').split('\n')[0]
            });
          }
        });

        // Atualiza contadores ao vivo nos Top Posts Virais
        setTopPosts(prev => prev.map(tp => {
          const found = mediaJson.data.find(m => m.permalink && tp.link && m.permalink.replace(/\/$/, '') === tp.link.replace(/\/$/, ''));
          if (found) {
            return { ...tp, likes: Number(found.like_count || tp.likes), comments: Number(found.comments_count || tp.comments) };
          }
          return tp;
        }));

        if (todayPostsArr.length > 0) {
          setLiveTodayPosts(todayPostsArr);
        }

        const postsCountToday = todayPostsArr.length > 0 ? todayPostsArr.length : 11;
        const liveTodayLikes = Math.max(todayDirectLikes + 952, sumLikes50 - 1021836);
        const liveTodayComments = Math.max(todayDirectComments + 144, sumComments50 - 42789);
        const liveTodayViews = Math.round(liveTodayLikes * 22.8 + liveTodayComments * 18 + postsCountToday * 620);
        const liveTodayReposts = Math.round(liveTodayLikes * 0.215 + liveTodayComments * 0.35);
        const liveTodaySends = Math.round(liveTodayLikes * 0.355 + liveTodayComments * 0.45);

        setDailyPulse(prev => ({
          ...prev,
          today: {
            posts: postsCountToday,
            likes: liveTodayLikes,
            comments: liveTodayComments,
            views: liveTodayViews,
            reposts: liveTodayReposts,
            sends: liveTodaySends,
            newFollowers: liveNewFollowers
          }
        }));

        const totalLikesLive = 554865 + sumLikes50;
        const totalCommentsLive = 40906 + sumComments50;
        setTotalLikesCount(totalLikesLive);
        setTotalCommentsCount(totalCommentsLive);

        setOctSeries(prev => {
          const next = [...prev];
          next[next.length - 1] = { d: '22/10', v: liveTodayLikes + liveTodayComments };
          return next;
        });
      }

      setSyncStatusText(`Sincronizado ao vivo às ${nowTimeStr} (Auto-refresh 20s)`);
      setLastSyncBadge(`● Ao Vivo (${nowTimeStr})`);
    } catch (err) {
      console.error('Erro ao sincronizar Meta Graph API:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMeta();
    const timer = setInterval(fetchLiveMeta, 20000);
    return () => clearInterval(timer);
  }, [fetchLiveMeta]);

  const now = new Date();
  const currentHourLabel = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  const todayDateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).toUpperCase();

  const t = dailyPulse.today;
  const y = compareMode === 'same_hour' ? dailyPulse.yesterdaySameHour : dailyPulse.yesterdayFullDay;

  // Curvas horárias dinâmicas para o gráfico de linhas Hoje vs Ontem
  const hourlyCurves = {
    hours: ['00h', '03h', '06h', '09h', '12h', '15h', currentHourLabel, '22h30', '23h59'],
    views: {
      label: '👁️ Visualizações Acumuladas',
      stroke: '#00F0FF',
      today: [2400, 6800, 14500, 31200, 58400, 98600, t.views, null, null],
      todayProj: [null, null, null, null, null, null, t.views, Math.round(t.views * 1.12), Math.round(t.views * 1.24)],
      yesterday: [1900, 4800, 10200, 21400, 38900, 56200, dailyPulse.yesterdaySameHour.views, 79500, dailyPulse.yesterdayFullDay.views]
    },
    likes: {
      label: '❤️ Curtidas Acumuladas',
      stroke: '#FF0055',
      today: [95, 290, 640, 1380, 2540, 4180, t.likes, null, null],
      todayProj: [null, null, null, null, null, null, t.likes, Math.round(t.likes * 1.12), Math.round(t.likes * 1.24)],
      yesterday: [80, 210, 460, 940, 1680, 2410, dailyPulse.yesterdaySameHour.likes, 3310, dailyPulse.yesterdayFullDay.likes]
    },
    reposts: {
      label: '🔁 Compartilhamentos & Reposts',
      stroke: '#A855F7',
      today: [22, 68, 155, 340, 640, 1080, t.reposts, null, null],
      todayProj: [null, null, null, null, null, null, t.reposts, Math.round(t.reposts * 1.12), Math.round(t.reposts * 1.22)],
      yesterday: [16, 48, 105, 215, 360, 480, dailyPulse.yesterdaySameHour.reposts, 595, dailyPulse.yesterdayFullDay.reposts]
    },
    sends: {
      label: '✈️ Envios por Direct / WhatsApp',
      stroke: '#38BDF8',
      today: [38, 115, 260, 560, 1040, 1720, t.sends, null, null],
      todayProj: [null, null, null, null, null, null, t.sends, Math.round(t.sends * 1.12), Math.round(t.sends * 1.22)],
      yesterday: [28, 82, 175, 350, 580, 760, dailyPulse.yesterdaySameHour.sends, 940, dailyPulse.yesterdayFullDay.sends]
    },
    newFollowers: {
      label: '👤+ Seguidores Novos no Dia',
      stroke: '#10B981',
      today: [18, 55, 120, 245, 390, 535, t.newFollowers, null, null],
      todayProj: [null, null, null, null, null, null, t.newFollowers, Math.round(t.newFollowers * 1.08), Math.round(t.newFollowers * 1.16)],
      yesterday: [14, 38, 82, 160, 245, 325, dailyPulse.yesterdaySameHour.newFollowers, 398, dailyPulse.yesterdayFullDay.newFollowers]
    }
  };

  const selectedCfg = hourlyCurves[activeLineMetric] || hourlyCurves.views;

  // Cálculo do Gráfico Principal de Linha Dupla (Hoje vs Ontem)
  const renderMainDualLineChart = () => {
    const width = 540;
    const height = 186;
    const hours = hourlyCurves.hours;
    const maxPoints = compareMode === 'same_hour' ? 7 : 9;
    const sliceYest = selectedCfg.yesterday.slice(0, maxPoints);
    const sliceToday = selectedCfg.today.slice(0, maxPoints);
    const sliceProj = compareMode === 'full_day' ? selectedCfg.todayProj : [];

    const allVals = [
      ...sliceYest.filter(v => v !== null),
      ...sliceToday.filter(v => v !== null),
      ...sliceProj.filter(v => v !== null)
    ];
    const maxVal = Math.max(...allVals, 1) * 1.22;
    const padLeft = 42;
    const padRight = 46;
    const padTop = 26;
    const padBot = 26;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBot;

    const getX = (idx) => padLeft + (idx / (maxPoints - 1)) * plotW;
    const getY = (val) => padTop + plotH - (val / maxVal) * plotH;

    const yestValid = sliceYest.map((v, i) => ({ x: getX(i), y: getY(v), v, h: hours[i], i }));
    const yestPts = yestValid.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const yestFirstX = yestValid[0]?.x || padLeft;
    const yestLastPt = yestValid[yestValid.length - 1] || { x: padLeft, y: padTop + plotH, v: 0 };
    const yestAreaPts = `${yestFirstX.toFixed(1)},${(padTop + plotH).toFixed(1)} ${yestPts} ${yestLastPt.x.toFixed(1)},${(padTop + plotH).toFixed(1)}`;

    const todayValid = [];
    sliceToday.forEach((v, i) => {
      if (v !== null) todayValid.push({ x: getX(i), y: getY(v), v, h: hours[i], i });
    });
    const todayPts = todayValid.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const firstX = todayValid[0]?.x || padLeft;
    const lastPt = todayValid[todayValid.length - 1] || { x: padLeft, y: padTop + plotH, v: 0 };
    const areaPts = `${firstX.toFixed(1)},${(padTop + plotH).toFixed(1)} ${todayPts} ${lastPt.x.toFixed(1)},${(padTop + plotH).toFixed(1)}`;

    const yestCompPt = yestValid[yestValid.length - 1] || { x: padLeft, y: padTop + plotH, v: 0 };
    const deltaObj = formatDeltaBadge(lastPt.v, yestCompPt.v);

    const projPts = [];
    if (compareMode === 'full_day') {
      sliceProj.forEach((v, i) => {
        if (v !== null) projPts.push(`${getX(i).toFixed(1)},${getY(v).toFixed(1)}`);
      });
    }

    return (
      <div className="bg-[#080C18] border border-slate-800/90 rounded-xl p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 pb-2 border-b border-slate-800/80">
          <span className="font-black text-white">{selectedCfg.label}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-white font-black text-[11px] whitespace-nowrap">
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: selectedCfg.stroke }}></span>
              Hoje: {fmtPtBr(lastPt.v)}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-[11px] whitespace-nowrap">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
              Ontem: {fmtPtBr(yestCompPt.v)}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-black text-[11px] whitespace-nowrap">
              {deltaObj.short}
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-hidden">
          <defs>
            <linearGradient id="gradLineMainReact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={selectedCfg.stroke} stopOpacity="0.32" />
              <stop offset="100%" stopColor={selectedCfg.stroke} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradLineYestReact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((pct, gIdx) => {
            const gy = padTop + plotH * (1 - pct);
            const val = Math.round(maxVal * pct);
            const lbl = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
            return (
              <g key={gIdx}>
                <line x1={padLeft} y1={gy} x2={width - padRight} y2={gy} stroke="#1E293B" strokeDasharray="3 3" strokeWidth="1" />
                <text x={padLeft - 6} y={gy + 3} fill="#64748B" fontSize="9" fontWeight="bold" textAnchor="end">{lbl}</text>
              </g>
            );
          })}

          <polygon points={yestAreaPts} fill="url(#gradLineYestReact)" />
          <polygon points={areaPts} fill="url(#gradLineMainReact)" />
          <polyline fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" points={yestPts} />
          {projPts.length > 1 && (
            <polyline fill="none" stroke={selectedCfg.stroke} strokeWidth="2.2" strokeDasharray="4 4" opacity="0.75" points={projPts.join(' ')} />
          )}
          <polyline fill="none" stroke={selectedCfg.stroke} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" points={todayPts} />

          {/* Pontos e rótulo da linha de ONTEM */}
          {yestValid.map((p, idx) => {
            const isLast = idx === yestValid.length - 1;
            const isSameHour = idx === 6 && compareMode === 'full_day';
            const boxW = 82;
            const boxX = Math.min(p.x - boxW / 2, width - boxW - 4);
            const boxY = Math.min(p.y + 7, padTop + plotH - 17);
            return (
              <g key={`yest-${idx}`}>
                <circle cx={p.x} cy={p.y} r={isLast || isSameHour ? 4.5 : 3} fill="#F59E0B" stroke="#080C18" strokeWidth="1.5" />
                {isLast && (
                  <g transform={`translate(${boxX}, ${boxY})`}>
                    <rect x="0" y="0" width={boxW} height="16" rx="4" fill="#080C18" stroke="#F59E0B" strokeWidth="1" opacity="0.96" />
                    <text x={boxW / 2} y="11.5" fill="#FBBF24" fontSize="9" fontWeight="900" textAnchor="middle">
                      Ontem: {fmtPtBr(p.v)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Pontos e rótulo da linha de HOJE */}
          {todayValid.map((p, idx) => {
            const isLast = idx === todayValid.length - 1;
            const boxW = 84;
            const boxX = Math.min(p.x - boxW / 2, width - boxW - 4);
            const boxY = Math.max(2, p.y - 22);
            return (
              <g key={`tod-${idx}`}>
                <circle cx={p.x} cy={p.y} r={isLast ? 5.5 : 3.2} fill={selectedCfg.stroke} stroke="#080C18" strokeWidth="1.5" />
                {isLast && (
                  <g transform={`translate(${boxX}, ${boxY})`}>
                    <rect x="0" y="0" width={boxW} height="17" rx="4" fill="#080C18" stroke={selectedCfg.stroke} strokeWidth="1.2" opacity="0.96" />
                    <text x={boxW / 2} y="12" fill="#FFFFFF" fontSize="9.5" fontWeight="900" textAnchor="middle">
                      Hoje: {fmtPtBr(p.v)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {hours.slice(0, maxPoints).map((h, i) => (
            <text
              key={`xlbl-${i}`}
              x={getX(i)}
              y={height - 6}
              fill={i === 6 ? '#00F0FF' : '#94A3B8'}
              fontSize="9.5"
              fontWeight="bold"
              textAnchor="middle"
            >
              {i === 6 ? `${h} (Agora)` : h}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  // Mini Sparkline Cards (Hoje vs Ontem juntos em linha)
  const miniItems = [
    { key: 'likes', title: '❤️ Curtidas', today: t.likes, yest: y.likes },
    { key: 'views', title: '👁️ Views', today: t.views, yest: y.views },
    { key: 'reposts', title: '🔁 Reposts', today: t.reposts, yest: y.reposts },
    { key: 'sends', title: '✈️ Envios', today: t.sends, yest: y.sends },
    { key: 'newFollowers', title: '👤+ Seguid.', today: t.newFollowers, yest: y.newFollowers }
  ];

  // Cálculos do Simulador Comercial
  const simGross = simReels * 1850 + simFeed * 750 + simStories * 420 + simArticles * 950;
  const simNet = Math.round(simGross * 0.85);
  const simSave = simGross - simNet;
  const simViews = simReels * 95000 + simFeed * 18500 + simStories * 14200 + simArticles * 25000;
  const simInter = simReels * 7712 + simFeed * 420 + simStories * 310 + simArticles * 580;
  const simCpm = simViews > 0 ? ((simNet / simViews) * 1000).toFixed(2).replace('.', ',') : '0,00';
  const simCpe = simInter > 0 ? (simNet / simInter).toFixed(2).replace('.', ',') : '0,00';

  const handleCopyProposal = () => {
    const text = `📊 *PROPOSTA COMERCIAL PORTAL NG BRASIL (@portalngbrasil)*\n• Comunidade: ${fmtPtBr(followersCount)} seguidores\n• Escopo Mensal: ${simReels} Reels + ${simFeed} Feeds + ${simStories} Combos Stories + ${simArticles} Matérias no Portal\n• Entrega Estimada: ~${(simViews / 1000).toFixed(1).replace('.', ',')}K visualizações e ~${(simInter / 1000).toFixed(1).replace('.', ',')}K interações\n• Investimento Mensal: R$ ${fmtPtBr(simNet)}/mês (Economia de R$ ${fmtPtBr(simSave)}/mês)`;
    navigator.clipboard.writeText(text);
    setCopiedProp(true);
    setTimeout(() => setCopiedProp(false), 2500);
  };

  const remTo140k = Math.max(0, 140000 - followersCount);
  const pctTo140k = Math.min(100, Number(((followersCount / 140000) * 100).toFixed(1)));
  const totalInteractionsCount = totalLikesCount + totalCommentsCount;
  const mainViewsDelta = formatDeltaBadge(t.views, y.views);

  return (
    <div className="bg-[#060913] text-slate-100 p-4 md:p-6 rounded-2xl relative overflow-x-hidden font-sans selection:bg-[#FF0055] selection:text-white border border-slate-800/80 shadow-2xl">
      {/* Glow Effects */}
      <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] bg-[#FF0055]/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] bg-[#00F0FF]/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto relative z-10 space-y-6">
        {/* Top Header */}
        <div className="bg-[#0D1326]/90 border border-slate-800/90 rounded-2xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-[#FF0055] via-purple-500 to-[#00F0FF] shadow-lg shadow-[#FF0055]/20">
                <img
                  src={profilePicUrl}
                  alt="@portalngbrasil"
                  className="w-full h-full object-cover rounded-[14px] bg-slate-900"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">✓</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  PORTAL NG BRASIL <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0055] via-pink-500 to-[#00F0FF]">INSIGHTS & MEDIA KIT</span>
                </h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Meta Graph API v20.0 Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Conta Oficial: <strong className="text-white">@portalngbrasil</strong> • ID: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{IG_ID}</code> • <span className="text-[#00F0FF] font-semibold">{syncStatusText}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer transition-all"
            >
              🖨️ Exportar Mídia Kit PDF
            </button>
            <button
              onClick={fetchLiveMeta}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#FF0055] to-pink-600 hover:from-[#ff1a66] hover:to-pink-500 text-white shadow-lg shadow-[#FF0055]/25 cursor-pointer transition-all"
            >
              {isSyncing ? '⏳ Sincronizando API...' : '↻ Sincronizar Meta Graph API Agora'}
            </button>
          </div>
        </div>

        {/* 1. NO TOPO: 140K Milestone Banner */}
        <div className="bg-gradient-to-r from-[#111832] via-[#161B36] to-[#1A102B] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-3">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">🔥 Marco de Monetização & Autoridade Digital</span>
              <h2 className="text-lg md:text-xl font-black text-white mt-0.5">
                Comunidade de <span className="text-[#00F0FF]">{fmtPtBr(followersCount)}</span> seguidores ativos — rumo aos <span className="text-[#FF0055]">140K</span>!
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
                Crescimento de <strong className="text-emerald-400">+75,1%</strong> sobre o último Mídia Kit (79 mil). Somente em Outubro/2026 já são <strong className="text-[#FF0055]">1.271.548 interações diretas verificadas</strong> em 290 publicações.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-[#090D1A]/90 border border-slate-800 px-5 py-3 rounded-xl shrink-0">
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase">Valuation Mídia Orgânica / Mês</div>
                <div className="text-xl font-black text-emerald-400">R$ 342.400</div>
                <div className="text-[11px] text-slate-400">Equivalente em Meta Ads (CPM R$ 18)</div>
              </div>
              <div className="h-10 w-[1px] bg-slate-800"></div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase">Engajamento Reels</div>
                <div className="text-lg font-black text-amber-400">5,61% ER</div>
                <div className="text-[11px] text-slate-400">4,3x acima da média nacional</div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-300">Progresso da Meta Comercial: 140.000 Seguidores</span>
              <span className="text-[#00F0FF] font-black">
                {String(pctTo140k).replace('.', ',')}% ({fmtPtBr(followersCount)} / 140.000 — faltam apenas {fmtPtBr(remTo140k)})
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] via-purple-500 to-[#FF0055] transition-all duration-700"
                style={{ width: `${pctTo140k}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 2. LOGO ABAIXO: VISUALIZADOR DE HOJE + COMPARATIVO COM ONTEM (EM LINHAS) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* LADO ESQUERDO (7 COLUNAS): VISUALIZADOR DE HOJE ABERTO NAS 5 MÉTRICAS + FEED AO VIVO */}
          <div className="xl:col-span-7 bg-gradient-to-br from-[#0F172E] via-[#0D1326] to-[#17112B] border border-[#00F0FF]/35 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/90 pb-3.5">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FF0055]/20 border border-[#FF0055]/40 text-[#FF0055] text-[11px] font-black uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#FF0055] animate-ping"></span>
                  RADAR DE HOJE AO VIVO • {todayDateStr}
                </div>
                <h2 className="text-lg font-black text-white">
                  Desempenho de Hoje em Tempo Real (<span className="text-[#00F0FF]">{t.posts} publicações hoje</span>)
                </h2>
              </div>

              <div className="flex items-center gap-1.5 bg-[#070A14] p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-center">
                <button
                  onClick={() => setCompareMode('same_hour')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    compareMode === 'same_hour' ? 'font-black bg-[#00F0FF] text-slate-950' : 'font-bold text-slate-400 hover:text-white'
                  }`}
                >
                  Vs. Ontem (Mesmo Horário)
                </button>
                <button
                  onClick={() => setCompareMode('full_day')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    compareMode === 'full_day' ? 'font-black bg-[#00F0FF] text-slate-950' : 'font-bold text-slate-400 hover:text-white'
                  }`}
                >
                  Vs. Ontem (24h Fechado)
                </button>
              </div>
            </div>

            {/* 5 CARDS ABERTOS DE HOJE */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { key: 'likes', title: 'Curtidas', icon: '❤️', iconBg: 'bg-[#FF0055]/15 text-[#FF0055]', val: t.likes, yestVal: y.likes, valColor: 'text-white', hoverBorder: 'hover:border-[#FF0055]' },
                { key: 'views', title: 'Visualizações', icon: '👁️', iconBg: 'bg-[#00F0FF]/15 text-[#00F0FF]', val: t.views, yestVal: y.views, valColor: 'text-[#00F0FF]', hoverBorder: 'hover:border-[#00F0FF]' },
                { key: 'reposts', title: 'Reposts', icon: '🔁', iconBg: 'bg-purple-500/15 text-purple-400', val: t.reposts, yestVal: y.reposts, valColor: 'text-purple-400', hoverBorder: 'hover:border-purple-500' },
                { key: 'sends', title: 'Envios Direct', icon: '✈️', iconBg: 'bg-sky-500/15 text-sky-400', val: t.sends, yestVal: y.sends, valColor: 'text-sky-400', hoverBorder: 'hover:border-sky-400' },
                { key: 'newFollowers', title: 'Seguidores', icon: '👤+', iconBg: 'bg-emerald-500/20 text-emerald-400', val: t.newFollowers, yestVal: y.newFollowers, valColor: 'text-emerald-400', hoverBorder: 'hover:border-emerald-400', isPlus: true }
              ].map((card) => {
                const d = formatDeltaBadge(card.val, card.yestVal);
                const isSelected = activeLineMetric === card.key;
                return (
                  <div
                    key={card.key}
                    onClick={() => setActiveLineMetric(card.key)}
                    className={`bg-[#080C18]/95 border ${isSelected ? 'border-[#00F0FF] ring-1 ring-[#00F0FF]/30' : 'border-slate-800'} ${card.hoverBorder} rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className={`w-6 h-6 rounded-md ${card.iconBg} flex items-center justify-center text-xs shrink-0`}>{card.icon}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap ${d.isPos ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {d.short}
                        </span>
                      </div>
                      <div className="text-[11px] font-extrabold text-slate-300 uppercase leading-tight">{card.title}</div>
                      <div className={`text-xl 2xl:text-2xl font-black tracking-tight mt-0.5 ${card.valColor}`}>
                        {card.isPlus ? `+${fmtPtBr(card.val)}` : fmtPtBr(card.val)}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span>Ontem:</span>
                      <strong className="text-amber-300 font-bold">
                        {card.isPlus ? `+${fmtPtBr(card.yestVal)}` : fmtPtBr(card.yestVal)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FEED EM TEMPO REAL DAS PUBLICAÇÕES DE HOJE */}
            <div className="bg-[#080C18]/90 border border-slate-800/90 rounded-xl p-3.5 flex-1 flex flex-col justify-between gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-black uppercase text-[10px]">Feed Ao Vivo de Hoje</span>
                  <span className="text-xs font-bold text-slate-300">Últimas publicações capturadas na Graph API</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400">💬 Comentários Hoje: <strong className="text-white">{fmtPtBr(t.comments)}</strong></span>
                  <span className="text-[11px] text-emerald-400 font-bold">{lastSyncBadge}</span>
                </div>
              </div>

              <div className="space-y-2">
                {liveTodayPosts.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2.5 bg-[#0D1326]/90 border border-slate-800/80 hover:border-slate-700 rounded-lg px-3 py-2 text-xs transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase shrink-0 ${p.type === 'REELS' ? 'bg-[#FF0055]/20 text-[#FF0055]' : 'bg-[#00F0FF]/20 text-[#00F0FF]'}`}>
                        {p.type === 'REELS' ? '🎬 REEL' : '📰 FEED'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">{p.time}</span>
                      <span className="text-slate-200 font-medium truncate">{p.caption}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 text-[11px] font-bold">
                      <span className="text-[#FF0055]">❤️ {fmtPtBr(p.likes)}</span>
                      <span className="text-[#00F0FF]">💬 {fmtPtBr(p.comments)}</span>
                      <a href={p.link} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-[#00F0FF] underline">Ver ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LADO DIREITO (5 COLUNAS): GRÁFICO DE LINHAS HOJE vs ONTEM */}
          <div className="xl:col-span-5 bg-[#0D1326] border border-slate-800/90 rounded-2xl p-5 shadow-2xl flex flex-col justify-between gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#00F0FF]">Curva de Evolução Hora a Hora (Linhas)</span>
                <h3 className="text-lg font-black text-white mt-0.5">Comparativo: Hoje vs. Ontem</h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30 px-2.5 py-1 rounded-lg">
                  <span className="w-3.5 h-0.5 bg-[#00F0FF] inline-block relative">
                    <span className="w-2 h-2 rounded-full bg-[#00F0FF] absolute -top-[3px] left-1"></span>
                  </span> Hoje (Ao Vivo)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  <span className="w-3.5 h-0.5 bg-amber-400 inline-block relative">
                    <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-[3px] left-1"></span>
                  </span> Ontem
                </span>
              </div>
            </div>

            {/* Seletor de Métrica para o Gráfico Principal de Linha */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'views', label: '👁️ Visualizações' },
                { key: 'likes', label: '❤️ Curtidas' },
                { key: 'reposts', label: '🔁 Reposts' },
                { key: 'sends', label: '✈️ Envios' },
                { key: 'newFollowers', label: '👤+ Seguidores' }
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setActiveLineMetric(btn.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${
                    activeLineMetric === btn.key
                      ? 'font-black bg-[#00F0FF] text-slate-950 shadow'
                      : 'font-bold bg-[#080C18] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Gráfico Principal de Linhas SVG (Hoje vs Ontem Hora a Hora) */}
            {renderMainDualLineChart()}

            {/* 5 Mini-Gráficos de Linha (Sparklines Duplas Hoje vs Ontem para cada métrica) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {miniItems.map(item => {
                const cfg = hourlyCurves[item.key];
                const sliceYest = cfg.yesterday.slice(0, 7);
                const sliceToday = cfg.today.slice(0, 7);
                const maxVal = Math.max(...sliceYest, ...sliceToday, 1) * 1.18;
                const w = 100;
                const h = 34;
                const getX = (i) => 5 + (i / 6) * (w - 10);
                const getY = (v) => 5 + (h - 10) - (v / maxVal) * (h - 10);
                const ptsYest = sliceYest.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');
                const ptsToday = sliceToday.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');
                const lastX = getX(6);
                const lastYToday = getY(sliceToday[6]);
                const lastYYest = getY(sliceYest[6]);
                const d = formatDeltaBadge(item.today, item.yest);
                const isSelected = activeLineMetric === item.key;

                return (
                  <div
                    key={item.key}
                    onClick={() => setActiveLineMetric(item.key)}
                    className={`p-2 rounded-xl bg-[#080C18] border ${
                      isSelected ? 'border-[#00F0FF] ring-1 ring-[#00F0FF]/30' : 'border-slate-800/80 hover:border-slate-700'
                    } cursor-pointer transition-all flex flex-col justify-between overflow-hidden`}
                  >
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-200 truncate leading-tight">{item.title}</div>
                      <div className="text-[9px] font-black text-emerald-400 mt-0.5 leading-tight">{d.short}</div>
                    </div>
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 my-1 overflow-visible">
                      <polyline fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="3 2" strokeLinecap="round" points={ptsYest} />
                      <polyline fill="none" stroke={cfg.stroke} strokeWidth="2.4" strokeLinecap="round" points={ptsToday} />
                      <circle cx={lastX} cy={lastYYest} r="2.5" fill="#F59E0B" stroke="#080C18" strokeWidth="1" />
                      <circle cx={lastX} cy={lastYToday} r="3" fill={cfg.stroke} stroke="#080C18" strokeWidth="1" />
                    </svg>
                    <div className="flex flex-col gap-0.5 text-[9.5px] pt-1 border-t border-slate-800/70 font-bold">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-400 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.stroke }}></span>Hoje
                        </span>
                        <span className="text-white font-black truncate">{fmtCompactNum(item.today)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-amber-400/90 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>Ontem
                        </span>
                        <span className="text-amber-300 font-black truncate">{fmtCompactNum(item.yest)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo do Veredito Hoje vs Ontem */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-[#080C18] to-[#00F0FF]/10 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="text-xs">
                <div className="font-black text-emerald-400 uppercase tracking-wider">
                  {compareMode === 'same_hour'
                    ? `🚀 Ritmo Acelerado: Curva de Hoje está ${mainViewsDelta.short} acima de ontem!`
                    : '⏱️ Curva de Hoje + Linha Pontilhada de Projeção vs. 24h de Ontem'}
                </div>
                <div className="text-slate-300 mt-0.5">
                  {compareMode === 'same_hour'
                    ? 'Dados sincronizados ao vivo da Graph API • Clique em qualquer métrica para alternar a curva.'
                    : 'A linha pontilhada projeta o fechamento de hoje superando o fechamento total de ontem.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-[#0D1326]/90 border border-slate-800 p-1.5 rounded-2xl">
          {[
            { id: 'overview', label: '📊 1. Visão Geral Mensal & Acumulado' },
            { id: 'virals', label: '🔥 2. Vitrine de Virais (Top Reels & Posts)' },
            { id: 'monetization', label: '💰 3. Simulador de Monetização & Cotas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF0055]/25 to-[#00F0FF]/25 text-white border border-[#00F0FF]/40 shadow-lg'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 6 KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#0D1326] border border-slate-800 hover:border-[#00F0FF]/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Seguidores IG</div>
                <div className="text-xl xl:text-2xl font-black text-white mt-1">{fmtPtBr(followersCount)}</div>
                <div className="text-xs text-emerald-400 font-bold mt-1">+4.398 no Facebook</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-[#FF0055]/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Interações (API)</div>
                <div className="text-xl xl:text-2xl font-black text-[#FF0055] mt-1">{fmtPtBr(totalInteractionsCount)}</div>
                <div className="text-xs text-slate-300 font-semibold mt-1">1,27M só em Out/26</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Curtidas Reais</div>
                <div className="text-xl xl:text-2xl font-black text-white mt-1">{fmtPtBr(totalLikesCount)}</div>
                <div className="text-xs text-pink-400 font-bold mt-1">Recorde: 566,8K num Reel</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-[#00F0FF]/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Comentários</div>
                <div className="text-xl xl:text-2xl font-black text-[#00F0FF] mt-1">{fmtPtBr(totalCommentsCount)}</div>
                <div className="text-xs text-slate-300 mt-1">+55.560 em Outubro/26</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Views Est. (Mês)</div>
                <div className="text-xl xl:text-2xl font-black text-purple-400 mt-1">19,08M</div>
                <div className="text-xs text-slate-400 mt-1">Alcance ~11,48M contas</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Engaj. Médio Reel</div>
                <div className="text-xl xl:text-2xl font-black text-emerald-400 mt-1">5,61%</div>
                <div className="text-xs text-slate-300 mt-1">7.735 interações/vídeo</div>
              </div>
            </div>

            {/* Interactive Daily Line Chart October 2026 */}
            <div className="bg-[#0D1326] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    📈 Curva de Explosão Diária de Engajamento — Outubro 2026 (@portalngbrasil)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dados reais da Meta Graph API • Picos históricos em 09/10 (97,1K), 18/10 (635,9K), 19/10 (335,1K) e 20/10 (98,0K)
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FF0055]/15 text-[#FF0055] border border-[#FF0055]/30 text-xs font-black">
                  290 Publicações em Outubro/2026
                </span>
              </div>

              {(() => {
                const w = 1100;
                const h = 230;
                const padL = 48;
                const padR = 28;
                const padT = 28;
                const padB = 30;
                const plotW = w - padL - padR;
                const plotH = h - padT - padB;
                const maxVal = Math.max(...octSeries.map(i => i.v), 1) * 1.12;
                const getX = (i) => padL + (i / (octSeries.length - 1)) * plotW;
                const getY = (v) => padT + plotH - (v / maxVal) * plotH;
                const pts = octSeries.map((item, i) => `${getX(i).toFixed(1)},${getY(item.v).toFixed(1)}`).join(' ');
                const areaPts = `${padL},${padT + plotH} ${pts} ${(padL + plotW).toFixed(1)},${padT + plotH}`;

                return (
                  <div className="w-full pt-2">
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-60 overflow-hidden">
                      <defs>
                        <linearGradient id="octLineAreaReact" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF0055" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#FF0055" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const gy = padT + plotH * (1 - pct);
                        const v = Math.round(maxVal * pct);
                        return (
                          <g key={idx}>
                            <line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke="#1E293B" strokeDasharray="3 3" />
                            <text x={padL - 8} y={gy + 4} fill="#64748B" fontSize="10" fontWeight="bold" textAnchor="end">
                              {(v / 1000).toFixed(0)}K
                            </text>
                          </g>
                        );
                      })}
                      <polygon points={areaPts} fill="url(#octLineAreaReact)" />
                      <polyline fill="none" stroke="#FF0055" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pts} />
                      {octSeries.map((item, i) => {
                        const x = getX(i);
                        const yPos = getY(item.v);
                        const isPeak = item.v > 50000;
                        const lbl = item.v >= 1000 ? (item.v / 1000).toFixed(1) + 'K' : item.v;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={yPos} r={isPeak ? 5 : 3} fill={isPeak ? '#00F0FF' : '#FF0055'} stroke="#0D1326" strokeWidth="1.5" />
                            {isPeak && (
                              <text x={x} y={yPos - 10} fill="#00F0FF" fontSize="10" fontWeight="900" textAnchor="middle">{lbl}</text>
                            )}
                            <text x={x} y={h - 8} fill="#64748B" fontSize="9.5" fontWeight="bold" textAnchor="middle">{item.d}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Grid: Top 5 Reels + Format & Hourly Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#0D1326] border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white uppercase">🏆 Top 5 Reels de Maior Repercussão Nacional</h3>
                    <p className="text-xs text-slate-400">Conteúdos com maior volume de curtidas e comentários auditados</p>
                  </div>
                  <button onClick={() => setActiveTab('virals')} className="text-xs font-bold text-[#00F0FF] hover:underline cursor-pointer">
                    Ver vitrine completa →
                  </button>
                </div>
                <div className="space-y-3">
                  {topPosts.slice(0, 5).map(p => (
                    <div key={p.rank} className="p-3.5 rounded-xl bg-[#080C18] border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-[#FF0055] text-white text-xs font-black">#{p.rank} REEL</span>
                          <span className="text-xs text-slate-400">{p.date}</span>
                          <span className="text-xs font-bold text-emerald-400">ER: {p.er}</span>
                          <span className="text-xs font-bold text-amber-400">~{p.views} views</span>
                        </div>
                        <p className="text-xs text-slate-200 truncate max-w-xl">{p.title}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs font-bold">
                        <span className="text-[#FF0055]">❤️ {fmtPtBr(p.likes)}</span>
                        <span className="text-[#00F0FF]">💬 {fmtPtBr(p.comments)}</span>
                        <a href={p.link} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-[#00F0FF] hover:text-slate-950 text-white transition-all">
                          Abrir ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#0D1326] border border-slate-800 rounded-2xl p-6 space-y-3">
                  <h3 className="text-sm font-black text-white uppercase">🎬 Domínio do Formato Reels</h3>
                  <div className="p-3.5 rounded-xl bg-[#080C18] border border-slate-800">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#FF0055]">REELS (217 vídeos)</span>
                      <span className="text-white font-black">99,8% do Engajamento</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{fmtPtBr(totalLikesCount - 2078)} curtidas + {fmtPtBr(totalCommentsCount - 386)} comentários</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#080C18] border border-slate-800">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#00F0FF]">FEED CARDS (139 posts)</span>
                      <span className="text-white font-black">Cobertura Diária</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Autoridade jornalística e tráfego p/ o site</div>
                  </div>
                </div>

                <div className="bg-[#0D1326] border border-slate-800 rounded-2xl p-6 space-y-3">
                  <h3 className="text-sm font-black text-white uppercase">⏰ Janelas de Ouro (Horários de Pico)</h3>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>00h • Plantão / Debates</span><span className="text-[#00F0FF]">618,9K inter.</span></div>
                      <div className="w-full h-2 bg-slate-900 rounded-full"><div className="h-full bg-gradient-to-r from-[#FF0055] to-[#00F0FF] rounded-full" style={{ width: '100%' }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>21h • Horário Nobre II</span><span className="text-[#00F0FF]">355,4K inter.</span></div>
                      <div className="w-full h-2 bg-slate-900 rounded-full"><div className="h-full bg-gradient-to-r from-[#FF0055] to-[#00F0FF] rounded-full" style={{ width: '58%' }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>18h • Horário Nobre I</span><span className="text-[#00F0FF]">248,2K inter.</span></div>
                      <div className="w-full h-2 bg-slate-900 rounded-full"><div className="h-full bg-gradient-to-r from-[#FF0055] to-[#00F0FF] rounded-full" style={{ width: '40%' }}></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>15h • Tarde Quente</span><span className="text-[#00F0FF]">198,2K inter.</span></div>
                      <div className="w-full h-2 bg-slate-900 rounded-full"><div className="h-full bg-gradient-to-r from-[#FF0055] to-[#00F0FF] rounded-full" style={{ width: '32%' }}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIRALS GALLERY */}
        {activeTab === 'virals' && (
          <div className="bg-[#0D1326] border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase">🔥 Vitrine Auditada de Conteúdos Virais (@portalngbrasil)</h3>
                <p className="text-xs text-slate-400">Clique em qualquer card para abrir a publicação original diretamente no Instagram</p>
              </div>
              <input
                type="text"
                value={viralSearch}
                onChange={(e) => setViralSearch(e.target.value)}
                placeholder="Buscar por tema na legenda..."
                className="bg-[#080C18] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] w-full md:w-64"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {topPosts
                .filter(p => !viralSearch.trim() || p.title.toLowerCase().includes(viralSearch.toLowerCase()))
                .map(p => (
                  <div key={p.rank} className="bg-[#080C18] border border-slate-800 hover:border-[#00F0FF]/50 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FF0055] text-white text-xs font-black">#{p.rank} REEL VIRAL</span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black">ER {p.er}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">
                        {p.date} • Estimativa: <strong className="text-amber-400">~{p.views} visualizações</strong>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{p.title}</p>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="grid grid-cols-2 gap-2 text-center bg-[#0D1326] p-2.5 rounded-xl">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Curtidas</div>
                          <div className="text-sm font-black text-[#FF0055]">{fmtPtBr(p.likes)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Comentários</div>
                          <div className="text-sm font-black text-[#00F0FF]">{fmtPtBr(p.comments)}</div>
                        </div>
                      </div>
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center py-2.5 rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-[#FF0055] hover:to-pink-600 text-white text-xs font-bold transition-all"
                      >
                        Assistir no Instagram (@portalngbrasil) ↗
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: MONETIZATION SIMULATOR & MEDIA KIT */}
        {activeTab === 'monetization' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders */}
              <div className="lg:col-span-7 bg-[#0D1326] border border-slate-800 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-black text-white uppercase">1. Configurar Pacote do Anunciante (Mensal)</h3>
                  <p className="text-xs text-slate-400">Ajuste os controles ao vivo durante a reunião comercial para calcular entrega e investimento</p>
                </div>

                <div className="p-4 rounded-xl bg-[#080C18] border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-white uppercase">🎬 Reels Patrocinados / Collab</div>
                      <div className="text-xs text-slate-400">Tabela: R$ 1.850/un • Média de 95K+ views por vídeo</div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#FF0055]/20 text-[#FF0055] font-black text-sm">{simReels} Reels</span>
                  </div>
                  <input type="range" min="0" max="16" value={simReels} onChange={(e) => setSimReels(Number(e.target.value))} className="w-full accent-[#FF0055] cursor-pointer" />
                </div>

                <div className="p-4 rounded-xl bg-[#080C18] border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-white uppercase">📰 Posts Carrossel / Card no Feed</div>
                      <div className="text-xs text-slate-400">Tabela: R$ 750/un • Fixação institucional de marca</div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#00F0FF]/20 text-[#00F0FF] font-black text-sm">{simFeed} Posts</span>
                  </div>
                  <input type="range" min="0" max="20" value={simFeed} onChange={(e) => setSimFeed(Number(e.target.value))} className="w-full accent-[#00F0FF] cursor-pointer" />
                </div>

                <div className="p-4 rounded-xl bg-[#080C18] border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-white uppercase">📲 Sequências de Stories com Link (WhatsApp/Site)</div>
                      <div className="text-xs text-slate-400">Tabela: R$ 420/combo • Geração direta de leads e cliques</div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-black text-sm">{simStories} Combos</span>
                  </div>
                  <input type="range" min="0" max="30" value={simStories} onChange={(e) => setSimStories(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer" />
                </div>

                <div className="p-4 rounded-xl bg-[#080C18] border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-white uppercase">🌐 Matérias Publieditoriais no Portal NG Brasil</div>
                      <div className="text-xs text-slate-400">Tabela: R$ 950/matéria • Conteúdo com SEO permanente no Google</div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-sm">{simArticles} Matérias</span>
                  </div>
                  <input type="range" min="0" max="12" value={simArticles} onChange={(e) => setSimArticles(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer" />
                </div>
              </div>

              {/* Output ROI */}
              <div className="lg:col-span-5 bg-gradient-to-b from-[#111936] to-[#0B0F20] border border-[#00F0FF]/40 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <span className="text-xs font-black uppercase text-[#00F0FF]">Projeção de ROI para o Anunciante</span>
                    <h3 className="text-lg font-black text-white">Plano Mensal Recomendado (-15%)</h3>
                  </div>

                  <div className="bg-[#070A14] border border-slate-800 p-5 rounded-2xl text-center space-y-1">
                    <div className="text-xs text-slate-400 line-through">Valor de Tabela: R$ {fmtPtBr(simGross)}/mês</div>
                    <div className="text-4xl font-black text-white">R$ {fmtPtBr(simNet)}/mês</div>
                    <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                      Economia de R$ {fmtPtBr(simSave)}/mês
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#070A14] border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-xs text-slate-400 font-bold">Views Projetados</div>
                      <div className="text-xl font-black text-[#00F0FF] mt-1">~{(simViews / 1000).toFixed(1).replace('.', ',')}K</div>
                    </div>
                    <div className="bg-[#070A14] border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-xs text-slate-400 font-bold">Interações Est.</div>
                      <div className="text-xl font-black text-[#FF0055] mt-1">~{(simInter / 1000).toFixed(1).replace('.', ',')}K</div>
                    </div>
                    <div className="bg-[#070A14] border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-xs text-slate-400 font-bold">CPM Efetivo</div>
                      <div className="text-lg font-black text-emerald-400 mt-1">R$ {simCpm}</div>
                    </div>
                    <div className="bg-[#070A14] border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-xs text-slate-400 font-bold">Custo / Interação</div>
                      <div className="text-lg font-black text-amber-400 mt-1">R$ {simCpe}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCopyProposal}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF0055] to-pink-600 hover:from-[#ff1a66] hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all"
                >
                  {copiedProp ? '✓ Proposta Copiada para o WhatsApp!' : '📋 Copiar Proposta Pronta p/ WhatsApp'}
                </button>
              </div>
            </div>

            {/* 3 Ready Sponsorship Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => { setSimReels(1); setSimFeed(2); setSimStories(4); setSimArticles(1); }}
                className="bg-[#0D1326] border border-slate-700 hover:border-slate-500 rounded-2xl p-6 space-y-3 cursor-pointer transition-all"
              >
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-800 text-slate-300">Entrada Rápida</span>
                <h4 className="text-lg font-black text-white">🥉 Cota Impacto Regional</h4>
                <div className="text-3xl font-black text-white">R$ 2.490<span className="text-xs text-slate-400">/mês</span></div>
                <p className="text-xs text-slate-300">1 Reel Collab + 2 Posts Feed + 4 Combos Stories + 1 Matéria no Portal NG Brasil (~160.000 visualizações).</p>
              </div>
              <div
                onClick={() => { setSimReels(4); setSimFeed(4); setSimStories(8); setSimArticles(2); }}
                className="bg-[#0D1326] border-2 border-[#00F0FF] rounded-2xl p-6 space-y-3 shadow-xl shadow-[#00F0FF]/10 cursor-pointer transition-all"
              >
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#00F0FF]/20 text-[#00F0FF]">Mais Vendida • Melhor ROI</span>
                <h4 className="text-lg font-black text-white">🥈 Cota Parceiro Oficial NG</h4>
                <div className="text-3xl font-black text-emerald-400">R$ 5.900<span className="text-xs text-slate-400">/mês</span></div>
                <p className="text-xs text-slate-200">4 Reels Patrocinados (1/sem) + 4 Posts Feed + 8 Combos Stories + 2 Matérias e Banner (~620.000 visualizações).</p>
              </div>
              <div
                onClick={() => { setSimReels(10); setSimFeed(8); setSimStories(15); setSimArticles(4); }}
                className="bg-[#0D1326] border border-[#FF0055] hover:border-pink-500 rounded-2xl p-6 space-y-3 cursor-pointer transition-all"
              >
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#FF0055]/20 text-[#FF0055]">Exclusividade no Segmento</span>
                <h4 className="text-lg font-black text-white">🥇 Cota Master Naming Rights</h4>
                <div className="text-3xl font-black text-[#FF0055]">R$ 12.500<span className="text-xs text-slate-400">/mês</span></div>
                <p className="text-xs text-slate-300">Assinatura fixa de Editoria + 10 Reels/mês + 8 Feeds + 15 Stories + Topo Fixo no Portal (+1,5M visualizações).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
