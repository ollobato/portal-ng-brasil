// Validador de leads comerciais (landing /anuncie/).
// Cópia CommonJS de landing-anuncie/src/lib/lead-schema.mjs — mantenha os dois sincronizados.
const goals = ['Conhecimento da marca', 'Visitas e contatos', 'Vendas de um produto', 'Patrocínio recorrente'];

function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.websiteTrap) return { error: 'Dados inválidos.' };
  const clean = (key, max) => (typeof input[key] === 'string' ? input[key].trim().slice(0, max) : '');
  const data = {
    requestId: clean('requestId', 36),
    name: clean('name', 100),
    company: clean('company', 180),
    email: clean('email', 180),
    phone: clean('phone', 30).replace(/[^0-9+()\-\s]/g, ''),
    goal: clean('goal', 50),
    region: clean('region', 100),
    budget: clean('budget', 50),
    message: clean('message', 1500),
  };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId)) return { error: 'Identificador de envio inválido.' };
  if (data.name.length < 2 || data.company.length < 2) return { error: 'Informe seu nome e sua empresa.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: 'Informe um e-mail válido.' };
  if (data.phone && !/^\d{10,15}$/.test(data.phone.replace(/\D/g, ''))) return { error: 'Informe um WhatsApp válido com DDD ou deixe em branco.' };
  if (!goals.includes(data.goal)) return { error: 'Escolha o objetivo da campanha.' };
  if (input.consent !== true) return { error: 'Autorize o contato sobre a proposta.' };
  const utm = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    if (typeof input.utm?.[key] === 'string') utm[key] = input.utm[key].slice(0, 180);
  }
  return { data: { ...data, consent: true, consentVersion: 'commercial-contact-v1', offer: 'piloto-1990', utm, status: 'novo' } };
}

module.exports = { goals, validateLead };
