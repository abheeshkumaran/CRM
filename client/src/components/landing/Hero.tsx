import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap, Shield, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white dark:bg-gray-950 selection:bg-blue-100 dark:selection:bg-blue-900">

      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-purple-100/40 dark:bg-purple-900/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-300 text-sm font-medium mb-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-default">
              <Sparkles className="h-4 w-4" />
              <span>New: AI-Powered Sales Automation</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8 leading-[1.1]">
              Close deals faster with <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Pype CRM.
              </span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for sales, marketing, and support. Streamline your workflow, automate follow-ups, and grow your business with data-driven insights.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-all">
                  View Demo
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" /> No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" /> 14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" /> Cancel anytime
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto max-w-6xl perspective-1000"
        >
          <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-2xl p-2 md:p-3 transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out">
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner bg-white dark:bg-gray-950 aspect-[16/10] flex flex-col relative">

              {/* Fake Browser Header */}
              <div className="h-10 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-2 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-block px-3 py-0.5 rounded-md bg-white dark:bg-gray-800 text-[10px] text-gray-400 font-mono shadow-sm border border-gray-100 dark:border-gray-700">
                    app.merncrm.com/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Mockup Content */}
              <div className="flex-1 p-6 bg-gray-50/30 dark:bg-gray-950 flex gap-6 overflow-hidden">
                {/* Sidebar Mockup */}
                <div className="hidden md:block w-48 space-y-4">
                  <div className="h-8 w-24 bg-blue-600/10 rounded-lg mb-6" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2">
                      <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-800" />
                      <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                  ))}
                </div>

                {/* Main Content Mockup */}
                <div className="flex-1 space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { color: "bg-blue-500", label: "Total Revenue" },
                      { color: "bg-purple-500", label: "Active Leads" },
                      { color: "bg-green-500", label: "Conversion Rate" }
                    ].map((stat, i) => (
                      <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="h-2 w-12 rounded bg-gray-100 dark:bg-gray-800" />
                          <div className={`h-6 w-6 rounded-lg ${stat.color} opacity-20`} />
                        </div>
                        <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                      </div>
                    ))}
                  </div>

                  {/* Charts Area */}
                  <div className="grid grid-cols-3 gap-4 h-64">
                    <div className="col-span-2 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                      <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-800 mb-4" />
                      <div className="h-48 w-full rounded-lg bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900 flex items-end justify-between px-4 pb-2">
                        {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                          <div key={i} className="w-8 rounded-t-sm bg-blue-500/80" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="col-span-1 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800 mb-6" />
                      <div className="h-32 w-32 rounded-full border-8 border-purple-500/20 border-t-purple-500 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Feature Badges */}
          <div className="absolute -left-4 top-1/3 hidden lg:block">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 max-w-xs"
            >
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Real-time Updates</p>
                <p className="text-xs text-gray-500">Instant notifications across devices</p>
              </div>
            </motion.div>
          </div>

          <div className="absolute -right-8 bottom-1/4 hidden lg:block">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 max-w-xs"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Enterprise Security</p>
                <p className="text-xs text-gray-500">Bank-grade data encryption</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
