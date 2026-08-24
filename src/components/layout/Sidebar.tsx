import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Tags, ChevronLeft } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/questions', icon: BookOpen, label: 'Questions', end: false },
  { to: '/categories', icon: Tags, label: 'Categories', end: false },
] as const

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
        sidebarCollapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-sidebar-border',
          sidebarCollapsed ? 'justify-center px-0' : 'px-4'
        )}
      >
        {sidebarCollapsed ? (
          <span className="text-sm font-bold tracking-tight text-sidebar-primary">
            TM
          </span>
        ) : (
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            TM Studio
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className={cn('space-y-0.5', sidebarCollapsed ? 'px-2' : 'px-2')}>
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) =>
            sidebarCollapsed ? (
              <li key={to}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )
                      }
                    >
                      <Icon className="size-4" />
                      <span className="sr-only">{label}</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              </li>
            ) : (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            )
          )}
        </ul>
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Collapse toggle */}
      <div className={cn('p-2', sidebarCollapsed && 'flex justify-center')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronLeft
            className={cn(
              'size-4 transition-transform duration-200',
              sidebarCollapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>
    </aside>
  )
}
