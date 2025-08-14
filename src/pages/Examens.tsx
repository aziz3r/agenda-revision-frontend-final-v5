import './styles/Examens.css'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { deleteExam, fetchExams, setPage } from '../redux/slices/examensSlice'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Examens() {
  const { t } = useTranslation()
  const d = useAppDispatch()
  const { items, page, pageSize, pageCount, loading, error } = useAppSelector(s => s.examens)

  useEffect(() => { d(fetchExams({ page, pageSize })) }, [d, page, pageSize])

  return (
    <section className="card">
      <div className="card-header">
        <strong>{t('examens.title')}</strong>
        <Link to="/examens/add" className="btn brand">{t('examens.addLabel')}</Link>
      </div>
      <div className="card-body">
        {loading && <p className="small">{t('common.loading')}</p>}
        {error && <p className="small" role="alert">{t('common.error')}: {error}</p>}
        <div style={{ overflowX:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('examens.cols.id')}</th>
                <th>{t('examens.cols.idexam')}</th>
                <th>{t('examens.cols.ref')}</th>
                <th>{t('examens.cols.name')}</th>
                <th>{t('examens.cols.date')}</th>
                <th>{t('examens.cols.weight')}</th>
                <th>{t('examens.cols.actions')}</th>
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
                      <Link className="btn" to={`/examens/${ex.documentId}/edit`}>{t('actions.edit')}</Link>
                      {/* ✅ Seule ligne modifiée : utiliser documentId pour Strapi v5 */}
                      <button className="btn danger" onClick={() => d(deleteExam(ex.documentId))}>{t('actions.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav className="controls" style={{ justifyContent:'center', marginTop:10 }}>
          <button className="btn" onClick={()=>d(setPage(Math.max(1, page-1)))} disabled={page===1}>◀️ {t('actions.prev')}</button>
          <span className="small">{t('examens.page_of', { page, pageCount })}</span>
          <button className="btn" onClick={()=>d(setPage(Math.min(pageCount, page+1)))} disabled={page===pageCount}>{t('actions.next')} ▶️</button>
        </nav>
      </div>
    </section>
  )
}
