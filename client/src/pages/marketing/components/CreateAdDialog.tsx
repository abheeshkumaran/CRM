import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface CreateAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: { integrations?: { meta?: { pageId?: string } } };
}

export function CreateAdDialog({ open, onOpenChange, organisation }: CreateAdDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    campaign: {
      name: '',
      objective: 'OUTCOME_LEADS'
    },
    adSet: {
      name: '',
      dailyBudget: 500, // In cents, so $5.00
      targeting: {
        geo_locations: { countries: ['IN'] },
        age_min: 18,
        publisher_platforms: ['facebook', 'instagram']
      }
    },
    creative: {
      name: '',
      message: '',
      link: '',
      imageUrl: ''
    },
    ad: {
      name: ''
    }
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        campaign: formData.campaign,
        adSet: {
          ...formData.adSet,
          dailyBudget: formData.adSet.dailyBudget * 100 // Convert to cents if needed, Meta usually takes cents
        },
        creative: {
          ...formData.creative,
          pageId: organisation?.integrations?.meta?.pageId
        },
        ad: {
          ...formData.ad,
          name: formData.ad.name || `${formData.campaign.name} - Ad`
        }
      };

      await api.post('/ads/meta/campaigns', payload);
      toast.success("Ad campaign created successfully!");
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      onOpenChange(false);
      setStep(1);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Ad creation error:', err);
      toast.error(err.response?.data?.message || "Failed to create ad campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Ad Campaign</DialogTitle>
          <DialogDescription>
            Launch a new ad campaign on Facebook & Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${step === i ? 'bg-[#1877F2] text-white' : step > i ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {step > i ? <Check className="h-4 w-4" /> : i}
                </div>
                {i < 4 && <div className={`h-[2px] w-12 mx-2 ${step > i ? 'bg-green-100' : 'bg-gray-100'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g. Summer Sale 2024"
                  value={formData.campaign.name}
                  onChange={(e) => setFormData({ ...formData, campaign: { ...formData.campaign, name: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="objective">Objective</Label>
                <Select
                  value={formData.campaign.objective}
                  onValueChange={(val) => setFormData({ ...formData, campaign: { ...formData.campaign, objective: val } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select objective" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
                    <SelectItem value="OUTCOME_TRAFFIC">Traffic</SelectItem>
                    <SelectItem value="OUTCOME_AWARENESS">Awareness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <Label htmlFor="adSetName">Ad Set Name</Label>
                <Input
                  id="adSetName"
                  placeholder="e.g. Tech Professionals - IN"
                  value={formData.adSet.name}
                  onChange={(e) => setFormData({ ...formData, adSet: { ...formData.adSet, name: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Daily Budget (₹)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="5.00"
                  value={formData.adSet.dailyBudget}
                  onChange={(e) => setFormData({ ...formData, adSet: { ...formData.adSet, dailyBudget: Number(e.target.value) } })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <Label htmlFor="message">Primary Text</Label>
                <Textarea
                  id="message"
                  placeholder="What should it say?"
                  value={formData.creative.message}
                  onChange={(e) => setFormData({ ...formData, creative: { ...formData.creative, message: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">Website URL</Label>
                <Input
                  id="link"
                  placeholder="https://example.com"
                  value={formData.creative.link}
                  onChange={(e) => setFormData({ ...formData, creative: { ...formData.creative, link: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={formData.creative.imageUrl}
                  onChange={(e) => setFormData({ ...formData, creative: { ...formData.creative, imageUrl: e.target.value } })}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="rounded-lg border p-4 bg-gray-50 space-y-2">
                <p className="text-sm"><strong>Campaign:</strong> {formData.campaign.name}</p>
                <p className="text-sm"><strong>Budget:</strong> ${formData.adSet.dailyBudget}/day</p>
                <p className="text-sm"><strong>Platform:</strong> Facebook, Instagram</p>
              </div>
              <p className="text-xs text-gray-500 italic">
                Note: Your ad will be created in <b>PAUSED</b> status. You can review and activate it in Meta Ads Manager.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button variant="ghost" onClick={() => step === 1 ? onOpenChange(false) : handleBack()}>
            {step === 1 ? 'Cancel' : <><ArrowLeft className="mr-2 h-4 w-4" /> Back</>}
          </Button>
          <Button
            className="bg-[#1877F2] hover:bg-[#166fe5]"
            onClick={step === 4 ? handleSubmit : handleNext}
            disabled={loading || (step === 1 && !formData.campaign.name)}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
            ) : step === 4 ? (
              'Launch Ad'
            ) : (
              <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
