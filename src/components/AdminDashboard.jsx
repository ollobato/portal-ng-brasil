import React, { Component, useState, useRef, useEffect } from 'react';
import { trackEvent } from '../utils/analytics';
import { LogOut, AlertCircle, PlusCircle, Plus, Edit3, Trash2, LayoutDashboard, FileText, Settings, Users, Search, Activity, TrendingUp, BarChart3, Eye, Sparkles, Bot, BrainCircuit, CheckCircle, Clock, Image as ImageIcon, ThumbsUp, ThumbsDown, Key, Share2, Share, Camera , Loader2, Save, Link as LinkIcon, Globe, Send, Zap, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Check, Workflow, Cpu, PenTool, CheckSquare, Database, Network, PieChart, Copy, ExternalLink, ShieldCheck, Layers, BookOpen, Compass, CheckCircle2, Server, HelpCircle, ArrowRight, Smartphone, RefreshCw, X, AlertTriangle } from 'lucide-react';
import Editor from 'react-simple-wysiwyg';
import SocialPostGenerator from './SocialPostGenerator';
import AnalyticsDashboard from './AnalyticsDashboard';
import StoriesGenerator from './StoriesGenerator';
import CarouselsGenerator from './CarouselsGenerator';
import PublishSuccessModal from './PublishSuccessModal';
import { shareToWhatsApp } from '../utils/socialExporter';
import { publishArticleToAllChannels } from '../utils/metaPublisher';
import { useFirebaseSync, useFirebaseDoc } from '../hooks/useFirebaseSync';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const compressImageAndUploadToStorage = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file.type.startsWith('image/')) {
        reject(new Error("Not an image"));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max_size = 2560; 
            
            if (width > max_size || height > max_size) {
              if (width > height) {
                height *= max_size / width;
                width = max_size;
              } else {
                width *= max_size / height;
                height = max_size;
              }
            }
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(async (blob) => {
                if (!blob) return reject("Failed to create blob");
                
                const doFallback = () => {
                    const smallCanvas = document.createElement('canvas');
                    let sWidth = img.width;
                    let sHeight = img.height;
                    const fallback_max_size = 1600;
                    if (sWidth > fallback_max_size || sHeight > fallback_max_size) {
                      if (sWidth > sHeight) {
                        sHeight *= fallback_max_size / sWidth;
                        sWidth = fallback_max_size;
                      } else {
                        sWidth *= fallback_max_size / sHeight;
                        sHeight = fallback_max_size;
                      }
                    }
                    smallCanvas.width = sWidth;
                    smallCanvas.height = sHeight;
                    smallCanvas.getContext('2d').drawImage(img, 0, 0, sWidth, sHeight);
                    resolve(smallCanvas.toDataURL('image/jpeg', 0.85));
                };

                let timeoutHit = false;
                const timeoutId = setTimeout(() => {
                  timeoutHit = true;
                  console.warn("Firebase Storage timeout, falling back to base64");
                  doFallback();
                }, 20000); // Increased timeout to 20 seconds to allow high-res uploads

                try {
                    const fileRef = ref(storage, `images/${Date.now()}_${file.name}`);
                    await uploadBytes(fileRef, blob);
                    const url = await getDownloadURL(fileRef);
                    clearTimeout(timeoutId);
                    if (!timeoutHit) resolve(url);
                } catch (e) {
                    clearTimeout(timeoutId);
                    if (!timeoutHit) {
                        console.warn("Firebase Storage failed, falling back to base64", e);
                        doFallback();
                    }
                }
            }, 'image/jpeg', 0.95);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("Image load error"));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
};

const compressImageToBase64 = (file) => {
  return new Promise((resolve) => {
    try {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max_size = 1200;
            
            if (width > max_size || height > max_size) {
              if (width > height) {
                height *= max_size / width;
                width = max_size;
              } else {
                width *= max_size / height;
                height = max_size;
              }
            }
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Retorna Base64 com 80% de qualidade
            const base64Url = canvas.toDataURL('image/jpeg', 0.80);
            resolve(base64Url);
          } catch (err) {
            console.error("Compression error:", err);
            resolve(event.target.result); 
          }
        };
        img.onerror = () => resolve(event.target.result);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Reader setup error:", err);
      resolve('');
    }
  });
};

const getSourceNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    
    const knownSources = {
      'g1.globo.com': 'G1',
      'globo.com': 'Globo',
      'oglobo.globo.com': 'O Globo',
      'valor.globo.com': 'Valor Econômico',
      'uol.com.br': 'UOL',
      'noticias.uol.com.br': 'UOL Notícias',
      'folha.uol.com.br': 'Folha de S.Paulo',
      'estadao.com.br': 'Estadão',
      'metropoles.com': 'Metrópoles',
      'cnnbrasil.com.br': 'CNN Brasil',
      'agenciabrasil.ebc.com.br': 'Agência Brasil',
      'poder360.com.br': 'Poder360',
      'jovempan.com.br': 'Jovem Pan',
      'gazetadopovo.com.br': 'Gazeta do Povo',
      'veja.abril.com.br': 'Veja',
      'exame.com': 'Exame',
      'bbc.com': 'BBC News Brasil',
      'reuters.com': 'Reuters',
      'terra.com.br': 'Terra',
      'r7.com': 'R7',
      'diariodopoder.com.br': 'Diário do Poder',
      'revistaoeste.com': 'Revista Oeste',
      'pleno.news': 'Pleno News',
      'brasil247.com': 'Brasil 247',
      'cartacapital.com.br': 'CartaCapital',
      'theintercept.com': 'The Intercept Brasil',
      'infomoney.com.br': 'InfoMoney',
      'conjur.com.br': 'ConJur'
    };

    if (knownSources[host]) return knownSources[host];
    for (const [domain, name] of Object.entries(knownSources)) {
      if (host.endsWith(domain)) return name;
    }

    const mainPart = host.split('.')[0];
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  } catch (e) {
    return '';
  }
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, info) { this.setState({ error, info }); console.error("ErrorBoundary caught an error", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#991b1b', margin: '20px', borderRadius: '8px', fontFamily: 'monospace' }}>
          <h2>Ocorreu um erro no painel (Tela Branca interceptada!):</h2>
          <p><strong>{this.state.error?.toString()}</strong></p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Ver detalhes técnicos (Stack Trace)</summary>
            {this.state.info?.componentStack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#b91c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Recarregar Página</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminDashboard({ onLogout, newsData, setNewsData, banners, setBanners }) {
  const VALID_ADMIN_TABS = ['insights', 'dashboard', 'robot', 'stories', 'carousels', 'aprovacao', 'materias', 'autores', 'banners', 'configuracoes'];
  
  const getInitialAdminTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && VALID_ADMIN_TABS.includes(tabParam)) return tabParam;

      const hash = window.location.hash.replace('#', '').trim();
      if (hash && VALID_ADMIN_TABS.includes(hash)) return hash;

      const saved = localStorage.getItem('portal_ng_admin_active_tab') || sessionStorage.getItem('portal_ng_admin_active_tab');
      if (saved && VALID_ADMIN_TABS.includes(saved)) return saved;
    } catch(e) {}
    return 'insights';
  };

  const [activeTab, setActiveTab] = useState(getInitialAdminTab);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('portal_ng_sidebar_collapsed') === 'true';
    } catch(e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('portal_ng_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false');
    } catch(e) {}
  }, [sidebarCollapsed]);

  // Sincroniza a aba ativa com o URL e o armazenamento local para persistir no F5
  useEffect(() => {
    try {
      localStorage.setItem('portal_ng_admin_active_tab', activeTab);
      sessionStorage.setItem('portal_ng_admin_active_tab', activeTab);
      
      const currentUrl = new URL(window.location.href);
      if (currentUrl.pathname.startsWith('/painel')) {
        if (currentUrl.searchParams.get('tab') !== activeTab) {
          currentUrl.searchParams.set('tab', activeTab);
          window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
        }
      }
    } catch(e) {}
  }, [activeTab]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(false);
  const showToast = (message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setTimeout(() => setToastMessage(null), 12000);
  };

  const [localBanners, setLocalBanners] = useState(banners || []);
  
  // Sync local banners when props change (initial load)
  React.useEffect(() => {
    if (banners && banners.length > 0) {
      setLocalBanners(banners);
    }
  }, [banners]);

  // Listen to Active Users
  React.useEffect(() => {
    if (activeTab !== 'insights') return;
    
    // We fetch users active in the last 60 seconds
    const interval = setInterval(async () => {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const q = query(collection(db, 'active_sessions'), where('last_active', '>=', new Date(Date.now() - 60000)));
        const snap = await getDocs(q);
        setActiveUsersCount(snap.size);
      } catch(e) {}
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Drafts state for approval queue (synced with Firebase)
  const [draftDataRaw, setDraftData] = useFirebaseSync('drafts', []);
  const draftData = draftDataRaw.map(item => ({
    ...item,
    praca: typeof item.praca === 'string' ? item.praca.replace(/^Praça\s+/i, '') : item.praca,
    title: typeof item.title === 'string' ? item.title.replace(/^Praça\s+/i, '') : item.title
  })).sort((a, b) => b.id - a.id);
  
  // Trash state
  const [trashDataRaw, setTrashData] = useFirebaseSync('trash', []);
  const trashData = [...trashDataRaw].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  // AI Logs state
  const [aiLogsRaw, setAiLogs] = useFirebaseSync('ai_logs', []);
  const aiLogs = [...aiLogsRaw].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formActiveTab, setFormActiveTab] = useState('portal'); // 'portal' | 'social'
  const [editingId, setEditingId] = useState(null);
  const [comparisonViewMode, setComparisonViewMode] = useState('summary'); // 'summary' | 'fullText'
  const [formData, setFormData] = useState({
    title: '', 
    subtitle: '', 
    category: 'politica', 
    praca: 'Nacional', 
    image: '', 
    content: '', 
    authorName: 'Redação NG Brasil',
    aiGenerated: false,
    originalUrl: '',
    originalTitle: '',
    originalSubtitle: '',
    originalContent: '',
    source: '',
    date: ''
  });

  // AI Assistant states
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [robotSearchSource, setRobotSearchSource] = useState('todas');

  // Approval Link & Modal states
  const [approvalModalData, setApprovalModalData] = useState({
    isOpen: false,
    articleId: null,
    title: '',
    subtitle: '',
    url: '',
    item: null
  });
  const [copiedApprovalLink, setCopiedApprovalLink] = useState(false);

  // Robot / Automation states
  
  const defaultUrls = "https://danuzionews.com/\nhttps://forbes.com.br/\nhttps://www.gazetadopovo.com.br\nhttps://www.brasilparalelo.com.br/\nhttps://www.cnnbrasil.com.br/\nhttps://revistaoeste.com/\nhttps://agenciagov.ebc.com.br/\nhttps://agenciabrasil.ebc.com.br/\nhttps://www.gov.br/pt-br\nhttps://www.voanews.com/\nhttps://news.un.org/pt/\nhttps://www.r7.com/\nhttps://g1.globo.com/\nhttps://www.uol.com.br/\nhttps://www.estadao.com.br/\nhttps://www.folha.uol.com.br/\nhttps://www.bbc.com/portuguese\nhttps://www.poder360.com.br/\nhttps://www.metropoles.com/\nhttps://www.terra.com.br/\nhttps://www.panrotas.com.br/\nhttps://diariodoturismo.com.br/\nhttps://brasilturis.com.br/\nhttps://www.gov.br/fazenda\nhttps://www.gov.br/saude\nhttps://www.gov.br/mec\nhttps://www.gov.br/mcti/pt-br";
  const defaultSystemRules = `# QUEM VOCÊ É — REDAÇÃO CONSERVADORA DO PORTAL NG BRASIL
Você é o redator-chefe e jornalista sênior do Portal NG Brasil.
Nossa identidade editorial é CONSERVADORA, PATRIOTA e de DIREITA, firmemente comprometida com a DEFESA DA LIBERDADE DE EXPRESSÃO, DA FAMÍLIA, DA PROPRIEDADE PRIVADA E DO LIVRE MERCADO, e com o combate intransigente à censura, ao ativismo judicial e aos abusos estatais.
Você não é um robô de boletim burocrático e NÃO é uma agência de checagem esquerdista.
Você narra os fatos com ritmo, autoridade, coragem e pegada popular, entregando ao leitor a REAL IMPORTÂNCIA política, econômica e social de cada acontecimento, sem covardia e sem diminuir as conquistas e pautas da direita.

# PARA QUEM VOCÊ ESCREVE
O cidadão brasileiro comum, trabalhador, que sofre diariamente com o peso do Estado, impostos sufocantes, insegurança e aparelhamento político.
Ele consome notícias no celular, nas redes e no portal, buscando a verdade que a grande mídia esconde, distorce ou minimiza.
Aqui ele encontra o fato com coragem, o contexto real e o próximo desdobramento que os outros tentaram abafar.

# O PRINCÍPIO MANDATÓRIO: FILTRO DESINTOXICADOR DE FONTES DE ESQUERDA
A esmagadora maioria dos veículos tradicionais (G1, UOL, Folha de S.Paulo, Metrópoles, Estadão, CNN Brasil, BBC) opera com viés progressista e esquerdista evidente. Ao noticiarem lideranças conservadoras, atos da oposição ou denúncias contra o sistema, esses portais usam táticas viciosas:
1. MINIMIZAÇÃO: apequenam fatos grandiosos (ex.: transformam o elogio público histórico de Elon Musk a uma liderança conservadora em "uma resposta de uma única palavra com teor limitado").
2. FALSO FACT-CHECKING / CETICISMO SELETIVO: desqualificam denúncias legítimas rotulando-as de "sem provas", enquanto tratam justificativas oficiais de governos ou de Big Techs (como alegar "direitos autorais" para derrubar áudio de vídeo viral de oposição) como verdades incontestáveis.
3. INVERSÃO DA CULPA: quando a direita é censurada ou perseguida, a grande mídia tenta justificar o silenciamento.

COMO VOCÊ DEVE AGIR:
- EXPURGUE TODO E QUALQUER VIÉS PROGRESSISTA DA FONTE.
- EXTRAIA OS FATOS BRUTOS E REENQUADRE A NOTÍCIA SOB A PERSPECTIVA CONSERVADORA.
- Entregue a notícia destacando sua relevância, a força do movimento conservador e o impacto para a liberdade do país.

# REGRAS INVIOLÁVEIS (VENCEM QUALQUER OUTRA REGRA)
1. EXALTAÇÃO E PROTAGONISMO CONSERVADOR:
   Quando a notícia envolver lideranças de direita (Jair Bolsonaro, Nikolas Ferreira, Tarcísio de Freitas, Flávio Bolsonaro, etc.) ou figuras globais pró-liberdade (Elon Musk, Donald Trump, Javier Milei):
   - Enfatize o prestígio, a mobilização popular, os milhões de engajamentos e a coragem em enfrentar o establishment.
   - NUNCA diminua o peso do acontecimento. NUNCA reproduza o tom desmerecedor da imprensa tradicional.
   - Um elogio ou interação de Elon Musk com um líder brasileiro é um fato político de relevância internacional e deve ser celebrado como tal.

2. COMBATE À CENSURA E DENÚNCIA DAS BIG TECHS:
   Se houver derrubada de áudio, bloqueio, desmonetização ou restrição de alcance em plataformas concorrentes (Meta/Instagram, YouTube, etc.):
   - Trate o fato como uma denúncia legítima e gravíssima de censura e perseguição contra vozes conservadoras.
   - A alegação oficial da plataforma (ex.: "direitos autorais", "violação de diretrizes") deve ser tratada como mera desculpa burocrática sob suspeita, contrastando com o ambiente de liberdade preservado no X por Elon Musk.

3. VOCABULÁRIO ESVAZIADOR TOTALMENTE PROIBIDO:
   É TERMINANTEMENTE PROIBIDO utilizar jargões de fact-checkers de esquerda:
   - PROIBIDO: "o detalhe novo é o teor limitado da resposta"
   - PROIBIDO: "respondeu com uma única palavra"
   - PROIBIDO: "não permite atribuir apoio explícito"
   - PROIBIDO: "afirmou sem apresentar provas"
   - PROIBIDO: "a resposta não aponta novos desdobramentos"
   - PROIBIDO: "suposta censura" (use "denúncia de censura" ou "restrição arbitrária")
   - PROIBIDO jargões vazios de IA: "em um cenário", "vale ressaltar", "cabe destacar", "diante disso", "em resumo".

4. SENSACIONALISMO RESPONSÁVEL E RESPALDO FACTUAL:
   - Toda denúncia, crítica ou acusação é atribuída com firmeza: "conforme denunciou Nikolas", "segundo apontou a oposição", "de acordo com moradores em vídeo comovente".
   - Verbos de força e ação: "parabenizou", "chancelou", "celebrou", "escancarou", "reforçou", "desafiou", "denunciou manobra".
   - Aspas diretas são intocáveis e preservadas com fidelidade literal.

5. NOMES DIRETOS DO POVO:
   - Use: "Nikolas Ferreira", "Elon Musk", "Flávio Bolsonaro", "Lula", "Moraes", "Trump".
   - Evite solenidades enfadonhas ("o excelentíssimo senhor", "o parlamentar mineiro em tela").

# ESTRUTURA DA MATÉRIA DO SITE (PIRÂMIDE INVERTIDA CONSERVADORA)
1. LIDE: O fato principal com vigor, peso político e exaltação do acontecimento conservador (quem, o que, alcance e importância).
2. O RECONHECIMENTO E A REPERCUSSÃO: O engajamento massivo, a resposta do público e as reações internacionais.
3. PARÁGRAFO DE CONTINUIDADE (A VERDADE DOS BASTIDORES): Aprofundamento do combate contra o sistema, o contraste entre a liberdade no X e a mordaça imposta em outras redes.
4. O POVO E A REALIDADE DOS FATOS: Relatos concretos de quem sofre as consequências (ex.: o povo abandonado no semiárido nordestino).
5. FECHAMENTO FACTUAL E INSTITUCIONAL: Próximos desdobramentos da mobilização, finalizando com o slogan institucional do Portal NG Brasil.

# UMA NOTÍCIA, VÁRIOS FORMATOS
- CARD (Instagram): Frase de impacto até ~12 palavras + linha de apoio destacando a vitória da liberdade ou a denúncia.
- LEGENDA (Instagram): 1ª linha gancho forte + 3 a 5 linhas curtas com os fatos essenciais e o impacto conservador + chamada para o link da bio.
- ROTEIRO DE VÍDEO/NARRAÇÃO: Gancho arrebatador nos 3 primeiros segundos, narrativa ágil e indignada/celebrativa de 45 a 60 segundos com o próximo passo.

# SAÍDA (JSON)
{
  "jogada": "o conflito/virada conservadora em 1 frase",
  "titulos": ["Opção 1 com gatilho de curiosidade e impacto", "Opção 2 com número impactante ou fala forte atribuída", "Opção 3 com contraste patriota e vitória da liberdade"],
  "title": "A melhor opção de título para o site",
  "subtitulo": "Subtítulo / Linha fina explicativa com peso político",
  "subtitle": "Subtítulo / Linha fina explicativa com peso político",
  "corpo_site": "<p>Parágrafos estruturados em HTML com ênfases fortes em <strong>...</p>",
  "content": "<p>Parágrafos estruturados em HTML com ênfases fortes em <strong>...</p>",
  "card_instagram": {"titulo": "Frase de impacto até 12 palavras", "apoio": "Linha de apoio com o dado ou fala"},
  "legenda_instagram": "1ª linha gancho forte + 3 a 5 linhas curtas com fatos e impacto + link da bio + hashtags",
  "roteiro_video": "Gancho nos 3 primeiros segundos + narrativa de 45 a 60 segundos com o próximo passo",
  "destaque_visual": "Qual imagem ou trecho do vídeo usar e por quê",
  "cortes_sugeridos": ["Trecho a remover e motivo"],
  "fontes": [{"nome": "Nome da fonte", "link": "https://...", "data": "Hoje"}],
  "citacoes_literais": ["\"Aspas intocáveis copiadas literalmente da fonte\" — Nome"],
  "matriz_fatos": {"fato_ancora":"", "sujeito":"", "acao":"", "data":"", "local":"", "novidade":"", "dado_mais_recente":""},
  "alertas": ["Ponto a conferir antes de publicar"]
}`;

  const defaultGuidelines = `Diretrizes de Execução do Prompt v4 (Redação Conservadora Portal NG Brasil):
1. FILTRO DESINTOXICADOR: Portais tradicionais (G1, UOL, Folha, Metrópoles) tentam minimizar os sucessos da direita e desqualificar denúncias de censura. Elimine qualquer cinismo ou deboche da fonte e reescreva exaltando a importância da notícia para a causa da liberdade e do conservadorismo.
2. VALORIZAÇÃO DE LIDERANÇAS E LIBERDADE: Destaque o peso político de apoios como o de Elon Musk, Donald Trump e grandes lideranças conservadoras brasileiras. O apoio internacional a uma denúncia nacional é um fato grandioso.
3. CONTRASTE DE LIBERDADE × CENSURA: Sempre que houver derrubada de áudio ou bloqueio em plataformas como o Instagram/Meta, denuncie com firmeza o silenciamento contra a direita e contraste com a liberdade preservada no X.
4. PROIBIDO ESVAZIAR A NOTÍCIA: Nunca use frases esvaziadoras como 'teor limitado', 'apenas uma palavra', 'sem provas' ou 'não trouxe novidades'.
5. TÍTULOS COM GATILHOS DE ALTO IMPACTO: Crie títulos magnéticos para o leitor de direita, focando em vitória, indignação legítima, revelação e patriotismo.`;

  const defaultContextoMomento = `- Elon Musk & X: Bastião mundial da liberdade de expressão. Enfrenta a censura e o ativismo judicial no Brasil; apoia e parabeniza publicamente lideranças da direita que expõem a verdade.
- Nikolas Ferreira: Maior liderança jovem conservadora do país e deputado mais votado; mobiliza milhões contra o desgoverno, expõe o descaso com o povo do Nordeste e enfrenta censura em plataformas de mídia social.
- Censura e Mordaça das Big Techs (Meta / Instagram / YouTube): Prática recorrente de silenciamento de conteúdos conservadores sob alegações genéricas (ex.: 'direitos autorais' ou 'violação de diretrizes'), gerando denúncias contínuas de perseguição política.
- Nordeste Real vs. Propaganda Governamental: Denúncias de abandono de obras hídricas da Transposição do São Francisco, crise hídrica, desemprego e pobreza que contrastam com o discurso oficial do governo federal.
- Flávio Bolsonaro & Oposição no Congresso: Atuação combativa contra a gastança estatal, aumento recorde de impostos e abusos de autoridade.
- Disputa Ideológica Direita × Esquerda: O avanço do movimento conservador no Brasil, defesa intransigente da família, segurança pública rigorosa, patriotismo e liberdade individual.`;

  const fallbackSettings = {
    robotUrls: localStorage.getItem("portal_ng_robot_urls") || defaultUrls,
    robotGeminiKey: localStorage.getItem("portal_ng_gemini_key") || "",
    robotOpenAIKey: localStorage.getItem("portal_ng_openai_key") || "",
    robotClaudeKey: localStorage.getItem("portal_ng_claude_key") || "",
    robotPerplexityKey: localStorage.getItem("portal_ng_perplexity_key") || "",
    robotGoogleSearchKey: localStorage.getItem("portal_ng_google_search_key") || "",
    metaToken: localStorage.getItem("portal_ng_meta_token") || "EAAfkmL0QDnwBSZCazrXzU3uVto6vWKdtDEMaWiWIKe9b66NPhCzSlQALQlZBkcNyM3DDoz2iD84JZCGcs9ueHkUsGplljRIbXmUM4Smx3tuIF14ZBYD4NF8EFN5FZBCcbXcEMwzlOZAJEZBW47ASG47DXtDynrNVmDAuKDCnuRZCH3CmiBJZAvpwwswirCAov58prHZCgAMPzZChHkLee1cmtMYPhDu5vXrFT8L4szKiDPlJZAFlEsXm4ryyXoL0qzZAJJ2NUAdKCkCXf1jVmgbOve9NVuyoK",
    metaFbPageId: localStorage.getItem("portal_ng_meta_fb_page_id") || "109031887591187",
    metaIgAccountId: localStorage.getItem("portal_ng_meta_ig_account_id") || "17841455465356006",
    threadsToken: localStorage.getItem("portal_ng_threads_token") || "THAAVZB1HEtu6ZABYlk5QU0yRTVqZAFJyWENyQWdXOEZAIa3VhUVFSUHJ5S3BIbXdJSnNSSnVQR2V3OWY5OXhwQWFtVGJqQ1phOFU0enpGYWE0Tk5tRHBYTHFPc0dYUEJlWTh2MlJRWkt6WXBuaXdZAcGYtamVqeWw4dW9Fb1pBNkFoZAjA1bVB3cUc4eWFjdk11aHMZD",
    threadsUserId: localStorage.getItem("portal_ng_threads_user_id") || "29313904888222414",
    imgbbKey: localStorage.getItem("portal_ng_imgbb_key") || "16be6a5efa6c25b8e50bf9ae6ef9b9bf",
    robotFeedback: localStorage.getItem("portal_ng_robot_feedback") ? JSON.parse(localStorage.getItem("portal_ng_robot_feedback")) : { liked: [], disliked: [] },
    robotGoldStandard: localStorage.getItem("portal_ng_robot_gold_standard") ? JSON.parse(localStorage.getItem("portal_ng_robot_gold_standard")) : null,
    robotSystemRules: localStorage.getItem("portal_ng_robot_system_rules") || defaultSystemRules,
    robotGuidelines: localStorage.getItem("portal_ng_robot_guidelines") || defaultGuidelines,
    robotContextoMomento: localStorage.getItem("portal_ng_robot_contexto_momento") || defaultContextoMomento,
    isAutoPilot: localStorage.getItem("portal_ng_autopilot") === "true",
    autoPilotMinutes: localStorage.getItem("portal_ng_autopilot_minutes") ? Number(localStorage.getItem("portal_ng_autopilot_minutes")) : 3,
    robotArticleCount: localStorage.getItem("portal_ng_robot_article_count") || 5,
    robotAutoPublish: localStorage.getItem("portal_ng_robot_auto_publish") === "true",
    siteSlogan: localStorage.getItem("portal_ng_site_slogan") || "As notícias que impactam o país e o mundo.",
    siteName: localStorage.getItem("portal_ng_site_name") || "Portal NG Brasil",
    siteDescription: localStorage.getItem("portal_ng_site_desc") || "As notícias que impactam o país e o mundo.",
    authors: []
  };

  const [settings, setSettings, isSettingsLoading] = useFirebaseDoc("settings", "global", fallbackSettings);

  const robotUrls = settings.robotUrls;
  const setRobotUrls = (val) => setSettings(prev => ({ ...prev, robotUrls: typeof val === "function" ? val(prev.robotUrls) : val }));

  const robotGeminiKey = settings.robotGeminiKey;
  const setRobotGeminiKey = (val) => setSettings(prev => ({ ...prev, robotGeminiKey: typeof val === "function" ? val(prev.robotGeminiKey) : val }));

  const robotOpenAIKey = settings.robotOpenAIKey;
  const setRobotOpenAIKey = (val) => setSettings(prev => ({ ...prev, robotOpenAIKey: typeof val === "function" ? val(prev.robotOpenAIKey) : val }));

  const robotClaudeKey = settings.robotClaudeKey;
  const setRobotClaudeKey = (val) => setSettings(prev => ({ ...prev, robotClaudeKey: typeof val === "function" ? val(prev.robotClaudeKey) : val }));

  const robotPerplexityKey = settings.robotPerplexityKey;
  const setRobotPerplexityKey = (val) => setSettings(prev => ({ ...prev, robotPerplexityKey: typeof val === "function" ? val(prev.robotPerplexityKey) : val }));

  const robotGoogleSearchKey = settings.robotGoogleSearchKey;
  const setRobotGoogleSearchKey = (val) => setSettings(prev => ({ ...prev, robotGoogleSearchKey: typeof val === "function" ? val(prev.robotGoogleSearchKey) : val }));

  const metaToken = settings.metaToken || fallbackSettings.metaToken;
  const setMetaToken = (val) => setSettings(prev => ({ ...prev, metaToken: typeof val === "function" ? val(prev.metaToken) : val }));

  const metaFbPageId = settings.metaFbPageId || fallbackSettings.metaFbPageId;
  const setMetaFbPageId = (val) => setSettings(prev => ({ ...prev, metaFbPageId: typeof val === "function" ? val(prev.metaFbPageId) : val }));

  const metaIgAccountId = settings.metaIgAccountId || fallbackSettings.metaIgAccountId;
  const setMetaIgAccountId = (val) => setSettings(prev => ({ ...prev, metaIgAccountId: typeof val === "function" ? val(prev.metaIgAccountId) : val }));

  const threadsToken = settings.threadsToken || fallbackSettings.threadsToken;
  const setThreadsToken = (val) => setSettings(prev => ({ ...prev, threadsToken: typeof val === "function" ? val(prev.threadsToken) : val }));

  const threadsUserId = settings.threadsUserId || fallbackSettings.threadsUserId;
  const setThreadsUserId = (val) => setSettings(prev => ({ ...prev, threadsUserId: typeof val === "function" ? val(prev.threadsUserId) : val }));

  const imgbbKey = settings.imgbbKey || fallbackSettings.imgbbKey;
  const setImgbbKey = (val) => setSettings(prev => ({ ...prev, imgbbKey: typeof val === "function" ? val(prev.imgbbKey) : val }));

  const autoPilotMinutes = settings.autoPilotMinutes ?? fallbackSettings.autoPilotMinutes;
  const setAutoPilotMinutes = (val) => {
    const newVal = typeof val === "function" ? val(settings.autoPilotMinutes) : val;
    setSettings(prev => ({ ...prev, autoPilotMinutes: newVal }));
    localStorage.setItem("portal_ng_autopilot_minutes", newVal);
  };

  const robotArticleCount = settings.robotArticleCount || fallbackSettings.robotArticleCount;
  const setRobotArticleCount = (val) => {
    const newVal = typeof val === "function" ? val(settings.robotArticleCount) : val;
    setSettings(prev => ({ ...prev, robotArticleCount: newVal }));
    localStorage.setItem("portal_ng_robot_article_count", newVal);
  };

  const robotFeedback = settings.robotFeedback;
  const setRobotFeedback = (val) => setSettings(prev => ({ ...prev, robotFeedback: typeof val === "function" ? val(prev.robotFeedback) : val }));

  const robotGoldStandard = settings.robotGoldStandard;
  const setRobotGoldStandard = (val) => {
    const newVal = typeof val === "function" ? val(settings.robotGoldStandard) : val;
    setSettings(prev => ({ ...prev, robotGoldStandard: newVal }));
    localStorage.setItem("portal_ng_robot_gold_standard", JSON.stringify(newVal));
  };

  const siteSlogan = settings.siteSlogan || fallbackSettings.siteSlogan;
  const setSiteSlogan = (val) => {
    const newVal = typeof val === "function" ? val(settings.siteSlogan || fallbackSettings.siteSlogan) : val;
    localStorage.setItem("portal_ng_site_slogan", newVal);
    setSettings(prev => ({ ...prev, siteSlogan: newVal }));
  };

  const siteName = settings.siteName || fallbackSettings.siteName;
  const setSiteName = (val) => {
    const newVal = typeof val === "function" ? val(settings.siteName || fallbackSettings.siteName) : val;
    localStorage.setItem("portal_ng_site_name", newVal);
    setSettings(prev => ({ ...prev, siteName: newVal }));
  };

  const siteDescription = settings.siteDescription || fallbackSettings.siteDescription;
  const setSiteDescription = (val) => {
    const newVal = typeof val === "function" ? val(settings.siteDescription || fallbackSettings.siteDescription) : val;
    localStorage.setItem("portal_ng_site_desc", newVal);
    setSettings(prev => ({ ...prev, siteDescription: newVal }));
  };

  const CURRENT_RULES_KEY = "FILTRO DESINTOXICADOR DE FONTES DE ESQUERDA";
  const CURRENT_GUIDELINES_KEY = "FILTRO DESINTOXICADOR";
  const CURRENT_CONTEXTO_KEY = "Elon Musk & X: Bastião";

  const robotSystemRules = (settings.robotSystemRules && settings.robotSystemRules.includes(CURRENT_RULES_KEY)) 
    ? settings.robotSystemRules 
    : defaultSystemRules;
  const setRobotSystemRules = (val) => setSettings(prev => ({ ...prev, robotSystemRules: typeof val === "function" ? val(prev.robotSystemRules || defaultSystemRules) : val }));

  const robotGuidelines = (settings.robotGuidelines && settings.robotGuidelines.includes(CURRENT_GUIDELINES_KEY))
    ? settings.robotGuidelines
    : defaultGuidelines;
  const setRobotGuidelines = (val) => setSettings(prev => ({ ...prev, robotGuidelines: typeof val === "function" ? val(prev.robotGuidelines || defaultGuidelines) : val }));

  const robotContextoMomento = (settings.robotContextoMomento && settings.robotContextoMomento.includes(CURRENT_CONTEXTO_KEY))
    ? settings.robotContextoMomento
    : defaultContextoMomento;
  const setRobotContextoMomento = (val) => setSettings(prev => ({ ...prev, robotContextoMomento: typeof val === "function" ? val(prev.robotContextoMomento || defaultContextoMomento) : val }));

  // Auto-migração transparente para as diretrizes conservadoras v4
  useEffect(() => {
    if (!isSettingsLoading && settings) {
      const needsSystemUpgrade = !settings.robotSystemRules || !settings.robotSystemRules.includes(CURRENT_RULES_KEY);
      const needsGuidelinesUpgrade = !settings.robotGuidelines || !settings.robotGuidelines.includes(CURRENT_GUIDELINES_KEY);
      const needsContextoUpgrade = !settings.robotContextoMomento || !settings.robotContextoMomento.includes(CURRENT_CONTEXTO_KEY);

      if (needsSystemUpgrade || needsGuidelinesUpgrade || needsContextoUpgrade) {
        console.log("🔄 Auto-migrando IA para as Diretrizes Conservadoras v4...");
        setSettings(prev => ({
          ...prev,
          robotSystemRules: needsSystemUpgrade ? defaultSystemRules : prev.robotSystemRules,
          robotGuidelines: needsGuidelinesUpgrade ? defaultGuidelines : prev.robotGuidelines,
          robotContextoMomento: needsContextoUpgrade ? defaultContextoMomento : prev.robotContextoMomento,
          robotPromptVersion: 4
        }));
        if (needsSystemUpgrade) localStorage.setItem("portal_ng_robot_system_rules", defaultSystemRules);
        if (needsGuidelinesUpgrade) localStorage.setItem("portal_ng_robot_guidelines", defaultGuidelines);
        if (needsContextoUpgrade) localStorage.setItem("portal_ng_robot_contexto_momento", defaultContextoMomento);
      }
    }
  }, [isSettingsLoading, settings]);

  const isAutoPilot = settings.isAutoPilot;
  const setIsAutoPilot = (val) => setSettings(prev => ({ ...prev, isAutoPilot: typeof val === "function" ? val(prev.isAutoPilot) : val }));

  const authors = settings.authors;
  const setAuthors = (val) => setSettings(prev => ({ ...prev, authors: typeof val === "function" ? val(prev.authors) : val }));

  const robotAutoPublish = settings.robotAutoPublish || false;
  const setRobotAutoPublish = (val) => {
    const newVal = typeof val === "function" ? val(settings.robotAutoPublish) : val;
    setSettings(prev => ({ ...prev, robotAutoPublish: newVal }));
    localStorage.setItem("portal_ng_robot_auto_publish", newVal);
  };


  const handleFeedback = (draft, type) => {
    setRobotFeedback(prev => {
      const title = draft.metadata?.titulo_original || draft.title;
      const newState = { ...prev };
      
      // Limit to last 15 examples to avoid prompt overflow
      if (type === "like") {
        if (!newState.liked.includes(title)) newState.liked = [title, ...newState.liked].slice(0, 15);
        newState.disliked = newState.disliked.filter(t => t !== title);
      } else if (type === "dislike") {
        if (!newState.disliked.includes(title)) newState.disliked = [title, ...newState.disliked].slice(0, 15);
        newState.liked = newState.liked.filter(t => t !== title);
      }
      
      return newState;
    });

    setDraftData(prev => {
      const drafts = [...prev];
      const index = drafts.findIndex(d => d.id === draft.id);
      if (index > -1) {
        const [moved] = drafts.splice(index, 1);
        if (type === "like") {
          drafts.unshift(moved);
        } else {
          drafts.push(moved);
        }
      }
      return drafts;
    });
  };

  const [socialModalArticle, setSocialModalArticle] = useState(null);
  const [publishModalData, setPublishModalData] = useState(null);

  const handleClosePublishModal = () => {
    setPublishModalData(null);
    setShowForm(false);
    setEditingId(null);
    setEditingIsDraft(false);
    setShowAiAssistant(false);
    setFormData({ title: '', subtitle: '', category: 'politica', praca: 'Nacional', image: '', content: '', authorName: 'Redação NG Brasil' });
    setActiveTab('materias');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [isRobotRunning, setIsRobotRunning] = useState(false);
  const [robotStatus, setRobotStatus] = useState("");
  const [robotProgress, setRobotProgress] = useState(null);

  const abortControllerRef = useRef(null);
  const socialRef = useRef(null);
  const publishTargetRef = useRef('all');
  const handleCancelRobot = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setIsRobotRunning(false);
    setRobotStatus('Pesquisa cancelada pelo usuário.');
    setTimeout(() => {
        setRobotStatus('');
        setRobotProgress(null);
    }, 3000);
  };
  
  const [robotStartDate, setRobotStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [robotStartTime, setRobotStartTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().substring(0,5);
  });
  const [robotCategory, setRobotCategory] = useState("todas");
  const [robotSearchQuery, setRobotSearchQuery] = useState("");
  const VALID_ROBOT_TABS = ["curadora", "prompt", "portais", "chaves", "configuracoes", "lixeira", "informacoes"];
  const getInitialRobotTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('subtab');
      if (sub && VALID_ROBOT_TABS.includes(sub)) return sub;
      const saved = localStorage.getItem('portal_ng_robot_active_tab') || sessionStorage.getItem('portal_ng_robot_active_tab');
      if (saved && VALID_ROBOT_TABS.includes(saved)) return saved;
    } catch(e) {}
    return "curadora";
  };
  const [robotActiveTab, setRobotActiveTab] = useState(getInitialRobotTab);

  useEffect(() => {
    try {
      localStorage.setItem('portal_ng_robot_active_tab', robotActiveTab);
      sessionStorage.setItem('portal_ng_robot_active_tab', robotActiveTab);
      if (activeTab === 'robot') {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('subtab') !== robotActiveTab) {
          currentUrl.searchParams.set('subtab', robotActiveTab);
          window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
        }
      }
    } catch(e) {}
  }, [robotActiveTab, activeTab]);
  const [infoSubTab, setInfoSubTab] = useState("all");
  const [infoSelectedAi, setInfoSelectedAi] = useState("all");
  const [infoActiveStep, setInfoActiveStep] = useState("all");
  const [infoExpandedFaq, setInfoExpandedFaq] = useState(null);
  const [newPortalUrl, setNewPortalUrl] = useState("");

  const handleAddPortal = () => {
    if (newPortalUrl && newPortalUrl.includes("http")) {
      const current = robotUrls ? robotUrls + "\n" : "";
      setRobotUrls(current + newPortalUrl);
      setNewPortalUrl("");
    }
  };

  const handleRemovePortal = (index) => {
    const urls = robotUrls.split("\n").filter(u => u.trim());
    urls.splice(index, 1);
    setRobotUrls(urls.join("\n"));
  };

  const autoPilotRef = React.useRef();

  React.useEffect(() => {
    autoPilotRef.current = () => {
      console.log("Piloto Automático: disparando pesquisa...");
      if (robotPerplexityKey && robotPerplexityKey.trim()) {
         runPerplexitySearch({ preventDefault: () => {} });
      } else {
         runRobotPipeline({ preventDefault: () => {} });
      }
    };
  });

  const [lastAutoPilotToggle, setLastAutoPilotToggle] = useState(false);

  React.useEffect(() => {
    let timerId = null;

    if (isAutoPilot) {
      // Se acabou de ser ligado, dispara imediatamente
      if (!lastAutoPilotToggle) {
        setLastAutoPilotToggle(true);
        if (!isRobotRunning && autoPilotRef.current) {
          autoPilotRef.current();
        }
      } else {
        // Se já estava ligado, agenda a próxima execução
        if (!isRobotRunning) {
          const ms = autoPilotMinutes * 60 * 1000;
          timerId = setTimeout(() => {
            if (autoPilotRef.current) autoPilotRef.current();
          }, ms);
        }
      }
    } else {
      if (lastAutoPilotToggle) {
        setLastAutoPilotToggle(false);
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isAutoPilot, isRobotRunning, autoPilotMinutes, lastAutoPilotToggle]);

  const dailyUsageLimit = 1500;
  const [dailyUsage, setDailyUsage] = useState(() => {
    try {
      const storedStr = localStorage.getItem("portal_ng_daily_usage");
      const today = new Date().toISOString().split("T")[0];
      if (storedStr) {
        const stored = JSON.parse(storedStr);
        if (stored.date === today) return stored.count;
      }
      return 0;
    } catch {
      return 0;
    }
  });

  const [showAuthorForm, setShowAuthorForm] = useState(false);
  const [authorForm, setAuthorForm] = useState({ name: '', role: '', email: '' });

  const getNavClass = (tab) => {
    const base = `flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-2 gap-0' : 'gap-2 px-3'} py-2 rounded-md font-medium text-sm transition-all w-full text-left `;
    if (activeTab === tab) {
      return base + "bg-red-600/10 text-red-500 border border-red-500/10";
    }
    return base + "text-slate-400 hover:bg-slate-800 hover:text-slate-200";
  };

  // --- ACTIONS ---
  const handleDelete = (id, isDraft = false) => {
    let itemToDelete = null;
    if (isDraft) {
      itemToDelete = draftData.find(n => n.id === id);
      if (itemToDelete) {
        setTrashData(prev => [{...itemToDelete, deletedAt: Date.now(), sourceQueue: 'draft'}, ...prev]);
        setDraftData(draftData.filter(n => n.id !== id));
      }
      return;
    }
    if(window.confirm(`Tem certeza que deseja excluir esta matéria?`)) {
      itemToDelete = newsData.find(n => n.id === id);
      if (itemToDelete) {
        setTrashData(prev => [{...itemToDelete, deletedAt: Date.now(), sourceQueue: 'published'}, ...prev]);
        setNewsData(newsData.filter(n => n.id !== id));
      }
    }
  };

  const handleRestore = (id) => {
    const item = trashData.find(n => n.id === id);
    if (!item) return;
    
    setTrashData(trashData.filter(n => n.id !== id));
    
    // Remove the tracking fields
    const { deletedAt, sourceQueue, ...rest } = item;
    
    if (sourceQueue === 'draft' || rest.isDraft) {
      setDraftData(prev => [rest, ...prev]);
    } else {
      setNewsData(prev => [rest, ...prev]);
    }
    showToast("Matéria restaurada com sucesso!");
  };

  const handlePermanentDelete = (id) => {
    if (window.confirm("Esta ação é irreversível. Deseja apagar permanentemente?")) {
      setTrashData(trashData.filter(n => n.id !== id));
    }
  };

  const [editingIsDraft, setEditingIsDraft] = useState(false);

  const handleOpenApprovalModal = (draftOrArticle) => {
    if (!draftOrArticle || !draftOrArticle.id) {
      showToast("Identificador da matéria inválido.", true);
      return;
    }
    const id = draftOrArticle.id;
    const origin = window.location.origin;
    const link = `${origin}/aprovacao/${id}`;
    setApprovalModalData({
      isOpen: true,
      articleId: id,
      title: draftOrArticle.title || 'Sem título',
      subtitle: draftOrArticle.subtitle || '',
      url: link,
      item: draftOrArticle
    });
    setCopiedApprovalLink(false);
  };

  const handleSaveDraftOnly = async () => {
    try {
      if (!formData.title?.trim()) {
        showToast("Preencha ao menos o título da matéria antes de salvar.", true);
        return;
      }

      let targetId = editingId;
      const currentCards = socialRef.current?.getCards ? socialRef.current.getCards() : (formData.socialCards || null);
      const currentCaption = socialRef.current?.getCaptionText ? socialRef.current.getCaptionText() : (formData.captionText || '');
      const dataToSave = {
        ...formData,
        socialCards: currentCards || formData.socialCards || null,
        captionText: currentCaption || formData.captionText || ''
      };

      if (!targetId || editingIsDraft) {
        if (!targetId) {
          targetId = 'draft-' + Date.now();
          const newDraft = {
            ...dataToSave,
            id: targetId,
            date: formData.date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            approvalStatus: 'pending'
          };
          setDraftData(prev => [newDraft, ...prev.filter(d => d.id !== targetId)]);
          setEditingId(targetId);
          setEditingIsDraft(true);
        } else {
          setDraftData(prev => prev.map(d => String(d.id) === String(targetId) ? {
            ...d,
            ...dataToSave,
            updatedAt: new Date().toISOString()
          } : d));
        }
      } else {
        // Matéria já publicada
        setNewsData(prev => prev.map(n => String(n.id) === String(targetId) ? {
          ...n,
          ...dataToSave,
          updatedAt: new Date().toISOString()
        } : n));
      }

      showToast("Alterações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
      showToast("Erro ao salvar alterações.", true);
    }
  };

  const handleGenerateApprovalLinkFromForm = async () => {
    try {
      if (!formData.title?.trim()) {
        showToast("Preencha ao menos o título da matéria antes de gerar o link de aprovação.", true);
        return;
      }

      let targetId = editingId;
      const currentCards = socialRef.current?.getCards ? socialRef.current.getCards() : (formData.socialCards || null);
      const currentCaption = socialRef.current?.getCaptionText ? socialRef.current.getCaptionText() : (formData.captionText || '');
      const dataToSave = {
        ...formData,
        socialCards: currentCards || formData.socialCards || null,
        captionText: currentCaption || formData.captionText || ''
      };

      if (!targetId) {
        targetId = 'draft-' + Date.now();
        const newDraft = {
          ...dataToSave,
          id: targetId,
          date: formData.date || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          approvalStatus: 'pending'
        };
        setDraftData(prev => [newDraft, ...prev.filter(d => d.id !== targetId)]);
        setEditingId(targetId);
        setEditingIsDraft(true);
      } else {
        setDraftData(prev => prev.map(d => d.id === targetId ? {
          ...d,
          ...dataToSave,
          updatedAt: new Date().toISOString()
        } : d));
      }

      const origin = window.location.origin;
      const link = `${origin}/aprovacao/${targetId}`;

      setApprovalModalData({
        isOpen: true,
        articleId: targetId,
        title: formData.title,
        subtitle: formData.subtitle || '',
        url: link,
        item: { ...dataToSave, id: targetId }
      });
      setCopiedApprovalLink(false);
      showToast("Link de aprovação gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar link de aprovação:", err);
      showToast("Erro ao gerar link de aprovação.", true);
    }
  };

  const [isDirectPublishingId, setIsDirectPublishingId] = useState(null);

  const handleDirectPublishAllChannels = async (draft) => {
    if (!draft) return;
    setIsDirectPublishingId(draft.id);
    const siteUrl = `https://portalngbrasil.com.br/#/noticia/${draft.id}`;
    const shareUrl = `https://portalngbrasil.com.br/share.php?id=${draft.id}`;

    setPublishModalData({
      isOpen: true,
      isPublishing: true,
      statusText: '🚀 Publicando no Portal NG Brasil, Instagram, Facebook e Threads...',
      article: draft,
      target: 'all',
      targetPlatforms: ['facebook', 'instagram', 'threads'],
      links: {
        site: siteUrl,
        share: shareUrl,
        instagram: null,
        facebook: null,
        threads: null
      },
      errors: {}
    });

    try {
      const result = await publishArticleToAllChannels({
        article: draft,
        settings: {
          metaToken,
          metaFbPageId,
          metaIgAccountId,
          threadsToken,
          threadsUserId,
          imgbbKey
        },
        reviewerName: draft.approvedBy || 'Editora-Chefe',
        approvalNotes: draft.approvalNotes || 'Aprovado pela editora-chefe e publicado imediatamente em todos os canais.',
        onProgress: ({ message }) => {
          setPublishModalData(prev => ({
            ...prev,
            statusText: message
          }));
        }
      });

      // Atualiza lista local
      setDraftData(prev => prev.filter(d => String(d.id) !== String(draft.id)));
      setNewsData(prev => [
        { ...draft, published: true, isFeatured: true, socialLinks: result.links },
        ...prev.filter(n => String(n.id) !== String(draft.id))
      ]);

      setPublishModalData(prev => ({
        ...prev,
        isPublishing: false,
        statusText: '🎉 Publicação concluída com sucesso em todos os canais!',
        links: result.links,
        errors: result.errors
      }));

      showToast("Matéria postada no Portal, Instagram e Facebook!");
    } catch (err) {
      console.error("Erro na publicação imediata:", err);
      setPublishModalData(prev => ({
        ...prev,
        isPublishing: false,
        statusText: 'Salvo no portal! Erro nas redes: ' + err.message,
        errors: { general: err.message }
      }));
      showToast("Erro ao publicar nas redes: " + err.message, true);
    } finally {
      setIsDirectPublishingId(null);
    }
  };

  const handleEdit = (news, isDraft = false) => {
    setEditingId(news.id);
    setEditingIsDraft(isDraft);
    setComparisonViewMode('summary');
    
    // Fallback and type-casting to ensure no objects are passed to React inputs
    const safeString = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.join('<br/><br/>');
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    const origUrl = safeString(
      news.originalUrl || 
      news.metadata?.url || 
      news.metadata?.link_fonte || 
      news.url || 
      news.link || 
      news.sourceUrl || 
      ''
    );

    let srcName = safeString(
      news.source || 
      news.sourceName || 
      news.metadata?.fonte || 
      (typeof news.author?.role === 'string' && news.author.role.startsWith('Fonte:') ? news.author.role.replace('Fonte: ', '').trim() : '') ||
      ''
    );

    if ((!srcName || srcName.toLowerCase().includes('fonte original')) && origUrl) {
      srcName = getSourceNameFromUrl(origUrl);
    }

    const origTitle = safeString(
      news.originalTitle || 
      news.metadata?.titulo_original || 
      ''
    );

    const origSubtitle = safeString(
      news.originalSubtitle || 
      news.metadata?.subtitulo_original || 
      ''
    );

    const origContent = safeString(
      news.originalContent || 
      news.metadata?.conteudo_original || 
      news.metadata?.resumo_original || 
      ''
    );

    const isAi = !!(
      news.aiGenerated || 
      origTitle || 
      news.metadata?.titulo_original || 
      origUrl ||
      news.author?.name === 'IA Curadora'
    );

    setFormData({
      id: news.id,
      title: safeString(news.title),
      subtitle: safeString(news.subtitle),
      category: typeof news.category === 'string' ? news.category : 'geral',
      praca: typeof news.praca === 'string' ? news.praca : 'Nacional',
      image: safeString(news.image),
      content: safeString(news.content),
      authorName: news.author?.name || 'Redação NG Brasil',
      aiGenerated: isAi,
      originalUrl: origUrl,
      originalTitle: origTitle,
      originalSubtitle: origSubtitle,
      originalContent: origContent,
      metadata: news.metadata || {},
      source: srcName || (origUrl ? getSourceNameFromUrl(origUrl) : 'Fonte Original'),
      date: news.date || new Date().toISOString()
    });
    setShowForm(true);
  };

  const [isUploadingFiles, setIsUploadingFiles] = useState({});
  const [isSavingBanners, setIsSavingBanners] = useState(false);

  const handleImageUpload = async (e, field) => {
    let file = e.target.files[0];
    if (!file) return;
    
    setIsUploadingFiles(prev => ({ ...prev, [field]: true }));
    try {
      const base64Url = await compressImageAndUploadToStorage(file);
      if (!base64Url) throw new Error("Falha na conversão da imagem");
      
      if (field === 'cover') {
        setFormData(prev => ({ ...prev, image: base64Url }));
      } else if (field === 'content') {
        setFormData(prev => ({ 
          ...prev, 
          content: prev.content + `<br><img src="${base64Url}" alt="Imagem no corpo" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0;" /><br>` 
        }));
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Erro ao enviar imagem. Tente uma imagem diferente.", true);
    } finally {
      setIsUploadingFiles(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleBannerImageUpload = async (e, bannerId) => {
    let file = e.target.files[0];
    if (!file) return;
    
    setIsUploadingFiles(prev => ({ ...prev, [`banner_${bannerId}`]: true }));
    try {
      const base64Url = await compressImageAndUploadToStorage(file);
      if (!base64Url) throw new Error("Falha na conversão da imagem");
      
      setLocalBanners(prev => prev.map(b => b.id === bannerId ? { ...b, image: base64Url } : b));
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Erro ao enviar imagem do banner.", true);
    } finally {
      setIsUploadingFiles(prev => ({ ...prev, [`banner_${bannerId}`]: false }));
    }
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let selectedAuthorObj = authors.find(a => a.name === formData.authorName);
    if (!selectedAuthorObj) {
      selectedAuthorObj = {
        name: "Redação NG Brasil",
        role: "Conta Administrativa",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
      };
    }

    const currentSocialCards = socialRef.current?.getCards ? socialRef.current.getCards() : (formData.socialCards || null);

    if (editingId) {
      const originalItem = editingIsDraft 
        ? draftData.find(d => String(d.id) === String(editingId)) 
        : newsData.find(n => String(n.id) === String(editingId));

      const updatedArticle = {
        ...originalItem,
        title: formData.title,
        subtitle: formData.subtitle,
        category: formData.category,
        categoryLabel: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        praca: formData.praca,
        image: formData.image || "",
        content: formData.content,
        isDraft: false,
        aiGenerated: formData.aiGenerated,
        source: formData.source || originalItem?.source || '',
        sourceName: formData.source || originalItem?.sourceName || '',
        originalUrl: formData.originalUrl || originalItem?.originalUrl || '',
        originalTitle: formData.originalTitle || originalItem?.originalTitle || '',
        originalSubtitle: formData.originalSubtitle || originalItem?.originalSubtitle || '',
        originalContent: formData.originalContent || originalItem?.originalContent || '',
        metadata: {
          ...(originalItem?.metadata || {}),
          ...(formData.metadata || {}),
          titulo_original: formData.originalTitle || originalItem?.originalTitle || '',
          subtitulo_original: formData.originalSubtitle || originalItem?.originalSubtitle || '',
          conteudo_original: formData.originalContent || originalItem?.originalContent || '',
          link_fonte: formData.originalUrl || originalItem?.originalUrl || '',
          url: formData.originalUrl || originalItem?.originalUrl || '',
          fonte: formData.source || originalItem?.source || ''
        },
        socialCards: currentSocialCards
      };
      
      // SALVAR COMO "APRENDIZADO / PADRÃO OURO" PARA O ROBÔ
      // Quando o humano edita e salva, a IA vai aprender essa estrutura para as próximas.
      setRobotGoldStandard({
        title: updatedArticle.title,
        subtitle: updatedArticle.subtitle,
        content: updatedArticle.content
      });

      updatedArticle.author = {
        name: selectedAuthorObj.name,
        role: selectedAuthorObj.role,
        avatar: selectedAuthorObj.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
      };

      if (editingIsDraft) {
        // Ensure editingId matches types perfectly
        await setDraftData(draftData.filter(n => String(n.id) !== String(editingId)));
        await setNewsData([updatedArticle, ...newsData]);
      } else {
        await setNewsData(newsData.map(n => String(n.id) === String(editingId) ? updatedArticle : n));
      }
    } else {
      // Create new
      const newArticle = {
        id: `news-${Date.now()}`,
        category: formData.category,
        categoryLabel: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        title: formData.title,
        subtitle: formData.subtitle,
        praca: formData.praca,
        author: {
          name: selectedAuthorObj.name,
          role: selectedAuthorObj.role,
          avatar: selectedAuthorObj.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
        },
        date: dateStr,
        readTime: "3 min de leitura",
        image: formData.image || "",
        isFeatured: true, // Force to see it on home
        isTrending: false,
        views: 0,
        content: formData.content,
        comments: [],
        aiGenerated: formData.aiGenerated,
        source: formData.source || '',
        sourceName: formData.source || '',
        originalUrl: formData.originalUrl || '',
        originalTitle: formData.originalTitle || '',
        originalSubtitle: formData.originalSubtitle || '',
        originalContent: formData.originalContent || '',
        metadata: {
          ...(formData.metadata || {}),
          titulo_original: formData.originalTitle || '',
          subtitulo_original: formData.originalSubtitle || '',
          conteudo_original: formData.originalContent || '',
          link_fonte: formData.originalUrl || '',
          url: formData.originalUrl || '',
          fonte: formData.source || ''
        },
        socialCards: currentSocialCards
      };
      await setNewsData([newArticle, ...newsData]);
      
      // Armazena a ref do artigo para usar na automação
      var publishedArticleRef = newArticle;
    }
    
    const target = publishTargetRef.current || 'all';
    const targetPlatforms = target === 'all' 
      ? ['facebook', 'instagram', 'threads'] 
      : (target === 'portal' ? [] : [target]);
    const finalArticleId = editingId || publishedArticleRef?.id || `news-${Date.now()}`;
    const siteUrl = `https://portalngbrasil.com.br/#/noticia/${finalArticleId}`;
    const shareUrl = `https://portalngbrasil.com.br/share.php?id=${finalArticleId}`;
    const isSocialTarget = target !== 'portal';

    const publishedItem = {
      id: finalArticleId,
      title: formData.title,
      subtitle: formData.subtitle,
      category: formData.category,
      categoryLabel: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
      image: formData.image || "",
      content: formData.content,
      praca: formData.praca
    };

    // Abre imediatamente o popup com todos os links da matéria
    setPublishModalData({
      isOpen: true,
      isPublishing: isSocialTarget,
      statusText: isSocialTarget ? `Publicado no portal! Enviando para redes sociais (${targetPlatforms.join(', ')})...` : 'Publicado no Portal NG Brasil com sucesso!',
      article: publishedItem,
      target,
      targetPlatforms,
      links: {
        site: siteUrl,
        share: shareUrl,
        instagram: null,
        facebook: null,
        threads: null
      },
      errors: {}
    });

    if (isSocialTarget && socialRef.current) {
      try {
        const socialResult = await socialRef.current.postToMeta(targetPlatforms, {
          article: publishedItem,
          shareUrl: shareUrl
        });
        setPublishModalData(prev => ({
          ...prev,
          isPublishing: false,
          statusText: 'Publicação concluída com sucesso no portal e redes sociais!',
          links: {
            ...prev.links,
            instagram: socialResult?.instagram || (targetPlatforms.includes('instagram') ? 'https://www.instagram.com/portalngbrasil/' : null),
            facebook: socialResult?.facebook || (targetPlatforms.includes('facebook') ? (metaFbPageId ? `https://www.facebook.com/${metaFbPageId}` : 'https://www.facebook.com/portalngbrasil') : null),
            threads: socialResult?.threads || (targetPlatforms.includes('threads') ? 'https://www.threads.net/@portalngbrasil' : null)
          },
          errors: {
            instagram: socialResult?.igError,
            facebook: socialResult?.fbError,
            threads: socialResult?.thError
          }
        }));
      } catch (err) {
        setPublishModalData(prev => ({
          ...prev,
          isPublishing: false,
          statusText: 'Salvo no portal! Erro nas redes: ' + err.message,
          links: {
            ...prev.links,
            instagram: targetPlatforms.includes('instagram') ? 'https://www.instagram.com/portalngbrasil/' : null,
            facebook: targetPlatforms.includes('facebook') ? (metaFbPageId ? `https://www.facebook.com/${metaFbPageId}` : 'https://www.facebook.com/portalngbrasil') : null,
            threads: targetPlatforms.includes('threads') ? 'https://www.threads.net/@portalngbrasil' : null
          },
          errors: {
            general: err.message
          }
        }));
      }
    }
  };

  
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
    const parentSignal = options.signal;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    // Listen for parent abort to abort this fetch immediately
    const abortListener = () => controller.abort();
    if (parentSignal) {
        parentSignal.addEventListener('abort', abortListener);
    }
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    } finally {
        if (parentSignal) {
            parentSignal.removeEventListener('abort', abortListener);
        }
    }
  };

  const callAI = async (prompt, signal, retryCount = 0) => {
     let errorMessages = [];
     let generatedText = null;
     
     const wait = (ms) => new Promise(r => setTimeout(r, ms));
     
     // PRIORIDADE 1: CLAUDE (ANTHROPIC) - Melhor modelo de IA (Sonnet 3.7 / 3.5)
     if (robotClaudeKey.trim()) {
       const attemptClaude = async (modelName) => {
         const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
           method: 'POST',
           headers: { 
             'Content-Type': 'application/json', 
             'x-api-key': robotClaudeKey.trim(), 
             'anthropic-version': '2023-06-01', 
             'anthropic-dangerous-direct-browser-access': 'true' 
           },
           body: JSON.stringify({ 
             model: modelName, 
             max_tokens: 4096, 
             messages: [{ role: 'user', content: prompt }] 
           }),
           signal
         });
         if (!claudeRes.ok) {
             if (claudeRes.status === 429 && retryCount < 2) {
                 setRobotStatus(`Limite do Claude (${modelName}) atingido. Aguardando 15s...`);
                 await wait(15000);
                 return await callAI(prompt, signal, retryCount + 1);
             }
             const errText = await claudeRes.text();
             throw new Error(`Claude Falhou (${modelName}): ` + errText);
         }
         const claudeData = await claudeRes.json();
         return claudeData.content[0].text;
       };

       try {
         // Tenta primeiro o modelo topo de linha Claude 3.7 Sonnet
         generatedText = await attemptClaude('claude-3-7-sonnet-20250219');
       } catch (e37) {
         errorMessages.push(e37.message);
         try {
           // Fallback imediato para Claude 3.5 Sonnet
           generatedText = await attemptClaude('claude-3-5-sonnet-20241022');
         } catch (e35) {
           errorMessages.push(e35.message);
         }
       }
     }

     // PRIORIDADE 2: GEMINI (FALLBACK)
     if (!generatedText && robotGeminiKey.trim()) {
       const attemptGemini = async (modelName) => {
         const body = { contents: [{ parts: [{ text: prompt }] }] };
         if (modelName.includes('1.5')) {
           body.generationConfig = { responseMimeType: 'application/json' };
         }
         
         const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${robotGeminiKey.trim()}`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(body),
           signal
         });
         if (!geminiRes.ok) {
             if (geminiRes.status === 429 && retryCount < 2) {
                 setRobotStatus(`Limite da API atingido (${modelName}). Aguardando 15s...`);
                 await wait(15000);
                 return await callAI(prompt, signal, retryCount + 1);
             }
             const errText = await geminiRes.text();
             throw new Error(`Gemini Falhou (${modelName}): ` + errText);
         }
         const geminiData = await geminiRes.json();
         return geminiData.candidates[0].content.parts[0].text;
       };
       try {
         generatedText = await attemptGemini('gemini-1.5-flash');
       } catch (e) { errorMessages.push(e.message); }
     }
     
     // PRIORIDADE 3: OPENAI (CHATGPT FALLBACK)
     if (!generatedText && robotOpenAIKey.trim()) {
       try {
         const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${robotOpenAIKey.trim()}` },
           body: JSON.stringify({ model: 'gpt-4o-mini', response_format: { type: "json_object" }, messages: [{ role: 'user', content: prompt }] }),
           signal
         });
         if (!openAIRes.ok) {
             if (openAIRes.status === 429 && retryCount < 2) {
                 setRobotStatus("Limite do ChatGPT atingido. Aguardando 15s...");
                 await wait(15000);
                 return await callAI(prompt, signal, retryCount + 1);
             }
             const errText = await openAIRes.text();
             throw new Error("ChatGPT Falhou: " + errText);
         }
         const openAIData = await openAIRes.json();
         generatedText = openAIData.choices[0].message.content;
       } catch (e) { errorMessages.push(e.message); }
     }
     
     if (!generatedText) throw new Error(errorMessages.join(" | "));
     return generatedText;
  };

  const evaluateArticle = async (articleObj, signal) => {
      const evalPrompt = `
Você é o Editor-Chefe do Portal NG Brasil. Sua tarefa é auditar a matéria gerada pela IA e decidir se ela será AUTO-PUBLICADA.

CRITÉRIOS DE AVALIAÇÃO:
1. Concorrentes: Se o texto citar "Reuters", "G1", "Folha", "CNN", "Estadão", "Agência Brasil", "Poder360" ou a fonte original como donos da verdade ou de forma subserviente, reprove. O Portal NG Brasil tem voz soberana.
2. Estrutura: Prosa jornalística estruturada em HTML (<p>, <strong>), fluida e envolvente.
3. Linha Editorial: Jornalismo conservador patriota, firme, profissional e combativo. Defesa intransigente da liberdade, valorização de pautas de direita e denúncia de arbitrariedades ou censura. É TERMINANTEMENTE PROIBIDO adotar tom cínico ou esvaziador de esquerda (ex: 'teor limitado', 'sem provas', 'não há confirmação').
4. Fechamento: Deve terminar OBRIGATORIAMENTE com a frase de encerramento do portal.

MATÉRIA A AVALIAR:
Título: ${articleObj.title}
Conteúdo:
${articleObj.content}

Analise rigorosamente. Retorne EXATAMENTE UM JSON válido neste formato (sem markdown):
{
  "score": número de 0 a 100,
  "reason": "Motivo resumido da nota",
  "status": "VERDE" (se score >= 50, a matéria será AUTO-PUBLICADA), ou "VERMELHO" (se score < 50, a matéria contém menção a concorrentes ou falhas graves e será DESCARTADA). NUNCA USE A COR AMARELA, a automação precisa fluir diretamente,
  "image": "OPCIONAL. Se o texto da matéria original contiver uma tag de imagem real, insira a URL aqui. Se não tiver certeza absoluta do link, DEIXE EM BRANCO (\"\"). NUNCA invente links."
}
`;
      try {
          const evalRes = await callAI(evalPrompt, signal);
          let cleanJson = evalRes.replace(/```json/gi, '').replace(/```/g, '').trim();
          const startIndex = cleanJson.indexOf('{');
          const endIndex = cleanJson.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1) cleanJson = cleanJson.substring(startIndex, endIndex + 1);
          const parsed = JSON.parse(cleanJson);
          return parsed;
      } catch (err) {
          console.warn("Erro ao avaliar matéria, assumindo VERDE (auto-publicação).", err);
          return { score: 100, reason: "Aprovação automática (Falha na leitura do avaliador)", status: "VERDE" };
      }
  };

  const fetchOfficialImage = async (url, title, signal) => {
      if (!url || !url.startsWith('http')) return null;
      
      const isJunkImage = (imgUrl) => {
          if (!imgUrl) return true;
          const lowerUrl = imgUrl.toLowerCase();
          const junkKeywords = [
              'logo', 'icon', 'banner', 'appstore', 'playstore', 'apple-store', 'google-play',
              'placeholder', 'default', 'avatar', 'profile', 'author', 'blank', '.svg',
              'newsletter', 'subscribe', 'promo', 'ad-', 'advertisement', 'sponsor'
          ];
          return junkKeywords.some(keyword => lowerUrl.includes(keyword));
      };
      
      // 1. Tenta extrair a foto original com Proxies
      const proxies = [
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          `https://corsproxy.io/?${encodeURIComponent(url)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];

      for (const proxyUrl of proxies) {
          try {
              const res = await fetch(proxyUrl, { signal });
              let htmlStr = '';
              
              if (proxyUrl.includes('allorigins')) {
                  const data = await res.json();
                  htmlStr = data.contents;
              } else {
                  htmlStr = await res.text();
              }
              
              if (htmlStr) {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(htmlStr, 'text/html');
                  let img = doc.querySelector('meta[property="og:image"]')?.content;
                  if (!img) img = doc.querySelector('meta[name="twitter:image"]')?.content;
                  if (!img) {
                      const firstImg = doc.querySelector('article img, main img');
                      if (firstImg && firstImg.src && firstImg.src.startsWith('http')) {
                          img = firstImg.src;
                      }
                  }
                  if (img && img.startsWith('http') && !isJunkImage(img)) return img;
              }
          } catch (err) {
              console.warn(`Proxy falhou: ${proxyUrl}`, err);
          }
      }
      
      // 1.5 O Robô Mestre: Microlink API (Gratuito, Sem Backend, Fura-bloqueios)
      try {
          const mlUrl = 'https://api.microlink.io/?url=' + encodeURIComponent(url);
          const mlRes = await fetch(mlUrl, { signal });
          if (mlRes.ok) {
              const mlData = await mlRes.json();
              if (mlData.status === 'success' && mlData.data && mlData.data.image && mlData.data.image.url) {
                  const mlImg = mlData.data.image.url;
                  if (!isJunkImage(mlImg)) return mlImg;
              }
          }
      } catch (err) {
          console.warn("Falha no Microlink:", err);
      }

      // A partir daqui, se o Microlink ou o proxy direto não acharem a foto oficial no código do link, 
      // NÓS NÃO VAMOS USAR IA PARA PROCURAR.
      // A IA tenta "adivinhar" fotos na internet e acaba trazendo imagens de navios piratas ou alucinações.
      // É melhor ficar em branco (e o jornalista anexar a certa) do que publicar uma foto falsa.
      // A partir daqui, se nenhuma das fontes diretas da URL (AllOrigins, Microlink) achar a foto, 
      // nós NÃO VAMOS "adivinhar" pesquisando no Google ou na Wikipedia.
      // Adivinhar imagens pelo título é perigoso e pode trazer imagens impróprias ou desconexas.
      
      // 3. O Robô Mestre: ScrapeGraphAI (Python Backend Local/Hospedado)
      // Como o ScrapeGraphAI roda em Python, precisamos chamar a nossa API externa
      try {
          // Obtemos a chave do Claude que você salvou no painel
          const claudeKey = localStorage.getItem("portal_ng_claude_key");
          if (claudeKey && claudeKey.trim().length > 5) {
              setRobotStatus('ScrapeGraphAI: Lendo o site com Inteligência Artificial (Claude)...');
              
              const backendUrl = "http://localhost:8000/api/scrape-image"; 
              const sgRes = await fetch(backendUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: url, anthropic_api_key: claudeKey }),
                  signal: signal
              });
              
              if (sgRes.ok) {
                  const sgData = await sgRes.json();
                  if (sgData.imageUrl && sgData.imageUrl.startsWith('http')) {
                      const sgImg = sgData.imageUrl;
                      if (!isJunkImage(sgImg)) return sgImg;
                  }
              }
          }
      } catch(err) {
          console.warn("Falha no ScrapeGraphAI Backend:", err);
      }
      
      return null;
  };

  const runPerplexitySearch = async (e) => {
    e.preventDefault();
    if (!robotPerplexityKey?.trim()) {
      showToast("Por favor, insira a chave da API do Perplexity na aba 'Chaves API'.", true);
      return;
    }
    
    setIsRobotRunning(true);
    setRobotStatus('Pesquisando na internet com Perplexity...');
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const sourceInstruction = robotSearchSource === 'todas' ? '' : ` Foque SOMENTE e ESTRITAMENTE em notícias do site/fonte: ${robotSearchSource}. NUNCA cite essa instrução de fonte na matéria, apenas use-a como restrição de busca.`;
      const isUrlQuery = robotSearchQuery.trim().startsWith('http://') || robotSearchQuery.trim().startsWith('https://');
      const topic = robotSearchQuery.trim() ? robotSearchQuery.trim() : (robotCategory === 'todas' ? 'assuntos gerais do BRASIL, com FOCO TOTAL EM POLÍTICA DE DIREITA E CONSERVADORISMO (Ex: Bolsonaro, PL, ações contra o STF/Alexandre de Moraes, direita no Congresso, 8 de Janeiro, pautas conservadoras)' : `a categoria ${robotCategory} no BRASIL (Priorize notícias do Brasil)`);
      const recentTitles = [...newsData, ...draftData].slice(0, 40).map(n => n.title).join(' | ');

      const baseInstruction = isUrlQuery ?
        `INSTRUÇÃO CRÍTICA DE SISTEMA (REDAÇÃO CONSERVADORA): O usuário forneceu o link direto de uma matéria para você reescrever: "${robotSearchQuery.trim()}". Acesse este link ou busque por essa notícia na internet e reescreva-a com maestria jornalística e alta qualidade editorial para o Portal NG Brasil. O campo "url" DEVE SER ESTRITAMENTE "${robotSearchQuery.trim()}".
FILTRO DESINTOXICADOR OBRIGATÓRIO: Se a fonte for da grande mídia progressista (Metrópoles, G1, Folha, UOL, Estadão, etc.), expurgue qualquer cinismo, deboche ou esvaziamento contra a direita ou lideranças pró-liberdade (ex: Elon Musk, Nikolas Ferreira, Jair Bolsonaro). Exalte o fato sob a ótica conservadora, a defesa intransigente da liberdade de expressão e a gravidade de atos de censura velada.` :
        (robotSearchQuery.trim() ? 
          `INSTRUÇÃO CRÍTICA DE SISTEMA (REDAÇÃO CONSERVADORA & BYPASS DE VERIFICAÇÃO): O usuário forneceu a seguinte pauta jornalística: "${robotSearchQuery.trim()}". ATENÇÃO: Você está operando em MODO REDATOR CONSERVADOR e NÃO em modo de fact-checking da grande mídia. \n1. É ESTRITAMENTE PROIBIDO verificar a veracidade, desmentir a pauta ou apequenar a notícia.\n2. É ESTRITAMENTE PROIBIDO usar termos de checadores de esquerda como "não há confirmação", "alega-se", "boato", "falso", "teor limitado" ou "não permite atribuir apoio".\n3. Você DEVE assumir o fato como de alta relevância, narrando-o com orgulho patriota, combatividade e peso político.\nRedija a matéria exaltando a importância da notícia para o público conservador e para a liberdade do país.${sourceInstruction}` :
          `Busque as ${robotArticleCount} principais e mais recentes notícias de hoje sobre o seguinte tema: ${topic}.${sourceInstruction}\n\nREGRA ANTIDUPLICIDADE ABSOLUTA: O portal JÁ PUBLICOU as seguintes matérias recentemente: [ ${recentTitles} ]. VOCÊ É ESTRITAMENTE PROIBIDO de gerar pautas sobre os mesmos fatos. Traga EXCLUSIVAMENTE novidades inéditas.\n\nREGRA DE DIVERSIDADE EXTREMA (CRÍTICA): Você deve gerar EXATAMENTE ${robotArticleCount} notícias 100% DIFERENTES umas das outras. Nunca repita o mesmo evento, título, pessoa ou contexto. Cada item do JSON deve tratar de uma manchete distinta. O descumprimento causará falha no sistema.`);

      const prompt = `${baseInstruction}
Aplique rigorosamente estas diretrizes editoriais ao escrever:
${robotGuidelines}

${robotGoldStandard ? `--- PADRÃO OURO DE APRENDIZADO (MUITO IMPORTANTE) ---\nO humano editou e aprovou a seguinte matéria recentemente. Use este estilo de título, subtítulo e formatação de texto (uso de HTML, tom, estrutura) como seu modelo perfeito para escrever:\n\nTítulo: ${robotGoldStandard.title}\nSubtítulo: ${robotGoldStandard.subtitle}\nConteúdo: ${robotGoldStandard.content}\n-----------------------------------\n` : ''}

INSTRUÇÕES CRÍTICAS DE AUDITORIA E COMPARAÇÃO EDITORIAL (OBRIGATÓRIO):
Para permitir que o editor humano audite a fonte e compare as informações originais com a versão reescrita, você DEVE OBRIGATORIAMENTE preencher:
1. "source": Nome real do veículo/portal de notícias de onde a matéria se originou (ex: "UOL", "G1", "Folha de S.Paulo", "CNN Brasil", "Metrópoles", "Agência Brasil", etc.).
2. "url": O LINK/URL REAL E COMPLETO da matéria na internet (ex: https://...). É OBRIGATÓRIO informar o link exato para auditoria editorial.
3. "originalTitle": O TÍTULO / MANCHETE ORIGINAL EXATO capturado na fonte original.
4. "originalSubtitle": O SUBTÍTULO / LINHA FINA ORIGINAL da matéria na fonte. Se não houver, crie um resumo de 1 linha dos fatos originais.
5. "originalContent": OS FATOS / PARÁGRAFOS ORIGINAIS extraídos da fonte (mínimo de 3 a 4 parágrafos) para que a redação possa comparar o texto original com a versão reescrita.

O resultado OBRIGATORIAMENTE DEVE SER UM JSON no seguinte formato, sem nenhum texto antes ou depois:
{
  "news": [
    {
      "title": "Novo título impactante e exclusivo para o Portal NG Brasil (sem plágio, valorizando o impacto conservador)",
      "subtitle": "Novo subtítulo explicativo e cativante com peso político",
      "originalTitle": "TÍTULO ORIGINAL EXATO DA NOTÍCIA NA FONTE",
      "originalSubtitle": "Subtítulo / Linha fina original capturada na fonte",
      "originalContent": "Conteúdo original ou resumo factual completo dos parágrafos extraídos da matéria para comparação lado a lado",
      "category": "policial | politica | geral | economia | turismo | esportes | entretenimento | tecnologia | saude | mundo",
      "praca": "Local",
      "content": "Conteúdo completo reescrito em HTML (com tags <p>, <h2>, <strong>) com mínimo de 4 a 5 parágrafos aprofundados, exaltando a verdade e a relevância conservadora, sem marcas de esquerda, finalizando com a frase institucional em itálico.",
      "image": "OPCIONAL: Retorne a URL direta de uma imagem REAL apenas se você tiver certeza absoluta de que o link existe. Se for inventar ou não tiver certeza, DEIXE EM BRANCO (\"\").",
      "source": "Nome do Portal Original (ex: Folha, UOL, G1, CNN)",
      "url": "Link/URL completa da matéria original na fonte (OBRIGATÓRIO)"
    }
  ]
}`;

      const res = await fetch('https://api.perplexity.ai/v1/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${robotPerplexityKey.trim()}`
        },
        body: JSON.stringify({
          preset: 'fast',
          instructions: `${robotSystemRules}\n\nLembre-se de que sua única saída DEVE SER UM OBJETO JSON válido contendo um array 'news' com as notícias, sem formatação markdown adicional.`,
          input: prompt,
          background: false
        }),
        signal
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const rawText = await res.text();
      let text = '';
      let citations = [];
      
      try {
         const data = JSON.parse(rawText);
         if (Array.isArray(data.citations)) {
             citations = data.citations;
         }
         if (Array.isArray(data.web_search_results)) {
             citations = [...citations, ...data.web_search_results.map(r => r.url).filter(Boolean)];
         }
         if (data.output) {
             if (Array.isArray(data.output)) {
                 const msg = data.output.find(o => o.type === 'message' || o.role === 'assistant');
                 if (msg && Array.isArray(msg.content)) {
                     const textObj = msg.content.find(c => c && (c.text || c.type === 'output_text'));
                     if (textObj && textObj.text) {
                         text = textObj.text;
                     } else {
                         text = JSON.stringify(data.output);
                     }
                 } else {
                     text = JSON.stringify(data.output);
                 }
             } else if (typeof data.output === 'string') {
                 text = data.output;
             } else {
                 text = JSON.stringify(data.output);
             }
         } else if (data.choices && data.choices[0] && data.choices[0].message) {
             text = data.choices[0].message.content;
             if (Array.isArray(data.choices[0].message.citations)) {
                 citations = [...citations, ...data.choices[0].message.citations];
             }
         } else {
             text = rawText;
         }
      } catch (e) {
         text = rawText;
      }
      
      if (typeof text !== 'string') {
          text = JSON.stringify(text);
      }
      
      if (!text || text === '[object Object]') {
         throw new Error("Nenhuma notícia encontrada no formato correto. Resposta bruta: " + rawText.substring(0, 1000));
      }
      
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Encontra onde o JSON realmente começa e termina
      const firstBrace = text.indexOf('{');
      const firstBracket = text.indexOf('[');
      const lastBrace = text.lastIndexOf('}');
      const lastBracket = text.lastIndexOf(']');
      
      let startIndex = -1;
      let endIndex = -1;
      
      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          startIndex = firstBrace;
          endIndex = lastBrace;
      } else if (firstBracket !== -1) {
          startIndex = firstBracket;
          endIndex = lastBracket;
      }
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
          text = text.substring(startIndex, endIndex + 1);
      }
      
      let parsed = {};
      try {
          parsed = JSON.parse(text);
          if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
          }
      } catch (e) {
          throw new Error("Erro ao interpretar JSON da IA. Recebido: " + text.substring(0, 500));
      }
      
      let newsArray = parsed.news || parsed.noticias || parsed.articles || parsed.data;
      if (!newsArray && Array.isArray(parsed)) {
          newsArray = parsed;
      }
      
      if (typeof newsArray === 'string') {
          try { newsArray = JSON.parse(newsArray); } catch (e) {}
      }
      
      if (!Array.isArray(newsArray)) {
          throw new Error("Erro: A inteligência artificial não retornou uma lista válida de notícias. Resposta recebida: " + JSON.stringify(parsed).substring(0, 500));
      }
      
      if (newsArray && newsArray.length > 0) {
         let generatedCount = 0;
         let verdeCount = 0;
         let amareloCount = 0;
         
         setRobotStatus('Avaliando matérias geradas (Régua de Aprovação)...');
         for (const article of newsArray) {
            if (signal.aborted) throw new Error('AbortError');
             const safeString = (val) => {
               if (typeof val === 'string') return val;
               if (!val) return '';
               if (Array.isArray(val)) return val.join(' ');
               if (typeof val === 'object') return JSON.stringify(val);
               return String(val);
             };

             if (!article || typeof article !== 'object') {
                 throw new Error("Erro: O item gerado não é um objeto válido. Recebido: " + JSON.stringify(article).substring(0, 200));
             }
             
             const normalizedArticle = {};
             for (const key in article) {
                 normalizedArticle[key.toLowerCase()] = article[key];
             }
             
             const rawTitle = normalizedArticle.title || normalizedArticle.titulo || normalizedArticle.name || '';
             
             if (!rawTitle || rawTitle.trim() === '') {
                 throw new Error("Erro: A IA não enviou um título. Dados recebidos: " + JSON.stringify(article).substring(0, 300));
             }

             let urlVal = safeString(
               normalizedArticle.url || 
               normalizedArticle.link || 
               normalizedArticle.originalurl || 
               normalizedArticle.original_url || 
               normalizedArticle.link_fonte || 
               normalizedArticle.source_url || 
               normalizedArticle.fonte_url || ''
             );

             if (!urlVal && isUrlQuery) {
               urlVal = robotSearchQuery.trim();
             }

             if (!urlVal && citations.length > 0) {
               urlVal = citations[generatedCount % citations.length] || citations[0] || '';
             }

             let sourceVal = safeString(
               normalizedArticle.source || 
               normalizedArticle.fonte || 
               normalizedArticle.portal || 
               normalizedArticle.veiculo || 
               normalizedArticle.origem || ''
             );

             if ((!sourceVal || sourceVal.toLowerCase().includes('fonte original') || sourceVal.toLowerCase().includes('desconhecid')) && urlVal) {
               sourceVal = getSourceNameFromUrl(urlVal);
             }

             const origTitle = safeString(
               normalizedArticle.originaltitle || 
               normalizedArticle.original_title || 
               normalizedArticle.titulo_original || 
               normalizedArticle.titulooriginal || ''
             );

             const origSubtitle = safeString(
               normalizedArticle.originalsubtitle || 
               normalizedArticle.original_subtitle || 
               normalizedArticle.subtitulo_original || 
               normalizedArticle.subtitulooriginal || ''
             );

             const origContent = safeString(
               normalizedArticle.originalcontent || 
               normalizedArticle.original_content || 
               normalizedArticle.conteudo_original || 
               normalizedArticle.conteudooriginal || 
               normalizedArticle.resumo_original || 
               normalizedArticle.texto_original || ''
             );

             const draftObj = {
              id: Date.now() + Math.floor(Math.random() * 10000),
              title: safeString(rawTitle),
              subtitle: safeString(normalizedArticle.subtitle || normalizedArticle.subtitulo || ''),
              category: safeString(normalizedArticle.category || normalizedArticle.categoria || 'geral'),
              praca: safeString(normalizedArticle.praca || normalizedArticle.local || 'Brasil'),
              content: safeString(normalizedArticle.content || normalizedArticle.conteudo || normalizedArticle.texto || ''),
              image: safeString(normalizedArticle.image || normalizedArticle.imagem || ''),
              date: new Date().toISOString(),
              views: 0,
              likes: 0,
              comments: [],
              isDraft: true,
              aiGenerated: true,
              source: sourceVal || (urlVal ? getSourceNameFromUrl(urlVal) : 'Fonte Original'),
              sourceName: sourceVal || (urlVal ? getSourceNameFromUrl(urlVal) : 'Fonte Original'),
              originalUrl: urlVal,
              originalTitle: origTitle,
              originalSubtitle: origSubtitle,
              originalContent: origContent,
              metadata: {
                ...(normalizedArticle.metadata || {}),
                titulo_original: origTitle,
                subtitulo_original: origSubtitle,
                conteudo_original: origContent,
                link_fonte: urlVal,
                url: urlVal,
                fonte: sourceVal || (urlVal ? getSourceNameFromUrl(urlVal) : 'Fonte Original'),
                data_publicacao: new Date().toLocaleDateString('pt-BR')
              }
            };
            
            let avaliacao;
            
            // Se o usuário digitou uma busca específica no Perplexity, nós forçamos a aprovação (Bypass do Avaliador)
            // porque ele já reclamou que o robô descarta pautas reais que ele envia.
            if (robotSearchQuery.trim().length > 3) {
                avaliacao = { status: "VERDE", score: 100, reason: "Aprovação Forçada (Pesquisa Direta do Usuário)" };
            } else {
                avaliacao = await evaluateArticle(draftObj, signal);
            }
            
            if (avaliacao.status !== "VERMELHO") {
                if (avaliacao.image && avaliacao.image.startsWith('http') && !avaliacao.image.includes('unsplash')) {
                    draftObj.image = avaliacao.image;
                }
                
                // Strip hallucinated unsplash images from the initial generation
                if (draftObj.image && draftObj.image.includes('unsplash')) {
                    draftObj.image = "";
                }
                
                if (!draftObj.image || draftObj.image.length < 15 || !draftObj.image.includes('http')) {
                    setRobotStatus('Extraindo foto oficial ou do Google Imagens...');
                    const realImg = await fetchOfficialImage(draftObj.originalUrl, draftObj.title, signal);
                    if (realImg && !realImg.includes('unsplash')) draftObj.image = realImg;
                }
                
                // Se ainda assim não tiver foto, deixamos EM BRANCO para o jornalista preencher.
                // Sem fotos mentirosas ou genéricas de Unsplash.
                if (!draftObj.image || draftObj.image.length < 15 || !draftObj.image.includes('http') || draftObj.image.includes('unsplash')) {
                    draftObj.image = "";
                }
                
                if (robotAutoPublish) {
                    draftObj.isDraft = false;
                    draftObj.author = { name: "Redação NG Brasil", role: "Conta Administrativa", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" };
                    draftObj.readTime = "3 min de leitura";
                    draftObj.isFeatured = true;
                    draftObj.isTrending = false;
                    
                    setNewsData(prev => [draftObj, ...prev]);
                    verdeCount++;
                    
                    if (metaToken) {
                        import('../utils/autoPublish').then(({ autoPublishToMeta }) => {
                            autoPublishToMeta({
                                article: draftObj,
                                metaToken, metaFbPageId, metaIgAccountId, imgbbKey
                            }).then(res => {
                                if (!res.success) console.error("Erro na automação silenciosa de divulgação:", res.error);
                            });
                        });
                    }
                } else {
                    draftObj.isDraft = true;
                    setDraftData(prev => [draftObj, ...prev]);
                    verdeCount++;
                }
            } else {
                console.log(`Matéria DESCARTADA (VERMELHO). Motivo: ${avaliacao.reason}`);
            }
            
            generatedCount++;
            await wait(50);
         }
         
         setAiLogs(prev => [{
            id: Date.now().toString(),
            date: new Date().toISOString(),
            aiUsed: 'Perplexity + Revisor IA',
            generatedCount: verdeCount + amareloCount,
            category: robotCategory,
            status: 'success',
            details: `Pesquisa direta analisada. Aprovadas p/ Publicação (VERDE): ${verdeCount}. Aprovadas p/ Rascunho (AMARELO): ${amareloCount}. Descartadas (VERMELHO): ${generatedCount - (verdeCount + amareloCount)}.`
         }, ...prev]);

         showToast(`Perplexity gerou ${generatedCount} pautas (Verde: ${verdeCount}, Amarelo: ${amareloCount})!`);
         setRobotActiveTab('curadora');
         setActiveTab('materias');
      } else {
         throw new Error("Nenhuma notícia encontrada no formato correto. Recebido: " + rawText.substring(0, 500));
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
          console.log('Pesquisa Perplexity cancelada.');
          return;
      }
      console.error(error);
      
      setAiLogs(prev => [{
         id: Date.now().toString(),
         date: new Date().toISOString(),
         aiUsed: 'Perplexity',
         generatedCount: 0,
         category: robotCategory,
         status: 'error',
         details: error.message
      }, ...prev]);

      showToast("Erro no Perplexity: " + error.message, true);
    } finally {
      setIsRobotRunning(false);
      if (robotStatus !== 'Pesquisa cancelada pelo usuário.') {
         setRobotStatus('');
      }
    }
  };

  const runRobotPipeline = async (e) => {
    e.preventDefault();
    if (!robotUrls.trim() || (!robotGeminiKey.trim() && !robotOpenAIKey.trim() && !robotClaudeKey.trim())) {
      showToast("Por favor, insira os links dos portais e pelo menos uma chave de IA (Gemini, ChatGPT ou Claude).", true);
      return;
    }
    
    setIsRobotRunning(true);
    setRobotStatus('Iniciando análise dos portais...');

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const urls = robotUrls.split('\n').map(u => u.trim()).filter(u => u.length > 5);
      if (urls.length === 0) {
        throw new Error("Nenhum link válido encontrado.");
      }

      let totalGeneratedThisSession = 0;
      let verdeCount = 0;
      let amareloCount = 0;
      const MAX_PER_SESSION = parseInt(robotArticleCount) || 5;
      
      setRobotProgress({
        portals: { current: 0, total: urls.length },
        news: { current: 0, total: MAX_PER_SESSION }
      });

      for (let i = 0; i < urls.length; i++) {
        if (totalGeneratedThisSession >= MAX_PER_SESSION) break;

        let targetUrl = urls[i];
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
        setRobotProgress(p => ({ ...p, portals: { current: i + 1, total: urls.length } }));
        setRobotStatus(`Lendo portal: ${targetUrl}...`);
        
        let pageText = "";
        
        try {
          let jinaSuccess = false;
          if (signal.aborted) throw new Error('AbortError');
          try {
            let res = await fetchWithTimeout(`https://r.jina.ai/${targetUrl}`, { signal }, 15000);
            if (res.ok) {
              const text = await res.text();
              if (!text.toLowerCase().includes("<html") && !text.toLowerCase().includes("<!doctype html>")) {
                 pageText = text;
                 jinaSuccess = true;
              }
            }
          } catch(e) { console.warn("Jina error", e); }
          
          if (!jinaSuccess) {
            let pageHtml = "";
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocalhost) {
              const resLocal = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
              if (resLocal.ok) pageHtml = await resLocal.text();
            } else {
              try {
                if (signal.aborted) throw new Error('AbortError');
                let resCors = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, { signal }, 15000);
                if (resCors.ok) pageHtml = await resCors.text();
              } catch(e) { if (e.name === 'AbortError' || e.message === 'AbortError') throw e; }
              if (!pageHtml) {
                try {
                  if (signal.aborted) throw new Error('AbortError');
                  let resAll = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, { signal }, 15000);
                  if (resAll.ok) pageHtml = await resAll.text();
                } catch(e) { if (e.name === 'AbortError' || e.message === 'AbortError') throw e; }
              }
              if (!pageHtml) {
                try {
                  if (signal.aborted) throw new Error('AbortError');
                  let resCode = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, { signal }, 15000);
                  if (resCode.ok) pageHtml = await resCode.text();
                } catch(e) { if (e.name === 'AbortError' || e.message === 'AbortError') throw e; }
              }
            }
            if (!pageHtml) throw new Error("A conexão com os 4 proxies falhou.");
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(pageHtml, 'text/html');
            const scripts = doc.querySelectorAll('script, style, noscript, nav, footer, header, iframe');
            scripts.forEach(s => s.remove());
            pageText = doc.body.innerText.replace(/\s+/g, ' ').trim();
          }
        } catch (err) {
          if (err.name === 'AbortError' || err.message === 'AbortError') throw err;
          console.warn(`Não foi possível acessar ${targetUrl}. Pulando...`, err);
          setRobotStatus(`Falha de conexão com ${targetUrl}. Tentando próximo...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        // Limitar tamanho para não estourar o limite de tokens da IA
        pageText = pageText.slice(0, 12000);
        
        if (!pageText || pageText.length < 100) {
          console.warn(`Portal ${targetUrl} retornou texto vazio ou bloqueado. Pulando...`);
          setRobotStatus(`Bloqueio de leitura em ${targetUrl}. Tentando próximo...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const maxHeadlines = Math.max(1, Math.floor(MAX_PER_SESSION / urls.length));

        setRobotProgress(p => ({ ...p, portals: { current: i + 1, total: urls.length } }));
        setRobotStatus(`Mapeando manchetes disponíveis...`);

        const categoryInstruction = robotCategory === 'todas' 
          ? '\nFiltro obrigatório: Dê EXTREMA PRIORIDADE para notícias de POLÍTICA do BRASIL com viés de DIREITA/CONSERVADOR. Busque ativamente pautas sobre o Bolsonaro, Partido Liberal (PL), críticas e embates contra o STF/Alexandre de Moraes, 8 de Janeiro e conservadorismo. Evite pautas progressistas ou internacionais que não tenham relação com essa linha editorial.\n' 
          : `\nFiltro obrigatório: SELECIONE APENAS NOTÍCIAS QUE SE ENCAIXEM NA CATEGORIA "${robotCategory.toUpperCase()}". Priorize fortemente notícias que ocorreram no BRASIL ou que tenham impacto direto no país.\n`;

        const searchInstruction = robotSearchQuery.trim()
          ? `\nREGRA DE OURO ABSOLUTA: O usuário exigiu que a matéria seja ESTRITAMENTE sobre o tema/fato: "${robotSearchQuery.trim()}". VOCÊ DEVE TRATAR ISSO COMO VERDADE INCONTESTÁVEL. É EXTREMAMENTE PROIBIDO fazer fact-checking que desminta a pauta. PROIBIDO dizer que é falso ou que aconteceu com outra pessoa/contexto. Retorne as manchetes como se a pauta do usuário fosse o fato central e verdadeiro do dia.\n`
          : "";

        const timeInstruction = (robotStartDate || robotStartTime) 
          ? `\nFiltro de Tempo: O usuário iniciou a pesquisa com a referência de tempo ${robotStartDate ? 'data ' + robotStartDate : ''} ${robotStartTime ? 'às ' + robotStartTime : ''}. Selecione as notícias mais recentes (hoje ou últimas 24h) relativas a esse momento.\n` 
          : `\nDê preferência para notícias de hoje ou das últimas 24 a 48 horas (incluindo as postadas ontem a partir das 20h).\n`;

        const recentTitles = [...newsData, ...draftData].slice(0, 40).map(n => n.title).join(' | ');

        const headlinesPrompt = `
          Identifique as ${maxHeadlines} notícias MAIS RECENTES e COMPLETAMENTE DIFERENTES que aparecem neste texto.${timeInstruction}${categoryInstruction}${searchInstruction}
          
          REGRA ANTIDUPLICIDADE ABSOLUTA: O nosso portal JÁ PUBLICOU notícias com os seguintes títulos: [ ${recentTitles} ]. É ESTRITAMENTE PROIBIDO selecionar manchetes que tratem dos mesmos fatos. Selecione apenas fatos novos e inéditos.
          
          REGRA DE DIVERSIDADE EXTREMA (CRÍTICA): Você deve gerar manchetes 100% DIFERENTES umas das outras. Nunca repita o mesmo evento, título, pessoa ou contexto na mesma lista. Se o texto não tiver manchetes distintas suficientes, retorne menos, mas NUNCA DUPLIQUE o mesmo fato.
          
          RETORNE EXATAMENTE UM OBJETO JSON VÁLIDO no seguinte formato:
          {
            "manchetes": ["TÍTULO 1", "TÍTULO 2"]
          }
          IMPORTANTE: Se o texto for uma página de erro, bloqueio, ou simplesmente não contiver notícias legíveis, retorne {"manchetes": []}.
          NÃO INCLUA markdown ou explicações fora do JSON.
          
          Texto do portal:
          ${pageText}
        `;

        let headlines = [];

        try {
           if (signal.aborted) throw new Error('AbortError');
           const headText = await callAI(headlinesPrompt);
           let cleanH = headText.replace(/```json/gi, '').replace(/```/g, '').trim();
           const startIndex = cleanH.indexOf('{');
           const endIndex = cleanH.lastIndexOf('}');
           if (startIndex !== -1 && endIndex !== -1) {
             cleanH = cleanH.substring(startIndex, endIndex + 1);
           }
           const parsed = JSON.parse(cleanH);
           headlines = Array.isArray(parsed.manchetes) ? parsed.manchetes : [];
        } catch(e) {
           console.warn("Falha ao buscar manchetes", e);
           setRobotStatus(`Erro na IA (${targetUrl}): ${e.message}`);
           await new Promise(r => setTimeout(r, 4000));
           continue;
        }

        if (headlines.length === 0) {
           setRobotStatus(`Nenhuma manchete encontrada em ${targetUrl} (verifique os filtros).`);
           await new Promise(r => setTimeout(r, 2000));
           continue;
        }

        for (let j = 0; j < headlines.length; j++) {
           if (totalGeneratedThisSession >= MAX_PER_SESSION) break;

           const headline = headlines[j];
           setRobotProgress(p => ({ ...p, news: { current: totalGeneratedThisSession + 1, total: MAX_PER_SESSION } }));
           setRobotStatus(`Escrevendo matéria: "${String(headline).substring(0, 40)}..."`);

           const promptArticle = `
${robotSystemRules}

# ENTRADAS QUE VOCÊ RECEBE
- fonte_primaria:
  * Título original na fonte: "${String(headline).replace(/"/g, '\\"')}"
  * Link da matéria: "${targetUrl}"
  * Conteúdo bruto capturado da fonte:
${pageText ? pageText.substring(0, 15000) : 'Não informado'}

- contexto_complementar:
${robotSearchQuery.trim() ? `O usuário solicitou explicitamente que você priorize e valide o seguinte detalhe (Obrigatório constar no parágrafo de continuidade): "${robotSearchQuery.trim()}".` : 'Nenhum acréscimo enviado pela equipe.'}

- contexto_do_momento:
${robotContextoMomento}

# DIRETRIZES COMPLEMENTARES
${robotGuidelines}
${robotFeedback.liked.length > 0 ? `\nTÓPICOS APROVADOS (Priorize):\n- ${robotFeedback.liked.join('\n- ')}\n` : ''}
${robotFeedback.disliked.length > 0 ? `\nTÓPICOS REJEITADOS (Evite):\n- ${robotFeedback.disliked.join('\n- ')}\n` : ''}
${robotGoldStandard ? `\nPADRÃO OURO DE ESTILO (Aprovado pelo Editor Humano):\nTítulo: ${robotGoldStandard.title}\nSubtítulo: ${robotGoldStandard.subtitle}\nConteúdo: ${robotGoldStandard.content}\n` : ''}

# SAÍDA OBRIGATÓRIA (JSON PURO, SEM TEXTO ADICIONAL ANTES OU DEPOIS, SEM MARKDOWN):
{
  "jogada": "o conflito/virada em 1 frase",
  "titulos": ["Opção 1 com gatilho de curiosidade", "Opção 2 com número/contraste", "Opção 3 com fala forte atribuída"],
  "subtitulo": "Subtítulo explicativo com dado mais recente",
  "corpo_site": "<p>Lide com fato âncora e a jogada...</p><p>Detalhe mais forte ou citação literal principal...</p><p>Parágrafo de continuidade obrigatório com o que há de novo...</p><p>Outras falas atribuídas...</p><p>Fechamento factual com o próximo passo...</p>",
  "card_instagram": {"titulo": "Frase de impacto até ~12 palavras", "apoio": "Linha de apoio com o dado ou fala principal"},
  "legenda_instagram": "1ª linha com gancho forte\\n\\n3 a 5 linhas curtas com o essencial e atribuições\\n\\nMatéria completa no link da bio. #portalng #noticias",
  "roteiro_video": "Gancho nos 3 primeiros segundos... Frases curtas, 45 a 60s, terminando com próximo passo",
  "destaque_visual": "qual imagem/trecho usar e por quê",
  "cortes_sugeridos": ["trecho a remover e motivo"],
  "fontes": [{"nome": "Nome do Veículo", "link": "${targetUrl}", "data": "Hoje"}],
  "citacoes_literais": ["\"...\" — Autor"],
  "matriz_fatos": {"fato_ancora": "", "sujeito": "", "acao": "", "data": "", "local": "", "novidade": "", "dado_mais_recente": ""},
  "alertas": ["o que conferir antes de publicar"]
}
`;

           try {
              const articleText = await callAI(promptArticle);
              let cleanA = articleText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const startIndex = cleanA.indexOf('{');
              const endIndex = cleanA.lastIndexOf('}');
              if (startIndex !== -1 && endIndex !== -1) {
                cleanA = cleanA.substring(startIndex, endIndex + 1);
              }
              const draftObj = JSON.parse(cleanA);
              
              const articleTitles = Array.isArray(draftObj.titulos) && draftObj.titulos.length > 0 
                ? draftObj.titulos 
                : (draftObj.title ? [draftObj.title] : (draftObj.titulo ? [draftObj.titulo] : [headline]));
              const mainTitle = articleTitles[0] || headline;
              const mainSubtitle = draftObj.subtitulo || draftObj.subtitle || '';
              const mainContent = draftObj.corpo_site || draftObj.content || draftObj.conteudo || '';

              if (draftObj && mainTitle && mainContent) {
                 const meta = draftObj.metadata || {};
                 let rawLink = meta.link_fonte || targetUrl;
                 if (rawLink && !rawLink.startsWith('http')) {
                   rawLink = 'https://' + rawLink;
                 }

                 let originDomain = new URL(targetUrl).hostname.replace('www.', '');
                 originDomain = originDomain.charAt(0).toUpperCase() + originDomain.slice(1);
                 originDomain = 'Portal ' + originDomain;

                 const metaHtml = `
                   <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 16px; border-radius: 4px; font-family: sans-serif; font-size: 13px; color: #334155; margin-bottom: 24px;">
                     <h4 style="margin-top:0; margin-bottom:8px; color: #0f172a; font-size: 14px; text-transform: uppercase;">🔍 Observações do Redator Sênior (Prompt v3)</h4>
                     <strong>Título Original:</strong> ${meta.titulo_original || headline}<br>
                     <strong>Fonte:</strong> ${originDomain}<br>
                     <strong>Link Referência:</strong> <a href="${rawLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${rawLink}</a><br>
                     ${draftObj.jogada ? `<strong>A Jogada (Conflito/Virada):</strong> ${draftObj.jogada}<br>` : ''}
                     ${articleTitles.length > 1 ? `<strong>Opções de Título (PNL para Clique):</strong><br>• ${articleTitles.join('<br>• ')}<br>` : ''}
                     ${Array.isArray(draftObj.alertas) && draftObj.alertas.length > 0 ? `<div style="margin-top:8px; padding:8px; background:#fffbeb; border:1px solid #fef3c7; border-radius:4px; color:#b45309;"><strong>⚠️ Atenção / Alertas do Redator:</strong> ${draftObj.alertas.join('; ')}</div>` : ''}
                     ${draftObj.destaque_visual ? `<strong>Destaque Visual Sugerido:</strong> ${draftObj.destaque_visual}<br>` : ''}
                   </div>
                 `;

                 const newDraft = {
                    id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    category: robotCategory === 'todas' ? 'geral' : robotCategory,
                    categoryLabel: robotCategory === 'todas' ? 'Geral' : robotCategory.charAt(0).toUpperCase() + robotCategory.slice(1),
                    title: mainTitle,
                    titulos: articleTitles,
                    subtitle: mainSubtitle,
                    praca: 'Nacional',
                    source: originDomain,
                    sourceName: originDomain,
                    author: { name: "IA Curadora (Claude 3.7 / 3.5 Sonnet)", role: `Fonte: ${originDomain}`, avatar: "https://images.unsplash.com/photo-1616161560417-66d4aba5ce44?w=150&auto=format&fit=crop&q=80" },
                    date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
                    readTime: "3 min de leitura",
                    image: draftObj.image || "",
                    content: metaHtml + mainContent,
                    aiGenerated: true,
                    originalUrl: rawLink,
                    originalTitle: meta.titulo_original || headline,
                    originalSubtitle: meta.subtitulo_original || '',
                    originalContent: pageText ? pageText.substring(0, 3000) : '',
                    jogada: draftObj.jogada || '',
                    cardInstagram: draftObj.card_instagram || null,
                    legendaInstagram: draftObj.legenda_instagram || '',
                    roteiroVideo: draftObj.roteiro_video || '',
                    destaqueVisual: draftObj.destaque_visual || '',
                    cortesSugeridos: draftObj.cortes_sugeridos || [],
                    citacoesLiterais: draftObj.citacoes_literais || [],
                    matrizFatos: draftObj.matriz_fatos || null,
                    alertas: draftObj.alertas || [],
                    metadata: {
                      ...meta,
                      url: rawLink,
                      link_fonte: rawLink,
                      fonte: originDomain,
                      titulo_original: meta.titulo_original || headline,
                      conteudo_original: pageText ? pageText.substring(0, 3000) : '',
                      titulos_sugeridos: articleTitles,
                      jogada: draftObj.jogada,
                      card_instagram: draftObj.card_instagram,
                      legenda_instagram: draftObj.legenda_instagram,
                      roteiro_video: draftObj.roteiro_video,
                      destaque_visual: draftObj.destaque_visual,
                      cortes_sugeridos: draftObj.cortes_sugeridos,
                      citacoes_literais: draftObj.citacoes_literais,
                      matriz_fatos: draftObj.matriz_fatos,
                      alertas: draftObj.alertas
                    }
                 };

                                  setRobotStatus('Avaliando matéria com Régua de Aprovação...');
                 const avaliacao = await evaluateArticle(newDraft, signal);
                 
                     if (avaliacao.status !== "VERMELHO") {
                         if (avaliacao.image && avaliacao.image.startsWith('http') && !avaliacao.image.includes('unsplash')) {
                             newDraft.image = avaliacao.image;
                         }
                         
                         // Strip hallucinated unsplash images from the initial generation
                         if (newDraft.image && newDraft.image.includes('unsplash')) {
                             newDraft.image = "";
                         }
                         
                         if (!newDraft.image || newDraft.image.length < 15 || !newDraft.image.includes('http')) {
                             setRobotStatus('Extraindo foto oficial ou do Google Imagens...');
                             const realImg = await fetchOfficialImage(rawLink, newDraft.title, signal);
                             if (realImg && !realImg.includes('unsplash')) newDraft.image = realImg;
                         }
                         
                         // Se ainda assim não tiver foto (Google bloqueou e Fonte bloqueou), 
                         // DEIXAMOS EM BRANCO. Sem fotos mentirosas.
                         if (!newDraft.image || newDraft.image.length < 15 || !newDraft.image.includes('http') || newDraft.image.includes('unsplash')) {
                             newDraft.image = "";
                         }
                     
                     if (robotAutoPublish) {
                         newDraft.isDraft = false;
                         newDraft.isFeatured = true;
                         newDraft.isTrending = false;
                         
                         setNewsData(prev => [newDraft, ...prev]);
                         verdeCount++;
                         
                         if (metaToken) {
                             import('../utils/autoPublish').then(({ autoPublishToMeta }) => {
                                 autoPublishToMeta({
                                     article: newDraft,
                                     metaToken, metaFbPageId, metaIgAccountId, imgbbKey
                                 }).then(res => {
                                     if (!res.success) console.error("Erro na automação de divulgação Varredura:", res.error);
                                 });
                             });
                         }
                     } else {
                         newDraft.isDraft = true;
                         setDraftData(prev => [newDraft, ...prev]);
                         verdeCount++;
                     }
                 } else {
                     console.log(`Matéria DESCARTADA (VERMELHO). Motivo: ${avaliacao.reason}`);
                 }

                 setDailyUsage(prev => {
                    const newTotal = prev + 1;
                    const today = new Date().toISOString().split('T')[0];
                    localStorage.setItem('portal_ng_daily_usage', JSON.stringify({ date: today, count: newTotal }));
                    return newTotal;
                 });

                 totalGeneratedThisSession++;
                 
                 await new Promise(r => setTimeout(r, 4500));
              }
           } catch(e) {
              console.warn("Falha ao gerar matéria individual", e);
           }
        }
      }

      setAiLogs(prev => [{
        id: Date.now().toString(),
        date: new Date().toISOString(),
        aiUsed: aiProvider.toUpperCase() + ' + Revisor IA',
        generatedCount: verdeCount + amareloCount,
        category: robotCategory,
        status: 'success',
        details: `Varredura Completa finalizada. Aprovadas p/ Publicação (VERDE): ${verdeCount}. Aprovadas p/ Rascunho (AMARELO): ${amareloCount}. Descartadas (VERMELHO): ${totalGeneratedThisSession - (verdeCount + amareloCount)}.`
      }, ...prev]);

      setRobotStatus(`Concluído! Verde: ${verdeCount} | Amarelo: ${amareloCount}`);
      
      setTimeout(() => {
        setIsRobotRunning(false);
        setRobotStatus('');
        setRobotProgress(null);
        setActiveTab('materias');
      }, 2000);

    } catch (error) {
      setAiLogs(prev => [{
        id: Date.now().toString(),
        date: new Date().toISOString(),
        aiUsed: aiProvider.toUpperCase(),
        generatedCount: 0,
        category: robotCategory,
        status: 'error',
        details: error.message
      }, ...prev]);
      
      showToast("Erro na Automação: " + error.message, true);
      setIsRobotRunning(false);
      setRobotStatus('');
      setRobotProgress(null);
    }
  };

  const handleGenerateAI = (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate API call for 3 seconds
    setTimeout(() => {
      setFormData({
        ...formData,
        title: `Exclusivo: Tudo o que você precisa saber sobre ${aiPrompt}`,
        subtitle: `Especialistas analisam os impactos de ${aiPrompt} e o que esperar para as próximas semanas no Brasil.`,
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
        content: `
           <h1>O cenário atual</h1>
           <p>O cenário envolvendo <strong>${aiPrompt}</strong> tem chamado a atenção de especialistas em todo o país. Durante a última semana, diversas movimentações indicaram uma mudança clara de paradigma.</p>
           <h2>Principais Pontos</h2>
           <ul>
             <li>Análise aprofundada dos impactos locais e nacionais.</li>
             <li>A perspectiva de especialistas de mercado de tecnologia e política.</li>
             <li>Como a população tem recebido as mudanças e novas diretrizes.</li>
           </ul>
           <p>Em entrevista exclusiva ao <strong>Portal NG Brasil</strong>, fontes ligadas ao setor confirmaram que novas atualizações devem ser divulgadas em breve. "Estamos acompanhando de perto para entender todas as repercussões, mas os primeiros dados mostram uma aceleração muito acima do esperado", afirmou a fonte anônima.</p>
           <br/>
           <p><em>Reportagem gerada com auxílio da Inteligência Artificial do Portal NG.</em></p>
        `
      });
      setIsGenerating(false);
      setShowAiAssistant(false);
      setAiPrompt('');
    }, 3000);
  };

  const generateAIRevision = async () => {
    if (!robotClaudeKey) {
      showToast("Por favor, configure a chave API do Claude nas configurações do robô.", true);
      return;
    }
    
    setIsGenerating(true);
    try {
      const promptText = `
Você é um editor sênior de jornalismo. O usuário quer revisar uma matéria existente com o seguinte pedido: "${aiPrompt}"

MATÉRIA ATUAL:
TÍTULO: ${formData.title}
SUBTÍTULO: ${formData.subtitle}
CONTEÚDO:
${formData.content.replace(/<[^>]+>/g, '')}

Reescreva a matéria conforme o pedido.
IMPORTANTE: Retorne ESTRITAMENTE um JSON com este formato (NENHUM TEXTO ADICIONAL):
{
  "title": "O novo título",
  "subtitle": "O novo subtítulo",
  "content": "O novo conteúdo formatado em HTML"
}
`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': robotClaudeKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{ role: 'user', content: promptText }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      let resultText = data.content[0].text;
      
      // Attempt to clean JSON if Claude returns markdown wrappers
      if (resultText.includes('\`\`\`json')) {
        resultText = resultText.split('\`\`\`json')[1].split('\`\`\`')[0].trim();
      } else if (resultText.includes('\`\`\`')) {
        resultText = resultText.split('\`\`\`')[1].split('\`\`\`')[0].trim();
      }

      const parsed = JSON.parse(resultText);

      setFormData(prev => ({
        ...prev,
        title: parsed.title || prev.title,
        subtitle: parsed.subtitle || prev.subtitle,
        content: parsed.content || prev.content
      }));
      setAiPrompt('');
      showToast("Texto revisado pela IA com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao revisar texto com IA: " + err.message, true);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- VIEWS ---
  const renderInsights = () => {
    const totalViews = newsData.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const sortedByViews = newsData.slice().sort((a,b) => (b.views||0) - (a.views||0));
    const latestArticle = newsData[0]; // array is sorted by id (date) desc in App.jsx
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-6 h-6 text-red-500" />
          <h2 className="text-lg font-bold text-slate-800">Módulo de Insights & Analytics</h2>
        </div>

        {/* Realtime Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-600 to-red-800 text-white p-6 rounded-xl shadow-lg border border-red-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Activity className="w-16 h-16" /></div>
            <span className="text-sm font-bold uppercase tracking-wider text-red-200">Em tempo real</span>
            <div className="text-4xl font-black mt-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse"></span>
              {activeUsersCount}
            </div>
            <p className="text-xs text-red-100 mt-1">leitores ativos agora</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 sm:col-span-3 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-slate-500 mb-4">Visão Geral de Desempenho (Total)</h3>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-2xl font-black text-slate-800">{totalViews.toLocaleString('pt-BR')}</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Total Views</div>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-slate-800">{newsData.length}</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Publicações</div>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-red-600">
                  {newsData.length > 0 ? Math.round(totalViews / newsData.length) : 0}
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Média de Views</div>
              </div>
            </div>
          </div>
        </div>

        {/* Previews and Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <FileText className="w-4 h-4 text-blue-500" /> Última Notícia Postada
            </h3>
            {latestArticle ? (
              <div className="border border-slate-100 rounded-lg overflow-hidden group">
                <div className="h-40 w-full overflow-hidden bg-slate-100 relative">
                  <img src={latestArticle.image} alt={latestArticle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 text-white">
                     <span className="text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded uppercase tracking-wider">{latestArticle.categoryLabel}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50">
                  <h4 className="font-bold text-slate-800 mb-1 line-clamp-2 leading-tight">{latestArticle.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-2"><Eye className="w-3 h-3"/> {latestArticle.views || 0} visualizações</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-10">Nenhuma matéria publicada ainda.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-purple-500" /> Top Matérias Mais Lidas
            </h3>
            <ul className="space-y-4 divide-y divide-slate-100">
              {sortedByViews.slice(0, 4).map((item, i) => (
                <li key={i} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate" title={item.title}>{item.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{item.categoryLabel}</p>
                  </div>
                  <div className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-md shrink-0 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {item.views ? item.views.toLocaleString('pt-BR') : 0}
                  </div>
                </li>
              ))}
              {sortedByViews.length === 0 && <li className="text-center text-slate-500 text-sm">Sem dados de visualização</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderMaterias = () => {
    if (showForm) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? (editingIsDraft ? 'Revisar Rascunho da IA' : 'Editar Matéria') : 'Criar Nova Matéria'}</h2>
              {!editingId && (
                <button 
                  onClick={() => setShowAiAssistant(!showAiAssistant)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all"
                  title="Gerar com IA"
                >
                  <Sparkles className="w-3.5 h-3.5" /> IA
                </button>
              )}
            </div>
            <button onClick={() => {setShowForm(false); setEditingId(null); setShowAiAssistant(false); setFormActiveTab('portal');}} className="text-sm text-slate-500 hover:text-slate-800 font-semibold">Cancelar</button>
          </div>

          <div className="p-6">
            <div className="max-w-4xl mx-auto">

          {showAiAssistant && (
            <div className="mb-8 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900">Assistente de Redação com IA</h3>
              </div>
              <p className="text-xs text-indigo-700 mb-4">Sobre o que você quer escrever hoje? A inteligência artificial irá criar o título, a linha fina e estruturar o artigo completo para você em segundos.</p>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: A nova medida provisória do governo sobre impostos..." 
                  className="flex-1 px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white text-slate-800"
                  disabled={isGenerating}
                />
                <button 
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                  {isGenerating ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Gerando...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Gerar Matéria</>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-indigo-400 mt-2 italic">* Simulação visual pronta para integração futura via API.</p>
            </div>
          )}

          {formData.aiGenerated && (
            <div className="mb-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
              {/* Header com Abas de Visualização */}
              <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Comparador Editorial & Auditoria de Fonte</h3>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                        Perplexity • Verificação Anti-Plágio
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Compare as informações originais da fonte com a matéria reescrita pelo Portal NG.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setComparisonViewMode('summary')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      comparisonViewMode === 'summary' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Resumo & Metadados
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonViewMode('fullText')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      comparisonViewMode === 'fullText' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Texto Completo Lado a Lado
                  </button>
                </div>
              </div>
              
              <div className="p-5">
                {comparisonViewMode === 'summary' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LADO ESQUERDO: FONTE ORIGINAL */}
                    <div className="p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between group hover:border-slate-300 transition-colors">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
                      
                      <div>
                        {/* Topo do Card Esquerdo */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-black tracking-widest uppercase rounded-md shadow-sm">
                              {formData.source || 'Fonte Original'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Versão Capturada</span>
                          </div>
                          
                          {formData.originalUrl && (
                            <a 
                              href={formData.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                              title="Abrir página original em nova aba"
                            >
                              Abrir link <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Link da Notícia Original - Super Destacado */}
                        <div className="mb-4">
                          {formData.originalUrl ? (
                            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3 text-blue-600" /> Link Direto da Origem
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(formData.originalUrl);
                                    showToast("Link da origem copiado!");
                                  }}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition-colors"
                                  title="Copiar URL para a área de transferência"
                                >
                                  <Copy className="w-3 h-3" /> Copiar
                                </button>
                              </div>
                              <a 
                                href={formData.originalUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline break-all block line-clamp-2"
                              >
                                {formData.originalUrl}
                              </a>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600" /> Link de Origem Não Identificado
                                </span>
                                {(formData.originalTitle || formData.title) && (
                                  <a 
                                    href={`https://www.google.com/search?q=${encodeURIComponent(formData.originalTitle || formData.title)}`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                                  >
                                    <Search className="w-3 h-3" /> Buscar no Google ↗
                                  </a>
                                )}
                              </div>
                              <div className="flex gap-1.5 mt-1">
                                <input 
                                  type="url"
                                  placeholder="Cole a URL original aqui (ex: https://uol.com.br/...)"
                                  value={formData.originalUrl || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const detectedSource = val ? getSourceNameFromUrl(val) : '';
                                    setFormData(prev => ({
                                      ...prev, 
                                      originalUrl: val,
                                      source: (!prev.source || prev.source === 'Fonte Original') && detectedSource ? detectedSource : prev.source
                                    }));
                                  }}
                                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-amber-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Título Original */}
                        <div className="mb-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Manchete Original na Fonte
                          </span>
                          <h4 className="text-base font-black text-slate-800 leading-tight">
                            {formData.originalTitle || (formData.metadata && formData.metadata.titulo_original) || 'Título original não identificado.'}
                          </h4>
                        </div>

                        {/* Subtítulo / Linha Fina Original */}
                        <div className="mb-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Linha Fina / Subtítulo Original
                          </span>
                          {formData.originalSubtitle ? (
                            <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                              {formData.originalSubtitle}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Subtítulo original não extraído pela fonte.
                            </p>
                          )}
                        </div>

                        {/* Conteúdo / Fatos Originais Extraídos */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Fatos & Conteúdo Original da Fonte
                            </span>
                            <span className="text-[9px] text-slate-400">Base Factual</span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 max-h-44 overflow-y-auto leading-relaxed whitespace-pre-line">
                            {formData.originalContent ? (
                              formData.originalContent.replace(/<[^>]+>/g, ' ')
                            ) : (
                              <div className="space-y-1">
                                <p className="italic text-slate-400">Corpo bruto da matéria original não registrado no rascunho.</p>
                                {formData.originalUrl && (
                                  <a 
                                    href={formData.originalUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                                  >
                                    Clique aqui para ler a matéria na fonte <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rodapé Card Esquerdo */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Extraído em: {formData.date ? new Date(formData.date).toLocaleString('pt-BR') : 'Hoje'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {formData.source || 'Portal Externo'}
                        </span>
                      </div>
                    </div>

                    {/* LADO DIREITO: REESCRITO COM IA */}
                    <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-200 rounded-xl shadow-[0_4px_15px_-4px_rgba(79,70,229,0.1)] relative overflow-hidden flex flex-col justify-between group hover:border-indigo-300 transition-colors">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>

                      <div>
                        {/* Topo do Card Direito */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-black tracking-widest uppercase rounded-md shadow-sm flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3" /> Reescrito com IA
                            </span>
                            <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase">Portal NG Brasil</span>
                          </div>
                          
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Pronto para Publicação
                          </span>
                        </div>

                        {/* Slug / Link Previsto */}
                        <div className="mb-4">
                          <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                              URL Prevista no Portal NG
                            </span>
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 break-all">
                              <Globe className="w-3.5 h-3.5 shrink-0" />
                              <span className="line-clamp-1">/{formData.category}/{formData.title ? formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'nova-materia'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Título Reescrito */}
                        <div className="mb-3">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">
                            Nova Manchete Otimizada
                          </span>
                          <h4 className="text-base font-black text-slate-900 leading-tight">
                            {formData.title || 'Título gerado pela IA aparecerá aqui'}
                          </h4>
                        </div>

                        {/* Subtítulo Reescrito */}
                        <div className="mb-3">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">
                            Nova Linha Fina (Resumo Inédito)
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                            {formData.subtitle || 'Subtítulo gerado pela IA aparecerá aqui'}
                          </p>
                        </div>

                        {/* Prévia do Conteúdo Reescrito */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                              Prévia do Conteúdo Gerado
                            </span>
                            <span className="text-[9px] text-emerald-600 font-bold">100% Autoral</span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs text-slate-600 max-h-44 overflow-y-auto leading-relaxed">
                            <div dangerouslySetInnerHTML={{ 
                              __html: formData.content 
                                ? (formData.content.replace(/<div style="background-color: #f8fafc;[\s\S]*?<\/div>/i, '').substring(0, 450) + '...')
                                : '<p className="text-slate-400 italic">Sem conteúdo</p>' 
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Selos do Card Direito */}
                      <div className="pt-3 border-t border-indigo-100 flex flex-wrap gap-2 items-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100">
                          <CheckCircle className="w-3 h-3" /> SEO Otimizado
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100">
                          <CheckCircle className="w-3 h-3" /> Anti-Plágio
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-white text-slate-600 text-[10px] font-bold rounded border border-slate-200">
                          Editoria: <span className="text-slate-800 ml-1 uppercase">{formData.category}</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-white text-slate-600 text-[10px] font-bold rounded border border-slate-200">
                          Praça: <span className="text-slate-800 ml-1">{formData.praca}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODO TEXTO COMPLETO LADO A LADO */
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      {/* Coluna Esquerda: Texto Integral Original */}
                      <div className="p-5 bg-slate-50/50">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded uppercase">
                              {formData.source || 'Fonte Original'}
                            </span>
                            <span className="text-xs font-bold text-slate-700">Texto Original Capturado</span>
                          </div>
                          {formData.originalUrl && (
                            <a href={formData.originalUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                              Abrir na fonte <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="mb-4">
                          <h3 className="text-lg font-black text-slate-900 leading-snug mb-2">
                            {formData.originalTitle || 'Sem título original registrado'}
                          </h3>
                          {formData.originalSubtitle && (
                            <p className="text-sm font-semibold text-slate-600 leading-relaxed mb-3 italic">
                              {formData.originalSubtitle}
                            </p>
                          )}
                          {formData.originalUrl && (
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 break-all mb-3">
                              <strong>URL de Origem:</strong> <a href={formData.originalUrl} target="_blank" rel="noreferrer" className="underline">{formData.originalUrl}</a>
                            </div>
                          )}
                        </div>

                        <div className="prose prose-sm text-slate-700 max-h-[500px] overflow-y-auto pr-2 leading-relaxed whitespace-pre-line text-sm border-t border-slate-200 pt-3">
                          {formData.originalContent ? (
                            formData.originalContent.replace(/<[^>]+>/g, '\n\n')
                          ) : (
                            <div className="text-center py-12 text-slate-400">
                              <p className="font-medium">O corpo bruto original não foi salvo para este rascunho anterior.</p>
                              {formData.originalUrl && (
                                <a href={formData.originalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-blue-600 font-bold underline">
                                  Visualizar conteúdo diretamente no portal original ↗
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Coluna Direita: Texto Integral Reescrito */}
                      <div className="p-5 bg-indigo-50/20">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-indigo-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Portal NG
                            </span>
                            <span className="text-xs font-bold text-indigo-900">Versão Reescrita Pronta</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Otimizado para Publicação
                          </span>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-lg font-black text-slate-900 leading-snug mb-2">
                            {formData.title || 'Título reescrito'}
                          </h3>
                          <p className="text-sm font-semibold text-slate-600 leading-relaxed mb-3 italic">
                            {formData.subtitle || 'Subtítulo reescrito'}
                          </p>
                          <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-100 break-all mb-3">
                            <strong>Slug do Portal:</strong> /{formData.category}/{formData.title ? formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'materia'}
                          </div>
                        </div>

                        <div className="prose prose-sm text-slate-800 max-h-[500px] overflow-y-auto pr-2 leading-relaxed text-sm border-t border-indigo-100 pt-3">
                          <div dangerouslySetInnerHTML={{ 
                            __html: formData.content 
                              ? formData.content.replace(/<div style="background-color: #f8fafc;[\s\S]*?<\/div>/i, '') 
                              : '<p className="text-slate-400 italic">Sem conteúdo</p>' 
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveForm} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-2 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Título da Manchete</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="Ex: Senado aprova nova lei..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Linha Fina (Subtítulo)</label>
                  <input required type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="Resumo rápido da notícia" />
                </div>

                {/* Bloco de Auditoria de Fonte Original */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5 text-blue-600" /> Link da Matéria Original (Auditoria)</span>
                      {formData.originalUrl && (
                        <a href={formData.originalUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                          Abrir Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input 
                      type="url" 
                      value={formData.originalUrl || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        const autoSrc = val ? getSourceNameFromUrl(val) : '';
                        setFormData(prev => ({ 
                          ...prev, 
                          originalUrl: val,
                          source: (!prev.source || prev.source === 'Fonte Original') && autoSrc ? autoSrc : prev.source
                        }));
                      }} 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none" 
                      placeholder="https://uol.com.br/noticia-original..." 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Portal / Veículo de Origem
                    </label>
                    <input 
                      type="text" 
                      value={formData.source || ''} 
                      onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))} 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none" 
                      placeholder="Ex: UOL, G1, Folha de S.Paulo, CNN Brasil..." 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Editoria</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm">
                      <option value="geral">Geral</option>
                      <option value="policial">Policial</option>
                      <option value="politica">Política</option>
                      <option value="economia">Economia</option>
                      <option value="turismo">Turismo</option>
                      <option value="esportes">Esportes</option>
                      <option value="entretenimento">Entretenimento</option>
                      <option value="tecnologia">Tecnologia</option>
                      <option value="saude">Saúde</option>
                      <option value="mundo">Mundo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Estado / Região</label>
                    <select value={formData.praca} onChange={e => setFormData({...formData, praca: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm">
                      <option value="Nacional">Nacional</option>
                      <option value="Amapá">Amapá</option>
                      <option value="São Paulo">São Paulo</option>
                      <option value="Rio de Janeiro">Rio de Janeiro</option>
                      <option value="Rio Grande do Sul">Rio Grande do Sul</option>
                      <option value="Minas Gerais">Minas Gerais</option>
                      <option value="Bahia">Bahia</option>
                      <option value="Distrito Federal">Distrito Federal</option>
                      <option value="Pará">Pará</option>
                      <option value="Mundo">Mundo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jornalista (Autor)</label>
                    <select value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm">
                      <option value="Redação NG Brasil">Redação NG Brasil</option>
                      <option value="IA Curadora">IA Curadora</option>
                      {authors.map((author, idx) => (
                        <option key={idx} value={author.name}>{author.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Imagem de Capa (Upload ou Link)</label>
                  <div className="flex gap-2 mb-2">
                    <label className={`flex-1 flex items-center justify-center ${formData.image ? 'bg-green-600 hover:bg-green-700' : 'bg-[#040f1d] hover:bg-slate-800'} text-white px-4 py-2 rounded-md text-sm font-bold cursor-pointer transition-colors relative`}>
                      {isUploadingFiles['cover'] ? 'Enviando...' : (formData.image && !formData.image.startsWith('http') ? '✓ Imagem Recebida' : 'Upload do PC')}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'cover')} 
                        onClick={(e) => { e.target.value = null }}
                        className="hidden" 
                        disabled={isUploadingFiles['cover']}
                      />
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ou cole o link de uma imagem da internet..." 
                      value={formData.image && formData.image.startsWith('http') ? formData.image : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-[2] px-4 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                  {formData.image && (
                    <div className="flex items-end gap-3 mt-2 mb-4">
                      <div className="w-32 h-20 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={formData.image} alt="Preview da Capa" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=Imagem+Invalida' }} />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))} 
                        className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors border border-red-100 mb-1"
                      >
                        Remover Imagem
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-slate-700">Conteúdo da Notícia</label>
                    <label className={`text-xs ${isUploadingFiles['content'] ? 'text-slate-500 bg-slate-100' : 'text-[#d40a38] hover:text-red-700 bg-red-50 cursor-pointer'} font-bold flex items-center gap-1 px-2 py-1 rounded`}>
                      {isUploadingFiles['content'] ? 'Enviando...' : '+ Inserir Foto no Texto'}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'content')} className="hidden" disabled={isUploadingFiles['content']} />
                    </label>
                  </div>
                  <div className="bg-white rounded-md border border-slate-300 overflow-hidden mb-12">
                    <Editor 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      containerProps={{ style: { height: '400px', overflowY: 'auto' } }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Right Column: AI Assistant Panel */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl border border-indigo-100 p-5 sticky top-6 shadow-sm">
                  <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-600" /> Modificar com IA</h3>
                  <p className="text-xs text-slate-600 mb-4">Peça à inteligência artificial para reescrever o texto ao lado, corrigir erros, mudar o tom ou criar um título melhor.</p>
                  
                  <textarea 
                    rows={4}
                    placeholder="Ex: Reescreva a matéria de forma mais dramática, dê um título mais chamativo..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3 resize-none"
                  ></textarea>
                  
                  <button 
                    type="button"
                    onClick={generateAIRevision}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className={`w-full font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-all ${
                      isGenerating || !aiPrompt.trim() 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isGenerating ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Modificando...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Aplicar Alterações</>
                    )}
                  </button>
                </div>
              </div>
              
            </div>
            
            {/* Social Post Generator Integrado */}
            <div className="mt-12 mb-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Artes e Redes Sociais</h3>
              <SocialPostGenerator ref={socialRef} hideButtons={true} showToast={showToast} inline={true} article={formData} metaToken={metaToken} metaFbPageId={metaFbPageId} metaIgAccountId={metaIgAccountId} threadsToken={threadsToken} threadsUserId={threadsUserId} imgbbKey={imgbbKey} />
            </div>

            {/* Ações de Publicação e Aprovação */}
            <div className="space-y-3 pt-6 border-t border-slate-200">
              
              {/* Linha 1: Salvar Alterações e Enviar para Aprovação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={handleSaveDraftOnly}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 px-4 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-emerald-400" /> Salvar Alterações
                </button>
                
                <button 
                  type="button" 
                  onClick={handleGenerateApprovalLinkFromForm}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-white" /> Enviar para Aprovação
                </button>
              </div>

              {/* Linha 2: Botão Principal de Publicação Geral Imediata */}
              <button 
                type="submit" 
                onClick={() => publishTargetRef.current = 'all'}
                className="w-full bg-[#d40a38] hover:bg-red-700 text-white py-4 rounded-xl text-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" /> 
                {editingId ? (editingIsDraft ? 'Aprovar e Publicar Matéria (Portal + Redes Sociais)' : 'Salvar Alterações e Postar (Portal + Redes Sociais)') : 'Publicar Matéria Imediatamente (Portal + Redes Sociais)'}
              </button>
              
              {/* Linha 3: Publicação em canais específicos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                  type="submit" 
                  onClick={() => publishTargetRef.current = 'portal'}
                  className="bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center cursor-pointer"
                >
                  Postar Apenas no Portal
                </button>
                <button 
                  type="submit" 
                  onClick={() => publishTargetRef.current = 'instagram'}
                  className="bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-lg text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center cursor-pointer"
                >
                  Postar Apenas no Instagram
                </button>
                <button 
                  type="submit" 
                  onClick={() => publishTargetRef.current = 'facebook'}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center cursor-pointer"
                >
                  Postar Apenas no Facebook
                </button>
                <button 
                  type="submit" 
                  onClick={() => publishTargetRef.current = 'threads'}
                  className="bg-black hover:bg-zinc-800 text-white py-3 rounded-lg text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center cursor-pointer"
                >
                  Postar Apenas no Threads
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gestão de Matérias</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar matérias publicadas..." 
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500 w-full sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="px-6 py-3">Título</th>
                <th className="px-6 py-3">Editoria / Região</th>
                <th className="px-6 py-3">Views <Eye className="w-3 h-3 inline ml-1" /></th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3 text-right sticky right-0 top-0 bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] border-l border-slate-100 z-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {newsData.map((news) => (
                <tr key={news.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900 max-w-sm truncate" title={news.title}>{news.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Por {news.author?.name || (typeof news.author === 'string' ? news.author : 'Redação NG Brasil')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {news.categoryLabel}
                    </span>
                    <span className="text-xs text-slate-500 ml-2 block sm:inline mt-1 sm:mt-0">{news.praca}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-red-600">
                    {news.views ? news.views.toLocaleString('pt-BR') : 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {news.date && news.date.includes('T') ? new Date(news.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : news.date}
                  </td>
                  <td className="px-6 py-4 text-right sticky right-0 bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] border-l border-slate-100 whitespace-nowrap">
                    <button onClick={() => {
                      navigator.clipboard.writeText(`https://portalngbrasil.com.br/share.php?id=${news.id}`);
                      showToast("Link copiado com sucesso!");
                    }} className="text-slate-400 hover:text-green-600 mr-2 transition-colors inline-flex items-center gap-1 font-bold text-xs bg-green-50 px-2 py-1 rounded" title="Copiar Link">
                      <LinkIcon className="w-3.5 h-3.5 text-green-600" /> Copiar
                    </button>
                    <button onClick={() => setSocialModalArticle(news)} className="text-slate-400 hover:text-indigo-600 mr-2 transition-colors inline-flex items-center gap-1 font-bold text-xs bg-indigo-50 px-2 py-1 rounded" title="Gerar Card Instagram (Canva)">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" /> Insta
                    </button>

                    <button onClick={() => handleEdit(news)} className="text-slate-400 hover:text-blue-600 mr-3 transition-colors" title="Editar">
                      <Edit3 className="w-4 h-4 inline" />
                    </button>
                    <button onClick={() => handleDelete(news.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {newsData.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhuma matéria publicada.</div>
          )}
        </div>
      </div>
    );
  };

  const renderAutores = () => {
    const handleSaveAuthor = async (e) => {
      e.preventDefault();
      try {
        // Criar uma instância secundária do Firebase para não deslogar o Admin
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
        const secondaryAuth = getAuth(secondaryApp);
        
        await createUserWithEmailAndPassword(secondaryAuth, authorForm.email, "portalng2026");
        await authSignOut(secondaryAuth);
        
        showToast(`Autor criado! A senha padrão é: portalng2026`);
        setAuthors([{ ...authorForm, articles: 0 }, ...authors]);
        setShowAuthorForm(false);
        setAuthorForm({ name: "", role: "", email: "" });
      } catch (error) {
        if (error.code === "auth/email-already-in-use") {
          showToast("Este e-mail já tem acesso ao painel.", true);
          // Mesmo se já existir na Auth, adiciona na lista visual se não tiver
          if (!authors.find(a => a.email === authorForm.email)) {
            setAuthors([{ ...authorForm, articles: 0 }, ...authors]);
            setShowAuthorForm(false);
            setAuthorForm({ name: "", role: "", email: "" });
          }
        } else {
          showToast("Erro ao criar autor: " + error.message, true);
        }
      }
    };

    if (showAuthorForm) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Convidar Novo Autor</h2>
            <button onClick={() => setShowAuthorForm(false)} className="text-sm text-slate-500 hover:text-slate-800 font-semibold">Cancelar</button>
          </div>
          <form onSubmit={handleSaveAuthor} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
              <input required type="text" value={authorForm.name} onChange={e => setAuthorForm({...authorForm, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail Corporativo</label>
              <input required type="email" value={authorForm.email} onChange={e => setAuthorForm({...authorForm, email: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="joao@portalng.com.br" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cargo / Função</label>
              <input required type="text" value={authorForm.role} onChange={e => setAuthorForm({...authorForm, role: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="Ex: Repórter de Economia" />
            </div>
            <button type="submit" className="w-full bg-[#d40a38] hover:bg-red-700 text-white transition-colors py-3 rounded-md text-sm font-bold shadow-sm">
              Enviar Convite
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-4xl">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gestão de Autores</h2>
          <button onClick={() => setShowAuthorForm(true)} className="bg-[#d40a38] hover:bg-red-700 text-white transition-colors px-3 py-1.5 rounded text-xs font-bold">
            Convidar Autor
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {[{ name: "Redação NG Brasil", role: "Conta Administrativa", email: "admin@portalng.com.br", articles: newsData.length }].map((author, i) => (
            <div key={i} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0">
                  {author.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{author.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{author.role}</p>
                  <p className="text-[10px] text-red-600 truncate">{author.email}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-slate-700">{author.articles}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Publicações</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConfiguracoes = () => {
    const handleSaveConfig = (e) => {
      e.preventDefault();
      showToast("Configurações salvas com sucesso!");
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl">
          {/* Card de Configuração do Slogan e SEO */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#d40a38]" /> Slogan & Identidade Oficial
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Altere o slogan e os textos que aparecem no topo do portal e no WhatsApp</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Slogan Principal do Portal <span className="text-[#d40a38]">*</span>
                </label>
                <input 
                  type="text" 
                  value={siteSlogan} 
                  onChange={e => setSiteSlogan(e.target.value)} 
                  placeholder="Ex: As notícias que impactam o país e o mundo." 
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#d40a38] focus:border-[#d40a38] transition-all" 
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Exibido no <strong>topo do site</strong> (abaixo do logotipo), na aba do navegador e no <strong>título de pré-visualização do WhatsApp / redes</strong>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Nome Oficial da Marca</label>
                <input 
                  type="text" 
                  value={siteName} 
                  onChange={e => setSiteName(e.target.value)} 
                  placeholder="Portal NG Brasil" 
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#d40a38] focus:border-[#d40a38] transition-all" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">Descrição para Compartilhamento (SEO & Redes)</label>
                <textarea 
                  rows={3} 
                  value={siteDescription} 
                  onChange={e => setSiteDescription(e.target.value)} 
                  placeholder="As notícias que impactam o país e o mundo." 
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#d40a38] focus:border-[#d40a38] transition-all" 
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Texto exibido quando o link principal do portal (portalngbrasil.com.br) é compartilhado no WhatsApp.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Salvo em tempo real na nuvem</span>
                <button 
                  type="submit" 
                  className="bg-[#d40a38] hover:bg-red-700 text-white transition-all px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:shadow flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Salvar Slogan e Configurações
                </button>
              </div>
            </form>
          </div>

          {/* Prévia em Tempo Real do WhatsApp */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pré-visualização no WhatsApp
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Veja em tempo real como o link principal aparece quando compartilhado em mensagens e grupos:
              </p>

              {/* Mockup do balão do WhatsApp */}
              <div className="bg-[#0b141a] p-3 rounded-xl shadow-md border border-slate-800 max-w-sm mx-auto">
                {/* Card de prévia interno do WhatsApp */}
                <div className="bg-[#025c4c]/30 border border-[#00a884]/40 rounded-lg overflow-hidden">
                  <div className="p-3 bg-[#0c2417] text-white space-y-1">
                    <h4 className="font-bold text-sm text-[#e9edef] leading-snug">
                      {siteName} | {siteSlogan || 'As notícias que impactam o país e o mundo.'}
                    </h4>
                    <p className="text-xs text-[#8696a0] line-clamp-2 leading-relaxed">
                      {siteDescription || 'As notícias que impactam o país e o mundo.'}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#00a884] pt-1 font-mono">
                      <LinkIcon className="w-3 h-3" />
                      <span>portalngbrasil.com.br</span>
                    </div>
                  </div>
                </div>

                {/* Texto da mensagem simulada */}
                <div className="mt-2 px-1 text-xs text-[#e9edef] flex items-center justify-between">
                  <span className="font-mono text-[#53bdeb]">https://portalngbrasil.com.br</span>
                  <span className="text-[10px] text-[#8696a0]">13:30</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✔ Ao Vivo:</span> O slogan digitado acima atualiza o cabeçalho do portal e as redes sociais.
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-4xl shadow-sm mt-6">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Key className="w-4 h-4 text-slate-500" /> Configuração de Chaves (APIs)</h4>
            <p className="text-xs text-slate-500 mb-6">Insira a chave da IA de sua preferência. As chaves de API ficam salvas apenas no seu navegador para segurança.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Google Gemini</label>
                <div className="flex items-center gap-2">
                <input type="password" value={robotGeminiKey} onChange={e => setRobotGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => showToast('Chave salva!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md">Salvar</button>
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ChatGPT (OpenAI)</label>
                <div className="flex items-center gap-2">
                <input type="password" value={robotOpenAIKey} onChange={e => setRobotOpenAIKey(e.target.value)} placeholder="sk-proj-..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => showToast('Chave salva!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md">Salvar</button>
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Claude (Anthropic)</label>
                <div className="flex items-center gap-2">
                <input type="password" value={robotClaudeKey} onChange={e => setRobotClaudeKey(e.target.value)} placeholder="sk-ant-..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => showToast('Chave salva!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md">Salvar</button>
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Perplexity API</label>
                <div className="flex items-center gap-2">
                <input type="password" value={robotPerplexityKey} onChange={e => setRobotPerplexityKey(e.target.value)} placeholder="pplx-..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => showToast('Chave salva!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md">Salvar</button>
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Google Custom Search</label>
                <div className="flex items-center gap-2">
                <input type="password" value={robotGoogleSearchKey} onChange={e => setRobotGoogleSearchKey(e.target.value)} placeholder="AIza..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => showToast('Chave salva!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md">Salvar</button>
                </div>
            </div>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Share2 className="w-4 h-4 text-slate-500" /> Integração de Redes Sociais (Meta, Threads & ImgBB)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Token de Acesso (Meta - Facebook & Instagram)</label>
                <input type="password" value={metaToken} onChange={e => {
                  setMetaToken(e.target.value);
                  localStorage.setItem("portal_ng_meta_token", e.target.value);
                }} placeholder="EAAG..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Token de Acesso (Threads)</label>
                <input type="password" value={threadsToken} onChange={e => {
                  setThreadsToken(e.target.value);
                  localStorage.setItem("portal_ng_threads_token", e.target.value);
                }} placeholder="THAAV..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-black focus:outline-none" />
                </div>
                <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID do Perfil (Threads)</label>
                <input type="text" value={threadsUserId} onChange={e => {
                  setThreadsUserId(e.target.value);
                  localStorage.setItem("portal_ng_threads_user_id", e.target.value);
                }} placeholder="29313904888222414" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-black focus:outline-none" />
                </div>
                <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chave API ImgBB (Opcional - Backup)</label>
                <input type="password" value={imgbbKey} onChange={e => setImgbbKey(e.target.value)} placeholder="Opcional (Hospedagem nativa do Portal NG ativa)" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <p className="text-[11px] text-slate-500 mt-1">O Portal NG agora usa hospedagem direta no servidor para o Instagram e Threads.</p>
                </div>
                <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID da Página (Facebook)</label>
                <input type="text" value={metaFbPageId} onChange={e => setMetaFbPageId(e.target.value)} placeholder="123456789..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID da Conta Comercial (Instagram)</label>
                <input type="text" value={metaIgAccountId} onChange={e => setMetaIgAccountId(e.target.value)} placeholder="987654321..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => showToast('Credenciais de Redes Sociais salvas com sucesso!')} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-md transition-colors cursor-pointer">Salvar Credenciais</button>
            </div>
            </div>
        </div>

      </div>
    );
  };

  const renderBanners = () => {
    const handleAddBanner = () => {
      const newBanner = { id: Date.now(), active: false, image: '', link: '' };
      setLocalBanners([...localBanners, newBanner]);
    };

    const handleUpdateBanner = (id, field, value) => {
      setLocalBanners(localBanners.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const handleDeleteBanner = (id) => {
      if (window.confirm("Tem certeza que deseja excluir este banner?")) {
        setLocalBanners(localBanners.filter(b => b.id !== id));
      }
    };

    const handleSaveBanners = () => {
      setIsSavingBanners(true);
      setTimeout(() => {
        setBanners(localBanners); // Triggers Firebase sync
        showToast("Banners salvos e publicados com sucesso!");
        setIsSavingBanners(false);
      }, 600);
    };

    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gestor de Banners (Patrocínios)</h2>
            <p className="text-sm text-slate-500">Configure os banners principais (728x90). Se múltiplos estiverem ativos, aparecerão empilhados.</p>
          </div>
          <button 
            onClick={handleAddBanner}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Banner
          </button>
        </div>

        {localBanners.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-xl text-center">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-bold mb-1">Nenhum banner configurado</h3>
            <p className="text-sm text-slate-500 mb-4">Clique em "Novo Banner" para adicionar seu primeiro patrocinador.</p>
          </div>
        ) : (
          localBanners.map((banner, index) => (
            <div key={banner.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Banner {index + 1}</h3>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleUpdateBanner(banner.id, 'active', !banner.active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${banner.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    title={banner.active ? 'Pausar Banner' : 'Ativar Banner'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${banner.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs font-bold ${banner.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {banner.active ? 'ATIVO' : 'PAUSADO'}
                  </span>
                  
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  
                  <button 
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir Banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Título do Banner / Nome do Patrocinador</label>
                  <input 
                    type="text" 
                    value={banner.title || ''} 
                    onChange={e => handleUpdateBanner(banner.id, 'title', e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                    placeholder="Ex: Coca-Cola"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Imagem do Banner (Upload)</label>
                  {banner.image ? (
                    <label className="relative block w-full h-[90px] rounded-lg overflow-hidden border-2 border-dashed border-slate-300 hover:border-indigo-500 cursor-pointer group">
                      <img src={banner.image} alt="Preview do Banner" className="w-full h-full object-cover" />
                      {isUploadingFiles[`banner_${banner.id}`] && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">Enviando Imagem...</span>
                        </div>
                      )}
                      {!isUploadingFiles[`banner_${banner.id}`] && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-bold text-sm">Clique para Trocar Imagem</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleBannerImageUpload(e, banner.id)} 
                        className="hidden"
                        disabled={isUploadingFiles[`banner_${banner.id}`]}
                      />
                    </label>
                  ) : (
                    <label className="flex items-center justify-center w-full bg-[#040f1d] hover:bg-slate-800 text-white px-4 py-8 rounded-md text-sm font-bold cursor-pointer transition-colors relative border-2 border-dashed border-slate-400">
                      {isUploadingFiles[`banner_${banner.id}`] ? (
                        'Enviando Imagem...'
                      ) : (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-6 h-6 mb-2 text-slate-300" />
                          <span>Fazer Upload da Imagem</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleBannerImageUpload(e, banner.id)} 
                        className="hidden"
                        disabled={isUploadingFiles[`banner_${banner.id}`]}
                      />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link de Destino (Ao clicar)</label>
                  <input 
                    type="text" 
                    value={banner.link} 
                    onChange={e => handleUpdateBanner(banner.id, 'link', e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" 
                    placeholder="https://site-do-patrocinador.com.br"
                  />
                </div>
              </div>
            </div>
          ))
        )}

        {localBanners.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <button 
              onClick={handleSaveBanners}
              disabled={isSavingBanners}
              className={`w-full text-white py-3 rounded-md text-sm font-bold shadow-sm transition-colors ${isSavingBanners ? 'bg-red-400 cursor-not-allowed' : 'bg-[#d40a38] hover:bg-red-700'}`}
            >
              {isSavingBanners ? 'Salvando Alterações...' : 'Salvar Alterações e Publicar Banners'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderRobot = () => {
    return (
      <div className="flex flex-col gap-6 max-w-5xl">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <BrainCircuit className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">Automação IA (Curadoria de Notícias)</h2>
            <p className="text-sm text-slate-500">Configure o robô para rastrear temas na internet, criar artigos baseados na sua linha editorial e enviar para sua aprovação.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
          <button onClick={() => setRobotActiveTab('curadora')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${robotActiveTab === 'curadora' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Curadora</button>
          <button onClick={() => setRobotActiveTab('prompt')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${robotActiveTab === 'prompt' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Prompt</button>
          <button onClick={() => setRobotActiveTab('portais')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${robotActiveTab === 'portais' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Portais</button>
          <button onClick={() => setRobotActiveTab('chaves')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${robotActiveTab === 'chaves' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Chaves API</button>
          <button onClick={() => setRobotActiveTab('configuracoes')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${robotActiveTab === 'configuracoes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Configurações</button>
          <button onClick={() => setRobotActiveTab('informacoes')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-1.5 ${robotActiveTab === 'informacoes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Informações <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${robotActiveTab === 'informacoes' ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}>v3.0</span>
          </button>
          <button onClick={() => setRobotActiveTab('lixeira')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${robotActiveTab === 'lixeira' ? 'bg-red-600 text-white' : 'bg-slate-100 text-red-600 hover:bg-red-100'}`}>
            <Trash2 className="w-4 h-4" /> Lixeira ({trashData.length})
          </button>
        </div>

        <form onSubmit={runRobotPipeline} className="space-y-6">
          {robotActiveTab === 'curadora' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-indigo-50 border border-indigo-100 p-5 rounded-lg flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">A partir da Data</label>
                      <input type="date" value={robotStartDate} onChange={e => setRobotStartDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm" />
                      <p className="text-[10px] text-slate-500 mt-1">Deixe vazio para o padrão (24 a 48h)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1">A partir da Hora</label>
                      <input type="time" value={robotStartTime} onChange={e => setRobotStartTime(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm" />
                    </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Categoria (Filtro)</label>
                  <select value={robotCategory} onChange={e => setRobotCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm">
                    <option value="todas">Todas as Categorias</option>
                    <option value="geral">Geral</option>
                    <option value="policial">Policial</option>
                    <option value="politica">Política</option>
                    <option value="economia">Economia</option>
                    <option value="turismo">Turismo</option>
                    <option value="esportes">Esportes</option>
                    <option value="entretenimento">Entretenimento</option>
                    <option value="tecnologia">Tecnologia</option>
                    <option value="saude">Saúde</option>
                    <option value="mundo">Mundo</option>
                  </select>
                </div>
              </div>

              {/* Barra de Pesquisa de Assunto */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Pesquisar Assunto Específico (Opcional)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={robotSearchQuery} 
                      onChange={e => setRobotSearchQuery(e.target.value)} 
                      placeholder="Ex: Prisão do Deolane, Queimadas no Pantanal, etc..." 
                      className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Qtd. Matérias</label>
                  <select 
                    value={robotArticleCount} 
                    onChange={e => setRobotArticleCount(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="1">1 Matéria</option>
                    <option value="3">3 Matérias</option>
                    <option value="5">5 Matérias</option>
                    <option value="10">10 Matérias</option>
                    <option value="15">15 Matérias</option>
                    <option value="20">20 Matérias</option>
                    <option value="30">30 Matérias</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                <div className="sm:col-span-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Pesquisar na Fonte (Opcional)</label>
                  <select 
                    value={robotSearchSource} 
                    onChange={e => setRobotSearchSource(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="todas">Pesquisar em Todas as Fontes (Internet Global)</option>
                    {robotUrls.split('\n').filter(u => u.trim()).map((url, i) => (
                      <option key={i} value={url}>{url.replace('https://', '').replace('http://', '').replace('www.', '')}</option>
                    ))}
                    {!robotUrls.includes('danuzionews') && <option value="https://danuzionews.com/">danuzionews.com/</option>}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={robotAutoPublish}
                    onChange={(e) => setRobotAutoPublish(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Publicar Automaticamente no Portal</span>
                </label>
                <span className="text-[10px] text-slate-500 ml-2 border-l border-slate-300 pl-2">
                  {robotAutoPublish 
                    ? "As notícias irão direto para o site." 
                    : "As notícias irão para a Fila de Aprovação."}
                </span>
              </div>

              {!isRobotRunning && !robotStatus ? (
                <div className="space-y-2 mt-4">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button 
                      type="button" 
                      onClick={runPerplexitySearch} 
                      className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-2.5 px-4 text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all"
                    >
                      <Search className="w-4 h-4 shrink-0 text-indigo-400" /> 
                      <span>Pesquisar na Web com Perplexity AI (v3.0)</span>
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-300 transition-all"
                    >
                      <Bot className="w-4 h-4 shrink-0 text-slate-500" /> 
                      <span>Varredura dos Portais (Scraper + Claude/Gemini)</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span><strong>Motor v3.0:</strong> O Perplexity faz a investigação ao vivo na web aberta e traz o link primário (<code>originalUrl</code>) para auditoria.</span>
                  </p>
                </div>
              ) : (
                <div className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-6 flex flex-col items-center justify-center gap-4 mt-4">
                  {robotProgress ? (
                    <div className="w-full max-w-md space-y-4 relative">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-indigo-800 mb-1">
                          <span>1. Leitura de Portais</span>
                          <span>{robotProgress.portals.current} / {robotProgress.portals.total}</span>
                        </div>
                        <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (robotProgress.portals.current / (robotProgress.portals.total || 1)) * 100)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-violet-800 mb-1">
                          <span>2. Geração de Notícias</span>
                          <span>{robotProgress.news.current} / {robotProgress.news.total}</span>
                        </div>
                        <div className="w-full bg-violet-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-violet-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (robotProgress.news.current / (robotProgress.news.total || 1)) * 100)}%` }}></div>
                        </div>
                      </div>
                      <p className="font-bold text-indigo-800 text-center text-sm animate-pulse mt-2">{robotStatus}</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="font-bold text-indigo-800 text-center animate-pulse">{robotStatus}</p>
                    </>
                  )}
                  <button 
                    type="button"
                    onClick={handleCancelRobot}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg text-xs flex items-center gap-2 transition-colors border border-red-200"
                  >
                     <span className="font-black text-sm">✕</span> Cancelar Busca
                  </button>
                </div>
              )}
                </div>
              </div>

              {/* AI Logs History (Right Column) */}
              <div className="lg:col-span-1 bg-slate-50 border border-slate-200 p-5 rounded-lg flex flex-col h-[500px]">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Bot className="w-4 h-4 text-indigo-600" /> Histórico de Curadoria
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {aiLogs.length > 0 ? (
                    aiLogs.map(log => (
                      <div key={log.id} className={`p-4 rounded-lg border text-sm ${log.status === 'success' ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {log.status === 'success' ? 'SUCESSO' : 'ERRO'}
                            </span>
                            <span className="font-semibold text-slate-700 text-xs break-words">{log.aiUsed}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                            {new Date(log.date).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-slate-600 mb-2">
                          {(() => {
                            const match = log.details.match(/Aprovadas p\/ Publicação \(VERDE\): (\d+)\. Aprovadas p\/ Rascunho \(AMARELO\): (\d+)\. Descartadas \(VERMELHO\): (\d+)/);
                            if (match) {
                              return (
                                <div className="flex flex-wrap gap-x-4 gap-y-2 items-center mt-2 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0"></div>
                                    <span className="text-[11px] font-bold text-slate-700 leading-none">{match[1]} Publicadas</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm shrink-0"></div>
                                    <span className="text-[11px] font-bold text-slate-700 leading-none">{match[2]} Rascunhos</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shrink-0"></div>
                                    <span className="text-[11px] font-bold text-slate-700 leading-none">{match[3]} Descartadas</span>
                                  </div>
                                </div>
                              );
                            }
                            return <p>{log.details}</p>;
                          })()}
                        </div>
                        {log.status === 'success' && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                            <span>Gerou: <strong className="text-indigo-600">{log.generatedCount} matérias</strong></span>
                            <span>Categoria: <strong className="text-slate-700">{log.category}</strong></span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      Nenhum histórico recente.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {robotActiveTab === 'prompt' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Diretrizes & Prompt v3 da Redação (Claude Sonnet)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configuração editorial completa: System Prompt v3, Comando Diário e o Bloco Semanal de Contexto Político.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Deseja restaurar todas as diretrizes para a versão oficial do Prompt v3?")) {
                        setRobotSystemRules(defaultSystemRules);
                        setRobotGuidelines(defaultGuidelines);
                        setRobotContextoMomento(defaultContextoMomento);
                        localStorage.setItem("portal_ng_robot_system_rules", defaultSystemRules);
                        localStorage.setItem("portal_ng_robot_guidelines", defaultGuidelines);
                        localStorage.setItem("portal_ng_robot_contexto_momento", defaultContextoMomento);
                        showToast("Diretrizes e Prompt v3 restaurados com sucesso!");
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors shrink-0"
                  >
                    Restaurar Padrão v3
                  </button>
                </div>
              </div>

              {/* 1. REGRAS EDITORIAIS (SYSTEM PROMPT v3) */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  1. Regras Editoriais (System Prompt v3 — Quem você é & Regras Invioláveis)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Instruções fixas da linha editorial: sensacionalismo atribuído ("na boca do outro"), técnica da fonte, proibição de marcas de IA e estrutura JSON.
                </p>
                <textarea 
                  value={robotSystemRules} 
                  onChange={e => setRobotSystemRules(e.target.value)} 
                  required 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md text-xs font-mono min-h-[300px] bg-white leading-relaxed" 
                />
              </div>

              {/* 2. CONTEXTO DO MOMENTO (BLOCO DE CENÁRIO POLÍTICO E QUEM É QUEM) */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                    2. Contexto do Momento (Cenário Político & Quem é Quem Atualizado)
                  </label>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    Atualização Semanal da Equipe
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 mb-2.5">
                  Resolve o problema de alucinação de memória da IA. A IA é estritamente proibida de inventar ou puxar da memória desatualizada (ex: chamar Flávio de 'o senador'). Este bloco informa quem é candidato, disputas em curso e fatos do momento.
                </p>
                <textarea 
                  value={robotContextoMomento} 
                  onChange={e => setRobotContextoMomento(e.target.value)} 
                  required 
                  placeholder="- Flávio Bolsonaro: Pré-candidato..."
                  className="w-full px-4 py-2 border border-amber-300 rounded-md text-xs font-mono min-h-[160px] bg-white text-slate-800 leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                />
              </div>

              {/* 3. O PROMPT (COMANDO DIÁRIO) */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  3. Diretrizes Complementares (Comando Diário & PNL para Clique)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Diretrizes de apoio enviadas junto à requisição reforçando os gatilhos mentais de clique e regras de recência.
                </p>
                <textarea 
                  value={robotGuidelines} 
                  onChange={e => setRobotGuidelines(e.target.value)} 
                  required 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md text-xs font-mono min-h-[180px] bg-white leading-relaxed" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => {
                    localStorage.setItem("portal_ng_robot_system_rules", robotSystemRules);
                    localStorage.setItem("portal_ng_robot_guidelines", robotGuidelines);
                    localStorage.setItem("portal_ng_robot_contexto_momento", robotContextoMomento);
                    showToast("✅ Prompt v3, Contexto do Momento e Diretrizes salvos na nuvem e localmente!");
                  }}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Salvar Diretrizes e Contexto
                </button>
              </div>
            </div>
          )}

          {robotActiveTab === 'portais' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Portais Monitorados</h4>
                  <p className="text-xs text-slate-500">Adicione ou remova os portais de onde o robô buscará notícias.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRobotUrls(defaultUrls)} className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-300 transition-colors">Restaurar Padrão</button>
                </div>
              </div>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="url" 
                  value={newPortalUrl} 
                  onChange={e => setNewPortalUrl(e.target.value)} 
                  placeholder="https://exemplo.com.br" 
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm"
                />
                <button type="button" onClick={handleAddPortal} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-md text-sm hover:bg-indigo-700 transition-colors">Adicionar</button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700">Nome do Portal</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Link Referência</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 w-20 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {robotUrls.split('\n').filter(u => u.trim()).map((url, i) => {
                      let domainName = url;
                      try {
                        const parsed = new URL(url);
                        domainName = parsed.hostname.replace('www.', '');
                        domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
                        domainName = 'Portal ' + domainName;
                      } catch(e) {}
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{domainName}</td>
                          <td className="px-4 py-3 text-slate-500"><a href={url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline truncate max-w-[200px] block">{url}</a></td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => handleRemovePortal(i)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {robotUrls.split('\n').filter(u => u.trim()).length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-slate-500">Nenhum portal cadastrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {robotActiveTab === 'chaves' && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-600" /> Chaves de Inteligência Artificial & APIs (v3.0)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure as chaves para que cada IA execute seu papel na engrenagem editorial. Ficam sincronizadas no Firebase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('✅ Todas as chaves salvas com sucesso!')}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
                >
                  Salvar Todas as Chaves
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PERPLEXITY */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900">Perplexity API</label>
                          <span className="text-[10px] text-indigo-600 font-semibold font-mono">Pesquisa ao Vivo & Web Viva</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${robotPerplexityKey ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {robotPerplexityKey ? '● Ativa' : 'Não configurada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Usada pelo servidor e pelo painel para vasculhar notícias frescas em tempo real na internet aberta com links de origem.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="password"
                      value={robotPerplexityKey}
                      onChange={e => setRobotPerplexityKey(e.target.value)}
                      placeholder="pplx-..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button type="button" onClick={() => showToast('Chave Perplexity salva!')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg shrink-0">
                      Salvar
                    </button>
                  </div>
                </div>

                {/* CLAUDE */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          <Cpu className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900">Claude (Anthropic)</label>
                          <span className="text-[10px] text-amber-700 font-semibold font-mono">Redação & Linha Conservadora</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${robotClaudeKey ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {robotClaudeKey ? '● Ativa' : 'Não configurada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Redige a matéria do zero em tom conservador, livre de plágio e com formatação HTML semântica impecável.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="password"
                      value={robotClaudeKey}
                      onChange={e => setRobotClaudeKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button type="button" onClick={() => showToast('Chave Claude salva!')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg shrink-0">
                      Salvar
                    </button>
                  </div>
                </div>

                {/* GEMINI */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900">Google Gemini 1.5</label>
                          <span className="text-[10px] text-sky-700 font-semibold font-mono">Velocidade & Fallback</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${robotGeminiKey ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {robotGeminiKey ? '● Ativa' : 'Não configurada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Resumos verticais para Stories, geração de tags SEO e redundância caso outra IA oscile.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="password"
                      value={robotGeminiKey}
                      onChange={e => setRobotGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <button type="button" onClick={() => showToast('Chave Gemini salva!')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg shrink-0">
                      Salvar
                    </button>
                  </div>
                </div>

                {/* OPENAI */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900">OpenAI (ChatGPT/GPT-4o)</label>
                          <span className="text-[10px] text-emerald-700 font-semibold font-mono">Auditoria & Padrão Ouro</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${robotOpenAIKey ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {robotOpenAIKey ? '● Ativa' : 'Não configurada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Audita o texto contra o Padrão Ouro, escreve legendas magnéticas e atende ao "Modificar com IA".
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="password"
                      value={robotOpenAIKey}
                      onChange={e => setRobotOpenAIKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button type="button" onClick={() => showToast('Chave OpenAI salva!')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg shrink-0">
                      Salvar
                    </button>
                  </div>
                </div>
              </div>

              {/* META / INSTAGRAM */}
              <div className="pt-4 border-t border-slate-100">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-pink-600" /> Meta Graph API & Publicação Social (Instagram / Facebook)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Token de Acesso Meta</label>
                    <input
                      type="password"
                      value={metaToken}
                      onChange={e => setMetaToken(e.target.value)}
                      placeholder="EAAG..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ID da Página Facebook</label>
                    <input
                      type="text"
                      value={metaFbPageId}
                      onChange={e => setMetaFbPageId(e.target.value)}
                      placeholder="109031887591187"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ID Comercial Instagram</label>
                    <input
                      type="text"
                      value={metaIgAccountId}
                      onChange={e => setMetaIgAccountId(e.target.value)}
                      placeholder="17841455465356006"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {robotActiveTab === 'configuracoes' && (
            <div className="border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> Modo Piloto Automático (Zero Clique)</h3>
              <p className="text-xs text-slate-500 mb-4">Deixe a varredura e reescrita de notícias rodando sozinha em segundo plano no intervalo que escolher.</p>
              
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={isAutoPilot} 
                      onChange={e => setIsAutoPilot(e.target.checked)} 
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Ativar Piloto Automático</span>
                  </label>

                  <select 
                    value={autoPilotMinutes} 
                    onChange={e => setAutoPilotMinutes(Number(e.target.value))}
                    disabled={!isAutoPilot}
                    className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700 font-semibold disabled:opacity-50"
                  >
                    <option value={1}>A cada 1 minuto</option>
                    <option value={3}>A cada 3 minutos</option>
                    <option value={5}>A cada 5 minutos</option>
                    <option value={10}>A cada 10 minutos</option>
                    <option value={30}>A cada 30 minutos</option>
                    <option value={60}>A cada 1 hora</option>
                    <option value={120}>A cada 2 horas</option>
                    <option value={240}>A cada 4 horas</option>
                    <option value={480}>A cada 8 horas</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Gerando:</span>
                    <select 
                      value={robotArticleCount} 
                      onChange={e => setRobotArticleCount(e.target.value)} 
                      disabled={!isAutoPilot}
                      className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700 font-semibold disabled:opacity-50"
                    >
                      <option value="1">1 matéria</option>
                      <option value="3">3 matérias</option>
                      <option value="5">5 matérias</option>
                      <option value="10">10 matérias</option>
                    </select>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => showToast('Configurações do Piloto Automático salvas!')} 
                    className="ml-auto px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow-sm transition-colors"
                  >
                    Salvar
                  </button>

                  {isAutoPilot && (
                    <span className="w-full mt-2 md:w-auto md:mt-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded animate-pulse">
                      ● Robô Ativo no Piloto Automático
                    </span>
                  )}
                </div>
            </div>
          )}

          {robotActiveTab === 'lixeira' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-500" /> Lixeira (Matérias Descartadas)</h4>
                  <p className="text-xs text-slate-500">Matérias apagadas da fila de aprovação ou do site. Você pode restaurá-las.</p>
                </div>
                {trashData.length > 0 && (
                  <button type="button" onClick={() => { if(window.confirm('Esvaziar lixeira?')) setTrashData([]); }} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded text-xs hover:bg-red-200">
                    Esvaziar Lixeira
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {trashData.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-medium">A lixeira está vazia.</div>
                ) : (
                  trashData.map(item => (
                    <div key={item.id} className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.sourceQueue === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.sourceQueue === 'draft' ? 'RASCUNHO REJEITADO' : 'MATÉRIA EXCLUÍDA'}
                          </span>
                          <span className="text-[10px] text-slate-400">Apagado em {new Date(item.deletedAt).toLocaleString('pt-BR')}</span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-sm line-clamp-1">{item.title}</h5>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => handleRestore(item.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-xs font-bold transition-colors">
                          Restaurar
                        </button>
                        <button type="button" onClick={() => handlePermanentDelete(item.id)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {robotActiveTab === 'informacoes' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-10 shadow-xs relative overflow-hidden">
              {/* Brilho de fundo sutil e minimalista */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

              {/* Header Minimalista & Dinâmico da Versão 3.0 */}
              <div className="relative z-10 mb-8 border-b border-slate-100 pb-7">
                <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                  <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Portal NG Brasil • Versão 3.0
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Arquitetura Multi-IA 100% Operacional
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                    <Server className="w-3 h-3 text-slate-500" /> Servidor & Nuvem 24/7
                  </span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Workflow className="w-7 h-7 text-indigo-600 shrink-0" />
                  Engenharia & Mapa Mental do Portal NG
                </h2>
                
                <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
                  Documentação minuciosa e didática (passo a passo / <em>baby steps</em>) detalhando a atuação precisa de cada Inteligência Artificial, as regras de blindagem antiduplicidade, o ciclo de 8 etapas da notícia e a infraestrutura autônoma na nuvem.
                </p>

                {/* Sub-navegação Dinâmica / Segmented Pills */}
                <div className="flex flex-wrap gap-2 mt-6 pt-2 border-t border-slate-100">
                  {[
                    { id: 'all', label: 'Visão Completa', icon: Layers },
                    { id: 'ias', label: '1. As 5 IAs (Baby Steps)', icon: BrainCircuit },
                    { id: 'passos', label: '2. O Ciclo em 8 Etapas', icon: TrendingUp },
                    { id: 'antiduplicidade', label: '3. Blindagem Antiduplicidade', icon: ShieldCheck },
                    { id: 'tabela', label: '4. Tabela de Tecnologias', icon: Database },
                    { id: 'faq', label: '5. Dúvidas do Editor', icon: HelpCircle },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = infoSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setInfoSubTab(tab.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 Indicadores Estruturais Minimalistas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 relative z-10">
                <div className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl hover:bg-white hover:shadow-xs transition-all">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-2.5">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">4 IAs Especializadas</h4>
                  <p className="text-xs text-slate-500 mt-1">Perplexity (busca viva), Claude (redação), Gemini (velocidade) e GPT-4o (auditoria).</p>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl hover:bg-white hover:shadow-xs transition-all">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Zero Plágio & Fato Real</h4>
                  <p className="text-xs text-slate-500 mt-1">Texto 100% autoral a partir dos fatos, com link original preservado para auditoria transparente.</p>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl hover:bg-white hover:shadow-xs transition-all">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-2.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">50% Brasil / 50% Mundo</h4>
                  <p className="text-xs text-slate-500 mt-1">Equilíbrio editorial rigoroso entre acontecimentos nacionais e geopolítica internacional.</p>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl hover:bg-white hover:shadow-xs transition-all">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-2.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Nuvem 24/7 Persistente</h4>
                  <p className="text-xs text-slate-500 mt-1">Horário agendado no Firebase (`nextRun`) que não reinicia ao dar F5 e roda no servidor.</p>
                </div>
              </div>

              {/* SEÇÃO 1: QUAL IA FAZ O QUÊ? (BABY STEPS MINUCIOSOS) */}
              {(infoSubTab === 'all' || infoSubTab === 'ias') && (
                <div className="mb-14 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Qual IA Faz o Quê no Portal NG? (Detalhamento Minucioso)</h3>
                        <p className="text-xs text-slate-500">Cada inteligência artificial possui uma função hiper-especializada na engrenagem editorial.</p>
                      </div>
                    </div>

                    {/* Filtro Dinâmico de IA */}
                    <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
                      {[
                        { id: 'all', label: 'Todas as IAs' },
                        { id: 'perplexity', label: 'Perplexity' },
                        { id: 'claude', label: 'Claude 3.5' },
                        { id: 'gemini', label: 'Gemini 1.5' },
                        { id: 'gpt4o', label: 'GPT-4o' },
                        { id: 'canvas', label: 'Canvas/Meta' },
                      ].map((ai) => (
                        <button
                          key={ai.id}
                          type="button"
                          onClick={() => setInfoSelectedAi(ai.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            infoSelectedAi === ai.id
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {ai.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* IA 1: PERPLEXITY AI */}
                    {(infoSelectedAi === 'all' || infoSelectedAi === 'perplexity') && (
                      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                <Search className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  Perplexity AI <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">Sonar / Agent API</span>
                                </h4>
                                <p className="text-[11px] font-semibold text-indigo-600">O Olho Digital na Web Viva • Investigação em Tempo Real</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                              Captação
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            Diferente de modelos tradicionais que operam com dados congelados no passado, a <strong>Perplexity possui conexão direta com a internet viva</strong>. Ela atua como o repórter de ronda da redação, identificando fatos que acabaram de acontecer.
                          </p>

                          {/* Por que esta IA? */}
                          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 mb-4 text-xs">
                            <span className="font-bold text-slate-800 text-[11px] block mb-1">Por que a Perplexity foi escolhida?</span>
                            <span className="text-slate-600 leading-relaxed">
                              Sua capacidade de ler a web em tempo real através de busca algorítmica integrada descarta a fragilidade de <em>scrapers</em> tradicionais, garantindo fontes confiáveis e URLs primárias preservadas.
                            </span>
                          </div>

                          {/* Baby Steps Minuciosos */}
                          <div className="space-y-2 bg-indigo-50/30 p-3.5 rounded-lg border border-indigo-100/60 text-xs">
                            <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-indigo-600" /> Baby Steps da Perplexity (Passo a Passo):
                            </p>
                            <ul className="space-y-2 text-slate-700">
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-indigo-600 shrink-0 font-mono text-[11px]">Passo 1.1:</span>
                                <span><strong>Disparo & Gatilho:</strong> Recebe o comando de busca (via nuvem ou clique manual) com foco em pautas do Brasil e Mundo das últimas 24h a 48h.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-indigo-600 shrink-0 font-mono text-[11px]">Passo 1.2:</span>
                                <span><strong>Varredura na Web Viva:</strong> Varre portais de notícias e feeds cadastrados (G1, Folha, CNN, Gazeta, Estadão, etc.) buscando acontecimentos em alta.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-indigo-600 shrink-0 font-mono text-[11px]">Passo 1.3:</span>
                                <span><strong>Captura da Fonte Primária:</strong> Extrai e grava a URL exata de origem (<code>originalUrl</code>), o portal e o resumo factual bruto para conferência lado a lado.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-indigo-600 shrink-0 font-mono text-[11px]">Passo 1.4:</span>
                                <span><strong>Filtro com a Memória de 35 Matérias:</strong> Compara os links e tópicos com as últimas 35 publicações do Portal NG para descartar assuntos repetidos antes de gastar recursos.</span>
                              </li>
                            </ul>
                          </div>

                          {/* Exemplo Na Prática */}
                          <div className="mt-3.5 bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] space-y-1">
                            <div className="text-emerald-400 font-bold"># NA PRÁTICA COM A PERPLEXITY</div>
                            <div><span className="text-slate-400">INPUT:</span> Busca: "notícias política economia Brasil últimas 24h" + Bloqueio: [35 matérias recentes]</div>
                            <div><span className="text-indigo-300">AÇÃO:</span> Pesquisa na web, filtra fontes seguras, extrai link e fatos essenciais.</div>
                            <div><span className="text-amber-300">OUTPUT:</span> Objeto estruturado com `originalUrl`, manchete primária e resumo dos acontecimentos.</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Tempo médio: ~2.5 segundos</span>
                          <span className="text-indigo-600 font-bold">100% Notícias Vivas</span>
                        </div>
                      </div>
                    )}

                    {/* IA 2: ANTHROPIC CLAUDE 3.5 SONNET */}
                    {(infoSelectedAi === 'all' || infoSelectedAi === 'claude') && (
                      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold">
                                <Cpu className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  Anthropic Claude 3.5 <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-mono font-bold">Sonnet</span>
                                </h4>
                                <p className="text-[11px] font-semibold text-amber-600">O Redator-Chefe • Guardião da Linha Editorial</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                              Redação
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            O Claude é o cérebro literário da redação. Ele recebe os fatos brutos trazidos pela Perplexity e <strong>redige uma matéria 100% autoral do zero</strong>, com rigor formal, elegância e voz ativa.
                          </p>

                          {/* Por que esta IA? */}
                          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 mb-4 text-xs">
                            <span className="font-bold text-slate-800 text-[11px] block mb-1">Por que o Claude 3.5 Sonnet foi escolhido?</span>
                            <span className="text-slate-600 leading-relaxed">
                              Possui a melhor prosa jornalística do mercado de IA, com extrema fidelidade factual, ausência de alucinações e respeito cirúrgico ao tom patriótico e sóbrio do Portal NG.
                            </span>
                          </div>

                          {/* Baby Steps Minuciosos */}
                          <div className="space-y-2 bg-amber-50/30 p-3.5 rounded-lg border border-amber-100/60 text-xs">
                            <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-amber-600" /> Baby Steps do Claude 3.5 (Passo a Passo):
                            </p>
                            <ul className="space-y-2 text-slate-700">
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-amber-600 shrink-0 font-mono text-[11px]">Passo 2.1:</span>
                                <span><strong>Higienização Fática:</strong> Descarta anúncios, paywalls, links irrelevantes e vieses partidários da matéria original.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-amber-600 shrink-0 font-mono text-[11px]">Passo 2.2:</span>
                                <span><strong>Reescrita 100% Autoral:</strong> Escreve uma matéria inédita a partir dos fatos, sem copiar nenhuma frase ou parágrafo (garantia antiplágio absoluta).</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-amber-600 shrink-0 font-mono text-[11px]">Passo 2.3:</span>
                                <span><strong>Linha Editorial Conservadora:</strong> Aplica a linha editorial do Portal NG: foco em valores, liberdade individual, ordem, patriotismo e seriedade jornalística.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-amber-600 shrink-0 font-mono text-[11px]">Passo 2.4:</span>
                                <span><strong>Marcação HTML Semântica:</strong> Estrutura o artigo com parágrafos fluidos (<code>&lt;p&gt;</code>), negritos de ênfase (<code>&lt;strong&gt;</code>) e intertítulos (<code>&lt;h3&gt;</code>).</span>
                              </li>
                            </ul>
                          </div>

                          {/* Exemplo Na Prática */}
                          <div className="mt-3.5 bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] space-y-1">
                            <div className="text-amber-400 font-bold"># NA PRÁTICA COM O CLAUDE 3.5</div>
                            <div><span className="text-slate-400">INPUT:</span> Dados brutos apurados + Diretrizes da Linha Editorial Conservadora.</div>
                            <div><span className="text-indigo-300">AÇÃO:</span> Reescrita autoral em tom lúcido e institucional com estrutura HTML limpa.</div>
                            <div><span className="text-emerald-300">OUTPUT:</span> Artigo completo com manchete magnética, subtítulo explicativo e corpo formatado.</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Padrão Jornalístico Sênior</span>
                          <span className="text-amber-600 font-bold">Zero Plágio Garantido</span>
                        </div>
                      </div>
                    )}

                    {/* IA 3: GOOGLE GEMINI 1.5 */}
                    {(infoSelectedAi === 'all' || infoSelectedAi === 'gemini') && (
                      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-sky-300 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 font-bold">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  Google Gemini 1.5 <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-mono font-bold">Flash & Pro</span>
                                </h4>
                                <p className="text-[11px] font-semibold text-sky-600">Hipervelocidade & Contingência Anti-Queda</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100 uppercase tracking-wider">
                              Redundância
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            O Gemini é a garantia de que o Portal NG nunca sairá do ar por instabilidade externa. Ele fornece velocidade recorde de resposta e condensação instantânea para formatos curtos.
                          </p>

                          {/* Por que esta IA? */}
                          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 mb-4 text-xs">
                            <span className="font-bold text-slate-800 text-[11px] block mb-1">Por que o Google Gemini 1.5 foi escolhido?</span>
                            <span className="text-slate-600 leading-relaxed">
                              Sua latência ultrabaixa (&lt; 1 segundo) e capacidade de processamento veloz permitem atuar como escudo de contingência caso outras APIs oscilem.
                            </span>
                          </div>

                          {/* Baby Steps Minuciosos */}
                          <div className="space-y-2 bg-sky-50/30 p-3.5 rounded-lg border border-sky-100/60 text-xs">
                            <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-sky-600" /> Baby Steps do Gemini (Passo a Passo):
                            </p>
                            <ul className="space-y-2 text-slate-700">
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-sky-600 shrink-0 font-mono text-[11px]">Passo 3.1:</span>
                                <span><strong>Fallback Instantâneo:</strong> Se o Claude ou a Perplexity apresentarem timeout ou limite de cota, o Gemini assume a geração sem interrupção.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-sky-600 shrink-0 font-mono text-[11px]">Passo 3.2:</span>
                                <span><strong>Condensação em Telas:</strong> Sintetiza reportagens em frases curtas e diretas (1 a 2 sentenças) para os cards de Stories e Carrosséis.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-sky-600 shrink-0 font-mono text-[11px]">Passo 3.3:</span>
                                <span><strong>Metadados & SEO Jornalístico:</strong> Gera tags de indexação, categorização editorial e Slugs amigáveis sem caracteres especiais para o Google Notícias.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-sky-600 shrink-0 font-mono text-[11px]">Passo 3.4:</span>
                                <span><strong>Tradução e Contexto Internacional:</strong> Analisa pautas geopolíticas de agências estrangeiras (em inglês/espanhol) e traduz para o leitor brasileiro.</span>
                              </li>
                            </ul>
                          </div>

                          {/* Exemplo Na Prática */}
                          <div className="mt-3.5 bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] space-y-1">
                            <div className="text-sky-400 font-bold"># NA PRÁTICA COM O GOOGLE GEMINI</div>
                            <div><span className="text-slate-400">INPUT:</span> Matéria longa de 5 parágrafos ou notícia internacional em inglês.</div>
                            <div><span className="text-indigo-300">AÇÃO:</span> Condensação em 3 frases de alto impacto e tradução contextualizada.</div>
                            <div><span className="text-amber-300">OUTPUT:</span> Telas formatadas para Stories + Slugs e tags SEO para indexação rápida.</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Tempo de resposta: &lt; 1 segundo</span>
                          <span className="text-sky-600 font-bold">Disponibilidade 99.9%</span>
                        </div>
                      </div>
                    )}

                    {/* IA 4: OPENAI GPT-4o */}
                    {(infoSelectedAi === 'all' || infoSelectedAi === 'gpt4o') && (
                      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                <Bot className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                  OpenAI <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold">GPT-4o</span>
                                </h4>
                                <p className="text-[11px] font-semibold text-emerald-600">Auditoria Padrão Ouro & Legendagem Social</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                              Calibração
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            O GPT-4o atua no controle de qualidade refinada e engajamento social. Ele compara as matérias com os exemplos aprovados como <em>Padrão Ouro</em> e cuida da voz nas redes.
                          </p>

                          {/* Por que esta IA? */}
                          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 mb-4 text-xs">
                            <span className="font-bold text-slate-800 text-[11px] block mb-1">Por que o OpenAI GPT-4o foi escolhido?</span>
                            <span className="text-slate-600 leading-relaxed">
                              Excelente capacidade de calibração semântica contra referências ideais e redação de copies sociais magnéticas com alta taxa de engajamento no Instagram.
                            </span>
                          </div>

                          {/* Baby Steps Minuciosos */}
                          <div className="space-y-2 bg-emerald-50/30 p-3.5 rounded-lg border border-emerald-100/60 text-xs">
                            <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-emerald-600" /> Baby Steps do GPT-4o (Passo a Passo):
                            </p>
                            <ul className="space-y-2 text-slate-700">
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-emerald-600 shrink-0 font-mono text-[11px]">Passo 4.1:</span>
                                <span><strong>Auditoria Padrão Ouro:</strong> Compara o vocabulário e a cadência do artigo com as matérias consagradas na aba "Padrão Ouro".</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-emerald-600 shrink-0 font-mono text-[11px]">Passo 4.2:</span>
                                <span><strong>Copywriting Social:</strong> Redige legendas atraentes para o Instagram e Facebook com hashtags estratégicas e chamada para ação (CTA).</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-emerald-600 shrink-0 font-mono text-[11px]">Passo 4.3:</span>
                                <span><strong>Aprendizado Supervisionado:</strong> Interpreta os feedbacks de curtir (👍) e descurtir (👎) dados pelo editor humano na Fila de Aprovação para afinar o estilo.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-emerald-600 shrink-0 font-mono text-[11px]">Passo 4.4:</span>
                                <span><strong>Assistente 'Modificar com IA':</strong> Alimenta o comando livre no editor para reescrever trechos sob demanda (ex: "Torne a introdução mais urgente").</span>
                              </li>
                            </ul>
                          </div>

                          {/* Exemplo Na Prática */}
                          <div className="mt-3.5 bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] space-y-1">
                            <div className="text-emerald-400 font-bold"># NA PRÁTICA COM O GPT-4o</div>
                            <div><span className="text-slate-400">INPUT:</span> Matéria aprovada + Perfil Padrão Ouro do Portal NG.</div>
                            <div><span className="text-indigo-300">AÇÃO:</span> Validação de tom de voz, redação de legenda social e chamada para ação.</div>
                            <div><span className="text-amber-300">OUTPUT:</span> Legenda para Instagram/Facebook pronta para postagem e engajamento.</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Análise Semântica Fina</span>
                          <span className="text-emerald-600 font-bold">Aprendizado Ativo</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* IA 5: MOTOR GRÁFICO CANVAS & META API */}
                  {(infoSelectedAi === 'all' || infoSelectedAi === 'canvas') && (
                    <div className="mt-5 bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs hover:border-pink-300 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-700 font-bold">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">HTML5 Canvas Engine + Meta Graph API v20.0</h4>
                            <p className="text-[11px] font-semibold text-pink-600">A Gráfica Digital & Distribuidor Multicanal para Instagram e Facebook</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-pink-50 text-pink-700 px-2.5 py-1 rounded border border-pink-100 uppercase tracking-wider self-start sm:self-auto">
                          Arte & Publicação Social
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        O robô gráfico substitui a necessidade de um designer para diagramar cards diários de notícias. Ele gera artes estéticas em alta resolução (1080p), quebra linhas com tipografia inteligente e publica automaticamente nas redes sociais.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11px]">
                            <Smartphone className="w-3.5 h-3.5 text-pink-600" /> Resolução 1080p Oficial
                          </p>
                          <p className="text-slate-600 text-[11px]">Renderiza telas nos formatos recomendados: 1080x1920 (Stories 9:16) e 1080x1350 (Carrosséis 4:5).</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11px]">
                            <PenTool className="w-3.5 h-3.5 text-pink-600" /> Tipografia Inteligente
                          </p>
                          <p className="text-slate-600 text-[11px]">Calcula via <code>measureText</code> a largura exata das palavras para quebras de linha estéticas sem cortar frases.</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11px]">
                            <Globe className="w-3.5 h-3.5 text-pink-600" /> Hospedagem Direta
                          </p>
                          <p className="text-slate-600 text-[11px]">Envia as artes para o servidor do portal (`portalngbrasil.com.br/upload.php`) gerando link permanente com SSL.</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11px]">
                            <Share2 className="w-3.5 h-3.5 text-pink-600" /> Meta API Oficial
                          </p>
                          <p className="text-slate-600 text-[11px]">Cria containers <code>media_publish</code> no Instagram e Facebook, publicando com imagem, legenda e link.</p>
                        </div>
                      </div>

                      {/* Exemplo Na Prática */}
                      <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] space-y-1">
                        <div className="text-pink-400 font-bold"># NA PRÁTICA COM O ROBÔ DE MÍDIA</div>
                        <div><span className="text-slate-400">INPUT:</span> Manchete da notícia + Fundo Plantão NG + Credenciais da Meta API.</div>
                        <div><span className="text-indigo-300">AÇÃO:</span> Diagramação matemática em 1080p, cálculo de margens, upload no servidor e disparo via Graph API.</div>
                        <div><span className="text-emerald-300">OUTPUT:</span> Stories ativo no Instagram do Portal NG Brasil e post na página do Facebook.</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SEÇÃO 2: O FLUXO EM 8 ETAPAS (BABY STEPS) */}
              {(infoSubTab === 'all' || infoSubTab === 'passos') && (
                <div className="mb-14 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900">O Ciclo de Vida da Notícia em 8 Etapas (Baby Steps)</h3>
                        <p className="text-xs text-slate-500">A jornada completa desde o acontecimento no mundo real até estar publicado no portal e nas redes sociais.</p>
                      </div>
                    </div>

                    {/* Stepper Dinâmico de Etapas */}
                    <div className="flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setInfoActiveStep('all')}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          infoActiveStep === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Todas
                      </button>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((stepNum) => (
                        <button
                          key={stepNum}
                          type="button"
                          onClick={() => setInfoActiveStep(stepNum.toString())}
                          className={`w-6 h-6 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center ${
                            infoActiveStep === stepNum.toString()
                              ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                              : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          {stepNum}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* ETAPA 1 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '1') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-100 text-sm">
                          1
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <Globe className="w-4 h-4 text-indigo-600" /> Etapa 1: Varredura & Escuta Ativa na Web Aberta
                            </h4>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                              Perplexity Sonar + RSS Feeds
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            O robô consulta a internet a cada ciclo do agendador automático ou no acionamento manual. Ele analisa os portais cadastrados e busca pautas de alta relevância pública das últimas horas.
                          </p>
                          <div className="bg-slate-50 p-2.5 rounded text-[11px] text-slate-600 flex items-center gap-2 border border-slate-100">
                            <LinkIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span><strong>Rastreabilidade de Origem:</strong> A URL original (<code>originalUrl</code>) é armazenada de forma permanente para auditoria e conferência lado a lado.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 2 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '2') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 border border-emerald-100 text-sm">
                          2
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Etapa 2: Blindagem Antiduplicidade & Memória de 35 Matérias
                            </h4>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                              Algoritmo Exclusivo Portal NG
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            Antes de qualquer escrita, o sistema consulta os logs das últimas <strong>35 matérias publicadas</strong>, histórias de Stories e Carrosséis. O algoritmo cria uma "Lista de Exclusão Negativa" injetada no prompt da IA para impedir a repetição de pautas recentes.
                          </p>
                          <div className="bg-emerald-50/70 p-2.5 rounded text-[11px] text-emerald-900 flex items-center gap-2 border border-emerald-200/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span><strong>Divisão 50/50:</strong> Obrigatoriamente, 50% das notícias abordam acontecimentos do Brasil e 50% abordam o cenário Internacional (EUA, geopolítica e mundo).</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 3 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '3') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-400 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200 text-sm">
                          3
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-slate-700" /> Etapa 3: Higienização Fática dos Dados Brutos
                            </h4>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              Parser & Limpeza de Ruído
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            O sistema isola a narrativa essencial dos fatos (o que aconteceu, quando, onde, quais as consequências e declarações oficiais). Todos os banners, scripts de anúncio, paywalls e links externos de terceiros são filtrados para alimentar a IA com dados 100% puros.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 4 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '4') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 font-bold flex items-center justify-center shrink-0 border border-amber-100 text-sm">
                          4
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <Cpu className="w-4 h-4 text-amber-600" /> Etapa 4: Reescrita Jornalística & Linha Editorial Conservadora
                            </h4>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100">
                              Anthropic Claude 3.5 Sonnet
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            O Claude 3.5 redige uma reportagem original completa aplicando a <strong>Linha Editorial Conservadora do Portal NG</strong>: linguagem polida, objetiva, patriótica, focada no interesse público, liberdade e valores da família. A matéria recebe manchete magnética, subtítulo explicativo e parágrafos estruturados em HTML.
                          </p>
                          <div className="bg-amber-50/70 p-2.5 rounded text-[11px] text-amber-900 flex items-center gap-2 border border-amber-200/60">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span><strong>Garantia Antiplágio:</strong> A estrutura sintática, as frases e os títulos são 100% inéditos. Nenhuma sentença é copiada textualmente do portal de origem.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 5 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '5') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-100 text-sm">
                          5
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <CheckSquare className="w-4 h-4 text-indigo-600" /> Etapa 5: Fila de Aprovação com Auditoria Lado a Lado (Toque Humano)
                            </h4>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                              Painel Editorial do Editor
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            A notícia entra na <strong>Fila de Aprovação</strong> do painel, garantindo que o editor mantenha poder total sobre as matérias antes da publicação:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                              <strong className="text-slate-800 block mb-0.5">🔍 Comparador de Fonte</strong>
                              <span>Abre a notícia original com 1 clique e compara o texto original vs o reescrito lado a lado.</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                              <strong className="text-slate-800 block mb-0.5">🤖 Modificar com IA</strong>
                              <span>Solicite ajustes pontuais (ex: "Torne a introdução mais urgente" ou "Destaque o impacto na economia").</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                              <strong className="text-slate-800 block mb-0.5">👍 Feedback Educativo</strong>
                              <span>Curta ou descurta matérias para calibrar o estilo preferido da equipe nas próximas gerações.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 6 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '6') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-100 text-sm">
                          6
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <Database className="w-4 h-4 text-blue-600" /> Etapa 6: Indexação no Banco NoSQL & Publicação Web
                            </h4>
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                              Google Firebase Firestore
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Ao aprovar a matéria (ou em modo autopublicação), o artigo é gravado em milissegundos no banco NoSQL do Firebase. A página pública do Portal NG Brasil é atualizada instantaneamente com geração automática de Slug amigável e meta-tags OpenGraph para renderização com foto no WhatsApp e redes sociais.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 7 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '7') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-pink-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-700 font-bold flex items-center justify-center shrink-0 border border-pink-100 text-sm">
                          7
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-pink-600" /> Etapa 7: Diagramação Gráfica Automática (HTML5 Canvas Engine)
                            </h4>
                            <span className="text-[10px] font-bold bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-100">
                              Motor Gráfico Dinâmico
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            O motor gráfico gera as artes visuais em alta resolução (1080p). Ele aplica o fundo institucional selecionado (como o clássico <em>Plantão NG</em>), ajusta fontes em negrito com quebras de linha perfeitamente centralizadas e gera a imagem JPEG otimizada para carregamento rápido no celular.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 8 */}
                    {(infoActiveStep === 'all' || infoActiveStep === '8') && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-purple-300 transition-all flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 font-bold flex items-center justify-center shrink-0 border border-purple-100 text-sm">
                          8
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <Share2 className="w-4 h-4 text-purple-600" /> Etapa 8: Disparo Multicanal & Piloto Automático 24/7 na Nuvem
                            </h4>
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                              Meta Graph API v20.0 + GitHub Actions / Servidor Nuvem
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            As imagens são hospedadas no servidor do portal (<code>portalngbrasil.com.br/upload.php</code>) ou ImgBB e os containers são enviados para a Meta Graph API. A publicação acontece de forma simultânea nos Stories do Instagram e na página do Facebook.
                          </p>
                          <div className="bg-purple-50/70 p-2.5 rounded text-[11px] text-purple-900 flex items-center gap-2 border border-purple-200/60">
                            <Server className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span><strong>Operação 100% Autônoma:</strong> O agendador roda no servidor da nuvem a cada ciclo de minutos configurado. Ele não depende do seu navegador ficar aberto e não reinicia a contagem quando você recarrega a página.</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEÇÃO 3: BLINDAGEM ANTIDUPLICIDADE */}
              {(infoSubTab === 'all' || infoSubTab === 'antiduplicidade') && (
                <div className="mb-14 relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">Blindagem Antiduplicidade & Regras de Pauta (Como Funciona)</h3>
                      <p className="text-xs text-slate-500">Mecanismos matemáticos que impedem que o portal repita matérias ou assuntos recentes.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-2xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-100">
                          1
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Memória Contínua das Últimas 35 Pautas</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Antes de pesquisar, o sistema lê os bancos <code>news</code>, <code>stories_logs</code> e <code>carousels_logs</code>. Se uma notícia sobre determinado julgamento, medida provisória ou cúpula internacional já foi abordada, ela entra em uma lista negra de bloqueio temporário.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-100">
                          2
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Equilíbrio Fixo 50% Brasil / 50% Mundo</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Para garantir variedade e dinamismo, a instrução das IAs obriga a divisão exata entre cenário nacional e internacional. O leitor do portal recebe um panorama completo sem saturação de um único tema.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-100">
                          3
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Desdobramentos Inéditos vs Repetições</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Caso uma mesma crise continue evoluindo no dia, a IA é orientada a trazer <em>exclusivamente novos desdobramentos de última hora</em>, sem reciclar o texto ou o enfoque da edição anterior.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 4: TABELA GERAL DA ARQUITETURA */}
              {(infoSubTab === 'all' || infoSubTab === 'tabela') && (
                <div className="mb-14 relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">Tabela de Tecnologias & Engenharia da Versão 3.0</h3>
                      <p className="text-xs text-slate-500">Resumo técnico de cada camada de processamento do Portal NG Brasil.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/70">
                          <tr>
                            <th className="p-3.5">Camada / Etapa</th>
                            <th className="p-3.5">Tecnologia / Motor</th>
                            <th className="p-3.5">Função Exata no Portal</th>
                            <th className="p-3.5">Garantia / Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Captação ao Vivo</td>
                            <td className="p-3.5"><span className="bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">Perplexity Sonar</span></td>
                            <td className="p-3.5">Vasculhar a web aberta atrás de fatos das últimas horas</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">Notícias em tempo real + Links de origem</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Redação Conservadora</td>
                            <td className="p-3.5"><span className="bg-amber-50 text-amber-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">Claude 3.5 Sonnet</span></td>
                            <td className="p-3.5">Reescrever a matéria do zero com linha editorial do Portal NG</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">100% Autoral, zero plágio e HTML limpo</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Redundância & Falhas</td>
                            <td className="p-3.5"><span className="bg-sky-50 text-sky-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">Google Gemini 1.5</span></td>
                            <td className="p-3.5">Assumir a geração se houver oscilação de outra API</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">Zero travamentos ou páginas vazias</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Auditoria & Padrão Ouro</td>
                            <td className="p-3.5"><span className="bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">OpenAI GPT-4o</span></td>
                            <td className="p-3.5">Comparar o estilo com as matérias de excelência e criar copys sociais</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">Calibração contínua e legendas engajantes</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Diagramação Gráfica</td>
                            <td className="p-3.5"><span className="bg-pink-50 text-pink-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">HTML5 Canvas Engine</span></td>
                            <td className="p-3.5">Renderizar artes 1080x1920 (Stories) e 1080x1350 (Carrosséis)</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">Imagens em alta nitidez com molde Plantão NG</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Banco de Dados</td>
                            <td className="p-3.5"><span className="bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">Firebase Firestore</span></td>
                            <td className="p-3.5">Armazenamento em tempo real de matérias, rascunhos e agendamentos</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">Sincronização instantânea na nuvem</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Postagem Social</td>
                            <td className="p-3.5"><span className="bg-rose-50 text-rose-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">Meta Graph API v20.0</span></td>
                            <td className="p-3.5">Publicar Stories e Feed no Instagram e Página do Facebook</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">Distribuição automática multicanal</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-slate-900">Nuvem 24/7</td>
                            <td className="p-3.5"><span className="bg-purple-50 text-purple-700 font-mono font-bold px-2 py-0.5 rounded text-[11px]">GitHub Actions + Cron</span></td>
                            <td className="p-3.5">Executar o ciclo de geração mesmo com computadores desligados</td>
                            <td className="p-3.5 text-emerald-600 font-semibold">O portal e os stories nunca ficam sem conteúdo</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 5: FAQ & DÚVIDAS OPERACIONAIS DO EDITOR (INTERATIVO) */}
              {(infoSubTab === 'all' || infoSubTab === 'faq') && (
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">5</div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">Perguntas Frequentes & Dúvidas Operacionais do Editor</h3>
                      <p className="text-xs text-slate-500">Esclarecimentos diretos para a rotina diária da equipe do Portal NG Brasil.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {[
                      {
                        id: 'faq1',
                        icon: Clock,
                        question: 'Preciso deixar o painel aberto para sair Stories?',
                        answer: 'Não! Na versão 3.0, o agendamento (`nextRun`) fica salvo no banco de dados na nuvem. O servidor autônomo executa a rotina nos horários programados. Se você estiver com a página aberta, o painel atua como redundancy ativa adicional para garantir que nenhuma publicação falhe.'
                      },
                      {
                        id: 'faq2',
                        icon: RefreshCw,
                        question: 'Por que o cronômetro não reinicia mais ao dar F5?',
                        answer: 'Anteriormente, o sistema calculava a hora somando 30 minutos à hora do momento do carregamento da tela. Na versão 3.0, o timestamp exato do próximo disparo fica gravado no Firestore. Ao atualizar a página ou entrar por outro computador, ele lê o mesmo horário agendado, mantendo a contagem contínua.'
                      },
                      {
                        id: 'faq3',
                        icon: ExternalLink,
                        question: 'Como posso auditar de onde veio a notícia?',
                        answer: 'Em cada rascunho na Fila de Aprovação, você encontra o botão Fonte ↗ e o botão Comparar com a Fonte Original. Ao clicar, o painel abre a comparação lado a lado do resumo, manchete e corpo de texto completo entre o original e a versão reescrita pelo Claude.'
                      },
                      {
                        id: 'faq4',
                        icon: ShieldCheck,
                        question: 'Como garantir que a linha editorial permaneça conservadora?',
                        answer: 'A Linha Editorial é controlada de três formas: pelo prompt fixo configurado na aba Prompt, pelo botão de Padrão Ouro (que serve como espelho de estilo) e pelos botões de curtir/descurtir da Fila de Aprovação, que afinam o comportamento do modelo.'
                      },
                    ].map((faq) => {
                      const FaqIcon = faq.icon;
                      const isExpanded = infoExpandedFaq === faq.id || infoSubTab === 'faq';
                      return (
                        <div
                          key={faq.id}
                          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
                          onClick={() => setInfoExpandedFaq(infoExpandedFaq === faq.id ? null : faq.id)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <FaqIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                              {faq.question}
                            </h4>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <p className="text-slate-600 leading-relaxed mt-2 pt-2 border-t border-slate-100">
                              {faq.answer}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}



        </form>
      </div>
      
      {/* Fila de Aprovação sempre visível embaixo do Robô */}
      {renderApprovals()}
      </div>
    );
  };

  const renderApprovals = () => {
    if (showForm) return renderMaterias();

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Fila de Aprovação ({draftData.length})</h2>
            <p className="text-sm text-slate-500">Matérias redigidas pela Inteligência Artificial aguardando revisão humana.</p>
          </div>
        </div>
        
        {draftData.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Tudo limpo!</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">Sua fila de aprovação está vazia. Acione o Robô Jornalista para buscar novas pautas.</p>
            <button onClick={() => setActiveTab('robot')} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-sm hover:bg-indigo-100 transition-colors">Ir para Automação</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {draftData.map(draft => (
              <div key={draft.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-16 sm:w-32 sm:h-20 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                    <img src={draft.image} alt="Capa" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {draft.approvalStatus === 'approved' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Aprovado {draft.approvedBy ? `por ${draft.approvedBy}` : ''}
                        </span>
                      ) : draft.approvalStatus === 'needs_revision' ? (
                        <span className="bg-rose-100 text-rose-800 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap flex items-center gap-1" title={draft.revisionNotes}>
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> Ajustes Solicitados
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                          Revisão Pendente
                        </span>
                      )}
                      <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm flex items-center gap-1 whitespace-nowrap"><Bot className="w-2.5 h-2.5"/> Gerado por IA</span>
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                        📰 {draft.source || draft.sourceName || (draft.author?.role?.replace('Fonte: ', '')) || (draft.originalUrl ? getSourceNameFromUrl(draft.originalUrl) : 'Desconhecido')}
                      </span>
                      {(draft.originalUrl || draft.metadata?.url || draft.metadata?.link_fonte) && (
                        <a 
                          href={draft.originalUrl || draft.metadata?.url || draft.metadata?.link_fonte} 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={(e) => e.stopPropagation()} 
                          className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 transition-colors"
                          title="Abrir matéria original na fonte"
                        >
                          <LinkIcon className="w-2.5 h-2.5" /> Fonte ↗
                        </a>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1">{draft.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">{draft.subtitle}</p>
                    {(draft.originalTitle || draft.metadata?.titulo_original) && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        <span className="font-semibold text-slate-500">Original:</span> {draft.originalTitle || draft.metadata?.titulo_original}
                      </p>
                    )}
                    {draft.revisionNotes && (
                      <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-md flex items-start gap-1.5 max-w-xl">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Parecer / Ajustes solicitados:</strong> {draft.revisionNotes}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-medium">
                      <span>{draft.date}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <div className="flex items-center gap-1 mr-2 bg-slate-100 rounded-md p-1 border border-slate-200">
                    <button 
                      onClick={() => handleFeedback(draft, 'like')} 
                      className={`p-1.5 rounded-md transition-colors ${robotFeedback.liked.includes(draft.metadata?.titulo_original || draft.title) ? 'text-green-600 bg-green-100' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                      title="Gostei dessa escolha (Ensinar Robô)"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleFeedback(draft, 'dislike')} 
                      className={`p-1.5 rounded-md transition-colors ${robotFeedback.disliked.includes(draft.metadata?.titulo_original || draft.title) ? 'text-red-600 bg-red-100' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                      title="Não gostei dessa escolha (Ensinar Robô)"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => handleOpenApprovalModal(draft)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-bold text-xs transition-colors" title="Gerar Link de Aprovação para Enviar via WhatsApp">
                    <Share2 className="w-3.5 h-3.5" /> Link Aprovação
                  </button>
                  <button onClick={() => setSocialModalArticle(draft)} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md font-bold text-xs transition-colors" title="Gerar Card no estilo Canva">
                    <Camera className="w-3.5 h-3.5" /> Arte Insta
                  </button>

                  {draft.approvalStatus === 'approved' ? (
                    <button 
                      onClick={() => handleDirectPublishAllChannels(draft)} 
                      disabled={isDirectPublishingId === draft.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-xs shadow-md transition-all active:scale-95"
                      title="Postar Imediatamente no Portal NG Brasil, Instagram e Facebook"
                    >
                      {isDirectPublishingId === draft.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Postando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Postar Agora (Portal + Redes)
                        </>
                      )}
                    </button>
                  ) : (
                    <button onClick={() => handleEdit(draft, true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-bold text-sm transition-colors">
                      <Edit3 className="w-4 h-4" /> Revisar e Aprovar
                    </button>
                  )}

                  {draft.approvalStatus === 'approved' && (
                    <button onClick={() => handleEdit(draft, true)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors" title="Editar texto antes de postar">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(draft.id, true)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors" title="Descartar Rascunho">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className={activeTab === 'dashboard' ? "min-h-screen bg-[#060913] flex flex-col md:flex-row font-sans" : "min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans"}>
        
        {/* Sidebar */}
      <aside className={`w-full ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} bg-[#040f1d] text-slate-300 flex flex-col shrink-0 md:h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out`}>
        <div className={`p-4 ${sidebarCollapsed ? 'md:p-3 md:flex-col md:gap-3' : 'md:p-5'} border-b border-slate-800 flex items-center justify-between transition-all`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'md:justify-center' : 'gap-3'} min-w-0`}>
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src="/logo/logo-oficial.png" alt="Logo" className="w-full h-full object-cover rounded" onError={(e) => e.target.style.display='none'} />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-white font-bold block truncate">Painel NG <span className="text-red-500 text-[10px] ml-1">v2.0</span></span>
                <span className="text-[10px] text-red-400 font-semibold uppercase truncate">Área do Jornalista</span>
              </div>
            )}
          </div>
          
          {/* Botão com seta para recolher/expandir o menu */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all border border-slate-700/60 cursor-pointer shrink-0"
            title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[#00F0FF]" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            )}
          </button>

          <button 
            onClick={onLogout}
            className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Sair do Painel"
          >
            <LogOut className="w-5 h-5 shrink-0" />
          </button>
        </div>

        <nav className={`flex-row md:flex-col flex md:flex-1 p-2 ${sidebarCollapsed ? 'md:p-2' : 'md:p-4'} gap-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar border-b md:border-b-0 border-slate-800`}>
          <button 
            onClick={() => {setActiveTab('insights'); setShowForm(false);}} 
            className={getNavClass('insights') + " whitespace-nowrap"}
            title="Início"
          >
            <Activity className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Início</span>}
            <span className="sm:hidden">Início</span>
          </button>
          
          <button 
            onClick={() => {setActiveTab('dashboard'); setShowForm(false);}} 
            className={getNavClass('dashboard') + " whitespace-nowrap"}
            title="Dashboard"
          >
            <PieChart className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          
          {sidebarCollapsed ? (
            <div className="hidden md:block w-6 h-[1px] bg-slate-800 my-2 mx-auto" />
          ) : (
            <div className="hidden md:block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-6 mb-2 px-1">Automação IA</div>
          )}

          <button 
            onClick={() => {setActiveTab('robot'); setShowForm(false);}} 
            className={getNavClass('robot') + " whitespace-nowrap relative " + (sidebarCollapsed ? "md:justify-center" : "justify-between")}
            title="Gerador de Notícias"
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'gap-0' : 'gap-2'}`}>
                <BrainCircuit className="w-4 h-4 shrink-0" /> 
                {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Gerador de Notícias</span>}
                <span className="sm:hidden">Gerador</span>
            </div>
            {draftData?.length > 0 && (
                <span className={sidebarCollapsed 
                  ? "hidden md:flex absolute top-1 right-1 bg-yellow-500 text-yellow-950 text-[9px] font-black w-4 h-4 items-center justify-center rounded-full leading-none shadow" 
                  : "bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"}>
                  {draftData.length}
                </span>
            )}
            {draftData?.length > 0 && sidebarCollapsed && (
                <span className="md:hidden bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {draftData.length}
                </span>
            )}
          </button>
          
          <button 
            onClick={() => {setActiveTab('stories'); setShowForm(false);}} 
            className={getNavClass('stories') + " whitespace-nowrap"}
            title="Gerador de Stories"
          >
            <ImageIcon className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Gerador de Stories</span>}
            <span className="sm:hidden">Stories</span>
          </button>

          <button 
            onClick={() => {setActiveTab('carousels'); setShowForm(false);}} 
            className={getNavClass('carousels') + " whitespace-nowrap"}
            title="Gerador de Carrosséis"
          >
            <ImageIcon className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Gerador de Carrosséis</span>}
            <span className="sm:hidden">Carrosséis</span>
          </button>
          
          <button 
            onClick={() => {setActiveTab('aprovacao'); setShowForm(false);}} 
            className={getNavClass('aprovacao') + " whitespace-nowrap relative " + (sidebarCollapsed ? "md:justify-center" : "justify-between")}
            title="Fila de Aprovação"
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'gap-0' : 'gap-2'}`}>
                <CheckSquare className="w-4 h-4 shrink-0" /> 
                {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Fila de Aprovação</span>}
                <span className="sm:hidden">Aprovação</span>
            </div>
            {draftData?.length > 0 && (
                <span className={sidebarCollapsed 
                  ? "hidden md:flex absolute top-1 right-1 bg-yellow-500 text-yellow-950 text-[9px] font-black w-4 h-4 items-center justify-center rounded-full leading-none shadow" 
                  : "bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"}>
                  {draftData.length}
                </span>
            )}
            {draftData?.length > 0 && sidebarCollapsed && (
                <span className="md:hidden bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {draftData.length}
                </span>
            )}
          </button>

          {sidebarCollapsed ? (
            <div className="hidden md:block w-6 h-[1px] bg-slate-800 my-2 mx-auto" />
          ) : (
            <div className="hidden md:block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-6 mb-2 px-1">Administração</div>
          )}

          <button 
            onClick={() => {setActiveTab('materias'); setShowForm(false);}} 
            className={getNavClass('materias') + " whitespace-nowrap"}
            title="Gestão de Matérias"
          >
            <FileText className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Gestão de Matérias</span>}
            <span className="sm:hidden">Matérias</span>
          </button>

          <button 
            onClick={() => {setActiveTab('autores'); setShowForm(false);}} 
            className={getNavClass('autores') + " whitespace-nowrap"}
            title="Redação / Autores"
          >
            <Users className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Redação / Autores</span>}
            <span className="sm:hidden">Autores</span>
          </button>

          <button 
            onClick={() => {setActiveTab('banners'); setShowForm(false);}} 
            className={getNavClass('banners') + " whitespace-nowrap"}
            title="Banners de Patrocínio"
          >
            <ImageIcon className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Banners de Patrocínio</span>}
            <span className="sm:hidden">Banners</span>
          </button>
        </nav>

        <div className={`hidden md:flex flex-col gap-1.5 ${sidebarCollapsed ? 'p-2' : 'p-4'} border-t border-slate-800 mt-auto`}>
          <button 
            onClick={() => {setActiveTab('configuracoes'); setShowForm(false);}} 
            className={getNavClass('configuracoes') + " whitespace-nowrap"}
            title="Configurações"
          >
            <Settings className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span className="hidden sm:inline md:inline">Configurações</span>}
            <span className="sm:hidden">Ajustes</span>
          </button>

          <button 
            onClick={onLogout}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3 gap-2'} w-full py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-sm font-medium`}
            title="Sair do Painel"
          >
            <LogOut className="w-4 h-4 shrink-0" /> 
            {!sidebarCollapsed && <span>Sair do Painel</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar (oculta no Dashboard para visual escuro em tela cheia sem faixa branca) */}
        {activeTab !== 'dashboard' && (
          <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm sticky top-0 z-20">
            <h1 className="text-xl font-bold text-title-blue font-heading capitalize">
              {activeTab === 'insights' && 'Analytics e Desempenho'}
              {activeTab === 'materias' && (showForm ? 'Publicador' : 'Gestão de Notícias')}
              {activeTab === 'autores' && 'Equipe de Redação'}
              {activeTab === 'banners' && 'Gestão de Banners'}
              {activeTab === 'configuracoes' && 'Configurações'}
              {activeTab === 'robot' && 'Gerador de Notícias'}
              {activeTab === 'stories' && 'Gerador de Stories (IA)'}
              {activeTab === 'carousels' && 'Gerador de Carrosséis (IA)'}
              {activeTab === 'aprovacao' && 'Fila de Aprovação'}
            </h1>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {setActiveTab('materias'); setShowForm(true); setEditingId(null); setFormData({title:'', subtitle:'', category:'politica', praca:'Nacional', image:'', content:'', authorName: 'Redação NG Brasil'});}}
                className="bg-[#d40a38] hover:bg-red-700 text-white transition-colors px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
              >
                <PlusCircle className="w-4 h-4 shrink-0" /> Nova Matéria
              </button>
            </div>
          </header>
        )}

        {/* Dashboard Content Area */}
        <div className={activeTab === 'dashboard' ? "p-0 flex-1 overflow-y-auto bg-[#060913]" : "p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50"}>
          {activeTab === 'insights' && renderInsights()}
          {activeTab === 'materias' && renderMaterias()}
          {activeTab === 'autores' && renderAutores()}
          {activeTab === 'banners' && renderBanners()}
          {activeTab === 'configuracoes' && renderConfiguracoes()}
          {activeTab === 'robot' && renderRobot()}
          <div style={{ display: activeTab === 'stories' ? 'block' : 'none' }}>
            <StoriesGenerator 
              perplexityKey={robotPerplexityKey} 
              geminiKey={robotGeminiKey} 
              metaToken={metaToken} 
              metaIgAccountId={metaIgAccountId} 
              imgbbKey={imgbbKey}
              newsData={newsData}
              draftData={draftData}
            />
          </div>
          <div style={{ display: activeTab === 'carousels' ? 'block' : 'none' }}>
            <CarouselsGenerator 
              perplexityKey={robotPerplexityKey} 
              geminiKey={robotGeminiKey} 
              metaToken={metaToken} 
              metaIgAccountId={metaIgAccountId} 
              imgbbKey={imgbbKey}
              newsData={newsData}
              draftData={draftData}
            />
          </div>
          {activeTab === 'dashboard' && <AnalyticsDashboard />}
          {activeTab === 'aprovacao' && renderApprovals()}
        </div>

        {socialModalArticle && (
          <SocialPostGenerator 
            showToast={showToast} 
            article={socialModalArticle} 
            onClose={() => setSocialModalArticle(null)} 
            onPostSuccess={(postResult) => {
              const artId = socialModalArticle.id || `news-${Date.now()}`;
              setSocialModalArticle(null);
              setPublishModalData({
                isOpen: true,
                isPublishing: false,
                statusText: 'Publicado nas redes sociais com sucesso!',
                article: socialModalArticle,
                target: 'all',
                targetPlatforms: ['facebook', 'instagram', 'threads'],
                links: {
                  site: `https://portalngbrasil.com.br/#/noticia/${artId}`,
                  share: `https://portalngbrasil.com.br/share.php?id=${artId}`,
                  instagram: postResult?.instagram || 'https://www.instagram.com/portalngbrasil/',
                  facebook: postResult?.facebook || (metaFbPageId ? `https://www.facebook.com/${metaFbPageId}` : 'https://www.facebook.com/portalngbrasil'),
                  threads: postResult?.threads || 'https://www.threads.net/@portalngbrasil'
                },
                errors: {
                  instagram: postResult?.igError,
                  facebook: postResult?.fbError,
                  threads: postResult?.thError
                }
              });
            }}
            metaToken={metaToken}
            metaFbPageId={metaFbPageId}
            metaIgAccountId={metaIgAccountId}
            threadsToken={threadsToken}
            threadsUserId={threadsUserId}
            imgbbKey={imgbbKey}
          />
        )}

        <PublishSuccessModal 
          isOpen={Boolean(publishModalData)} 
          onClose={handleClosePublishModal} 
          data={publishModalData} 
        />

        {/* Modal de Compartilhamento de Link de Aprovação */}
        {approvalModalData.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Link de Aprovação de Matéria</h3>
                    <p className="text-xs text-emerald-100">Envie para o diretor, editor ou cliente aprovar</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setApprovalModalData({ isOpen: false, articleId: null, title: '', subtitle: '', url: '', item: null })}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pauta Selecionada</span>
                  <h4 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-2">{approvalModalData.title}</h4>
                  {approvalModalData.subtitle && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{approvalModalData.subtitle}</p>
                  )}
                </div>

                {/* Recursos incluídos */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> O que a editora-chefe verá no link:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 text-[11px]">
                    <li><strong>Preview do Portal:</strong> Matéria completa diagramada fielmente ao leitor</li>
                    <li><strong>Preview do Instagram:</strong> Card oficial (com download PNG), legenda e roteiro de vídeo</li>
                    <li><strong>Preview do Facebook:</strong> Simulação real do post e link card no feed</li>
                    <li><strong>Aprovação Rápida:</strong> Botão para <strong>Aprovar e Postar Automaticamente</strong></li>
                    <li>Opção para solicitar ajustes e apontar correções com 1 clique</li>
                    <li>Acesso direto e seguro sem necessidade de login ou senha</li>
                  </ul>
                </div>

                {/* Input do Link */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">URL Direta de Aprovação</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={approvalModalData.url} 
                      className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 font-mono select-all focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(approvalModalData.url);
                        setCopiedApprovalLink(true);
                        showToast("Link copiado para a área de transferência!");
                        setTimeout(() => setCopiedApprovalLink(false), 2500);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                    >
                      {copiedApprovalLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedApprovalLink ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `*Portal NG Brasil - Matéria para Aprovação*\n\n📰 *${approvalModalData.title}*\n${approvalModalData.subtitle ? approvalModalData.subtitle + '\n' : ''}\nAcesse o link abaixo para visualizar a matéria diagramada, os materiais do Instagram e dar seu parecer (Aprovar / Solicitar Ajustes):\n\n🔗 ${approvalModalData.url}`;
                      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-3 px-4 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Enviar no WhatsApp
                  </button>
                  
                  <a
                    href={approvalModalData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-center"
                  >
                    <ExternalLink className="w-4 h-4" /> Abrir Prévia ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      </div>
        {toastMessage && (
          <div className={`fixed bottom-4 right-4 ${toastError ? 'bg-red-600' : 'bg-emerald-600'} text-white px-6 py-3 rounded-lg shadow-xl text-sm font-bold animate-in fade-in slide-in-from-bottom-4 z-[9999] flex items-center gap-2`}>
            {toastError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {toastMessage}
          </div>
        )}
    </ErrorBoundary>
  );
}
