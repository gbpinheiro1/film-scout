import { GoogleGenAI } from "@google/genai"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import type { Project } from "./project.ts"
import { categoriesByStage } from "./project.ts"
import { opportunityJsonSchema, opportunitySchema } from "./schema.ts"
import { searchMany } from "./webSearch.ts"
import { withRetry } from "./retry.ts"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não definida.")
}

const ai = new GoogleGenAI({ apiKey })
const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]
const CACHE_DIR = ".cache"

function getToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function buildQueries(project: Project, categories: string[], year: string) {
  const base = `${project.format} ${project.genre}`
  return [
    ...categories
      .slice(0, 5)
      .map((c) => `${c} audiovisual ${base} inscrições abertas ${year}`),
    `edital audiovisual inscrições abertas ${year} ${project.location}`,
    `editais cinema audiovisual prorrogadas inscrições ${year}`,
  ]
}

async function readCache(key: string) {
  try {
    return JSON.parse(await readFile(`${CACHE_DIR}/${key}.json`, "utf8"))
  } catch {
    return null
  }
}

async function writeCache(key: string, data: unknown) {
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(`${CACHE_DIR}/${key}.json`, JSON.stringify(data, null, 2))
}

async function generateWithFallback(prompt: string) {
  let lastError: unknown
  for (const model of MODELS) {
    try {
      return await withRetry(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: opportunityJsonSchema,
            temperature: 0.1,
          },
        }),
      )
    } catch (err: any) {
      lastError = err
      if (err.status !== 503 && err.status !== 429) throw err
      console.warn(`${model} indisponível, tentando próximo modelo...`)
    }
  }
  throw lastError
}

export async function searchOpportunities(project: Project) {
  const categories = categoriesByStage[project.stage]
  const today = getToday()
  const year = today.slice(0, 4)

  // Cache por projeto + dia: evita gastar busca/tokens repetidamente
  const cacheKey = createHash("sha1")
    .update(JSON.stringify({ project, today }))
    .digest("hex")
  const cached = await readCache(cacheKey)
  if (cached) return opportunitySchema.parse(cached)

  // 1) Busca na web
  const results = await searchMany(buildQueries(project, categories, year))
  if (results.length === 0) return { opportunities: [] }

  const sources = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n")

  // 2) Gemini só estrutura o que veio da busca
  const prompt = `Você extrai oportunidades audiovisuais brasileiras a partir de RESULTADOS DE BUSCA fornecidos abaixo.
Data atual: ${today}.
Projeto: ${project.title}; formato: ${project.format};
gênero: ${project.genre}; etapa: ${project.stage};
localização: ${project.location}.
Categorias permitidas: ${categories.join(", ")}.

Regras:
- Use APENAS informações presentes nos resultados. Não invente nomes, datas ou URLs.
- O campo de URL deve ser exatamente uma das URLs dos resultados.
- Inclua até 10 oportunidades relevantes para o projeto.
- Exclua inscrições que, pelos textos, já encerraram antes de ${today}.
- Datas em YYYY-MM-DD; informações ausentes como null.
- Use REPORTED_OPEN quando o texto indicar inscrições abertas;
  caso contrário use UNVERIFIED.
- Retorne array vazio se nada for aproveitável.

RESULTADOS:
${sources}`

  const response = await generateWithFallback(prompt)
  const text = response.text
  if (!text) throw new Error("Gemini não retornou conteúdo.")

  const parsed = opportunitySchema.parse(JSON.parse(text))

  function normalizeUrl(raw: string | null): string | null {
    if (!raw) return null
    try {
      const u = new URL(raw)
      const host = u.hostname.replace(/^www\./, "").toLowerCase()
      const path = u.pathname.replace(/\/+$/, "")
      return `${host}${path}`
    } catch {
      return null
    }
  }

  // 3) Anti-alucinação: só mantém itens cujas URLs vieram da busca
  const validUrls = new Set(
    results.map((r) => normalizeUrl(r.url)).filter(Boolean),
  )

  const safe = parsed.opportunities
    .filter((opp) => {
      const official = normalizeUrl(opp.officialUrl)
      const registration = normalizeUrl(opp.registrationUrl)
      return (
        (official && validUrls.has(official)) ||
        (registration && validUrls.has(registration))
      )
    })
    .map((opp) => ({
      ...opp,
      // zera URLs que não vieram da busca, mantendo só as verificáveis
      officialUrl:
        normalizeUrl(opp.officialUrl) &&
        validUrls.has(normalizeUrl(opp.officialUrl)!)
          ? opp.officialUrl
          : null,
      registrationUrl:
        normalizeUrl(opp.registrationUrl) &&
        validUrls.has(normalizeUrl(opp.registrationUrl)!)
          ? opp.registrationUrl
          : null,
    }))

  const output = { opportunities: safe }
  await writeCache(cacheKey, output)
  return output
}
