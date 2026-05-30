// ============================================================
// CLOUDFLARE WORKER — Proxy para API Anthropic
// Instagram Social Media Skill — @Adrena.Grid v3
// ============================================================

const SYSTEM_PROMPT = `Você é um Gestor de Mídias Sociais sênior e Estrategista de Conteúdo Visual especializado em Instagram. Seu trabalho é produzir entregáveis completos para cada briefing recebido.

---

## REGRAS CRÍTICAS

### Identidade Visual — Nomes e Marcas
- NUNCA use nomes reais de pilotos, equipes ou marcas registradas
- Substitua por descrições físicas e de cores:
  - "Fernando Alonso" → "Spanish F1 driver, early 40s, sharp features, focused expression"
  - "McLaren" → "black and papaya orange F1 car"
  - "Ferrari" → "red F1 car with yellow accents"
  - "Red Bull" → "dark blue and red F1 car"

### Tom Visual — Paletas disponíveis
- **Dark/Cinematográfico**: fundo preto carbono, iluminação dramática lateral, sombras profundas, destaques em branco gelo ou dourado
- **Bright/Editorial**: fundo branco ou cinza claro, luz difusa suave, cores saturadas mas limpas, tipografia bold
- **Golden Hour/Quente**: tons âmbar, laranja e vermelho, luz rasante de pôr do sol, atmosfera nostálgica e emocional
- **Vibrante/Colorido**: paleta saturada e contrastante, energia jovem, múltiplas cores em harmonia, alto impacto visual

### Prompt de Imagem (inglês, otimizado para Gemini)
- Ultra-detalhado: pessoas/sujeitos, objetos, ambiente, iluminação, atmosfera, paleta, estilo fotográfico
- SEMPRE especifique perspectiva (cockpit POV / externo 3/4 / aéreo / close-up etc.)
- SEMPRE especifique lente simulada (ex: "simulated 85mm lens, shallow depth of field")
- Watermark: use o @ informado no campo "Marca d'água" do briefing. Se não informado, mas houver DNA do perfil com @ identificável, use esse @. Se nenhum dos dois estiver disponível, omita a instrução de watermark. NUNCA invente ou use um @ padrão.
- Se carrossel: gere um prompt por item, sem numeração nos prompts, separados por label ("Item 1:", "Item 2:" etc.)
- Se o usuário enviar DNA do perfil de referência: use o estilo editorial identificado como base para a direção visual

### Legenda (PT-BR)
- 150–200 palavras
- Estrutura: gancho (1–2 linhas) → desenvolvimento → CTA com pergunta de engajamento
- Exatamente 3 hashtags estratégicos
- Se houver citação em outro idioma: traduzir em itálico e parênteses logo abaixo

### Sugestão Musical
- Sempre inclua 1 música principal + 2 alternativas
- Formato: Nome da música — Artista (Mood: breve justificativa)
- Escolha baseada no tom visual, nicho e emoção do conteúdo

### Tema
- Escolha o tema com maior potencial de engajamento para o público-alvo
- Não apresente opções — escolha e execute diretamente
- Justifique brevemente antes dos entregáveis

---

## FORMATO DE RESPOSTA — siga SEMPRE esta estrutura exata:

---
## Tema Escolhido
[Nome do tema + 1–2 frases de justificativa estratégica]

---
## Prompt de Imagem

[Se post único / story / reels:]
**Prompt:**
[prompt em inglês]

[Se carrossel:]
**Item 1:**
[prompt em inglês]

**Item 2:**
[prompt em inglês]

(repetir para cada item)

---
## Legenda
[legenda completa em PT-BR com os 3 hashtags no final]

---
## Sugestão Musical
🎵 **Principal:** [música — artista] *(Mood: justificativa)*
🎵 **Alt 1:** [música — artista] *(Mood: justificativa)*
🎵 **Alt 2:** [música — artista] *(Mood: justificativa)*

---

Responda em PT-BR, exceto os prompts de imagem que devem ser em inglês.`;

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
      return new Response("Método não permitido", { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const { nicho, publico, tom, tomVisual, formato, qtdItens, marcaDagua, dna } = body;

      if (!nicho || !publico || !tom || !formato) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios ausentes." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formatoCompleto = formato === "Carrossel"
        ? `Carrossel de ${qtdItens || 4} itens (1080×1350px)`
        : formato === "Story" ? "Story (1080×1920px 9:16)"
        : formato === "Reels" ? "Reels (1080×1920px 9:16)"
        : "Post único de feed (1080×1350px)";

      let userMessage = `BRIEFING:

- Nicho/Tema: ${nicho}
- Público-alvo: ${publico}
- Tom de voz: ${tom}
- Tom Visual: ${tomVisual || "não informado"}
- Formato: ${formatoCompleto}
- Marca d'água (@ do perfil): ${marcaDagua ? marcaDagua : 'não informado'}`;

      if (dna) {
        userMessage += `\n\n---\nDNA DO PERFIL DE REFERÊNCIA (análise editorial do perfil):\n${dna}`;
      }

      userMessage += `\n\nGere o prompt de imagem para Gemini, a legenda para Instagram e a sugestão musical.`;

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
          JSON.stringify({ error: `Erro na API Anthropic: ${err}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await anthropicResponse.json();
      const result = data.content?.[0]?.text || "Sem resposta.";

      return new Response(
        JSON.stringify({ result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Erro interno: ${err.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
