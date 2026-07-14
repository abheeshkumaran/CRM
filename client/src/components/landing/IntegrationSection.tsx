import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const integrations = [
  { name: "Meta Ads", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/2560px-Meta_Platforms_Inc._logo.svg.png" },
  { name: "WhatsApp", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/2044px-WhatsApp.svg.png" },
  { name: "Google Calendar", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Calendar_icon_%282020%29.svg/1024px-Google_Calendar_icon_%282020%29.svg.png" },
  { name: "Gmail", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png" },
  { name: "Stripe", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png" },
];

export default function IntegrationSection() {
  return (
    <section className="py-24 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <Badge variant="outline" className="mb-6 px-4 py-1 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
          Seamless Integrations
        </Badge>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Connects with your favorite tools
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-16">
          Streamline your workflow by connecting PYPE with the apps you use every day.
        </p>

        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {integrations.map((app, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="w-24 h-12 md:w-32 md:h-16 flex items-center justify-center"
              >
                <img src={app.logo} alt={app.name} className="max-w-full max-h-full object-contain" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
