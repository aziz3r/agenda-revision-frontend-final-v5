import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { api } from '../api/client'
import './styles/EditExamen.css'
import { useTranslation } from 'react-i18next' // 🆕 i18n

type Examen = {
  id: number
  idexam: string
  nom: string
  date: string | null
  poids: number | null
  examReference?: string | null
  documentId: string;
}

export default function EditExamen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t } = useTranslation() // 🆕 i18n
  const [exam, setExam] = useState<Examen | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/exams/${id}`)
        setExam(data.data as Examen)
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || t('common.loadingError'))
      }
    })()
  }, [id, t])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exam) return
    try {
      setBusy(true)
      await api.put(`/api/exams/${exam.documentId}`, {
        data: {
          idexam: exam.idexam,
          nom: exam.nom,
          date: exam.date ? new Date(exam.date).toISOString() : null,
          poids: typeof exam.poids === 'number' ? exam.poids : null
        }
      })
      alert(t('editExam.updated'))
      nav('/examens')
    } catch (err:any) {
      setError(err?.response?.data?.error?.message || t('editExam.updateFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!exam) return <p className="small" style={{padding:16}}>{t('common.loading')}</p>

  return (
    <div className="edit-shell">
      <section className="card">
        <div className="card-header"><strong>{t('editExam.title', { id })}</strong></div>
        <div className="card-body">
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={save} className="form-grid">
            <div className="fg">
              <label>{t('editExam.fields.idexam')}</label>
              <input className="input" value={exam.idexam} onChange={e=>setExam({...exam, idexam: e.target.value})} required />
            </div>
            <div className="fg">
              <label>{t('editExam.fields.nom')}</label>
              <input className="input" value={exam.nom} onChange={e=>setExam({...exam, nom: e.target.value})} required />
            </div>
            <div className="fg">
              <label>{t('editExam.fields.date')}</label>
              <DatePicker
                selected={exam.date ? new Date(exam.date) : null}
                onChange={(d) => setExam({...exam, date: d ? d.toISOString() : null})}
                showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                className="input"
              />
            </div>
            <div className="fg">
              <label>{t('editExam.fields.poids')}</label>
              <input className="input" type="number"
                     value={exam.poids ?? ''} onChange={e=>setExam({...exam, poids: e.target.value===''? null : Number(e.target.value)})}/>
            </div>
            <div className="fg full">
              <label>{t('editExam.fields.referenceAuto')}</label>
              <input className="input readonly" value={exam.examReference ?? '—'} readOnly />
            </div>
            <div className="actions">
              <button className="btn brand" type="submit" disabled={busy}>{busy ? '…' : t('editExam.actions.update')}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
