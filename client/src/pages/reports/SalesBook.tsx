import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesBook } from "@/services/analyticsService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "../../components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBranches } from "@/services/settingsService";
import { isAdmin as checkIsAdmin } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { api } from "@/services/api";
import { toast } from "sonner";

export default function SalesBookPage() {
  const { formatCurrency } = useCurrency();
  const [user] = useState<{ role: string } | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });

  const isAdmin = checkIsAdmin(user);

  // State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Fetch Branches (for admins)
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: !!isAdmin
  });

  // Fetch Sales Data
  const { data: sales, isLoading } = useQuery({
    queryKey: ['salesBook', startDate, endDate, selectedBranchId],
    queryFn: () => getSalesBook({
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      branchId: selectedBranchId || undefined
    })
  });

  // CSV Export
  const handleExport = () => {
    if (!sales || sales.length === 0) return;

    const headers = ["Opportunity", "Lead", "Customer", "Amount", "Close Date", "Owner"];
    const csvContent = [
      headers.join(","),
      ...sales.map((s: { opportunityName: string, leadName: string, customerName: string, amount: number, closeDate: string, ownerName: string }) => [
        `"${s.opportunityName}"`,
        `"${s.leadName}"`,
        `"${s.customerName}"`,
        s.amount,
        format(new Date(s.closeDate), "yyyy-MM-dd"),
        `"${s.ownerName}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_book_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };



  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Sales Book"
        description="Detailed record of all closed sales."
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                if (selectedBranchId) params.append('branchId', selectedBranchId);

                const response = await api.get(`/reports/export/sales?${params.toString()}`, {
                  responseType: 'blob'
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `sales_book_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                toast.error("Failed to download report");
                console.error("Download error:", error);
              }
            }}
            disabled={!sales || sales.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Excel
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">

        {/* Date Range Picker (Native) */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>

        {/* Branch Selector (Admin Only) */}
        {isAdmin && branches && branches.length > 0 && (
          <div className="w-[200px]">
            <Select
              value={selectedBranchId || "all"}
              onValueChange={(val) => setSelectedBranchId(val === "all" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: { id: string, name: string }) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {sales ? `${sales.length} records found` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">Loading...</TableCell>
                </TableRow>
              ) : sales && sales.length > 0 ? (
                sales.map((sale: {
                  id: string;
                  closeDate: string;
                  opportunityName: string;
                  leadName: string;
                  customerName: string;
                  ownerName: string;
                  branchName: string;
                  amount: number;
                  paymentStatus: string;
                  totalPaid: number;
                  hasEmi: boolean;
                  emiDetails: {
                    totalAmount: number;
                    paidAmount: number;
                    remainingAmount: number;
                    status: string;
                  } | null;
                }) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.closeDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{sale.branchName || '-'}</TableCell>
                    <TableCell className="font-medium">{sale.opportunityName}</TableCell>
                    <TableCell>{sale.leadName}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{sale.ownerName}</TableCell>
                    <TableCell>
                      {sale.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Paid
                        </span>
                      ) : (sale.paymentStatus === 'partial' || sale.paymentStatus === 'emi') ? (
                        sale.hasEmi ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            EMI ({sale.emiDetails?.status || 'active'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Partial
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold text-foreground">
                        {formatCurrency(sale.amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      {(sale.paymentStatus === 'partial' || sale.hasEmi || sale.totalPaid > 0) && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                          <div>Paid: <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.totalPaid, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                          {sale.amount - sale.totalPaid > 0 && (
                            <div>Due: <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(sale.amount - sale.totalPaid, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No sales found for the selected criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
