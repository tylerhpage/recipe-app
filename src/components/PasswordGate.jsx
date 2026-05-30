import { useState } from 'react'

const SESSION_KEY = 'recipe_app_session'
const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD

export function getSession() {
  return localStorage.getItem(SESSION_KEY)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function setSession() {
  localStorage.setItem(SESSION_KEY, 'authenticated')
}

export default function PasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (password === CORRECT_PASSWORD) {
      setSession()
      onAuthenticated()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Recipe Manager</h1>
        <p className="text-center text-gray-500 mb-8">Enter your password to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {error && (
            <p className="text-sm text-red-600">Incorrect password. Please try again.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
