export type Examen = {
  id: number
  idexam: string        // requis dans ton Strapi v5
  nom: string
  date: string | null
  poids: number | null
  examReference?: string | null
  documentId: string ;
  // pas de 'matiere' côté Exam (relation manyWay côté Matiere)
  type?: 'controle' | 'partiel' | 'final' | string
}
