import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 bg-blue-600 dark:bg-blue-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pattern-grid-lg" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to transform your sales?
        </h2>
        <p className="text-blue-100 text-xl mb-10 max-w-2xl mx-auto">
          Join thousands of teams who are closing more deals with less effort. Start your 14-day free trial today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link to="/register">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-white text-blue-600 hover:bg-gray-100 shadow-xl transition-all hover:scale-105 font-bold">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white transition-all">
              Contact Sales
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-blue-100">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 bg-blue-500 rounded-full p-1" /> No credit card needed
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 bg-blue-500 rounded-full p-1" /> Instant setup
          </div>
        </div>
      </div>
    </section>
  );
}
