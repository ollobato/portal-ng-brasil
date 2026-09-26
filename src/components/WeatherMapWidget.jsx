import React, { useState } from 'react';
import { CloudSun, CloudRain, Sun, Cloud, Thermometer, Wind, Droplets, MapPin } from 'lucide-react';

const regionsData = {
  norte: {
    name: "Região Norte",
    temp: "32°C",
    condition: "Chuvas Isoladas",
    humidity: "85%",
    wind: "12 km/h",
    icon: CloudRain,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  nordeste: {
    name: "Região Nordeste",
    temp: "30°C",
    condition: "Ensolarado",
    humidity: "60%",
    wind: "18 km/h",
    icon: Sun,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  centro_oeste: {
    name: "Centro-Oeste",
    temp: "34°C",
    condition: "Quente e Seco",
    humidity: "35%",
    wind: "10 km/h",
    icon: Sun,
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  },
  sudeste: {
    name: "Região Sudeste",
    temp: "24°C",
    condition: "Parcialmente Nublado",
    humidity: "70%",
    wind: "15 km/h",
    icon: CloudSun,
    color: "text-sky-500",
    bg: "bg-sky-500/10"
  },
  sul: {
    name: "Região Sul",
    temp: "15°C",
    condition: "Nublado",
    humidity: "75%",
    wind: "20 km/h",
    icon: Cloud,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10"
  }
};

export default function WeatherMapWidget() {
  const [activeRegion, setActiveRegion] = useState('sudeste');
  
  const selected = regionsData[activeRegion];
  const Icon = selected.icon;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <Thermometer className="w-5 h-5 text-sky-500" />
        <h3 className="font-heading font-black uppercase tracking-wider text-slate-800">
          Clima pelo Brasil
        </h3>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Buttons (Map Alternative) */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          {Object.entries(regionsData).map(([key, data]) => (
            <button
              key={key}
              onClick={() => setActiveRegion(key)}
              className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${
                activeRegion === key 
                  ? `${data.bg} ${data.color} ring-1 ring-${data.color.split('-')[1]}-500/50` 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${activeRegion === key ? '' : 'opacity-0 group-hover:opacity-50 transition-opacity'}`} />
                {data.name}
              </span>
            </button>
          ))}
        </div>

        {/* Display Area */}
        <div className={`flex-1 rounded-2xl ${selected.bg} border border-slate-200 p-6 flex flex-col justify-center items-center text-center transition-colors duration-500`}>
          <div className={`p-4 rounded-full bg-white shadow-sm mb-4 ${selected.color}`}>
            <Icon className="w-12 h-12" strokeWidth={1.5} />
          </div>
          
          <h4 className={`text-xl font-black ${selected.color} mb-1 font-heading`}>
            {selected.name}
          </h4>
          <div className="text-5xl font-black text-slate-800 mb-2 tracking-tighter">
            {selected.temp}
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-6">
            {selected.condition}
          </p>

          <div className="flex items-center gap-6 text-sm font-semibold text-slate-600 bg-white/60 px-6 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-500" />
              <span>{selected.humidity}</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-slate-400" />
              <span>{selected.wind}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
