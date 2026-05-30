import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PasswordGate, { getSession, clearSession } from './components/PasswordGate'
import Layout from './components/Layout'
import Library from './pages/Library'
import AddRecipe from './pages/AddRecipe'
import Menu from './pages/Menu'
import ShoppingList from './pages/ShoppingList'
import RecipeDetail from './pages/RecipeDetail'

function App() {
  const [authenticated, setAuthenticated] = useState(() => !!getSession())

  function handleLogout() {
    clearSession()
    setAuthenticated(false)
  }

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />
  }

  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/"         element={<Library />} />
          <Route path="/add"      element={<AddRecipe />} />
          <Route path="/menu"     element={<Menu />} />
          <Route path="/shopping" element={<ShoppingList />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
