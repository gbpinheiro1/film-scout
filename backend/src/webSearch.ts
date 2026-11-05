export interface WebResult {
  title: string
  url: string
  content: string
}

const apiKey = process.env.TAVILY_API_KEY
if (!apiKey) {
  throw new Error("TAVILY_API_KEY não definida.")
}

async function tavilySearch(
  query: string,
  maxResults = 6,
): Promise<WebResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
  })

  if (!res.ok) {
    throw new Error(`Tavily falhou: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { results: WebResult[] }
  return data.results ?? []
}

export async function searchMany(queries: string[]): Promise<WebResult[]> {
  const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q)))

  const byUrl = new Map<string, WebResult>()
  for (const s of settled) {
    if (s.status !== "fulfilled") {
      console.warn("Busca falhou:", s.reason)
      continue
    }
    for (const r of s.value) {
      if (!byUrl.has(r.url)) {
        byUrl.set(r.url, { ...r, content: r.content.slice(0, 800) })
      }
    }
  }
  return [...byUrl.values()]
}
