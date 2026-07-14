import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, PieChart, Users, CalendarCheck, Phone, TrendingUp, FileText, PhoneCall, Trophy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { isAdmin, isManager } from "@/lib/utils";

export default function ReportsPage() {
  const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const showAuditLogs = isAdmin(user) || isManager(user);
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-2">View analytics and generate reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Leads Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Leads</h2>
          </div>
          <div className="space-y-2">
            <ReportLink to="/leads?view=no-activity-leads" label="No Activity Leads" />
            <ReportLink to="/leads?view=today-leads" label="Today's Leads" />
            <ReportLink to="/leads?view=leads-by-status" label="Leads by Status" />
            <ReportLink to="/leads?view=leads-by-source" label="Leads by Source" />
            <ReportLink to="/leads?view=leads-by-ownership" label="Leads by Ownership" />
            <ReportLink to="/leads?view=converted-leads" label="Converted Leads" />
            <ReportLink to="/leads?view=lost-leads" label="Lost Leads" />
            <ReportLink to="/reports/lead-distribution" label="Lead Distribution Report" />
          </div>
        </div>

        {/* Follow Ups Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Follow Ups</h2>
          </div>
          <div className="space-y-2">
            <ReportLink to="/follow-ups?filter=overdue" label="Overdue Follow Ups" />
            <ReportLink to="/follow-ups?filter=today" label="Today's Follow Ups" />
            <ReportLink to="/follow-ups?filter=upcoming" label="Upcoming Follow Ups" />
            <ReportLink to="/follow-ups" label="All Follow Ups" />
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Existing/Other Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/reports/analytics">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <BarChart3 className="text-primary h-5 w-5" />
              </div>
              <CardTitle>Global Analytics</CardTitle>
              <CardDescription>Overall breakdown of system performance.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/reports/campaigns">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <PieChart className="text-primary h-5 w-5" />
              </div>
              <CardTitle>Campaign Reports</CardTitle>
              <CardDescription>Email marketing performance.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/reports/field-force">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Users className="text-primary h-5 w-5" />
              </div>
              <CardTitle>Field Force Activity</CardTitle>
              <CardDescription>Field agent tracking.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/reports/sales-book">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <CalendarCheck className="text-primary h-5 w-5" />
              </div>
              <CardTitle>Sales Book</CardTitle>
              <CardDescription>Detailed transaction log.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/reports/user-sales">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <TrendingUp className="text-primary h-5 w-5" />
              </div>
              <CardTitle>User Sales Report</CardTitle>
              <CardDescription>Performance leaderboard.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {showAuditLogs && (
          <Link to="/reports/audit-logs">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <FileText className="text-primary h-5 w-5" />
                </div>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>System activity and user actions.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        <Link to="/reports/user-total">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-blue-500/20 bg-blue-500/5 ring-1 ring-blue-500/10">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                <Trophy className="text-blue-600 h-5 w-5" />
              </div>
              <CardTitle>User Total Report</CardTitle>
              <CardDescription>Individual performance, efficiency metrics, and PDF exports.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/reports/daily">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-purple-500/20 bg-purple-500/5 ring-1 ring-purple-500/10">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                <BarChart3 className="text-purple-600 h-5 w-5" />
              </div>
              <CardTitle>Daily Report</CardTitle>
              <CardDescription>Today's exact call and conversion metrics at a glance.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function ReportLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="block p-3 rounded-md hover:bg-muted transition-colors text-sm font-medium">
      {label}
    </Link>
  );
}
