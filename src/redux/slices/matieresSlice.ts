import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, qs } from '../../api/client'
import type { Matiere } from '../../types/Matiere'

export type MatState = { items: Matiere[]; loading: boolean; error?: string | null }
const initialState: MatState = { items: [], loading: false, error: null }

export const fetchMatieres = createAsyncThunk('matieres/fetch', async () => {
  const query = qs({ pagination: { page:1, pageSize:100 }, sort: ['nom:asc'] })
  const { data } = await api.get(`/api/matieres?${query}`)
  return data.data.map((d:any) => ({ id: d.id, ...(d.attributes ?? {}) })) as Matiere[]
})

const slice = createSlice({
  name: 'matieres', initialState, reducers: {}, extraReducers: b => {
    b.addCase(fetchMatieres.pending, s=>{s.loading=true; s.error=null})
     .addCase(fetchMatieres.fulfilled, (s,a)=>{s.loading=false; s.items=a.payload})
     .addCase(fetchMatieres.rejected, (s,a)=>{s.loading=false; s.error=a.error.message || 'Erreur'})}
})

export default slice.reducer
