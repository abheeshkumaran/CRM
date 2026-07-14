import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Mail, CheckCircle2, Loader2, Unplug, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getGmailAuthUrl, getGmailStatus, disconnectGmail } from "@/services/gmailService"

export function GmailConnect() {
  const queryClient = useQueryClient()

  const { data: status, isLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: getGmailStatus,
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { authUrl } = await getGmailAuthUrl()
      // Redirect to Google OAuth consent screen
      window.location.href = authUrl
    },
    onError: () => {
      toast.error("Failed to start Gmail connection. Contact your admin.")
    }
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] })
      toast.success("Gmail disconnected successfully")
    },
    onError: () => {
      toast.error("Failed to disconnect Gmail")
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = status?.connected

  return (
    <Card className={isConnected ? "border-green-200 dark:border-green-800" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Gmail</CardTitle>
              <CardDescription className="text-xs">
                Send emails directly from your Gmail account
              </CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
              <Mail className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">{status.email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Emails sent from the CRM will be delivered from your Gmail account. Your leads and contacts will see replies from your email address.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              Disconnect Gmail
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account to send emails directly from the CRM. Your emails will be sent from your own Gmail address.
            </p>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {connectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Connect Gmail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
