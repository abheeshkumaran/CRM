import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface FAQ {
  question: string;
  answer: string;
}

const staticFaqs: FAQ[] = [
  {
    question: "What is Pype CRM?",
    answer: "Pype is an intelligent sales automation platform designed to help businesses capture, track, and close leads faster using AI-driven insights and multi-channel communication including WhatsApp, SMS, and Email."
  },
  {
    question: "How can I import my existing leads?",
    answer: "You can easily import leads via CSV or Excel files. We also support direct webhooks from Facebook Ads, Google Ads, and custom landing pages for real-time lead sync."
  },
  {
    question: "Does Pype support WhatsApp integration?",
    answer: "Yes! Pype features a unified WhatsApp Inbox that lets you chat with leads, send template messages, and automate follow-ups directly without switching apps."
  },
  {
    question: "Is there a mobile app available?",
    answer: "Absolutely. We have a native Android application that syncs in real-time with the web platform, allowing your field force to manage leads and update statuses on the go."
  },
  {
    question: "How secure is my data?",
    answer: "We use industry-standard AES-256 encryption and secure cloud infrastructure. Your data is isolated and protected, ensuring absolute privacy for your business information."
  },
  {
    question: "Can I automate my follow-ups?",
    answer: "Yes, our easy-to-use Workflow Builder allows you to create automated sequences—from immediate welcome messages to multi-day follow-up schedules."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const { data: dynamicFaqs, isLoading } = useQuery<FAQ[]>({
    queryKey: ['public-faqs'],
    queryFn: async () => {
      const res = await api.get('/public/faqs');
      return res.data.faqs;
    }
  });

  const displayFaqs = dynamicFaqs && dynamicFaqs.length > 0 ? dynamicFaqs : staticFaqs;

  return (
    <section id="faq" className="py-24 bg-neutral-50 dark:bg-neutral-900/30 overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <HelpCircle className="h-4 w-4" />
            Common Questions
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight"
          >
            Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">know.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-neutral-600 dark:text-neutral-400 text-lg"
          >
            Can't find the answer you're looking for? Reach out to our customer success team 24/7.
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            displayFaqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "rounded-2xl border transition-all duration-300",
                  openIndex === index 
                    ? "bg-white dark:bg-neutral-800 border-blue-500/30 shadow-xl shadow-blue-500/5" 
                    : "bg-white/50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                )}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className={cn(
                    "text-lg font-bold transition-colors",
                    openIndex === index ? "text-blue-600 dark:text-blue-400" : "text-neutral-900 dark:text-white"
                  )}>
                    {faq.question}
                  </span>
                  <div className={cn(
                    "shrink-0 p-1.5 rounded-full border transition-all duration-300",
                    openIndex === index 
                      ? "bg-blue-600 border-blue-600 text-white rotate-180" 
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-500"
                  )}>
                    {openIndex === index ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </div>
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
