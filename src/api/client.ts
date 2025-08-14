// src/api/client.ts
import axios from 'axios'
import * as Qs from 'qs'
import { getAuth } from '../auth' // 🆕 récupère { jwt, user } depuis localStorage

const rawBase = import.meta?.env?.VITE_API_URL

export const api = axios.create({
  baseURL: rawBase ? rawBase.replace(/\/$/, '') : 'http://localhost:1337',
  headers: { 'Content-Type': 'application/json' },
  // 🆕 permet d'utiliser api.get(url, { params: {...} }) avec la syntaxe Strapi
  paramsSerializer: {
    serialize: (params) => Qs.stringify(params as any, { encodeValuesOnly: true })
  }
})

// 🆕 Priorité au JWT de l'utilisateur connecté, sinon token d'API .env
const tokenFromEnv = import.meta?.env?.VITE_API_TOKEN
api.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {}
  const auth = getAuth()
  if (auth?.jwt) {
    (cfg.headers as any).Authorization = `Bearer ${auth.jwt}`
  } else if (tokenFromEnv) {
    (cfg.headers as any).Authorization = `Bearer ${tokenFromEnv}`
  }
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err?.response?.data?.error?.message
      || err?.response?.data?.message
      || err?.message
    console.error('[API ERROR]', msg, err?.response?.data)
    return Promise.reject(err)
  }
)

// util pour sérialiser "à la main" si tu construis l'URL toi-même
export const qs = (obj: unknown) =>
  Qs.stringify(obj as any, { encodeValuesOnly: true })
