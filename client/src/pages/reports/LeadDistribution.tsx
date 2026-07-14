import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeadDistributionReport } from '@/services/analyticsService';
import { getBranches } from '@/services/settingsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Building, Filter, ArrowLeft, Loader2, Calendar, User as UserIcon, List, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAdmin as checkIsAdmin } from "@/lib/utils";
import { 
    format, 
    subDays, 
    startOfWeek, 
    endOfWeek, 
    startOfMonth, 
    endOfMonth, 
    subMonths, 
    isSameDay, 
    isAfter, 
    isBefore, 
    addMonths,
    eachDayOfInterval
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { api } from '@/services/api';
import { toast } from 'sonner';

const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
};
const getDefaultEndDate = () => new Date().toISOString().split('T')[0];

export default function LeadDistributionPage() {
    const navigate = useNavigate();
    const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
    const [endDate, setEndDate] = useState<string>(getDefaultEndDate);
    const [isExporting, setIsExporting] = useState(false);

    const hasActiveFilters = selectedBranchId !== 'all' || startDate !== getDefaultStartDate() || endDate !== getDefaultEndDate();


    const handleClearAllFilters = () => {
        setSelectedBranchId("all");
        setStartDate(getDefaultStartDate());
        setEndDate(getDefaultEndDate());
    };
    
    const [user] = useState<{ role: string } | null>(() => {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    });

    const isAdmin = checkIsAdmin(user);

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const params = new URLSearchParams();
            if (selectedBranchId && selectedBranchId !== 'all') params.append('branchId', selectedBranchId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await api.get(`/reports/export/lead-distribution?${params.toString()}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lead_distribution_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Excel report downloaded successfully");
        } catch (error) {
            toast.error("Failed to download report");
            console.error("Download error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    // Fetch Branches
    const { data: branches } = useQuery({
        queryKey: ['branches'],
        queryFn: getBranches,
        enabled: !!isAdmin
    });

    const activeFiltersList = useMemo(() => {
        const list = [];
        
        if (selectedBranchId !== 'all') {
            const found = branches?.find((b: any) => b.id === selectedBranchId);
            const label = found ? `Branch: ${found.name}` : `Branch: ${selectedBranchId}`;
            list.push({
                key: 'branch',
                label,
                clear: () => setSelectedBranchId('all')
            });
        }
        
        const defaultStart = getDefaultStartDate();
        const defaultEnd = getDefaultEndDate();
        if (startDate !== defaultStart || endDate !== defaultEnd) {
            list.push({
                key: 'date',
                label: `Date: ${startDate} to ${endDate}`,
                clear: () => {
                    setStartDate(defaultStart);
                    setEndDate(defaultEnd);
                }
            });
        }
        
        return list;
    }, [selectedBranchId, startDate, endDate, branches]);

    const { data: reportData, isLoading, refetch } = useQuery({
        queryKey: ['leadDistribution', selectedBranchId, startDate, endDate],
        queryFn: () => getLeadDistributionReport({
            branchId: selectedBranchId === "all" ? undefined : selectedBranchId,
            startDate,
            endDate
        }),
    });

    const summaryByUser = reportData?.summary?.byUser || [];
    const summaryByDate = reportData?.summary?.byDate || [];

    if (isLoading) return <PageLoader text="Loading distribution report..." />;

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Lead Distribution Report</h1>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">DATE RANGE</span>
                        <PremiumDateRangePicker 
                            startDate={startDate}
                            endDate={endDate}
                            onUpdate={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                    </div>

                    {isAdmin && branches && branches.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">BRANCH</span>
                            <div className="w-[200px]">
                                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                    <SelectTrigger className="bg-background h-10 px-4">
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-primary/60" />
                                            <SelectValue placeholder="All Branches" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <Button 
                            variant="outline" 
                            onClick={handleExportExcel} 
                            disabled={isExporting}
                            className="gap-2 h-10"
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Download Excel
                        </Button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Button 
                            variant="outline" 
                            onClick={handleClearAllFilters} 
                            disabled={!hasActiveFilters}
                            className={`gap-2 h-10 transition-all font-semibold text-xs rounded-lg ${
                                hasActiveFilters 
                                    ? 'text-destructive border-destructive/50 hover:bg-destructive/10 bg-destructive/5' 
                                    : 'text-muted-foreground/40 border-border/30 opacity-60 cursor-not-allowed bg-background/50'
                            }`}
                            title="Clear All Active Filters"
                        >
                            <X className="h-4 w-4" />
                            Clear Filters
                        </Button>
                    </div>
                </div>
            </div>

            {/* Active Filters Row */}
            {activeFiltersList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-background/40 backdrop-blur-sm rounded-xl border border-border/40 p-2.5 shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 mr-1 pl-1">
                        <Filter className="h-3.5 w-3.5 text-primary/60" />
                        ACTIVE FILTERS:
                    </span>
                    {activeFiltersList.map((filter) => (
                        <div 
                            key={filter.key}
                            className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold border border-primary/20 hover:bg-primary/15 transition-all shadow-sm"
                        >
                            <span>{filter.label}</span>
                            <button 
                                onClick={filter.clear}
                                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                title={`Clear ${filter.key} filter`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllFilters}
                        className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-full font-bold gap-1 shrink-0 ml-auto border border-destructive/20 bg-destructive/5 hover:border-destructive/30 shadow-sm transition-all"
                        title="Clear All Filters"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear All Filters
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Table */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>User-wise Distribution</CardTitle>
                        <CardDescription>Total leads distributed to each user in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead className="text-center">Leads Distributed</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryByUser.length > 0 ? (
                                    summaryByUser.map((row: any) => (
                                        <TableRow key={row.userId}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                                {row.userName}
                                            </TableCell>
                                            <TableCell>{row.branch}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="px-3 py-1 text-sm font-bold">
                                                    {row.count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            <List className="h-4 w-4" />
                                                            View Details
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Leads distributed to {row.userName}</DialogTitle>
                                                        </DialogHeader>
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Lead Name</TableHead>
                                                                    <TableHead>Phone/Email</TableHead>
                                                                    <TableHead>Source</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                    <TableHead>Distributed At</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {row.leads.map((lead: any) => (
                                                                    <TableRow key={lead.id}>
                                                                        <TableCell className="font-medium">{lead.firstName} {lead.lastName}</TableCell>
                                                                        <TableCell className="text-xs">
                                                                            <div>{lead.phone}</div>
                                                                            <div className="text-muted-foreground">{lead.email}</div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs">
                                                                            {format(new Date(lead.createdAt), 'MMM d, h:mm a')}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                            No lead distributions found for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Date-wise Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Breakdown</CardTitle>
                        <CardDescription>Total distributions per day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryByDate.length > 0 ? (
                                    summaryByDate.map((row: any) => (
                                        <TableRow key={row.date}>
                                            <TableCell className="font-medium">{format(new Date(row.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="text-right font-bold">{row.count}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground italic">
                                            No data.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface PremiumDateRangePickerProps {
    startDate: string;
    endDate: string;
    onUpdate: (start: string, end: string) => void;
}

function PremiumDateRangePicker({ startDate, endDate, onUpdate }: PremiumDateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [selectedStart, setSelectedStart] = useState<Date | null>(startDate ? new Date(startDate) : null);
    const [selectedEnd, setSelectedEnd] = useState<Date | null>(endDate ? new Date(endDate) : null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    
    // Default left calendar month view to startDate or current date
    const [leftMonth, setLeftMonth] = useState<Date>(() => {
        if (startDate) {
            return startOfMonth(new Date(startDate));
        }
        return startOfMonth(new Date());
    });
    
    const rightMonth = addMonths(leftMonth, 1);

    // Sync state when props change or popover opens
    useEffect(() => {
        if (open) {
            setSelectedStart(startDate ? new Date(startDate) : null);
            setSelectedEnd(endDate ? new Date(endDate) : null);
            if (startDate) {
                setLeftMonth(startOfMonth(new Date(startDate)));
            }
        }
    }, [open, startDate, endDate]);

    const presets = [
        { label: 'Today', getValue: () => { const t = new Date(); return { start: t, end: t }; } },
        { label: 'Yesterday', getValue: () => { const t = new Date(); const y = subDays(t, 1); return { start: y, end: y }; } },
        { label: 'Today and yesterday', getValue: () => { const t = new Date(); const y = subDays(t, 1); return { start: y, end: t }; } },
        { label: 'Last 7 days', getValue: () => { const t = new Date(); return { start: subDays(t, 6), end: t }; } },
        { label: 'Last 14 days', getValue: () => { const t = new Date(); return { start: subDays(t, 13), end: t }; } },
        { label: 'Last 28 days', getValue: () => { const t = new Date(); return { start: subDays(t, 27), end: t }; } },
        { label: 'Last 30 days', getValue: () => { const t = new Date(); return { start: subDays(t, 29), end: t }; } },
        { label: 'This week', getValue: () => { const t = new Date(); return { start: startOfWeek(t), end: t }; } },
        { label: 'Last week', getValue: () => { const t = new Date(); const prevWeek = subDays(t, 7); return { start: startOfWeek(prevWeek), end: endOfWeek(prevWeek) }; } },
        { label: 'This month', getValue: () => { const t = new Date(); return { start: startOfMonth(t), end: t }; } },
        { label: 'Last month', getValue: () => { const t = new Date(); const prevMonth = subMonths(t, 1); return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) }; } },
        { label: 'Maximum', getValue: () => { const t = new Date(); return { start: new Date(2020, 0, 1), end: t }; } },
        { label: 'Custom', getValue: () => null }
    ];

    const [activePreset, setActivePreset] = useState<string>('Last 30 days');

    const handlePresetClick = (preset: typeof presets[0]) => {
        setActivePreset(preset.label);
        const val = preset.getValue();
        if (val) {
            setSelectedStart(val.start);
            setSelectedEnd(val.end);
            setLeftMonth(startOfMonth(val.start));
        } else {
            // Custom
            setSelectedStart(null);
            setSelectedEnd(null);
        }
    };

    const handleDayClick = (day: Date) => {
        setActivePreset('Custom');
        if (!selectedStart || (selectedStart && selectedEnd)) {
            setSelectedStart(day);
            setSelectedEnd(null);
        } else if (selectedStart && !selectedEnd) {
            if (isBefore(day, selectedStart)) {
                setSelectedStart(day);
                setSelectedEnd(null);
            } else {
                setSelectedEnd(day);
            }
        }
    };

    const handleUpdate = () => {
        if (selectedStart && selectedEnd) {
            onUpdate(
                format(selectedStart, 'yyyy-MM-dd'),
                format(selectedEnd, 'yyyy-MM-dd')
            );
            setOpen(false);
        } else if (selectedStart) {
            onUpdate(
                format(selectedStart, 'yyyy-MM-dd'),
                format(selectedStart, 'yyyy-MM-dd')
            );
            setOpen(false);
        } else {
            toast.error("Please select a valid date range");
        }
    };

    const renderCalendar = (monthDate: Date) => {
        const startDay = startOfWeek(startOfMonth(monthDate));
        const endDay = endOfWeek(endOfMonth(monthDate));
        const days = eachDayOfInterval({ start: startDay, end: endDay });
        
        const monthYearStr = format(monthDate, 'MMMM yyyy');
        const [monthName, yearStr] = monthYearStr.split(' ');

        return (
            <div className="flex-1 px-4">
                <div className="text-center font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-center gap-1">
                    <span className="capitalize">{monthName}</span>
                    <span>{yearStr}</span>
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="font-semibold text-gray-400 py-1">{d}</div>
                    ))}
                    {days.map((day, idx) => {
                        const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                        const isSelectedStart = selectedStart && isSameDay(day, selectedStart);
                        const isSelectedEnd = selectedEnd && isSameDay(day, selectedEnd);
                        
                        let isInRange = false;
                        if (selectedStart && selectedEnd) {
                            isInRange = isAfter(day, selectedStart) && isBefore(day, selectedEnd);
                        } else if (selectedStart && hoverDate) {
                            isInRange = isAfter(day, selectedStart) && isBefore(day, hoverDate);
                        }

                        return (
                            <button
                                key={idx}
                                type="button"
                                disabled={!isCurrentMonth}
                                onClick={() => handleDayClick(day)}
                                onMouseEnter={() => !selectedEnd && setHoverDate(day)}
                                className={`
                                    h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all relative
                                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-700 cursor-default opacity-0' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
                                    ${isSelectedStart ? '!bg-primary !text-white z-10 shadow-md font-boldScale' : ''}
                                    ${isSelectedEnd ? '!bg-primary !text-white z-10 shadow-md font-boldScale' : ''}
                                    ${isInRange && isCurrentMonth ? 'bg-primary/10 !text-primary rounded-none w-full' : ''}
                                `}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`h-10 px-4 bg-background border-border/50 rounded-full shadow-sm hover:bg-muted/50 transition-all flex items-center gap-3 border ${open ? 'border-primary ring-2 ring-primary/20' : ''}`}
                >
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {startDate && endDate ? `${format(new Date(startDate), 'd MMM yyyy')} - ${format(new Date(endDate), 'd MMM yyyy')}` : 'Filter by Date'}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[94vw] max-w-[360px] md:w-[880px] md:max-w-none p-0 rounded-2xl shadow-2xl border border-border/40 overflow-hidden bg-white dark:bg-gray-950" align="start">
                <div className="flex flex-col md:flex-row h-auto md:h-[520px]">
                    {/* Left presets panel */}
                    <div className="w-full md:w-[200px] border-b md:border-b-0 md:border-r border-border/40 bg-gray-50/50 dark:bg-gray-900/30 p-2 overflow-x-auto md:overflow-y-auto flex flex-row md:flex-col gap-1.5 shrink-0 whitespace-nowrap scrollbar-none">
                        {presets.map(p => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => handlePresetClick(p)}
                                className={`
                                    text-left px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0
                                    ${activePreset === p.label 
                                        ? 'bg-primary/10 text-primary font-bold' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/40'}
                                `}
                            >
                                <div className={`h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border flex items-center justify-center ${activePreset === p.label ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                    {activePreset === p.label && <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-white" />}
                                </div>
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Calendars container */}
                    <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0">
                        {/* Calendars view header/nav */}
                        <div className="flex items-center justify-between mb-4 px-2 md:px-4 relative">
                            <button
                                type="button"
                                onClick={() => setLeftMonth(subMonths(leftMonth, 1))}
                                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all absolute left-0 z-10 bg-background"
                            >
                                <ChevronLeft className="h-4 w-4 text-gray-500" />
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
                                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all absolute right-0 z-10 bg-background"
                            >
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Double calendars side by side (hide second calendar on mobile) */}
                        <div className="flex flex-1 gap-6 divide-x divide-border/40">
                            {renderCalendar(leftMonth)}
                            <div className="hidden md:block md:flex-1 md:pl-6">
                                {renderCalendar(rightMonth)}
                            </div>
                        </div>

                        {/* Compare and Inputs Row */}
                        <div className="mt-4 md:mt-6 pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 md:gap-6">
                                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                                    Compare
                                </label>
                                <div className="w-[130px] md:w-[140px]">
                                    <Select defaultValue="previous_period">
                                        <SelectTrigger className="h-8 text-xs bg-background">
                                            <SelectValue placeholder="Select an item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="previous_period">Previous period</SelectItem>
                                            <SelectItem value="previous_year">Previous year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 md:gap-2">
                                <div className="border border-border/40 rounded-xl px-2.5 py-1 bg-gray-50/50 dark:bg-gray-900/30 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {selectedStart ? format(selectedStart, 'd MMM yyyy') : '-'}
                                </div>
                                <span className="text-gray-400 text-xs">-</span>
                                <div className="border border-border/40 rounded-xl px-2.5 py-1 bg-gray-50/50 dark:bg-gray-900/30 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {selectedEnd ? format(selectedEnd, 'd MMM yyyy') : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-[10px] text-gray-400 text-center sm:text-left">
                                Dates are shown in India Standard Time
                            </div>
                            <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setOpen(false)}
                                    className="h-9 px-4 rounded-xl text-xs font-bold flex-1 sm:flex-none"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={handleUpdate}
                                    className="h-9 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 flex-1 sm:flex-none"
                                >
                                    Update
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
