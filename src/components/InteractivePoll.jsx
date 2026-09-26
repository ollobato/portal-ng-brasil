import React, { useState } from 'react';
import { Vote, CheckCircle2, BarChart2 } from 'lucide-react';

export default function InteractivePoll() {
  const [votedOption, setVotedOption] = useState(null);
  const [options, setOptions] = useState([
    { id: 'opt1', text: 'Sim, acelera o desenvolvimento socioeconômico e gera empregos.', votes: 412 },
    { id: 'opt2', text: 'Parcialmente, desde que haja forte fiscalização ambiental.', votes: 215 },
    { id: 'opt3', text: 'Ainda é cedo para avaliar os impactos reais.', votes: 78 }
  ]);

  const totalVotes = options.reduce((acc, curr) => acc + curr.votes, 0);

  const handleVote = (id) => {
    if (votedOption) return;
    setVotedOption(id);
    setOptions(options.map(opt => opt.id === id ? { ...opt, votes: opt.votes + 1 } : opt));
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-emerald-800/40 mb-12 relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            ENQUETE DO LEITOR • PORTAL NG
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {totalVotes} votos registrados
        </span>
      </div>

      <h3 className="text-lg sm:text-xl font-bold font-heading mb-4 text-slate-100">
        "Na sua opinião, qual o setor prioritário para impulsionar o turismo sustentável e a economia regional no Brasil em 2026?"
      </h3>

      <div className="space-y-3">
        {options.map((opt) => {
          const percentage = Math.round((opt.votes / totalVotes) * 100) || 0;
          const isSelected = votedOption === opt.id;

          return (
            <div 
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              className={`relative rounded-xl p-3.5 border transition-all cursor-pointer ${
                isSelected 
                  ? 'border-emerald-400 bg-emerald-900/30' 
                  : 'border-slate-700/80 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              {/* Progress Bar background */}
              {votedOption && (
                <div 
                  className="absolute inset-y-0 left-0 bg-emerald-600/30 rounded-xl transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                ></div>
              )}

              <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm font-medium z-10">
                <div className="flex items-center gap-2 text-slate-200">
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0"></div>
                  )}
                  <span>{opt.text}</span>
                </div>

                {votedOption && (
                  <span className="font-extrabold text-emerald-300 shrink-0">
                    {percentage}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {votedOption && (
        <p className="text-xs text-emerald-400 font-medium mt-4 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Obrigado por participar! Seu voto foi contabilizado em tempo real.
        </p>
      )}

    </div>
  );
}
