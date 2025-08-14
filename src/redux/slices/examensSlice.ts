// src/redux/slices/examensSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '../../api/client'
import type { Examen } from '../../types/Examen'
import { fromStrapi, listFromStrapi, localToISO } from '../../api/strapiMap'

export type ExamsState = {
  items: Examen[]
  page: number
  pageSize: number
  pageCount: number
  total: number
  loading: boolean
  error?: string | null
  current?: Examen | null
}

const initialState: ExamsState = {
  items: [],
  page: 1,
  pageSize: 10,
  pageCount: 1,
  total: 0,
  loading: false,
  error: null,
  current: null,
}

/** 🔁 Pagination + filtres (relation eleve->user) */
export const fetchExams = createAsyncThunk(
  'examens/fetchPage',
  async (
    args: { page: number; pageSize: number; filters?: any },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.get('/api/exams', {
        params: {
          fields: ['id', 'documentId', 'examReference', 'idexam', 'nom', 'date', 'poids'],
          populate: { sessions: { fields: ['documentId', 'date_debut', 'date_fin'] } },
          pagination: { page: args.page, pageSize: args.pageSize, withCount: true },
          sort: ['date:asc'],
          ...(args.filters ? { filters: args.filters } : {}),
        },
      })
      return { data: listFromStrapi<Examen>(data.data), meta: data.meta }
    } catch (e: any) {
      return rejectWithValue(
        e?.response?.data?.error?.message || e?.message || 'Erreur'
      )
    }
  }
)

/** 🔎 Récupération par documentId (string) */
export const fetchExamById = createAsyncThunk('examens/fetchById', async (id: string | number) => {
  const { data } = await api.get(`/api/exams/${id}`)
  return fromStrapi<Examen>(data.data)
})

function buildBody(p: Partial<Examen>) {
  const body: any = {}
  if (p.idexam !== undefined) body.idexam = p.idexam
  if (p.nom !== undefined) body.nom = p.nom
  if (p.date !== undefined) body.date = localToISO(p.date as any)
  if (p.poids !== undefined) body.poids = p.poids
  return body
}

/** ➕ (utile si tu dispatches côté UI; ta page AddExamen poste déjà directement) */
export const createExam = createAsyncThunk('examens/create', async (payload: Partial<Examen>) => {
  const { data } = await api.post(`/api/exams`, { data: buildBody(payload) })
  return fromStrapi<Examen>(data.data)
})

/** ✏️ MAJ par documentId ou id */
export const updateExam = createAsyncThunk(
  'examens/update',
  async ({ id, changes }: { id: string | number; changes: Partial<Examen> }) => {
    const { data } = await api.put(`/api/exams/${id}`, { data: buildBody(changes) })
    return fromStrapi<Examen>(data.data)
  }
)

/** 🗑️ Suppression par documentId (ou id) */
export const deleteExam = createAsyncThunk('examens/delete', async (id: string | number) => {
  await api.delete(`/api/exams/${id}`)
  return id
})

const slice = createSlice({
  name: 'examens',
  initialState,
  reducers: {
    setPage(s, a: PayloadAction<number>) {
      s.page = a.payload
    },
  },
  extraReducers: (b) => {
    b
      // fetch
      .addCase(fetchExams.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(fetchExams.fulfilled, (s, { payload }) => {
        s.loading = false
        s.items = payload.data
        const p = payload.meta.pagination
        s.page = p.page
        s.pageSize = p.pageSize
        s.pageCount = p.pageCount
        s.total = p.total
      })
      .addCase(fetchExams.rejected, (s, a) => {
        s.loading = false
        s.error = (a.payload as string) || a.error.message || 'Erreur'
      })

      // fetch by id
      .addCase(fetchExamById.fulfilled, (s, a) => {
        s.current = a.payload
      })

      // create
      .addCase(createExam.fulfilled, (s, a) => {
        s.items.unshift(a.payload)
      })

      // update
      .addCase(updateExam.fulfilled, (s, a) => {
        const i = s.items.findIndex((x) => x.id === a.payload.id)
        if (i >= 0) s.items[i] = a.payload
        if (s.current?.id === a.payload.id) s.current = a.payload
      })

      // delete (compare documentId si dispo, sinon id)
      .addCase(deleteExam.fulfilled, (s, a) => {
        const deleted = String(a.payload)
        s.items = s.items.filter(
          (x: any) => String(x.documentId ?? x.id) !== deleted
        )
        const curId = s.current ? String((s.current as any).documentId ?? s.current.id) : null
        if (curId === deleted) s.current = null
      })
  },
})

export const { setPage } = slice.actions
export default slice.reducer
