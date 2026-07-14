import { useState } from "react"
import { MoreHorizontal, Eye, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EMIDetailsDialog } from "./EMIDetailsDialog"
import { type EMISchedule } from "./columns"

interface EMIActionsProps {
  schedule: EMISchedule
}

export function EMIActions({ schedule }: EMIActionsProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowDetails(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showDetails && (
        <EMIDetailsDialog
          schedule={schedule}
          open={showDetails}
          onOpenChange={setShowDetails}
        />
      )}
    </>
  )
}
