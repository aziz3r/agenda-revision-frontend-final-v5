import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { api } from '../api/client'
import './styles/Dashboard.css'

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

export default function Dashboard() {
  const [exams, setExams] = useState<Examen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get(
        '/api/exams'
        + '?fields[0]=documentId'
        + '&fields[1]=idexam'
        + '&fields[2]=nom'
        + '&fields[3]=date'
        + '&fields[4]=poids'
        + '&populate[sessions][fields][0]=documentId'
        + '&populate[sessions][fields][1]=date_debut'
        + '&populate[sessions][fields][2]=date_fin'
        + '&pagination[page]=1&pagination[pageSize]=100'
        + '&sort[0]=date:asc'
      )
      setExams(normalizeExams(data?.data))
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const colorOf = (seed: number) => palette[seed % palette.length]

  const events = useMemo(() => {
    const evts: any[] = []
    exams.forEach(ex => {
      if (ex.date) {
        evts.push({
          id: `exam-${ex.documentId}`,
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
          id: `sess-${ex.documentId}-${s?.documentId ?? i}`,
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
            commentaire: `Plan auto pour ${ex.nom}`
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
      alert('✅ Planning généré et enregistré')
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || '❌ Échec lors de la génération.')
      console.error(e?.response?.data || e)
    }
  }

  // 🔴 NOUVEAU : suppression du planning (déconnecte puis supprime les sessions)
  async function deletePlanOnServer(ex: Examen) {
    try {
      // 1) Récupérer les documentId des sessions liées
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
        alert('Aucune session de révision à supprimer pour cet examen.')
        return
      }

      // 2) Déconnecter les relations (safe)
      try {
        await api.put(`/api/exams/${ex.documentId}`, {
          data: { sessions: { disconnect: sessDocIds } }
        })
      } catch {
        // Fallback: écraser la liste
        await api.put(`/api/exams/${ex.documentId}`, { data: { sessions: [] } })
      }

      // 3) Supprimer les sessions
      for (const sdid of sessDocIds) {
        await api.delete(`/api/sessions/${sdid}`)
      }

      await load()
      alert('🗑️ Planning supprimé')
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || '❌ Échec lors de la suppression du planning.')
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
              <div key={String(ex.documentId)} className="dash-exam">
                <div className="dot" style={{ background: colorOf(Number(ex.id) || 0) }} />
                <div className="info">
                  <div className="tt">{ex.nom}</div>
                  <div className="sub">
                    {ex.date ? new Date(ex.date).toLocaleString() : '—'} • poids {ex.poids ?? '—'}
                  </div>
                </div>
                <div className="controls" style={{ display:'flex', gap:8 }}>
                  <button className="btn brand" onClick={() => createPlanOnServer(ex)}>
                    Générer le planning
                  </button>
                  {/* 🔴 Nouveau bouton */}
                  <button className="btn danger" onClick={() => deletePlanOnServer(ex)}>
                    Supprimer le planning
                  </button>
                </div>
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
