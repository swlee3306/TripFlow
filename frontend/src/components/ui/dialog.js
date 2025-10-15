import { cn } from "../../lib/utils"

export function Dialog({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative bg-background rounded-lg shadow-lg max-w-lg w-full mx-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left p-6", className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0", className)}
      {...props}
    />
  )
}
