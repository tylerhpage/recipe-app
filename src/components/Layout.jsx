import { NavLink } from 'react-router-dom'
import { BookOpen, PlusCircle, CalendarDays, ShoppingCart } from 'lucide-react'

const tabs = [
  { to: '/',          label: 'Library',  Icon: BookOpen      },
  { to: '/add',       label: 'Add',      Icon: PlusCircle    },
  { to: '/menu',      label: 'Menu',     Icon: CalendarDays  },
  { to: '/shopping',  label: 'Shopping', Icon: ShoppingCart  },
]

export default function Layout({ children, onLogout }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Recipe Manager</h1>
        <button
          onClick={onLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Page content — grows to fill space, padded above the nav bar */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 md:ml-56">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex md:hidden z-10">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Side nav — desktop */}
      <nav className="fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-200 hidden md:flex flex-col pt-16 z-10">
        <div className="px-4 py-4 border-b border-gray-100 mb-2">
          <span className="text-lg font-bold text-gray-900">Recipe Manager</span>
        </div>
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
        <div className="mt-auto p-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </nav>
    </div>
  )
}
