import { BulkImportLeads } from "@/components/organisation/BulkImportLeads"

export default function BulkImportSettingsPage() {
  return (
    <div className="space-y-6 container mx-auto p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Lead Import</h1>
          <p className="text-gray-500">Easily import your leads via CSV or Excel.</p>
        </div>

        <BulkImportLeads />
      </div>
    </div>
  )
}
