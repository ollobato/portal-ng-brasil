import React, { Component, useState } from 'react';
import { trackEvent } from '../utils/analytics';
import { LogOut, AlertCircle, PlusCircle, Plus, Edit3, Trash2, LayoutDashboard, FileText, Settings, Users, Search, Activity, TrendingUp, BarChart3, Eye, Sparkles, Bot, BrainCircuit, CheckCircle, Clock, Image as ImageIcon, ThumbsUp, ThumbsDown, Key, Share2, Share, Camera , Loader2, Save } from 'lucide-react';
import Editor from 'react-simple-wysiwyg';
import SocialPostGenerator from './SocialPostGenerator';
import { shareToWhatsApp } from '../utils/socialExporter';
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
                try {
                    
                    
                    const fileRef = ref(storage, `images/${Date.now()}_${file.name}`);
                    await uploadBytes(fileRef, blob);
                    const url = await getDownloadURL(fileRef);
                    resolve(url);
                } catch (e) {
                    reject(e);
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
  const [activeTab, setActiveTab] = useState('insights');
  const [toastMessage, setToastMessage] = useState(null);
  const [toastError, setToastError] = useState(false);
  const showToast = (message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [localBanners, setLocalBanners] = useState(banners || []);
  
  // Sync local banners when props change (initial load)
  React.useEffect(() => {
    if (banners && banners.length > 0) {
      setLocalBanners(banners);
    }
  }, [banners]);

  // Drafts state for approval queue (synced with Firebase)
  const [draftDataRaw, setDraftData] = useFirebaseSync('drafts', []);
  const draftData = draftDataRaw.map(item => ({
    ...item,
    praca: typeof item.praca === 'string' ? item.praca.replace(/^Praça\s+/i, '') : item.praca,
    title: typeof item.title === 'string' ? item.title.replace(/^Praça\s+/i, '') : item.title
  })).sort((a, b) => b.id - a.id);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formActiveTab, setFormActiveTab] = useState('portal'); // 'portal' | 'social'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '', subtitle: '', category: 'politica', praca: 'Nacional', image: '', content: ''
  });

  // AI Assistant states
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Robot / Automation states
  
  const defaultUrls = "https://danuzionews.com/\nhttps://forbes.com.br/\nhttps://www.gazetadopovo.com.br\nhttps://www.brasilparalelo.com.br/\nhttps://www.cnnbrasil.com.br/\nhttps://revistaoeste.com/\nhttps://agenciagov.ebc.com.br/\nhttps://agenciabrasil.ebc.com.br/\nhttps://www.gov.br/pt-br\nhttps://www.voanews.com/\nhttps://news.un.org/pt/\nhttps://www.r7.com/\nhttps://g1.globo.com/\nhttps://www.uol.com.br/\nhttps://www.estadao.com.br/\nhttps://www.folha.uol.com.br/\nhttps://www.bbc.com/portuguese\nhttps://www.poder360.com.br/\nhttps://www.metropoles.com/\nhttps://www.terra.com.br/\nhttps://www.panrotas.com.br/\nhttps://diariodoturismo.com.br/\nhttps://brasilturis.com.br/\nhttps://www.gov.br/fazenda\nhttps://www.gov.br/saude\nhttps://www.gov.br/mec\nhttps://www.gov.br/mcti/pt-br";
  const defaultGuidelines = `A estruturação do Portal NG Brasil como um veículo de comunicação de viés conservador (centro-direita), com a sofisticação da Forbes e o dinamismo da CNN, exige um posicionamento de marca que transmita autoridade inquestionável. O segredo para não tornar a linha ideológica "escancarada" ou panfletária é ancorar o portal estritamente na qualidade técnica da informação, nos princípios éticos do jornalismo e na estética de alto valor.

A aplicação de 15 anos de experiência prática em criação de conteúdo, passando pela agilidade da produção de TV, coberturas de hard news e visão estratégica lapidada em mercados de alta exigência, permite que esse novo projeto nasça não apenas como um feed de notícias, mas como um ecossistema de influência real.

Aqui está o projeto de posicionamento de marca e estruturação do Portal NG Brasil, integrando os pilares éticos solicitados:

1. Posicionamento de Marca: O "Centro-Direita Sofisticado"

O Portal NG Brasil não precisa gritar suas posições políticas. A linha conservadora será transmitida pela escolha das pautas, pelo enquadramento econômico (foco em livre mercado, empreendedorismo e respeito às instituições) e pela sobriedade na entrega.

⚬ A Promessa: Entregar a notícia nua e crua, com análise aprofundada, permitindo que o leitor forme sua própria opinião.
⚬ O Tom de Voz: O Herói e O Sábio. Uma linguagem madura, culta, direta e sem sensacionalismo. Textos que poderiam ser lidos em uma reunião de diretoria ou em um fórum econômico.
⚬ O Slogan Invisível: Todo o material carregará o DNA da ARQA Criativa: conteúdo com base, intenção e presença. A notícia não é apenas relatada; ela é fundamentada.

2. Implementação do Código de Ética dos Jornalistas

Para que o portal atinja o patamar de credibilidade almejado, a operação deve incorporar as diretrizes do Código de Ética dos Jornalistas Brasileiros como seu manual de conduta estrutural:

⚬ A Supremacia dos Fatos sobre a Ideologia: O compromisso fundamental é com a verdade no relato dos fatos, pautando o trabalho pela precisa apuração. O viés de centro-direita existirá na curadoria (ex: dar mais peso a pautas de liberdade econômica), mas a produção e a divulgação da informação se pautarão estritamente pela veracidade.
⚬ Repúdio ao Sensacionalismo: Para manter o padrão Forbes, o portal não pode divulgar informações de caráter mórbido, sensacionalista ou contrário aos valores humanos. A estética visual e textual deve fugir de "iscas de clique" (clickbaits) baratas.
⚬ Transparência Comercial (A Máquina de Vendas): Como o portal também possui uma estratégia de monetização via publieditoriais e patrocínios (herdada da modelagem do NG Gramado), é obrigatório informar claramente à sociedade quando as matérias tiverem caráter publicitário, decorrerem de patrocínios ou promoções. A separação clara entre o que é Editorial e o que é Patrocinado eleva a confiança do leitor de alto padrão.
⚬ Pluralidade e Rigor: Antes da divulgação de denúncias ou fatos polêmicos, é dever do portal ouvir o maior número de pessoas e instituições envolvidas. Isso blinda o portal contra processos e reforça a imagem de um veículo justo e centrado.`;

  const fallbackSettings = {
    robotUrls: localStorage.getItem("portal_ng_robot_urls") || defaultUrls,
    robotGeminiKey: localStorage.getItem("portal_ng_gemini_key") || "",
    robotOpenAIKey: localStorage.getItem("portal_ng_openai_key") || "",
    robotClaudeKey: localStorage.getItem("portal_ng_claude_key") || "",
    metaToken: localStorage.getItem("portal_ng_meta_token") || "",
    metaFbPageId: localStorage.getItem("portal_ng_meta_fb_page_id") || "",
    metaIgAccountId: localStorage.getItem("portal_ng_meta_ig_account_id") || "",
    imgbbKey: localStorage.getItem("portal_ng_imgbb_key") || "",
    robotFeedback: localStorage.getItem("portal_ng_robot_feedback") ? JSON.parse(localStorage.getItem("portal_ng_robot_feedback")) : { liked: [], disliked: [] },
    robotGuidelines: localStorage.getItem("portal_ng_robot_guidelines") || defaultGuidelines,
    isAutoPilot: localStorage.getItem("portal_ng_autopilot") === "true",
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

  const metaToken = settings.metaToken;
  const setMetaToken = (val) => setSettings(prev => ({ ...prev, metaToken: typeof val === "function" ? val(prev.metaToken) : val }));

  const metaFbPageId = settings.metaFbPageId;
  const setMetaFbPageId = (val) => setSettings(prev => ({ ...prev, metaFbPageId: typeof val === "function" ? val(prev.metaFbPageId) : val }));

  const metaIgAccountId = settings.metaIgAccountId;
  const setMetaIgAccountId = (val) => setSettings(prev => ({ ...prev, metaIgAccountId: typeof val === "function" ? val(prev.metaIgAccountId) : val }));

  const imgbbKey = settings.imgbbKey;
  const setImgbbKey = (val) => setSettings(prev => ({ ...prev, imgbbKey: typeof val === "function" ? val(prev.imgbbKey) : val }));

  const robotFeedback = settings.robotFeedback;
  const setRobotFeedback = (val) => setSettings(prev => ({ ...prev, robotFeedback: typeof val === "function" ? val(prev.robotFeedback) : val }));

  const robotGuidelines = settings.robotGuidelines;
  const setRobotGuidelines = (val) => setSettings(prev => ({ ...prev, robotGuidelines: typeof val === "function" ? val(prev.robotGuidelines) : val }));

  const isAutoPilot = settings.isAutoPilot;
  const setIsAutoPilot = (val) => setSettings(prev => ({ ...prev, isAutoPilot: typeof val === "function" ? val(prev.isAutoPilot) : val }));

  const authors = settings.authors;
  const setAuthors = (val) => setSettings(prev => ({ ...prev, authors: typeof val === "function" ? val(prev.authors) : val }));


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
  const [isRobotRunning, setIsRobotRunning] = useState(false);
  const [robotStatus, setRobotStatus] = useState("");
  const [robotProgress, setRobotProgress] = useState(null);
  
  const [robotStartDate, setRobotStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [robotStartTime, setRobotStartTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().substring(0,5);
  });
  const [robotCategory, setRobotCategory] = useState("todas");
  
  const [robotActiveTab, setRobotActiveTab] = useState("curadora");
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

  const [autoPilotHours, setAutoPilotHours] = useState(1);

  React.useEffect(() => {
    let intervalId = null;
    if (isAutoPilot && !isRobotRunning) {
      const ms = autoPilotHours * 60 * 60 * 1000;
      intervalId = setInterval(() => {
        console.log("Piloto Automático: disparando varredura...");
        runRobotPipeline({ preventDefault: () => {} });
      }, ms);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoPilot, isRobotRunning, autoPilotHours]);

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
    const base = "flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors w-full text-left ";
    if (activeTab === tab) {
      return base + "bg-red-600/20 text-red-400 border border-red-500/20";
    }
    return base + "text-slate-400 hover:bg-slate-800 hover:text-slate-200";
  };

  // --- ACTIONS ---
  const handleDelete = (id, isDraft = false) => {
    if (isDraft) {
      setDraftData(draftData.filter(n => n.id !== id));
      return;
    }
    if(window.confirm(`Tem certeza que deseja excluir esta matéria?`)) {
      setNewsData(newsData.filter(n => n.id !== id));
    }
  };

  const [editingIsDraft, setEditingIsDraft] = useState(false);

  const handleEdit = (news, isDraft = false) => {
    setEditingId(news.id);
    setEditingIsDraft(isDraft);
    
    // Fallback and type-casting to ensure no objects are passed to React inputs
    const safeString = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.join('<br/><br/>');
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    setFormData({
      title: safeString(news.title),
      subtitle: safeString(news.subtitle),
      category: typeof news.category === 'string' ? news.category : 'geral',
      praca: typeof news.praca === 'string' ? news.praca : 'Nacional',
      image: safeString(news.image),
      content: safeString(news.content)
    });
    setShowForm(true);
  };

  const [isUploadingFiles, setIsUploadingFiles] = useState({});

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

  const handleSaveForm = (e) => {
    e.preventDefault();
    
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    if (editingId) {
      const originalItem = editingIsDraft 
        ? draftData.find(d => d.id === editingId) 
        : newsData.find(n => n.id === editingId);

      const updatedArticle = {
        ...originalItem,
        title: formData.title,
        subtitle: formData.subtitle,
        category: formData.category,
        categoryLabel: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        praca: formData.praca,
        image: formData.image || `https://image.pollinations.ai/prompt/${encodeURIComponent("News photo about " + formData.title + ", realistic, high quality, professional photography")}?width=1200&height=1200&nologo=true`,
        content: formData.content,
      };

      if (editingIsDraft) {
        setDraftData(draftData.filter(n => n.id !== editingId));
        setNewsData([updatedArticle, ...newsData]);
      } else {
        setNewsData(newsData.map(n => n.id === editingId ? updatedArticle : n));
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
          name: "Você (Editor NG)",
          role: "Redação Principal",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
        },
        date: dateStr,
        readTime: "3 min de leitura",
        image: formData.image || `https://image.pollinations.ai/prompt/${encodeURIComponent("News photo about " + formData.title + ", realistic, high quality, professional photography")}?width=1200&height=1200&nologo=true`,
        isFeatured: true, // Force to see it on home
        isTrending: false,
        views: 0,
        content: formData.content,
        comments: []
      };
      setNewsData([newArticle, ...newsData]);
    }
    setShowForm(false);
    setEditingId(null);
    setEditingIsDraft(false);
    setShowAiAssistant(false);
    setFormData({ title: '', subtitle: '', category: 'politica', praca: 'Nacional', image: '', content: '' });
  };

  
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
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

    try {
      const urls = robotUrls.split('\n').map(u => u.trim()).filter(u => u.length > 5);
      if (urls.length === 0) {
        throw new Error("Nenhum link válido encontrado.");
      }

      let totalGeneratedThisSession = 0;
      const MAX_PER_SESSION = 20;
      
      setRobotProgress({
        portals: { current: 0, total: urls.length },
        news: { current: 0, total: MAX_PER_SESSION }
      });

      const callAI = async (prompt, retryCount = 0) => {
         let errorMessages = [];
         let generatedText = null;
         
         const wait = (ms) => new Promise(r => setTimeout(r, ms));
         
         if (robotGeminiKey.trim()) {
           const attemptGemini = async (modelName) => {
             const body = { contents: [{ parts: [{ text: prompt }] }] };
             // Only 1.5 models support responseMimeType
             if (modelName.includes('1.5')) {
               body.generationConfig = { responseMimeType: 'application/json' };
             }
             
             const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${robotGeminiKey.trim()}`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(body)
             });
             if (!geminiRes.ok) {
                 if (geminiRes.status === 429 && retryCount < 2) {
                     setRobotStatus(`Limite da API atingido (${modelName}). Aguardando 15s...`);
                     await wait(15000);
                     return await callAI(prompt, retryCount + 1);
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
         
         if (!generatedText && robotOpenAIKey.trim()) {
           try {
             const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${robotOpenAIKey.trim()}` },
               body: JSON.stringify({ model: 'gpt-4o-mini', response_format: { type: "json_object" }, messages: [{ role: 'user', content: prompt }] })
             });
             if (!openAIRes.ok) {
                 if (openAIRes.status === 429 && retryCount < 2) {
                     setRobotStatus("Limite do ChatGPT atingido. Aguardando 15s...");
                     await wait(15000);
                     return await callAI(prompt, retryCount + 1);
                 }
                 const errText = await openAIRes.text();
                 throw new Error("ChatGPT Falhou: " + errText);
             }
             const openAIData = await openAIRes.json();
             generatedText = openAIData.choices[0].message.content;
           } catch (e) { errorMessages.push(e.message); }
         }
         
         if (!generatedText && robotClaudeKey.trim()) {
           try {
             const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'x-api-key': robotClaudeKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
               body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
             });
             if (!claudeRes.ok) {
                 if (claudeRes.status === 429 && retryCount < 2) {
                     setRobotStatus("Limite do Claude atingido. Aguardando 15s...");
                     await wait(15000);
                     return await callAI(prompt, retryCount + 1);
                 }
                 const errText = await claudeRes.text();
                 throw new Error("Claude Falhou: " + errText);
             }
             const claudeData = await claudeRes.json();
             generatedText = claudeData.content[0].text;
           } catch (e) { errorMessages.push(e.message); }
         }
         if (!generatedText) throw new Error(errorMessages.join(" | "));
         return generatedText;
      };

      for (let i = 0; i < urls.length; i++) {
        if (totalGeneratedThisSession >= MAX_PER_SESSION) break;

        let targetUrl = urls[i];
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
        setRobotProgress(p => ({ ...p, portals: { current: i + 1, total: urls.length } }));
        setRobotStatus(`Lendo portal: ${targetUrl}...`);
        
        let pageText = "";
        
        try {
          let jinaSuccess = false;
          try {
            let res = await fetchWithTimeout(`https://r.jina.ai/${targetUrl}`);
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
                let resCors = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
                if (resCors.ok) pageHtml = await resCors.text();
              } catch(e) {}
              if (!pageHtml) {
                try {
                  let resAll = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
                  if (resAll.ok) pageHtml = await resAll.text();
                } catch(e) {}
              }
              if (!pageHtml) {
                try {
                  let resCode = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
                  if (resCode.ok) pageHtml = await resCode.text();
                } catch(e) {}
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
          ? '' 
          : `\nFiltro obrigatório: SELECIONE APENAS NOTÍCIAS QUE SE ENCAIXEM NA CATEGORIA "${robotCategory.toUpperCase()}". Ignore notícias de outros assuntos.\n`;

        const timeInstruction = (robotStartDate || robotStartTime) 
          ? `\nFiltro de Tempo: O usuário iniciou a pesquisa com a referência de tempo ${robotStartDate ? 'data ' + robotStartDate : ''} ${robotStartTime ? 'às ' + robotStartTime : ''}. Selecione as notícias mais recentes (hoje ou últimas 24h) relativas a esse momento.\n` 
          : `\nDê preferência para notícias de hoje ou das últimas 24 a 48 horas (incluindo as postadas ontem a partir das 20h).\n`;

        const headlinesPrompt = `
          Identifique as ${maxHeadlines} notícias MAIS RECENTES que aparecem neste texto.${timeInstruction}${categoryInstruction}
          
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
            Você é um jornalista sênior editor-chefe escrevendo para o Portal NG Brasil.
            Abaixo estão as DIRETRIZES EDITORIAIS E DE TOM DE VOZ do nosso portal. Você DEVE ler e aplicar essas diretrizes estritamente ao escrever.
            NENHUM TEXTO PESQUISADO DEVE SER COPIADO.

            --- DIRETRIZES EDITORIAIS ---
            ${robotGuidelines}
            -----------------------------
            
            --- APRENDIZADO DO EDITOR ---
            ${robotFeedback.liked.length > 0 ? `TÓPICOS APROVADOS (Priorize):\n- ${robotFeedback.liked.join('\n- ')}\n` : ''}
            ${robotFeedback.disliked.length > 0 ? `TÓPICOS REJEITADOS (Evite):\n- ${robotFeedback.disliked.join('\n- ')}\n` : ''}
            -----------------------------

            Sua tarefa é escrever uma matéria COMPLETA sobre a seguinte notícia que encontramos no portal:
            NOTÍCIA A ESCREVER: "${headline}"
            
            A matéria deve ser direta e imparcial, com no mínimo 3 parágrafos usando tags HTML (como <p>, <h2>).
            Crie um título impactante e uma linha fina (subtítulo). IMPORTANTE: O título gerado deve ser DIFERENTE do original.
            
            RETORNE EXATAMENTE UM OBJETO JSON VÁLIDO no seguinte formato (SEM MARKDOWN):
            {
              "title": "...",
              "subtitle": "...",
              "content": "...",
              "metadata": {
                "titulo_original": "${String(headline).replace(/"/g, '\\"')}",
                "fonte": "Nome do Portal / Veículo",
                "link_fonte": "Link da notícia (ou link do site)",
                "data_publicacao": "Hoje",
                "imagens_referencia": "Descreva as imagens"
              }
            }
            
            Texto bruto extraído do portal para referência dos fatos:
            ${pageText}
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
              
              if (draftObj && draftObj.title && draftObj.content) {
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
                     <h4 style="margin-top:0; margin-bottom:8px; color: #0f172a; font-size: 14px; text-transform: uppercase;">🔍 Observações do Robô para Revisão</h4>
                     <strong>Título Original:</strong> ${meta.titulo_original || 'Não informado'}<br>
                     <strong>Fonte:</strong> ${originDomain}<br>
                     <strong>Data de Publicação:</strong> ${meta.data_publicacao || 'Não informada'}<br>
                     <strong>Link Referência:</strong> <a href="${rawLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${rawLink}</a><br>
                     <strong>Imagens de Referência:</strong> ${meta.imagens_referencia || 'Nenhuma'}
                   </div>
                 `;

                 const newDraft = {
                    id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    category: robotCategory === 'todas' ? 'geral' : robotCategory,
                    categoryLabel: robotCategory === 'todas' ? 'Geral' : robotCategory.charAt(0).toUpperCase() + robotCategory.slice(1),
                    title: draftObj.title,
                    subtitle: draftObj.subtitle,
                    praca: 'Nacional',
                    sourceName: originDomain,
                    author: { name: "IA Curadora", role: `Fonte: ${originDomain}`, avatar: "https://images.unsplash.com/photo-1616161560417-66d4aba5ce44?w=150&auto=format&fit=crop&q=80" },
                    date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
                    readTime: "3 min de leitura",
                    image: `https://image.pollinations.ai/prompt/${encodeURIComponent("News photo about " + draftObj.title + ", realistic, high quality, professional photography")}?width=1200&height=1200&nologo=true`,
                    content: metaHtml + draftObj.content,
                    metadata: meta
                 };

                 setDraftData(prev => {
                    const updated = [newDraft, ...prev];
                    localStorage.setItem('portal_ng_drafts', JSON.stringify(updated));
                    return updated;
                 });

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

      setRobotStatus(`Concluído! ${totalGeneratedThisSession} matérias foram geradas e entregues uma a uma.`);
      
      setTimeout(() => {
        setIsRobotRunning(false);
        setRobotStatus('');
        setRobotProgress(null);
        setActiveTab('aprovacao');
      }, 2000);

    } catch (error) {
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

  // --- VIEWS ---
  const renderInsights = () => {
    const totalViews = newsData.reduce((acc, curr) => acc + (curr.views || 0), 0);
    
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
              0
            </div>
            <p className="text-xs text-red-100 mt-1">leitores ativos agora</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 sm:col-span-3 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-slate-500 mb-4">Visão Geral de Desempenho (Últimos 7 dias)</h3>
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
                <div className="text-2xl font-black text-red-600">+14%</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Crescimento</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Mock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Origem de Tráfego
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-600">Google Search (SEO)</span> <span className="text-slate-800">65%</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-600">Redes Sociais (Instagram/Facebook)</span> <span className="text-slate-800">20%</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: '20%' }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-600">Acesso Direto</span> <span className="text-slate-800">15%</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: '15%' }}></div></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-purple-500" /> Matérias mais acessadas
            </h3>
            <ul className="space-y-3 divide-y divide-slate-100">
              {newsData.slice().sort((a,b) => (b.views||0) - (a.views||0)).slice(0, 3).map((item, i) => (
                <li key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.categoryLabel}</p>
                  </div>
                  <div className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded shrink-0">
                    {item.views ? item.views.toLocaleString('pt-BR') : 0} views
                  </div>
                </li>
              ))}
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

          <div className="flex border-b border-slate-200 bg-slate-50 px-6">
            <button 
              onClick={() => setFormActiveTab('portal')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${formActiveTab === 'portal' ? 'border-[#d40a38] text-[#d40a38]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Portal (Site)
            </button>
            <button 
              onClick={() => setFormActiveTab('social')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${formActiveTab === 'social' ? 'border-[#d40a38] text-[#d40a38]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Redes Sociais
            </button>
          </div>

          <div className="p-6">
            <div className={formActiveTab === 'portal' ? 'block max-w-4xl mx-auto' : 'hidden'}>

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

          <form onSubmit={handleSaveForm} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Título da Manchete</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="Ex: Senado aprova nova lei..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Linha Fina (Subtítulo)</label>
              <input required type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm" placeholder="Resumo rápido da notícia" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Editoria</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm">
                  <option value="geral">Geral</option>
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
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Imagem de Capa (Upload)</label>
              <label className="flex items-center justify-center w-full bg-[#040f1d] hover:bg-slate-800 text-white px-4 py-2.5 rounded-md text-sm font-bold cursor-pointer transition-colors relative mb-2">
                {isUploadingFiles['cover'] ? 'Enviando Imagem...' : 'Fazer Upload da Capa'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, 'cover')} 
                  className="hidden" 
                  disabled={isUploadingFiles['cover']}
                />
              </label>
              {formData.image && (
                <div className="w-32 h-20 rounded-md overflow-hidden bg-slate-100">
                  <img src={formData.image} alt="Preview da Capa" className="w-full h-full object-cover" />
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
            <button type="submit" className="w-full bg-[#d40a38] hover:bg-red-700 text-white py-3 rounded-md text-sm font-bold shadow-sm transition-colors">
              {editingId ? (editingIsDraft ? 'Aprovar e Publicar Matéria' : 'Salvar Alterações') : 'Publicar Matéria Imediatamente'}
            </button>
          </form>
        </div>

            <div className={formActiveTab === 'social' ? 'block' : 'hidden'}>
              <div className="max-w-4xl mx-auto">
                <SocialPostGenerator showToast={showToast} inline={true} article={formData} metaToken={metaToken} metaFbPageId={metaFbPageId} metaIgAccountId={metaIgAccountId} imgbbKey={imgbbKey} />
              </div>
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
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {newsData.map((news) => (
                <tr key={news.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900 max-w-sm truncate" title={news.title}>{news.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Por {news.author.name}</p>
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
                    {news.date}
                  </td>
                  <td className="px-6 py-4 text-right">
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
          {authors.map((author, i) => (
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
          {authors.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhum autor cadastrado.</div>
          )}
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-w-2xl">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configurações de SEO e Gerais</h2>
          </div>
          <form onSubmit={handleSaveConfig} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Oficial do Portal</label>
              <input type="text" defaultValue="Portal NG Brasil" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Description Padrão (SEO)</label>
              <textarea rows={3} defaultValue="Portal NG Brasil - O principal veículo de jornalismo digital independente. Últimas notícias sobre Política, Turismo e Entretenimento do Brasil e do Mundo." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
              <p className="text-[10px] text-slate-500 mt-1">Essa descrição é usada pelo Google quando nenhuma notícia específica está aberta.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail de Contato da Redação</label>
              <input type="email" defaultValue="redacao@portalng.com.br" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cores e Tema</label>
              <button type="button" className="px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 font-bold rounded cursor-default">
                Jornalístico Clássico (Barlow Condensed, Azul Editorial) - Ativo
              </button>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" className="bg-[#d40a38] hover:bg-red-700 text-white transition-colors px-6 py-2 rounded-md text-sm font-bold shadow-sm">
                Salvar Alterações
              </button>
            </div>
          </form>
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
              className="w-full bg-[#d40a38] hover:bg-red-700 text-white py-3 rounded-md text-sm font-bold shadow-sm transition-colors"
            >
              Salvar Alterações e Publicar Banners
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderRobot = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-4xl">
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
        </div>

        <form onSubmit={runRobotPipeline} className="space-y-6">
          {robotActiveTab === 'curadora' && (
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg space-y-4">
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

              {!isRobotRunning && !robotStatus ? (
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all mt-4">
                  <Bot className="w-5 h-5" /> Iniciar Varredura de Notícias Agora
                </button>
              ) : (
                <div className="w-full bg-indigo-50 border border-indigo-200 rounded-lg p-6 flex flex-col items-center justify-center gap-4 mt-4">
                  {robotProgress ? (
                    <div className="w-full max-w-md space-y-4">
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
                </div>
              )}
            </div>
          )}

          {robotActiveTab === 'prompt' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <label className="block text-sm font-semibold text-slate-800 mb-1">Diretrizes Editoriais (Prompt do Robô)</label>
              <p className="text-xs text-slate-500 mb-2">Este texto será enviado para a IA como regra obrigatória de reescrita, garantindo que ela não copie notícias e siga a visão de mundo do portal.</p>
              <textarea 
                value={robotGuidelines} 
                onChange={e => setRobotGuidelines(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-slate-300 rounded-md text-sm min-h-[300px]" 
              />
              <div className="flex justify-end mt-4">
                <button 
                  type="button" 
                  onClick={() => showToast("✅ Diretrizes editoriais e regras do robô salvas com sucesso na nuvem!")}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                >
                  Salvar Diretrizes
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Key className="w-4 h-4 text-slate-500" /> Configuração de Chaves (APIs)</h4>
              <p className="text-xs text-slate-500 mb-6">Insira a chave da IA de sua preferência. O robô usará a primeira disponível e pulará as vazias. As chaves de API ficam salvas apenas no seu navegador para segurança.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Google Gemini</label>
                  <div className="flex items-center gap-2">
                    <input type="password" value={robotGeminiKey} onChange={e => setRobotGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    <button type="button" onClick={() => showToast('Chave do Gemini salva no navegador com sucesso!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors">Salvar</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ChatGPT (OpenAI)</label>
                  <div className="flex items-center gap-2">
                    <input type="password" value={robotOpenAIKey} onChange={e => setRobotOpenAIKey(e.target.value)} placeholder="sk-proj-..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    <button type="button" onClick={() => showToast('Chave do ChatGPT salva no navegador com sucesso!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors">Salvar</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Claude (Anthropic)</label>
                  <div className="flex items-center gap-2">
                    <input type="password" value={robotClaudeKey} onChange={e => setRobotClaudeKey(e.target.value)} placeholder="sk-ant-..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    <button type="button" onClick={() => showToast('Chave do Claude salva no navegador com sucesso!')} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors">Salvar</button>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Share2 className="w-4 h-4 text-slate-500" /> Integração de Redes Sociais (Meta & ImgBB)</h4>
                <p className="text-xs text-slate-500 mb-6">Insira as credenciais para postagem automática no Facebook e Instagram. O ImgBB é necessário para hospedar temporariamente a imagem para a API do Instagram.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Token de Acesso (Meta)</label>
                    <input type="password" value={metaToken} onChange={e => setMetaToken(e.target.value)} placeholder="EAAG..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Chave API ImgBB</label>
                    <input type="password" value={imgbbKey} onChange={e => setImgbbKey(e.target.value)} placeholder="0d6b..." className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
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
                   <button type="button" onClick={() => showToast('Credenciais de Redes Sociais salvas com sucesso!')} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-md transition-colors">Salvar Credenciais</button>
                </div>
              </div>
            </div>
          )}

          {robotActiveTab === 'configuracoes' && (
            <div className="border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Settings className="w-4 h-4"/> Modo Piloto Automático (Zero Clique)</h3>
              <p className="text-xs text-slate-500 mb-4">Deixe a varredura e reescrita de notícias rodando sozinha em segundo plano no intervalo que escolher.</p>
              
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
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
                  value={autoPilotHours} 
                  onChange={e => setAutoPilotHours(Number(e.target.value))}
                  disabled={!isAutoPilot}
                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value={1}>A cada 1 hora</option>
                  <option value={2}>A cada 2 horas</option>
                  <option value={4}>A cada 4 horas</option>
                  <option value={8}>A cada 8 horas</option>
                </select>

                {isAutoPilot && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded animate-pulse">
                    ● Robô Ativo no Piloto Automático
                  </span>
                )}
              </div>
            </div>
          )}

        </form>
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
                      <span className="bg-amber-100 text-amber-700 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">Revisão Pendente</span>
                      <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm flex items-center gap-1 whitespace-nowrap"><Bot className="w-2.5 h-2.5"/> Gerado por IA</span>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm whitespace-nowrap">📰 {draft.sourceName || (draft.author?.role?.replace('Fonte: ', '')) || 'Desconhecido'}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1">{draft.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">{draft.subtitle}</p>
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
                  <button onClick={() => setSocialModalArticle(draft)} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md font-bold text-xs transition-colors" title="Gerar Card no estilo Canva">
                    <Camera className="w-3.5 h-3.5" /> Arte Insta
                  </button>

                  <button onClick={() => handleEdit(draft, true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-bold text-sm transition-colors">
                    <Edit3 className="w-4 h-4" /> Revisar e Aprovar
                  </button>
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
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
        
        {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#040f1d] text-slate-300 flex flex-col shrink-0 md:h-screen sticky top-0 z-30">
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between md:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shrink-0">
              <img src="/logo/ChatGPT Image 15 de set. de 2026, 03_22_55.png" alt="Logo" className="w-full h-full object-cover rounded" onError={(e) => e.target.style.display='none'} />
            </div>
            <div>
              <span className="text-white font-bold block">Painel NG</span>
              <span className="text-[10px] text-red-400 font-semibold uppercase">Área do Jornalista</span>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Sair do Painel"
          >
            <LogOut className="w-5 h-5 shrink-0" />
          </button>
        </div>

        <nav className="flex-row md:flex-col flex md:flex-1 p-2 md:p-4 gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar border-b md:border-b-0 border-slate-800">
          <button onClick={() => {setActiveTab('insights'); setShowForm(false);}} className={getNavClass('insights') + " whitespace-nowrap"}>
            <Activity className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline md:inline">Insights (Views)</span><span className="sm:hidden">Insights</span>
          </button>
          
          <div className="hidden md:block text-[10px] font-black text-slate-600 uppercase tracking-wider mt-4 mb-1 pl-1">Automação IA</div>
          <button onClick={() => {setActiveTab('robot'); setShowForm(false);}} className={getNavClass('robot') + " whitespace-nowrap"}>
            <BrainCircuit className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline md:inline">Robô Curador</span><span className="sm:hidden">Robô</span>
          </button>
          <button onClick={() => {setActiveTab('aprovacao'); setShowForm(false);}} className={getNavClass('aprovacao') + " whitespace-nowrap"}>
            <Clock className="w-5 h-5 shrink-0" /> 
            <span className="hidden sm:inline md:inline flex-1 text-left">Fila de Aprovação</span>
            <span className="sm:hidden">Aprovação</span>
            {draftData.length > 0 && (
              <span className="bg-amber-400 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-auto">{draftData.length}</span>
            )}
          </button>

          <div className="hidden md:block text-[10px] font-black text-slate-600 uppercase tracking-wider mt-4 mb-1 pl-1">Administração</div>
          <button onClick={() => {setActiveTab('materias'); setShowForm(false);}} className={getNavClass('materias') + " whitespace-nowrap"}>
            <FileText className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline md:inline">Gestão de Matérias</span><span className="sm:hidden">Matérias</span>
          </button>
          <button onClick={() => {setActiveTab('autores'); setShowForm(false);}} className={getNavClass('autores') + " whitespace-nowrap"}>
            <Users className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline md:inline">Redação / Autores</span><span className="sm:hidden">Autores</span>
          </button>
          <button onClick={() => {setActiveTab('banners'); setShowForm(false);}} className={getNavClass('banners') + " whitespace-nowrap"}>
            <ImageIcon className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline md:inline">Banners de Patrocínio</span><span className="sm:hidden">Banners</span>
          </button>
          <button onClick={() => {setActiveTab('configuracoes'); setShowForm(false);}} className={getNavClass('configuracoes') + " whitespace-nowrap"}>
            <Settings className="w-5 h-5 shrink-0" /> <span className="hidden sm:inline md:inline">Ajustes & SEO</span><span className="sm:hidden">Ajustes</span>
          </button>
        </nav>

        <div className="hidden md:block p-4 border-t border-slate-800 mt-auto">
          <button 
            onClick={onLogout}
            className="flex items-center justify-center md:justify-start gap-3 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm sticky top-0 z-20">
          <h1 className="text-xl font-bold text-title-blue font-heading capitalize">
            {activeTab === 'insights' && 'Analytics e Desempenho'}
            {activeTab === 'materias' && (showForm ? 'Publicador' : 'Gestão de Notícias')}
            {activeTab === 'autores' && 'Equipe de Redação'}
            {activeTab === 'banners' && 'Gestão de Banners'}
            {activeTab === 'configuracoes' && 'Configurações de SEO'}
            {activeTab === 'robot' && 'Robô Jornalista (IA)'}
            {activeTab === 'aprovacao' && 'Fila de Aprovação'}
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {setActiveTab('materias'); setShowForm(true); setEditingId(null); setFormData({title:'', subtitle:'', category:'politica', praca:'Nacional', image:'', content:''});}}
              className="bg-[#d40a38] hover:bg-red-700 text-white transition-colors px-4 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
            >
              <PlusCircle className="w-4 h-4 shrink-0" /> Nova Matéria
            </button>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
          {activeTab === 'insights' && renderInsights()}
          {activeTab === 'materias' && renderMaterias()}
          {activeTab === 'autores' && renderAutores()}
          {activeTab === 'banners' && renderBanners()}
          {activeTab === 'configuracoes' && renderConfiguracoes()}
          {activeTab === 'robot' && renderRobot()}
          {activeTab === 'aprovacao' && renderApprovals()}
        </div>

        {socialModalArticle && (
          <SocialPostGenerator showToast={showToast} 
            article={socialModalArticle} 
            onClose={() => setSocialModalArticle(null)} 
            metaToken={metaToken}
            metaFbPageId={metaFbPageId}
            metaIgAccountId={metaIgAccountId}
            imgbbKey={imgbbKey}
          />
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
