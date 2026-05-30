import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function TagSelector({ selected, onChange }) {
  const [tags, setTags] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('tags')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setTags(data ?? [])
        setLoading(false)
      })
  }, [])

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter((t) => t !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const visible = search.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags

  if (loading) return <p className="text-sm text-gray-400">Loading tags…</p>
  if (error) return <p className="text-sm text-red-500">{error}</p>

  return (
    <div className="space-y-3">
      <input
        className="input w-full"
        placeholder="Search tags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {visible.length === 0 ? (
        <p className="text-sm text-gray-400">No tags found.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visible.map((tag) => {
            const active = selected.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggle(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
