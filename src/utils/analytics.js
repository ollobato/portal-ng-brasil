/**
 * Utilitário de Rastreamento (Google Analytics / GTM)
 * Prepara o tagueamento do site inteiro.
 */

export const trackEvent = (category, action, label = '', value = null) => {
  // Console log apenas para ambiente de desenvolvimento / debug
  console.log(`[Analytics] Evento Disparado -> Categoria: ${category} | Ação: ${action} | Label: ${label} | Valor: ${value}`);

  // Estrutura padrão para dataLayer do Google Tag Manager (GTM) ou gtag(GA4)
  if (typeof window !== 'undefined') {
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
    
    // Suporte para Google Tag Manager
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'custom_event',
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
        eventValue: value
      });
    }
  }
};
