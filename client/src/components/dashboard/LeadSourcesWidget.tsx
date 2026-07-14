import { useQuery } from '@tanstack/react-query';
import { getLeadSourceAnalytics } from '@/services/analyticsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/hooks/useArrayData";

const COLORS = ['#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6'];

export function LeadSourcesWidget({ branchId }: { branchId?: string | null }) {
  const { data: leadSourcesRaw, isLoading } = useQuery({
    queryKey: ['leadSources', branchId],
    queryFn: () => getLeadSourceAnalytics(branchId || undefined)
  });

  const leadSources = ensureArray<{ source: string; count: number }>(leadSourcesRaw)
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      name: String(item.source || 'Unknown'),
      value: Number(item.count || 0)
    }));

  return (
    <Card className="col-span-3 min-w-0 overflow-hidden shadow-sm border-0 rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Lead Sources</CardTitle>
        <CardDescription className="text-muted-foreground">Acquisition channel distribution.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="min-w-0 relative overflow-hidden">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="h-[300px] w-[300px] rounded-full" />
            </div>
          ) : leadSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={400} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No lead source data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
