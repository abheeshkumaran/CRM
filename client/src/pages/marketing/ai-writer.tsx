import { copyToClipboard } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";

export default function AiWriterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [formData, setFormData] = useState({
    topic: "",
    type: "email",
    tone: "professional"
  });

  const handleGenerate = async () => {
    if (!formData.topic) {
      toast.error("Please enter a topic");
      return;
    }

    setIsLoading(true);
    setIsLoading(true);

    try {
      const response = await api.post('/ai/generate', formData);

      if (response.data?.data?.content) {
        setGeneratedContent(response.data.data.content);
        toast.success(response.data.data.isMock ? "Content generated (Mock Mode)" : "Content generated successfully!");
      } else {
        toast.error("Failed to generate content");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string; code?: string } } };
      console.error('AI Generation Error:', err);
      console.error('Error response data:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Something went wrong";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    copyToClipboard(generatedContent);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-blue-500" />
                AI Content Writer
              </h1>
              <p className="text-gray-500 mt-2">Generate high-quality marketing copy in seconds.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>Tell the AI what you need.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val) => setFormData({ ...formData, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Campaign</SelectItem>
                        <SelectItem value="social">Social Media Post</SelectItem>
                        <SelectItem value="blog">Blog Outline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select
                      value={formData.tone}
                      onValueChange={(val) => setFormData({ ...formData, tone: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="witty">Witty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Topic / Details</Label>
                    <Textarea
                      placeholder="e.g. A promotional offer for our new CRM features ending this Friday..."
                      className="h-32 resize-none"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    />
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                    onClick={handleGenerate}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle>Result</CardTitle>
                    <CardDescription>AI generated output.</CardDescription>
                  </div>
                  {generatedContent && (
                    <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy">
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  {generatedContent ? (
                    <div className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg h-full whitespace-pre-wrap text-sm border">
                      {generatedContent}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50 dark:bg-gray-900/20 p-8">
                      <Sparkles className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm text-center">Enter details and click generate to see the magic happen.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
