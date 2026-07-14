import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface PageLoaderProps {
 text?: string
 subtext?: string
}

export function PageLoader({ text = "Loading", subtext }: PageLoaderProps) {
 const [dots, setDots] = useState("")

 useEffect(() => {
  const interval = setInterval(() => {
   setDots(prev => prev.length >= 3 ? "" : prev + ".")
  }, 500)
  return () => clearInterval(interval)
 }, [])

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
   <div className="flex flex-col items-center gap-6 max-w-md px-6">
    {/* Animated Logo/Spinner */}
    <div className="relative">
     {/* Outer ring */}
     <div className="h-24 w-24 rounded-full border-4 border-primary/20"></div>
     
     {/* Spinning ring */}
     <div className="absolute inset-0 h-24 w-24 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-primary"></div>
     
     {/* Inner pulsing circle */}
     <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-12 w-12 rounded-full bg-primary/20 animate-pulse"></div>
     </div>
     
     {/* Center dot */}
     <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-4 w-4 rounded-full bg-primary"></div>
     </div>
    </div>

    {/* Text */}
    <div className="text-center space-y-2">
     <h3 className="text-xl font-semibold">
      {text}
      <span className="inline-block w-8 text-left">{dots}</span>
     </h3>
     {subtext && (
      <p className="text-sm text-muted-foreground animate-pulse">{subtext}</p>
     )}
    </div>

    {/* Progress bar */}
    <div className="w-full max-w-xs">
     <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]"></div>
     </div>
    </div>
   </div>

   <style>{`
    @keyframes loading {
     0% { width: 0%; margin-left: 0%; }
     50% { width: 75%; margin-left: 12.5%; }
     100% { width: 0%; margin-left: 100%; }
    }
   `}</style>
  </div>
 )
}

interface InlineLoaderProps {
 text?: string
 size?: "sm" | "md" | "lg"
 className?: string
}

export function InlineLoader({ text, size = "md", className }: InlineLoaderProps) {
 const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
 }

 return (
  <div className={cn("flex items-center gap-3", className)}>
   <div className="relative">
    <div className={cn("rounded-full border-2 border-primary/20", sizes[size])}></div>
    <div className={cn("absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary", sizes[size])}></div>
   </div>
   {text && <span className="text-sm text-muted-foreground">{text}</span>}
  </div>
 )
}
