import * as React from 'react'
import { cn } from '@/lib/utils'

interface TopbarProps extends React.HTMLAttributes<HTMLDivElement> {
  sticky?: boolean
}

const Topbar = React.forwardRef<HTMLDivElement, TopbarProps>(
  ({ className, sticky = true, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        'w-full border-b border-border bg-card/50 backdrop-blur-md transition-all duration-200',
        sticky && 'sticky top-0 z-40',
        className
      )}
      {...props}
    />
  )
)
Topbar.displayName = 'Topbar'

const TopbarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between px-6 py-4 gap-4', className)}
      {...props}
    />
  )
)
TopbarContent.displayName = 'TopbarContent'

const TopbarLeft = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-4', className)} {...props} />
  )
)
TopbarLeft.displayName = 'TopbarLeft'

const TopbarRight = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-4 ml-auto', className)} {...props} />
  )
)
TopbarRight.displayName = 'TopbarRight'

export { Topbar, TopbarContent, TopbarLeft, TopbarRight }
