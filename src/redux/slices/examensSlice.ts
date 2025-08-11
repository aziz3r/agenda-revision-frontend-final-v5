import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { api, qs } from '../../api/client'
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
  items: [], page: 1, pageSize: 10, pageCount: 1, total: 0, loading: false, error: null, current: null
}

export const fetchExams = createAsyncThunk('examens/fetchPage', async (args: { page:number; pageSize:number }) => {
  const query = qs({ pagination: { page: args.page, pageSize: args.pageSize, withCount: true }, sort: ['date:asc'] })
  const { data } = await api.get(`/api/exams?${query}`)
  return { data: listFromStrapi<Examen>(data.data), meta: data.meta }
})

export const fetchExamById = createAsyncThunk('examens/fetchById', async (id: number) => {
  const { data } = await api.get(`/api/exams/${id}`)
  return fromStrapi<Examen>(data.data)
})

function buildBody(p: Partial<Examen>) {
  // n'envoyer que les champs autorisés, idexam requis côté Strapi
  const body: any = {}
  if (p.idexam !== undefined) body.idexam = p.idexam
  if (p.nom !== undefined) body.nom = p.nom
  if (p.date !== undefined) body.date = localToISO(p.date as any)
  if (p.poids !== undefined) body.poids = p.poids
  return body
}

export const createExam = createAsyncThunk('examens/create', async (payload: Partial<Examen>) => {
  const { data } = await api.post(`/api/exams`, { data: buildBody(payload) })
  return fromStrapi<Examen>(data.data)
})

export const updateExam = createAsyncThunk('examens/update', async ({ id, changes }: { id:number; changes: Partial<Examen> }) => {
  const { data } = await api.put(`/api/exams/${id}`, { data: buildBody(changes) })
  return fromStrapi<Examen>(data.data)
})

export const deleteExam = createAsyncThunk('examens/delete', async (id: number) => {
  await api.delete(`/api/exams/${id}`)
  return id
})

const slice = createSlice({
  name: 'examens',
  initialState,
  reducers: { setPage(s, a:PayloadAction<number>){ s.page = a.payload } },
  extraReducers: b => {
    b
      .addCase(fetchExams.pending, s => { s.loading = true; s.error = null })
      .addCase(fetchExams.fulfilled, (s, { payload }) => {
        s.loading = false
        s.items = payload.data
        const p = payload.meta.pagination
        s.page = p.page; s.pageSize = p.pageSize; s.pageCount = p.pageCount; s.total = p.total
      })
      .addCase(fetchExams.rejected, (s, a) => { s.loading = false; s.error = a.error.message || 'Erreur' })
      .addCase(fetchExamById.fulfilled, (s, a) => { s.current = a.payload })
      .addCase(createExam.fulfilled, (s, a) => { s.items.unshift(a.payload) })
      .addCase(updateExam.fulfilled, (s, a) => {
        const i = s.items.findIndex(x => x.id === a.payload.id); if (i>=0) s.items[i] = a.payload
        if (s.current?.id === a.payload.id) s.current = a.payload
      })
      .addCase(deleteExam.fulfilled, (s, a) => {
        s.items = s.items.filter(x => x.id !== a.payload)
        if (s.current?.id === a.payload) s.current = null
      })
  }
})

export const { setPage } = slice.actions
export default slice.reducer
