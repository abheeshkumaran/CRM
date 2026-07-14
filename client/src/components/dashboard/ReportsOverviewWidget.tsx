import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart3, TrendingUp, Trophy, FileText, Users, Calendar, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function ReportsOverviewWidget() {
  const reports = [
    {
      title: "Sales Book",
      description: "Transaction logs & history",
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      to: "/reports/sales-book",
      color: "bg-blue-500/10",
    },
    {
      title: "User Total",
      description: "Efficiency & metrics summary",
      icon: <Trophy className="h-5 w-5 text-blue-600" />,
      to: "/reports/user-total",
      color: "bg-blue-600/10",
    },
    {
      title: "User Sales",
      description: "Performance leaderboard",
      icon: <TrendingUp className="h-5 w-5 text-amber-500" />,
      to: "/reports/user-sales",
      color: "bg-amber-500/10",
    },
    {
      title: "Daily Report",
      description: "Today's exact metrics",
      icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
      to: "/reports/daily",
      color: "bg-purple-500/10",
    },
    {
        title: "Field Force",
        description: "Agent tracking & activity",
        icon: <Users className="h-5 w-5 text-rose-500" />,
        to: "/reports/field-force",
        color: "bg-rose-500/10",
    },
    {
        title: "Audit Logs",
        description: "System activity history",
        icon: <FileText className="h-5 w-5 text-slate-500" />,
        to: "/reports/audit-logs",
        color: "bg-slate-500/10",
    }
  ]

  return (
    <Card className="rounded-[2rem] bg-card shadow-sm border-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Quick Reports
          </CardTitle>
          <p className="text-sm text-muted-foreground">Access your most important analytics</p>
        </div>
        <Link to="/reports">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link key={report.title} to={report.to}>
              <div className="group relative flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-all hover:scale-[1.02] border border-transparent hover:border-primary/10">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${report.color}`}>
                  {report.icon}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{report.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{report.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
