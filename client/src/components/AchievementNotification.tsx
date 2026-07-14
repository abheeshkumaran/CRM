import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDailyAchievement, acknowledgeDailyNotification } from '@/services/salesTargetService'
import { useCurrency } from '@/contexts/CurrencyContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Target, TrendingUp, Calendar, Trophy, Flame } from 'lucide-react'

export function AchievementNotification() {
  const { formatCurrency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['daily-achievement'],
    queryFn: getDailyAchievement,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })

  useEffect(() => {
    if (data?.hasTarget && data?.showNotification) {
      // Small delay to ensure dashboard is loaded
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [data])

  if (!data?.hasTarget || !data?.target) return null

  const { target } = data
  const isCompleted = target.achievementPercent >= 100

  const getMessage = () => {
    if (isCompleted) return "🎉 Congratulations! You've achieved your target!"
    if (target.achievementPercent >= 75) return "🔥 You're on fire! Almost there!"
    if (target.achievementPercent >= 50) return "💪 Great progress! Keep pushing!"
    if (target.achievementPercent >= 25) return "📈 Good start! Time to accelerate!"
    return "🚀 Let's get started! You've got this!"
  }

  const getGradient = () => {
    if (isCompleted) return 'gradient-success'
    if (target.achievementPercent >= 75) return 'gradient-warning'
    if (target.achievementPercent >= 50) return 'gradient-primary'
    return 'bg-muted text-muted-foreground'
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open && data?.showNotification) {
      // Acknowledge when closed
      acknowledgeDailyNotification()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 border-none shadow-2xl">
        {/* Header with gradient */}
        <div className={`${getGradient()} p-6 text-primary-foreground`}>
          <DialogHeader>
            <DialogTitle className="text-primary-foreground text-xl flex items-center gap-2">
              {isCompleted ? <Trophy className="h-6 w-6" /> : <Target className="h-6 w-6" />}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Daily Sales Achievement Update
            </DialogDescription>
          </DialogHeader>
          <p className="mt-2 text-primary-foreground/90 text-lg font-medium">{getMessage()}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-card">
          {/* Main stat */}
          <div className="text-center">
            <div className="text-5xl font-bold text-gradient-ocean">
              {target.achievementPercent}%
            </div>
            <p className="text-muted-foreground mt-1">of your {target.period} target</p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                {formatCurrency(target.achievedValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / {formatCurrency(target.targetValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <Progress value={Math.min(target.achievementPercent, 100)} className="h-3 bg-muted" indicatorClassName="bg-primary" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Remaining</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(target.amountRemaining, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Days Left</span>
              </div>
              <p className="text-xl font-bold text-foreground">{target.daysRemaining}</p>
            </div>
          </div>

          {/* Daily target hint */}
          {!isCompleted && target.daysRemaining > 0 && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-primary">
                  Daily target: {formatCurrency(Math.ceil(target.amountRemaining / target.daysRemaining), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-sm text-primary/80 mt-1">
                Close this much daily to hit your target on time
              </p>
            </div>
          )}

          <Button
            className="w-full gradient-ocean border-0 hover:scale-[1.02] transition-transform"
            onClick={() => handleOpenChange(false)}
          >
            Let's Go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
