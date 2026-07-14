
import { useState, useEffect } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Check, Loader2, Download, FileText } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/services/api"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { isAdmin } from "@/lib/utils"

interface PipelineStage {
  name: string;
  id?: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[] | string[];
}

const CRM_TEMPLATES = [
  { label: "Custom CSV", value: "custom" },
  { label: "Salesforce", value: "salesforce" },
  { label: "HubSpot", value: "hubspot" },
  { label: "Zoho CRM", value: "zoho" },
  { label: "Pipedrive", value: "pipedrive" },
  { label: "Microsoft Dynamics", value: "dynamics" },
  { label: "Freshsales", value: "freshsales" },
]

const CRM_FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  salesforce: {
    "FirstName": "firstName",
    "LastName": "lastName",
    "Email": "email",
    "Phone": "phone",
    "Company": "company",
    "Title": "jobTitle",
    "LeadSource": "source",
    "Status": "status",
    "Street": "address.street",
    "City": "address.city",
    "State": "address.state",
    "Country": "address.country",
    "PostalCode": "address.zipCode",
  },
  hubspot: {
    "First Name": "firstName",
    "Last Name": "lastName",
    "Email": "email",
    "Phone Number": "phone",
    "Company Name": "company",
    "Job Title": "jobTitle",
    "Lead Status": "status",
    "Street Address": "address.street",
    "City": "address.city",
    "State/Region": "address.state",
    "Country/Region": "address.country",
    "Postal Code": "address.zipCode",
  },
  zoho: {
    "First Name": "firstName",
    "Last Name": "lastName",
    "Email": "email",
    "Phone": "phone",
    "Company": "company",
    "Designation": "jobTitle",
    "Lead Source": "source",
    "Lead Status": "status",
    "Street": "address.street",
    "City": "address.city",
    "State": "address.state",
    "Country": "address.country",
    "Zip Code": "address.zipCode",
  },
  pipedrive: {
    "Name": "fullName",
    "Email": "email",
    "Phone": "phone",
    "Organization": "company",
    "Job Title": "jobTitle",
    "Status": "status",
    "Address": "address.street",
    "City": "address.city",
    "State": "address.state",
    "Country": "address.country",
    "Postal Code": "address.zipCode",
  },
}

const CRM_FIELDS = [
  { label: "First Name", value: "firstName", required: true },
  { label: "Last Name", value: "lastName", required: false },
  { label: "Full Name (will split)", value: "fullName", required: false },
  { label: "Email", value: "email", required: false },
  { label: "Phone", value: "phone", required: true },
  { label: "Company", value: "company", required: false },
  { label: "Job Title", value: "jobTitle", required: false },
  { label: "Lead Source", value: "source", required: false },
  { label: "Lead Status", value: "status", required: false },
  { label: "Pipeline Stage", value: "stage", required: false },
  { label: "Owner Email", value: "ownerEmail", required: false },
  { label: "Assigned To ID", value: "assignedToId", required: false },
  { label: "Street Address", value: "address.street", required: false },
  { label: "City", value: "address.city", required: false },
  { label: "State", value: "address.state", required: false },
  { label: "Country", value: "address.country", required: false },
  { label: "Zip Code", value: "address.zipCode", required: false },
  { label: "Tags (comma-separated)", value: "tags", required: false },
  { label: "Notes", value: "notes", required: false },
]

const LEAD_STATUSES = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Nurturing", value: "nurturing" },
]

export default function ImportPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Upload, 2: Map, 3: Configure
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<Record<string, string | number | boolean | null>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [isImporting, setIsImporting] = useState(false)
  const [crmTemplate, setCrmTemplate] = useState<string>("custom")
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>("")
  const [selectedStage, setSelectedStage] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("new")
  const [pipelineStages, setPipelineStages] = useState<(PipelineStage | string)[]>([])
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("")
  const [applyAssignmentRules, setApplyAssignmentRules] = useState(false)

  // User info for branch manager detection
  const [user] = useState(() => {
    const str = localStorage.getItem('userInfo')
    return str ? JSON.parse(str) : null
  })
  const isAdminUser = isAdmin(user)
  const [managedBranchIds, setManagedBranchIds] = useState<string[]>([])

  useEffect(() => {
    fetchPipelines()
    fetchBranches()
  }, [])

  useEffect(() => {
    if (selectedPipeline) {
      const pipeline = pipelines.find(p => p.id === selectedPipeline)
      if (pipeline?.stages) {
        setPipelineStages(Array.isArray(pipeline.stages) ? pipeline.stages : [])
      } else {
        setPipelineStages([])
      }
    } else {
      setPipelineStages([])
    }
  }, [selectedPipeline, pipelines])

  const fetchPipelines = async () => {
    try {
      const response = await api.get("/pipelines")
      setPipelines(response.data || [])
    } catch (error) {
      console.error("Failed to fetch pipelines", error)
    }
  }

  const fetchBranches = async () => {
    try {
      if (isAdminUser) {
        const response = await api.get("/branches")
        setBranches(response.data || [])
      } else {
        // Branch managers: fetch managed branches only
        const response = await api.get('/users/my-team')
        const managed = response.data?.managedBranches || []
        setBranches(managed)
        setManagedBranchIds(managed.map((b: any) => b.id))
        // Auto-select first managed branch
        if (managed.length === 1) {
          setSelectedBranch(managed[0].id)
          setApplyAssignmentRules(true) // auto-enable for branch managers
        } else if (managed.length > 0) {
          setSelectedBranch(managed[0].id)
          setApplyAssignmentRules(true)
        }
      }
    } catch (error) {
      console.error("Failed to fetch branches", error)
    }
  }

  // Handling file selection
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
      parseFile(selectedFile, crmTemplate)
    }
  }

  const handleTemplateChange = (template: string) => {
    setCrmTemplate(template)
    if (file) {
      parseFile(file, template)
    }
  }

  const parseFile = (file: File, template: string = "custom") => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    
    if (isExcel) {
      // Parse Excel file
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
          
          if (jsonData.length === 0) {
            toast.error("Excel file is empty")
            return
          }
          
          // First row is headers
          const headers = jsonData[0].map(h => String(h || ""))
          // Next 5 rows are preview data
          const previewRows = jsonData.slice(1, 6).map(row => {
            const obj: Record<string, string | number | boolean | null> = {}
            headers.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? row[index] : null
            })
            return obj
          })
          
          setHeaders(headers)
          setPreviewData(previewRows)
          
          // Auto-map based on template or fuzzy matching
          const initialMapping: Record<string, string> = {}
          const templateMapping = CRM_FIELD_MAPPINGS[template] || {}

          headers.forEach(header => {
            // First try exact template match
            if (templateMapping[header]) {
              initialMapping[header] = templateMapping[header]
            } else {
              // Fallback to fuzzy matching
              const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
              const match = CRM_FIELDS.find(f =>
                f.label.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedHeader ||
                f.value.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedHeader
              )
              if (match) {
                initialMapping[header] = match.value
              }
            }
          })
          setMapping(initialMapping)
          setStep(2)
        } catch (error) {
          console.error("Error parsing Excel:", error)
          toast.error("Error parsing Excel file")
        }
      }
      reader.readAsBinaryString(file)
    } else {
      // Parse CSV file
      Papa.parse(file, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields)
            setPreviewData(results.data as Record<string, string | number | boolean | null>[])

            // Auto-map based on template or fuzzy matching
            const initialMapping: Record<string, string> = {}
            const templateMapping = CRM_FIELD_MAPPINGS[template] || {}

            results.meta.fields.forEach(header => {
              // First try exact template match
              if (templateMapping[header]) {
                initialMapping[header] = templateMapping[header]
              } else {
                // Fallback to fuzzy matching
                const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
                const match = CRM_FIELDS.find(f =>
                  f.label.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedHeader ||
                  f.value.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedHeader
                )
                if (match) {
                  initialMapping[header] = match.value
                }
              }
            })
            setMapping(initialMapping)
            setStep(2)
          }
        },
        error: (err) => {
          toast.error("Error parsing CSV: " + err.message)
        }
      })
    }
  }

  const handleMappingChange = (csvHeader: string, crmField: string) => {
    setMapping(prev => ({ ...prev, [csvHeader]: crmField }))
  }

  const handleImport = async () => {
    if (!file) return

    // Validate required fields
    const mappedCrmFields = Object.values(mapping)
    const missingRequired = CRM_FIELDS.filter(f => f.required && !mappedCrmFields.includes(f.value))

    if (missingRequired.length > 0) {
      toast.error(`Missing required mappings: ${missingRequired.map(f => f.label).join(", ")}`)
      return
    }

    setIsImporting(true)

    // Create FormData
    const formData = new FormData()
    formData.append("file", file)
    formData.append("mapping", JSON.stringify(mapping))
    formData.append("defaultStatus", selectedStatus)
    if (selectedPipeline) {
      formData.append("pipelineId", selectedPipeline)
    }
    if (selectedStage) {
      formData.append("defaultStage", selectedStage)
    }
    if (selectedBranch) {
      formData.append("branchId", selectedBranch)
    }
    if (applyAssignmentRules) {
      formData.append("applyAssignmentRules", "true")
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

  const downloadTemplate = (template: string) => {
    const templateHeaders: Record<string, string[]> = {
      salesforce: ["FirstName", "LastName", "Email", "Phone", "Company", "Title", "LeadSource", "Status", "Street", "City", "State", "Country", "PostalCode"],
      hubspot: ["First Name", "Last Name", "Email", "Phone Number", "Company Name", "Job Title", "Lead Status", "Street Address", "City", "State/Region", "Country/Region", "Postal Code"],
      zoho: ["First Name", "Last Name", "Email", "Phone", "Company", "Designation", "Lead Source", "Lead Status", "Street", "City", "State", "Country", "Zip Code"],
      pipedrive: ["Name", "Email", "Phone", "Organization", "Job Title", "Status", "Address", "City", "State", "Country", "Postal Code"],
      custom: ["First Name", "Last Name", "Email", "Phone", "Company", "Job Title", "Lead Source", "Lead Status", "Pipeline Stage", "Owner Email", "Street", "City", "State", "Country", "Zip Code"],
    }

    const headers = templateHeaders[template] || templateHeaders.custom
    const csvContent = headers.join(",") + "\n" + headers.map(() => "").join(",")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${template}_import_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Template downloaded!")
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM Migration & Data Import</h1>
        <p className="text-gray-500">Easily migrate from any CRM - Salesforce, HubSpot, Zoho, and more</p>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary font-semibold" : "text-gray-400"}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${step >= 1 ? "bg-primary text-white border-primary" : "border-gray-300"}`}>1</div>
          Upload
        </div>
        <div className="h-px bg-gray-300 w-12" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary font-semibold" : "text-gray-400"}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${step >= 2 ? "bg-primary text-white border-primary" : "border-gray-300"}`}>2</div>
          Map Fields
        </div>
        <div className="h-px bg-gray-300 w-12" />
        <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary font-semibold" : "text-gray-400"}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${step >= 3 ? "bg-primary text-white border-primary" : "border-gray-300"}`}>3</div>
          Configure
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select CRM Template</CardTitle>
              <CardDescription>Choose your current CRM for automatic field mapping</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CRM_TEMPLATES.map(template => (
                  <Button
                    key={template.value}
                    variant={crmTemplate === template.value ? "default" : "outline"}
                    onClick={() => handleTemplateChange(template.value)}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    {template.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                onClick={() => downloadTemplate(crmTemplate)}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download {CRM_TEMPLATES.find(t => t.value === crmTemplate)?.label} Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Upload CSV or Excel File</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-lg font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">CSV or Excel files (.csv, .xlsx, .xls) - max 10MB</p>
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Map Fields</span>
              <Button variant="outline" onClick={() => setStep(1)} size="sm">Back to Upload</Button>
            </CardTitle>
            <CardDescription>Match your CSV columns to CRM fields</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV Header</TableHead>
                    <TableHead>First Row Preview</TableHead>
                    <TableHead>CRM Field</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell className="text-gray-500 truncate max-w-[200px]">
                        {previewData[0]?.[header] || "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[header] || "ignore"}
                          onValueChange={(val) => handleMappingChange(header, val === "ignore" ? "" : val)}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Ignore Column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Ignore Column</SelectItem>
                            {CRM_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label} {field.required && "*"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700">
                Next: Configure Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Configure Import Settings</span>
              <Button variant="outline" onClick={() => setStep(2)} size="sm">Back to Mapping</Button>
            </CardTitle>
            <CardDescription>Choose where to place imported leads in your pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Default Lead Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Status for leads without a status column</p>
              </div>

              <div className="space-y-2">
                <Label>Target Branch (Optional)</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="No branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Branch</SelectItem>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Assign leads to a specific branch</p>
              </div>

              <div className="space-y-2 md:col-span-2">
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
                <p className="text-xs text-gray-500 ml-7">
                  {applyAssignmentRules
                    ? "Leads will be distributed according to active assignment rules (round-robin, top performer, etc.)"
                    : "Leads will be assigned to you (the uploader) by default"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pipeline (Optional)</Label>
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                  <SelectTrigger>
                    <SelectValue placeholder="No pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Pipeline</SelectItem>
                    {pipelines.map(pipeline => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Assign leads to a specific pipeline</p>
              </div>

              {selectedPipeline && pipelineStages.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Pipeline Stage (Optional)</Label>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific stage</SelectItem>
                      {pipelineStages.map((stage: PipelineStage | string, index: number) => {
                        const stageName = typeof stage === 'string' ? stage : stage.name;
                        return (
                          <SelectItem key={index} value={stageName}>
                            {stageName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Place leads at a specific stage in the pipeline</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Import Summary</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• File: {file?.name}</li>
                <li>• CRM Template: {CRM_TEMPLATES.find(t => t.value === crmTemplate)?.label}</li>
                <li>• Mapped Fields: {Object.keys(mapping).filter(k => mapping[k]).length}</li>
                <li>• Default Status: {LEAD_STATUSES.find(s => s.value === selectedStatus)?.label}</li>
                {selectedPipeline && <li>• Pipeline: {pipelines.find(p => p.id === selectedPipeline)?.name}</li>}
                {selectedStage && <li>• Stage: {selectedStage}</li>}
                {selectedBranch && <li>• Branch: {branches.find(b => b.id === selectedBranch)?.name}</li>}
                <li>• Assignment: {applyAssignmentRules ? '✅ Via assignment rules' : 'To you (uploader)'}</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleImport} disabled={isImporting} className="bg-green-600 hover:bg-green-700">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Start Import
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
