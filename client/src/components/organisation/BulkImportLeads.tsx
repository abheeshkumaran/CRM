import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { importLeads, type CreateLeadData } from "@/services/leadService"
import { getBranches, getUsers } from "@/services/settingsService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { isAdmin, isBranchManager, getUserInfo } from "@/lib/utils"
import * as XLSX from 'xlsx'
import { getAssignmentRules } from "@/services/assignmentRuleService"

export function BulkImportLeads() {
  const [file, setFile] = useState<File | null>(null)
  const [previewCount, setPreviewCount] = useState<number>(0)
  const [parsedData, setParsedData] = useState<CreateLeadData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [selectedRuleId, setSelectedRuleId] = useState<string>("default")
  const [applyRules, setApplyRules] = useState<boolean>(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const queryClient = useQueryClient()
  const user = getUserInfo();
  const userBranchId = user?.branchId;

  // Allow branch selection if user is admin/super_admin OR a branch manager
  const canSelectBranch = isAdmin(user) || isBranchManager(user);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: canSelectBranch
  })

  const { data: rulesData } = useQuery({
    queryKey: ['assignment-rules', 'Lead', selectedBranchId],
    queryFn: () => getAssignmentRules('Lead', selectedBranchId === 'all_branches_placeholder' ? undefined : selectedBranchId),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-for-import'],
    queryFn: getUsers,
  })

  const branches = Array.isArray(branchesData)
    ? branchesData
    : (branchesData as any)?.branches || [];

  const rules = Array.isArray(rulesData) ? rulesData : [];
  const allUsers = Array.isArray(usersData?.users) ? usersData.users : [];

  // Filter users to only show subordinates/reachable users
  // (getUsers already filters by hierarchy on backend)
  const availableUsers = allUsers; // Include self to allow assignment to uploader as well

  const importMutation = useMutation({
    mutationFn: (data: CreateLeadData[]) => {
      // Attach branchId if selected or user has one
      const finalData = data.map(lead => ({
        ...lead,
        branchId: (selectedBranchId && selectedBranchId !== 'all_branches_placeholder')
          ? selectedBranchId
          : (userBranchId || undefined)
      }));

      return importLeads(finalData, {
        assignmentRuleId: selectedRuleId === 'default' ? undefined : selectedRuleId,
        applyAssignmentRules: applyRules,
        splitUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined
      })
    },
    onSuccess: (data) => {
      const total = (data.created || 0) + (data.reEnquiries || 0)
      const message = data.reEnquiries > 0
        ? `Successfully imported ${data.created} new leads and ${data.reEnquiries} re-enquiries`
        : `Successfully imported ${data.created} leads`
      toast.success(message)
      setFile(null)
      setParsedData([])
      setPreviewCount(0)
      setSelectedBranchId(userBranchId || "") // Reset to user's branch after successful import
      setSelectedRuleId("default")
      setApplyRules(true)
      setSelectedUserIds([])
      // Invalidate all leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', 'all'] })
    },
    onError: (err: { message: string }) => {
      toast.error(err.message || 'Failed to import leads')
      setError(err.message || 'Failed to import leads')
    }
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const fileName = selectedFile.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    if (!isCSV && !isExcel) {
      toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
      return
    }

    setFile(selectedFile)
    setError(null)

    try {
      let data: CreateLeadData[]

      if (isCSV) {
        const text = await selectedFile.text()
        data = parseCSV(text)
      } else {
        // Parse Excel file
        data = await parseExcel(selectedFile)
      }

      if (data.length === 0) {
        setError("No data found in file")
        return
      }
      setParsedData(data)
      setPreviewCount(data.length)
    } catch (err) {
      setError(`Failed to parse file. Please ensure it is valid. ${(err as Error).message}`)
      console.error(err)
    }
  }

  const parseExcel = async (file: File): Promise<CreateLeadData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false })

          const result: CreateLeadData[] = []

          for (const row of jsonData) {
            const obj: any = {}

            // Map Excel columns to lead fields (case-insensitive)
            for (const [key, value] of Object.entries(row as any)) {
              const normalizedKey = key.trim().toLowerCase()
              let mappedKey = key.trim()

              // Map common variations
              if (normalizedKey === 'first name' || normalizedKey === 'firstname') mappedKey = 'firstName'
              else if (normalizedKey === 'last name' || normalizedKey === 'lastname') mappedKey = 'lastName'
              else if (normalizedKey === 'job title' || normalizedKey === 'jobtitle') mappedKey = 'jobTitle'
              else if (normalizedKey === 'lead score' || normalizedKey === 'leadscore') mappedKey = 'leadScore'
              else if (normalizedKey === 'owner email' || normalizedKey === 'owneremail') mappedKey = 'ownerEmail'

              obj[mappedKey] = value
            }

            // Basic validation
            if (obj.firstName || obj.lastName || obj.email) {
              if (!obj.source) obj.source = 'import'
              result.push(obj as CreateLeadData)
            }
          }

          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsBinaryString(file)
    })
  }

  const parseCSV = (text: string): CreateLeadData[] => {
    const lines = text.split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const result = []

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue

      // Basic CSV regex to handle commas inside quotes would be better, but for now simple split
      // Or better: simple split but warn about limitations
      const currentLine = lines[i].split(',')

      if (currentLine.length < headers.length) continue

      const obj: Partial<CreateLeadData> = {}
      for (let j = 0; j < headers.length; j++) {
        // Remove potential quotes
        let val = currentLine[j]?.trim()
        if (val && val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1)
        }
        (obj as Record<string, unknown>)[headers[j]] = val
      }

      // Basic validation: needs at least firstName or lastName
      if (obj.firstName || obj.lastName || obj.email) {
        // Ensure source is present
        if (!obj.source) obj.source = 'import';
        result.push(obj as CreateLeadData)
      }
    }
    return result
  }

  const handleImport = () => {
    if (parsedData.length === 0) return
    importMutation.mutate(parsedData)
  }

  const handleDownloadTemplate = () => {
    const headers = "firstName,lastName,email,phone,company,jobTitle,source,leadScore,stage,ownerEmail"
    const sample = "John,Doe,john@example.com,1234567890,Acme Corp,Manager,import,10,new,admin@example.com"
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "leads_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Leads</CardTitle>
        <CardDescription>Upload a CSV or Excel file to import leads in bulk.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canSelectBranch && (
          <div className="space-y-2">
            <Label>Target Branch (Optional)</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Branch (Default: All/Head Office)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_branches_placeholder">All/Head Office</SelectItem>
                {branches.map((b: { id: string, name: string }) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Leads will be logically grouped under this branch.</p>
          </div>
        )}

        <div className="space-y-4 py-2 border-y border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="applyRules"
              checked={applyRules}
              onCheckedChange={(checked) => setApplyRules(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="applyRules"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Apply Assignment Rules
              </label>
              <p className="text-xs text-muted-foreground">
                Automatically distribute leads based on active rules.
              </p>
            </div>
          </div>

          {applyRules && (
            <div className="space-y-2 pl-6">
              <Label className="text-xs">Specific Assignment Rule (Optional)</Label>
              <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Automatic (First matching rule)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Automatic (First matching rule)</SelectItem>
                  {rules.map((rule: any) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                If selected, only this rule will be used. Leads that don't match will default to you.
              </p>
            </div>
          )}

          {availableUsers.length > 0 && (
            <div className="space-y-3 pl-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <span>Split Leads Between Users (Round Robin)</span>
                {selectedUserIds.length > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                    Overrides Rules
                  </span>
                )}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-900">
                {availableUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${u.id}`}
                      checked={selectedUserIds.includes(u.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUserIds([...selectedUserIds, u.id])
                        } else {
                          setSelectedUserIds(selectedUserIds.filter(id => id !== u.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`user-${u.id}`}
                      className="text-xs cursor-pointer truncate"
                    >
                      {u.firstName} {u.lastName}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {selectedUserIds.length > 0 
                  ? "Leads will be split among selected users (automated rules will be skipped)." 
                  : "Select users to split leads among them equally."}
              </p>
            </div>
          )}
        </div>

        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500">CSV or Excel files (.csv, .xlsx, .xls)</p>
        </div>

        <div className="flex justify-between items-center text-sm">
          <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="text-blue-600 px-0">
            <FileText className="h-4 w-4 mr-1" /> Download CSV Template
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {file && !error && (
          <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Ready to Import</AlertTitle>
            <AlertDescription>
              {file.name} - {previewCount} records found
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleImport} disabled={!file || parsedData.length === 0 || importMutation.isPending}>
            {importMutation.isPending ? "Importing..." : "Import Leads"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
