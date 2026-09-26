export const initialNews = [
  {
    id: "pol-01",
    category: "politica",
    categoryLabel: "Política",
    title: "Congresso aprova novo marco para investimentos em energias renováveis e infraestrutura",
    subtitle: "Medida visa atrair R$ 80 bilhões em capital privado para o setor de energia solar e eólica na região Nordeste até 2030.",
    praca: "Nacional",
    author: {
      name: "Mariana Alencar",
      role: "Analista de Política em Brasília",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    date: "22 de Setembro, 2026",
    readTime: "5 min de leitura",
    image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=1200&auto=format&fit=crop&q=80",
    isFeatured: true,
    isTrending: true,
    views: 0,
    tags: ["Brasília", "Economia", "Sustentabilidade", "Congresso"],
    highlights: [
      "Votação foi concluída com 384 votos favoráveis na Câmara.",
      "Criação do Fundo Verde de Transição Energética com subsídios para pequenas e médias empresas.",
      "Previsão de geração de mais de 120 mil empregos diretos e indiretos."
    ],
    content: [
      "Em uma sessão histórica concluída no final da noite em Brasília, o Congresso Nacional aprovou por ampla maioria o projeto de lei que estabelece o Novo Marco Regulatório de Energias Renováveis. A proposta prevê incentivos fiscais e desburocratização no licenciamento de parques eólicos e complexos solares.",
      "Segundo economistas e analistas do setor, a nova legislação coloca o Brasil em posição de destaque global para a transição energética e atração de fundos soberanos internacionais.",
      "O ministro da Economia ressaltou que a segurança jurídica oferecida pelo texto final foi decisiva para que gigantes multinacionais já anunciassem pré-acordos de investimento."
    ],
    comments: [
      { id: "c1", user: "Carlos Eduardo", text: "Excelente avanço para o setor produtivo e sustentável do nosso país!", time: "Há 15 min" }
    ]
  },
  {
    id: "pra-ap-01",
    category: "turismo",
    categoryLabel: "Turismo",
    title: "Amapá: Ecoturismo e rota dos rios ganham destaque internacional no Parque do Tumucumaque",
    subtitle: "Expedições guiadas no Amapá atraem pesquisadores e turistas em busca de contato com a floresta amazônica intocada.",
    praca: "Amapá",
    author: {
      name: "João Pedro Amapá",
      role: "Correspondente Regional em Macapá",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    date: "22 de Setembro, 2026",
    readTime: "6 min de leitura",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&auto=format&fit=crop&q=80",
    isFeatured: false,
    isTrending: true,
    views: 0,
    tags: ["Amapá", "Macapá", "Amazônia", "Tumucumaque", "Ecoturismo"],
    highlights: [
      "Aumento de 50% na busca por roteiros ecológicos no Amapá.",
      "Fortalecimento do artesanato local em Capim Dourado e cerâmica Maracá.",
      "Incentivos estaduais para pousadas sustentáveis na região de Oiapoque e Santana."
    ],
    content: [
      "O estado do Amapá consolida sua posição como uma das fronteiras ecológicas mais fascinantes da Amazônia. O Parque Nacional das Montanhas do Tumucumaque, maior unidade de conservação de floresta tropical do planeta, vem atraindo ecoturistas do mundo inteiro.",
      "Partindo de Macapá, os visitantes vivem uma imersão pela biodiversidade amazônica, com navegações por rios caudalosos, observação de espécies raras de aves e encontros com a gastronomia típica à base de tucupi, jiquitaia e peixes locais.",
      "O governo estadual e entidades do setor aprovaram um plano de infraestrutura turística que inclui novas passarelas suspensas e centro de apoio ao visitante."
    ],
    comments: [
      { id: "cap1", user: "Aline Santana", text: "Orgulho imenso do nosso Amapá se destacar no turismo ecológico!", time: "Há 25 min" }
    ]
  },
  {
    id: "pra-gr-01",
    category: "turismo",
    categoryLabel: "Turismo",
    title: "Rio Grande do Sul: Festival de Inverno e Gastronomia bate recorde de reservas na Serra Gaúcha",
    subtitle: "Gramado e Canela celebram ocupação hoteleira de 95% com novidades na Rota dos Vinhos e fondue artesanal.",
    praca: "Rio Grande do Sul",
    author: {
      name: "Camila Hoffmann",
      role: "Correspondente na Serra Gaúcha",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    date: "22 de Setembro, 2026",
    readTime: "5 min de leitura",
    image: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&auto=format&fit=crop&q=80",
    isFeatured: false,
    isTrending: true,
    views: 0,
    tags: ["Gramado", "Canela", "Serra Gaúcha", "Vinhos", "Gastronomia"],
    highlights: [
      "Mais de 300 mil visitantes esperados durante a temporada de eventos.",
      "Degustações de rótulos premiados no Vale dos Vinhedos.",
      "Espetáculos culturais e iluminação temática no centro de Gramado."
    ],
    content: [
      "Com o clima frio típico da Serra Gaúcha e paisagens encantadoras, o Rio Grande do Sul registra uma das movimentações turísticas mais intensas dos últimos anos.",
      "Além da tradicional gastronomia de fondues e galetos, os turistas desfrutam da programação cultural do Festival de Cinema e dos passeios pelas colônias rurais em Canela e Linha Bonita.",
      "A infraestrutura de transporte e passeios panorâmicos de maria-fumaça reforça o apelo de Gramado como o principal polo turístico do Sul do Brasil."
    ],
    comments: [
      { id: "cgr1", user: "Matheus Silveira", text: "Gramado em setembro é simplesmente maravilhoso!", time: "Há 1 hora" }
    ]
  },
  {
    id: "ent-01",
    category: "entretenimento",
    categoryLabel: "Entretenimento",
    title: "Festival Internacional de Cinema Celebra o Cinema Brasileiro com Estreias Exclusivas",
    subtitle: "Mostra reúne produções premiadas no circuito europeu, destaques de animação e homenagens a grandes nomes.",
    praca: "Nacional",
    author: {
      name: "Gabriel Siqueira",
      role: "Crítico de Cinema & Cultura Pop",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    },
    date: "21 de Setembro, 2026",
    readTime: "4 min de leitura",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
    isFeatured: false,
    isTrending: false,
    views: 0,
    tags: ["Cinema", "Cultura", "Filmes", "Arte"],
    highlights: [
      "Exibição de mais de 150 longas e curtas-metragens.",
      "Sessões gratuitas ao ar livre.",
      "Masterclasses com diretores renomados."
    ],
    content: [
      "A nova edição do Festival Internacional de Cinema abriu suas portas com aplausos de pé para produções brasileiras originais. O evento atrai cineastas e amantes da arte de todos os cantos do país."
    ],
    comments: []
  },
  {
    id: "pol-ap-02",
    category: "politica",
    categoryLabel: "Política",
    title: "Amapá: Governo estadual anuncia pacote de incentivos para a bioeconomia e agricultura familiar",
    subtitle: "Projeto prevê linhas de crédito para pequenos produtores e fortalecimento do Porto de Santana.",
    praca: "Amapá",
    author: {
      name: "João Pedro Amapá",
      role: "Correspondente Regional em Macapá",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    date: "21 de Setembro, 2026",
    readTime: "4 min de leitura",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
    isFeatured: false,
    isTrending: false,
    views: 0,
    tags: ["Amapá", "Economia", "Bioeconomia", "Santana", "Macapá"],
    highlights: [
      "Aporte de R$ 120 milhões para projetos de extração sustentável de açaí e óleos vegetais.",
      "Modernização logística da orla de Macapá e porto hidroviário."
    ],
    content: [
      "O desenvolvimento sustentável do Amapá ganhou um novo capítulo com a sanção do Pacote da Bioeconomia. O plano garante financiamento com juros reduzidos para cooperativas que atuam no manejo do açaí e produtos do extrativismo."
    ],
    comments: []
  },
  {
    id: "ent-gr-02",
    category: "entretenimento",
    categoryLabel: "Entretenimento",
    title: "Rio Grande do Sul: Orquestra da Serra Gaúcha apresenta concerto especial de primavera",
    subtitle: "Apresentação ao ar livre no Palácio dos Festivais reúne clássicos da música erudita e canções populares.",
    praca: "Rio Grande do Sul",
    author: {
      name: "Camila Hoffmann",
      role: "Correspondente na Serra Gaúcha",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    date: "20 de Setembro, 2026",
    readTime: "4 min de leitura",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80",
    isFeatured: false,
    isTrending: false,
    views: 0,
    tags: ["Gramado", "Música", "Cultura", "Serra Gaúcha"],
    highlights: [
      "Entrada franca com arrecadação de alimentos para entidades locais.",
      "Participação especial de solistas gaúchos."
    ],
    content: [
      "A cultura da Serra Gaúcha ganhou destaque no concerto de abertura da temporada de primavera em Gramado. Moradores e turistas lotaram o entorno do Palácio dos Festivais para acompanhar a apresentação."
    ],
    comments: []
  }
];

export const tickerItems = [
  "NOTÍCIAS GERAIS: Portal NG Brasil lança oficialmente coberturas dedicadas ao Amapá e Rio Grande do Sul.",
  "AMAPÁ: Ecoturismo no Parque do Tumucumaque atinge recorde de expedições sustentáveis.",
  "GRAMADO: Temporada de Inverno e Gastronomia registra 95% de ocupação na Serra Gaúcha.",
  "POLÍTICA: Congresso aprova novo marco para investimentos em infraestrutura e energias limpas.",
  "CULTURA: Mostras gratuitas marcam início do Festival Internacional de Cinema."
];

export const regionalPracas = [
  "Todas",
  "Nacional",
  "Amapá",
  "Rio Grande do Sul",
  "Norte",
  "Nordeste",
  "Centro-Oeste",
  "Sudeste",
  "Sul"
];

export const weatherCities = [
  { city: "Macapá", temp: "30°C", icon: "☀️", text: "Ensolarado" },
  { city: "Gramado", temp: "16°C", icon: "🌤️", text: "Fresco" },
  { city: "Brasília", temp: "27°C", icon: "☀️", text: "Ensolarado" },
  { city: "São Paulo", temp: "22°C", icon: "⛅", text: "Nublado" },
  { city: "Rio de Janeiro", temp: "29°C", icon: "🌤️", text: "Claro" }
];

export const currencyRates = [
  { pair: "USD/BRL", val: "R$ 5,42", change: "+0.15%", positive: true },
  { pair: "EUR/BRL", val: "R$ 6,05", change: "-0.08%", positive: false },
  { pair: "IBOVESPA", val: "134.850 pts", change: "+0.45%", positive: true }
];
