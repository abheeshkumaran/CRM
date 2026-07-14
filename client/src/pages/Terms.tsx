import SEO from '@/components/shared/SEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Terms of Service | Pype CRM"
        description="Review the terms and conditions for using Pype CRM. Clear guidelines on our 14-day free trial, user accounts, and data protection."
        canonical="https://pypecrm.com/terms"
      />
      <div className="max-w-4xl mx-auto pt-6">

        <Card className="shadow-lg border-0 bg-white dark:bg-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700 pb-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
              Terms and Conditions
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mt-2">
              Last Updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none pt-8 pb-10 px-8 lg:px-12 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                By accessing and using Pype CRM ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">2. 14-Day Free Trial</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                New organizations are eligible for a 14-day free trial. During this period, you will have access to all standard features of the Service. No credit card is required to begin the trial. Upon the conclusion of the 14-day trial, you must select a subscription plan to continue using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">3. User Accounts and Security</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">4. Data Privacy</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Your privacy is important to us. Our collection and use of personal data in connection with the Service are described in our Privacy Policy. By using the Service, you grant us the right to process your data to provide and improve the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">5. Acceptable Use</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the Service. You must comply with all applicable laws and regulations when using the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">6. Modifications to Service</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                We reserve the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">7. Limitation of Liability</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                To the maximum extent permitted by law, Pype CRM shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">8. Governing Law</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the applicable laws of the jurisdiction in which Pype CRM operates, without regard to its conflict of law provisions.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
