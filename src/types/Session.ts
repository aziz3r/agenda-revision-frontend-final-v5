export type Session = {
  id: number
  examen: number
  debut: string
  fin: string
  statut: 'prevue' | 'terminee' | 'annulee'
}
