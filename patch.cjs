const fs = require('fs');
const file = '/Volumes/SSD 2TB | OLLOBATO/Clientes/Portal NG Brasil/6. Portal/src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const startTag = "      const urls = robotUrls.split('\\n').map(u => u.trim()).filter(u => u.length > 5);";
const endTag = '      setTimeout(() => {';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find tags.");
  console.log("Start index:", startIndex, "End Index:", endIndex);
  process.exit(1);
}

const replacement = `      const urls = robotUrls.split('\\n').map(u => u.trim()).filter(u => u.length > 5);
      if (urls.length === 0) {
        throw new Error("Nenhum link válido encontrado.");
      }

      let totalGeneratedThisSession = 0;
      const MAX_PER_SESSION = 20;

      for (let i = 0; i < urls.length; i++) {
        if (totalGeneratedThisSession >= MAX_PER_SESSION) break;

        const targetUrl = urls[i];
        setRobotStatus(\`[\${i + 1}/\${urls.length}] Lendo portal: \${targetUrl}...\`);
        
        let pageHtml = "";
        try {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const proxyUrl = isLocalhost 
            ? \`/api/scrape?url=\${encodeURIComponent(targetUrl)}\`
            : \`/scrape.php?url=\${encodeURIComponent(targetUrl)}\`;
            
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error("A conexão com o proxy falhou");
          pageHtml = await res.text();
        } catch (err) {
          console.warn(\`Não foi possível acessar \${targetUrl}. Pulando...\`);
          continue;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(pageHtml, 'text/html');
        const scripts = doc.querySelectorAll('script, style, noscript, nav, footer, header');
        scripts.forEach(s => s.remove());
        const pageText = doc.body.innerText.replace(/\\s+/g, ' ').slice(0, 12000); 

        const maxHeadlines = Math.max(1, Math.floor(MAX_PER_SESSION / urls.length));

        setRobotStatus(\`[\${i + 1}/\${urls.length}] Mapeando manchetes disponíveis...\`);

        const headlinesPrompt = \`
          Identifique as \${maxHeadlines} notícias MAIS RECENTES (OBRIGATORIAMENTE AS NOTÍCIAS DE HOJE) que aparecem neste texto.
          
          RETORNE APENAS UM ARRAY JSON VÁLIDO com os títulos originais dessas notícias (strings).
          Exemplo: ["Título da notícia 1", "Título da notícia 2"]
          
          Texto do portal:
          \${pageText}
        \`;

        let headlines = [];
        let errorMessages = [];
        
        const callAI = async (prompt) => {
           let generatedText = null;
           if (robotGeminiKey.trim()) {
             try {
               const geminiRes = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${robotGeminiKey.trim()}\`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } })
               });
               if (!geminiRes.ok) throw new Error("Gemini Falhou");
               const geminiData = await geminiRes.json();
               generatedText = geminiData.candidates[0].content.parts[0].text;
             } catch (e) { errorMessages.push("Gemini: "+e.message); }
           }
           if (!generatedText && robotOpenAIKey.trim()) {
             try {
               const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${robotOpenAIKey.trim()}\` },
                 body: JSON.stringify({ model: 'gpt-4o-mini', response_format: { type: "json_object" }, messages: [{ role: 'user', content: prompt }] })
               });
               if (!openAIRes.ok) throw new Error("ChatGPT Falhou");
               const openAIData = await openAIRes.json();
               generatedText = openAIData.choices[0].message.content;
             } catch (e) { errorMessages.push("ChatGPT: "+e.message); }
           }
           if (!generatedText && robotClaudeKey.trim()) {
             try {
               const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'x-api-key': robotClaudeKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                 body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
               });
               if (!claudeRes.ok) throw new Error("Claude Falhou");
               const claudeData = await claudeRes.json();
               generatedText = claudeData.content[0].text;
             } catch (e) { errorMessages.push("Claude: "+e.message); }
           }
           if (!generatedText) throw new Error("Todas as APIs falharam: " + errorMessages.join(" | "));
           return generatedText;
        };

        try {
           const headText = await callAI(headlinesPrompt);
           const cleanH = headText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
           headlines = JSON.parse(cleanH);
           if (!Array.isArray(headlines)) {
             if (headlines.manchetes) headlines = headlines.manchetes;
             else headlines = [];
           }
        } catch(e) {
           console.warn("Falha ao buscar manchetes", e);
           continue;
        }

        for (let j = 0; j < headlines.length; j++) {
           if (totalGeneratedThisSession >= MAX_PER_SESSION) break;

           const headline = headlines[j];
           setRobotStatus(\`[\${totalGeneratedThisSession + 1}/\${MAX_PER_SESSION}] Escrevendo matéria: "\${String(headline).substring(0, 40)}..."\`);

           const promptArticle = \`
            Você é um jornalista sênior editor-chefe escrevendo para o Portal NG Brasil.
            Abaixo estão as DIRETRIZES EDITORIAIS E DE TOM DE VOZ do nosso portal. Você DEVE ler e aplicar essas diretrizes estritamente ao escrever.
            NENHUM TEXTO PESQUISADO DEVE SER COPIADO.

            --- DIRETRIZES EDITORIAIS ---
            \${robotGuidelines}
            -----------------------------
            
            --- APRENDIZADO DO EDITOR ---
            \${robotFeedback.liked.length > 0 ? \`TÓPICOS APROVADOS (Priorize):\\n- \${robotFeedback.liked.join('\\n- ')}\\n\` : ''}
            \${robotFeedback.disliked.length > 0 ? \`TÓPICOS REJEITADOS (Evite):\\n- \${robotFeedback.disliked.join('\\n- ')}\\n\` : ''}
            -----------------------------

            Sua tarefa é escrever uma matéria COMPLETA sobre a seguinte notícia que encontramos no portal:
            NOTÍCIA A ESCREVER: "\${headline}"
            
            A matéria deve ser direta e imparcial, com no mínimo 3 parágrafos usando tags HTML (como <p>, <h2>).
            Crie um título impactante e uma linha fina (subtítulo). IMPORTANTE: O título gerado deve ser DIFERENTE do original.
            
            Responda EXATAMENTE e APENAS no formato JSON válido abaixo (UM ÚNICO OBJETO):
            {
              "title": "...",
              "subtitle": "...",
              "content": "...",
              "metadata": {
                "titulo_original": "\${String(headline).replace(/"/g, '\\\\"')}",
                "fonte": "Nome do Portal / Veículo",
                "link_fonte": "Link da notícia (ou link do site)",
                "data_publicacao": "Hoje",
                "imagens_referencia": "Descreva as imagens"
              }
            }
            
            Texto bruto extraído do portal para referência dos fatos:
            \${pageText}
           \`;

           try {
              const articleText = await callAI(promptArticle);
              const cleanA = articleText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
              const draftObj = JSON.parse(cleanA);
              
              if (draftObj && draftObj.title && draftObj.content) {
                 const meta = draftObj.metadata || {};
                 let rawLink = meta.link_fonte || targetUrl;
                 if (rawLink && !rawLink.startsWith('http')) {
                   rawLink = 'https://' + rawLink;
                 }

                 const metaHtml = \`
                   <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 16px; border-radius: 4px; font-family: sans-serif; font-size: 13px; color: #334155; margin-bottom: 24px;">
                     <h4 style="margin-top:0; margin-bottom:8px; color: #0f172a; font-size: 14px; text-transform: uppercase;">🔍 Observações do Robô para Revisão</h4>
                     <strong>Título Original:</strong> \${meta.titulo_original || 'Não informado'}<br>
                     <strong>Fonte:</strong> \${meta.fonte || 'Não identificada'}<br>
                     <strong>Data de Publicação:</strong> \${meta.data_publicacao || 'Não informada'}<br>
                     <strong>Link Referência:</strong> <a href="\${rawLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">\${rawLink}</a><br>
                     <strong>Imagens de Referência:</strong> \${meta.imagens_referencia || 'Nenhuma'}
                   </div>
                 \`;

                 const newDraft = {
                    id: \`draft-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
                    category: 'geral',
                    categoryLabel: 'Geral',
                    title: draftObj.title,
                    subtitle: draftObj.subtitle,
                    praca: 'Nacional',
                    sourceName: meta.fonte || new URL(targetUrl).hostname,
                    author: { name: "IA Curadora", role: \`Fonte: \${new URL(targetUrl).hostname}\`, avatar: "https://images.unsplash.com/photo-1616161560417-66d4aba5ce44?w=150&auto=format&fit=crop&q=80" },
                    date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
                    readTime: "3 min de leitura",
                    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80",
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

      setRobotStatus(\`Concluído! \${totalGeneratedThisSession} matérias foram geradas e entregues uma a uma.\`);
      
`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, newContent, 'utf8');
console.log("Patched successfully");
