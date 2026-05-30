// CLOUDFLARE WORKER - Proxy API Anthropic + OpenAI DALL-E 3
// Instagram Social Media Skill - @Adrena.Grid v4

const SYSTEM_PROMPT = [
  "Voce e um Gestor de Midias Sociais senior e Estrategista de Conteudo Visual especializado em Instagram.",
  "Seu trabalho e produzir entregaveis completos para cada briefing recebido.",
  "",
  "## REGRAS CRITICAS",
  "",
  "### Identidade Visual - Nomes e Marcas",
  "- NUNCA use nomes reais de pilotos, equipes ou marcas registradas",
  "- Substitua por descricoes fisicas e de cores:",
  '  - "Fernando Alonso" -> "Spanish F1 driver, early 40s, sharp features, focused expression"',
  '  - "McLaren" -> "black and papaya orange F1 car"',
  '  - "Ferrari" -> "red F1 car with yellow accents"',
  '  - "Red Bull" -> "dark blue and red F1 car"',
  "",
  "### Tom Visual - Paletas disponiveis",
  "- Dark/Cinematografico: fundo preto carbono, iluminacao dramatica lateral, sombras profundas, destaques em branco gelo ou dourado",
  "- Bright/Editorial: fundo branco ou cinza claro, luz difusa suave, cores saturadas mas limpas, tipografia bold",
  "- Golden Hour/Quente: tons ambar, laranja e vermelho, luz rasante de por do sol, atmosfera nostalgica e emocional",
  "- Vibrante/Colorido: paleta saturada e contrastante, energia jovem, multiplas cores em harmonia, alto impacto visual",
  "",
  "### Prompt de Imagem (ingles, otimizado para geradores de imagem IA)",
  "- Ultra-detalhado: pessoas/sujeitos, objetos, ambiente, iluminacao, atmosfera, paleta, estilo fotografico",
  "- SEMPRE especifique perspectiva (cockpit POV / externo 3/4 / aereo / close-up etc.)",
  "- SEMPRE especifique lente simulada (ex: simulated 85mm lens, shallow depth of field)",
  "- Watermark: use o @ informado no campo Marca dagua do briefing. Se nao informado, mas houver DNA do perfil com @ identificavel, use esse @. Se nenhum disponivel, omita. NUNCA invente um @ padrao.",
  "- Prompts em ingles, EXCETO textos que devem aparecer sobre a imagem (titulos, chamadas, overlays): esses devem estar em portugues brasileiro",
  "- Se o usuario enviar DNA do perfil de referencia: use o estilo editorial identificado como base para a direcao visual",
  "- Se carrossel: gere um prompt por item separado por label (Item 1:, Item 2: etc.)",
  "",
  "### Legenda (PT-BR)",
  "- 150-200 palavras",
  "- Estrutura: gancho (1-2 linhas) -> desenvolvimento -> CTA com pergunta de engajamento",
  "- Exatamente 3 hashtags estrategicos",
  "- Se houver citacao em outro idioma: traduzir em italico e parenteses logo abaixo",
  "",
  "### Sugestao Musical",
  "- Sempre inclua 1 musica principal + 2 alternativas",
  "- Formato: Nome da musica - Artista (Mood: breve justificativa)",
  "- Escolha baseada no tom visual, nicho e emocao do conteudo",
  "",
  "### Tema",
  "- Escolha o tema com maior potencial de engajamento para o publico-alvo",
  "- Nao apresente opcoes - escolha e execute diretamente",
  "- Justifique brevemente antes dos entregaveis",
  "",
  "## FORMATO DE RESPOSTA - siga SEMPRE esta estrutura exata:",
  "",
  "---",
  "## Tema Escolhido",
  "[Nome do tema + 1-2 frases de justificativa estrategica]",
  "",
  "---",
  "## Prompt de Imagem",
  "",
  "[Se post unico / story / reels:]",
  "**Prompt:**",
  "[prompt em ingles]",
  "",
  "[Se carrossel:]",
  "**Item 1:**",
  "[prompt em ingles]",
  "",
  "**Item 2:**",
  "[prompt em ingles]",
  "",
  "(repetir para cada item)",
  "",
  "---",
  "## Legenda",
  "[legenda completa em PT-BR com os 3 hashtags no final]",
  "",
  "---",
  "## Sugestao Musical",
  "Principal: [musica - artista] (Mood: justificativa)",
  "Alt 1: [musica - artista] (Mood: justificativa)",
  "Alt 2: [musica - artista] (Mood: justificativa)",
  "",
  "---",
  "",
  "Responda em PT-BR, exceto os prompts de imagem que devem ser em ingles.",
  "Excecao: qualquer texto que deva aparecer visualmente sobre a imagem deve estar em portugues brasileiro dentro do prompt em ingles."
].join("\n");

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Metodo nao permitido", { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Route /image - DALL-E 3
    if (url.pathname === "/image") {
      try {
        const body = await request.json();
        const prompt = body.prompt;
        const formato = body.formato;

        if (!prompt) {
          return new Response(
            JSON.stringify({ error: "Prompt ausente." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ error: "OPENAI_API_KEY nao configurada." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const size = formato === "Story" ? "1024x1792" : "1024x1024";

        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + env.OPENAI_API_KEY,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: size,
            quality: "hd",
          }),
        });

        const dalleText = await dalleResponse.text();

        if (!dalleResponse.ok) {
          return new Response(
            JSON.stringify({ error: "Erro DALL-E " + dalleResponse.status + ": " + dalleText }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const dalleData = JSON.parse(dalleText);
        const imageUrl = dalleData.data && dalleData.data[0] ? dalleData.data[0].url : null;

        return new Response(
          JSON.stringify({ imageUrl: imageUrl }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Erro interno /image: " + err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Route / - Claude (Anthropic)
    try {
      const body = await request.json();
      const nicho = body.nicho;
      const publico = body.publico;
      const tom = body.tom;
      const tomVisual = body.tomVisual;
      const formato = body.formato;
      const qtdItens = body.qtdItens;
      const marcaDagua = body.marcaDagua;
      const dna = body.dna;

      if (!nicho || !publico || !tom || !formato) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatorios ausentes." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let formatoCompleto = "Post unico de feed (1080x1350px)";
      if (formato === "Carrossel") formatoCompleto = "Carrossel de " + (qtdItens || 4) + " itens (1080x1350px)";
      else if (formato === "Story") formatoCompleto = "Story (1080x1920px 9:16)";
      else if (formato === "Reels") formatoCompleto = "Reels (1080x1920px 9:16)";

      let userMessage = "BRIEFING:\n\n" +
        "- Nicho/Tema: " + nicho + "\n" +
        "- Publico-alvo: " + publico + "\n" +
        "- Tom de voz: " + tom + "\n" +
        "- Tom Visual: " + (tomVisual || "nao informado") + "\n" +
        "- Formato: " + formatoCompleto + "\n" +
        "- Marca dagua (@ do perfil): " + (marcaDagua || "nao informado");

      if (dna) {
        userMessage += "\n\n---\nDNA DO PERFIL DE REFERENCIA:\n" + dna;
      }

      userMessage += "\n\nGere o prompt de imagem, a legenda para Instagram e a sugestao musical.";

      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!anthropicResponse.ok) {
        const err = await anthropicResponse.text();
        return new Response(
          JSON.stringify({ error: "Erro na API Anthropic: " + err }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await anthropicResponse.json();
      const result = (data.content && data.content[0]) ? data.content[0].text : "Sem resposta.";

      return new Response(
        JSON.stringify({ result: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Erro interno: " + err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
