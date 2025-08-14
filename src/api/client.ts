// src/api/client.ts
import axios from 'axios'
import * as Qs from 'qs'
import { getAuth } from '../auth'

// Base URL (sans / final)
const BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:1337').replace(/\/$/, '')
const TOKEN_ENV = import.meta?.env?.VITE_API_TOKEN

export const api = axios.create({
  baseURL: BASE,
  // Pour JSON, Axios mettra déjà le bon Content-Type ; on garde Accept
  headers: { Accept: 'application/json' },
  // Sérialise les objets imbriqués pour Strapi (filters, populate, sort, pagination…)
  paramsSerializer: {
    serialize: (params) => Qs.stringify(params as any, { encodeValuesOnly: true })
  }
})

// --- Interceptor requête: ajoute le Bearer + gère FormData proprement
api.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {}

  // 1) Auth: priorité au JWT (user), sinon token .env
  const jwt = getAuth()?.jwt
  if (jwt) (cfg.headers as any).Authorization = `Bearer ${jwt}`
  else if (TOKEN_ENV) (cfg.headers as any).Authorization = `Bearer ${TOKEN_ENV}`

  // 2) Uploads: si FormData, laisser le navigateur définir le boundary
  const isFormData =
    (typeof FormData !== 'undefined') &&
    (cfg.data instanceof FormData || cfg.data?.__proto__?.constructor?.name === 'FormData')
  if (isFormData) {
    // Axios ajoutera automatiquement le bon Content-Type multipart/*
    delete (cfg.headers as any)['Content-Type']
  } else {
    // Pour JSON, on s'assure du header (utile sur certains environnements)
    (cfg.headers as any)['Content-Type'] = 'application/json'
  }

  return cfg
})

// --- Interceptor réponse: log clair et propagation de l'erreur
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status
    const msg =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message
    console.error('[API ERROR]', status, msg, err?.response?.data)
    return Promise.reject(err)
  }
)

// Helper si tu construis l’URL manuellement
export const qs = (obj: unknown) =>
  Qs.stringify(obj as any, { encodeValuesOnly: true })
