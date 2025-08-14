// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { api } from '../api/client'
import './styles/Dashboard.css'
import { useTranslation } from 'react-i18next'
import { getAuth } from '../auth'

type Session = {
  id: number
  documentId: string
  idsession: number
  date_debut: string
  date_fin: string
  avancement: number
  commentaire?: string
}

type Examen = {
  id: number | string
  documentId: string
  idexam: string
  nom: string
  date: string | null
  poids: number | null
  sessions?: Session[]
}

const palette = ['#E3C9B5', '#DDBAA5', '#F3E4D6', '#EAD8C8', '#DFC6B6', '#EEDBCB', '#E8D4C6']
const colorOf = (seed: number) => palette[seed % palette.length]

function normalizeExams(raw: any[]): Examen[] {
  return (raw ?? []).map((it: any) => {
    const docId = it?.documentId ?? it?.attributes?.documentId
    if (it?.attributes) {
      const a = it.attributes
      const sessions: Session[] =
        a.sessions?.data?.map((s: any) => ({
          id: s.id,
          documentId: s.documentId ?? s.attributes?.documentId,
          idsession: s.attributes?.idsession,
          date_debut: s.attributes?.date_debut,
          date_fin: s.attributes?.date_fin,
          avancement: s.attributes?.avancement,
          commentaire: s.attributes?.commentaire,
        })) ?? []
      return {
        id: it.id,
        documentId: docId,
        idexam: a.idexam,
        nom: a.nom,
        date: a.date,
        poids: a.poids,
        sessions,
      } as Examen
    }
    return it as Examen
  })
}

// util repli: vérifie si un exam appartient à l'user via la relation élève -> user
function examBelongsToUser(item: any, userId?: number) {
  if (!userId) return false
  const a = item?.attributes ?? item
  const eleves =
    a?.eleves?.data ??
    a?.eleve?.data ? [a?.eleve?.data] : [] // si relation 1–1
  if (!eleves || eleves.length === 0) return false

  return eleves.some((e: any) => {
    const user =
      e?.attributes?.user ||           // nom le plus fréquent
      e?.attributes?.users_permissions_user // selon modèle personnalisé
    const id = user?.id ?? user?.data?.id
    return Number(id) === Number(userId)
  })
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [exams, setExams] = useState<Examen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const userId = getAuth()?.user?.id
      const REL_KEYS = ['eleves', 'eleve', 'students'] // essaye plusieurs noms possibles

      const baseParams: any = {
        fields: ['documentId', 'idexam', 'nom', 'date', 'poids'],
        populate: {
          sessions: { fields: ['documentId', 'date_debut', 'date_fin'] }
        },
        pagination: { page: 1, pageSize: 100 },
        sort: ['date:asc']
      }

      // 1) Tentative: filtre côté API (meilleure perf)
      let fromServer: any[] | null = null
      let lastErr: any = null
      for (const key of REL_KEYS) {
        try {
          const { data } = await api.get('/api/exams', {
            params: {
              ...baseParams,
              filters: { [key]: { user: { id: { $eq: userId ?? '' } } } }
            }
          })
          fromServer = data?.data ?? []
          break
        } catch (e: any) {
          lastErr = e
          const msg: string = e?.response?.data?.error?.message || ''
          if (e?.response?.status === 400 && /Invalid key/i.test(msg)) {
            // mauvais nom de relation : on tente la suivante
            continue
          }
          // autre erreur (403/réseau) -> on remontera plus bas si le repli échoue
        }
      }

      // 2) Repli: récupérer + populate puis filtrer côté client par user.id
      if (!fromServer) {
        const { data } = await api.get('/api/exams', {
          params: {
            ...baseParams,
            populate: {
              ...baseParams.populate,
              eleves: { fields: ['documentId'], populate: { user: { fields: ['id', 'email'] } } },
              eleve: { fields: ['documentId'], populate: { user: { fields: ['id', 'email'] } } },
            }
          }
        })
        const rows = (data?.data ?? []).filter((it: any) => examBelongsToUser(it, userId))
        setExams(normalizeExams(rows))
      } else {
        setExams(normalizeExams(fromServer))
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || t('common.loadingError'))
      setExams([])
      console.error('[Dashboard load]', e?.response?.data || e)
    } finally {
      setLoading(false)
    }
  }

  const events = useMemo(() => {
    const evts: any[] = []
    exams.forEach(ex => {
      if (ex.date) {
        evts.push({
          id: `exam-${ex.documentId}`,
          title: t('dash.event.exam', { nom: ex.nom }),
          start: ex.date,
          end: ex.date,
          allDay: false,
          color: colorOf(Number(ex.id) || 0),
          textColor: '#3b2f29'
        })
      }
      (ex.sessions ?? []).forEach((s, i) => {
        evts.push({
          id: `sess-${ex.documentId}-${s?.documentId ?? i}`,
          title: t('dash.event.session', { nom: ex.nom }),
          start: s.date_debut,
          end: s.date_fin,
          color: colorOf(Number(ex.id) || 0),
          textColor: '#3b2f29'
        })
      })
    })
    return evts
  }, [exams, t])

  function generatePlan(ex: Examen) {
    if (!ex.date || !ex.poids) return []
    const end = new Date(ex.date)
    const nb = Math.max(1, Math.ceil(ex.poids / 10))
    const spanDays = Math.max(3, Math.min(14, nb * 2))
    const sessions = []
    for (let i = nb; i >= 1; i--) {
      const dayOffset = Math.floor((spanDays / (nb + 1)) * i)
      const start = new Date(end)
      start.setDate(end.getDate() - dayOffset)
      start.setHours(18, 0, 0, 0)
      const fin = new Date(start)
      fin.setMinutes(start.getMinutes() + 60)
      sessions.push({ start, fin })
    }
    return sessions
  }

  async function createPlanOnServer(ex: Examen) {
    const plan = generatePlan(ex)
    if (plan.length === 0) {
      alert(t('dash.plan.missing'))
      return
    }
    try {
      const newSessionDocIds: string[] = []
      for (let i = 0; i < plan.length; i++) {
        const idsession = Number(`${Date.now()}${i}`.slice(-9))
        const s = plan[i]
        const created = await api.post('/api/sessions', {
          data: {
            idsession,
            date_debut: s.start.toISOString(),
            date_fin: s.fin.toISOString(),
            avancement: 0,
            commentaire: t('dash.plan.autoComment', { nom: ex.nom })
          }
        })
        const sidDoc = created?.data?.data?.documentId
        if (sidDoc) newSessionDocIds.push(sidDoc)
      }

      try {
        await api.put(`/api/exams/${ex.documentId}`, {
          data: { sessions: { connect: newSessionDocIds } }
        })
      } catch {
        // fallback compat
        const exFull = await api.get(
          `/api/exams/${ex.documentId}?populate[sessions][fields][0]=documentId`
        )
        const existingDocIds: string[] =
          exFull?.data?.data?.attributes?.sessions?.data?.map((x: any) => x.documentId) ??
          exFull?.data?.data?.sessions?.map((x: any) => x.documentId) ?? []
        const all = Array.from(new Set([...(existingDocIds || []), ...newSessionDocIds]))
        await api.put(`/api/exams/${ex.documentId}`, {
          data: { sessions: all }
        })
      }

      await load()
      alert(t('dash.plan.generated'))
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || t('dash.plan.generateFailed'))
      console.error(e?.response?.data || e)
    }
  }

  async function deletePlanOnServer(ex: Examen) {
    try {
      let sessDocIds: string[] =
        (ex.sessions ?? []).map(s => s.documentId).filter(Boolean as any) as string[]
      if (sessDocIds.length === 0) {
        const exFull = await api.get(
          `/api/exams/${ex.documentId}?populate[sessions][fields][0]=documentId`
        )
        sessDocIds =
          exFull?.data?.data?.attributes?.sessions?.data?.map((x: any) => x.documentId) ??
          exFull?.data?.data?.sessions?.map((x: any) => x.documentId) ?? []
      }

      if (sessDocIds.length === 0) {
        alert(t('dash.plan.nothingToDelete'))
        return
      }

      try {
        await api.put(`/api/exams/${ex.documentId}`, {
          data: { sessions: { disconnect: sessDocIds } }
        })
      } catch {
        await api.put(`/api/exams/${ex.documentId}`, { data: { sessions: [] } })
      }

      for (const sdid of sessDocIds) {
        await api.delete(`/api/sessions/${sdid}`)
      }

      await load()
      alert(t('dash.plan.deleted'))
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || t('dash.plan.deleteFailed'))
      console.error(e?.response?.data || e)
    }
  }

  return (
    <div className="dash-grid">
      <section className="card">
        <div className="card-header">
          <strong>{t('dash.nextExams')}</strong>
        </div>
        <div className="card-body dash-list">
          {loading && <p className="small">{t('common.loading')}</p>}
          {error && <p className="small" role="alert">{t('common.error')}: {error}</p>}
          {exams.length === 0 ? (
            <p className="small">{t('dash.none')}</p>
          ) : (
            exams.map(ex => (
              <div key={String(ex.documentId)} className="dash-exam">
                <div className="dot" style={{ background: colorOf(Number(ex.id) || 0) }} />
                <div className="info">
                  <div className="tt">{ex.nom}</div>
                  <div className="sub">
                    {ex.date ? new Date(ex.date).toLocaleString() : '—'} • {t('dash.weight')} {ex.poids ?? '—'}
                  </div>
                </div>
                <div className="controls" style={{ display:'flex', gap:8 }}>
                  <button className="btn brand" onClick={() => createPlanOnServer(ex)}>
                    {t('dash.actions.generatePlan')}
                  </button>
                  <button className="btn danger" onClick={() => deletePlanOnServer(ex)}>
                    {t('dash.actions.deletePlan')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card cal-card">
        <div className="card-header"><strong>{t('dash.calendar')}</strong></div>
        <div className="card-body">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            height="auto"
            events={events}
          />
        </div>
      </section>
    </div>
  )
}
