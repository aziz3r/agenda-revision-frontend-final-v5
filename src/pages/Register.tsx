// src/pages/Register.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { saveAuth } from '../auth'
import './styles/AddExamen.css'

const ELEVE_USER_FIELD = 'user'

// === helpers ================================================================

async function registerUser(username: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/local/register', { username, email, password })
  return data // { jwt?, user }
}
async function loginUser(identifier: string, password: string) {
  const { data } = await api.post('/api/auth/local', { identifier, password })
  return data // { jwt, user }
}

async function findEleveByEmail(email: string): Promise<string | null> {
  try {
    const { data } = await api.get('/api/eleves', {
      params: {
        filters: { email_eleve: { $eq: email } },
        fields: ['documentId'],
        pagination: { page: 1, pageSize: 1 }
      }
    })
    const hit = data?.data?.[0]
    return hit?.documentId ?? hit?.attributes?.documentId ?? null
  } catch { return null }
}

async function createEleveSmart({
  nom, email, ideleve, password
}: { nom: string; email: string; ideleve?: string; password: string; }) {
  const base: any = { nom, email_eleve: email, ...(ideleve ? { ideleve: Number(ideleve) } : {}) }
  // tentative AVEC mot_de_passe (si le champ existe/requis)
  try {
    const { data } = await api.post('/api/eleves', { data: { ...base, mot_de_passe: password } })
    return String(data?.data?.documentId)
  } catch (e: any) {
    if (e?.response?.status === 400) {
      // fallback SANS mot_de_passe si le champ n’existe pas / n’est pas requis
      const { data } = await api.post('/api/eleves', { data: base })
      return String(data?.data?.documentId)
    }
    if (e?.response?.status === 403) {
      throw new Error('Forbidden: active les permissions Eleve (create) pour Authenticated.')
    }
    throw e
  }
}

async function linkEleveToUser(eleveDocId: string, userId: number) {
  try {
    await api.put(`/api/eleves/${eleveDocId}`, {
      data: { [ELEVE_USER_FIELD]: { connect: [{ id: userId }] } }
    })
  } catch {
    await api.put(`/api/eleves/${eleveDocId}`, { data: { [ELEVE_USER_FIELD]: userId } })
  }
}

// === component =============================================================

export default function Register() {
  const { t } = useTranslation()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ideleve, setIdeleve] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError(t('register.errors.missing')); return }

    try {
      setBusy(true)

      // ✅ 1) Utiliser l’email comme username pour éviter les collisions
      const username = email.trim().toLowerCase()

      // ✅ 2) Tentative de création du user
      let auth: any
      try {
        auth = await registerUser(username, email, password)
      } catch (e: any) {
        const msg = e?.response?.data?.error?.message || ''
        const isTaken = /already taken/i.test(msg)
        if (!isTaken) throw e
        // ✅ 3) Email/username déjà pris → on tente un login auto
        try {
          auth = await loginUser(email, password)
        } catch {
          throw new Error('Ce compte existe déjà. Utilise la page de connexion.')
        }
      }

      // ✅ 4) S’assurer d’avoir un JWT (si confirmation email ON, on a déjà loggé ci-dessus)
      saveAuth(auth)
      const userId: number = auth?.user?.id
      if (!userId) throw new Error('Missing user id after auth')

      // ✅ 5) Élève: récupérer ou créer séparément
      let eleveDocId = await findEleveByEmail(email)
      if (!eleveDocId) {
        eleveDocId = await createEleveSmart({
          nom: name || email, email, ideleve, password
        })
      }

      // ✅ 6) Lier élève ↔ user
      await linkEleveToUser(eleveDocId, userId)

      alert(t('register.success'))
      nav('/', { replace: true })
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        t('register.errors.failed')
      setError(String(msg))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="add-shell">
      <section className="card">
        <div className="card-header"><strong>👤 {t('register.title')}</strong></div>
        <div className="card-body">
          {error && <p className="form-error">{error}</p>}
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="fg">
              <label>{t('register.fields.name')}</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder={t('register.placeholders.name') as string}/>
            </div>
            <div className="fg">
              <label>{t('register.fields.email')}</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div className="fg">
              <label>{t('register.fields.password')}</label>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <div className="fg">
              <label>{t('register.fields.ideleve')}</label>
              <input className="input" type="number" value={ideleve} onChange={e=>setIdeleve(e.target.value)} placeholder="(si requis)"/>
            </div>

            <div className="actions">
              <button className="btn brand" disabled={busy} type="submit">
                {busy ? '…' : t('register.submit')}
              </button>
              <span className="small" style={{marginLeft:8}}>
                {t('register.haveAccount')} <Link to="/login">{t('register.signIn')}</Link>
              </span>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
