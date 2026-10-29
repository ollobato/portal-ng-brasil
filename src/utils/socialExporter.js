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
 * Formata a legenda para postagem na Página do Facebook com link clicável da matéria
 */
export function formatFacebookCaption(article, shareUrl = '') {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const category = (article.categoryLabel || article.category || 'Notícias').replace(/\s+/g, '');
  const praca = (article.praca || 'Brasil').replace(/\s+/g, '');
  const linkLine = shareUrl || `https://portalngbrasil.com.br/#/noticia/${article.id || ''}`;

  const summary = extractArticleSummary(article.content, 1200, 3);

  const sections = [];

  if (title) {
    sections.push(`📰 ${title}`);
  }

  if (subtitle && subtitle.toLowerCase() !== title.toLowerCase()) {
    sections.push(subtitle);
  }

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

  sections.push(
    `📖 Leia a matéria completa no Portal NG Brasil:\n👉 ${linkLine}\n\n---\n#PortalNGBrasil #${category} #${praca} #Noticias #Brasil`
  );

  return sections.join('\n\n');
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
