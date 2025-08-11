import axios from 'axios'
import * as Qs from 'qs' // <-- IMPORTANT

const rawBase = import.meta?.env?.VITE_API_URL
export const api = axios.create({
  baseURL: rawBase ? rawBase.replace(/\/$/, '') : 'http://localhost:1337',
  headers: { 'Content-Type': 'application/json' }
})

// Token optionnel si tes routes ne sont pas publiques
const token = import.meta?.env?.VITE_API_TOKEN
api.interceptors.request.use(cfg => {
  if (token) {
    cfg.headers = cfg.headers ?? {}
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message
    console.error('[API ERROR]', msg, err?.response?.data)
    return Promise.reject(err)
  }
)

// <- export util pour sérialiser les paramètres Strapi (populate, filters, pagination…)
export const qs = (obj: unknown) =>
  Qs.stringify(obj as any, { encodeValuesOnly: true })
