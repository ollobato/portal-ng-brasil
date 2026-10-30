/**
 * Utilitário para formatação e exportação de notícias para Redes Sociais e WhatsApp.
 * Portal NG Brasil - Automação Zero Custo.
 */

/**
 * Decodifica entidades HTML comuns e numéricas
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '...')
    .replace(/&bull;/gi, '•')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extrai um resumo narrativo limpo e coeso do conteúdo da matéria do portal
 * Remove tags HTML, estilos, créditos isolados, avisos e anúncios,
 * selecionando os parágrafos principais para compor a legenda de redes sociais.
 */
export function extractArticleSummary(htmlContent, maxChars = 1100, maxParagraphs = 3) {
  if (!htmlContent || typeof htmlContent !== 'string') return '';

  // 1. Remove comentários, scripts, estilos, figuras, iframes e caixas de alerta
  const stripped = htmlContent
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div style="background-color: #f8fafc;[\s\S]*?<\/div>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<figure\b[^<]*(?:(?!<\/figure>)<[^<]*)*<\/figure>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const decoded = decodeHtmlEntities(stripped);

  // 2. Quebrar em parágrafos e limpar espaços
  const rawParagraphs = decoded.split(/\n+/);
  const cleanParagraphs = [];

  const ignorePrefixes = /^(foto|imagem|fonte|da redação|reprodução|leia também|veja mais|crédito|publicidade|redação|por|atualizado em|publicado em)[:\s]/i;

  for (const raw of rawParagraphs) {
    const p = raw.replace(/\s+/g, ' ').trim();
    if (!p) continue;
    // Ignorar avisos curtos de foto / créditos / links de navegação
    if (ignorePrefixes.test(p) && p.length < 90) {
      continue;
    }
    // Ignorar fragmentos órfãos muito curtos sem pontuação
    if (p.length < 25 && !/[.!?]$/.test(p)) {
      continue;
    }
    cleanParagraphs.push(p);
  }

  if (cleanParagraphs.length === 0) return '';

  // 3. Selecionar parágrafos narrativos principais
  const selected = [];
  let currentLength = 0;

  for (let i = 0; i < Math.min(cleanParagraphs.length, maxParagraphs); i++) {
    const p = cleanParagraphs[i];
    if (selected.length > 0 && (currentLength + p.length) > (maxChars + 150)) {
      break;
    }
    selected.push(p);
    currentLength += p.length;
    if (currentLength >= maxChars) break;
  }

  let result = selected.join('\n\n');

  // 4. Se ultrapassar o limite, truncar de forma inteligente no último ponto final
  if (result.length > maxChars) {
    const cut = result.slice(0, maxChars);
    const lastPunct = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    if (lastPunct > maxChars * 0.5) {
      result = cut.slice(0, lastPunct + 1).trim();
    } else {
      const lastSpace = cut.lastIndexOf(' ');
      result = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '...';
    }
  }

  return result.trim();
}

/**
 * Formata o texto de uma matéria para disparo no WhatsApp (Grupos e Listas de Transmissão)
 */
export function formatWhatsAppMessage(article) {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const category = (article.categoryLabel || article.category || 'Nacional').toUpperCase();
  const praca = article.praca || 'Nacional';
  
  const cleanContent = extractArticleSummary(article.content, 320, 1) || subtitle;

  const siteUrl = window.location.origin || 'https://portalngbrasil.com.br';
  const articleUrl = `${siteUrl}/#noticia-${article.id || Date.now()}`;

  return `🔴 *PORTAL NG BRASIL* | _${category} - ${praca}_

*${title}*

${subtitle}

_${cleanContent}..._

📖 *Leia a matéria completa no site:*
👉 ${articleUrl}

---
📲 *Inscreva-se em nosso canal oficial de notícias no WhatsApp:*
https://chat.whatsapp.com/portalngbrasil`;
}

/**
 * Abre diretamente o aplicativo do WhatsApp / WhatsApp Web pré-preenchido
 */
export function shareToWhatsApp(article) {
  const text = formatWhatsAppMessage(article);
  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}

/**
 * Formata a legenda para postagem no Instagram / Facebook com o resumo do texto do portal
 */
export function formatInstagramCaption(article) {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const category = (article.categoryLabel || article.category || 'Notícias').replace(/\s+/g, '');
  const praca = (article.praca || 'Brasil').replace(/\s+/g, '');

  const summary = extractArticleSummary(article.content, 1100, 3);

  const sections = [];

  // Título da notícia
  if (title) {
    sections.push(`📰 ${title}`);
  }

  // Subtítulo (se não for cópia do título)
  if (subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    sections.push(subtitle);
  }

  // Resumo extraído do texto do portal
  if (summary) {
    let cleanSummary = summary;
    if (subtitle && cleanSummary.toLowerCase().startsWith(subtitle.toLowerCase())) {
      cleanSummary = cleanSummary.slice(subtitle.length).replace(/^[:\s\-–—]+/, '').trim();
    } else if (title && cleanSummary.toLowerCase().startsWith(title.toLowerCase())) {
      cleanSummary = cleanSummary.slice(title.length).replace(/^[:\s\-–—]+/, '').trim();
    }
    if (cleanSummary) {
      sections.push(cleanSummary);
    }
  }

  // Chamada para interação e link do portal
  sections.push(
    `💬 Qual a sua opinião sobre este assunto? Deixe seu comentário abaixo!\n\n` +
    `🌐 Leia a matéria completa e acesse os bastidores em nosso portal:\n` +
    `Link na bio ou acesse: portalngbrasil.com.br\n\n` +
    `---\n` +
    `#PortalNGBrasil #${category} #${praca} #Noticias #JornalismoIndependente #NoticiasDoBrasil #Brasil`
  );

  return sections.join('\n\n');
}

/**
 * Formata uma legenda curta, magnética e de alto impacto para a Página do Facebook
 * Projetada especificamente para acompanhar o Link Preview nativo (card clicável do portal).
 */
export function formatFacebookCaption(article, shareUrl = '') {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const hook = (article.jogada || article.metadata?.jogada || '').trim();
  const rawCat = (article.categoryLabel || article.category || '').toLowerCase();
  const linkLine = shareUrl || (article.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br');

  // Seleciona badge/emoji temático de urgência e apelo editorial
  let badge = '🚨 URGENTE';
  if (rawCat.includes('pol') || rawCat.includes('brasil')) {
    badge = '🇧🇷 ATENÇÃO';
  } else if (rawCat.includes('econ') || rawCat.includes('dinheiro') || rawCat.includes('agro')) {
    badge = '📊 IMPACTO';
  } else if (rawCat.includes('just') || rawCat.includes('stf') || rawCat.includes('lei') || rawCat.includes('polic') || rawCat.includes('segur')) {
    badge = '⚖️ BASTIDORES';
  } else if (rawCat.includes('mundo') || rawCat.includes('inter')) {
    badge = '🌍 MUNDO';
  }

  const sections = [];

  // 1. Gancho de abertura chamativo com título
  if (title) {
    sections.push(`${badge} | ${title}`);
  }

  // 2. Frase de apoio provocativa (jogada editorial ou subtítulo) que instiga a curiosidade sem entregar o spoiler completo
  if (hook && hook.toLowerCase() !== title.toLowerCase()) {
    sections.push(hook);
  } else if (subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    const cleanSub = subtitle.split(/\. |\.\n/)[0].trim();
    sections.push(cleanSub.endsWith('.') ? cleanSub : `${cleanSub}.`);
  }

  // 3. Chamada direta de clique para ler a matéria no portal
  sections.push(
    `👉 Veja todos os detalhes e os bastidores na reportagem completa:\n🔗 ${linkLine}`
  );

  return sections.join('\n\n');
}

/**
 * Formata o texto para postagem no Threads (Limite estrito de 500 caracteres da API)
 */
export function formatThreadsCaption(article, shareUrl = '') {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const linkLine = shareUrl || `https://portalngbrasil.com.br/#/noticia/${article.id || ''}`;
  const category = (article.categoryLabel || article.category || 'Notícias').replace(/\s+/g, '');
  const tags = `#PortalNGBrasil #${category}`;

  const footer = `\n\n👉 Leia a matéria completa:\n${linkLine}\n\n${tags}`;
  const maxAvailableForBody = 495 - footer.length;

  let body = `🚨 ${title}`;
  if (subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    const combined = `${body}\n\n${subtitle}`;
    if (combined.length <= maxAvailableForBody) {
      body = combined;
    } else if (body.length < maxAvailableForBody - 20) {
      const allowedSub = maxAvailableForBody - body.length - 7;
      body = `${body}\n\n${subtitle.slice(0, allowedSub).trim()}...`;
    }
  }

  if (body.length > maxAvailableForBody) {
    body = body.slice(0, maxAvailableForBody - 3).trim() + '...';
  }

  return (body + footer).trim();
}

/**
 * Formata o texto para postagem no LinkedIn (Company Page / Organização)
 * Tom analítico, direto e corporativo (estilo Forbes / CNN Brasil).
 */
export function formatLinkedInCaption(article, shareUrl = '') {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const linkLine = shareUrl || (article.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br');
  const summary = extractArticleSummary(article.content, 900, 2);

  const sections = [];

  if (title) {
    sections.push(`📌 ${title}`);
  }

  if (subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    sections.push(subtitle);
  }

  if (summary) {
    let cleanSummary = summary;
    if (subtitle && cleanSummary.toLowerCase().startsWith(subtitle.toLowerCase())) {
      cleanSummary = cleanSummary.slice(subtitle.length).replace(/^[:\s\-–—]+/, '').trim();
    }
    if (cleanSummary) {
      sections.push(cleanSummary);
    }
  }

  sections.push(
    `🔗 Confira a análise e a cobertura completa no Portal NG Brasil:\n${linkLine}\n\n` +
    `#PortalNGBrasil #Economia #Politica #Negocios #Agronegocio #Jornalismo`
  );

  return sections.join('\n\n');
}

/**
 * Calcula o tamanho real de um tweet no X (Twitter), onde URLs ocupam sempre 23 caracteres (t.co)
 */
export function calculateXTweetLength(text) {
  if (!text) return 0;
  // Substitui qualquer URL http/https por 23 caracteres para contagem precisa do X
  const normalized = text.replace(/https?:\/\/\S+/gi, 'x'.repeat(23));
  return normalized.length;
}

/**
 * Formata o texto para postagem no X (antigo Twitter) - Limite estrito de 280 caracteres
 * Focado em agilidade, manchete impactante, gancho, link com Twitter Card e hashtags.
 */
export function formatXCaption(article, shareUrl = '') {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const rawCat = (article.categoryLabel || article.category || '').toLowerCase();
  const linkLine = shareUrl || (article.id ? `https://portalngbrasil.com.br/share.php?id=${article.id}` : 'https://portalngbrasil.com.br');

  // Badge jornalístico de urgência/tema
  let badge = '🚨 URGENTE';
  if (rawCat.includes('pol') || rawCat.includes('brasil')) {
    badge = '🇧🇷 ATENÇÃO';
  } else if (rawCat.includes('econ') || rawCat.includes('agro') || rawCat.includes('dinheiro')) {
    badge = '📊 ECONOMIA';
  } else if (rawCat.includes('just') || rawCat.includes('stf') || rawCat.includes('segur') || rawCat.includes('polic')) {
    badge = '⚖️ BASTIDORES';
  } else if (rawCat.includes('mundo') || rawCat.includes('inter')) {
    badge = '🌍 MUNDO';
  }

  const tags = '#PortalNGBrasil #Brasil';
  // No X, uma URL sempre conta 23 caracteres (t.co)
  const urlCost = 23;
  // Estrutura:
  // [Headline]
  //
  // [Subtítulo/Gancho]
  //
  // 🔗 [Link] [Tags]
  const footerPattern = `\n\n🔗 ${linkLine} ${tags}`;
  const fixedOverhead = `\n\n🔗  ${tags}`.length + urlCost;
  const maxAvailableForText = 280 - fixedOverhead; // ~235 caracteres para headline + apoio

  let headline = `${badge}: ${title}`;
  if (headline.length > maxAvailableForText) {
    headline = headline.slice(0, maxAvailableForText - 3).trim() + '...';
    return `${headline}${footerPattern}`;
  }

  const remaining = maxAvailableForText - headline.length - 2; // -2 para o \n\n
  let body = headline;

  if (remaining > 35 && subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    let cleanSub = subtitle.split(/\. |\.\n/)[0].trim();
    if (!cleanSub.endsWith('.')) cleanSub += '.';

    if (cleanSub.length <= remaining) {
      body = `${headline}\n\n${cleanSub}`;
    } else if (remaining > 45) {
      body = `${headline}\n\n${cleanSub.slice(0, remaining - 3).trim()}...`;
    }
  }

  return `${body}${footerPattern}`;
}

/**
 * Copia um texto para a área de transferência do usuário
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  } catch (err) {
    console.error('Falha ao copiar:', err);
    return false;
  }
}
