import React from 'react';
import { Globe, ArrowUp, Landmark, Compass, Film, ShieldCheck, Heart, Camera, Cpu, HeartPulse, Newspaper } from 'lucide-react';

export default function Footer({ setActiveCategory, setSelectedPraca }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#040f1d] text-slate-300 pt-12 pb-8 border-t border-slate-800 mt-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        
        {/* Top Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Vision */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <img 
                  src="/logo/logo-transparent.png" 
                  alt="Logo Portal NG Brasil" 
                  className="w-full h-full object-contain drop-shadow-md"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <span className="text-xl font-black tracking-tight text-[#F1EAD7] font-heading">
                PORTAL <span className="text-[#d40a38]">NG</span> BRASIL
              </span>
            </div>

            <p className="text-sm text-slate-400 max-w-md leading-relaxed font-medium">
              O Portal NG Brasil é um veículo independente de jornalismo digital dedicado a cobrir de forma ágil e inteligente as notícias sobre **Brasil, Política, Saúde, Tecnologia, Turismo e Entretenimento**.
            </p>

            <div className="flex items-center gap-4 text-xs font-bold text-[#d40a38]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                Compromisso com a Verdade
              </span>
              <span className="text-slate-600">•</span>
              <span>Cobertura Nacional & Regional</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-white font-heading">
              Editorias Principais
            </h4>
            <ul className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm font-semibold text-slate-400">
              <li>
                <button 
                  onClick={() => { setActiveCategory('brasil'); scrollToTop(); }}
                  className="hover:text-[#d40a38] flex items-center gap-2 transition-colors"
                >
                  <Newspaper className="w-4 h-4 text-emerald-500" />
                  <span>Brasil</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveCategory('politica'); scrollToTop(); }}
                  className="hover:text-[#d40a38] flex items-center gap-2 transition-colors"
                >
                  <Landmark className="w-4 h-4 text-sky-500" />
                  <span>Política</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveCategory('tecnologia'); scrollToTop(); }}
                  className="hover:text-[#d40a38] flex items-center gap-2 transition-colors"
                >
                  <Cpu className="w-4 h-4 text-purple-500" />
                  <span>Tecnologia</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveCategory('saude'); scrollToTop(); }}
                  className="hover:text-[#d40a38] flex items-center gap-2 transition-colors"
                >
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Saúde</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveCategory('turismo'); scrollToTop(); }}
                  className="hover:text-[#d40a38] flex items-center gap-2 transition-colors"
                >
                  <Compass className="w-4 h-4 text-[#006644]" />
                  <span>Turismo</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveCategory('entretenimento'); scrollToTop(); }}
                  className="hover:text-[#d40a38] flex items-center gap-2 transition-colors"
                >
                  <Film className="w-4 h-4 text-amber-500" />
                  <span>Cultura</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Praças Regionais Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-white font-heading">
              Regiões / Estados
            </h4>
            <div className="flex flex-wrap gap-2">
              {['Amapá', 'Rio Grande do Sul', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map((p) => (
                <button
                  key={p}
                  onClick={() => { setSelectedPraca(p); scrollToTop(); }}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Footer Row */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <p>© {new Date().getFullYear()} Portal NG Brasil (Notícias Gerais). Todos os direitos reservados.</p>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-pink-600 transition-colors font-bold"
            >
              <Camera className="w-5 h-5" />
              <span className="hidden sm:inline">@portalngbrasil</span>
            </a>
            
            <button 
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md border border-slate-700 transition-colors font-bold shadow-sm"
            >
              <span className="hidden sm:inline">Voltar ao topo</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
