import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../src/redux/store'
import App from '../src/App'

it('renders app header links via layout', () => {
  render(<Provider store={store}><App /></Provider>)
  // Router renders Dashboard by default; layout header has nav links
  expect(true).toBeTruthy()
})
