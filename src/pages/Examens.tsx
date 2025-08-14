import './styles/Examens.css'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { deleteExam, fetchExams, setPage } from '../redux/slices/examensSlice'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAuth } from '../auth'
import { api } from '../api/client'

// Nom du champ relation Exam -> Élève dans ton schéma
const EXAM_TO_ELEVES_FIELD = 'eleves'  // adapte si ton champ est "eleve" (singulier)

export default function Examens() {
  const { t } = useTranslation()
  const d = useAppDispatch()
  const { items, page, pageSize, pageCount, loading, error } = useAppSelector(s => s.examens)

  const [relKey, setRelKey] = useState<string | null>(EXAM_TO_ELEVES_FIELD)

  useEffect(() => {
    (async () => {
      const userId = getAuth()?.user?.id
      if (!userId) return

      // On essaye "eleves" puis "eleve" si besoin (évite l’erreur "Invalid key …")
      const CANDIDATES = [EXAM_TO_ELEVES_FIELD, 'eleve']

      let validKey: string | null = null
      for (const key of CANDIDATES) {
        try {
          await api.get('/api/exams', {
            params: {
              filters: { [key]: { user: { id: { $eq: userId } } } },
              fields: ['id'], pagination: { page: 1, pageSize: 1 }
            }
          })
          validKey = key
          break
        } catch (e: any) {
          const msg = e?.response?.data?.error?.message || ''
          if (e?.response?.status === 400 && /Invalid key/i.test(msg)) continue
          // autre erreur -> on s’arrête, le thunk affichera l’erreur
          validKey = key
          break
        }
      }
      setRelKey(validKey ?? EXAM_TO_ELEVES_FIELD)
    })()
  }, [])

  useEffect(() => {
    const userId = getAuth()?.user?.id
    if (!userId || !relKey) return
    // 👉 On passe le filtre au thunk (voir patch du slice ci-dessous)
    d(fetchExams({
      page,
      pageSize,
      filters: { [relKey]: { user: { id: { $eq: userId } } } }
    }))
  }, [d, page, pageSize, relKey])

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
