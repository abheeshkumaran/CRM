import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, CreditCard, Loader2, Sparkles, Calendar, IndianRupee, FileText, Download, Receipt } from 'lucide-react';
import { billingService } from '@/services/billingService';
import { getSubscriptionPlans, type SubscriptionPlan } from '@/services/subscriptionPlanService';
import { getUserInfo } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function BillingSettingsPage() {
  const { formatCurrency } = useCurrency();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Get Organisation info from local storage
  const user = getUserInfo();
  const organisationId = user?.organisationId || user?.organisation;

  // GST rate (18%)
  const GST_RATE = 0.18;

  // Fetch organisation data with active license
  const { data: orgData } = useQuery({
    queryKey: ['organisation', organisationId],
    queryFn: async () => {
      const res = await api.get(`/organisation`);
      return res.data;
    },
    enabled: !!organisationId
  });

  // Fetch active license
  const { data: licenseData, isLoading: isLoadingLicense, error: licenseError } = useQuery({
    queryKey: ['active-license', organisationId],
    queryFn: async () => {
      console.log('[Billing] Fetching license for org:', organisationId);
      try {
        const res = await api.get(`/licenses/current`);
        console.log('[Billing] License response:', res.data);
        return res.data;
      } catch (err: any) {
        console.error('[Billing] License fetch error:', err.response?.data || err.message);
        throw err;
      }
    },
    enabled: !!organisationId,
    retry: false
  });

  const activeLicense = licenseData?.license;
  const currentPlanDetails = activeLicense?.plan;
  const currentPlanName = currentPlanDetails?.name || 'Free / Trial';
  const userCount = licenseData?.usage?.currentUsers || 0;

  // Debug logging
  console.log('[Billing] License data:', { licenseData, activeLicense, currentPlanDetails, currentPlanName, isLoadingLicense, licenseError });

  // Calculate billing amounts
  const calculateBilling = (plan: any, license: any) => {
    if (!plan) return { baseAmount: 0, gst: 0, total: 0 };
    
    let baseAmount: number;
    
    // If custom price is set, use it (per user, no discount)
    if (license?.customPrice !== null && license?.customPrice !== undefined) {
      baseAmount = license.customPrice * userCount;
    } else {
      // Use standard plan pricing with discount
      const discount = plan.discount || 0;
      
      if (plan.pricingModel === 'flat_rate') {
        baseAmount = plan.price;
      } else {
        baseAmount = (plan.price || 0) + (plan.pricePerUser || 0) * userCount;
      }
      
      if (discount > 0) {
        baseAmount = Math.round(baseAmount * (1 - discount / 100));
      }
    }
    
    const gst = Math.round(baseAmount * GST_RATE);
    const total = baseAmount + gst;
    
    return { baseAmount, gst, total };
  };

  const billing = useMemo(() => calculateBilling(currentPlanDetails, activeLicense), [currentPlanDetails, activeLicense, userCount]);

  // Fetch Plans from API
  const { data, isLoading: arePlansLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: getSubscriptionPlans
  });

  // Filter out Trail plan - only show Enterprise plan
  const plans = useMemo(() => {
    const allPlans = data?.plans || [];
    return allPlans.filter((plan: SubscriptionPlan) => 
      !plan.name.toLowerCase().includes('trail') && 
      !plan.name.toLowerCase().includes('trial')
    );
  }, [data]);

  const daysRemaining = activeLicense ? Math.ceil((new Date(activeLicense.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  useEffect(() => {
    if (searchParams.get('success')) {
      toast.success('Subscription updated successfully!');
    }
    if (searchParams.get('canceled')) {
      toast.info('Subscription checkout canceled.');
    }
  }, [searchParams]);

  const handleSubscribe = async (planId: string) => {
    try {
      setIsLoading(planId);
      const { url } = await billingService.createCheckoutSession({
        planId,
        organisationId
      });
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription plan and billing details.
          </p>
        </div>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Subscription</CardTitle>
              <CardDescription>
                {isLoadingLicense ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading subscription details...
                  </span>
                ) : licenseError ? (
                  <span className="text-destructive font-medium">
                    Error loading subscription. Please refresh the page.
                  </span>
                ) : !activeLicense ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    No active subscription found. Please select a plan below.
                  </span>
                ) : (
                  <>
                    You are currently on the <span className="font-semibold text-foreground">{currentPlanName}</span> plan.
                  </>
                )}
              </CardDescription>
            </div>
            <CreditCard className="h-8 w-8 text-primary/20" />
          </div>
        </CardHeader>
        
        {currentPlanDetails && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plan Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{daysRemaining} days remaining</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Max Users:</span>
                  <span className="font-medium">{currentPlanDetails.maxUsers}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Active Users:</span>
                  <span className="font-medium">{userCount}</span>
                </div>
              </div>

              {/* Billing Breakdown */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Current Month Bill</h4>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" /> Generate Bill
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          Invoice Summary
                        </DialogTitle>
                        <DialogDescription className="sr-only">Detailed breakdown of your current billing and subscription.</DialogDescription>
                      </DialogHeader>
                      <div className="py-6 space-y-4">
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Organisation</span>
                          <span className="font-semibold">{orgData?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Subscription Plan</span>
                          <span className="font-semibold text-primary">{currentPlanDetails?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Active Users</span>
                          <span className="font-semibold">{userCount} users</span>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg space-y-2 mt-4">
                          {activeLicense?.customPrice !== null && activeLicense?.customPrice !== undefined ? (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Standard Plan Price</span>
                                <span className="line-through text-muted-foreground/50">
                                  {formatCurrency(
                                    currentPlanDetails?.pricingModel === 'flat_rate' 
                                      ? currentPlanDetails?.price 
                                      : (currentPlanDetails?.price || 0) + (currentPlanDetails?.pricePerUser || 0) * userCount,
                                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400 font-semibold">
                                <span>Custom Price Per User ({userCount} × {formatCurrency(activeLicense.customPrice, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                                <span>{formatCurrency(activeLicense.customPrice * userCount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Base Price ({currentPlanDetails?.pricingModel === 'flat_rate' ? 'Flat' : 'Base'})</span>
                                <span>{formatCurrency(currentPlanDetails?.price || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                              </div>
                              {currentPlanDetails?.pricingModel === 'per_user' && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">User Usage ({userCount} x {formatCurrency(currentPlanDetails?.pricePerUser || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                                  <span>{formatCurrency((currentPlanDetails?.pricePerUser || 0) * userCount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                </div>
                              )}
                              {(currentPlanDetails?.discount ?? 0) > 0 && (
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                  <span>Discount ({currentPlanDetails?.discount}%)</span>
                                  <span>-{formatCurrency(
                                    Math.round(((currentPlanDetails?.pricingModel === 'flat_rate' ? currentPlanDetails?.price : (currentPlanDetails?.price || 0) + (currentPlanDetails?.pricePerUser || 0) * userCount) || 0) * ((currentPlanDetails?.discount || 0) / 100)),
                                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                                  )}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">GST (18%)</span>
                            <span>{formatCurrency(billing.gst, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border font-bold text-lg mt-2">
                            <span>Total Amount Due</span>
                            <span className="text-primary">{formatCurrency(billing.total, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground text-center mt-6">
                          Generated on {new Date().toLocaleDateString()} • Valid until {activeLicense ? new Date(activeLicense.endDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="w-full" onClick={() => window.print()}>
                          <Download className="h-4 w-4 mr-2" /> Print / Download PDF
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Amount:</span>
                    <span className="font-medium">{formatCurrency(billing.baseAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span className="font-medium">{formatCurrency(billing.gst, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-bold text-primary">{formatCurrency(billing.total, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Available Plans</h4>

        {arePlansLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-muted/20">
            <p className="text-muted-foreground">No subscription plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan: SubscriptionPlan) => {
              const isCurrent = currentPlanDetails?.id === plan.id;
              const isPopular = plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('business');

              return (
                <Card key={plan.id} className={`flex flex-col transition-all duration-200 hover:shadow-lg ${isPopular ? 'border-primary shadow-sm scale-[1.02] relative' : 'border-border'}`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description || `${plan.durationDays} days access`}</CardDescription>
                    {plan.discount && plan.discount > 0 ? (
                      <div className="mt-4 space-y-1">
                        <div className="inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold">
                          {plan.discount}% OFF
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{formatCurrency(Math.round(plan.price * (1 - plan.discount / 100)), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          <span className="text-muted-foreground text-sm">/{plan.durationDays} days</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-through">{formatCurrency(plan.price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground mt-1">+ 18% GST</p>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{formatCurrency(plan.price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          <span className="text-muted-foreground text-sm">/{plan.durationDays} days</span>
                        </div>
                        <p className="text-xs text-muted-foreground">+ 18% GST</p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground">
                          Up to {plan.maxUsers} Users
                        </span>
                      </li>
                      {plan.billingType === 'per_user' && (
                        <li className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-muted-foreground">
                            Billed per user
                          </span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto pt-6">
                    <Button
                      className={`w-full ${isPopular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={!!isLoading || isCurrent}
                    >
                      {isLoading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isCurrent ? 'Current Plan' : 'Pay Now'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
