'use client'

import * as React from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  children: React.ReactNode
  className?: string
}

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

export const SidebarProvider: React.FC<SidebarProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <div className={cn('flex h-screen bg-background', className)}>
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export const Sidebar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { isOpen } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => {
            const context = React.useContext(SidebarContext)
            if (context) context.toggle()
          }}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-md transition-all duration-300 md:relative md:z-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        {...props}
      />
    </>
  )
}

export const SidebarToggle = () => {
  const { toggle } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="md:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

export const SidebarContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn('flex flex-col h-full p-4 overflow-y-auto', className)} {...props} />
)

export const SidebarNav: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <nav className={cn('flex flex-col gap-2 flex-1', className)} {...props} />
)

export const SidebarNavItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; icon?: React.ReactNode }
> = ({ className, active, icon, children, ...props }) => (
  <button
    className={cn(
      'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
      active
        ? 'bg-primary/20 text-primary border border-primary/30'
        : 'text-muted-foreground hover:bg-secondary/20 hover:text-foreground',
      className
    )}
    {...props}
  >
    {icon}
    <span>{children}</span>
  </button>
)
