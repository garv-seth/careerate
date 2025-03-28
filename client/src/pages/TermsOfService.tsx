import React from 'react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const TermsOfService: React.FC = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Terms of Service</h1>
          
          <div className="text-text-secondary space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">1. Introduction</h2>
              <p>
                Welcome to Careerate. These Terms of Service ("Terms") govern your access to and use of the Careerate platform, applications, and services (collectively, the "Services").
              </p>
              <p>
                By accessing or using our Services, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Services.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">2. Definitions</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>"Account"</strong> means a unique account created for you to access our Services.</li>
                <li><strong>"Content"</strong> refers to any text, information, images, audio, video, or other material that you upload, post, transmit, or otherwise make available through the Services.</li>
                <li><strong>"User"</strong> refers to individuals who access or use the Services, including you and other users of Careerate.</li>
                <li><strong>"AI Analysis"</strong> refers to our artificial intelligence-powered career guidance, skill gap analysis, and recommendation systems.</li>
              </ul>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">3. Account Registration and Security</h2>
              <p>
                To use certain features of the Services, you may need to create an Account. You must provide accurate, current, and complete information during the registration process and keep your Account information up-to-date.
              </p>
              <p>
                You are responsible for safeguarding the password and other credentials used to access your Account. You agree not to disclose your password to any third party and to immediately notify Careerate of any unauthorized use of your Account.
              </p>
              <p>
                We reserve the right to disable any Account, at any time and without notice, if we believe you have violated these Terms.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">4. AI-Powered Career Services</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-text">4.1 AI Analysis and Recommendations</h3>
                  <p>
                    Our Services use artificial intelligence to analyze your skills, experience, and career goals to provide personalized guidance and recommendations. While we strive for accuracy, we cannot guarantee that our AI Analysis will be error-free or meet your specific requirements.
                  </p>
                  <p>
                    You acknowledge that the AI Analysis is provided for informational purposes only and should not be the sole basis for making career decisions. We are not responsible for any actions you take based on our recommendations.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">4.2 Data Usage for Service Improvement</h3>
                  <p>
                    By using our Services, you agree that we may collect and use data about your interactions with our platform to improve our AI systems and Services. This data will be handled in accordance with our Privacy Policy.
                  </p>
                </div>
              </div>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">5. User Content and Conduct</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-text">5.1 Your Content</h3>
                  <p>
                    You retain ownership of any Content you submit to the Services. By submitting Content, you grant Careerate a worldwide, non-exclusive, royalty-free license to use, copy, modify, create derivative works from, distribute, publicly display, and perform your Content in connection with operating and improving our Services.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">5.2 Content Guidelines</h3>
                  <p>
                    You agree not to post Content that:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Violates the rights of others, including intellectual property rights</li>
                    <li>Is unlawful, defamatory, obscene, offensive, or harmful</li>
                    <li>Contains software viruses or any other code designed to disrupt, damage, or limit the functioning of any software or hardware</li>
                    <li>Impersonates any person or entity or misrepresents your affiliation with a person or entity</li>
                    <li>Constitutes unauthorized advertising, spam, or any form of solicitation</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">5.3 Monitoring and Enforcement</h3>
                  <p>
                    We reserve the right, but do not have the obligation, to monitor, edit, or remove any Content that we determine, in our sole discretion, violates these Terms or is otherwise objectionable.
                  </p>
                </div>
              </div>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">6. Intellectual Property Rights</h2>
              <p>
                Unless otherwise indicated, the Services and all content and materials available through the Services, including but not limited to the Careerate logo, designs, text, graphics, images, AI algorithms, and software, are the property of Careerate or our licensors and are protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                You may not modify, reproduce, distribute, create derivative works or adaptations of, publicly display or perform, or in any way exploit the Services or any content from the Services in whole or in part, except as expressly authorized by Careerate.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">7. Subscription and Payments</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-text">7.1 Subscription Services</h3>
                  <p>
                    Certain features of our Services may require a subscription. By subscribing to these features, you agree to pay the applicable fees as they become due.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">7.2 Payment Terms</h3>
                  <p>
                    All payments are processed through secure third-party payment processors. By providing your payment information, you authorize us to charge your payment method for the subscribed services.
                  </p>
                  <p>
                    Subscription fees are non-refundable except as required by law or as explicitly stated in our refund policy.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">7.3 Subscription Cancellation</h3>
                  <p>
                    You may cancel your subscription at any time through your Account settings. Upon cancellation, your subscription will remain active until the end of the current billing period.
                  </p>
                </div>
              </div>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, in no event shall Careerate, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Your access to or use of or inability to access or use the Services</li>
                <li>Any conduct or Content of any third party on the Services</li>
                <li>Any Content obtained from the Services</li>
                <li>Unauthorized access, use, or alteration of your transmissions or Content</li>
              </ul>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">9. Disclaimer of Warranties</h2>
              <p>
                The Services are provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. Careerate disclaims all warranties, including but not limited to, implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
              <p>
                We do not warrant that the Services will be uninterrupted, secure, or error-free, that defects will be corrected, or that the Services are free of viruses or other harmful components.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. If we make changes, we will provide notice by posting the updated Terms on this page and updating the "Last Updated" date.
              </p>
              <p>
                Your continued use of the Services after any such changes constitutes your acceptance of the new Terms. If you do not agree to the new Terms, you must stop using the Services.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">11. Governing Law and Dispute Resolution</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Washington, without regard to its conflict of law principles.
              </p>
              <p>
                Any dispute arising from or relating to these Terms or the Services shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules. The arbitration shall be conducted in Seattle, Washington.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">12. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-2">
                <p className="font-medium">Careerate</p>
                <p>Email: legal@careerate.ai</p>
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

export default TermsOfService;