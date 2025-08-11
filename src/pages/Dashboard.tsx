import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { api } from '../api/client'
import './styles/Dashboard.css'

type Session = {
  id: number
  idsession: number
  date_debut: string
  date_fin: string
  avancement: number
  commentaire?: string
}

type Examen = {
  id: number | string
  idexam: string
  nom: string
  date: string | null
  poids: number | null
  sessions?: Session[]
}

const palette = ['#E3C9B5', '#DDBAA5', '#F3E4D6', '#EAD8C8', '#DFC6B6', '#EEDBCB', '#E8D4C6']

// ---- Helpers ---------------------------------------------------------------

// Normalise la réponse Strapi (avec ou sans .attributes)
function normalizeExams(raw: any[]): Examen[] {
  return (raw ?? []).map((it: any) => {
    if (it?.attributes) {
      const a = it.attributes
      const sessions =
        a.sessions?.data?.map((s: any) => ({
          id: s.id,
          idsession: s.attributes?.idsession,
          date_debut: s.attributes?.date_debut,
          date_fin: s.attributes?.date_fin,
          avancement: s.attributes?.avancement,
          commentaire: s.attributes?.commentaire,
        })) ?? []
      return {
        id: it.id,
        idexam: a.idexam,
        nom: a.nom,
        date: a.date,
        poids: a.poids,
        sessions,
      } as Examen
    }
    // Déjà "flat"
    return it as Examen
  })
}

// Résout l'ID Strapi à partir d'un examen (via idexam)
async function resolveStrapiId(ex: Examen): Promise<number> {
  const candidate = Number(ex.id)
  if (Number.isInteger(candidate) && candidate > 0) return candidate

  const res = await api.get(
    `/api/exams?filters[idexam][$eq]=${encodeURIComponent(ex.idexam)}&fields[0]=id&pagination[pageSize]=1`
  )
  const strapid = res?.data?.data?.[0]?.id
  if (!strapid) throw new Error("Examen introuvable côté Strapi (résolution d'ID).")
  return strapid
}

// ---- Component -------------------------------------------------------------

export default function Dashboard() {
  const [exams, setExams] = useState<Examen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      // On récupère aussi l'id des sessions pour un éventuel fallback "set"
      const { data } = await api.get(
        '/api/exams?populate[sessions][fields][0]=id&populate[sessions][fields][1]=date_debut&populate[sessions][fields][2]=date_fin&pagination[page]=1&pagination[pageSize]=100&sort[0]=date:asc'
      )
      setExams(normalizeExams(data?.data))
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const colorOf = (id: number) => palette[id % palette.length]

  const events = useMemo(() => {
    const evts: any[] = []
    exams.forEach(ex => {
      if (ex.date) {
        evts.push({
          id: `exam-${ex.id}`,
          title: `Examen · ${ex.nom}`,
          start: ex.date,
          end: ex.date,
          allDay: false,
          color: colorOf(Number(ex.id) || 0),
          textColor: '#3b2f29'
        })
      }
      (ex.sessions ?? []).forEach((s, i) => {
        evts.push({
          id: `sess-${ex.id}-${s?.id ?? i}`,
          title: `Révision · ${ex.nom}`,
          start: s.date_debut,
          end: s.date_fin,
          color: colorOf(Number(ex.id) || 0),
          textColor: '#3b2f29'
        })
      })
    })
    return evts
  }, [exams])

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
      alert("Renseigne 'date' et 'poids' pour générer un planning.")
      return
    }
    try {
      // 1) Créer toutes les sessions
      const newSessionIds: number[] = []
      for (let i = 0; i < plan.length; i++) {
        const idsession = Number(`${Date.now()}${i}`.slice(-9))
        const s = plan[i]
        const created = await api.post('/api/sessions', {
          data: {
            idsession,
            date_debut: s.start.toISOString(),
            date_fin: s.fin.toISOString(),
            avancement: 0,
            commentaire: `Plan auto pour ${ex.nom}`
          }
        })
        const sid = created?.data?.data?.id
        if (sid) newSessionIds.push(sid)
      }

      // 2) Résoudre l'ID Strapi de l'examen (évite le 404 sur /api/exams/:id)
      const strapid = await resolveStrapiId(ex)

      // 3) Tentative 1: connect (partiel, n'écrase pas)
      try {
        await api.put(`/api/exams/${strapid}`, {
          data: { sessions: { connect: newSessionIds } }
        })
      } catch (err: any) {
        // 3-bis) Fallback: "set" avec la liste complète (existants + nouveaux)
        const exFull = await api.get(
          `/api/exams/${strapid}?populate[sessions][fields][0]=id`
        )
        const existingIds: number[] =
          exFull?.data?.data?.attributes?.sessions?.data?.map((x: any) => x.id) ??
          exFull?.data?.data?.sessions?.map((x: any) => x.id) ?? []
        const all = Array.from(new Set([...existingIds, ...newSessionIds]))

        await api.put(`/api/exams/${strapid}`, {
          data: { sessions: all }
        })
      }

      await load()
      alert('✅ Planning généré et enregistré')
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || '❌ Échec lors de la génération.')
      console.error(e?.response?.data || e)
    }
  }

  return (
    <div className="dash-grid">
      <section className="card">
        <div className="card-header">
          <strong>Prochains examens</strong>
        </div>
        <div className="card-body dash-list">
          {loading && <p className="small">Chargement…</p>}
          {error && <p className="small" role="alert">Erreur: {error}</p>}
          {exams.length === 0 ? (
            <p className="small">Aucun examen</p>
          ) : (
            exams.map(ex => (
              <div key={String(ex.id)} className="dash-exam">
                <div className="dot" style={{ background: colorOf(Number(ex.id) || 0) }} />
                <div className="info">
                  <div className="tt">{ex.nom}</div>
                  <div className="sub">
                    {ex.date ? new Date(ex.date).toLocaleString() : '—'} • poids {ex.poids ?? '—'}
                  </div>
                </div>
                <button className="btn brand" onClick={() => createPlanOnServer(ex)}>
                  Générer le planning
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card cal-card">
        <div className="card-header"><strong>Calendrier</strong></div>
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
