const fs = require('fs');
const file = '/Volumes/SSD 2TB | OLLOBATO/Clientes/Portal NG Brasil/6. Portal/src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find where to insert callAI and errorMessages (before the for loop)
const loopStart = "      for (let i = 0; i < urls.length; i++) {";
const callAIDef = `        let headlines = [];
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
        };`;

// Replace callAIDef from inside the loop
let newContent = content.replace(callAIDef, "        let headlines = [];");

// Insert callAI before the loop
const newCallAIDef = `      let errorMessages = [];
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

      for (let i = 0; i < urls.length; i++) {`;

newContent = newContent.replace(loopStart, newCallAIDef);
fs.writeFileSync(file, newContent, 'utf8');
console.log("Patched 2 successfully");
