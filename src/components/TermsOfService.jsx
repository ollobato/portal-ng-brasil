import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800">
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center gap-2 text-slate-500 hover:text-[#006644] font-bold mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a página inicial
      </button>

      <h1 className="text-3xl font-black font-heading text-[#040f1d] mb-4">Termos de Serviço</h1>
      <p className="text-sm text-slate-500 mb-8 font-medium">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <div className="space-y-8 text-base leading-relaxed font-medium">
        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">1. Aceitação dos Termos</h2>
          <p className="text-slate-600">
            Ao acessar e utilizar o Portal NG Brasil, você concorda em cumprir e ficar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não deverá acessar ou utilizar nosso portal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">2. Uso do Conteúdo</h2>
          <p className="text-slate-600 mb-3">
            O conteúdo publicado no Portal NG Brasil, incluindo textos, gráficos, logotipos e imagens, é de propriedade exclusiva do portal ou de seus licenciadores, protegido por leis de direitos autorais.
          </p>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li>Você pode ler e compartilhar nossos artigos fornecendo os devidos créditos e links para a publicação original.</li>
            <li>É proibida a reprodução integral ou parcial do conteúdo para fins comerciais sem autorização prévia.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">3. Links para Terceiros</h2>
          <p className="text-slate-600">
            Nosso portal pode conter links para sites de terceiros. Não controlamos e não assumimos qualquer responsabilidade pelo conteúdo, políticas de privacidade ou práticas de sites ou serviços de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">4. Modificações dos Termos</h2>
          <p className="text-slate-600">
            O Portal NG Brasil reserva-se o direito de modificar estes termos a qualquer momento. O uso contínuo do site após quaisquer alterações constitui sua aceitação dos novos Termos de Serviço.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">5. Contato</h2>
          <p className="text-slate-600">
            Se você tiver alguma dúvida sobre estes Termos de Serviço, entre em contato conosco através dos canais oficiais indicados no site.
          </p>
        </section>
      </div>
    </div>
  );
}
