import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BarChart,
  Workflow,
  Bot,
  Globe,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    category: "Sales Automation",
    items: [
      {
        title: "Visual Pipeline",
        description: "Drag-and-drop Kanban board to manage deals and visualize your sales process.",
        icon: LayoutDashboard,
        color: "text-blue-500",
        bg: "bg-blue-500/10"
      },
      {
        title: "AI Lead Scoring",
        description: "Automatically prioritize leads based on engagement and demographic data.",
        icon: Bot,
        color: "text-purple-500",
        bg: "bg-purple-500/10"
      },
      {
        title: "Workflow Engine",
        description: "Automate repetitive tasks with a powerful trigger-action workflow builder.",
        icon: Workflow,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10"
      }
    ]
  },
  {
    category: "Omnichannel Communication",
    items: [
      {
        title: "Unified Inbox",
        description: "Manage WhatsApp, Email, and SMS conversations from a single dashboard.",
        icon: MessageSquare,
        color: "text-green-500",
        bg: "bg-green-500/10"
      },
      {
        title: "Email Campaigns",
        description: "Send personalized email sequences and track opens, clicks, and replies.",
        icon: Mail,
        color: "text-pink-500",
        bg: "bg-pink-500/10"
      },
      {
        title: "Cloud Telephony",
        description: "Make and receive calls directly within the CRM with automatic recording.",
        icon: Phone,
        color: "text-cyan-500",
        bg: "bg-cyan-500/10"
      }
    ]
  },
  {
    category: "Business Operations",
    items: [
      {
        title: "Team Collaboration",
        description: "Assign roles, track performance, and share notes with your team.",
        icon: Users,
        color: "text-orange-500",
        bg: "bg-orange-500/10"
      },
      {
        title: "Advanced Analytics",
        description: "Deep insights into conversion rates, revenue forecasts, and team targets.",
        icon: BarChart,
        color: "text-red-500",
        bg: "bg-red-500/10"
      },
      {
        title: "Global Reach",
        description: "Multi-currency support and territory management for international sales.",
        icon: Globe,
        color: "text-blue-600",
        bg: "bg-blue-600/10"
      }
    ]
  }
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50 px-4 md:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            Powerful Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-6">
            Everything you need to grow
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            A complete suite of tools designed to help you sell smarter, not harder. From lead generation to closing, we've got you covered.
          </p>
        </div>

        <div className="space-y-24">
          {features.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold mb-8 text-gray-900 dark:text-white pl-4 border-l-4 border-blue-500"
              >
                {category.category}
              </motion.h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {category.items.map((feature, featureIndex) => (
                  <motion.div
                    key={featureIndex}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: featureIndex * 0.1 }}
                  >
                    <Card className="h-full border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      <CardHeader>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${feature.bg} group-hover:scale-110 transition-transform duration-300`}>
                          <feature.icon className={`h-7 w-7 ${feature.color}`} />
                        </div>
                        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
