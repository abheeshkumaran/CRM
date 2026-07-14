import { useState, useEffect } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Users, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/services/api"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isAdmin } from "@/lib/utils"

export default function BulkImportLeadsPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("none")
  const [applyAssignmentRules, setApplyAssignmentRules] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  // Re-enquiry handling: 'flag_as_reenquiry' = log as re-enquiry (default), 'skip' = silently skip duplicates
  const [duplicateAction, setDuplicateAction] = useState<'flag_as_reenquiry' | 'skip'>('flag_as_reenquiry')

  const [user] = useState(() => {
    const str = localStorage.getItem('userInfo')
    return str ? JSON.parse(str) : null
  })
  const isAdminUser = isAdmin(user)
  const [managedBranchIds, setManagedBranchIds] = useState<string[]>([])
  
  // Check if user is a branch manager - only show config if admin OR has managed branches
  const canConfigureImport = isAdminUser || managedBranchIds.length > 0

  useEffect(() => {
    // Only fetch branches for admins or potential branch managers
    if (isAdminUser) {
      fetchBranches()
    } else {
      // Check if user is a branch manager
      checkBranchManager()
    }
    fetchUsers()
  }, [])

  const fetchBranches = async () => {
    try {
      const response = await api.get("/branches")
      setBranches(response.data || [])
    } catch (error) {
      console.error("Failed to fetch branches", error)
    }
  }

  const checkBranchManager = async () => {
    try {
      const response = await api.get('/users/my-team')
      const managed = response.data?.managedBranches || []
      if (managed.length > 0) {
        setBranches(managed)
        setManagedBranchIds(managed.map((b: any) => b.id))
        if (managed.length === 1) {
          setSelectedBranch(managed[0].id)
          setApplyAssignmentRules(true)
        }
      }
    } catch (error) {
      console.error("Failed to check branch manager status", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      const users = response.data?.users || []
      // Filter out self
      setAvailableUsers(users.filter((u: any) => u.id !== user?.id))
    } catch (error) {
      console.error("Failed to fetch users", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const isCSV = selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")
      const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls") || 
              selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
              selectedFile.type === "application/vnd.ms-excel"
      
      if (!isCSV && !isExcel) {
        toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
        return
      }
      setFile(selectedFile)
      toast.success("File selected: " + selectedFile.name)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file to import")
      return
    }

    setIsImporting(true)

    const formData = new FormData()
    formData.append("file", file)
    
    // Simple mapping for standard lead fields
    const mapping = {
      "First Name": "firstName",
      "firstName": "firstName",
      "Firstname": "firstName",
      "Last Name": "lastName",
      "lastName": "lastName",
      "Lastname": "lastName",
      "Email": "email",
      "email": "email",
      "Phone": "phone",
      "phone": "phone",
      "Mobile": "phone",
      "Company": "company",
      "company": "company",
      "Organization": "company",
      "Job Title": "jobTitle",
      "jobTitle": "jobTitle",
      "Designation": "jobTitle",
      "Lead Source": "source",
      "source": "source",
      "Lead Source Details": "source",
      "Status": "status",
      "status": "status",
      "Lead Status": "status",
      "Stage": "stage",
      "stage": "stage",
      "Lead Stage": "stage",
      "Owner Email": "ownerEmail",
      "ownerEmail": "ownerEmail",
      "Owner": "ownerEmail",
      "Assigned To": "ownerEmail",
      "Lead Score": "leadScore",
      "leadScore": "leadScore",
      "Score": "leadScore",
      "Potential Value": "potentialValue",
      "potentialValue": "potentialValue",
      "Value": "potentialValue",
      "City": "address.city",
      "State": "address.state",
      "Country": "address.country",
      "country": "address.country"
    }
    
    formData.append("mapping", JSON.stringify(mapping))
    formData.append("defaultStatus", "new")
    
    if (selectedBranch && selectedBranch !== "none") {
      formData.append("branchId", selectedBranch)
    }
    if (applyAssignmentRules) {
      formData.append("applyAssignmentRules", "true")
    }
    if (selectedUserIds.length > 0) {
      formData.append("splitUserIds", JSON.stringify(selectedUserIds))
    }
    // Only org admins can control duplicate handling — for others, default applies
    if (isAdminUser) {
      formData.append("duplicateAction", duplicateAction)
    }

    try {
      await api.post("/import/leads", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      toast.success("Import started successfully! You will be notified when complete.")
      navigate("/leads")
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error("Import failed", error)
      toast.error(error.response?.data?.message || "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Company", "Job Title", "Lead Source", "Status", "City", "State", "Country"]
    const csvContent = headers.join(",") + "\n" + "John,Doe,john@example.com,+1234567890,Acme Corp,Manager,Website,new,New York,NY,USA"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lead_import_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Template downloaded!")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bulk Import Leads</h1>
              <p className="text-muted-foreground">Upload a CSV or Excel file to import leads in bulk</p>
            </div>

            {/* Instructions */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">How to Import Leads</h3>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                      <li>Download the CSV template below</li>
                      <li>Fill in your lead data (First Name, Last Name, Email, Phone are recommended)</li>
                      <li>
                        <span className="font-bold text-red-600 dark:text-red-400">Recommendation:</span> Use <strong>Excel (.xlsx)</strong> for best results with phone numbers.
                      </li>
                      <li>If using CSV, ensure the Phone column is formatted as <strong>Text</strong> (not Number) to avoid scientific notation.</li>
                      <li>Upload the completed file and click Import Leads.</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Template */}
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Download Template</CardTitle>
                <CardDescription>Get the CSV template with the correct format</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </CardContent>
            </Card>

            {/* Upload File */}
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Upload File</CardTitle>
                <CardDescription>Select your CSV or Excel file with lead data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                      <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                        <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      {file ? (
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Click to change file</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm font-medium">Click to upload or drag and drop</p>
                          <p className="text-xs text-muted-foreground">CSV or Excel files (.csv, .xlsx, .xls)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration - Only for Admins and Branch Managers */}
            {canConfigureImport && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Step 3: Configure Import</CardTitle>
                    <CardDescription>Set branch and assignment preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target Branch (Optional)</Label>
                      <Select value={selectedBranch || "none"} onValueChange={(val) => setSelectedBranch(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Branch (Default: All/Head Office)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Branch (Head Office)</SelectItem>
                          {branches.map((branch: any) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Leads will be assigned to this branch</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="apply-rules"
                          checked={applyAssignmentRules}
                          onChange={e => setApplyAssignmentRules(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="apply-rules" className="cursor-pointer">
                          Apply Assignment Rules
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-7">
                        {applyAssignmentRules
                          ? "Leads will be distributed according to active assignment rules"
                          : "Leads will be assigned to you by default"
                        }
                      </p>
                    </div>

                    {availableUsers.length > 0 && (
                      <div className="space-y-3 pl-7 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm font-semibold">Split Leads Between Users (Round Robin)</Label>
                          {selectedUserIds.length > 0 && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                              Overrides Rules
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border rounded-md bg-gray-50/50 dark:bg-gray-900/50">
                          {availableUsers.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`user-${u.id}`}
                                checked={selectedUserIds.includes(u.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUserIds([...selectedUserIds, u.id])
                                  } else {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== u.id))
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-gray-300"
                              />
                              <label
                                htmlFor={`user-${u.id}`}
                                className="text-xs cursor-pointer truncate font-medium"
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
                  </CardContent>
                </Card>

                {/* Re-enquiry Handling - Only for Org Admins */}
                {isAdminUser && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-orange-500" />
                        Re-enquiry Handling
                      </CardTitle>
                      <CardDescription>
                        Choose how duplicate leads (same phone or email already in the system) should be handled during import
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          duplicateAction === 'flag_as_reenquiry'
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicateAction"
                          value="flag_as_reenquiry"
                          checked={duplicateAction === 'flag_as_reenquiry'}
                          onChange={() => setDuplicateAction('flag_as_reenquiry')}
                          className="mt-0.5 h-4 w-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Flag as Re-enquiry <span className="text-xs font-normal text-muted-foreground ml-1">(Recommended)</span></p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            If a lead already exists with the same phone or email, it will be updated and logged as a re-enquiry. The existing lead record is preserved and an activity is added.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          duplicateAction === 'skip'
                            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicateAction"
                          value="skip"
                          checked={duplicateAction === 'skip'}
                          onChange={() => setDuplicateAction('skip')}
                          className="mt-0.5 h-4 w-4 text-orange-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Skip Duplicates</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Duplicate leads will be silently ignored — no re-enquiry will be created and the existing lead will not be modified. You will be told how many were skipped in the import summary.
                          </p>
                        </div>
                      </label>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Import Button */}
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-6">
                <Button 
                  onClick={handleImport} 
                  disabled={!file || isImporting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {isImporting ? (
                    <>
                      <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Import Leads
                    </>
                  )}
                </Button>
                {file && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Ready to import. The process will run in the background and you'll be notified when complete.
                      {!canConfigureImport && " Leads will be assigned to you by default."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
