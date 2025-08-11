import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { api } from '../api/client'
import './styles/AddExamen.css'

export default function AddExamen() {
  const nav = useNavigate()
  const [idexam, setIdexam] = useState('')
  const [nom, setNom] = useState('')
  const [date, setDate] = useState<Date | null>(null)
  const [poids, setPoids] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!idexam || !nom || !date || isNaN(Number(poids))) {
      setError('❌ Remplis tous les champs.')
      return
    }

    const examReference = uuidv4()

    try {
      setBusy(true)
      await api.post('/api/exams', {
        data: {
          examReference,
          idexam,
          nom,
          date: date.toISOString(),
          poids: Number(poids)
        }
      })
      alert('✅ Examen ajouté !')
      nav('/examens')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || '❌ Échec de la création.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="add-shell">
      <section className="card">
        <div className="card-header"><strong>➕ Ajouter un examen</strong></div>
        <div className="card-body">
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="fg">
              <label>ID Examen</label>
              <input className="input" value={idexam} onChange={e=>setIdexam(e.target.value)} required />
            </div>
            <div className="fg">
              <label>Nom</label>
              <input className="input" value={nom} onChange={e=>setNom(e.target.value)} required />
            </div>
            <div className="fg">
              <label>Date</label>
              <DatePicker
                selected={date}
                onChange={d => setDate(d)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Sélectionne la date et l'heure"
                className="input"
              />
            </div>
            <div className="fg">
              <label>Poids</label>
              <input className="input" type="number" value={poids} onChange={e=>setPoids(e.target.value)} required />
            </div>
            <div className="actions">
              <button className="btn brand" type="submit" disabled={busy}>{busy ? '…' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
