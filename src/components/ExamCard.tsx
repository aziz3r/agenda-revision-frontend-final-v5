import type { Examen } from '../types/Examen'

export default function ExamCard({ exam }: { exam: Examen }) {
  return (
    <div className="card" style={{ padding:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <strong>{exam.nom}</strong>
        <span className="small">{exam.date ? new Date(exam.date).toLocaleString() : '—'}</span>
      </div>
      <div className="small">Poids: {exam.poids ?? '—'} – Réf: {exam.examReference ?? '—'}</div>
    </div>
  )
}
