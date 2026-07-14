import LandingNavbar from "@/components/landing/LandingNavbar";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/shared/SEO";
import { Shield, Lock, Eye, FileText, Trash2 } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans">
      <SEO
        title="Privacy Policy | Pype CRM"
        description="Our commitment to your security. Read the Pype CRM privacy policy to understand how we protect your data and ensure compliance."
        canonical="https://pypecrm.com/privacy"
      />
      <LandingNavbar />
      <main className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 mb-6">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Privacy Policy - Pype CRM
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Last Updated: February 8, 2026
            </p>
          </div>

          <div className="space-y-12 text-gray-700 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                1. Introduction
              </h2>
              <p>
                Welcome to Pype CRM ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our CRM services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Eye className="h-6 w-6 text-blue-600" />
                2. Information We Collect
              </h2>
              <p className="mb-4">
                We collect personal information that you voluntarily provide to us when you register for an account, express an interest in obtaining information about us or our products, or otherwise contact us. This may include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name and contact data (Email, Phone, Address)</li>
                <li>Credentials (Passwords and similar security information)</li>
                <li>Payment data (Processed through secure third-party providers)</li>
                <li>CRM data (Leads, contacts, and opportunities you manage on our platform)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="h-6 w-6 text-blue-600" />
                3. How We Use Your Information
              </h2>
              <p className="mb-4">
                We use personal information collected via our Services for a variety of business purposes, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To facilitate account creation and logon process</li>
                <li>To send administrative information to you</li>
                <li>To fulfill and manage your orders and subscriptions</li>
                <li>To protect our Services and ensure security</li>
                <li>To respond to user inquiries and offer support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                4. Data Security
              </h2>
              <p>
                We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Trash2 className="h-6 w-6 text-blue-600" />
                5. User Data Deletion
              </h2>
              <p className="mb-4">
                You have the right to request the deletion of your personal data held by us. To request data deletion:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  Send an email to{" "}
                  <a
                    href="mailto:privacy@pypecrm.com"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    privacy@pypecrm.com
                  </a>{" "}
                  with the subject "Data Deletion Request".
                </li>
                <li>Include your full name and the email address associated with your account.</li>
                <li>We will process your request and delete your data within 30 days.</li>
              </ol>
            </section>

            <section className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Contact Us
              </h2>
              <p className="mb-4">
                If you have questions or comments about this policy, you may email us at:
              </p>
              <a href="mailto:privacy@pypecrm.com" className="text-blue-600 font-bold hover:underline">
                privacy@pypecrm.com
              </a>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
