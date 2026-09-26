import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin, onNavigateHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulação simples de login para MVP
    if (email && password) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Header */}
        <div 
          onClick={onNavigateHome}
          className="flex justify-center items-center gap-3 cursor-pointer group mb-8"
        >
          <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white flex items-center justify-center shrink-0">
            <img 
              src="/logo/ChatGPT Image 15 de set. de 2026, 03_22_55.png" 
              alt="Logo Portal NG Brasil" 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black tracking-tight text-title-blue font-heading">
              PORTAL <span className="text-[#006644]">NG</span>
            </span>
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              Área do Jornalista
            </span>
          </div>
        </div>

        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                E-mail Corporativo
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#006644] focus:border-[#006644] sm:text-sm text-slate-900"
                  placeholder="redacao@portalng.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-[#006644] focus:border-[#006644] sm:text-sm text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#006644] focus:ring-[#006644] border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <button 
                  type="button"
                  onClick={() => alert('Para redefinir a senha, entre em contato com o departamento de RH ou TI da redação.')}
                  className="font-semibold text-[#006644] hover:text-[#004d33] bg-transparent border-0"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#d40a38] hover:bg-red-700 transition-colors"
              >
                Acessar Painel <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            Acesso restrito a editores e administradores autorizados.
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={onNavigateHome}
            className="text-sm font-medium text-slate-600 hover:text-title-blue transition-colors"
          >
            &larr; Voltar para a Página Inicial do Portal
          </button>
        </div>
      </div>
    </div>
  );
}
