import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useFirebaseSync, useFirebaseDoc, migrateLocalStorageToFirebase } from './hooks/useFirebaseSync';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import TickerBar from './components/TickerBar';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import RegionalFilter from './components/RegionalFilter';
import CategorySection from './components/CategorySection';
import InteractivePoll from './components/InteractivePoll';
import ArticleModal from './components/ArticleModal';
import SavedArticlesModal from './components/SavedArticlesModal';
import NewsletterModal from './components/NewsletterModal';
import Footer from './components/Footer';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import LinksPage from './components/LinksPage';
import ApprovalPage from './components/ApprovalPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import { 
  initialNews, 
  tickerItems, 
  weatherCities, 
  currencyRates, 
  regionalPracas 
} from './data/newsData';

import { Landmark, Compass, Film, SearchX, Cpu, HeartPulse, Newspaper, Loader2, ShieldAlert } from 'lucide-react';


const generateSlug = (text) => {
  if (!text) return '';
  return text.toString().toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/[\s_-]+/g, "-") // replace spaces and underscores with dash
    .replace(/^-+|-+$/g, ""); // remove leading/trailing dashes
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        // On successful login, trigger migration if needed
        migrateLocalStorageToFirebase();
      } else {
        setIsLoggedIn(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync News & Banners with Firebase
  const [newsDataRaw, setNewsData, isNewsLoading] = useFirebaseSync('news', initialNews);
  const [banners, setBanners, isBannersLoading] = useFirebaseSync('banners', [{ id: Date.now(), active: false, image: '', link: '' }]);
  const [siteSettings] = useFirebaseDoc('settings', 'global', {
    siteSlogan: localStorage.getItem('portal_ng_site_slogan') || 'As notícias que impactam o país e o mundo.',
    siteName: localStorage.getItem('portal_ng_site_name') || 'Portal NG Brasil'
  });
  const currentSlogan = siteSettings?.siteSlogan || localStorage.getItem('portal_ng_site_slogan') || 'As notícias que impactam o país e o mundo.';
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const activeBanners = banners.filter(b => b.active && b.image);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Apply fallback formatting (legacy logic) and normalize author
  const newsData = newsDataRaw.map(item => {
    let author = item.author;
    if (!author || typeof author !== 'object') {
      author = {
        name: typeof author === 'string' && author ? author : 'Redação Portal NG',
        role: 'Jornalismo',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
      };
    } else {
      author = {
        name: author.name || 'Redação Portal NG',
        role: author.role || 'Jornalismo',
        avatar: author.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
      };
    }

    return {
      ...item,
      author,
      praca: typeof item.praca === 'string' ? item.praca.replace(/^Praça\s+/i, '') : (item.praca || 'Nacional'),
    };
  }).sort((a, b) => {
    const getTimestamp = (id) => {
      if (typeof id === 'number') return id;
      if (typeof id === 'string') {
        const match = id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      }
      return 0;
    };
    return getTimestamp(b.id) - getTimestamp(a.id);
  }); // Default sort descending by ID/Date

  // Roteamento Simples com persistência para evitar login toda hora
  
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith("/painel") && location.pathname !== "/painel/login";
  const isLoginView = location.pathname === "/painel/login";
  const isTermsView = location.pathname === "/termos";
  const isPrivacyView = location.pathname === "/privacidade";
  const isLinksView = location.pathname === "/links" || location.pathname === "/bio";
  const isMediaKitView = location.pathname === "/midia-kit" ||
                         location.pathname === "/midiakit" ||
                         location.pathname === "/insights" ||
                         new URLSearchParams(location.search).has('midiakit') ||
                         location.hash.includes('midia-kit') ||
                         location.hash.includes('insights');
  const isApprovalView = location.pathname.startsWith("/aprovacao") || 
                         location.pathname.startsWith("/revisao") || 
                         location.pathname.startsWith("/aprovar") ||
                         new URLSearchParams(location.search).has('aprovacao') ||
                         location.hash.includes('aprovacao');

  const VALID_CATEGORIES = ['brasil', 'policial', 'politica', 'tecnologia', 'saude', 'turismo', 'entretenimento', 'geral', 'economia'];

  const getCategoryFromPath = (pathname) => {
    if (!pathname) return 'all';
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'all';
    const first = segments[0].toLowerCase();
    if (VALID_CATEGORIES.includes(first)) {
      return first;
    }
    return 'all';
  };

  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const fromPath = getCategoryFromPath(window.location.pathname);
      if (fromPath !== 'all') return fromPath;
      const saved = sessionStorage.getItem('portal_ng_active_category');
      if (saved && VALID_CATEGORIES.includes(saved)) return saved;
    } catch(e) {}
    return 'all';
  });

  const [selectedPraca, setSelectedPraca] = useState(() => {
    try {
      return sessionStorage.getItem('portal_ng_selected_praca') || 'Todas';
    } catch(e) {
      return 'Todas';
    }
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch(e) {
      return '';
    }
  });

  const [selectedArticle, setSelectedArticle] = useState(null);

  // Sincroniza categoria e praça com a sessão para persistir em F5/atualizações
  useEffect(() => {
    try {
      sessionStorage.setItem('portal_ng_selected_praca', selectedPraca);
    } catch(e) {}
  }, [selectedPraca]);

  useEffect(() => {
    try {
      const fromPath = getCategoryFromPath(location.pathname);
      if (fromPath !== 'all') {
        setActiveCategory(fromPath);
        sessionStorage.setItem('portal_ng_active_category', fromPath);
      } else if (location.pathname === '/' && !selectedArticle) {
        setActiveCategory('all');
        sessionStorage.setItem('portal_ng_active_category', 'all');
      }
    } catch(e) {}
  }, [location.pathname, selectedArticle]);

  // Salva rota atual na sessão para restaurar em caso de recarga do navegador (F5)
  useEffect(() => {
    try {
      const full = location.pathname + location.search + location.hash;
      if (location.pathname && location.pathname !== '/' && !location.pathname.includes('/login')) {
        sessionStorage.setItem('portal_ng_last_route', full);
      }
    } catch(e) {}
  }, [location.pathname, location.search, location.hash]);

  // Se o navegador recarregar e o servidor entregar '/', restaura a página/aba onde o usuário estava
  useEffect(() => {
    if (location.pathname === '/' && !location.search && !location.hash) {
      try {
        const isReload = window.performance && (
          (window.performance.navigation && window.performance.navigation.type === 1) ||
          window.performance.getEntriesByType('navigation')?.[0]?.type === 'reload'
        );
        const savedRoute = sessionStorage.getItem('portal_ng_last_route');
        if (isReload && savedRoute && savedRoute !== '/' && !savedRoute.includes('/login')) {
          console.log("Restaurando página após atualização F5:", savedRoute);
          navigate(savedRoute, { replace: true });
        }
      } catch(e) {}
    }
  }, []);

  // Sync URL with selected article for unique links
  useEffect(() => {
    let materiaId = new URLSearchParams(location.search).get('materia');
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    if (!materiaId && lastPart) {
      if (lastPart.includes('-news-')) {
        materiaId = 'news-' + lastPart.split('-news-').pop();
      } else if (lastPart.startsWith('news-')) {
        materiaId = lastPart;
      }
    }
    
    if (!isNewsLoading) {
      let found = null;
      if (materiaId) {
        found = newsData.find(n => String(n.id) === String(materiaId));
      }
      
      // Fallback infalível: procura qualquer artigo cujo ID seja exatamente o final da URL
      if (!found && lastPart) {
        found = newsData.find(n => lastPart === String(n.id) || lastPart.endsWith(`-${String(n.id)}`));
      }

      if (found) {
        setSelectedArticle(found);
        if (found.category && VALID_CATEGORIES.includes(found.category.toLowerCase())) {
          setActiveCategory(found.category.toLowerCase());
        }
      } else if (selectedArticle) {
        setSelectedArticle(null);
      }
    }
  }, [newsData, isNewsLoading, location.pathname, location.search]);

  // Real-time Presence Tracking
  useEffect(() => {
    if (isAdminView) return; // Don't track admin panel views
    
    let sessionId = sessionStorage.getItem('ng_session');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('ng_session', sessionId);
    }

    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'active_sessions', sessionId), {
          last_active: serverTimestamp(),
          path: location.pathname
        });
      } catch (err) {
        // ignore errors silently
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // update every 30s

    return () => clearInterval(interval);
  }, [location.pathname, isAdminView]);

  // Handle opening an article and updating the URL
  const handleOpenArticle = async (article) => {
    if (article.id) {
      try {
        const articleRef = doc(db, 'news', String(article.id));
        await updateDoc(articleRef, { views: increment(1) });
      } catch (err) { console.error("Error updating views", err); }
    }
    setSelectedArticle(article);
    navigate(`/${article.category}/${generateSlug(article.title)}-${article.id}`);
  };

  // Handle closing an article
  const handleCloseArticle = () => {
    setSelectedArticle(null);
    if (activeCategory !== "all") {
      navigate(`/${activeCategory}`);
    } else {
      navigate("/");
    }
  };
  
  // Bookmarks (saved articles)
  const [savedArticleIds, setSavedArticleIds] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_ng_saved');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [fontSize, setFontSize] = useState(1);

  // --- SEO Effect: Update Document Title & Metadata dynamically ---
  useEffect(() => {
    const baseUrl = 'https://portalngbrasil.com.br';
    
    // Configurações base de Título
    let currentTitle = `Portal NG Brasil | ${currentSlogan}`;
    if (isAdminView) {
      currentTitle = 'Painel Admin | Portal NG Brasil';
    } else if (selectedArticle) {
      currentTitle = `${selectedArticle.title} | Portal NG Brasil`;
    } else if (searchQuery) {
      currentTitle = `Busca: ${searchQuery} | Portal NG Brasil`;
    } else if (activeCategory !== 'all') {
      const catLabel = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
      currentTitle = `${catLabel} - Últimas Notícias | Portal NG Brasil`;
    }
    document.title = currentTitle;

    // Helpers para injeção no <head>
    const setMeta = (name, content, attribute = 'name') => {
      let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setLink = (rel, href) => {
      let link = document.head.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    const setSchema = (schemaObj) => {
      let script = document.head.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schemaObj);
    };

    // URL Canônica (Evita conteúdo duplicado no Google)
    const currentUrl = selectedArticle ? `${baseUrl}/materia/${selectedArticle.id}` : baseUrl;
    setLink('canonical', currentUrl);

    // Regras de Indexação Genéricas
    setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('description', selectedArticle ? (selectedArticle.subtitle || selectedArticle.title) : `Portal NG Brasil - ${currentSlogan}`);

    // Open Graph (Facebook, WhatsApp, LinkedIn)
    setMeta('og:title', currentTitle, 'property');
    setMeta('og:description', selectedArticle ? selectedArticle.subtitle : currentSlogan, 'property');
    setMeta('og:url', currentUrl, 'property');
    setMeta('og:type', selectedArticle ? 'article' : 'website', 'property');
    setMeta('og:site_name', 'Portal NG Brasil', 'property');
    setMeta('og:locale', 'pt_BR', 'property');
    if (selectedArticle?.image) setMeta('og:image', selectedArticle.image, 'property');

    // Twitter Cards
    setMeta('twitter:card', 'summary_large_image', 'property');
    setMeta('twitter:title', currentTitle, 'property');
    setMeta('twitter:description', selectedArticle ? selectedArticle.subtitle : currentSlogan, 'property');
    if (selectedArticle?.image) setMeta('twitter:image', selectedArticle.image, 'property');

    // Schema.org (Dados Estruturados para Rich Snippets no Google Notícias)
    if (selectedArticle) {
      setSchema({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "mainEntityOfPage": { "@type": "WebPage", "@id": currentUrl },
        "headline": selectedArticle.title,
        "image": [selectedArticle.image],
        "datePublished": new Date().toISOString(),
        "author": {
            "@type": "Person",
            "name": selectedArticle.author?.name || "Redação Portal NG"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Portal NG Brasil",
          "logo": { "@type": "ImageObject", "url": `${baseUrl}/logo.png` }
        }
      });
    } else {
      setSchema({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Portal NG Brasil",
        "url": baseUrl,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${baseUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      });
    }

    // Google Analytics Virtual Page View Tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: currentTitle,
        page_location: currentUrl,
        page_path: selectedArticle ? `/materia/${selectedArticle.id}` : (isAdminView ? '/admin' : '/')
      });
    }
  }, [selectedArticle, activeCategory, searchQuery]);

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem('portal_ng_saved', JSON.stringify(savedArticleIds));
  }, [savedArticleIds]);

  const toggleBookmark = (article) => {
    if (savedArticleIds.includes(article.id)) {
      setSavedArticleIds(savedArticleIds.filter(id => id !== article.id));
    } else {
      setSavedArticleIds([...savedArticleIds, article.id]);
    }
  };

  const isBookmarked = (id) => savedArticleIds.includes(id);

  const removeSaved = (id) => {
    setSavedArticleIds(savedArticleIds.filter(item => item !== id));
  };

  // Filter news logic using global newsData state
  const filteredNews = newsData.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesPraca = selectedPraca === 'Todas' || item.praca === selectedPraca || item.praca === 'Nacional';
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesPraca && matchesSearch;
  });

  const featuredNews = filteredNews[0];
  const trendingNews = filteredNews.filter(n => n.id !== featuredNews?.id);

  const policialArticles = filteredNews.filter(n => n.category === 'policial');
  const politicaArticles = filteredNews.filter(n => n.category === 'politica');
  const turismoArticles = filteredNews.filter(n => n.category === 'turismo');
  const entretenimentoArticles = filteredNews.filter(n => n.category === 'entretenimento');
  const saudeArticles = filteredNews.filter(n => n.category === 'saude');
  const tecnologiaArticles = filteredNews.filter(n => n.category === 'tecnologia');
  const brasilArticles = filteredNews.filter(n => n.category === 'geral' || n.category === 'brasil');

  const savedArticlesList = newsData.filter(n => savedArticleIds.includes(n.id));
  
  // Acessos do dia (Soma real das matérias do banco de dados)
  const totalViews = newsData.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const displayDailyViews = totalViews.toLocaleString('pt-BR');

  // Renderização Condicional de Rotas
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#006644] animate-spin mb-4" />
        <p className="text-slate-600 font-medium font-heading">Carregando segurança do Portal NG...</p>
      </div>
    );
  }

  if (isLoginView) {
    if (isLoggedIn) {
      return <Navigate to="/painel" replace />;
    }
    return <Login onLogin={() => navigate('/painel')} onNavigateHome={() => navigate('/')} />;
  }

  if (isAdminView) {
    const isDevPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('dev') === '1';
    if (!isLoggedIn && !isDevPreview) {
      return <Navigate to="/painel/login" replace />;
    }

    return (
      <AdminDashboard 
        onLogout={async () => {
          await signOut(auth);
          navigate('/');
        }} 
        newsData={newsData}
        setNewsData={setNewsData}
        banners={banners}
        setBanners={setBanners}
      />
    );
  }

  // Página de Aprovação de Matéria (Prévia & Redes Sociais)
  if (isApprovalView) {
    return <ApprovalPage onNavigateHome={() => navigate('/')} />;
  }

  // Página de Links (Linktree / Bio)
  if (isLinksView) {
    return <LinksPage />;
  }

  // Dashboard Comercial & Mídia Kit Ao Vivo (Instagram Graph API)
  if (isMediaKitView) {
    return <AnalyticsDashboard isPublicMediaKit={true} onNavigateHome={() => navigate('/')} />;
  }

  // Seção Institucional: Termos de Serviço e Privacidade
  if (isTermsView || isPrivacyView) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-slate-900 transition-colors duration-300">
        <TickerBar 
          tickerItems={tickerItems}
          weatherCities={weatherCities}
          currencyRates={currencyRates}
          savedCount={savedArticleIds.length}
          dailyViews={displayDailyViews}
          onOpenSavedModal={() => setIsSavedModalOpen(true)}
          fontSize={fontSize}
          setFontSize={setFontSize}
        />
        <Header 
          activeCategory={activeCategory}
          setActiveCategory={(cat) => {
            setActiveCategory(cat);
            navigate(cat === "all" ? "/" : `/${cat}`);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenNewsletter={() => setIsNewsletterOpen(true)}
          selectedPraca={selectedPraca}
          setSelectedPraca={setSelectedPraca}
          onNavigateLogin={() => navigate("/painel/login")}
          slogan={currentSlogan}
          onGoHome={() => {
            setSelectedArticle(null);
            navigate("/");
          }}
        />
        <main className="flex-1 w-full bg-slate-50">
          {isTermsView && <TermsOfService />}
          {isPrivacyView && <PrivacyPolicy />}
        </main>
        <Footer 
          setActiveCategory={(cat) => {
            setActiveCategory(cat);
            navigate(cat === "all" ? "/" : `/${cat}`);
          }}
          setSelectedPraca={setSelectedPraca}
        />
      </div>
    );
  }

  // --- PORTAL PÚBLICO ---
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 transition-colors duration-300">
      
      {/* Top Ticker & Utility Controls */}
      <TickerBar 
        tickerItems={tickerItems}
        weatherCities={weatherCities}
        currencyRates={currencyRates}
        savedCount={savedArticleIds.length}
        dailyViews={displayDailyViews}
        onOpenSavedModal={() => setIsSavedModalOpen(true)}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />

      {/* Main Brand Header & Navigation */}
      <Header 
        activeCategory={activeCategory}
        setActiveCategory={(cat) => {
          setActiveCategory(cat);
          navigate(cat === "all" ? "/" : `/${cat}`);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenNewsletter={() => setIsNewsletterOpen(true)}
        selectedPraca={selectedPraca}
        setSelectedPraca={setSelectedPraca}
        onNavigateLogin={() => navigate("/painel/login")}
        slogan={currentSlogan}
        onGoHome={() => {
          setSelectedArticle(null);
          navigate("/");
        }}
      />

      {/* Ad Space (Sponsor placeholder or Actual Banners) */}
      <div className="w-full border-b border-slate-200 relative overflow-hidden">
        {activeBanners.length > 0 ? (
          <div className="w-full relative">
            <div className="flex transition-transform duration-700 ease-in-out w-full" style={{ transform: `translateX(-${activeBannerIndex * 100}%)` }}>
              {activeBanners.map((banner, index) => (
                <div key={banner.id || index} className="w-full shrink-0 flex justify-center">
                  <a 
                    href={banner.link || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full h-[120px] md:h-[180px] lg:h-[220px] flex items-center justify-center overflow-hidden hover:opacity-95 transition-opacity"
                    title="Clique para saber mais"
                  >
                    <img 
                      src={banner.image} 
                      alt={`Banner de Patrocínio ${index + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </a>
                </div>
              ))}
            </div>
            {/* Dots */}
            {activeBanners.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                {activeBanners.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveBannerIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === activeBannerIndex ? "bg-white scale-125" : "bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div 
            className="w-full h-[120px] md:h-[180px] lg:h-[220px] bg-slate-100 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-slate-200 transition-colors"
            title="Espaço para Banner"
          >
            <div className="text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50 group-hover:opacity-80 transition-opacity">
              Banner Publicitário
            </div>
          </div>
        )}
      </div>

      {/* Main Body Layout */}
      <main className={`flex-1 w-full mx-auto ${selectedArticle ? 'px-0 py-0 sm:py-8 sm:px-4' : 'max-w-7xl px-4 py-8'}`}>
        
        {selectedArticle ? (
          <ArticleModal 
            article={selectedArticle}
            onClose={handleCloseArticle}
            onToggleBookmark={toggleBookmark}
            isBookmarked={isBookmarked}
            fontSize={fontSize}
          />
        ) : (
          <>
            {/* Regional Filter Bar */}
            <RegionalFilter 
              regionalPracas={regionalPracas}
              selectedPraca={selectedPraca}
              setSelectedPraca={setSelectedPraca}
            />

            {/* If no search match */}
            {filteredNews.length === 0 ? (
              <div className="text-center py-16 space-y-4 bg-white rounded-2xl border border-slate-200 p-8 my-8 shadow-sm">
                <SearchX className="w-16 h-16 text-slate-400 mx-auto" />
                <h3 className="text-xl font-bold font-heading text-title-blue">
                  Nenhuma notícia encontrada para essa busca
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Tente utilizar outros termos de busca ou selecione "Todas" as praças regionais e editorias.
                </p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedPraca('Todas'); setActiveCategory('all'); }}
                  className="btn-emerald px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Limpar Filtros e Ver Todas as Notícias
                </button>
              </div>
            ) : (
              <>
                {/* Show Hero Featured only if in 'all' tab or featured item matches search */}
                {activeCategory === 'all' && searchQuery === '' && selectedPraca === 'Todas' && (
                  <HeroSection 
                    featuredNews={featuredNews}
                    trendingNews={trendingNews}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}


                {/* Interactive Reader Poll */}
                {activeCategory === 'all' && searchQuery === '' && (
                  <div className="my-8">
                    <InteractivePoll />
                  </div>
                )}

                {/* Category Section: Brasil (Geral) */}
                {(activeCategory === 'all' || activeCategory === 'brasil') && brasilArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="brasil"
                    title="Brasil & Cotidiano"
                    subtitle="Acontecimentos em tempo real, economia, educação e o dia a dia do brasileiro."
                    icon={Newspaper}
                    articles={brasilArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}

                {/* Category Section: Policial */}
                {(activeCategory === 'all' || activeCategory === 'policial') && policialArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="policial"
                    title="Policial & Segurança"
                    subtitle="Ocorrências policiais, operações de segurança pública, investigações e prestação de serviço."
                    icon={ShieldAlert}
                    articles={policialArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}

                {/* Category Section: Política */}
                {(activeCategory === 'all' || activeCategory === 'politica') && politicaArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="politica"
                    title="Política & Governo"
                    subtitle="Acompanhamento dos bastidores de Brasília, projetos no Congresso, economia e decisões."
                    icon={Landmark}
                    articles={politicaArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}

                {/* Category Section: Tecnologia */}
                {(activeCategory === 'all' || activeCategory === 'tecnologia') && tecnologiaArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="tecnologia"
                    title="Tecnologia & Inovação"
                    subtitle="Lançamentos, inteligência artificial, mercado tech e ciências."
                    icon={Cpu}
                    articles={tecnologiaArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}

                {/* Category Section: Saúde */}
                {(activeCategory === 'all' || activeCategory === 'saude') && saudeArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="saude"
                    title="Saúde & Bem-estar"
                    subtitle="Medicina, saúde pública, dicas de bem-estar e novidades científicas."
                    icon={HeartPulse}
                    articles={saudeArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}

                {/* Category Section: Turismo */}
                {(activeCategory === 'all' || activeCategory === 'turismo') && turismoArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="turismo"
                    title="Turismo & Destinos"
                    subtitle="Roteiros paradisíacos no Brasil, ecoturismo, dicas de hospedagem, aviação e gastronomia regional."
                    icon={Compass}
                    articles={turismoArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}

                {/* Category Section: Entretenimento */}
                {(activeCategory === 'all' || activeCategory === 'entretenimento') && entretenimentoArticles.length > 0 && (
                  <CategorySection 
                    categoryKey="entretenimento"
                    title="Entretenimento & Cultura"
                    subtitle="Cinema, festivais de música, artes plásticas, bastidores da TV, streaming e produções nacionais."
                    icon={Film}
                    articles={entretenimentoArticles}
                    onSelectArticle={handleOpenArticle}
                    onToggleBookmark={toggleBookmark}
                    isBookmarked={isBookmarked}
                  />
                )}
              </>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <Footer 
        setActiveCategory={(cat) => {
          setActiveCategory(cat);
          navigate(cat === "all" ? "/" : `/${cat}`);
        }}
        setSelectedPraca={setSelectedPraca}
      />

      {/* Saved Bookmarks Modal */}
      {isSavedModalOpen && (
        <SavedArticlesModal 
          savedArticles={savedArticlesList}
          onClose={() => setIsSavedModalOpen(false)}
          onSelectArticle={handleOpenArticle}
          onRemoveSaved={removeSaved}
        />
      )}

      {/* Newsletter Modal */}
      {isNewsletterOpen && (
        <NewsletterModal 
          onClose={() => setIsNewsletterOpen(false)}
        />
      )}

    </div>
  );
}
