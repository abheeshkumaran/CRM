import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { Badge } from "@/components/ui/badge";

interface StatusCellProps {
  statusId: string;
}

export const StatusCell = ({ statusId }: StatusCellProps) => {
  const { getStatusDetails, isLoading } = useLeadStatuses();
  
  if (isLoading) {
    return <Badge variant="outline" className="animate-pulse">Loading...</Badge>;
  }

  const { label, color } = getStatusDetails(statusId);

  return (
    <Badge 
      variant="outline" 
      className="capitalize"
      style={{ 
        backgroundColor: `${color}15`, // 15% opacity for background
        color: color,
        borderColor: `${color}30` // 30% opacity for border
      }}
    >
      {label}
    </Badge>
  );
};
