import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Globe } from "lucide-react";

export default function SeoSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings', 'seo'],
    queryFn: async () => {
      const res = await api.get('/super-admin/settings?group=seo');
      return res.data;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      await api.put('/super-admin/settings?group=seo', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success("SEO settings updated successfully");
    },
    onError: () => {
      toast.error("Failed to update settings");
    }
  });

  const [formData, setFormData] = useState({
    app_name: "",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    og_image: ""
  });

  // Sync form data when settings load
  if (settings && !Object.keys(formData).some(k => formData[k as keyof typeof formData])) {
    setFormData({
      app_name: settings.app_name || "PYPE CRM",
      seo_title: settings.seo_title || "PYPE - Modern CRM Solution",
      seo_description: settings.seo_description || "The ultimate CRM for sales and marketing teams.",
      seo_keywords: settings.seo_keywords || "pype crm, crm, best crm, crm software, pipe crm, pipecrm, best crm software in india",
      og_image: settings.og_image || ""
    });
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 space-y-8 bg-[#0f172a] min-h-screen text-slate-100">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO & Global Settings</h1>
        <p className="text-slate-400 mt-1">Configure global application metadata and SEO tags.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <Card className="bg-[#1e1b4b] border-indigo-900/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-400" />
              General Metadata
            </CardTitle>
            <CardDescription className="text-slate-400">
              These settings affect how your application appears in search engines and browser tabs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="app_name" className="text-slate-200">Application Name</Label>
              <Input
                id="app_name"
                name="app_name"
                value={formData.app_name}
                onChange={handleChange}
                className="bg-[#0f172a] border-indigo-900/50 text-white"
                placeholder="e.g. My CRM"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="seo_title" className="text-slate-200">Default Page Title</Label>
              <Input
                id="seo_title"
                name="seo_title"
                value={formData.seo_title}
                onChange={handleChange}
                className="bg-[#0f172a] border-indigo-900/50 text-white"
                placeholder="e.g. My CRM - Best Solution"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="seo_description" className="text-slate-200">Meta Description</Label>
              <Textarea
                id="seo_description"
                name="seo_description"
                value={formData.seo_description}
                onChange={handleChange}
                className="bg-[#0f172a] border-indigo-900/50 text-white min-h-[100px]"
                placeholder="Brief description of your application..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="seo_keywords" className="text-slate-200">Meta Keywords</Label>
              <Input
                id="seo_keywords"
                name="seo_keywords"
                value={formData.seo_keywords}
                onChange={handleChange}
                className="bg-[#0f172a] border-indigo-900/50 text-white"
                placeholder="crm, sales, marketing (comma separated)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="og_image" className="text-slate-200">OG Image URL (Social Share Image)</Label>
              <Input
                id="og_image"
                name="og_image"
                value={formData.og_image}
                onChange={handleChange}
                className="bg-[#0f172a] border-indigo-900/50 text-white"
                placeholder="https://..."
              />
              {formData.og_image && (
                <div className="mt-2 text-xs text-slate-500">
                  Preview: <br />
                  <img src={formData.og_image} alt="Preview" className="h-20 w-auto rounded border border-indigo-900/30 mt-1" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
