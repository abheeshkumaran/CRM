import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

// Fallback for loading/error
const fallbackPlans = [
  {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: "Perfect for small teams getting started.",
    features: ["5 Users", "Basic CRM", "Email Support", "1,000 Contacts"],
    popular: false
  },
  // ... other fallbacks if needed
];

export default function PricingTable() {
  const [isYearly, setIsYearly] = useState(false);

  const { data: serverPlans, isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await api.get('/plans'); // Public endpoint
      return res.data.plans;
    }
  });

  // backend plans structure: { id, name, price, durationDays, features, maxUsers, billingType, ... }
  // We need to map them to the UI format or adjust UI.
  // Assuming backend 'price' is monthly flat rate.
  // If backend doesn't have yearlyPrice, we can calculate it (e.g. x10 or x12 with discount).

  // Filter out Trail/Trial plans - only show Enterprise and other paid plans
  const filteredPlans = serverPlans?.length ? serverPlans.filter((p: { name: string }) => 
    !p.name.toLowerCase().includes('trail') && 
    !p.name.toLowerCase().includes('trial')
  ) : [];

  const displayPlans = filteredPlans.length ? filteredPlans.map((p: { price: number, name: string, features?: string[], maxUsers: number, durationDays: number, id: string, discount?: number }) => {
    const discount = p.discount || 0;
    const discountedPrice = discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price;
    return {
      ...p,
      monthlyPrice: discountedPrice,
      originalPrice: p.price,
      discount,
      yearlyPrice: discountedPrice * 10, // 2 months free metric
      popular: p.name.toLowerCase().includes('pro'),
      features: p.features || [`${p.maxUsers} Users`, `${p.durationDays} Days Duration`]
    };
  }) : fallbackPlans;

  if (isLoading) return <div className="py-20 text-center">Loading pricing...</div>;

  return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900/50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Choose the plan that fits your business needs. No hidden fees.
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Monthly</span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Yearly <span className="text-green-600 font-bold ml-1">(Save ~17%)</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayPlans.map((plan: { id?: string, name: string, description?: string, monthlyPrice: number, originalPrice?: number, discount?: number, yearlyPrice: number, popular: boolean, features: string[] }, index: number) => (
            <motion.div
              key={plan.id || plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <Card className={`relative h-full flex flex-col border-2 transition-all duration-300 ${plan.popular ? 'border-blue-600 shadow-2xl scale-105 z-10' : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-current" /> Most Popular
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
                  {plan.discount && plan.discount > 0 && (
                    <div className="mt-2 inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold">
                      {plan.discount}% OFF
                    </div>
                  )}
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      ₹{isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  {plan.discount && plan.discount > 0 && plan.originalPrice && (
                    <p className="text-sm text-gray-400 line-through mt-1">₹{isYearly ? Math.round(plan.originalPrice * 10 / 12) : plan.originalPrice}/month</p>
                  )}
                  {isYearly && <p className="text-xs text-green-600 mt-2 font-medium">Billed ₹{plan.yearlyPrice} yearly</p>}
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 mt-4">
                    {plan.features?.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="mt-0.5 bg-green-100 dark:bg-green-900/30 rounded-full p-1">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link to={`/register?plan=${plan.id}`} className="w-full">
                    <Button
                      className={`w-full font-bold ${plan.popular ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
