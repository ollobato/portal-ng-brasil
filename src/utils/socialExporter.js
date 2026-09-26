/**
 * Utilitário para formatação e exportação de notícias para Redes Sociais e WhatsApp.
 * Portal NG Brasil - Automação Zero Custo.
 */

/**
 * Formata o texto de uma matéria para disparo no WhatsApp (Grupos e Listas de Transmissão)
 */
export function formatWhatsAppMessage(article) {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const category = (article.categoryLabel || article.category || 'Nacional').toUpperCase();
  const praca = article.praca || 'Nacional';
  
  // Limpar tags HTML do conteúdo para extrair os primeiros parágrafos se preciso
  const cleanContent = (article.content || '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250);

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
 * Formata a legenda para postagem no Instagram / Facebook
 */
export function formatInstagramCaption(article) {
  if (!article) return '';

  const title = (article.title || '').trim();
  const subtitle = (article.subtitle || '').trim();
  const category = (article.categoryLabel || article.category || 'Notícias').replace(/\s+/g, '');
  const praca = (article.praca || 'Brasil').replace(/\s+/g, '');

  return `📰 ${title}

${subtitle}

💬 Qual a sua opinião sobre este assunto? Deixe seu comentário abaixo!

🌐 Leia a matéria completa e acesse os bastidores em nosso portal:
Link na bio ou acesse: portalngbrasil.com.br

---
#PortalNGBrasil #${category} #${praca} #Noticias #JornalismoIndependente #NoticiasDoBrasil #Brasil`;
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
