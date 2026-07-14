import { useQuery } from '@tanstack/react-query';
import { getSalesChartData } from '@/services/analyticsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/hooks/useArrayData";
import { useCurrency } from '@/contexts/CurrencyContext';

export function SalesChartWidget({ branchId }: { branchId?: string | null }) {
  const { currencySymbol } = useCurrency();
  const { data: salesDataRaw, isLoading } = useQuery({
    queryKey: ['salesChart', branchId],
    queryFn: () => getSalesChartData(branchId || undefined)
  });

  const salesData = ensureArray<{ name: string; total?: number }>(salesDataRaw)
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      name: String(item.name || 'Unknown'),
      total: Number(item.total || 0)
    }));

  return (
    <Card className="w-full min-w-0 overflow-hidden shadow-sm border-0 rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Sales Overview</CardTitle>
        <CardDescription className="text-muted-foreground">Revenue trend over the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent className="px-1 sm:px-6">
        <div className="min-w-0 relative overflow-hidden">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            salesData.length > 0 ? (
              <div className="h-[250px] sm:h-[350px] w-full">
                <ResponsiveContainer minWidth={1} minHeight={1}  width="100%" height="100%"  debounce={50}>
                  <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${currencySymbol}${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number | undefined) => [`${currencySymbol}${(value || 0).toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#818cf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No sales data available
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
