import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { saveAuth } from '../auth'
import './styles/AddExamen.css'

// 🔧 si la relation dans le CT Élève ne s'appelle pas "user", change ce nom
const ELEVE_USER_FIELD = 'user'

// ── helpers API ─────────────────────────────────────────────────────────────

async function registerUser(username: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/local/register', { username, email, password })
  return data // { jwt?, user }
}

async function loginUser(identifier: string, password: string) {
  const { data } = await api.post('/api/auth/local', { identifier, password })
  return data // { jwt, user }
}

// Retourne documentId si un élève avec cet email existe déjà
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

// Crée l'élève SANS relation au user (création séparée)
async function createEleve(payload: {
  nom: string
  email_eleve: string
  ideleve?: number
  mot_de_passe?: string   // <-- ne garder que si ton CT l'exige
}): Promise<string> {
  const { data } = await api.post('/api/eleves', { data: payload })
  return String(data?.data?.documentId)
}

// Relie un élève déjà créé au user (connect), avec fallback si nécessaire
async function linkEleveToUser(eleveDocId: string, userId: number) {
  try {
    await api.put(`/api/eleves/${eleveDocId}`, {
      data: { [ELEVE_USER_FIELD]: { connect: [{ id: userId }] } }
    })
  } catch {
    // certains schémas acceptent encore l'id direct
    await api.put(`/api/eleves/${eleveDocId}`, {
      data: { [ELEVE_USER_FIELD]: userId }
    })
  }
}

// ── composant ───────────────────────────────────────────────────────────────

export default function Register() {
  const { t } = useTranslation()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ideleve, setIdeleve] = useState<string>('') // si requis dans ton CT
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError(t('register.errors.missing'))
      return
    }

    try {
      setBusy(true)

      // 1) Créer le user
      let auth = await registerUser(name || email, email, password)

      // 2) Obtenir un JWT : si Strapi n'en renvoie pas (confirmation email activée), on login
      if (!auth?.jwt) auth = await loginUser(email, password)

      // 3) Sauvegarder l'auth → l'interceptor mettra le Bearer automatiquement
      saveAuth(auth)

      const userId: number = auth?.user?.id
      if (!userId) throw new Error('Missing user id after auth')

      // 4) Créer l’élève séparément (ou récupérer s’il existe déjà)
      let eleveDocId = await findEleveByEmail(email)
      if (!eleveDocId) {
        eleveDocId = await createEleve({
          nom: name || email,
          email_eleve: email,
          ideleve: ideleve ? Number(ideleve) : undefined,
          // mot_de_passe: password, // <-- dé-commente seulement si champ requis
        })
      }

      // 5) Relier l'élève au user (association)
      await linkEleveToUser(eleveDocId, userId)

      alert(t('register.success'))
      nav('/', { replace: true })
    } catch (e: any) {
      console.error('Register error:', e?.response?.data || e)
      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
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

