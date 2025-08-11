import { configureStore } from '@reduxjs/toolkit'
import examensReducer from './slices/examensSlice'
import matieresReducer from './slices/matieresSlice'

export const store = configureStore({
  reducer: {
    examens: examensReducer,
    matieres: matieresReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
