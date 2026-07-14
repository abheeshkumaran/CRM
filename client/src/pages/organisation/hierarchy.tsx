
import { useQuery } from "@tanstack/react-query"
import { api } from "@/services/api"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  User as UserIcon,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Mail
} from "lucide-react"
import { getAssetUrl } from "@/lib/utils"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AssignLeadDialog } from "@/components/organisation/AssignLeadDialog"


// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  role: { id: string; name: string };
  reportsTo?: { id: string; firstName: string; lastName: string };
  image?: string;
}

interface TreeNode extends User {
  children: TreeNode[];
}

// Recursive function to build tree
const buildTree = (users: User[]): TreeNode[] => {
  if (!Array.isArray(users)) {
    console.error('buildTree received non-array users:', users);
    return [];
  }
  const userMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Initialize map
  users.forEach(user => {
    // Fallback for ID if backend sends _id
    const userId = user.id || (user as User & { _id?: string })._id;
    if (!userId) {
      console.warn('User missing ID:', user);
      return;
    }
    userMap.set(userId, { ...user, id: userId, children: [] });
  });

  // Build hierarchy
  users.forEach(user => {
    const userId = user.id || (user as User & { _id?: string })._id;
    if (!userId || !userMap.has(userId)) return;

    const node = userMap.get(userId)!;

    // Handle reportsTo mapping (check both id and _id)
    const managerData = user.reportsTo;
    const managerId = managerData?.id || (managerData as { id: string; firstName: string; lastName: string } & { _id?: string })?._id;

    if (managerId && userMap.has(managerId)) {
      const parent = userMap.get(managerId)!;
      // Prevent circular structure or self-reference just in case
      if (parent.id !== node.id) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// Tree Node Component
const OrgNode = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
  const [expanded, setExpanded] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const hasChildren = node.children.length > 0;
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      {/* User Card */}
      <div className={`relative group z-10 transition-all duration-300 ${level > 0 ? 'mt-8' : ''}`}>
        {/* Connecting Line from Parent */}
        {level > 0 && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-px bg-border group-hover:bg-primary/50 transition-colors" />
        )}

        <Card className="w-72 relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
                  <AvatarImage
                    src={getAssetUrl(node.image)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {node.firstName[0]}{node.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm truncate w-40">
                    {node.firstName} {node.lastName}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {(node.position || (typeof node.role === 'object' ? node.role?.name : node.role)) || 'Unknown'}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/users/${node.id}`)}>
                    View Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={() => setIsAssignDialogOpen(true)}>
                    Assign Leads
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <AssignLeadDialog
              open={isAssignDialogOpen}
              onOpenChange={setIsAssignDialogOpen}
              assigneeId={node.id}
              assigneeName={`${node.firstName} ${node.lastName}`}
            />

            {/* Additional Info on Hover/Expand */}
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3" />
                {node.email}
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                {hasChildren && (
                  <span className="bg-secondary/50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    {node.children.length} Reports
                  </span>
                )}
              </div>
            </div>

            {/* Expand Button */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-0 left-0 right-0 h-4 bg-muted/20 hover:bg-muted/50 rounded-none w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recursively Render Children */}
      {hasChildren && expanded && (
        <div className="relative flex items-start justify-center gap-8 mt-4 pt-4">
          {/* Horizontal Connecting Line */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-[calc(50%-50%+9rem)] right-[calc(50%-50%+9rem)] h-px bg-border" style={{
              left: `calc(50% - ${(node.children.length - 1) * 160}px + 9rem)`, // Rough center alignment math
              width: `${(node.children.length - 1) * 320}px`
            }} />
          )}

          <div className="flex gap-8">
            {node.children.map(child => (
              <OrgNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HierarchyPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['hierarchy-users', 'includeInactive'],
    queryFn: async () => {
      const res = await api.get('/users?includeInactive=true');
      // Handle various response formats
      // If api wrapper auto-extracts .data, res might BE the data directly
      const data = res.data ?? res; // Use res.data if exists, else res itself

      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.users)) return data.users;

      console.error('Unexpected API response format:', data);
      return [];
    }
  });

  const tree = useMemo(() => {
    // If users is somehow an object (error case), fallback to empty
    if (!users || !Array.isArray(users)) {
      return [];
    }
    const result = buildTree(users);

    return result;
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-8">
          <div className="min-w-max pb-20">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                Organisation Structure
              </h1>
              <p className="text-gray-500 mt-2">
                Visualise reporting lines and team hierarchy.
              </p>
            </div>

            {tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                  <UserIcon className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium">No Users Found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Add users and assign their "Reports To" manager to generate the hierarchy chart.
                </p>
              </div>
            ) : (
              <div className="flex justify-center gap-8 flex-wrap">
                {tree.map(root => (
                  <OrgNode key={root.id} node={root} />
                ))}
              </div>
            )}

            {/* Legend / Tips */}
            <div className="fixed bottom-6 right-6 p-4 bg-white/80 dark:bg-black/80 backdrop-blur border rounded-lg shadow-sm text-xs text-muted-foreground hidden lg:block">
              <p>Tip: Click the bottom bar of a card to expand/collapse.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
