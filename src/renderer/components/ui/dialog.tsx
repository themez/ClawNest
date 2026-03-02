import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Dialog (controlled container)                                      */
/* ------------------------------------------------------------------ */

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => {} })

function useDialog() {
  return React.useContext(DialogContext)
}

/* ------------------------------------------------------------------ */
/*  DialogContent — portal to body, overlay + centered panel           */
/* ------------------------------------------------------------------ */

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, ESC and overlay click are disabled (e.g. during OAuth) */
  preventClose?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, preventClose, ...props }, ref) => {
    const { open, onOpenChange } = useDialog()

    // ESC to close
    React.useEffect(() => {
      if (!open || preventClose) return
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false)
      }
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [open, preventClose, onOpenChange])

    if (!open) return null

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => {
            if (!preventClose) onOpenChange(false)
          }}
        />
        {/* Panel */}
        <div
          ref={ref}
          className={cn(
            'relative z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border bg-card text-card-foreground shadow-lg p-6',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </div>,
      document.body,
    )
  },
)
DialogContent.displayName = 'DialogContent'

/* ------------------------------------------------------------------ */
/*  DialogHeader                                                       */
/* ------------------------------------------------------------------ */

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between mb-4', className)}
    {...props}
  />
))
DialogHeader.displayName = 'DialogHeader'

/* ------------------------------------------------------------------ */
/*  DialogTitle                                                        */
/* ------------------------------------------------------------------ */

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-base font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

/* ------------------------------------------------------------------ */
/*  DialogClose                                                        */
/* ------------------------------------------------------------------ */

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, onClick, ...props }, ref) => {
    const { onOpenChange } = useDialog()
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className,
        )}
        onClick={(e) => {
          onClick?.(e)
          onOpenChange(false)
        }}
        {...props}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    )
  },
)
DialogClose.displayName = 'DialogClose'

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose }
