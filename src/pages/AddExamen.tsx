import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { api } from '../api/client'
import './styles/AddExamen.css'
import { useTranslation } from 'react-i18next'
import { getAuth } from '../auth'

// Candidats possibles pour le nom du champ relation côté Exam -> Élève
const REL_KEYS = ['eleves', 'eleve', 'students'] as const

type EleveRef = { docId: string; id?: number }

async function findEleveForCurrentUser(): Promise<EleveRef> {
  const auth = getAuth()
  const userId = auth?.user?.id
  const email = auth?.user?.email
  if (!userId) throw new Error('Utilisateur non connecté')

  // 1) par relation user.id
  try {
    const { data } = await api.get('/api/eleves', {
      params: {
        filters: { user: { id: { $eq: userId } } },
        fields: ['documentId','id'],
        pagination: { page: 1, pageSize: 1 }
      }
    })
    const hit = data?.data?.[0]
    const docId = hit?.documentId ?? hit?.attributes?.documentId
    const idNum = hit?.id ?? hit?.attributes?.id
    if (docId) return { docId: String(docId), id: idNum }
  } catch {/* ignore */}

  // 2) fallback par email (si pas de relation user sur Eleve)
  const { data } = await api.get('/api/eleves', {
    params: {
      filters: { email_eleve: { $eq: email } },
      fields: ['documentId','id'],
      pagination: { page: 1, pageSize: 1 }
    }
  })
  const hit = data?.data?.[0]
  const docId = hit?.documentId ?? hit?.attributes?.documentId
  const idNum = hit?.id ?? hit?.attributes?.id
  if (!docId) throw new Error("Aucun profil élève associé à l'utilisateur")
  return { docId: String(docId), id: idNum }
}

export default function AddExamen() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const [idexam, setIdexam] = useState('')
  const [nom, setNom] = useState('')
  const [date, setDate] = useState<Date | null>(null)
  const [poids, setPoids] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function tryAttach(examDocId: string, relKey: string, eleve: EleveRef) {
    // Essai 1 : connect par documentId
    try {
      await api.put(`/api/exams/${examDocId}`, {
        data: { [relKey]: { connect: [eleve.docId] } }
      })
      return true
    } catch { /* continue */ }

    // Essai 2 : connect par id numérique
    if (eleve.id) {
      try {
        await api.put(`/api/exams/${examDocId}`, {
          data: { [relKey]: { connect: [{ id: eleve.id }] } }
        })
        return true
      } catch { /* continue */ }
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!idexam || !nom || !date || isNaN(Number(poids))) {
      setError(t('addExam.form.fillAll'))
      return
    }

    const examReference = uuidv4()

    try {
      setBusy(true)

      // 1) récupérer l'élève du user connecté
      const eleve = await findEleveForCurrentUser()

      // 2) on tente la création AVEC l'attache directement (pour chaque nom de champ)
      for (const key of REL_KEYS) {
        try {
          await api.post('/api/exams', {
            data: {
              examReference,
              idexam,
              nom,
              date: date.toISOString(),
              poids: Number(poids),
              [key]: { connect: [eleve.docId] } // connect par documentId (Strapi REST)
            }
          })
          alert(t('addExam.created'))
          nav('/examens')
          return
        } catch (e: any) {
          const msg = e?.response?.data?.error?.message || ''
          // si "Invalid key <...>" => on essaie un autre nom de champ
          if (e?.response?.status === 400 && /Invalid key/i.test(msg)) continue
          // sinon on sort de la boucle pour passer en création simple + PUT
          break
        }
      }

      // 3) création simple puis attache par PUT (essaie tous les noms)
      const created = await api.post('/api/exams', {
        data: {
          examReference,
          idexam,
          nom,
          date: date.toISOString(),
          poids: Number(poids)
        }
      })
      const examDocId: string = created?.data?.data?.documentId

      let attached = false
      for (const key of REL_KEYS) {
        attached = await tryAttach(examDocId, key, eleve)
        if (attached) break
      }
      if (!attached) {
        // dernier secours : tableau direct (schémas anciens)
        for (const key of REL_KEYS) {
          try {
            await api.put(`/api/exams/${examDocId}`, {
              data: { [key]: [eleve.docId] }
            })
            attached = true
            break
          } catch { /* try next */ }
        }
      }

      if (!attached) {
        throw new Error("Examen créé mais impossible d'attacher l'élève (nom du champ ou schéma relationnel).")
      }

      alert(t('addExam.created'))
      nav('/examens')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || t('addExam.createFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="add-shell">
      <section className="card">
        <div className="card-header"><strong>➕ {t('addExam.title')}</strong></div>
        <div className="card-body">
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="fg">
              <label>{t('addExam.fields.idexam')}</label>
              <input className="input" value={idexam} onChange={e=>setIdexam(e.target.value)} required />
            </div>
            <div className="fg">
              <label>{t('addExam.fields.nom')}</label>
              <input className="input" value={nom} onChange={e=>setNom(e.target.value)} required />
            </div>
            <div className="fg">
              <label>{t('addExam.fields.date')}</label>
              <DatePicker
                selected={date}
                onChange={d => setDate(d)}
                showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText={t('addExam.fields.datePlaceholder') as string}
                className="input"
              />
            </div>
            <div className="fg">
              <label>{t('addExam.fields.poids')}</label>
              <input className="input" type="number" value={poids} onChange={e=>setPoids(e.target.value)} required />
            </div>
            <div className="actions">
              <button className="btn brand" type="submit" disabled={busy}>
                {busy ? '…' : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
