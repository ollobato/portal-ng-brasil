const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.fetchPerplexityNews = onSchedule({
  schedule: "every 30 minutes",
  timeoutSeconds: 300,
  memory: "512MiB",
  secrets: ["PERPLEXITY_API_KEY"]
}, async (event) => {
  console.log("Iniciando busca agendada de notícias do Perplexity...");

  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
  
  if (!PERPLEXITY_API_KEY) {
    console.error("A variável de ambiente/secret PERPLEXITY_API_KEY não está definida.");
    return;
  }

  const robotCategory = "assuntos gerais do Brasil e do mundo";
  const robotGuidelines = `A estruturação do Portal NG Brasil como um veículo de comunicação de viés conservador (centro-direita), com a sofisticação da Forbes e o dinamismo da CNN, exige um posicionamento de marca que transmita autoridade inquestionável. O segredo para não tornar a linha ideológica "escancarada" ou panfletária é ancorar o portal estritamente na qualidade técnica da informação, nos princípios éticos do jornalismo e na estética de alto valor.

1. Posicionamento de Marca: O "Centro-Direita Sofisticado"
O Portal NG Brasil não precisa gritar suas posições políticas. A linha conservadora será transmitida pela escolha das pautas, pelo enquadramento econômico e pela sobriedade na entrega.
- A Promessa: Entregar a notícia nua e crua, com análise aprofundada.
- O Tom de Voz: O Herói e O Sábio. Linguagem madura, culta, direta.
- O Slogan Invisível: Todo o material carregará o DNA da ARQA Criativa: conteúdo com base, intenção e presença.

2. Implementação do Código de Ética dos Jornalistas
- A Supremacia dos Fatos sobre a Ideologia.
- Repúdio ao Sensacionalismo.
- Transparência Comercial.
- Pluralidade e Rigor.`;

  const prompt = `Busque as 5 principais e mais recentes notícias de hoje sobre a categoria: ${robotCategory}.
Aplique rigorosamente estas diretrizes editoriais ao escrever:
${robotGuidelines}

O resultado OBRIGATORIAMENTE DEVE SER UM JSON no seguinte formato, sem nenhum texto antes ou depois:
{
  "news": [
    {
      "title": "Título impactante",
      "subtitle": "Subtítulo explicativo",
      "originalTitle": "TÍTULO ORIGINAL DA NOTÍCIA NA FONTE (obrigatório)",
      "category": "policial | politica | geral | economia | turismo | esportes | entretenimento | tecnologia | saude | mundo",
      "praca": "Local",
      "content": "Conteúdo completo em HTML (com tags <p>, <h2>, <strong>) com no mínimo 4 parágrafos.",
      "image": "URL_DE_UMA_IMAGEM_DA_NOTICIA_ENCONTRADA_OU_VAZIO",
      "source": "Nome do Portal Original",
      "url": "Link da notícia original"
    }
  ]
}`;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY.trim()}`
      },
      body: JSON.stringify({
        model: 'sonar-reasoning-pro',
        messages: [
          { role: 'system', content: 'You are a professional journalist assistant that returns ONLY raw JSON without markdown formatting. You must return a JSON object with a "news" array.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Erro na API do Perplexity:", errText);
      return;
    }

    const data = await res.json();
    let rawText = data.choices[0].message.content;
    
    // Extraindo apenas o JSON
    let text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
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

    let parsed = JSON.parse(text);
    if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
    }

    let newsArray = parsed.news;
    if (!newsArray && Array.isArray(parsed)) {
        newsArray = parsed;
    }

    if (newsArray && newsArray.length > 0) {
      let count = 0;
      for (const article of newsArray) {
        const draftObj = {
          id: Date.now() + Math.floor(Math.random() * 10000),
          title: article.title,
          subtitle: article.subtitle,
          category: article.category || 'geral',
          praca: article.praca || 'Brasil',
          content: article.content,
          image: article.image || '',
          date: new Date().toISOString(),
          views: 0,
          likes: 0,
          comments: [],
          isDraft: true,
          aiGenerated: true,
          source: article.source || 'Perplexity',
          originalUrl: article.url || '',
          originalTitle: article.originalTitle || article.original_title || ''
        };
        
        await db.collection('drafts').add(draftObj);
        count++;
      }
      console.log(`Gerou e salvou ${count} pautas com sucesso na coleção drafts.`);

      await db.collection('ai_logs').add({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        aiUsed: 'Perplexity (Nuvem)',
        generatedCount: count,
        category: robotCategory,
        status: 'success',
        details: `Nuvem: Pesquisa agendada gerou ${count} matérias.`
      });

    } else {
      console.error("Nenhuma notícia encontrada na resposta.", rawText);
      await db.collection('ai_logs').add({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        aiUsed: 'Perplexity (Nuvem)',
        generatedCount: 0,
        category: robotCategory,
        status: 'error',
        details: "Nenhuma notícia encontrada no formato JSON esperado."
      });
    }
  } catch (error) {
    console.error("Erro no fetchPerplexityNews:", error);
    await db.collection('ai_logs').add({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      aiUsed: 'Perplexity (Nuvem)',
      generatedCount: 0,
      category: robotCategory || 'N/A',
      status: 'error',
      details: error.message
    });
  }
});
