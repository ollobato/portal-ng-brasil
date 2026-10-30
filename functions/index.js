const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const crypto = require("crypto");
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
exports.autoPublishScheduler = require('./automation').autoPublishScheduler;

/**
 * Endpoint HTTP seguro para publicação no X (Twitter) via Cloud Functions
 */
function buildNodeOAuth1Header(url, method, params, consumerKey, consumerSecret, token, tokenSecret) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0'
  };

  const allParams = { ...oauth, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramPairs = sortedKeys.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(allParams[k]));
  const paramString = paramPairs.join('&');

  const baseString = method.toUpperCase() + '&' + encodeURIComponent(url) + '&' + encodeURIComponent(paramString);
  const signingKey = encodeURIComponent(consumerSecret) + '&' + encodeURIComponent(tokenSecret);
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauth.oauth_signature = signature;

  const headerParts = Object.keys(oauth).sort().map(k => encodeURIComponent(k) + '="' + encodeURIComponent(oauth[k]) + '"');
  return 'OAuth ' + headerParts.join(', ');
}

exports.publishToX = onRequest({ cors: true, timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const body = req.body || {};
    const text = (body.text || '').trim();

    if (!text) {
      res.status(400).json({ success: false, error: 'O texto da publicação no X é obrigatório.' });
      return;
    }

    // Carrega credenciais do body ou do Firestore
    let apiKey = body.apiKey || body.xApiKey;
    let apiSecret = body.apiSecret || body.xApiSecret;
    let accessToken = body.accessToken || body.xAccessToken;
    let accessSecret = body.accessSecret || body.xAccessSecret;
    let bearerToken = body.bearerToken || body.xBearerToken;
    let username = (body.username || body.xUsername || 'portalngbrasil').replace(/^@/, '');

    if (!apiKey || !accessToken) {
      const globalDoc = await db.collection("settings").doc("global").get();
      if (globalDoc.exists) {
        const gData = globalDoc.data() || {};
        apiKey = apiKey || gData.xApiKey;
        apiSecret = apiSecret || gData.xApiSecret;
        accessToken = accessToken || gData.xAccessToken;
        accessSecret = accessSecret || gData.xAccessSecret;
        bearerToken = bearerToken || gData.xBearerToken;
        username = username || (gData.xUsername || 'portalngbrasi').replace(/^@/, '');
      }
    }

    apiKey = apiKey || 'teHpJ1Cmw3uXEIfWRIqRInZux';
    apiSecret = apiSecret || 'tyAAWtBNCczs84PNnYHEJTcJAPWa31MlU3JLqIaQdX3tGmigS4';
    accessToken = accessToken || '2011249028273451008-a8oG3gCPkl7JxPS7uhI7eG7feWRYbe';
    accessSecret = accessSecret || 'dCFifuYoQNfVqz32MVdj1qx8STMUeHL59h6VkAUWy8r68';
    bearerToken = bearerToken || 'AAAAAAAAAAAAAAAAAAAAALKGAAIAAAAAP98Fmf0pMDI7kWlwsrjsFU3JSLU%3DxuFdfZ65P69HQZeqAIgFLjSt2iQ7vq4pvjuGuVoKA3VJ8M0AOf';
    username = username || 'portalngbrasi';

    const hasOAuth1 = apiKey && apiSecret && accessToken && accessSecret;
    const hasOAuth2 = Boolean(bearerToken);

    if (!hasOAuth1 && !hasOAuth2) {
      res.status(401).json({
        success: false,
        error: 'Credenciais da API do X não encontradas. Configure no painel de configurações.'
      });
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'PortalNGBrasil/2.0'
    };

    if (hasOAuth1) {
      const authHeader = buildNodeOAuth1Header('https://api.twitter.com/2/tweets', 'POST', {}, apiKey, apiSecret, accessToken, accessSecret);
      headers['Authorization'] = authHeader;
    } else {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });

    const tweetData = await tweetRes.json().catch(() => ({}));

    if (tweetRes.ok && tweetData.data?.id) {
      const tweetId = tweetData.data.id;
      const permalink = `https://x.com/${username}/status/${tweetId}`;
      res.status(200).json({
        success: true,
        id: tweetId,
        url: permalink,
        data: tweetData.data
      });
      return;
    }

    res.status(tweetRes.status || 500).json({
      success: false,
      error: tweetData.detail || tweetData.title || 'Erro na API do X',
      details: tweetData
    });
  } catch (error) {
    console.error("Erro na Cloud Function publishToX:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
