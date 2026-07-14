
import { useNavigate } from "react-router-dom"
import { QuickAddLeadDialog } from "@/components/shared/QuickAddLeadDialog"

export default function CreateLeadPage() {
  const navigate = useNavigate()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate('/leads')
    }
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      {/* Open by default, handle close by navigating back */}
      <QuickAddLeadDialog open={true} onOpenChange={handleOpenChange}>
        {/* 
         QuickAddLeadDialog requires a child (trigger), 
         but since we are controlling 'open', we can pass a dummy or 
         perhaps a "Loading..." text if it flashes. 
         However, since it renders DialogTrigger, we want to hide it mostly.
        */}
        <div />
      </QuickAddLeadDialog>
    </div>
  )
}
