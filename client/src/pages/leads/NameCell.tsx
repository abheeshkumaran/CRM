import { useNavigate } from "react-router-dom"
import { type Lead } from "@/services/leadService"

export const NameCell = ({ lead }: { lead: Lead }) => {
  const navigate = useNavigate()
  return (
    <div
      className="font-medium cursor-pointer hover:underline text-indigo-400"
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/leads/${lead.id}`)
      }}
    >
      {lead.firstName} {lead.lastName || ''}
    </div>
  )
}
