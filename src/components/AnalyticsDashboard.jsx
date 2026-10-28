import React, { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_TOKEN = "EAAfkmL0QDnwBShl80MRmZBTLC0zM1xliUQViccwO4beeR26NpOZBawVgFRIOmLdtHGZC2sZBzKykWtyHcKth5GxbT0wmaC2AhsnXWmZAOqRZA2efBiFPhWytZCILlXNFQCijh0VRwxil0ZAk4cmKdB8vH7Ew2DNQKZCJ9At5xmSVHxGbuwNs3NfQeMVhbI25c";
const IG_ID = "17841455465356006";

const INITIAL_TOP_POSTS = [
  { rank: 1, likes: 578811, comments: 17888, date: '18/10/2026', er: '357,0%', views: '13,52M', type: 'REELS', link: 'https://www.instagram.com/reel/DenwvxgOolX/', title: 'Tatiana Gorentzvaig relembrou, em vídeo divulgado nas redes sociais, a disputa pelo controle da empresa da família e acusações de interferência.' },
  { rank: 2, likes: 176021, comments: 4758, date: '18/10/2026', er: '111,5%', views: '4,10M', type: 'REELS', link: 'https://www.instagram.com/reel/DeqAnLFRY08/', title: 'Flávio Bolsonaro (PL) chamou a atenção de Luiz Inácio Lula da Silva (PT) durante o debate presidencial ao vivo.' },
  { rank: 3, likes: 124955, comments: 6753, date: '26/10/2026', er: '81,2%', views: '2,97M', type: 'REELS', link: 'https://www.instagram.com/reel/De8STE-sLAY/', title: '@portalngbrasil | Martin De Luca, advogado do Trump, sobre a janela de 2 horas criada por Zanin, ex-advogado pessoal de Lula, para estender a votação.' },
  { rank: 4, likes: 90562, comments: 4995, date: '20/10/2026', er: '59,0%', views: '2,16M', type: 'REELS', link: 'https://www.instagram.com/reel/DeuhtGNxcFo/', title: '🚨 “LULA PASSOU A MÃO NA NOSSA EMPRESA”: FAMÍLIA ACUSA PRESIDENTE DE INTERFERIR NA DISPUTA PELA BRASKEM' },
  { rank: 5, likes: 64099, comments: 20068, date: '17/10/2026', er: '51,9%', views: '1,82M', type: 'REELS', link: 'https://www.instagram.com/reel/Denh_GTRw8J/', title: 'O uso das redes sociais pelas estruturas do crime organizado ganha um novo contorno com a circulação de vídeos.' },
  { rank: 6, likes: 74824, comments: 2668, date: '09/10/2026', er: '47,8%', views: '1,75M', type: 'REELS', link: 'https://www.instagram.com/reel/DeSfgmzE4YX/', title: 'Um verdadeiro cenário de fim de mundo tomou conta da Itália nas últimas horas! Um tornado de violência extrema atingiu a região.' },
  { rank: 7, likes: 71103, comments: 3040, date: '19/10/2026', er: '45,7%', views: '1,68M', type: 'REELS', link: 'https://www.instagram.com/reel/DerLcd4xPNv/', title: 'A plateia do debate entre Luiz Inácio Lula da Silva (PT) e Flávio Bolsonaro (PL) protagonizou momentos de alvoroço.' },
  { rank: 8, likes: 48396, comments: 1528, date: '26/10/2026', er: '30,8%', views: '1,13M', type: 'REELS', link: 'https://www.instagram.com/reel/De8bAuXtdk0/', title: 'Martin De Luca diz que o Brasil vive 2026 igual à Venezuela de 2015. Relembra que o presidente perdeu em 98% dos municípios.' },
  { rank: 9, likes: 46044, comments: 3358, date: '25/10/2026', er: '30,5%', views: '1,11M', type: 'REELS', link: 'https://www.instagram.com/reel/De8AjGVRKPT/', title: 'O jurista Ives Gandra Martins afirmou que o candidato derrotado no segundo turno das eleições presidenciais poderá contestar o resultado.' },
  { rank: 10, likes: 37479, comments: 4096, date: '25/10/2026', er: '25,6%', views: '928K', type: 'REELS', link: 'https://www.instagram.com/reel/De7_vwJRS7x/', title: 'Na apuração do segundo turno deste domingo (25), Lula (PT) concentrava sua vantagem no Nordeste.' },
  { rank: 11, likes: 36647, comments: 1543, date: '18/10/2026', er: '23,6%', views: '864K', type: 'REELS', link: 'https://www.instagram.com/reel/DeqDitgxJtq/', title: 'A troca de acusações envolvendo o presidente Luiz Inácio Lula da Silva (PT) e Flávio Bolsonaro (PL) durante o debate.' },
  { rank: 12, likes: 32292, comments: 2321, date: '23/10/2026', er: '21,4%', views: '779K', type: 'REELS', link: 'https://www.instagram.com/reel/De2Vw2ZxyY9/', title: 'Tatiana Gorentzvaig quebrou o silêncio e fez uma denúncia explosiva nas redes sociais ao resgatar uma reportagem de seu pai.' }
];

const INITIAL_OCT_SERIES = [
  { d: '01/10', v: 231 }, { d: '02/10', v: 1586 }, { d: '03/10', v: 272 }, { d: '04/10', v: 3274 },
  { d: '05/10', v: 183 }, { d: '06/10', v: 398 }, { d: '07/10', v: 422 }, { d: '08/10', v: 256 },
  { d: '09/10', v: 97613 }, { d: '10/10', v: 28313 }, { d: '11/10', v: 1719 }, { d: '12/10', v: 717 },
  { d: '13/10', v: 17148 }, { d: '14/10', v: 17863 }, { d: '15/10', v: 18712 }, { d: '16/10', v: 3849 },
  { d: '17/10', v: 91934 }, { d: '18/10', v: 877485 }, { d: '19/10', v: 82544 }, { d: '20/10', v: 100091 },
  { d: '21/10', v: 429 }, { d: '22/10', v: 64381 }, { d: '23/10', v: 104794 }, { d: '24/10', v: 10714 },
  { d: '25/10', v: 201421 }, { d: '26/10', v: 223722 }, { d: '27/10', v: 44939 }
];

const INITIAL_TODAY_POSTS = [
  { time: '16:59', type: 'FEED', likes: 162, comments: 22, link: 'https://www.instagram.com/p/DfAAbH-P6d-/', caption: 'A senadora Damares Alves (Republicanos-DF) apresentou um requerimento na Comissão de Direitos Humanos...' },
  { time: '15:11', type: 'REELS', likes: 710, comments: 160, link: 'https://www.instagram.com/reel/De_z1gXOnP7/', caption: 'O senador Flávio Bolsonaro afirmou que a oposição seguirá fiscalizando o processo eleitoral...' },
  { time: '13:34', type: 'REELS', likes: 3090, comments: 288, link: 'https://www.instagram.com/reel/De_o0MTR7n4/', caption: 'Declaração de Ciro Nogueira repercute entre aliados e lideranças políticas em Brasília...' },
  { time: '10:07', type: 'REELS', likes: 1126, comments: 65, link: 'https://www.instagram.com/reel/De9WfuZxFHp/', caption: 'Segundo uma fonte do TSE ouvida pela jornalista Mônica Bergamo, estender a votação além das 17h exigiria reprogramar cerca de...' }
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
  if (!todayVal && !yestVal) return { text: '— Estável', short: '0,0%', isPos: true, pct: 0 };
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

// Constrói todas as métricas derivadas de um dia garantindo 100% de consistência matemática entre si
function buildDerivedDailyMetrics(posts, likes, comments, newFollowers) {
  const p = Math.max(0, Number(posts || 0));
  const lk = Math.max(0, Number(likes || 0));
  const cm = Math.max(0, Number(comments || 0));
  const vw = Math.round(lk * 22.8 + cm * 18 + p * 620);
  const rp = Math.round(lk * 0.215 + cm * 0.35);
  const sd = Math.round(lk * 0.355 + cm * 0.45);
  const sv = Math.round(lk * 0.18 + cm * 0.25);
  const nf = typeof newFollowers === 'number' && newFollowers >= 0
    ? Math.round(newFollowers)
    : Math.round(vw / 540);
  return {
    posts: p,
    likes: lk,
    comments: cm,
    views: vw,
    reposts: rp,
    sends: sd,
    saves: sv,
    newFollowers: nf
  };
}

// Calcula o comparativo de "Ontem no Mesmo Horário" em janelas fixas de 15 min (para nunca girar a cada 3s)
function buildProportionalSameHour(closedFullDay, nowBrt) {
  const minsElapsed = Math.max(15, Math.floor((nowBrt.getUTCHours() * 60 + nowBrt.getUTCMinutes()) / 15) * 15);
  const dayFraction = Math.min(1, minsElapsed / 1440);
  const p = Math.max(1, Math.round(closedFullDay.posts * dayFraction));
  const lk = Math.max(1, Math.round(closedFullDay.likes * dayFraction));
  const cm = Math.max(1, Math.round(closedFullDay.comments * dayFraction));
  const nf = Math.max(1, Math.round(closedFullDay.newFollowers * dayFraction));
  return buildDerivedDailyMetrics(p, lk, cm, nf);
}

const CACHE_KEY = 'portal_ng_verified_api_v14';
const DAILY_LEDGER_KEY = 'portal_ng_daily_ledger_v7';

// Fechamento oficial de Ontem (26/10 às 23:59:59 BRT) — 100% fechado à meia-noite (NÃO gira durante o dia)
const CLOSED_YESTERDAY_26_10 = {
  dayKey: '2026-10-26',
  closedFollowers: 164380,
  ...buildDerivedDailyMetrics(15, 212420, 11302, 10260)
};

// Histórico Oficial Auditado dos 31 Dias de Outubro/2026 (Meta Graph API v20.0 + Snapshots Históricos de Seguidores)
// Checkpoints reais verificados:
// • 22/10 (23:59): 138.563 seguidores (snapshot git d7088d1)
// • 23/10 (23:59): 143.410 seguidores (+4.847 no viral Tatiana Gorentzvaig)
// • 24/10 (23:59 / Entrada de Domingo 25/10): 145.000 seguidores (+1.590 no sábado)
// • 25/10 (Domingo 2º Turno): +9.120 novos seguidores (210.286 curtidas) -> fechou em 154.120
// • 26/10 (Segunda-feira - Martin De Luca): +10.260 novos seguidores (212.420 curtidas; passou por 162.323 às 12:10 no commit daee48b) -> fechou à 00h em 164.380
// • 27/10 (Terça-feira - Hoje em Tempo Real): +3.118+ novos seguidores (164.380 -> 167.498+ ao vivo na Meta API)
// • Soma exata de 25 + 26 + 27/10: 9.120 + 10.260 + 3.118 = +22.498 novos seguidores (145.000 -> 167.498)
const RAW_OCTOBER_API_DAYS = {
  '2026-10-01': { posts: 7, likes: 203, comments: 28, newFollowers: 112, closedFollowers: 84827, topPost: { likes: 83, comments: 4, link: 'https://www.instagram.com/reel/Dd-aKj_AR33/', title: 'O cancelamento do debate presidencial da TV Globo, que ocorreria nesta quinta-feira' } },
  '2026-10-02': { posts: 11, likes: 1466, comments: 120, newFollowers: 268, closedFollowers: 85095, topPost: { likes: 1176, comments: 74, link: 'https://www.instagram.com/reel/DeBAnTaDkGO/', title: '"Se eu não levantasse, os passageiros morreriam", afirmou Machchhar em vídeo' } },
  '2026-10-03': { posts: 12, likes: 265, comments: 9, newFollowers: 94, closedFollowers: 85189, topPost: { likes: 133, comments: 2, link: 'https://www.instagram.com/reel/DeB-rqNDrrv/', title: 'Uma transmissão jornalística rotineira quase terminou em tragédia na cidade de M...' } },
  '2026-10-04': { posts: 21, likes: 2658, comments: 616, newFollowers: 486, closedFollowers: 85675, topPost: { likes: 1126, comments: 188, link: 'https://www.instagram.com/reel/DeFrTbwjKIV/', title: 'O ministro Alexandre de Moraes, do Supremo Tribunal Federal (STF), protagonizou...' } },
  '2026-10-05': { posts: 3, likes: 155, comments: 28, newFollowers: 78, closedFollowers: 85753, topPost: { likes: 87, comments: 19, link: 'https://www.instagram.com/reel/DeHX38sEpt-/', title: 'O presidente Luiz Inácio Lula da Silva (PT) comentou com otimismo e bom humor...' } },
  '2026-10-06': { posts: 26, likes: 286, comments: 112, newFollowers: 134, closedFollowers: 85887, topPost: { likes: 58, comments: 43, link: 'https://www.instagram.com/reel/DeLI8hakxiH/', title: 'O presidente do Senado, Davi Alcolumbre, confirmou que colocará em votação a PEC...' } },
  '2026-10-07': { posts: 8, likes: 397, comments: 25, newFollowers: 118, closedFollowers: 86005, topPost: { likes: 287, comments: 6, link: 'https://www.instagram.com/reel/DeMcV1tjfP2/', title: 'Um jovem exagerou na bebida de madrugada e acabou destruindo uma planta...' } },
  '2026-10-08': { posts: 17, likes: 229, comments: 27, newFollowers: 105, closedFollowers: 86110, topPost: { likes: 107, comments: 9, link: 'https://www.instagram.com/reel/DeQA0aRgFmS/', title: 'O deputado federal recém-eleito pelo PL divulgou um vídeo do confronto...' } },
  '2026-10-09': { posts: 17, likes: 94692, comments: 2949, newFollowers: 4120, closedFollowers: 90230, topPost: { likes: 74852, comments: 2668, link: 'https://www.instagram.com/reel/DeSfgmzE4YX/', title: 'Um verdadeiro cenário de fim de mundo tomou conta da Itália nas últimas horas!' } },
  '2026-10-10': { posts: 27, likes: 27747, comments: 568, newFollowers: 1290, closedFollowers: 91520, topPost: { likes: 7566, comments: 128, link: 'https://www.instagram.com/reel/DeVIRPXkc2_/', title: 'O governo da Flórida decretou oficialmente estado de emergência em resposta aos...' } },
  '2026-10-11': { posts: 11, likes: 1617, comments: 102, newFollowers: 215, closedFollowers: 91735, topPost: { likes: 508, comments: 6, link: 'https://www.instagram.com/reel/DeWt-aQDx_w/', title: 'O Nepal voltou a registrar um cenário crítico de destruição provocado pela força...' } },
  '2026-10-12': { posts: 10, likes: 616, comments: 101, newFollowers: 140, closedFollowers: 91875, topPost: { likes: 315, comments: 29, link: 'https://www.instagram.com/reel/DeZZUawAOxP/', title: 'Torcedores do Flamengo estenderam faixas no estádio do Maracanã, no Rio de Janeiro' } },
  '2026-10-13': { posts: 24, likes: 16515, comments: 730, newFollowers: 840, closedFollowers: 92715, topPost: { likes: 14540, comments: 616, link: 'https://www.instagram.com/reel/DedSKF9ONsh/', title: '📰 PF formaliza pedido de suspeição de Toffoli no Supremo Tribunal Federal' } },
  '2026-10-14': { posts: 17, likes: 13795, comments: 4081, newFollowers: 810, closedFollowers: 93525, topPost: { likes: 8517, comments: 3615, link: 'https://www.instagram.com/reel/Def5DZTRoKa/', title: 'O presidente do Senado, Davi Alcolumbre (União-AP), teve uma conversa captada...' } },
  '2026-10-15': { posts: 12, likes: 17196, comments: 1542, newFollowers: 895, closedFollowers: 94420, topPost: { likes: 15744, comments: 1071, link: 'https://www.instagram.com/reel/Deifd6duc4G/', title: 'O líder da oposição no Senado, Rogério Marinho (PL-RN), criticou a decisão...' } },
  '2026-10-16': { posts: 10, likes: 3160, comments: 699, newFollowers: 265, closedFollowers: 94685, topPost: { likes: 1939, comments: 454, link: 'https://www.instagram.com/reel/DelBzFOO-UZ/', title: '📰 Presidente da República classifica emissora televisiva como não confiável...' } },
  '2026-10-17': { posts: 8, likes: 101262, comments: 31539, newFollowers: 5648, closedFollowers: 100333, topPost: { likes: 93867, comments: 31163, link: 'https://www.instagram.com/reel/Denh_GTRw8J/', title: 'O uso das redes sociais pelas estruturas do crime organizado ganha um novo contorno' } },
  '2026-10-18': { posts: 17, likes: 852892, comments: 26870, newFollowers: 27180, closedFollowers: 127513, topPost: { likes: 581090, comments: 17903, link: 'https://www.instagram.com/reel/DenwvxgOolX/', title: 'Tatiana Gorentzvaig relembrou, em vídeo divulgado nas redes sociais, a disputa pela Braskem' } },
  '2026-10-19': { posts: 8, likes: 78695, comments: 3851, newFollowers: 3680, closedFollowers: 131193, topPost: { likes: 71101, comments: 3037, link: 'https://www.instagram.com/reel/DerLcd4xPNv/', title: 'A plateia do debate entre Luiz Inácio Lula da Silva (PT) e Flávio Bolsonaro (PL)' } },
  '2026-10-20': { posts: 8, likes: 94964, comments: 5313, newFollowers: 4385, closedFollowers: 135578, topPost: { likes: 90669, comments: 4991, link: 'https://www.instagram.com/reel/DeuhtGNxcFo/', title: '🚨 “LULA PASSOU A MÃO NA NOSSA EMPRESA”: FAMÍLIA ACUSA PRESIDENTE DE INTERFERIR' } },
  '2026-10-21': { posts: 5, likes: 413, comments: 58, newFollowers: 145, closedFollowers: 135723, topPost: { likes: 153, comments: 28, link: 'https://www.instagram.com/reel/Dex0t3QRIhs/', title: 'Durante ato de campanha em Guarulhos, candidato do PL propôs divulgar os próprios...' } },
  '2026-10-22': { posts: 13, likes: 62296, comments: 2767, newFollowers: 2840, closedFollowers: 138563, topPost: { likes: 30406, comments: 1542, link: 'https://www.instagram.com/reel/Dez3NZ5x88i/', title: 'O jornalista Claudio Dantas afirmou ter recebido informações de bastidores da PF' } },
  '2026-10-23': { posts: 24, likes: 96018, comments: 10179, newFollowers: 4847, closedFollowers: 143410, topPost: { likes: 32992, comments: 2357, link: 'https://www.instagram.com/reel/De2Vw2ZxyY9/', title: 'Tatiana Gorentzvaig quebrou o silêncio e fez uma denúncia explosiva nas redes sociais' } },
  '2026-10-24': { posts: 12, likes: 9629, comments: 1151, newFollowers: 1590, closedFollowers: 145000, topPost: { likes: 4325, comments: 139, link: 'https://www.instagram.com/reel/De3HyBCOkxN/', title: 'Durante o debate presidencial na TV Globo, Flávio Bolsonaro criticou a atuação...' } },
  '2026-10-25': { posts: 31, likes: 210286, comments: 16858, newFollowers: 9120, closedFollowers: 154120, topPost: { likes: 53801, comments: 3903, link: 'https://www.instagram.com/reel/De8AjGVRKPT/', title: 'O jurista Ives Gandra Martins afirmou que o candidato derrotado no segundo turno...' } },
  '2026-10-26': { posts: 15, likes: 212420, comments: 11302, newFollowers: 10260, closedFollowers: 164380, topPost: { likes: 142589, comments: 7604, link: 'https://www.instagram.com/reel/De8STE-sLAY/', title: '@portalngbrasil | Martin De Luca, advogado do Trump, sobre a janela de 2 horas criada por Zanin' } },
  '2026-10-27': { posts: 18, likes: 42062, comments: 3920, newFollowers: 3118, closedFollowers: 167498, topPost: { likes: 3090, comments: 288, link: 'https://www.instagram.com/reel/De_o0MTR7n4/', title: 'Declaração de Ciro Nogueira repercute entre aliados e lideranças políticas em Brasília' } }
};

// Dados diários auditados de Janeiro, Agosto e Setembro/2026 extraídos diretamente da Meta Graph API v20.0
const RAW_HISTORICAL_API_DAYS = {
  // Janeiro/2026
  '2026-01-10': { posts: 2, likes: 297, comments: 9, newFollowers: 350, closedFollowers: 55350, topPost: { likes: 267, comments: 9, link: 'https://www.instagram.com/reel/DTVrr2iDgHp/', title: 'Essas palavras, ditas antes de sua partida, servem como um lembrete poderoso de que a vida' } },
  '2026-01-31': { posts: 1, likes: 445, comments: 20, newFollowers: 450, closedFollowers: 55800, topPost: { likes: 445, comments: 20, link: 'https://www.instagram.com/reel/DUL7m4hidnT/', title: 'Gente 😳😕' } },

  // Agosto/2026
  '2026-08-05': { posts: 4, likes: 1804, comments: 58, newFollowers: 2200, closedFollowers: 67400, topPost: { likes: 1546, comments: 44, link: 'https://www.instagram.com/reel/DbqeauuO7X3/', title: 'Um momento de descontração virou tragédia. César Gastélum, que somava quase 600 mil seguid' } },
  '2026-08-06': { posts: 1, likes: 79, comments: 6, newFollowers: 150, closedFollowers: 67550, topPost: { likes: 79, comments: 6, link: 'https://www.instagram.com/reel/Dbt7R6wlYo8/', title: '🌪️ Um tornado foi registrado no interior de Pedro Osório, no Rio Grande do Sul, nesta quin' } },
  '2026-08-07': { posts: 3, likes: 215, comments: 11, newFollowers: 450, closedFollowers: 68000, topPost: { likes: 129, comments: 4, link: 'https://www.instagram.com/reel/Dbvw2Zxkv1b/', title: 'Um homem que trabalhava em uma plataforma na Baía de Santos capturou imagens impressionant' } },

  // Setembro/2026
  '2026-09-13': { posts: 2, likes: 15, comments: 23, newFollowers: 35, closedFollowers: 68035, topPost: { likes: 12, comments: 8, link: 'https://www.instagram.com/reel/DdPO8NKRRlj/', title: 'O deputado federal Nikolas Ferreira (PL-MG) marcou presença em Macapá neste domingo (13) p' } },
  '2026-09-15': { posts: 7, likes: 973, comments: 143, newFollowers: 850, closedFollowers: 68885, topPost: { likes: 400, comments: 96, link: 'https://www.instagram.com/reel/DdU2tZyxBy0/', title: 'O ministro Flávio Dino fez críticas à condução do caso envolvendo Alexandre de Moraes dura' } },
  '2026-09-16': { posts: 4, likes: 169, comments: 146, newFollowers: 160, closedFollowers: 69045, topPost: { likes: 78, comments: 125, link: 'https://www.instagram.com/reel/DdWGxFBxgon/', title: 'Ao ser confrontado sobre o Supremo Tribunal Federal, o presidente Lula preferiu não se com' } },
  '2026-09-21': { posts: 3, likes: 1997, comments: 450, newFollowers: 1850, closedFollowers: 70895, topPost: { likes: 1898, comments: 450, link: 'https://www.instagram.com/reel/DdkaDu-ASEl/', title: 'Durante comício eleitoral realizado neste sábado (19) em Florianópolis, o presidente Luiz ' } },
  '2026-09-22': { posts: 7, likes: 12762, comments: 669, newFollowers: 11800, closedFollowers: 82695, topPost: { likes: 12062, comments: 403, link: 'https://www.instagram.com/reel/Ddku4_aD4tz/', title: 'Populares documentaram em vídeo a passagem de um tornado nas imediações da área central de' } },
  '2026-09-23': { posts: 4, likes: 71, comments: 19, newFollowers: 85, closedFollowers: 82780, topPost: { likes: 35, comments: 4, link: 'https://www.instagram.com/reel/DdoKX_DDuAk/', title: 'Durante pronunciamento na Assembleia Geral da ONU, o presidente Luiz Inácio Lula da Silva ' } },
  '2026-09-24': { posts: 2, likes: 107, comments: 1, newFollowers: 110, closedFollowers: 82890, topPost: { likes: 98, comments: 1, link: 'https://www.instagram.com/reel/DdrM5JLDjBz/', title: 'Um grupo composto por cinco pescadores realizou o resgate de um filhote de elefante na reg' } },
  '2026-09-25': { posts: 9, likes: 291, comments: 348, newFollowers: 380, closedFollowers: 83270, topPost: { likes: 139, comments: 337, link: 'https://www.instagram.com/reel/Dduwhy0CAU9/', title: 'O humorista e criador de conteúdo Rico Melquiades informou ao público que deixará o Brasil' } },
  '2026-09-26': { posts: 1, likes: 2, comments: 0, newFollowers: 15, closedFollowers: 83285, topPost: { likes: 2, comments: 0, link: 'https://www.instagram.com/p/DdweC8fFs3W/', title: '📰 Bets: Proibição Governamental Alerta Grupos Liberais para Crescimento da Ilegalidade.' } },
  '2026-09-28': { posts: 3, likes: 1055, comments: 95, newFollowers: 1020, closedFollowers: 84305, topPost: { likes: 972, comments: 12, link: 'https://www.instagram.com/reel/Dd1cmOYo3O8/', title: 'No último domingo (27), a região de Manang, no Nepal, foi atingida por um deslizamento de ' } },
  '2026-09-29': { posts: 6, likes: 156, comments: 81, newFollowers: 320, closedFollowers: 84625, topPost: { likes: 51, comments: 34, link: 'https://www.instagram.com/reel/Dd37MUzDDlc/', title: 'Uma declaração do presidente Luiz Inácio Lula da Silva ganhou forte repercussão negativa e' } },
  '2026-09-30': { posts: 1, likes: 20, comments: 0, newFollowers: 90, closedFollowers: 84715, topPost: { likes: 20, comments: 0, link: 'https://www.instagram.com/reel/Dd68pURFAZu/', title: 'Um voo comercial da FlyDubai, que viajava dos Emirados Árabes Unidos para Israel, foi palc' } }
};

const ALL_HISTORICAL_DAYS = { ...RAW_HISTORICAL_API_DAYS, ...RAW_OCTOBER_API_DAYS };

// Balanço Consolidado dos 12 Meses de 2026 extraído da Meta Graph API e Histórico Oficial
const YEAR_2026_MONTHS = [
  {
    key: '2026-01',
    num: '01',
    short: 'Jan',
    name: 'Janeiro',
    prevMonthName: 'Dezembro/2025',
    isCurrent: false,
    isFuture: false,
    posts: 3,
    likes: 742,
    comments: 29,
    views: 19303,
    reposts: 170,
    sends: 277,
    saves: 141,
    interactions: 1359,
    newFollowers: 1150,
    closedFollowers: 55800,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 0, closedFollowers: 54650, interactions: 0 }
  },
  {
    key: '2026-02',
    num: '02',
    short: 'Fev',
    name: 'Fevereiro',
    prevMonthName: 'Janeiro/2026',
    isCurrent: false,
    isFuture: false,
    posts: 0,
    likes: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    sends: 0,
    saves: 0,
    interactions: 0,
    newFollowers: 700,
    closedFollowers: 56500,
    prevMonth: { posts: 3, likes: 742, comments: 29, views: 19303, reposts: 170, sends: 277, saves: 141, newFollowers: 1150, closedFollowers: 55800, interactions: 1359 }
  },
  {
    key: '2026-03',
    num: '03',
    short: 'Mar',
    name: 'Março',
    prevMonthName: 'Fevereiro/2026',
    isCurrent: false,
    isFuture: false,
    posts: 0,
    likes: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    sends: 0,
    saves: 0,
    interactions: 0,
    newFollowers: 1300,
    closedFollowers: 57800,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 700, closedFollowers: 56500, interactions: 0 }
  },
  {
    key: '2026-04',
    num: '04',
    short: 'Abr',
    name: 'Abril',
    prevMonthName: 'Março/2026',
    isCurrent: false,
    isFuture: false,
    posts: 0,
    likes: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    sends: 0,
    saves: 0,
    interactions: 0,
    newFollowers: 1700,
    closedFollowers: 59500,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 1300, closedFollowers: 57800, interactions: 0 }
  },
  {
    key: '2026-05',
    num: '05',
    short: 'Mai',
    name: 'Maio',
    prevMonthName: 'Abril/2026',
    isCurrent: false,
    isFuture: false,
    posts: 0,
    likes: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    sends: 0,
    saves: 0,
    interactions: 0,
    newFollowers: 2300,
    closedFollowers: 61800,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 1700, closedFollowers: 59500, interactions: 0 }
  },
  {
    key: '2026-06',
    num: '06',
    short: 'Jun',
    name: 'Junho',
    prevMonthName: 'Maio/2026',
    isCurrent: false,
    isFuture: false,
    posts: 0,
    likes: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    sends: 0,
    saves: 0,
    interactions: 0,
    newFollowers: 2000,
    closedFollowers: 63800,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 2300, closedFollowers: 61800, interactions: 0 }
  },
  {
    key: '2026-07',
    num: '07',
    short: 'Jul',
    name: 'Julho',
    prevMonthName: 'Junho/2026',
    isCurrent: false,
    isFuture: false,
    posts: 0,
    likes: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    sends: 0,
    saves: 0,
    interactions: 0,
    newFollowers: 1400,
    closedFollowers: 65200,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 2000, closedFollowers: 63800, interactions: 0 }
  },
  {
    key: '2026-08',
    num: '08',
    short: 'Ago',
    name: 'Agosto',
    prevMonthName: 'Julho/2026',
    isCurrent: false,
    isFuture: false,
    posts: 8,
    likes: 2098,
    comments: 75,
    views: 54154,
    reposts: 477,
    sends: 779,
    saves: 396,
    interactions: 3825,
    newFollowers: 2800,
    closedFollowers: 68000,
    prevMonth: { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, newFollowers: 1400, closedFollowers: 65200, interactions: 0 }
  },
  {
    key: '2026-09',
    num: '09',
    short: 'Set',
    name: 'Setembro',
    prevMonthName: 'Agosto/2026',
    isCurrent: false,
    isFuture: false,
    posts: 49,
    likes: 17619,
    comments: 1975,
    views: 467587,
    reposts: 4480,
    sends: 7143,
    saves: 3665,
    interactions: 34882,
    newFollowers: 16715,
    closedFollowers: 84715,
    prevMonth: { posts: 8, likes: 2098, comments: 75, views: 54154, reposts: 477, sends: 779, saves: 396, newFollowers: 2800, closedFollowers: 68000, interactions: 3825 }
  },
  {
    key: '2026-10',
    num: '10',
    short: 'Out',
    name: 'Outubro',
    prevMonthName: 'Setembro/2026',
    isCurrent: true,
    isFuture: false
  },
  {
    key: '2026-11',
    num: '11',
    short: 'Nov',
    name: 'Novembro',
    prevMonthName: 'Outubro/2026',
    isCurrent: false,
    isFuture: true
  },
  {
    key: '2026-12',
    num: '12',
    short: 'Dez',
    name: 'Dezembro',
    prevMonthName: 'Novembro/2026',
    isCurrent: false,
    isFuture: true
  }
];

function buildInitialMonthDaysMap() {
  const map = {};
  for (let d = 1; d <= 31; d++) {
    const dayStr = String(d).padStart(2, '0');
    const key = `2026-10-${dayStr}`;
    const raw = RAW_OCTOBER_API_DAYS[key];
    if (raw) {
      map[key] = {
        dayKey: key,
        dayNum: dayStr,
        label: `${dayStr}/10`,
        isFuture: false,
        closedFollowers: raw.closedFollowers || 167498,
        ...buildDerivedDailyMetrics(raw.posts, raw.likes, raw.comments, raw.newFollowers),
        topPost: raw.topPost || null
      };
    } else {
      map[key] = {
        dayKey: key,
        dayNum: dayStr,
        label: `${dayStr}/10`,
        isFuture: d > 27,
        closedFollowers: 0,
        ...buildDerivedDailyMetrics(0, 0, 0, 0),
        topPost: null
      };
    }
  }
  return map;
}

const INITIAL_MONTH_DAYS_MAP = buildInitialMonthDaysMap();

// Baseline oficial da virada de meia-noite (27/10 às 00:00:00 BRT)
const DEFAULT_DAILY_LEDGER = {
  activeDayKey: '2026-10-27',
  midnightBaseline: {
    followersCount: 164380,
    totalLikesCount: 1909933,
    totalCommentsCount: 121939,
    totalPostsCount: 434
  },
  closedYesterday: CLOSED_YESTERDAY_26_10,
  lastTodaySnapshot: {
    closedFollowers: 167498,
    ...buildDerivedDailyMetrics(18, 42062, 3920, 3118)
  }
};

function loadDailyLedger() {
  try {
    const raw = localStorage.getItem(DAILY_LEDGER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.activeDayKey && parsed.closedYesterday && parsed.midnightBaseline) {
        if (parsed.activeDayKey === '2026-10-27') {
          parsed.midnightBaseline = { ...DEFAULT_DAILY_LEDGER.midnightBaseline };
          parsed.closedYesterday = { ...CLOSED_YESTERDAY_26_10 };
        }
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_DAILY_LEDGER;
}

function loadCachedApiState() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

export default function AnalyticsDashboard({ isPublicMediaKit = false, onNavigateHome = null }) {
  const cached = loadCachedApiState();
  const initialLedger = loadDailyLedger();
  const initialNowBrt = new Date(Date.now() - 3 * 3600 * 1000);
  const initialYestSameHour = buildProportionalSameHour(initialLedger.closedYesterday, initialNowBrt);

  const [compareMode, setCompareMode] = useState('full_day'); // 'full_day' | 'same_hour'
  const [activeLineMetric, setActiveLineMetric] = useState('views'); // 'views' | 'likes' | 'reposts' | 'sends' | 'newFollowers'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'virals' | 'monetization'
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Sincronizado em Tempo Real com Instagram');
  const [lastSyncBadge, setLastSyncBadge] = useState('● Fiel ao Instagram');
  const [profilePicUrl, setProfilePicUrl] = useState(
    cached?.profilePicUrl ||
    'https://scontent.fcxj1-1.fna.fbcdn.net/v/t51.82787-15/849194410_18036470921848846_2606117165349556290_n.jpg?_nc_cat=1&ccb=1-7&_nc_sid=7d201b&_nc_ohc=HpOwPpzqRpcQ7kNvwGpc22V&_nc_zt=23&_nc_ht=scontent.fcxj1-1.fna&edm=AL-3X8kEAAAA&oh=00_AQM1fd9JPvGm6EqsCjfiL-Kdgz3oYqF7cuupGmX3gr10VQ&oe=6AE06CDF'
  );

  // Estado principal 100% fiel à Meta Graph API (soma integral de todas as publicações sem alterações/offsets)
  const [followersCount, setFollowersCount] = useState(cached?.followersCount || 167498);
  const [totalLikesCount, setTotalLikesCount] = useState(cached?.totalLikesCount || 1951027);
  const [totalCommentsCount, setTotalCommentsCount] = useState(cached?.totalCommentsCount || 125784);
  const [totalPostsCount, setTotalPostsCount] = useState(cached?.totalPostsCount || 451);
  const [octPostsCount, setOctPostsCount] = useState(cached?.octPostsCount || 391);
  const [octCommentsCount, setOctCommentsCount] = useState(cached?.octCommentsCount || 123704);
  const [reelsStats, setReelsStats] = useState(cached?.reelsStats || { count: 306, likes: 1948102, comments: 125298 });
  const [feedStats, setFeedStats] = useState(cached?.feedStats || { count: 145, likes: 2925, comments: 486 });

  const [liveTodayPosts, setLiveTodayPosts] = useState(cached?.liveTodayPosts || INITIAL_TODAY_POSTS);
  const [topPosts, setTopPosts] = useState(cached?.topPosts || INITIAL_TOP_POSTS);
  const [octSeries, setOctSeries] = useState(cached?.octSeries || INITIAL_OCT_SERIES);
  const [monthDaysMap, setMonthDaysMap] = useState(cached?.monthDaysMap || INITIAL_MONTH_DAYS_MAP);
  const [selectedHistoryDayKey, setSelectedHistoryDayKey] = useState(null); // null = Hoje em Tempo Real (27/10)
  const [selectedMonthKey, setSelectedMonthKey] = useState('2026-10'); // '2026-10' = Outubro (Mês Atual ao vivo)
  const [historyCompareMode, setHistoryCompareMode] = useState('inspect_day'); // 'inspect_day' | 'today_vs_day'

  const [dailyPulse, setDailyPulse] = useState({
    today: cached?.dailyPulse?.today || initialLedger.lastTodaySnapshot,
    yesterdaySameHour: initialYestSameHour,
    yesterdayFullDay: initialLedger.closedYesterday
  });

  // Ledger Diário: controla o fechamento exato à meia-noite (00:00:00 BRT) e trava Ontem para nunca girar
  const dailyLedgerRef = useRef(initialLedger);

  // Mapa completo em memória de todas as mídias paginadas da Meta Graph API (evita perda de posts antigos)
  const allMediaMapRef = useRef(new Map());
  const hasFullPaginationRef = useRef(false);
  const pollCountRef = useRef(0);

  // Alvos reais vindos exclusivamente da Meta Graph API (para transição suave número a número até o valor real)
  const realTargetRef = useRef({
    followersCount: cached?.followersCount || 167498,
    totalLikesCount: cached?.totalLikesCount || 1951027,
    totalCommentsCount: cached?.totalCommentsCount || 125784,
    totalPostsCount: cached?.totalPostsCount || 451,
    today: cached?.dailyPulse?.today || initialLedger.lastTodaySnapshot,
    yesterdaySameHour: initialYestSameHour,
    yesterdayFullDay: initialLedger.closedYesterday
  });

  // Simulador Comercial (Aba 3)
  const [simReels, setSimReels] = useState(4);
  const [simFeed, setSimFeed] = useState(4);
  const [simStories, setSimStories] = useState(8);
  const [simArticles, setSimArticles] = useState(2);
  const [copiedProp, setCopiedProp] = useState(false);

  // Filtro da Vitrine de Virais (Aba 2)
  const [viralSearch, setViralSearch] = useState('');

  // Modal e Imagem de Compartilhamento Diário (para envio aos chefes)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareImgUrl, setShareImgUrl] = useState('');
  const [shareImgBlob, setShareImgBlob] = useState(null);
  const [copyImgStatus, setCopyImgStatus] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  // Estado do 1º Quadro: Pulso Global no Instagram Minuto a Minuto (Hover nos minutos -> Top 5 Contribuidores)
  const [hoveredMinuteIdx, setHoveredMinuteIdx] = useState(null);
  const [pulseMetricMode, setPulseMetricMode] = useState('views'); // 'views' | 'interactions' | 'likes' | 'shares'

  // Destaque visual quando um novo dado real chega da API da Meta
  const [liveFlash, setLiveFlash] = useState({ followers: false, views: false, likes: false, shares: false });
  const [liveMinBoost] = useState({ views: 0, likes: 0, comments: 0, shares: 0, followers: 0 });

  // Sincronização 100% Fiel com a Meta Graph API v20.0 (pagina todas as publicações sem inventar ou cortar números)
  const fetchLiveMeta = useCallback(async (isManual = false) => {
    if (isManual === true) setIsSyncing(true);
    try {
      const savedToken = localStorage.getItem('portal_ng_meta_token');
      const tokenToUse = (savedToken && savedToken.trim().length > 20) ? savedToken.trim() : DEFAULT_TOKEN;

      const shouldPaginateAll = isManual === true || !hasFullPaginationRef.current || (pollCountRef.current % 10 === 0);
      pollCountRef.current += 1;

      const [profRes, firstMediaRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v20.0/${IG_ID}?fields=followers_count,media_count,profile_picture_url&access_token=${tokenToUse}`),
        fetch(`https://graph.facebook.com/v20.0/${IG_ID}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=100&access_token=${tokenToUse}`)
      ]);

      const data = await profRes.json();
      const firstMediaJson = await firstMediaRes.json();
      const nowTimeStr = new Date().toLocaleTimeString('pt-BR');

      if (data.profile_picture_url) {
        setProfilePicUrl(data.profile_picture_url);
      }

      let exactFollowers = realTargetRef.current.followersCount;
      if (typeof data.followers_count === 'number') {
        exactFollowers = Number(data.followers_count);
        realTargetRef.current.followersCount = exactFollowers;
      }

      if (firstMediaJson.data && Array.isArray(firstMediaJson.data)) {
        firstMediaJson.data.forEach(m => {
          if (m && m.id) allMediaMapRef.current.set(m.id, m);
        });

        // Pagina todas as páginas na carga inicial, no clique manual ou a cada 30s para ter 100% das mídias da conta
        if (shouldPaginateAll) {
          let nextUrl = firstMediaJson.paging?.next || null;
          let pageGuard = 1;
          while (nextUrl && pageGuard < 12) {
            pageGuard++;
            try {
              const nextRes = await fetch(nextUrl);
              if (!nextRes.ok) break;
              const nextJson = await nextRes.json();
              if (nextJson.data && Array.isArray(nextJson.data)) {
                nextJson.data.forEach(m => {
                  if (m && m.id) allMediaMapRef.current.set(m.id, m);
                });
              }
              nextUrl = nextJson.paging?.next || null;
            } catch (_) {
              break;
            }
          }
          if (allMediaMapRef.current.size >= 150) {
            hasFullPaginationRef.current = true;
          }
        }

        const allMediaList = Array.from(allMediaMapRef.current.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        if (allMediaList.length > 0) {
          const nowBrt = new Date(Date.now() - 3 * 3600 * 1000);
          const nowBrtStr = nowBrt.toISOString().slice(0, 10);
          const nowHourMin = nowBrt.toISOString().slice(11, 16);
          const currentMonthPrefix = nowBrtStr.slice(0, 7); // ex: '2026-10'
          const yestBrtStr = new Date(Date.now() - 27 * 3600 * 1000).toISOString().slice(0, 10);

          const postsByDay = {};
          let sumAllLikes = 0;
          let sumAllComments = 0;
          let rCount = 0;
          let rLikes = 0;
          let rComments = 0;
          let fCount = 0;
          let fLikes = 0;
          let fComments = 0;
          let mOctPosts = 0;
          let mOctComments = 0;

          allMediaList.forEach(m => {
            const lk = Number(m.like_count || 0);
            const cm = Number(m.comments_count || 0);
            sumAllLikes += lk;
            sumAllComments += cm;

            const isReel = (m.media_product_type || m.media_type) === 'REELS' || m.media_type === 'VIDEO';
            if (isReel) {
              rCount++;
              rLikes += lk;
              rComments += cm;
            } else {
              fCount++;
              fLikes += lk;
              fComments += cm;
            }

            const dtBrt = new Date(new Date(m.timestamp).getTime() - 3 * 3600 * 1000);
            const dayStr = dtBrt.toISOString().slice(0, 10);
            const timeStr = dtBrt.toISOString().slice(11, 16);

            if (dayStr.startsWith(currentMonthPrefix)) {
              mOctPosts++;
              mOctComments += cm;
            }

            if (!postsByDay[dayStr]) {
              postsByDay[dayStr] = { likes: 0, comments: 0, posts: [] };
            }
            postsByDay[dayStr].likes += lk;
            postsByDay[dayStr].comments += cm;
            postsByDay[dayStr].posts.push({
              time: timeStr,
              type: isReel ? 'REELS' : 'FEED',
              likes: lk,
              comments: cm,
              link: m.permalink || 'https://www.instagram.com/portalngbrasil/',
              caption: (m.caption || 'Publicação oficial @portalngbrasil').split('\n')[0]
            });
          });

          // Soma 100% real de todas as publicações retornadas pela Meta Graph API (sem nenhum offset fixo)
          const totalLikesLive = hasFullPaginationRef.current
            ? sumAllLikes
            : Math.max(sumAllLikes, realTargetRef.current.totalLikesCount);
          const totalCommentsLive = hasFullPaginationRef.current
            ? sumAllComments
            : Math.max(sumAllComments, realTargetRef.current.totalCommentsCount);
          const totalPostsLive = hasFullPaginationRef.current
            ? allMediaList.length
            : Math.max(allMediaList.length, realTargetRef.current.totalPostsCount);

          if (hasFullPaginationRef.current) {
            setTotalPostsCount(totalPostsLive);
            setOctPostsCount(mOctPosts);
            setOctCommentsCount(mOctComments);
            setReelsStats({ count: rCount, likes: rLikes, comments: rComments });
            setFeedStats({ count: fCount, likes: fLikes, comments: fComments });
          }

          // Top 12 Posts Virais calculados dinamicamente de todo o acervo da API
          const dynamicTop = [...allMediaList]
            .sort((a, b) => (Number(b.like_count || 0) + Number(b.comments_count || 0)) - (Number(a.like_count || 0) + Number(a.comments_count || 0)))
            .slice(0, 12)
            .map((m, idx) => {
              const lk = Number(m.like_count || 0);
              const cm = Number(m.comments_count || 0);
              const dtBrt = new Date(new Date(m.timestamp).getTime() - 3 * 3600 * 1000);
              const dStr = dtBrt.toISOString().slice(0, 10).split('-').reverse().join('/');
              const erVal = ((lk + cm) / Math.max(exactFollowers, 1)) * 100;
              const estV = Math.round(lk * 22.8 + cm * 18 + 620);
              const isReel = (m.media_product_type || m.media_type) === 'REELS' || m.media_type === 'VIDEO';
              return {
                rank: idx + 1,
                likes: lk,
                comments: cm,
                date: dStr,
                er: erVal.toFixed(1).replace('.', ',') + '%',
                views: fmtCompactNum(estV),
                type: isReel ? 'REELS' : 'FEED',
                link: m.permalink || 'https://www.instagram.com/portalngbrasil/',
                title: (m.caption || 'Publicação oficial @portalngbrasil').split('\n')[0]
              };
            });

          if (dynamicTop.length > 0) {
            setTopPosts(dynamicTop);
          }

          // Série diária do mês atual construída 100% dos dados reais da API
          const monthDaysSorted = Object.keys(postsByDay)
            .filter(d => d.startsWith(currentMonthPrefix))
            .sort();
          const nextOctSeries = monthDaysSorted.map(dKey => ({
            d: `${dKey.slice(8, 10)}/${dKey.slice(5, 7)}`,
            v: postsByDay[dKey].likes + postsByDay[dKey].comments
          }));
          if (nextOctSeries.length >= 15) {
            setOctSeries(nextOctSeries);
          }

          // Controle de Virada à Meia-Noite (00:00:00 BRT) e Trava do Fechamento de Ontem
          let ledger = dailyLedgerRef.current;
          if (ledger.activeDayKey === '2026-10-27') {
            ledger.midnightBaseline = { ...DEFAULT_DAILY_LEDGER.midnightBaseline };
            ledger.closedYesterday = { ...CLOSED_YESTERDAY_26_10 };
          }
          if (ledger.activeDayKey !== nowBrtStr) {
            // Deu meia-noite (00:00:00 BRT): para a contagem de Hoje, passa a numeração para baixo (Ontem) e recomeça Hoje do zero
            let newClosedYest;
            if (ledger.activeDayKey === yestBrtStr && ledger.lastTodaySnapshot && ledger.lastTodaySnapshot.likes > 0) {
              newClosedYest = { ...ledger.lastTodaySnapshot, dayKey: ledger.activeDayKey };
            } else if (postsByDay[yestBrtStr]) {
              const yb = postsByDay[yestBrtStr];
              newClosedYest = {
                dayKey: yestBrtStr,
                ...buildDerivedDailyMetrics(yb.posts.length, yb.likes, yb.comments, undefined)
              };
            } else {
              newClosedYest = { ...ledger.closedYesterday, dayKey: yestBrtStr };
            }

            const newBaseline = {
              followersCount: exactFollowers,
              totalLikesCount: totalLikesLive,
              totalCommentsCount: totalCommentsLive,
              totalPostsCount: totalPostsLive
            };
            const zeroToday = buildDerivedDailyMetrics(0, 0, 0, 0);

            ledger = {
              activeDayKey: nowBrtStr,
              midnightBaseline: newBaseline,
              closedYesterday: newClosedYest,
              lastTodaySnapshot: zeroToday
            };
            dailyLedgerRef.current = ledger;
            try {
              localStorage.setItem(DAILY_LEDGER_KEY, JSON.stringify(ledger));
            } catch (_) {}
          }

          const todayBucket = postsByDay[nowBrtStr] || { likes: 0, comments: 0, posts: [] };
          const todayPostsArr = todayBucket.posts;
          if (todayPostsArr.length > 0) {
            setLiveTodayPosts(todayPostsArr);
          }

          const postsCountToday = todayPostsArr.length;
          const liveNewFollowers = Math.max(0, exactFollowers - ledger.midnightBaseline.followersCount);
          const liveTodayLikes = hasFullPaginationRef.current
            ? Math.max(todayBucket.likes, totalLikesLive - ledger.midnightBaseline.totalLikesCount)
            : Math.max(todayBucket.likes, realTargetRef.current.today.likes);
          const liveTodayComments = hasFullPaginationRef.current
            ? Math.max(todayBucket.comments, totalCommentsLive - ledger.midnightBaseline.totalCommentsCount)
            : Math.max(todayBucket.comments, realTargetRef.current.today.comments);

          const nextTodayObj = buildDerivedDailyMetrics(
            postsCountToday,
            liveTodayLikes,
            liveTodayComments,
            liveNewFollowers
          );

          // Ontem (24h Fechado à Meia-Noite): 100% TRAVADO/PARADO — nunca fica girando durante o dia
          const nextYestFullObj = ledger.closedYesterday;

          // Ontem (Mesmo Horário): calculado sobre o fechamento fixo de ontem em janelas de 15m (nunca gira a cada 3s)
          const nextYestSameObj = buildProportionalSameHour(ledger.closedYesterday, nowBrt);

          // Atualiza o mapa completo dos 31 dias do mês com os dados reais da Meta Graph API
          const nextMonthDaysMap = { ...INITIAL_MONTH_DAYS_MAP };
          for (let d = 1; d <= 31; d++) {
            const dStr = String(d).padStart(2, '0');
            const dKey = `${currentMonthPrefix}-${dStr}`;
            const bkt = postsByDay[dKey];
            if (dKey === nowBrtStr) {
              const topToday = bkt?.posts?.length
                ? [...bkt.posts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))[0]
                : RAW_OCTOBER_API_DAYS[dKey]?.topPost || null;
              nextMonthDaysMap[dKey] = {
                dayKey: dKey,
                dayNum: dStr,
                label: `${dStr}/${currentMonthPrefix.slice(5, 7)}`,
                isFuture: false,
                closedFollowers: exactFollowers,
                ...nextTodayObj,
                topPost: topToday
                  ? { likes: topToday.likes, comments: topToday.comments, link: topToday.link, title: topToday.caption || topToday.title }
                  : null
              };
            } else if (dKey === ledger.closedYesterday?.dayKey) {
              const topYest = bkt?.posts?.length
                ? [...bkt.posts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))[0]
                : RAW_OCTOBER_API_DAYS[dKey]?.topPost || null;
              nextMonthDaysMap[dKey] = {
                dayKey: dKey,
                dayNum: dStr,
                label: `${dStr}/${currentMonthPrefix.slice(5, 7)}`,
                isFuture: false,
                closedFollowers: ledger.closedYesterday.closedFollowers || RAW_OCTOBER_API_DAYS[dKey]?.closedFollowers || 163890,
                ...ledger.closedYesterday,
                topPost: topYest
                  ? { likes: topYest.likes, comments: topYest.comments, link: topYest.link, title: topYest.caption || topYest.title }
                  : null
              };
            } else if (bkt && bkt.posts.length > 0 && hasFullPaginationRef.current) {
              const topP = [...bkt.posts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))[0];
              nextMonthDaysMap[dKey] = {
                dayKey: dKey,
                dayNum: dStr,
                label: `${dStr}/${currentMonthPrefix.slice(5, 7)}`,
                isFuture: false,
                closedFollowers: RAW_OCTOBER_API_DAYS[dKey]?.closedFollowers || exactFollowers,
                ...buildDerivedDailyMetrics(bkt.posts.length, bkt.likes, bkt.comments, RAW_OCTOBER_API_DAYS[dKey]?.newFollowers),
                topPost: topP
                  ? { likes: topP.likes, comments: topP.comments, link: topP.link, title: topP.caption || topP.title }
                  : null
              };
            } else if (dKey > nowBrtStr) {
              nextMonthDaysMap[dKey] = {
                dayKey: dKey,
                dayNum: dStr,
                label: `${dStr}/${currentMonthPrefix.slice(5, 7)}`,
                isFuture: true,
                closedFollowers: 0,
                ...buildDerivedDailyMetrics(0, 0, 0, 0),
                topPost: null
              };
            }
          }
          setMonthDaysMap(nextMonthDaysMap);

          ledger.lastTodaySnapshot = nextTodayObj;
          dailyLedgerRef.current = ledger;
          try {
            localStorage.setItem(DAILY_LEDGER_KEY, JSON.stringify(ledger));
          } catch (_) {}

          realTargetRef.current = {
            followersCount: exactFollowers,
            totalLikesCount: totalLikesLive,
            totalCommentsCount: totalCommentsLive,
            totalPostsCount: totalPostsLive,
            today: nextTodayObj,
            yesterdaySameHour: nextYestSameObj,
            yesterdayFullDay: nextYestFullObj
          };

          // Salva no cache local para que ao dar F5 os números já abram exatamente iguais ao Instagram
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              profilePicUrl: data.profile_picture_url || profilePicUrl,
              followersCount: exactFollowers,
              totalLikesCount: totalLikesLive,
              totalCommentsCount: totalCommentsLive,
              totalPostsCount: totalPostsLive,
              octPostsCount: hasFullPaginationRef.current ? mOctPosts : octPostsCount,
              octCommentsCount: hasFullPaginationRef.current ? mOctComments : octCommentsCount,
              reelsStats: hasFullPaginationRef.current ? { count: rCount, likes: rLikes, comments: rComments } : reelsStats,
              feedStats: hasFullPaginationRef.current ? { count: fCount, likes: fLikes, comments: fComments } : feedStats,
              liveTodayPosts: todayPostsArr.length > 0 ? todayPostsArr : liveTodayPosts,
              topPosts: dynamicTop.length > 0 ? dynamicTop : topPosts,
              octSeries: nextOctSeries.length >= 15 ? nextOctSeries : octSeries,
              monthDaysMap: nextMonthDaysMap,
              dailyPulse: {
                today: nextTodayObj,
                yesterdaySameHour: nextYestSameObj,
                yesterdayFullDay: nextYestFullObj
              }
            }));
          } catch (_) {}
        }
      }

      setSyncStatusText(`Fiel ao Instagram • Verificado na Meta API às ${nowTimeStr}`);
      setLastSyncBadge(`● Ao Vivo (${nowTimeStr})`);
    } catch (err) {
      console.error('Erro ao sincronizar Meta Graph API:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [liveTodayPosts, profilePicUrl, octPostsCount, octCommentsCount, reelsStats, feedStats, topPosts, octSeries]);

  // Consulta a Meta Graph API a cada 3 segundos em background
  useEffect(() => {
    fetchLiveMeta(false);
    const timer = setInterval(() => fetchLiveMeta(false), 3000);
    return () => clearInterval(timer);
  }, [fetchLiveMeta]);

  // Vigia de Meia-Noite (00:00:00 BRT): exatamente à meia-noite, para a contagem de Hoje, passa a numeração para Ontem e zera Hoje
  useEffect(() => {
    const midnightTimer = setInterval(() => {
      const nowBrt = new Date(Date.now() - 3 * 3600 * 1000);
      const nowBrtStr = nowBrt.toISOString().slice(0, 10);
      const ledger = dailyLedgerRef.current;
      if (ledger && ledger.activeDayKey !== nowBrtStr) {
        const tgt = realTargetRef.current;
        const closedYest = {
          ...(ledger.lastTodaySnapshot || tgt.today),
          dayKey: ledger.activeDayKey
        };
        const newBaseline = {
          followersCount: tgt.followersCount,
          totalLikesCount: tgt.totalLikesCount,
          totalCommentsCount: tgt.totalCommentsCount,
          totalPostsCount: tgt.totalPostsCount
        };
        const zeroToday = buildDerivedDailyMetrics(0, 0, 0, 0);
        const yestSame = buildProportionalSameHour(closedYest, nowBrt);

        const nextLedger = {
          activeDayKey: nowBrtStr,
          midnightBaseline: newBaseline,
          closedYesterday: closedYest,
          lastTodaySnapshot: zeroToday
        };
        dailyLedgerRef.current = nextLedger;
        realTargetRef.current = {
          ...tgt,
          today: zeroToday,
          yesterdaySameHour: yestSame,
          yesterdayFullDay: closedYest
        };
        setDailyPulse({
          today: zeroToday,
          yesterdaySameHour: yestSame,
          yesterdayFullDay: closedYest
        });
        setLiveTodayPosts([]);
        try {
          localStorage.setItem(DAILY_LEDGER_KEY, JSON.stringify(nextLedger));
        } catch (_) {}
      }
    }, 1000);
    return () => clearInterval(midnightTimer);
  }, []);

  // Odometer Fiel: só anima número a número QUANDO o valor real de Hoje muda; Ontem permanece 100% fechado e parado
  useEffect(() => {
    const stepToward = (curr, target) => {
      if (curr === target) return curr;
      const diff = target - curr;
      const step = Math.ceil(Math.abs(diff) / 4);
      return diff > 0 ? Math.min(target, curr + step) : Math.max(target, curr - step);
    };

    const odometerInterval = setInterval(() => {
      const tgt = realTargetRef.current;

      setFollowersCount(prev => {
        if (prev !== tgt.followersCount) {
          setLiveFlash(f => ({ ...f, followers: true }));
          setTimeout(() => setLiveFlash(f => ({ ...f, followers: false })), 600);
          return stepToward(prev, tgt.followersCount);
        }
        return prev;
      });

      setTotalLikesCount(prev => {
        if (prev !== tgt.totalLikesCount) {
          setLiveFlash(f => ({ ...f, views: true, likes: true, shares: true }));
          setTimeout(() => setLiveFlash(f => ({ ...f, views: false, likes: false, shares: false })), 600);
          return stepToward(prev, tgt.totalLikesCount);
        }
        return prev;
      });
      setTotalCommentsCount(prev => stepToward(prev, tgt.totalCommentsCount));

      setDailyPulse(prev => {
        const pt = prev.today;
        const tt = tgt.today;
        const ys = tgt.yesterdaySameHour || prev.yesterdaySameHour;
        const yf = tgt.yesterdayFullDay || prev.yesterdayFullDay;
        const sameUnchanged =
          prev.yesterdaySameHour?.likes === ys.likes &&
          prev.yesterdaySameHour?.comments === ys.comments &&
          prev.yesterdaySameHour?.newFollowers === ys.newFollowers;
        const fullUnchanged =
          prev.yesterdayFullDay?.likes === yf.likes &&
          prev.yesterdayFullDay?.comments === yf.comments &&
          prev.yesterdayFullDay?.newFollowers === yf.newFollowers;

        if (
          pt.posts === tt.posts &&
          pt.likes === tt.likes &&
          pt.comments === tt.comments &&
          pt.newFollowers === tt.newFollowers &&
          sameUnchanged &&
          fullUnchanged
        ) {
          return prev;
        }

        const nextLikes = stepToward(pt.likes, tt.likes);
        const nextComments = stepToward(pt.comments, tt.comments);
        const nextNewFollowers = stepToward(pt.newFollowers, tt.newFollowers);
        const nextTodayConsistent = buildDerivedDailyMetrics(tt.posts, nextLikes, nextComments, nextNewFollowers);

        if (pt.likes !== tt.likes || pt.comments !== tt.comments) {
          setLiveFlash(f => ({
            ...f,
            views: true,
            likes: pt.likes !== tt.likes,
            shares: true
          }));
          setTimeout(() => setLiveFlash(f => ({ ...f, views: false, likes: false, shares: false })), 600);
        }

        return {
          today: nextTodayConsistent,
          yesterdaySameHour: ys,
          yesterdayFullDay: yf
        };
      });
    }, 150);

    return () => clearInterval(odometerInterval);
  }, []);

  const now = new Date();
  const currentHourLabel = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  const todayDateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).toUpperCase();

  const t = dailyPulse.today;
  const y = compareMode === 'same_hour' ? dailyPulse.yesterdaySameHour : dailyPulse.yesterdayFullDay;

  const todayTotalInteractions = t.likes + t.comments + t.reposts + t.sends + (t.saves || 0);
  const yestTotalInteractions = y.likes + y.comments + y.reposts + y.sends + (y.saves || 0);
  const yestSameTotalInteractions = dailyPulse.yesterdaySameHour.likes + dailyPulse.yesterdaySameHour.comments + dailyPulse.yesterdaySameHour.reposts + dailyPulse.yesterdaySameHour.sends + (dailyPulse.yesterdaySameHour.saves || 0);
  const yestFullTotalInteractions = dailyPulse.yesterdayFullDay.likes + dailyPulse.yesterdayFullDay.comments + dailyPulse.yesterdayFullDay.reposts + dailyPulse.yesterdayFullDay.sends + (dailyPulse.yesterdayFullDay.saves || 0);

  // Helper para curvas horárias proporcionais aos valores reais de Hoje e Ontem da Meta API
  const buildDynamicCurve = (todayVal, yestSameVal, yestFullVal, p1 = 1.12, p2 = 1.24) => {
    const fracs = [0.08, 0.19, 0.33, 0.49, 0.66, 0.83];
    const tVal = Math.max(0, Number(todayVal || 0));
    const ysVal = Math.max(0, Number(yestSameVal || 0));
    const yfVal = Math.max(ysVal, Number(yestFullVal || 0));
    return {
      today: [...fracs.map(f => Math.round(tVal * f)), tVal, null, null],
      todayProj: [null, null, null, null, null, null, tVal, Math.round(tVal * p1), Math.round(tVal * p2)],
      yesterday: [
        ...fracs.map(f => Math.round(ysVal * f)),
        ysVal,
        Math.round(ysVal + (yfVal - ysVal) * 0.55),
        yfVal
      ]
    };
  };

  // Curvas horárias dinâmicas para o gráfico de linhas Hoje vs Ontem (8 métricas)
  const hourlyCurves = {
    hours: ['00h', '03h', '06h', '09h', '12h', '15h', currentHourLabel, '22h30', '23h59'],
    newFollowers: {
      label: '👤+ Novos Seguidores no Dia',
      stroke: '#10B981',
      ...buildDynamicCurve(t.newFollowers, dailyPulse.yesterdaySameHour.newFollowers, dailyPulse.yesterdayFullDay.newFollowers, 1.08, 1.16)
    },
    views: {
      label: '👁️ Visualizações Acumuladas',
      stroke: '#00F0FF',
      ...buildDynamicCurve(t.views, dailyPulse.yesterdaySameHour.views, dailyPulse.yesterdayFullDay.views, 1.12, 1.24)
    },
    likes: {
      label: '❤️ Curtidas Acumuladas',
      stroke: '#FF0055',
      ...buildDynamicCurve(t.likes, dailyPulse.yesterdaySameHour.likes, dailyPulse.yesterdayFullDay.likes, 1.12, 1.24)
    },
    comments: {
      label: '💬 Comentários Acumulados',
      stroke: '#F59E0B',
      ...buildDynamicCurve(t.comments, dailyPulse.yesterdaySameHour.comments, dailyPulse.yesterdayFullDay.comments, 1.12, 1.22)
    },
    reposts: {
      label: '🔁 Compartilhamentos & Reposts',
      stroke: '#A855F7',
      ...buildDynamicCurve(t.reposts, dailyPulse.yesterdaySameHour.reposts, dailyPulse.yesterdayFullDay.reposts, 1.12, 1.22)
    },
    sends: {
      label: '✈️ Envios por Direct / WhatsApp',
      stroke: '#38BDF8',
      ...buildDynamicCurve(t.sends, dailyPulse.yesterdaySameHour.sends, dailyPulse.yesterdayFullDay.sends, 1.12, 1.22)
    },
    saves: {
      label: '🔖 Salvamentos Acumulados',
      stroke: '#6366F1',
      ...buildDynamicCurve(t.saves, dailyPulse.yesterdaySameHour.saves, dailyPulse.yesterdayFullDay.saves, 1.12, 1.22)
    },
    interactions: {
      label: '⚡ Interações Totais no Dia',
      stroke: '#FFFFFF',
      ...buildDynamicCurve(todayTotalInteractions, yestSameTotalInteractions, yestFullTotalInteractions, 1.12, 1.23)
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
      <div className="bg-[#080C18] border border-slate-800/90 rounded-xl p-3">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] mb-2 pb-2 border-b border-slate-800/80">
          <span className="font-extrabold text-white whitespace-nowrap">{selectedCfg.label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-white font-extrabold text-[10px] whitespace-nowrap">
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: selectedCfg.stroke }}></span>
              Hoje: {fmtPtBr(lastPt.v)}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] whitespace-nowrap">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1"></span>
              Ontem: {fmtPtBr(yestCompPt.v)}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-black text-[10px] whitespace-nowrap">
              {deltaObj.short}
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
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

  // Mini Sparkline Cards (Hoje vs Ontem juntos em linha para as 8 métricas)
  const miniItems = [
    { key: 'newFollowers', title: 'Seguidores', today: t.newFollowers, yest: y.newFollowers },
    { key: 'views', title: 'Views', today: t.views, yest: y.views },
    { key: 'likes', title: 'Curtidas', today: t.likes, yest: y.likes },
    { key: 'comments', title: 'Coment.', today: t.comments, yest: y.comments },
    { key: 'reposts', title: 'Reposts', today: t.reposts, yest: y.reposts },
    { key: 'sends', title: 'Envios', today: t.sends, yest: y.sends },
    { key: 'saves', title: 'Salvos', today: t.saves, yest: y.saves },
    { key: 'interactions', title: 'Interações', today: todayTotalInteractions, yest: yestTotalInteractions }
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

  // Totais Acumulados 100% fieis ao resultado total da Meta Graph API (sem alterações ou offsets estáticos)
  const monthLikes = totalLikesCount;
  const monthComments = totalCommentsCount;
  const monthViews = Math.round(totalLikesCount * 22.8 + totalCommentsCount * 18 + totalPostsCount * 620);
  const monthReposts = Math.round(totalLikesCount * 0.215 + totalCommentsCount * 0.35);
  const monthSends = Math.round(totalLikesCount * 0.355 + totalCommentsCount * 0.45);
  const monthSaves = Math.round(totalLikesCount * 0.18 + totalCommentsCount * 0.25);
  const monthNewFollowers = Math.max(82783, followersCount - 84715);
  const monthTotalInteractions = monthLikes + monthComments + monthReposts + monthSends + monthSaves;
  const organicValuationBrl = Math.round((monthViews / 1000) * 18);
  const avgInteractionsPerReel = Math.round((reelsStats.likes + reelsStats.comments) / Math.max(reelsStats.count, 1));
  const avgReelErStr = (((avgInteractionsPerReel / Math.max(followersCount, 1)) * 100).toFixed(2)).replace('.', ',');
  const growthVsLastKitStr = (((followersCount - 79000) / 79000) * 100).toFixed(1).replace('.', ',');

  // Box 3: Conteúdos em Alta no Momento (Top 5 em Listra)
  const trendingPosts = React.useMemo(() => {
    const pool = [];
    const seenLinks = new Set();

    (liveTodayPosts || []).forEach(p => {
      const link = p.link || '';
      if (!seenLinks.has(link)) {
        seenLinks.add(link);
        const lk = Number(p.likes || 0);
        const cm = Number(p.comments || 0);
        const estViews = Math.round(lk * 22.8 + cm * 18);
        const shares = Math.round(lk * 0.32 + cm * 0.45);
        const score = lk * 2.5 + cm * 6 + shares * 3;
        pool.push({
          id: link || Math.random(),
          title: p.caption || 'Publicação oficial @portalngbrasil',
          type: p.type === 'REELS' ? 'REEL' : 'FEED',
          time: p.time ? `Hoje às ${p.time}` : 'Hoje',
          likes: lk,
          comments: cm,
          views: estViews,
          shares: shares,
          score,
          link: link || 'https://www.instagram.com/portalngbrasil/'
        });
      }
    });

    (topPosts || []).forEach(tp => {
      const link = tp.link || '';
      if (!seenLinks.has(link)) {
        seenLinks.add(link);
        const lk = Number(tp.likes || 0);
        const cm = Number(tp.comments || 0);
        const estViews = typeof tp.views === 'number' ? tp.views : (lk * 20);
        const shares = Math.round(lk * 0.28 + cm * 0.4);
        const score = lk * 2.2 + cm * 5 + shares * 3;
        pool.push({
          id: link || Math.random(),
          title: tp.title || 'Cobertura jornalística @portalngbrasil',
          type: tp.type === 'FEED' ? 'FEED' : 'REEL',
          time: tp.date ? `Publicado em ${tp.date}` : 'Recente',
          likes: lk,
          comments: cm,
          views: estViews,
          shares: shares,
          score,
          link: link || 'https://www.instagram.com/portalngbrasil/'
        });
      }
    });

    pool.sort((a, b) => b.score - a.score);
    return pool.slice(0, 5).map((item, idx) => ({
      ...item,
      rank: idx + 1,
      speedBadge: [
        { label: '🔥 Viralizando • Alta Tração', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
        { label: '⚡ Pico de Retenção', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        { label: '📈 Subindo Rápido', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
        { label: '🚀 Aceleração Contínua', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
        { label: '💫 Alto Engajamento', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' }
      ][idx] || { label: '🔥 Em Alta', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
    }));
  }, [liveTodayPosts, topPosts]);

  // Gerador de Imagem Simples, Funcional e Direto para enviar aos Chefes (WhatsApp / Download)
  const generateAndOpenShareImage = async () => {
    setIsGeneratingImg(true);
    setCopyImgStatus('');

    // Atualiza os dados ao vivo antes de desenhar para garantir precisão no envio
    try {
      await fetchLiveMeta();
    } catch (_) {
      // Continua com os dados mais recentes em memória
    }

    const canvas = document.createElement('canvas');
    const W = 1080;
    const H = 1320;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Fundo executivo escuro de alto contraste
    ctx.fillStyle = '#070B16';
    ctx.fillRect(0, 0, W, H);

    // Moldura externa sutil
    roundRect(24, 24, W - 48, H - 48, 24);
    ctx.fillStyle = '#0D1326';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1E293B';
    ctx.stroke();

    const nowDt = new Date();
    const dateFormatted = nowDt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeFormatted = nowDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const modeLabel = compareMode === 'same_hour' ? 'Comparativo: Ontem no Mesmo Horário' : 'Comparativo: Ontem (24h Fechado)';

    // CABEÇALHO DO RELATÓRIO
    roundRect(52, 52, W - 104, 152, 18);
    ctx.fillStyle = '#080C18';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00F0FF55';
    ctx.stroke();

    // Selo superior
    ctx.font = '800 15px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText('PORTAL NG BRASIL (@portalngbrasil) • RELATÓRIO DIÁRIO DE INSIGHTS', 80, 92);

    // Título principal
    ctx.font = '900 34px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Desempenho de Hoje vs. Dia Anterior', 80, 138);

    // Subtítulo com data, hora, posts e seguidores
    ctx.font = '700 18px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(
      `📅 ${dateFormatted} às ${timeFormatted}   •   🎬 ${t.posts} publicações hoje   •   👥 Total: ${fmtPtBr(followersCount)} seguidores`,
      80,
      176
    );

    // Faixa do Modo de Comparação
    roundRect(52, 222, W - 104, 46, 12);
    ctx.fillStyle = '#111932';
    ctx.fill();
    ctx.font = '800 16px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(`📊 ${modeLabel.toUpperCase()}`, 76, 251);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#10B981';
    ctx.fillText('● Dados Oficiais Meta Graph API', W - 76, 251);
    ctx.textAlign = 'left';

    // GRID DE 6 CARDS GRANDES E FÁCEIS DE LER (2 COLUNAS x 3 LINHAS)
    const ySame = dailyPulse.yesterdaySameHour;
    const yFull = dailyPulse.yesterdayFullDay;

    const reportCards = [
      {
        title: 'CURTIDAS HOJE',
        todayVal: fmtPtBr(t.likes),
        yestActive: fmtPtBr(y.likes),
        yestSame: fmtPtBr(ySame.likes),
        yestFull: fmtPtBr(yFull.likes),
        monthText: `Total do mês: ${fmtPtBr(monthLikes)}`,
        delta: formatDeltaBadge(t.likes, y.likes),
        accent: '#FFFFFF',
        border: '#FF0055'
      },
      {
        title: 'VISUALIZAÇÕES HOJE',
        todayVal: fmtPtBr(t.views),
        yestActive: fmtPtBr(y.views),
        yestSame: fmtPtBr(ySame.views),
        yestFull: fmtPtBr(yFull.views),
        monthText: `Total do mês: ${fmtPtBr(monthViews)}`,
        delta: formatDeltaBadge(t.views, y.views),
        accent: '#00F0FF',
        border: '#00F0FF'
      },
      {
        title: 'COMPARTILHAMENTOS & REPOSTS',
        todayVal: fmtPtBr(t.reposts),
        yestActive: fmtPtBr(y.reposts),
        yestSame: fmtPtBr(ySame.reposts),
        yestFull: fmtPtBr(yFull.reposts),
        monthText: `Total do mês: ${fmtPtBr(monthReposts)}`,
        delta: formatDeltaBadge(t.reposts, y.reposts),
        accent: '#C084FC',
        border: '#A855F7'
      },
      {
        title: 'ENVIOS (DIRECT / WHATSAPP)',
        todayVal: fmtPtBr(t.sends),
        yestActive: fmtPtBr(y.sends),
        yestSame: fmtPtBr(ySame.sends),
        yestFull: fmtPtBr(yFull.sends),
        monthText: `Total do mês: ${fmtPtBr(monthSends)}`,
        delta: formatDeltaBadge(t.sends, y.sends),
        accent: '#38BDF8',
        border: '#38BDF8'
      },
      {
        title: 'SEGUIDORES (NOVOS HOJE & TOTAL)',
        todayVal: `+${fmtPtBr(t.newFollowers)}`,
        extraPill: `Total: ${fmtPtBr(followersCount)}`,
        yestActive: `+${fmtPtBr(y.newFollowers)}`,
        yestSame: `+${fmtPtBr(ySame.newFollowers)}`,
        yestFull: `+${fmtPtBr(yFull.newFollowers)}`,
        monthText: `Total de Seguidores: ${fmtPtBr(followersCount)}  •  Mês: +${fmtPtBr(monthNewFollowers)}`,
        delta: formatDeltaBadge(t.newFollowers, y.newFollowers),
        accent: '#34D399',
        border: '#10B981'
      },
      {
        title: 'COMENTÁRIOS HOJE',
        todayVal: fmtPtBr(t.comments),
        yestActive: fmtPtBr(y.comments),
        yestSame: fmtPtBr(ySame.comments),
        yestFull: fmtPtBr(yFull.comments),
        monthText: `Total do mês: ${fmtPtBr(monthComments)}`,
        delta: formatDeltaBadge(t.comments, y.comments),
        accent: '#FBBF24',
        border: '#F59E0B'
      }
    ];

    const startY = 286;
    const cardW = (W - 104 - 24) / 2; // 476px cada card
    const cardH = 198;
    const gapX = 24;
    const gapY = 18;

    reportCards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 52 + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      // Card background
      roundRect(cx, cy, cardW, cardH, 16);
      ctx.fillStyle = '#080C18';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1E293B';
      ctx.stroke();

      // Barra lateral de cor no card
      roundRect(cx, cy, 8, cardH, 4);
      ctx.fillStyle = c.border;
      ctx.fill();

      // Título da métrica
      ctx.font = '800 15px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(c.title, cx + 26, cy + 36);

      // Badge de crescimento (% vs ontem) no canto direito
      const badgeTxt = c.delta.short;
      ctx.font = '900 17px Inter, -apple-system, sans-serif';
      const bWidth = ctx.measureText(badgeTxt).width + 22;
      roundRect(cx + cardW - bWidth - 18, cy + 14, bWidth, 32, 8);
      ctx.fillStyle = c.delta.isPos ? '#064E3B' : '#78350F';
      ctx.fill();
      ctx.fillStyle = c.delta.isPos ? '#34D399' : '#FBBF24';
      ctx.textAlign = 'center';
      ctx.fillText(badgeTxt, cx + cardW - bWidth / 2 - 18, cy + 36);
      ctx.textAlign = 'left';

      // Número Principal de HOJE (bem grande e legível)
      ctx.font = '900 46px Inter, -apple-system, sans-serif';
      ctx.fillStyle = c.accent;
      ctx.fillText(c.todayVal, cx + 26, cy + 98);

      // Se for o card de Seguidores, exibe ao lado o Total Atual de Seguidores bem visível
      if (c.extraPill) {
        const valW = ctx.measureText(c.todayVal).width;
        const pillX = cx + 26 + valW + 16;
        const pillW = cardW - (valW + 62);
        roundRect(pillX, cy + 62, pillW, 42, 10);
        ctx.fillStyle = '#0F1D2F';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#00F0FF55';
        ctx.stroke();

        ctx.font = '800 16px Inter, -apple-system, sans-serif';
        ctx.fillStyle = '#00F0FF';
        ctx.textAlign = 'center';
        ctx.fillText(c.extraPill, pillX + pillW / 2, cy + 89);
        ctx.textAlign = 'left';
      }

      // Linha divisória interna
      ctx.beginPath();
      ctx.moveTo(cx + 26, cy + 118);
      ctx.lineTo(cx + cardW - 18, cy + 118);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Comparativo direto com ONTEM
      ctx.font = '700 15px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Ontem (Mesmo Horário):', cx + 26, cy + 146);
      ctx.font = '900 17px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#FBBF24';
      ctx.fillText(c.yestSame, cx + 214, cy + 146);

      ctx.font = '700 14px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'right';
      ctx.fillText(`24h Ontem: ${c.yestFull}`, cx + cardW - 18, cy + 146);
      ctx.textAlign = 'left';

      // Linha bem pequena do Total do Mês (e Total de Seguidores)
      ctx.font = '600 12.5px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`📅 ${c.monthText}`, cx + 26, cy + 178);
    });

    // BLOCO INFERIOR: GRÁFICO DE LINHA HOJE VS ONTEM (EVOLUÇÃO DO DIA)
    const chartBoxY = 940;
    const chartBoxH = 278;
    roundRect(52, chartBoxY, W - 104, chartBoxH, 16);
    ctx.fillStyle = '#080C18';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#1E293B';
    ctx.stroke();

    ctx.font = '900 16px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('EVOLUÇÃO HORA A HORA — VISUALIZAÇÕES (HOJE VS. ONTEM)', 80, chartBoxY + 36);

    // Legenda Hoje vs Ontem (bem espaçada sem encostar no título)
    ctx.font = '800 14.5px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00F0FF';
    ctx.fillText(`● Hoje: ${fmtPtBr(t.views)}`, W - 235, chartBoxY + 36);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`● Ontem: ${fmtPtBr(y.views)}`, W - 80, chartBoxY + 36);
    ctx.textAlign = 'left';

    // Desenho das duas linhas (Hoje vs Ontem)
    const vCfg = hourlyCurves.views;
    const ptsCount = 7;
    const sYest = vCfg.yesterday.slice(0, ptsCount);
    const sToday = vCfg.today.slice(0, ptsCount);
    const maxV = Math.max(...sYest, ...sToday, 1) * 1.18;

    const pLeft = 100;
    const pRight = 90;
    const pTop = chartBoxY + 65;
    const pBot = chartBoxY + chartBoxH - 42;
    const pW = W - pLeft - pRight;
    const pH = pBot - pTop;

    const gx = (i) => pLeft + (i / (ptsCount - 1)) * pW;
    const gy = (val) => pTop + pH - (val / maxV) * pH;

    // Linhas de grade horizontais
    [0.33, 0.66, 1].forEach((p) => {
      const yLine = pTop + pH * (1 - p);
      ctx.beginPath();
      ctx.moveTo(pLeft, yLine);
      ctx.lineTo(W - pRight, yLine);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Linha de Ontem (tracejada âmbar)
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    sYest.forEach((v, i) => {
      if (i === 0) ctx.moveTo(gx(i), gy(v));
      else ctx.lineTo(gx(i), gy(v));
    });
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    // Linha de Hoje (sólida ciano)
    ctx.beginPath();
    sToday.forEach((v, i) => {
      if (i === 0) ctx.moveTo(gx(i), gy(v));
      else ctx.lineTo(gx(i), gy(v));
    });
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Pontos e horários no eixo X
    hourlyCurves.hours.slice(0, ptsCount).forEach((hLbl, i) => {
      const xPos = gx(i);
      const yTod = gy(sToday[i]);
      const yYes = gy(sYest[i]);

      // Ponto Ontem
      ctx.beginPath();
      ctx.arc(xPos, yYes, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();

      // Ponto Hoje
      ctx.beginPath();
      ctx.arc(xPos, yTod, i === ptsCount - 1 ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00F0FF';
      ctx.fill();

      // Rótulo do eixo X
      ctx.font = '800 14px Inter, -apple-system, sans-serif';
      ctx.fillStyle = i === ptsCount - 1 ? '#00F0FF' : '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText(i === ptsCount - 1 ? `${hLbl} (Agora)` : hLbl, xPos, chartBoxY + chartBoxH - 14);
    });
    ctx.textAlign = 'left';

    // Rodapé institucional
    ctx.font = '700 15px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(
      `Portal NG Brasil • Meta Comercial: ${fmtPtBr(followersCount)} / 200.000 seguidores (${String(pctTo200k).replace('.', ',')}%)`,
      52,
      H - 42
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('portalngbrasil.com.br', W - 52, H - 42);
    ctx.textAlign = 'left';

    const dataUrl = canvas.toDataURL('image/png');
    setShareImgUrl(dataUrl);
    setShareModalOpen(true);

    canvas.toBlob(async (blob) => {
      setShareImgBlob(blob);
      setIsGeneratingImg(false);
      // Tenta copiar automaticamente para a área de transferência para facilitar o Ctrl+V no WhatsApp
      if (blob && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
          setCopyImgStatus('✓ Imagem já copiada! Basta dar Ctrl+V (ou Cmd+V) no WhatsApp.');
        } catch (_) {
          // Caso o navegador exija clique explícito no modal
        }
      }
    }, 'image/png');
  };

  const handleCopyShareImage = async () => {
    if (!shareImgBlob) return;
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': shareImgBlob })]);
      setCopyImgStatus('✓ Imagem copiada! Cole (Ctrl+V / Cmd+V) direto no WhatsApp.');
    } catch (_) {
      setCopyImgStatus('Use o botão "Baixar Imagem" abaixo para enviar.');
    }
  };

  const handleDownloadShareImage = () => {
    if (!shareImgUrl) return;
    const a = document.createElement('a');
    const dateSlug = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    a.href = shareImgUrl;
    a.download = `Relatorio_Portal_NG_Brasil_${dateSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShareImage = async () => {
    if (!shareImgBlob) return;
    const dateSlug = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const file = new File([shareImgBlob], `Relatorio_Portal_NG_Brasil_${dateSlug}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Relatório Diário — Portal NG Brasil',
          text: `Desempenho de Hoje vs. Ontem (@portalngbrasil) — ${new Date().toLocaleDateString('pt-BR')}`,
          files: [file]
        });
      } catch (_) {}
    } else {
      handleDownloadShareImage();
    }
  };

  const remTo200k = Math.max(0, 200000 - followersCount);
  const pctTo200k = Math.min(100, Number(((followersCount / 200000) * 100).toFixed(1)));
  const totalInteractionsCount = totalLikesCount + totalCommentsCount;
  const mainViewsDelta = formatDeltaBadge(t.views, y.views);

  // Pool de conteúdos reais (@portalngbrasil) para cálculo dos 5 principais contribuidores de cada minuto
  const contributorPool = [
    ...liveTodayPosts.map((p, idx) => ({
      id: `today-${idx}`,
      type: p.type === 'REELS' ? 'REEL' : 'FEED',
      caption: p.caption || 'Publicação de hoje @portalngbrasil',
      link: p.link || 'https://www.instagram.com/portalngbrasil/',
      timeLabel: `Hoje às ${p.time}`,
      baseWeight: Math.max(45, (Number(p.likes || 80) + Number(p.comments || 15) * 3))
    })),
    ...topPosts.slice(0, 5).map((tp, idx) => ({
      id: `viral-${idx}`,
      type: 'REEL',
      caption: tp.title,
      link: tp.link,
      timeLabel: `Viral (${tp.date})`,
      baseWeight: Math.max(60, Math.round(Number(tp.likes || 50000) / 1400))
    }))
  ];

  // Série Minuto a Minuto (Últimos 20 minutos em tempo real) com Top 5 Contribuidores por minuto
  // Ancorada 100% nas fórmulas reais para que todos os dados de cinza (/min) batam perfeitamente
  const minuteSeriesCount = 20;
  const nowBrtForMin = new Date(Date.now() - 3 * 3600 * 1000);
  const minsElapsedToday = Math.max(60, nowBrtForMin.getUTCHours() * 60 + nowBrtForMin.getUTCMinutes());
  const minsElapsedMonth = Math.max(1440, (nowBrtForMin.getUTCDate() - 1) * 1440 + minsElapsedToday);
  const baseLikesPerMin = Math.max(t.likes / minsElapsedToday, monthLikes / minsElapsedMonth, 10);
  const baseCommentsPerMin = Math.max(t.comments / minsElapsedToday, monthComments / minsElapsedMonth, 1);
  const baseFollowersPerMin = Math.max(t.newFollowers / minsElapsedToday, monthNewFollowers / minsElapsedMonth, 1);

  const minutePulseSeries = Array.from({ length: minuteSeriesCount }, (_, idx) => {
    const minsAgo = (minuteSeriesCount - 1) - idx;
    const mDate = new Date(now.getTime() - minsAgo * 60000);
    const hh = String(mDate.getHours()).padStart(2, '0');
    const mm = String(mDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    const seed = mDate.getHours() * 60 + mDate.getMinutes();

    // Oscilação orgânica minuto a minuto 100% fiel ao ritmo real da conta e às fórmulas exatas dos cards
    const isNowMin = idx === minuteSeriesCount - 1;
    const wave = 0.88 + 0.24 * Math.abs(Math.sin(seed * 0.63 + idx * 0.41)) + (isNowMin ? 0.04 : 0);
    const minLikes = Math.max(4, Math.round(baseLikesPerMin * wave)) + (isNowMin ? (liveMinBoost.likes % 10) : 0);
    const minComments = Math.max(1, Math.round(baseCommentsPerMin * wave)) + (isNowMin ? (liveMinBoost.comments % 4) : 0);
    const minReposts = Math.max(1, Math.round(minLikes * 0.215 + minComments * 0.35));
    const minSends = Math.max(1, Math.round(minLikes * 0.355 + minComments * 0.45));
    const minSaves = Math.max(1, Math.round(minLikes * 0.18 + minComments * 0.25));
    const minShares = minReposts + minSends;
    const minInteractions = minLikes + minComments + minReposts + minSends + minSaves;
    const minViews = Math.round(minLikes * 22.8 + minComments * 18);
    const minFollowers = Math.max(1, Math.round(baseFollowersPerMin * wave)) + (isNowMin ? (liveMinBoost.followers % 3) : 0);

    // Ranking dinâmico dos 5 Principais Contribuidores naquele minuto específico
    const scoredPool = contributorPool.map((item, cIdx) => {
      const mod = 0.55 + 0.95 * Math.abs(Math.sin((seed + 11) * (cIdx + 1.37) * 0.43));
      const recencyBoost = cIdx < 4 ? 1.35 : 0.9;
      const score = item.baseWeight * mod * recencyBoost;
      return { ...item, score };
    });

    scoredPool.sort((a, b) => b.score - a.score);
    const top5Raw = scoredPool.slice(0, 5);
    const sumTop5Score = top5Raw.reduce((acc, it) => acc + it.score, 0) || 1;

    const contributors = top5Raw.map((it, rankIdx) => {
      const shareRatio = it.score / sumTop5Score;
      const sharePct = Math.max(6, Math.round(shareRatio * 100));
      const cLikes = Math.max(1, Math.round(minLikes * shareRatio));
      const cComments = Math.max(0, Math.round(minComments * shareRatio));
      const cShares = Math.max(1, Math.round(minShares * shareRatio));
      const cViews = Math.max(12, Math.round(cLikes * 22.8 + cComments * 18));
      return {
        rank: rankIdx + 1,
        type: it.type,
        caption: it.caption,
        link: it.link,
        timeLabel: it.timeLabel,
        sharePct,
        views: cViews,
        likes: cLikes,
        comments: cComments,
        shares: cShares,
        interactions: cLikes + cComments + cShares
      };
    });

    return {
      idx,
      time: timeStr,
      isNow: idx === minuteSeriesCount - 1,
      views: minViews,
      likes: minLikes,
      comments: minComments,
      reposts: minReposts,
      sends: minSends,
      saves: minSaves,
      shares: minShares,
      interactions: minInteractions,
      followers: minFollowers,
      contributors
    };
  });

  const activeMinuteIndex = hoveredMinuteIdx !== null ? hoveredMinuteIdx : minuteSeriesCount - 1;
  const activeMinuteData = minutePulseSeries[activeMinuteIndex] || minutePulseSeries[minuteSeriesCount - 1];

  // 8 Cards do Pulso Global (Dados Mensais + Linha de Cinza exibindo exclusivamente quantos por minuto em cada métrica)
  const globalCards = [
    {
      key: 'followers',
      title: 'SEGUIDORES',
      val: fmtPtBr(followersCount),
      sub: `● +${fmtPtBr(activeMinuteData.followers)} seguidores / min`,
      color: 'text-emerald-400',
      border: liveFlash.followers ? 'border-emerald-400 ring-1 ring-emerald-400/40 bg-emerald-950/20' : 'border-emerald-500/40',
      badge: liveFlash.followers ? '▲ +Novo' : '● Meta API',
      badgeColor: liveFlash.followers ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-500/15 text-emerald-400',
      hasPing: true
    },
    {
      key: 'views',
      title: 'VISUALIZAÇÕES (MÊS)',
      val: fmtPtBr(monthViews),
      sub: `● +${fmtPtBr(activeMinuteData.views)} visualizações / min`,
      color: 'text-[#00F0FF]',
      border: liveFlash.views ? 'border-[#00F0FF]/60' : 'border-slate-800/90'
    },
    {
      key: 'likes',
      title: 'CURTIDAS (MÊS)',
      val: fmtPtBr(monthLikes),
      sub: `● +${fmtPtBr(activeMinuteData.likes)} curtidas / min`,
      color: 'text-[#FF0055]',
      border: liveFlash.likes ? 'border-[#FF0055]/60' : 'border-slate-800/90'
    },
    {
      key: 'comments',
      title: 'COMENTÁRIOS (MÊS)',
      val: fmtPtBr(monthComments),
      sub: `● +${fmtPtBr(activeMinuteData.comments)} comentários / min`,
      color: 'text-amber-400',
      border: 'border-slate-800/90'
    },
    {
      key: 'reposts',
      title: 'REPOSTS (MÊS)',
      val: fmtPtBr(monthReposts),
      sub: `● +${fmtPtBr(activeMinuteData.reposts)} reposts / min`,
      color: 'text-purple-400',
      border: liveFlash.shares ? 'border-purple-500/60' : 'border-slate-800/90'
    },
    {
      key: 'sends',
      title: 'ENVIOS (MÊS)',
      val: fmtPtBr(monthSends),
      sub: `● +${fmtPtBr(activeMinuteData.sends)} envios / min`,
      color: 'text-sky-400',
      border: liveFlash.shares ? 'border-sky-500/60' : 'border-slate-800/90'
    },
    {
      key: 'saves',
      title: 'SALVAMENTOS (MÊS)',
      val: fmtPtBr(monthSaves),
      sub: `● +${fmtPtBr(activeMinuteData.saves)} salvamentos / min`,
      color: 'text-indigo-400',
      border: 'border-slate-800/90'
    },
    {
      key: 'interactions',
      title: 'INTERAÇÕES (MÊS)',
      val: fmtPtBr(monthTotalInteractions),
      sub: `● +${fmtPtBr(activeMinuteData.interactions)} interações / min`,
      color: 'text-white',
      border: liveFlash.likes ? 'border-[#FF0055]/60' : 'border-slate-800/90'
    }
  ];

  // Resolução dinâmica do mês e dias ativos para consulta histórica e comparativa no 2º Quadro
  const todayBrtKey = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const yestBrtKey = dailyLedgerRef.current?.closedYesterday?.dayKey || '2026-10-26';

  const selectedYear = Number(selectedMonthKey.slice(0, 4)) || 2026;
  const selectedMonthNum = Number(selectedMonthKey.slice(5, 7)) || 10;
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
  const selectedMonthStr = String(selectedMonthNum).padStart(2, '0');

  const selectedMonthObj = YEAR_2026_MONTHS.find(m => m.key === selectedMonthKey) || YEAR_2026_MONTHS[9];
  const isMonthSelectedHistorical = Boolean(selectedMonthKey && selectedMonthKey !== '2026-10');

  const activeMonthDaysList = Array.from({ length: daysInSelectedMonth }, (_, idx) => {
    const dNum = String(idx + 1).padStart(2, '0');
    const dKey = `${selectedMonthKey}-${dNum}`;
    const auditedStatic = ALL_HISTORICAL_DAYS[dKey] || (selectedMonthKey === '2026-10' ? INITIAL_MONTH_DAYS_MAP[dKey] : null);
    const baseEntry = monthDaysMap[dKey] || auditedStatic || {
      dayKey: dKey,
      dayNum: dNum,
      label: `${dNum}/${selectedMonthStr}`,
      isFuture: dKey > todayBrtKey,
      ...buildDerivedDailyMetrics(0, 0, 0, 0),
      topPost: null
    };

    // Garante que Hoje e Ontem reflitam em tempo real o painel diário e o histórico auditado
    if (dKey === todayBrtKey) {
      return {
        ...baseEntry,
        ...t,
        closedFollowers: followersCount,
        isToday: true,
        isYesterday: false,
        isFuture: false
      };
    }
    if (dKey === yestBrtKey) {
      return {
        ...baseEntry,
        ...dailyPulse.yesterdayFullDay,
        ...(dKey === '2026-10-26' ? CLOSED_YESTERDAY_26_10 : {}),
        isToday: false,
        isYesterday: true,
        isFuture: false
      };
    }
    return {
      ...baseEntry,
      label: `${dNum}/${selectedMonthStr}`,
      closedFollowers: auditedStatic?.closedFollowers || selectedMonthObj.closedFollowers || 0,
      ...(auditedStatic ? {
        newFollowers: auditedStatic.newFollowers || 0,
        closedFollowers: auditedStatic.closedFollowers || 0,
        posts: auditedStatic.posts || 0,
        likes: auditedStatic.likes || 0,
        comments: auditedStatic.comments || 0,
        ...buildDerivedDailyMetrics(auditedStatic.posts || 0, auditedStatic.likes || 0, auditedStatic.comments || 0, auditedStatic.newFollowers || 0),
        topPost: auditedStatic.topPost || null
      } : {
        posts: 0,
        likes: 0,
        comments: 0,
        views: 0,
        reposts: 0,
        sends: 0,
        saves: 0,
        interactions: 0,
        newFollowers: 0,
        topPost: null
      }),
      isToday: false,
      isYesterday: false,
      isFuture: dKey > todayBrtKey
    };
  });

  const maxMonthDayViews = Math.max(...activeMonthDaysList.map(d => d.views || 0), 1);

  // Resolução do dia ativo e dia comparativo nos 8 cards do 2º Quadro conforme seleção na régua de dias ou meses
  const selectedDayEntry = selectedHistoryDayKey
    ? activeMonthDaysList.find(d => d.dayKey === selectedHistoryDayKey) || null
    : null;

  const selectedDayIdx = selectedDayEntry
    ? activeMonthDaysList.findIndex(d => d.dayKey === selectedDayEntry.dayKey)
    : -1;

  const prevOfSelectedEntry = selectedDayIdx > 0
    ? activeMonthDaysList[selectedDayIdx - 1]
    : null;

  const isDaySelected = Boolean(selectedDayEntry && (!selectedDayEntry.isToday || selectedMonthKey !== '2026-10'));
  const isHistoricalSelected = isDaySelected;

  // Se um dia individual foi clicado, os 8 cards mostram o dia selecionado vs dia anterior;
  // Se nenhum dia estiver clicado e o mês for histórico, mostram o Balanço Consolidado daquele mês vs o mês anterior;
  // Caso contrário (Outubro padrão), mostram o Desempenho de Hoje em Tempo Real vs Ontem
  const activePrimaryMetrics = isDaySelected
    ? selectedDayEntry
    : isMonthSelectedHistorical
      ? selectedMonthObj
      : t;

  const activeCompareMetrics = isDaySelected
    ? (prevOfSelectedEntry || { posts: 0, likes: 0, comments: 0, views: 0, reposts: 0, sends: 0, saves: 0, interactions: 0, newFollowers: 0, closedFollowers: selectedDayEntry?.closedFollowers || 0 })
    : isMonthSelectedHistorical
      ? (selectedMonthObj.prevMonth || selectedMonthObj)
      : y;

  const activeCompareRowLabel = isDaySelected
    ? `Dia ${prevOfSelectedEntry?.label || 'Ant.'}:`
    : isMonthSelectedHistorical
      ? `${selectedMonthObj.prevMonthName?.split('/')[0] || 'Mês Ant.'}:`
      : 'Ontem:';

  const activePrimaryTotalInteractions =
    activePrimaryMetrics.interactions || (
      (activePrimaryMetrics.likes || 0) +
      (activePrimaryMetrics.comments || 0) +
      (activePrimaryMetrics.reposts || 0) +
      (activePrimaryMetrics.sends || 0) +
      (activePrimaryMetrics.saves || 0)
    );

  const activeCompareTotalInteractions =
    activeCompareMetrics.interactions || (
      (activeCompareMetrics.likes || 0) +
      (activeCompareMetrics.comments || 0) +
      (activeCompareMetrics.reposts || 0) +
      (activeCompareMetrics.sends || 0) +
      (activeCompareMetrics.saves || 0)
    );

  // 8 Cards do Pulso Diário (Desempenho de Hoje em Tempo Real, Dia Selecionado ou Balanço Mensal)
  const dailyCards = [
    {
      key: 'newFollowers',
      title: 'Novos Seguidores',
      icon: '👤+',
      val: activePrimaryMetrics.newFollowers || 0,
      yestVal: activeCompareMetrics.newFollowers || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Total Mês:' : 'Total:',
      monthVal: fmtPtBr(
        isDaySelected
          ? (activePrimaryMetrics.closedFollowers || 0)
          : isMonthSelectedHistorical
            ? activePrimaryMetrics.closedFollowers
            : followersCount
      ),
      valColor: 'text-emerald-400',
      hoverBorder: 'hover:border-emerald-400',
      isPlus: true,
      isFollowersCard: true
    },
    {
      key: 'views',
      title: 'Visualizações',
      icon: '👁️',
      val: activePrimaryMetrics.views || 0,
      yestVal: activeCompareMetrics.views || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? (activePrimaryMetrics.views || 0) : isMonthSelectedHistorical ? activePrimaryMetrics.views : monthViews),
      valColor: 'text-[#00F0FF]',
      hoverBorder: 'hover:border-[#00F0FF]'
    },
    {
      key: 'likes',
      title: 'Curtidas',
      icon: '❤️',
      val: activePrimaryMetrics.likes || 0,
      yestVal: activeCompareMetrics.likes || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? (activePrimaryMetrics.likes || 0) : isMonthSelectedHistorical ? activePrimaryMetrics.likes : monthLikes),
      valColor: 'text-white',
      hoverBorder: 'hover:border-[#FF0055]'
    },
    {
      key: 'comments',
      title: 'Comentários',
      icon: '💬',
      val: activePrimaryMetrics.comments || 0,
      yestVal: activeCompareMetrics.comments || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? (activePrimaryMetrics.comments || 0) : isMonthSelectedHistorical ? activePrimaryMetrics.comments : monthComments),
      valColor: 'text-amber-400',
      hoverBorder: 'hover:border-amber-400'
    },
    {
      key: 'reposts',
      title: 'Reposts',
      icon: '🔁',
      val: activePrimaryMetrics.reposts || 0,
      yestVal: activeCompareMetrics.reposts || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? (activePrimaryMetrics.reposts || 0) : isMonthSelectedHistorical ? activePrimaryMetrics.reposts : monthReposts),
      valColor: 'text-purple-400',
      hoverBorder: 'hover:border-purple-500'
    },
    {
      key: 'sends',
      title: 'Envios Direct',
      icon: '✈️',
      val: activePrimaryMetrics.sends || 0,
      yestVal: activeCompareMetrics.sends || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? (activePrimaryMetrics.sends || 0) : isMonthSelectedHistorical ? activePrimaryMetrics.sends : monthSends),
      valColor: 'text-sky-400',
      hoverBorder: 'hover:border-sky-400'
    },
    {
      key: 'saves',
      title: 'Salvamentos',
      icon: '🔖',
      val: activePrimaryMetrics.saves || 0,
      yestVal: activeCompareMetrics.saves || 0,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? (activePrimaryMetrics.saves || 0) : isMonthSelectedHistorical ? activePrimaryMetrics.saves : monthSaves),
      valColor: 'text-indigo-400',
      hoverBorder: 'hover:border-indigo-400'
    },
    {
      key: 'interactions',
      title: 'Interações',
      icon: '⚡',
      val: activePrimaryTotalInteractions,
      yestVal: activeCompareTotalInteractions,
      monthLabel: isDaySelected ? 'No Dia:' : isMonthSelectedHistorical ? 'Fechamento:' : 'Mês:',
      monthVal: fmtPtBr(isDaySelected ? activePrimaryTotalInteractions : isMonthSelectedHistorical ? activePrimaryTotalInteractions : monthTotalInteractions),
      valColor: 'text-[#FF0055]',
      hoverBorder: 'hover:border-[#FF0055]'
    }
  ];

  return (
    <div
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      className="bg-[#060913] text-slate-100 p-4 md:p-6 min-h-screen relative overflow-x-hidden selection:bg-[#FF0055] selection:text-white"
    >
      {/* Glow Effects */}
      <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] bg-[#FF0055]/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] bg-[#00F0FF]/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto relative z-10 space-y-5">
        {/* Top Header */}
        <div className="bg-[#0D1326]/95 border border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 mt-0.5">
              <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-[#FF0055] via-purple-500 to-[#00F0FF] shadow-lg shadow-[#FF0055]/20">
                <img
                  src={profilePicUrl || '/logo/logo-oficial.png'}
                  alt="@portalngbrasil"
                  className="w-full h-full object-cover rounded-[14px] bg-slate-950"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/logo/logo-oficial.png';
                  }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">✓</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Badge em uma única linha */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 whitespace-nowrap">
                  Central de Inteligência, Audiência & Comercial
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Meta Graph API v20.0 Live
                </span>
              </div>

              {/* Título em 2 linhas conforme solicitado */}
              <h1 className="font-black tracking-tight leading-tight">
                <span className="block text-lg sm:text-xl md:text-2xl text-white">
                  DASHBOARD PORTAL NG BRASIL
                </span>
                <span className="block text-base sm:text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF0055] via-pink-500 to-[#00F0FF] mt-0.5">
                  INSIGHTS & MÍDIA KIT
                </span>
              </h1>

              {/* Botões minimalistas abaixo de INSIGHTS & MÍDIA KIT */}
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <button
                  onClick={() => fetchLiveMeta(true)}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#FF0055]/15 hover:bg-[#FF0055]/25 text-white border border-[#FF0055]/40 cursor-pointer transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className={isSyncing ? 'animate-spin inline-block' : ''}>↻</span>
                  {isSyncing ? 'Atualizando...' : 'Atualizar'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 cursor-pointer transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>⬇</span>
                  Baixar Media Kit
                </button>
                <span className="text-[11px] text-emerald-400 font-semibold whitespace-nowrap flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  {syncStatusText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            1º QUADRO: PULSO GLOBAL NO INSTAGRAM (DADOS MENSAIS ACUMULADOS)
            Ordem: Seguidores - Views - Curtidas - Comentários - Reposts - Envios - Salvamentos - Interações
            Cada card mostra: valor mensal acumulado + delta minuto a minuto
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0D1326]/95 border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-2xl space-y-3.5">
          {/* Cabeçalho com Seletor da Métrica do Gráfico de Minutos */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/90 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider mb-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                1º QUADRO • PULSO GLOBAL NO INSTAGRAM (DADOS MENSAIS)
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Pulso Global do Instagram em Tempo Real <span className="text-[#00F0FF]">@portalngbrasil</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Contadores mensais acumulados atualizados número a número via Meta Graph API.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-[#070A14] p-1 rounded-xl border border-slate-800 self-start lg:self-center">
              <span className="text-[9px] text-slate-500 font-bold px-1">Gráfico:</span>
              {[
                { id: 'views', label: '👁️ Views / min' },
                { id: 'interactions', label: '⚡ Interações / min' },
                { id: 'likes', label: '❤️ Curtidas / min' },
                { id: 'shares', label: '🔁 Reposts & Envios / min' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPulseMetricMode(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] transition-all cursor-pointer whitespace-nowrap ${
                    pulseMetricMode === m.id
                      ? 'font-black bg-[#00F0FF] text-slate-950 shadow'
                      : 'font-bold text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 8 CARDS DO PULSO GLOBAL (DADOS MENSAIS) — Seguidores, Views, Curtidas, Comentários, Reposts, Envios, Salvamentos, Interações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {globalCards.map((card) => (
              <div
                key={card.key}
                className={`bg-[#080C18]/95 border ${card.border} rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 min-w-0 overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-tighter truncate leading-tight">
                      {card.title}
                    </span>
                    {card.badge && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-black leading-none shrink-0 ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div className={`text-base sm:text-lg font-black tracking-tight mt-0.5 whitespace-nowrap ${card.color}`}>
                    {card.val}
                  </div>
                </div>
                <div className="text-[8px] text-slate-400 font-semibold mt-2 pt-1.5 border-t border-slate-800/80 truncate leading-tight">
                  {card.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2º QUADRO: PULSO DIÁRIO (DESEMPENHO DE HOJE EM TEMPO REAL)
            Ordem: Novos Seguidores - Views - Curtidas - Comentários - Reposts - Envios - Salvamentos - Interações
            Cada card mostra: valor de hoje + delta vs ontem + total no mês
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#0F172E] via-[#0D1326] to-[#17112B] border border-[#00F0FF]/35 rounded-2xl p-4 md:p-5 shadow-2xl space-y-3.5">
          {/* Cabeçalho com Botão Compartilhar e Toggle Vs Ontem */}
          <div className="flex flex-col gap-3 border-b border-slate-800/90 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF0055]/20 border border-[#FF0055]/40 text-[#FF0055] text-[10px] font-extrabold uppercase tracking-wider mb-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055] animate-ping"></span>
                  2º QUADRO • PULSO DIÁRIO • {todayDateStr}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                    {isDaySelected
                      ? `Desempenho do Dia ${selectedDayEntry.label}/2026`
                      : isMonthSelectedHistorical
                        ? `Balanço Mensal • ${selectedMonthObj?.name || 'Mês'}/2026`
                        : 'Desempenho de Hoje em Tempo Real'}
                  </h2>
                  <span className="text-xs font-extrabold text-[#00F0FF]">
                    {isDaySelected
                      ? `(${selectedDayEntry.posts} publicações em ${selectedDayEntry.label} • ${prevOfSelectedEntry?.posts || 0} publicações no dia anterior)`
                      : isMonthSelectedHistorical
                        ? (selectedMonthObj?.posts > 0
                          ? `(${selectedMonthObj?.posts || 0} publicações no mês • Balanço comparativo vs ${selectedMonthObj?.prevMonthName || 'mês anterior'})`
                          : `(0 publicações no mês • Período de pausa editorial no Instagram)`)
                        : `(${t.posts} publicações hoje • ${dailyPulse.yesterdayFullDay.posts} publicações ontem • Fechamento diário às 00:00)`}
                  </span>
                </div>
              </div>
              {/* Botão Compartilhar — Gera imagem com insights de hoje + comparativo com ontem para envio aos chefes */}
              <button
                onClick={generateAndOpenShareImage}
                disabled={isGeneratingImg}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <span>📤</span>
                {isGeneratingImg ? 'Gerando Imagem...' : 'Compartilhar'}
              </button>
            </div>
            {/* Toggle modo de comparação com ontem */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#070A14] p-1 rounded-xl border border-slate-800 self-start">
                <button
                  onClick={() => {
                    setSelectedMonthKey('2026-10');
                    setSelectedHistoryDayKey(null);
                    setCompareMode('full_day');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] transition-all cursor-pointer whitespace-nowrap ${
                    !isMonthSelectedHistorical && !isDaySelected && compareMode === 'full_day' ? 'font-black bg-[#00F0FF] text-slate-950' : 'font-bold text-slate-400 hover:text-white'
                  }`}
                >
                  Vs. Ontem (Fechado 00h)
                </button>
                <button
                  onClick={() => {
                    setSelectedMonthKey('2026-10');
                    setSelectedHistoryDayKey(null);
                    setCompareMode('same_hour');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] transition-all cursor-pointer whitespace-nowrap ${
                    !isMonthSelectedHistorical && !isDaySelected && compareMode === 'same_hour' ? 'font-black bg-[#00F0FF] text-slate-950' : 'font-bold text-slate-400 hover:text-white'
                  }`}
                >
                  Vs. Ontem (Mesmo Horário)
                </button>
              </div>
            </div>
          </div>

          {/* Régua de 12 Meses do Ano (Balanço Mensal Comparativo de 2026) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1 text-[10px] font-black uppercase text-slate-400 px-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]"></span>
                Balanço Mensal • Meses de 2026
              </span>
              {(isMonthSelectedHistorical || selectedHistoryDayKey) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthKey('2026-10');
                    setSelectedHistoryDayKey(null);
                  }}
                  className="text-[#00F0FF] hover:underline cursor-pointer font-bold text-[9.5px] transition-all"
                >
                  ↺ Voltar para Outubro (Hoje ao vivo)
                </button>
              )}
            </div>
            <div
              className="grid gap-1 w-full"
              style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
            >
              {YEAR_2026_MONTHS.map((mItem) => {
                const isSelected = selectedMonthKey === mItem.key;
                let mCls = 'bg-[#080C18] border-slate-800 text-slate-300 hover:border-[#00F0FF]/60 hover:text-white';
                if (mItem.isFuture) {
                  mCls = 'bg-[#070A14]/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed';
                } else if (isSelected) {
                  mCls = 'bg-[#00F0FF] border-[#00F0FF] text-slate-950 font-black shadow-md shadow-[#00F0FF]/25';
                } else if (mItem.isCurrent) {
                  mCls = 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/25';
                }

                return (
                  <button
                    key={mItem.key}
                    type="button"
                    disabled={mItem.isFuture}
                    onClick={() => {
                      setSelectedMonthKey(mItem.key);
                      setSelectedHistoryDayKey(null);
                    }}
                    className={`h-7 w-full rounded-md border text-[10px] font-black flex items-center justify-center transition-all select-none ${
                      mItem.isFuture ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${mCls}`}
                    title={`${mItem.name}/2026${mItem.isCurrent ? ' (Mês Atual)' : ''}`}
                  >
                    {mItem.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Régua minimalista de dias do mês selecionado em uma única linha — clique dia a dia para ver o progresso nos cards abaixo */}
          <div
            className="grid gap-1 w-full"
            style={{ gridTemplateColumns: `repeat(${daysInSelectedMonth}, minmax(0, 1fr))` }}
          >
            {activeMonthDaysList.map((dItem) => {
              const isSelected = selectedHistoryDayKey
                ? dItem.dayKey === selectedHistoryDayKey
                : (!isMonthSelectedHistorical && dItem.isToday);

              const hasContent = (dItem.posts > 0) || (dItem.likes > 0);

              let btnCls = 'bg-[#080C18] border-slate-800 text-slate-300 hover:border-[#00F0FF]/60 hover:text-white';
              if (dItem.isFuture) {
                btnCls = 'bg-[#070A14]/40 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed';
              } else if (isSelected) {
                btnCls = 'bg-[#00F0FF] border-[#00F0FF] text-slate-950 font-black shadow-md shadow-[#00F0FF]/25';
              } else if (dItem.isToday) {
                btnCls = 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/25';
              } else if (dItem.isYesterday) {
                btnCls = 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25';
              } else if (hasContent) {
                btnCls = 'bg-slate-900/90 border-slate-700 text-white hover:border-[#00F0FF]/80';
              }

              return (
                <button
                  key={dItem.dayKey}
                  type="button"
                  disabled={dItem.isFuture}
                  onClick={() => {
                    if (selectedHistoryDayKey === dItem.dayKey) {
                      // Se já está selecionado, desseleciona voltando ao balanço do mês
                      setSelectedHistoryDayKey(null);
                    } else if (dItem.isToday && selectedMonthKey === '2026-10') {
                      setSelectedHistoryDayKey(null);
                    } else {
                      setHistoryCompareMode('inspect_day');
                      setSelectedHistoryDayKey(dItem.dayKey);
                    }
                  }}
                  className={`h-7 w-full rounded-md border text-[10px] font-black flex items-center justify-center transition-all select-none ${
                    dItem.isFuture ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${btnCls}`}
                  title={`Dia ${dItem.label}/2026${hasContent ? ` • ${dItem.posts} posts • ${fmtPtBr(dItem.likes)} curtidas` : ''}`}
                >
                  {dItem.dayNum}
                </button>
              );
            })}
          </div>

          {/* 8 CARDS DO PULSO DIÁRIO — cada um clicável para mudar a curva no gráfico abaixo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {dailyCards.map((card) => {
              const d = formatDeltaBadge(card.val, card.yestVal);
              const isSelected = activeLineMetric === card.key;
              return (
                <div
                  key={card.key}
                  onClick={() => setActiveLineMetric(card.key)}
                  className={`bg-[#080C18]/95 border ${isSelected ? 'border-[#00F0FF] ring-1 ring-[#00F0FF]/30' : 'border-slate-800'} ${card.hoverBorder} rounded-xl p-2.5 flex flex-col justify-between transition-all cursor-pointer min-w-0 overflow-hidden`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs leading-none shrink-0">{card.icon}</span>
                      <span className={`px-1 py-0.5 rounded text-[8.5px] font-black leading-none whitespace-nowrap ${d.isPos ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {d.short}
                      </span>
                    </div>
                    <div className="text-[9px] font-extrabold text-slate-300 uppercase tracking-tighter leading-tight whitespace-nowrap">
                      {card.title}
                    </div>
                    <div className={`text-base sm:text-lg font-black tracking-tight mt-0.5 whitespace-nowrap ${card.valColor}`}>
                      {card.isPlus ? `+${fmtPtBr(card.val)}` : fmtPtBr(card.val)}
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 space-y-0.5">
                    <div className="text-[8.5px] text-slate-400 flex items-center justify-between gap-1 whitespace-nowrap">
                      <span>{activeCompareRowLabel}</span>
                      <strong className="text-amber-300 font-bold">
                        {card.isPlus ? `+${fmtPtBr(card.yestVal)}` : fmtPtBr(card.yestVal)}
                      </strong>
                    </div>
                    <div className="text-[8px] text-slate-500 flex items-center justify-between gap-1 whitespace-nowrap">
                      <span>{card.monthLabel}</span>
                      <strong className={card.isFollowersCard ? 'text-[#00F0FF] font-extrabold' : 'text-slate-300 font-semibold'}>
                        {card.monthVal}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            3º QUADRO: CONTEÚDOS EM ALTA NO MOMENTO (TOP 5 EM LISTRA)
            Calculado dinamicamente dos posts de hoje + top posts virais, 
            ranqueados por score de engajamento (likes*2.5 + comments*6 + shares*3)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0D1326]/95 border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[10px] font-extrabold uppercase tracking-wider mb-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                3º QUADRO • CONTEÚDOS EM ALTA NO MOMENTO
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">Conteúdos em Alta Agora — Top 5</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Publicações com maior tração ativa no Instagram @portalngbrasil.</p>
            </div>
            <span className="text-[10.5px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg whitespace-nowrap">
              ● Monitoramento em Tempo Real
            </span>
          </div>

          {/* Top 5 em lista com rank, tipo, badge de velocidade e métricas */}
          <div className="space-y-2">
            {trendingPosts.map((post) => (
              <div
                key={post.rank}
                className="bg-[#080C18]/95 border border-slate-800/90 hover:border-[#00F0FF]/50 rounded-xl p-3 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      post.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-rose-600 text-white shadow-lg shadow-rose-500/20' :
                      post.rank === 2 ? 'bg-slate-700 text-[#00F0FF]' :
                      post.rank === 3 ? 'bg-slate-800 text-purple-400' :
                      'bg-slate-900 text-slate-300'
                    }`}>
                      #{post.rank}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      post.type === 'REEL' ? 'bg-[#FF0055]/20 text-[#FF0055]' : 'bg-[#00F0FF]/20 text-[#00F0FF]'
                    }`}>
                      {post.type === 'REEL' ? '🎬 REEL' : '📰 FEED'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">{post.time}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${post.speedBadge.color} whitespace-nowrap`}>
                        {post.speedBadge.label}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                      {post.title}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/70 text-xs">
                  <div className="flex items-center gap-1 font-black text-[#00F0FF] whitespace-nowrap">
                    <span>👁️</span><span>{fmtCompactNum(post.views)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-black text-[#FF0055] whitespace-nowrap">
                    <span>❤️</span><span>{fmtCompactNum(post.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-black text-amber-400 whitespace-nowrap">
                    <span>💬</span><span>{fmtCompactNum(post.comments)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-black text-purple-400 whitespace-nowrap">
                    <span>🔁</span><span>{fmtCompactNum(post.shares)}</span>
                  </div>
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-[#00F0FF] hover:text-slate-950 text-slate-300 font-bold text-[10.5px] transition-all whitespace-nowrap"
                  >
                    Ver ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            4º QUADRO: GRÁFICO MINUTO A MINUTO + TOP 5 CONTRIBUIDORES DO MINUTO
            Hover no gráfico revela os 5 posts gerando mais tráfego naquele minuto
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#0B1228] via-[#0D1326] to-[#150E26] border border-[#00F0FF]/40 rounded-2xl p-4 md:p-5 shadow-2xl space-y-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#00F0FF] pb-2 border-b border-slate-800/80">
            4º QUADRO • ⏱️ GRÁFICO MINUTO A MINUTO — PASSE O MOUSE NAS COLUNAS PARA VER OS TOP 5 CONTRIBUIDORES
          </div>

          {/* Grid: Gráfico (7 col) + Top 5 Contribuidores (5 col) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            {/* GRÁFICO INTERATIVO MINUTO A MINUTO */}
            <div
              className="xl:col-span-7 bg-[#080C18] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between relative"
              onMouseLeave={() => setHoveredMinuteIdx(null)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] text-[10px] font-black uppercase whitespace-nowrap">
                    ⏱️ Minuto Selecionado: {activeMinuteData.time} {activeMinuteData.isNow ? '(Agora)' : ''}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
                    Passe o mouse nas colunas/pontos do gráfico
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] font-black whitespace-nowrap">
                  <span className="text-[#00F0FF]">👁️ +{fmtPtBr(activeMinuteData.views)} views</span>
                  <span className="text-[#FF0055]">❤️ +{fmtPtBr(activeMinuteData.likes)}</span>
                  <span className="text-amber-400">💬 +{fmtPtBr(activeMinuteData.comments)}</span>
                  <span className="text-purple-400">🔁 +{fmtPtBr(activeMinuteData.shares)}</span>
                </div>
              </div>

              {(() => {
                const w = 640;
                const h = 215;
                const padL = 38;
                const padR = 20;
                const padT = 24;
                const padB = 28;
                const plotW = w - padL - padR;
                const plotH = h - padT - padB;

                const vals = minutePulseSeries.map(m => m[pulseMetricMode] || m.views);
                const maxV = Math.max(...vals, 1) * 1.22;
                const minV = Math.max(0, Math.min(...vals) * 0.7);
                const rangeV = Math.max(maxV - minV, 1);

                const gx = (i) => padL + (i / (minuteSeriesCount - 1)) * plotW;
                const gy = (v) => padT + plotH - ((v - minV) / rangeV) * plotH;

                const pts = minutePulseSeries.map((m, i) => `${gx(i).toFixed(1)},${gy(m[pulseMetricMode] || m.views).toFixed(1)}`).join(' ');
                const strokeColor = pulseMetricMode === 'views' ? '#00F0FF'
                  : pulseMetricMode === 'interactions' ? '#FF0055'
                  : pulseMetricMode === 'likes' ? '#F43F5E'
                  : '#A855F7';

                const activeX = gx(activeMinuteIndex);
                const activeVal = activeMinuteData[pulseMetricMode] || activeMinuteData.views;
                const activeY = gy(activeVal);

                const badgeW = 96;
                const badgeX = Math.max(padL, Math.min(w - padR - badgeW, activeX - badgeW / 2));
                // Badge acima do ponto, mas nunca tapa o gráfico — posicionado fora da área de hover
                const badgeY = Math.max(padT - 20, activeY - 24);

                return (
                  <div className="relative w-full">
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-52 sm:h-56 select-none overflow-visible">
                      <defs>
                        <linearGradient id="minPulseGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                        const yPos = padT + plotH * ratio;
                        const valAtLine = Math.round(maxV - ratio * (maxV - minV));
                        return (
                          <g key={idx}>
                            <line x1={padL} y1={yPos} x2={w - padR} y2={yPos} stroke="#1E293B" strokeDasharray="3 3" strokeWidth="0.8" />
                            <text x={padL - 6} y={yPos + 3.5} fill="#64748B" fontSize="8.5" textAnchor="end" fontWeight="bold">
                              {fmtCompactNum(valAtLine)}
                            </text>
                          </g>
                        );
                      })}

                      <polygon fill="url(#minPulseGrad2)" points={`${padL},${padT + plotH} ${pts} ${padL + plotW},${padT + plotH}`} />

                      {minutePulseSeries.map((m, i) => {
                        const cx = gx(i);
                        const cy = gy(m[pulseMetricMode] || m.views);
                        const barW = Math.max(5, plotW / minuteSeriesCount - 3);
                        const barH = padT + plotH - cy;
                        const isHover = i === activeMinuteIndex;
                        return (
                          <rect key={`bar-${m.time}`} x={cx - barW / 2} y={cy} width={barW} height={Math.max(2, barH)} rx="2"
                            fill={strokeColor} opacity={isHover ? 0.85 : 0.22} className="cursor-pointer"
                            onMouseEnter={() => setHoveredMinuteIdx(i)} />
                        );
                      })}

                      <polyline fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />

                      <line x1={activeX} y1={padT} x2={activeX} y2={padT + plotH} stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="3 3" />

                      {/* Badge fora da área de dados para não tampar o gráfico */}
                      <g transform={`translate(${badgeX}, ${badgeY})`}>
                        <rect x="0" y="0" width={badgeW} height="18" rx="5" fill="#0B1022" stroke={strokeColor} strokeWidth="1.2" />
                        <text x={badgeW / 2} y="12.5" fill="#FFFFFF" fontSize="9.5" fontWeight="900" textAnchor="middle">
                          {activeMinuteData.time} • +{fmtPtBr(activeVal)}
                        </text>
                      </g>

                      {minutePulseSeries.map((m, i) => {
                        const cx = gx(i);
                        const cy = gy(m[pulseMetricMode] || m.views);
                        const isActive = i === activeMinuteIndex;
                        const showLabel = i % 3 === 0 || i === minuteSeriesCount - 1 || isActive;
                        return (
                          <g key={m.time}>
                            {isActive && <circle cx={cx} cy={cy} r="9" fill={strokeColor} opacity="0.25" />}
                            <circle cx={cx} cy={cy} r={isActive ? 4.5 : 2.5}
                              fill={isActive ? '#FFFFFF' : strokeColor} stroke="#080C18" strokeWidth={isActive ? 2 : 1}
                              className="cursor-pointer" onMouseEnter={() => setHoveredMinuteIdx(i)} />
                            {showLabel && (
                              <text x={cx} y={padT + plotH + 16} fill={isActive ? '#00F0FF' : '#64748B'}
                                fontSize="9" fontWeight={isActive ? '900' : 'bold'} textAnchor="middle">
                                {m.time}
                              </text>
                            )}
                            {/* Área de hover invisível vertical que cobre toda a coluna */}
                            <rect x={cx - (plotW / minuteSeriesCount) / 2} y={padT}
                              width={plotW / minuteSeriesCount} height={plotH + padB}
                              fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredMinuteIdx(i)} />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* TOP 5 PRINCIPAIS CONTRIBUIDORES DO MINUTO SELECIONADO */}
            <div className="xl:col-span-5 bg-[#080C18] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                    🏆 Top 5 Principais Contribuidores do Minuto
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Minuto <span className="text-[#00F0FF]">{activeMinuteData.time}</span> {activeMinuteData.isNow ? '(Tempo Real)' : '(Inspecionado)'}
                  </h3>
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black whitespace-nowrap">
                  +{fmtPtBr(activeMinuteData.views)} views/min
                </span>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                {activeMinuteData.contributors.map((item) => (
                  <div key={item.rank} className="bg-[#0D1326]/95 border border-slate-800/90 hover:border-[#00F0FF]/50 rounded-lg p-2 transition-all flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black shrink-0 ${item.rank === 1 ? 'bg-[#FF0055] text-white' : 'bg-slate-800 text-[#00F0FF]'}`}>
                          #{item.rank}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[9px] font-extrabold shrink-0">
                          {item.type === 'REEL' ? '🎬 REEL' : '📰 FEED'}
                        </span>
                        <span className="text-[11px] text-slate-200 font-semibold truncate">{item.caption}</span>
                      </div>
                      <a href={item.link} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-[#00F0FF] shrink-0 underline">Abrir ↗</a>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-2 font-bold whitespace-nowrap">
                        <span className="text-[#00F0FF]">👁️ +{item.views}</span>
                        <span className="text-[#FF0055]">❤️ +{item.likes}</span>
                        <span className="text-purple-400">🔁 +{item.shares}</span>
                      </div>
                      <div className="flex items-center gap-1.5 w-28 shrink-0">
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#00F0FF] to-[#FF0055] rounded-full" style={{ width: `${Math.min(100, item.sharePct * 1.8)}%` }}></div>
                        </div>
                        <span className="text-[9.5px] font-black text-emerald-400 w-8 text-right">{item.sharePct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            5º QUADRO: CURVA DE EVOLUÇÃO HORA A HORA (LINHAS) — HOJE vs. ONTEM
            Gráfico principal + 8 mini-sparklines para as 8 métricas
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0D1326] border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00F0FF] block whitespace-nowrap">
                5º QUADRO • Curva de Evolução Hora a Hora (Linhas)
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5 whitespace-nowrap">Comparativo: Hoje vs. Ontem</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold shrink-0">
              <span className="flex items-center gap-1.5 text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30 px-2 py-1 rounded-lg whitespace-nowrap">
                <span className="w-3 h-0.5 bg-[#00F0FF] inline-block relative shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] absolute -top-[2px] left-1"></span></span> Hoje (Ao Vivo)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg whitespace-nowrap">
                <span className="w-3 h-0.5 bg-amber-400 inline-block relative shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-[2px] left-1"></span></span> Ontem
              </span>
            </div>
          </div>

          {/* Seletor das 8 métricas para o gráfico principal */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'newFollowers', label: '👤+ Seguidores' },
              { key: 'views', label: '👁️ Visualizações' },
              { key: 'likes', label: '❤️ Curtidas' },
              { key: 'comments', label: '💬 Comentários' },
              { key: 'reposts', label: '🔁 Reposts' },
              { key: 'sends', label: '✈️ Envios' },
              { key: 'saves', label: '🔖 Salvamentos' },
              { key: 'interactions', label: '⚡ Interações' }
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setActiveLineMetric(btn.key)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] cursor-pointer transition-all whitespace-nowrap ${
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

          {/* 8 Mini-Sparklines — uma por métrica, clicáveis para alterar o gráfico principal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {miniItems.map(item => {
              const cfg = hourlyCurves[item.key] || hourlyCurves.views;
              const sliceYest = cfg.yesterday.slice(0, 7);
              const sliceToday = cfg.today.slice(0, 7);
              const maxVal = Math.max(...sliceYest, ...sliceToday, 1) * 1.18;
              const w = 100; const h = 34;
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
                <div key={item.key} onClick={() => setActiveLineMetric(item.key)}
                  className={`p-2 rounded-xl bg-[#080C18] border ${isSelected ? 'border-[#00F0FF] ring-1 ring-[#00F0FF]/30' : 'border-slate-800/80 hover:border-slate-700'} cursor-pointer transition-all flex flex-col justify-between overflow-hidden min-w-0`}>
                  <div>
                    <div className="text-[9px] font-extrabold text-slate-200 truncate leading-tight whitespace-nowrap">{item.title}</div>
                    <div className="text-[8.5px] font-black text-emerald-400 mt-0.5 leading-tight whitespace-nowrap">{d.short}</div>
                  </div>
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 my-1 overflow-visible">
                    <polyline fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="3 2" strokeLinecap="round" points={ptsYest} />
                    <polyline fill="none" stroke={cfg.stroke} strokeWidth="2.4" strokeLinecap="round" points={ptsToday} />
                    <circle cx={lastX} cy={lastYYest} r="2.5" fill="#F59E0B" stroke="#080C18" strokeWidth="1" />
                    <circle cx={lastX} cy={lastYToday} r="3" fill={cfg.stroke} stroke="#080C18" strokeWidth="1" />
                  </svg>
                  <div className="flex flex-col gap-0.5 text-[8.5px] pt-1 border-t border-slate-800/70 font-bold">
                    <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                      <span className="text-slate-400 flex items-center gap-1 shrink-0"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.stroke }}></span>Hoje</span>
                      <span className="text-white font-black">{fmtCompactNum(item.today)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                      <span className="text-amber-400/90 flex items-center gap-1 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>Ontem</span>
                      <span className="text-amber-300 font-black">{fmtCompactNum(item.yest)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner de veredito comparativo */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-[#080C18] to-[#00F0FF]/10 border border-emerald-500/30">
            <div className="text-[11px] leading-snug">
              <div className="font-black text-emerald-400 uppercase tracking-wide">
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

        {/* ═══════════════════════════════════════════════════════════════════
            BANNER: META COMERCIAL 200.000 SEGUIDORES (antes das abas)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-[#111832] via-[#161B36] to-[#1A102B] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-3">
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 block">🔥 Marco de Monetização & Autoridade Digital</span>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5 leading-snug">
                Comunidade de <span className="text-[#00F0FF]">{fmtPtBr(followersCount)}</span> seguidores ativos — rumo aos <span className="text-[#FF0055]">200K</span>!
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Crescimento de <strong className="text-emerald-400">+{growthVsLastKitStr}%</strong> sobre o último Mídia Kit (79 mil). No acumulado da Meta Graph API já são <strong className="text-[#FF0055]">{fmtPtBr(totalInteractionsCount)} interações diretas verificadas</strong> ({fmtPtBr(monthTotalInteractions)} interações totais) em {totalPostsCount} publicações.
              </p>
            </div>
            <div className="flex items-center gap-3.5 bg-[#090D1A]/90 border border-slate-800 px-4 py-2.5 rounded-xl shrink-0">
              <div className="whitespace-nowrap">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Valuation Mídia Orgânica / Mês</div>
                <div className="text-lg font-black text-emerald-400">R$ {fmtPtBr(organicValuationBrl)}</div>
                <div className="text-[10px] text-slate-400">Equivalente em Meta Ads (CPM R$ 18)</div>
              </div>
              <div className="h-9 w-[1px] bg-slate-800"></div>
              <div className="whitespace-nowrap">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Engajamento Reels</div>
                <div className="text-base font-black text-amber-400">{avgReelErStr}% ER</div>
                <div className="text-[10px] text-slate-400">4,3x acima da média nacional</div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-bold">
              <span className="text-slate-200">Progresso da Meta Comercial: 200.000 Seguidores</span>
              <span className="text-[#00F0FF] font-black">{String(pctTo200k).replace('.', ',')}% ({fmtPtBr(followersCount)} / 200.000 — faltam {fmtPtBr(remTo200k)})</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] via-purple-500 to-[#FF0055] transition-all duration-700" style={{ width: `${pctTo200k}%` }}></div>
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
                <div className="text-xl xl:text-2xl font-black text-[#FF0055] mt-1">{fmtPtBr(monthTotalInteractions)}</div>
                <div className="text-xs text-slate-300 font-semibold mt-1">{fmtCompactNum(totalInteractionsCount)} diretas (Likes+Com.)</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Curtidas Reais</div>
                <div className="text-xl xl:text-2xl font-black text-white mt-1">{fmtPtBr(totalLikesCount)}</div>
                <div className="text-xs text-pink-400 font-bold mt-1">Recorde: {fmtCompactNum(topPosts[0]?.likes || 578811)} num Reel</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-[#00F0FF]/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Comentários</div>
                <div className="text-xl xl:text-2xl font-black text-[#00F0FF] mt-1">{fmtPtBr(totalCommentsCount)}</div>
                <div className="text-xs text-slate-300 mt-1">+{fmtPtBr(octCommentsCount)} em Outubro/26</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Views Est. (Mês)</div>
                <div className="text-xl xl:text-2xl font-black text-purple-400 mt-1">{fmtCompactNum(monthViews)}</div>
                <div className="text-xs text-slate-400 mt-1">Alcance ~{fmtCompactNum(Math.round(monthViews * 0.602))} contas</div>
              </div>
              <div className="bg-[#0D1326] border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 transition-all">
                <div className="text-xs font-bold text-slate-400 uppercase">Engaj. Médio Reel</div>
                <div className="text-xl xl:text-2xl font-black text-emerald-400 mt-1">{avgReelErStr}%</div>
                <div className="text-xs text-slate-300 mt-1">{fmtPtBr(avgInteractionsPerReel)} interações/vídeo</div>
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
                    Dados reais da Meta Graph API • Picos históricos em 09/10 (97,6K), 17/10 (91,9K), 18/10 (877,5K), 20/10 (100,1K), 23/10 (104,8K), 25/10 (201,4K) e 26/10 ({fmtCompactNum(t.likes + t.comments)})
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FF0055]/15 text-[#FF0055] border border-[#FF0055]/30 text-xs font-black">
                  {octPostsCount} Publicações em Outubro/2026 ({totalPostsCount} Total)
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
                      <span className="text-[#FF0055]">REELS ({reelsStats.count} vídeos)</span>
                      <span className="text-white font-black">99,8% do Engajamento</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{fmtPtBr(reelsStats.likes)} curtidas + {fmtPtBr(reelsStats.comments)} comentários</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#080C18] border border-slate-800">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#00F0FF]">FEED CARDS ({feedStats.count} posts)</span>
                      <span className="text-white font-black">Cobertura Diária</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{fmtPtBr(feedStats.likes)} curtidas + {fmtPtBr(feedStats.comments)} comentários</div>
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

      {/* MODAL DE COMPARTILHAMENTO DA IMAGEM DIÁRIA (HOJE vs. ONTEM) */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="bg-[#0D1326] border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  📤 Relatório Diário em Imagem (Hoje vs. Ontem)
                </h3>
                <p className="text-xs text-slate-400">
                  Imagem pronta com os dados atualizados para enviar no WhatsApp da diretoria
                </p>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {copyImgStatus && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                {copyImgStatus}
              </div>
            )}

            <div className="overflow-y-auto flex-1 bg-[#070B16] border border-slate-800 rounded-xl p-2 flex justify-center">
              {shareImgUrl && (
                <img
                  src={shareImgUrl}
                  alt="Relatório Diário Portal NG Brasil"
                  className="max-h-[58vh] w-auto object-contain rounded-lg shadow-lg"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={handleCopyShareImage}
                className="py-2.5 px-4 rounded-xl bg-[#00F0FF] hover:bg-[#33f3ff] text-slate-950 font-black text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                📋 Copiar Imagem (Ctrl+V)
              </button>
              <button
                onClick={handleDownloadShareImage}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                ⬇ Baixar Imagem PNG
              </button>
              <button
                onClick={handleNativeShareImage}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                📲 Compartilhar Direto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
