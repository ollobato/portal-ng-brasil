import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, setDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';
import { Search, X, Mail, MessageCircle, Calendar, Clock, Download, Trash2, TrendingUp, Users, LayoutGrid, List, Copy, Building2, AlertTriangle, Loader2, Megaphone, PlusCircle } from 'lucide-react';

// CRM Comercial — gerencia os contatos captados pela landing /anuncie/ (coleção `commercial_leads`).
// Leads são criados somente pela Cloud Function `receiveCommercialLead`; aqui o time comercial
// acompanha o funil, registra notas, valores e follow-ups. Acesso restrito pelas regras do Firestore.

export const CRM_STATUSES = [
  { id: 'novo', label: 'Novo', color: 'bg-sky-100 text-sky-800 border-sky-200', bar: 'bg-sky-500' },
  { id: 'contatado', label: 'Contatado', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', bar: 'bg-indigo-500' },
  { id: 'proposta', label: 'Proposta enviada', color: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-purple-100 text-purple-800 border-purple-200', bar: 'bg-purple-500' },
  { id: 'ganho', label: 'Fechado (ganho)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-slate-200 text-slate-700 border-slate-300', bar: 'bg-slate-400' },
];
const statusOf = (id) => CRM_STATUSES.find((s) => s.id === id) || CRM_STATUSES[0];
const OPEN_STATUSES = ['novo', 'contatado', 'proposta', 'negociacao'];
const DAY = 86400000;

const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null);
const fmtDateTime = (d) => (d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDay = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const money = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const digits = (s) => (s || '').replace(/\D/g, '');
export const whatsappLink = (phone, text) => {
  let n = digits(phone);
  if (n.length < 10) return null;
  if (n.length <= 11) n = `55${n}`;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export function leadsToCsv(leads) {
  const cols = [
    ['Protocolo', (l) => l.id], ['Data', (l) => fmtDateTime(l._created)], ['Status', (l) => statusOf(l.status).label],
    ['Nome', (l) => l.name], ['Empresa', (l) => l.company], ['E-mail', (l) => l.email], ['WhatsApp', (l) => l.phone],
    ['Objetivo', (l) => l.goal], ['Região', (l) => l.region], ['Investimento previsto', (l) => l.budget],
    ['Valor negociado (R$)', (l) => l.dealValue || ''], ['Responsável', (l) => l.owner], ['Próximo follow-up', (l) => fmtDay(l.nextActionAt)],
    ['Origem (utm_source)', (l) => l.utm?.utm_source], ['Campanha (utm_campaign)', (l) => l.utm?.utm_campaign], ['Mensagem', (l) => l.message],
    ['Motivo da perda', (l) => l.lostReason],
  ];
  // Evita injeção de fórmulas no Excel (=,+,-,@) e escapa aspas.
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  return [cols.map((c) => cell(c[0])).join(';'), ...leads.map((l) => cols.map((c) => cell(c[1](l))).join(';'))].join('\r\n');
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'text-slate-900' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = statusOf(status);
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${s.color}`}>{s.label}</span>;
}

function LeadCard({ lead, onOpen, onDragStart, alert }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(lead.id); }}
      onClick={() => onOpen(lead.id)}
      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">{lead.company}</div>
          <div className="text-xs text-slate-600 truncate">{lead.name}</div>
        </div>
        {alert && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" title={alert} />}
      </div>
      <div className="mt-2 text-[11px] text-slate-500 truncate">{lead.goal}</div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>{lead._created ? lead._created.toLocaleDateString('pt-BR') : '—'}</span>
        {lead.dealValue ? <span className="font-bold text-emerald-700">{money(lead.dealValue)}</span> : lead.budget ? <span className="truncate max-w-[110px]">{lead.budget}</span> : null}
      </div>
    </div>
  );
}

function LeadDrawer({ lead, onClose, onChangeStatus, showToast }) {
  const [form, setForm] = useState({ owner: lead.owner || '', dealValue: lead.dealValue || '', nextActionAt: lead.nextActionAt || '', lostReason: lead.lostReason || '' });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = doc(db, 'commercial_leads', lead.id);
  const by = auth.currentUser?.email || 'admin';
  const wa = whatsappLink(lead.phone, `Olá, ${lead.name}! Aqui é do Portal NG Brasil. Recebemos o seu interesse em anunciar e gostaríamos de conversar sobre a proposta.`);
  const mail = `mailto:${lead.email}?subject=${encodeURIComponent('Proposta de anúncio — Portal NG Brasil')}&body=${encodeURIComponent(`Olá, ${lead.name}!\n\nRecebemos o interesse da ${lead.company} em anunciar no Portal NG Brasil. Podemos conversar sobre a proposta?\n\nAbraços,\nEquipe Comercial — Portal NG Brasil`)}`;

  useEffect(() => { setForm({ owner: lead.owner || '', dealValue: lead.dealValue || '', nextActionAt: lead.nextActionAt || '', lostReason: lead.lostReason || '' }); }, [lead.id]);

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(ref, sanitizeForFirestore({
        owner: form.owner.trim().slice(0, 80), dealValue: Number(String(form.dealValue).replace(',', '.')) || 0,
        nextActionAt: form.nextActionAt || '', lostReason: form.lostReason.trim().slice(0, 300), updatedAt: serverTimestamp(),
      }));
      showToast?.('Lead atualizado.');
    } catch (e) { showToast?.('Erro ao salvar: ' + (e.code || e.message), 'error'); }
    setSaving(false);
  };
  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    try {
      await updateDoc(ref, { activity: arrayUnion({ type: 'note', text: text.slice(0, 1000), at: new Date().toISOString(), by }), updatedAt: serverTimestamp() });
      setNote('');
    } catch (e) { showToast?.('Erro ao salvar nota: ' + (e.code || e.message), 'error'); }
  };
  const remove = async () => {
    if (!window.confirm(`Excluir definitivamente o lead de ${lead.company}? Esta ação não pode ser desfeita.`)) return;
    try { await deleteDoc(ref); onClose(); } catch (e) { showToast?.('Erro ao excluir: ' + (e.code || e.message), 'error'); }
  };
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => showToast?.('Copiado.'));
  const activity = [...(lead.activity || [])].reverse();
  const input = 'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d40a38]';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={onClose}>
      <aside className="w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Lead ${lead.company}`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 truncate">{lead.company}</h2>
            <p className="text-sm text-slate-600 truncate">{lead.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex flex-wrap gap-2">
            <a href={mail} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700"><Mail className="w-4 h-4" />E-mail</a>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"><MessageCircle className="w-4 h-4" />WhatsApp</a>}
            <button onClick={() => copy(`${lead.name} — ${lead.company}\n${lead.email}${lead.phone ? `\n${lead.phone}` : ''}`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"><Copy className="w-4 h-4" />Copiar contato</button>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Etapa do funil</label>
            <select value={lead.status || 'novo'} onChange={(e) => onChangeStatus(lead, e.target.value)} className={input}>
              {CRM_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2"><dt className="text-[11px] font-bold uppercase text-slate-500">E-mail</dt><dd className="text-slate-900 break-all">{lead.email}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-slate-500">WhatsApp</dt><dd className="text-slate-900">{lead.phone || '—'}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-slate-500">Recebido em</dt><dd className="text-slate-900">{fmtDateTime(lead._created)}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-slate-500">Objetivo</dt><dd className="text-slate-900">{lead.goal}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-slate-500">Região</dt><dd className="text-slate-900">{lead.region || '—'}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-slate-500">Investimento previsto</dt><dd className="text-slate-900">{lead.budget || 'Prefere conversar'}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase text-slate-500">Origem</dt><dd className="text-slate-900">{lead.utm?.utm_source || 'Direto'}{lead.utm?.utm_campaign ? ` / ${lead.utm.utm_campaign}` : ''}</dd></div>
            {lead.message && <div className="col-span-2"><dt className="text-[11px] font-bold uppercase text-slate-500">Briefing</dt><dd className="text-slate-900 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1">{lead.message}</dd></div>}
            <div className="col-span-2 text-[11px] text-slate-500">Protocolo: {lead.id} · Consentimento: {lead.consentVersion || '—'}</div>
          </dl>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Responsável</label><input className={input} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Nome" maxLength={80} /></div>
            <div><label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Valor negociado (R$)</label><input className={input} inputMode="decimal" value={form.dealValue} onChange={(e) => setForm({ ...form, dealValue: e.target.value })} placeholder="1990" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Próximo follow-up</label><input type="date" className={input} value={form.nextActionAt} onChange={(e) => setForm({ ...form, nextActionAt: e.target.value })} /></div>
            {lead.status === 'perdido' && <div className="col-span-2"><label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Motivo da perda</label><input className={input} value={form.lostReason} onChange={(e) => setForm({ ...form, lostReason: e.target.value })} maxLength={300} /></div>}
            <div className="col-span-2"><button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-[#d40a38] text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60">{saving ? 'Salvando…' : 'Salvar alterações'}</button></div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase text-slate-500 mb-2">Histórico e notas</h3>
            <div className="flex gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={input} placeholder="Registrar contato, retorno do cliente, combinados…" />
              <button onClick={addNote} disabled={!note.trim()} className="px-3 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-40">Adicionar</button>
            </div>
            <ul className="mt-3 space-y-2">
              {activity.length === 0 && <li className="text-xs text-slate-500">Nenhuma atividade registrada.</li>}
              {activity.map((a, i) => (
                <li key={i} className="text-sm border-l-2 border-slate-300 pl-3">
                  <div className="text-[11px] text-slate-500">{fmtDateTime(toDate(a.at))} · {a.by}</div>
                  <div className={a.type === 'status' ? 'text-slate-600 italic' : 'text-slate-900 whitespace-pre-wrap'}>{a.text}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button onClick={remove} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" />Excluir lead</button>
          </div>
        </div>
      </aside>
    </div>
  );
}


function NewLeadModal({ open, onClose, showToast }) {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    status: 'novo',
    goal: 'Visitas e contatos',
    region: 'Brasil inteiro',
    budget: 'Piloto de R$ 1.990',
    dealValue: '1990',
    owner: auth.currentUser?.email?.split('@')[0] || 'Comercial',
    nextActionAt: todayISO(),
    message: '',
    source: 'Prospecção direta / CRM'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.name.trim() || !formData.email.trim()) {
      setError('Preencha os campos obrigatórios (Empresa, Nome e E-mail).');
      return;
    }
    setSubmitting(true);
    setError('');
    const requestId = crypto.randomUUID();
    const leadRef = doc(db, 'commercial_leads', requestId);
    const by = auth.currentUser?.email || 'admin';
    const nowIso = new Date().toISOString();

    const clean = (val) => (typeof val === 'string' ? val.trim() : '');

    const leadDoc = sanitizeForFirestore({
      requestId,
      company: clean(formData.company).slice(0, 180),
      name: clean(formData.name).slice(0, 100),
      email: clean(formData.email).slice(0, 180),
      phone: clean(formData.phone).slice(0, 30),
      status: formData.status || 'novo',
      goal: formData.goal || 'Visitas e contatos',
      region: clean(formData.region).slice(0, 100) || 'Brasil inteiro',
      budget: formData.budget || 'Piloto de R$ 1.990',
      dealValue: Number(String(formData.dealValue).replace(',', '.')) || 0,
      owner: clean(formData.owner).slice(0, 80) || 'Comercial',
      nextActionAt: formData.nextActionAt || '',
      message: clean(formData.message).slice(0, 1500),
      consent: true,
      consentVersion: 'commercial-contact-v1',
      offer: 'piloto-1990',
      utm: {
        utm_source: clean(formData.source).slice(0, 80) || 'crm-manual',
        utm_medium: 'painel-admin',
        utm_campaign: 'cadastro-direto',
        utm_content: ''
      },
      activity: [
        {
          type: 'status',
          text: `Lead cadastrado manualmente no CRM na etapa: ${statusOf(formData.status).label}`,
          at: nowIso,
          by
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      await setDoc(leadRef, leadDoc);
      showToast?.('Novo lead cadastrado com sucesso no CRM!');
      onClose();
    } catch (err) {
      console.error('Erro ao criar lead:', err);
      setError('Erro ao salvar no Firestore: ' + (err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = 'w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d40a38] transition-all';
  const labelStyle = 'block text-[11px] font-bold uppercase text-slate-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Cadastrar Novo Lead Comercial"
      >
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 font-heading">Novo Lead Comercial</h2>
              <p className="text-xs text-slate-500">Cadastre uma nova oportunidade diretamente no funil de vendas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Empresa / Marca <span className="text-red-500">*</span></label>
              <input 
                required
                className={inputStyle}
                placeholder="Ex.: Padaria Estrela"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                autoFocus
              />
            </div>

            <div>
              <label className={labelStyle}>Nome do Contato <span className="text-red-500">*</span></label>
              <input 
                required
                className={inputStyle}
                placeholder="Ex.: Maria Souza"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>E-mail Profissional <span className="text-red-500">*</span></label>
              <input 
                type="email"
                required
                className={inputStyle}
                placeholder="maria@empresa.com.br"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>WhatsApp / Telefone (com DDD)</label>
              <input 
                type="tel"
                className={inputStyle}
                placeholder="(54) 99999-1234"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>Etapa Inicial do Funil</label>
              <select 
                className={inputStyle}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {CRM_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Objetivo da Campanha</label>
              <select 
                className={inputStyle}
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              >
                <option>Visitas e contatos</option>
                <option>Conhecimento da marca</option>
                <option>Vendas de um produto</option>
                <option>Patrocínio recorrente</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Investimento Previsto</label>
              <select 
                className={inputStyle}
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              >
                <option>Piloto de R$ 1.990</option>
                <option>De R$ 2.500 a R$ 5.000</option>
                <option>Acima de R$ 5.000</option>
                <option>Prefiro conversar</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Valor Negociado (R$)</label>
              <input 
                inputMode="decimal"
                className={inputStyle}
                placeholder="1990"
                value={formData.dealValue}
                onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>Responsável Comercial</label>
              <input 
                className={inputStyle}
                placeholder="Nome do operador/vendedor"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>Data do Próximo Follow-up</label>
              <input 
                type="date"
                className={inputStyle}
                value={formData.nextActionAt}
                onChange={(e) => setFormData({ ...formData, nextActionAt: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>Região de Atuação</label>
              <input 
                className={inputStyle}
                placeholder="Ex.: Rio Grande do Sul, Nacional..."
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>

            <div>
              <label className={labelStyle}>Origem / Canal</label>
              <input 
                className={inputStyle}
                placeholder="Ex.: Direct Instagram, WhatsApp, Indicação..."
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelStyle}>Briefing / Observações Iniciais</label>
              <textarea 
                rows={3}
                className={inputStyle}
                placeholder="Detalhes sobre a marca, oferta pretendida, público-alvo ou combinados prévios..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando Lead...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Salvar Lead no CRM
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CommercialCRM({ showToast, isNewLeadOpen: externalNewLeadOpen, setIsNewLeadOpen: setExternalNewLeadOpen }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('kanban');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('all');
  const [fGoal, setFGoal] = useState('all');
  const [fPeriod, setFPeriod] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [internalNewLeadOpen, setInternalNewLeadOpen] = useState(false);
  const isNewLeadModalOpen = externalNewLeadOpen !== undefined ? externalNewLeadOpen : internalNewLeadOpen;
  const setIsNewLeadModalOpen = setExternalNewLeadOpen || setInternalNewLeadOpen;

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'commercial_leads'), orderBy('createdAt', 'desc')),
      (snap) => {
        setLeads(snap.docs.map((d) => { const x = d.data(); return { ...x, id: d.id, status: x.status || 'novo', _created: toDate(x.createdAt) }; }));
        setLoading(false); setError('');
      },
      (err) => { setError(err.code === 'permission-denied' ? 'Sem permissão para ler os leads. Faça login novamente com uma conta autorizada.' : `Erro ao carregar leads: ${err.code || err.message}`); setLoading(false); }
    );
    return unsub;
  }, []);

  const goals = useMemo(() => [...new Set(leads.map((l) => l.goal).filter(Boolean))], [leads]);
  const now = Date.now();
  const alertOf = (l) => {
    if (!OPEN_STATUSES.includes(l.status)) return '';
    if (l.nextActionAt && l.nextActionAt < todayISO()) return 'Follow-up vencido';
    if (l.status === 'novo' && l._created && now - l._created.getTime() > DAY) return 'Novo há mais de 24h sem contato';
    return '';
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const since = fPeriod === 'all' ? 0 : now - Number(fPeriod) * DAY;
    return leads.filter((l) =>
      (fStatus === 'all' || l.status === fStatus) && (fGoal === 'all' || l.goal === fGoal) && (!since || (l._created && l._created.getTime() >= since)) &&
      (!term || [l.name, l.company, l.email, l.phone, l.message, l.owner, l.utm?.utm_source].some((v) => (v || '').toLowerCase().includes(term)))
    );
  }, [leads, q, fStatus, fGoal, fPeriod]);

  const kpi = useMemo(() => {
    const won = leads.filter((l) => l.status === 'ganho'), lost = leads.filter((l) => l.status === 'perdido');
    const closed = won.length + lost.length;
    return {
      total: leads.length,
      week: leads.filter((l) => l._created && now - l._created.getTime() <= 7 * DAY).length,
      open: leads.filter((l) => OPEN_STATUSES.includes(l.status)).length,
      pipeline: leads.filter((l) => ['proposta', 'negociacao'].includes(l.status)).reduce((s, l) => s + (Number(l.dealValue) || 0), 0),
      wonValue: won.reduce((s, l) => s + (Number(l.dealValue) || 0), 0),
      conversion: closed ? Math.round((won.length / closed) * 100) : null,
      alerts: leads.filter((l) => alertOf(l)).length,
    };
  }, [leads]);

  const changeStatus = async (lead, status) => {
    if (!status || lead.status === status) return;
    try {
      const by = auth.currentUser?.email || 'admin';
      await updateDoc(doc(db, 'commercial_leads', lead.id), {
        status, updatedAt: serverTimestamp(),
        ...(status !== 'novo' && lead.status === 'novo' ? { lastContactAt: serverTimestamp() } : {}),
        activity: arrayUnion({ type: 'status', text: `Etapa alterada: ${statusOf(lead.status).label} → ${statusOf(status).label}`, at: new Date().toISOString(), by }),
      });
    } catch (e) { showToast?.('Erro ao mover lead: ' + (e.code || e.message), 'error'); }
  };

  const exportCsv = () => {
    const blob = new Blob(['\ufeff' + leadsToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads-comerciais-${todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const openLead = leads.find((l) => l.id === openId);
  const sel = 'px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d40a38]';

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin" />Carregando leads…</div>;

  return (
    <div className="space-y-4 max-w-[1600px]">
      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard icon={Users} label="Leads" value={kpi.total} hint={`${kpi.week} nos últimos 7 dias`} />
        <KpiCard icon={Megaphone} label="Em andamento" value={kpi.open} />
        <KpiCard icon={TrendingUp} label="Pipeline" value={money(kpi.pipeline)} hint="Proposta + negociação" />
        <KpiCard icon={Building2} label="Fechado" value={money(kpi.wonValue)} tone="text-emerald-700" />
        <KpiCard icon={TrendingUp} label="Conversão" value={kpi.conversion === null ? '—' : `${kpi.conversion}%`} hint="Ganhos ÷ encerrados" />
        <KpiCard icon={AlertTriangle} label="Atenção" value={kpi.alerts} hint="Follow-ups/novos atrasados" tone={kpi.alerts ? 'text-amber-600' : 'text-slate-900'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa, nome, e-mail…" className={`${sel} w-full pl-9`} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={sel} aria-label="Filtrar por etapa"><option value="all">Todas as etapas</option>{CRM_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <select value={fGoal} onChange={(e) => setFGoal(e.target.value)} className={sel} aria-label="Filtrar por objetivo"><option value="all">Todos os objetivos</option>{goals.map((g) => <option key={g}>{g}</option>)}</select>
        <select value={fPeriod} onChange={(e) => setFPeriod(e.target.value)} className={sel} aria-label="Filtrar por período"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select>
        <div className="flex border border-slate-300 rounded-lg overflow-hidden ml-auto">
          <button onClick={() => setView('kanban')} className={`px-3 py-2 ${view === 'kanban' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`} title="Funil" aria-label="Visão funil"><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView('lista')} className={`px-3 py-2 ${view === 'lista' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`} title="Lista" aria-label="Visão lista"><List className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setIsNewLeadModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"><PlusCircle className="w-4 h-4" /><span>Novo Lead</span></button>
        <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="w-4 h-4" />Exportar CSV</button>
      </div>

      {leads.length === 0 && !error && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500">
          <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="font-bold text-slate-700">Nenhum lead ainda</p>
          <p className="text-sm">As solicitações enviadas pela página <a href="/anuncie/" target="_blank" rel="noopener noreferrer" className="underline">/anuncie/</a> aparecem aqui em tempo real.</p>
        </div>
      )}

      {leads.length > 0 && view === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {CRM_STATUSES.map((col) => {
            const items = filtered.filter((l) => l.status === col.id);
            return (
              <section
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => { e.preventDefault(); const lead = leads.find((l) => l.id === (dragId || e.dataTransfer.getData('text/plain'))); setOverCol(null); setDragId(null); if (lead) changeStatus(lead, col.id); }}
                className={`w-72 shrink-0 rounded-xl border ${overCol === col.id ? 'border-[#d40a38] bg-red-50/40' : 'border-slate-200 bg-slate-100/70'} flex flex-col max-h-[calc(100vh-330px)] min-h-[200px]`}
                aria-label={`Coluna ${col.label}`}
              >
                <header className="px-3 py-2.5 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${col.bar}`} /><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">{col.label}</h3></div>
                  <span className="text-xs font-bold text-slate-500">{items.length}</span>
                </header>
                <div className="p-2 space-y-2 overflow-y-auto">
                  {items.map((l) => <LeadCard key={l.id} lead={l} alert={alertOf(l)} onOpen={setOpenId} onDragStart={setDragId} />)}
                  {items.length === 0 && <p className="text-[11px] text-center text-slate-400 py-4">Solte um lead aqui</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {leads.length > 0 && view === 'lista' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>{['Recebido', 'Empresa', 'Contato', 'Objetivo', 'Etapa', 'Valor', 'Follow-up', 'Responsável'].map((h) => <th key={h} className="text-left px-3 py-2.5 font-bold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => setOpenId(l.id)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmtDateTime(l._created)}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900">{l.company}{alertOf(l) && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-amber-500" title={alertOf(l)} />}</td>
                  <td className="px-3 py-2.5"><div className="text-slate-900">{l.name}</div><div className="text-xs text-slate-500">{l.email}</div></td>
                  <td className="px-3 py-2.5 text-slate-600">{l.goal}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                  <td className="px-3 py-2.5 text-slate-700">{l.dealValue ? money(l.dealValue) : '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600"><Calendar className="inline w-3 h-3 mr-1" />{fmtDay(l.nextActionAt)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{l.owner || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500"><Clock className="inline w-4 h-4 mr-1" />Nenhum lead com esses filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {openLead && <LeadDrawer lead={openLead} onClose={() => setOpenId(null)} onChangeStatus={changeStatus} showToast={showToast} />}
      <NewLeadModal open={isNewLeadModalOpen} onClose={() => setIsNewLeadModalOpen(false)} showToast={showToast} />
    </div>
  );
}
