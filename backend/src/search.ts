import { GoogleGenAI } from "@google/genai"
import type { Project } from "./project.js"
import { categoriesByStage } from "./project.js"
import { opportunityJsonSchema, opportunitySchema } from "./schema.js"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não definida.")
}

const ai = new GoogleGenAI({ apiKey })

export async function searchOpportunities(project: Project) {
  const categories = categoriesByStage[project.stage]
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  const prompt = `Você pesquisa oportunidades audiovisuais brasileiras para o projeto especificado abaixo.
Data atual: ${today}.
Projeto: ${project.title}; formato: ${project.format};
gênero: ${project.genre}; etapa: ${project.stage};
localização: ${project.location}.
Categorias permitidas: ${categories.join(", ")}.
Encontre até 10 oportunidades reais com inscrições abertas hoje.
Priorize páginas oficiais. Não invente nomes, datas ou URLs.
Não inclua inscrições comprovadamente encerradas.
Não faça análise aprofundada de elegibilidade.
Datas em YYYY-MM-DD; ausências como null.
Retorne array vazio se não houver resultados.
Use REPORTED_OPEN quando houver evidência de abertura;
caso contrário use UNVERIFIED.`

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseJsonSchema: opportunityJsonSchema,
    },
  })

  const text = response.text
  if (!text) throw new Error("Gemini não retornou conteúdo.")

  return opportunitySchema.parse(JSON.parse(text))
}
