import React, { useState } from 'react';
import { X, Mail, CheckCircle, Sparkles } from 'lucide-react';

export default function NewsletterModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [topics, setTopics] = useState({
    brasil: true,
    politica: true,
    tecnologia: true,
    saude: false,
    turismo: false,
    entretenimento: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      
      <div 
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto p-6 sm:p-8 relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {!subscribed ? (
          <div className="space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Newsletter Exclusiva
              </div>
              <h2 className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white">
                NG Resumo da Manhã
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                Receba diariamente às 07h00 as notícias mais relevantes sobre o Brasil, Política, Saúde e Tecnologia diretamente na sua caixa de entrada.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  Escolha suas Editorias Favoritas:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'brasil', label: '📰 Brasil' },
                    { id: 'politica', label: '🏛️ Política' },
                    { id: 'tecnologia', label: '💻 Tecnologia' },
                    { id: 'saude', label: '❤️ Saúde' },
                    { id: 'turismo', label: '✈️ Turismo' },
                    { id: 'entretenimento', label: '🎭 Cultura' }
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTopics({ ...topics, [t.id]: !topics[t.id] })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        topics[t.id]
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Seu melhor E-mail:
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@email.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full btn-emerald py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md"
              >
                Inscrever-se Gratuita e Instantaneamente
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Respeitamos sua privacidade. Cancele a inscrição quando quiser com um único clique.
              </p>
            </form>

          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
              Inscrição Confirmada com Sucesso!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              Enviamos um e-mail de boas-vindas para <span className="font-bold text-emerald-500">{email}</span>. Você já está pronto para receber os destaques do Portal NG Brasil.
            </p>
            <button 
              onClick={onClose}
              className="btn-emerald px-6 py-2.5 rounded-xl text-xs font-bold"
            >
              Concluir
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
