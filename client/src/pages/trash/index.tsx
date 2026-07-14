import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getTrashItems, restoreItem, permanentDelete } from "@/services/trashService"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { RefreshCw, Undo2, Trash2, LayoutGrid, Info } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { differenceInDays, addDays } from "date-fns"

interface TrashedItem {
  id: string;
  type: string;
  name: string;
  deletedAt: string;
  email?: string;
  avatar?: string;
}

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string, id: string } | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['trash'],
    queryFn: getTrashItems,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trash'] });
  };

  const handleRestore = async (type: string, id: string) => {
    setIsActionLoading(true);
    try {
      await restoreItem(type, id);
      toast.success("Item restored successfully");
      handleRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to restore item");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    setIsActionLoading(true);
    try {
      await permanentDelete(itemToDelete.type, itemToDelete.id);
      toast.success("Item permanently deleted");
      setItemToDelete(null);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete item");
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: ColumnDef<TrashedItem>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const colors: Record<string, string> = {
          Lead: "bg-blue-100 text-blue-700 border-blue-200",
          Contact: "bg-purple-100 text-purple-700 border-purple-200",
          Account: "bg-amber-100 text-amber-700 border-amber-200",
          Opportunity: "bg-emerald-100 text-emerald-700 border-emerald-200",
          User: "bg-indigo-100 text-indigo-700 border-indigo-200",
          Task: "bg-slate-100 text-slate-700 border-slate-200",
          Team: "bg-rose-100 text-rose-700 border-rose-200",
          Branch: "bg-cyan-100 text-cyan-700 border-cyan-200",
          Campaign: "bg-orange-100 text-orange-700 border-orange-200",
          Case: "bg-red-100 text-red-700 border-red-200",
          Quote: "bg-lime-100 text-lime-700 border-lime-200",
        };
        return (
          <Badge variant="outline" className={`capitalize font-semibold ${colors[type] || ""}`}>
            {type}
          </Badge>
        );
      }
    },
    {
      accessorKey: "name",
      header: "Record Details",
      cell: ({ row }) => {
        const item = row.original;
        if (item.type === 'User') {
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarImage src={item.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {item.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-bold text-foreground leading-none">{item.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{item.email}</span>
              </div>
            </div>
          );
        }
        if (item.type === 'Quote' || item.type === 'Case') {
           return (
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-none">{item.name}</span>
              <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">Ref: {item.id.slice(0, 8)}</span>
            </div>
          );
        }
        return <span className="font-bold text-foreground">{item.name}</span>;
      }
    },
    {
      accessorKey: "deletedAt",
      header: "Deleted",
      cell: ({ row }) => {
        const date = row.getValue("deletedAt") as string;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{date ? format(new Date(date), "MMM d, yyyy") : "-"}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{date ? format(new Date(date), "HH:mm a") : ""}</span>
          </div>
        );
      }
    },
    {
      id: "expires",
      header: "Purge In",
      cell: ({ row }) => {
        const deletedAt = row.original.deletedAt;
        if (!deletedAt) return "-";
        
        const purgeDate = addDays(new Date(deletedAt), 7);
        const daysLeft = differenceInDays(purgeDate, new Date());
        
        return (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${daysLeft <= 1 ? 'bg-destructive animate-pulse' : 'bg-orange-400'}`} />
            <span className={`text-sm font-bold ${daysLeft <= 1 ? 'text-destructive' : 'text-orange-600'}`}>
              {daysLeft <= 0 ? 'Today' : `${daysLeft} days`}
            </span>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-info hover:text-info hover:bg-info/10"
              onClick={() => handleRestore(item.type, item.id)}
              disabled={isActionLoading}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setItemToDelete({ type: item.type, id: item.id })}
              disabled={isActionLoading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Purge
            </Button>
          </div>
        );
      }
    }
  ];

  const trashItems = data || [];

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="flex flex-col space-y-6 min-w-0 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                Trash Folder
                <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-bold border border-destructive/20">
                  {trashItems.length}
                  <span className="text-[10px] uppercase tracking-widest opacity-70">Items</span>
                </div>
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Items are automatically purged after 7 days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-11 w-11 p-0 rounded-xl border-dashed bg-background/50 backdrop-blur-sm"
            >
              <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>
        </div>

        <Alert className="bg-amber-50 border-amber-200 text-amber-800 rounded-xl">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-bold">Data Retention Policy</AlertTitle>
          <AlertDescription>
            All items moved to the trash will be permanently deleted after 7 days. Once purged, data cannot be recovered.
          </AlertDescription>
        </Alert>

        <Card className="border-none shadow-xl shadow-foreground/5 bg-background/50 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Deleted Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={trashItems}
            />
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handlePermanentDelete}
        title="Permanent Deletion"
        description="Are you sure you want to permanently delete this item? This action cannot be undone."
        isDeleting={isActionLoading}
      />
    </div>
  );
}
