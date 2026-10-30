export type ProjectStage =
  | "PRE_PRODUCTION"
  | "PRODUCTION"
  | "POST_PRODUCTION"
  | "FINISHED"

export interface Project {
  title: string
  format: string
  genre: string
  stage: ProjectStage
  location: string
}

export const project1: Project = {
  title: "A Última Sessão",
  format: "Curta-metragem",
  genre: "Terror",
  stage: "PRE_PRODUCTION",
  location: "São Paulo, Brasil",
}

export const categoriesByStage: Record<ProjectStage, string[]> = {
  PRE_PRODUCTION: [
    "Editais de desenvolvimento audiovisual",
    "Concursos de roteiro",
  ],
  PRODUCTION: ["Editais de produção audiovisual", "Concursos de roteiro"],
  POST_PRODUCTION: [
    "Editais de pós-produção audiovisual",
    "Concursos de roteiro",
    "Mostras e festivais audiovisuais",
  ],
  FINISHED: ["Concursos de roteiro", "Mostras e festivais audiovisuais"],
}
