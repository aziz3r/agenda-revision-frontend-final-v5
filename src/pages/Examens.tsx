import './styles/Examens.css'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { deleteExam, fetchExams, setPage } from '../redux/slices/examensSlice'
import { Link } from 'react-router-dom'

export default function Examens() {
  const d = useAppDispatch()
  const { items, page, pageSize, pageCount, loading, error } = useAppSelector(s => s.examens)

  useEffect(() => { d(fetchExams({ page, pageSize })) }, [d, page, pageSize])

  return (
    <section className="card">
      <div className="card-header">
        <strong>Examens</strong>
        <Link to="/examens/add" className="btn brand">+ Ajouter</Link>
      </div>
      <div className="card-body">
        {loading && <p className="small">Chargement…</p>}
        {error && <p className="small" role="alert">Erreur: {error}</p>}
        <div style={{ overflowX:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>IDExam</th><th>Référence</th><th>Nom</th><th>Date</th><th>Poids</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(ex => (
                <tr key={ex.id}>
                  <td>{ex.id}</td>
                  <td>{ex.idexam}</td>
                  <td>{ex.examReference ? <span className="badge-ref">{ex.examReference}</span> : '—'}</td>
                  <td>{ex.nom}</td>
                  <td>{ex.date ? new Date(ex.date).toLocaleString() : '—'}</td>
                  <td>{ex.poids ?? '—'}</td>
                  <td className="actions">
                    <div className="controls">
                      <Link className="btn" to={`/examens/${ex.id}/edit`}>Éditer</Link>
                      <button className="btn danger" onClick={() => d(deleteExam(ex.id))}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav className="controls" style={{ justifyContent:'center', marginTop:10 }}>
          <button className="btn" onClick={()=>d(setPage(Math.max(1, page-1)))} disabled={page===1}>◀️ Précédent</button>
          <span className="small">Page {page} / {pageCount}</span>
          <button className="btn" onClick={()=>d(setPage(Math.min(pageCount, page+1)))} disabled={page===pageCount}>Suivant ▶️</button>
        </nav>
      </div>
    </section>
  )
}
