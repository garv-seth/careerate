import React from 'react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Privacy Policy</h1>
          
          <div className="text-text-secondary space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">1. Introduction</h2>
              <p>
                Welcome to Careerate's Privacy Policy. At Careerate, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
              <p>
                Please read this Privacy Policy carefully. By using Careerate, you consent to the data practices described in this policy. If you do not agree with the terms of this Privacy Policy, please do not access or use our platform.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-text">2.1 Personal Information</h3>
                  <p>
                    We may collect personal information that you voluntarily provide to us when you register for Careerate, express an interest in obtaining information about us or our products and services, participate in activities on the platform, or otherwise contact us. This information may include:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Name and contact information (email address, phone number)</li>
                    <li>Professional information (current role, desired role, work history, skills)</li>
                    <li>Account credentials</li>
                    <li>Profile information and preferences</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">2.2 Usage Data</h3>
                  <p>
                    We automatically collect certain information when you visit, use, or navigate our platform. This information does not reveal your specific identity but may include:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Device and browser information</li>
                    <li>IP address</li>
                    <li>Operating system</li>
                    <li>Time stamps and visited URLs</li>
                    <li>Other technical information about your device and internet connection</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">2.3 AI Learning Data</h3>
                  <p>
                    To improve our AI-powered career guidance, we collect data about how you interact with recommendations, skill assessments, and learning resources. This helps us improve the accuracy and relevance of our services for your specific career transition goals.
                  </p>
                </div>
              </div>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">3. How We Use Your Information</h2>
              <p>
                We use the information we collect or receive for the following purposes:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>To provide and maintain our services, including to monitor the usage of our platform</li>
                <li>To personalize your experience and deliver content and product offerings relevant to your career interests</li>
                <li>To improve our AI algorithms to better understand skill gaps, career transition paths, and learning recommendations</li>
                <li>To manage your account, provide customer support, and respond to your inquiries</li>
                <li>To send you updates, administrative messages, and marketing communications</li>
                <li>To detect, prevent and address technical issues, security incidents, or fraud</li>
                <li>To comply with legal obligations and resolve any disputes</li>
              </ul>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">4. Information Sharing and Disclosure</h2>
              <p>
                We may share your information in the following situations:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Service Providers:</strong> We may share your information with third-party vendors, service providers, and other partners who help us provide our services (e.g., cloud hosting, analytics, customer service)</li>
                <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with a merger, acquisition, reorganization, sale of assets, or bankruptcy</li>
                <li><strong>With Your Consent:</strong> We may disclose your information for any other purpose with your consent</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information where required to do so by law or in response to valid requests by public authorities</li>
              </ul>
              <p>
                We do not sell your personal information to third parties.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">5. Data Security</h2>
              <p>
                We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards, no security system is impenetrable. We cannot guarantee the security of our databases, nor can we guarantee that information you supply will not be intercepted while being transmitted to us over the Internet.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">6. Your Data Protection Rights</h2>
              <p>
                Depending on your location, you may have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>The right to access, update, or delete your personal information</li>
                <li>The right to rectification (to correct or update your personal information)</li>
                <li>The right to object to or restrict processing of your personal data</li>
                <li>The right to data portability (receive a copy of your data in a structured format)</li>
                <li>The right to withdraw consent</li>
              </ul>
              <p>
                To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">7. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to collect and store information about your interactions with our platform. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service. For more information about our use of cookies, please see our Cookie Policy.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the data to the United States and process it there.
              </p>
              <p>
                We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">9. Children's Privacy</h2>
              <p>
                Our service is not directed to children under the age of 16. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us so that we can take necessary actions.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">10. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">11. Contact Us</h2>
              <p>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-2">
                <p className="font-medium">Careerate</p>
                <p>Email: <a href="mailto:privacy@gocareerate.com" className="text-primary hover:underline">privacy@gocareerate.com</a></p>
                <p>Address: Seattle, WA, United States</p>
              </div>
            </section>
            
            <div className="mt-8 text-sm text-text-muted">
              Last Updated: March 28, 2025
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;