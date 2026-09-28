import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useFirebaseSync, migrateLocalStorageToFirebase } from './hooks/useFirebaseSync';
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
import WeatherMapWidget from './components/WeatherMapWidget';

import { 
  initialNews, 
  tickerItems, 
  weatherCities, 
  currencyRates, 
  regionalPracas 
} from './data/newsData';

import { Landmark, Compass, Film, SearchX, Cpu, HeartPulse, Newspaper, Loader2 } from 'lucide-react';


const generateSlug = (text) => {
  return text.toString().toLowerCase().trim()
    .replace(/[^ws-]/g, "")
    .replace(/[s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  // Apply fallback formatting (legacy logic)
  const newsData = newsDataRaw.map(item => ({
    ...item,
    praca: typeof item.praca === 'string' ? item.praca.replace(/^Praça\s+/i, '') : item.praca,
    title: typeof item.title === 'string' ? item.title.replace(/^Praça\s+/i, '') : item.title
  })).sort((a, b) => b.id - a.id); // Default sort descending by ID/Date

  // Roteamento Simples com persistência para evitar login toda hora
  
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith("/painel") && location.pathname !== "/painel/login";
  const isLoginView = location.pathname === "/painel/login";
  

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPraca, setSelectedPraca] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Sync URL with selected article for unique links
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const materiaId = urlParams.get('materia');
      
      if (materiaId && !isNewsLoading) {
        const found = newsData.find(n => String(n.id) === String(materiaId));
        if (found) {
          setSelectedArticle(found);
          setCurrentView('portal'); // Ensure we are not in admin if reading
        }
      } else if (!materiaId && selectedArticle) {
        setSelectedArticle(null);
      }
    };

    // Run on mount and when news data loads
    handleUrlChange();

    // Listen to browser back/forward buttons
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [newsData, isNewsLoading]);

  // Handle opening an article and updating the URL
  const handleOpenArticle = (article) => {
    setSelectedArticle(article);
    navigate(`/${article.category}/${generateSlug(article.title)}-${article.id}`);
  };

  // Handle closing an article
  const handleCloseArticle = () => {
    setSelectedArticle(null);
    if (activeCategory !== all) {
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
    let currentTitle = 'Portal NG Brasil | Notícias em Política, Turismo e Entretenimento';
    if (currentView === 'admin') {
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
    setMeta('description', selectedArticle ? (selectedArticle.subtitle || selectedArticle.title) : "Portal NG Brasil - O principal veículo de jornalismo digital independente.");

    // Open Graph (Facebook, WhatsApp, LinkedIn)
    setMeta('og:title', currentTitle, 'property');
    setMeta('og:description', selectedArticle ? selectedArticle.subtitle : "Jornalismo independente.", 'property');
    setMeta('og:url', currentUrl, 'property');
    setMeta('og:type', selectedArticle ? 'article' : 'website', 'property');
    setMeta('og:site_name', 'Portal NG Brasil', 'property');
    setMeta('og:locale', 'pt_BR', 'property');
    if (selectedArticle?.image) setMeta('og:image', selectedArticle.image, 'property');

    // Twitter Cards
    setMeta('twitter:card', 'summary_large_image', 'property');
    setMeta('twitter:title', currentTitle, 'property');
    setMeta('twitter:description', selectedArticle ? selectedArticle.subtitle : "Portal NG Brasil", 'property');
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
        page_path: selectedArticle ? `/materia/${selectedArticle.id}` : (currentView === 'admin' ? '/admin' : '/')
      });
    }
  }, [selectedArticle, activeCategory, searchQuery, currentView]);

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

  const featuredNews = filteredNews.find(n => n.isFeatured) || filteredNews[0];
  const trendingNews = filteredNews.filter(n => n.id !== featuredNews?.id);

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

  if (currentView === 'login') {
    if (isLoggedIn) {
      setCurrentView('admin');
      return null; // Will re-render immediately
    }
    return <Login onLogin={() => setCurrentView('admin')} onNavigateHome={() => setCurrentView('portal')} />;
  }

  if (currentView === 'admin') {
    if (!isLoggedIn) {
      setCurrentView('login');
      return null;
    }

    return (
      <AdminDashboard 
        onLogout={async () => {
          await signOut(auth);
          setCurrentView('portal');
        }} 
        newsData={newsData}
        setNewsData={setNewsData}
        banners={banners}
        setBanners={setBanners}
      />
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
        onNavigateLogin={() => setCurrentView('login')}
      />

      {/* Ad Space (Sponsor placeholder or Actual Banners) */}
      <div className="w-full bg-slate-50 border-b border-slate-200 py-4 px-4 flex flex-col items-center gap-4">
        {banners.filter(b => b.active && b.image).length > 0 ? (
          banners.filter(b => b.active && b.image).map((banner, index) => (
            <a 
              key={banner.id || index}
              href={banner.link || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full w-full max-w-7xl h-[90px] md:h-[120px] rounded-xl flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity shrink-0"
              title="Clique para saber mais"
            >
              <img 
                src={banner.image} 
                alt={`Banner de Patrocínio ${index + 1}`} 
                className="w-full h-full object-cover" 
              />
            </a>
          ))
        ) : (
          <div 
            className="w-full w-full max-w-7xl h-[90px] md:h-[120px] bg-slate-200 border-2 border-slate-300 border-dashed rounded-xl flex items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-slate-300 transition-colors"
            title="Espaço para Banner"
          >
            <div className="text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50 group-hover:opacity-80 transition-opacity">
              Banner 728x90
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

                {/* Weather Map Widget */}
                {activeCategory === 'all' && searchQuery === '' && selectedPraca === 'Todas' && (
                  <div className="my-8">
                    <WeatherMapWidget />
                  </div>
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
                    subtitle="Acontecimentos em tempo real, economia, educação, polícia e o dia a dia do brasileiro."
                    icon={Newspaper}
                    articles={brasilArticles}
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
