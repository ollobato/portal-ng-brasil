import React, { useEffect } from 'react';
import { Globe, MessageCircle, PlayCircle, Users, Briefcase, Share2, Music2, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SocialIcon = ({ type, className = "w-6 h-6" }) => {
  switch (type) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.667 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      );
    case 'globe':
      return <Globe className={className} />;
    default:
      return <Users className={className} />;
  }
};

export default function LinksPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const links = [
    {
      title: "Portal NG Brasil",
      subtitle: "Acesse nosso site oficial",
      url: "/",
      icon: "portal",
      color: "bg-[#040f1d] hover:bg-[#06182c]",
      textColor: "text-white",
      isInternal: true
    },
    {
      title: "Grupo Exclusivo no WhatsApp",
      subtitle: "Receba as notícias em primeira mão",
      url: "https://chat.whatsapp.com/J9zW8UgG1z6DeCgxYKJgca?mode=gi_t",
      icon: "whatsapp",
      color: "bg-[#25D366] hover:bg-[#20bd5a]",
      textColor: "text-white"
    },
    {
      title: "Canal no Telegram",
      subtitle: "Inscreva-se para atualizações",
      url: "https://t.me/+Oq3qcUZgSD8xYjMx",
      icon: "telegram",
      color: "bg-[#0088cc] hover:bg-[#0077b3]",
      textColor: "text-white"
    },
    {
      title: "Fale com a Redação",
      subtitle: "Envie sua pauta ou denúncia",
      url: "https://wa.me/5554991146610",
      icon: "whatsapp",
      color: "bg-white hover:bg-slate-50 border-2 border-[#25D366]",
      textColor: "text-[#25D366]"
    },
    {
      title: "Nosso Canal no YouTube",
      subtitle: "Vídeos, reportagens e entrevistas",
      url: "https://www.youtube.com/@portalngbrasil",
      icon: "youtube",
      color: "bg-[#FF0000] hover:bg-[#cc0000]",
      textColor: "text-white"
    },
    {
      title: "Siga no Instagram",
      subtitle: "@portalngbrasil",
      url: "https://instagram.com/portalngbrasil",
      icon: "whatsapp", 
      color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90",
      textColor: "text-white",
      isInstagram: true
    },
    {
      title: "Siga no TikTok",
      subtitle: "Conteúdos curtos e virais",
      url: "https://www.tiktok.com/@portalngbrasil",
      icon: "tiktok",
      color: "bg-black hover:bg-gray-900",
      textColor: "text-white"
    },
    {
      title: "Página no Facebook",
      subtitle: "Acompanhe e compartilhe",
      url: "https://www.facebook.com/ngbrasil/",
      icon: "facebook",
      color: "bg-[#1877F2] hover:bg-[#166fe5]",
      textColor: "text-white"
    },
    {
      title: "LinkedIn",
      subtitle: "Acompanhe nossa rede profissional",
      url: "https://www.linkedin.com/company/portalngbrasil",
      icon: "linkedin",
      color: "bg-[#0A66C2] hover:bg-[#0958a8]",
      textColor: "text-white"
    }
  ];

  return (
    <div className="min-h-screen bg-[#040f1d] bg-opacity-95 flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#d40a38] opacity-20 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#006644] opacity-20 blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md w-full flex flex-col items-center z-10">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-24 h-24 mb-4">
            <img 
              src="/logo/simbolo.png" 
              alt="Portal NG Brasil" 
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-black text-white font-heading tracking-tight mb-2">
            Portal NG Brasil
          </h1>
          <p className="text-slate-300 font-medium text-sm px-4">
            As notícias que impactam o país e o mundo.
          </p>
        </div>

        {/* Links Container */}
        <div className="w-full flex flex-col gap-4">
          {links.map((link, index) => (
            <button
              key={index}
              onClick={() => {
                if (link.isInternal) {
                  navigate(link.url);
                } else {
                  window.open(link.url, '_blank', 'noopener,noreferrer');
                }
              }}
              className={`w-full flex items-center p-4 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 ${link.color}`}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mr-4 ${link.textColor}`}>
                {link.isInstagram ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                ) : link.icon === 'portal' ? (
                  <img src="/logo/simbolo.png" alt="Portal NG Brasil" className="w-8 h-8 object-contain" />
                ) : (
                  <SocialIcon type={link.icon} />
                )}
              </div>
              <div className={`flex flex-col text-left ${link.textColor}`}>
                <span className="font-bold font-heading text-lg leading-tight">{link.title}</span>
                <span className="text-sm opacity-90">{link.subtitle}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-xs font-semibold">
          <p>© {new Date().getFullYear()} Portal NG Brasil.</p>
          <p>Todos os direitos reservados.</p>
        </div>

      </div>
    </div>
  );
}
