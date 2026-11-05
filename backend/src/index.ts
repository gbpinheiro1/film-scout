import "dotenv/config"
import { mkdir, writeFile } from "node:fs/promises"
import { project1 } from "./project.js"
import { searchOpportunities } from "./search.js"

async function main() {
  console.log("Pesquisando:", project1.title)
  const start = Date.now()
  const result = await searchOpportunities(project1)
  const duration = (Date.now() - start) / 1000
  console.table(
    result.opportunities.map((item) => ({
      title: item.title,
      type: item.type,
      deadline: item.deadline,
      status: item.verificationStatus,
    })),
  )
  await mkdir("results", { recursive: true })
  const filename = `results/search-${Date.now()}.json`
  await writeFile(
    filename,
    JSON.stringify({ project1, duration, results: result }, null, 2),
  )
  console.log(`Tempo: ${duration.toFixed(2)}s | Arquivo: ${filename}`)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
