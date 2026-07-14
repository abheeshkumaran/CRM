import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
 size?: "sm" | "md" | "lg" | "xl"
 className?: string
 text?: string
}

const sizeClasses = {
 sm: "h-4 w-4",
 md: "h-8 w-8",
 lg: "h-12 w-12",
 xl: "h-16 w-16"
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
 return (
  <div className="flex flex-col items-center justify-center gap-3">
   <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
   {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
  </div>
 )
}

interface LoadingOverlayProps {
 text?: string
 transparent?: boolean
}

export function LoadingOverlay({ text = "Loading...", transparent = false }: LoadingOverlayProps) {
 return (
  <div className={cn(
   "absolute inset-0 z-50 flex items-center justify-center",
   transparent ? "bg-background/50 backdrop-blur-sm" : "bg-background"
  )}>
   <div className="flex flex-col items-center gap-4">
    <div className="relative">
     <div className="h-16 w-16 rounded-full border-4 border-primary/20"></div>
     <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-primary"></div>
    </div>
    <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>
   </div>
  </div>
 )
}

interface LoadingCardProps {
 text?: string
 className?: string
}

export function LoadingCard({ text = "Loading...", className }: LoadingCardProps) {
 return (
  <div className={cn("flex flex-col items-center justify-center p-12 rounded-lg border bg-card", className)}>
   <div className="relative mb-4">
    <div className="h-12 w-12 rounded-full border-4 border-primary/20"></div>
    <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary"></div>
   </div>
   <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>
  </div>
 )
}

interface LoadingDotsProps {
 className?: string
}

export function LoadingDots({ className }: LoadingDotsProps) {
 return (
  <div className={cn("flex items-center gap-1", className)}>
   <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
   <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
   <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
  </div>
 )
}

interface LoadingSkeletonProps {
 rows?: number
 className?: string
}

export function LoadingSkeleton({ rows = 5, className }: LoadingSkeletonProps) {
 return (
  <div className={cn("space-y-3", className)}>
   {Array.from({ length: rows }).map((_, i) => (
    <div key={i} className="flex items-center gap-4">
     <div className="h-12 w-12 rounded-full bg-muted animate-pulse"></div>
     <div className="flex-1 space-y-2">
      <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + (i % 3) * 10}%` }}></div>
      <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${40 + (i % 2) * 20}%` }}></div>
     </div>
    </div>
   ))}
  </div>
 )
}

interface LoadingBarProps {
 progress?: number
 text?: string
 className?: string
}

export function LoadingBar({ progress, text, className }: LoadingBarProps) {
 return (
  <div className={cn("w-full space-y-2", className)}>
   {text && <p className="text-sm text-muted-foreground">{text}</p>}
   <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
    <div
     className={cn(
      "h-full bg-primary transition-all duration-300",
      progress === undefined && "animate-pulse"
     )}
     style={{ width: progress !== undefined ? `${progress}%` : '100%' }}
    ></div>
   </div>
  </div>
 )
}
