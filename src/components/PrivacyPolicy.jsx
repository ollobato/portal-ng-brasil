import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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

      <h1 className="text-3xl font-black font-heading text-[#040f1d] mb-4">Política de Privacidade</h1>
      <p className="text-sm text-slate-500 mb-8 font-medium">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <div className="space-y-8 text-base leading-relaxed font-medium">
        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">1. Informações que Coletamos</h2>
          <p className="text-slate-600 mb-3">
            O Portal NG Brasil coleta informações para fornecer e melhorar nossos serviços aos leitores. Isso pode incluir:
          </p>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li>Dados de navegação (endereço IP, tipo de navegador, páginas visitadas) através de cookies e ferramentas de analytics.</li>
            <li>Informações fornecidas voluntariamente ao assinar nossa newsletter, participar de enquetes ou entrar em contato.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">2. Uso das Informações</h2>
          <p className="text-slate-600">
            Utilizamos as informações coletadas para personalizar o conteúdo apresentado, entender como nossos leitores interagem com o portal, melhorar a usabilidade do site e, quando autorizado, enviar boletins informativos e notificações relevantes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">3. Compartilhamento de Dados</h2>
          <p className="text-slate-600">
            Não vendemos nem alugamos suas informações pessoais para terceiros. O compartilhamento pode ocorrer apenas com provedores de serviços de confiança (como Google Analytics) que nos ajudam a operar o portal, sempre sob rígidas obrigações de confidencialidade.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">4. Cookies e Tecnologias de Rastreamento</h2>
          <p className="text-slate-600">
            Utilizamos cookies para otimizar sua experiência, como salvar preferências de leitura (tamanho da fonte, artigos salvos localmente). Você pode configurar seu navegador para recusar todos os cookies, no entanto, algumas funcionalidades do site podem não funcionar adequadamente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">5. Segurança dos Dados</h2>
          <p className="text-slate-600">
            Adotamos medidas de segurança técnicas e organizacionais adequadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Nosso site opera através de conexões seguras (HTTPS).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#040f1d] mb-3">6. Seus Direitos</h2>
          <p className="text-slate-600">
            Você tem o direito de solicitar acesso, correção ou exclusão de quaisquer dados pessoais que porventura tenhamos armazenado, bem como revogar o consentimento para envios de marketing a qualquer momento.
          </p>
        </section>
      </div>
    </div>
  );
}
