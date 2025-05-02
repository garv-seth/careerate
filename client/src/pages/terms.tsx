import React from 'react';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import Footer2 from '@/components/ui/footer2';
import { Separator } from '@/components/ui/separator';

const TermsPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-16 pt-24 md:pt-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: May 2, 2025</p>
          
          <Separator className="my-8" />
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Careerate's services, website, content, applications, or any other features or functionality offered by Careerate (collectively, the "Services"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use our Services.
            </p>
            
            <h2>2. Description of Services</h2>
            <p>
              Careerate is an AI-powered career acceleration platform that provides career development tools, personalized insights, learning recommendations, and professional growth support. Our Services utilize artificial intelligence technology to analyze professional data and provide guidance.
            </p>
            
            <h2>3. User Accounts</h2>
            <p>
              To access certain features of our Services, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
            </p>
            
            <h2>4. User Content</h2>
            <p>
              Our Services may allow you to upload, submit, store, send, or receive content, including but not limited to text, resumes, professional profiles, and communication with our AI tools ("User Content"). You retain ownership of any intellectual property rights that you hold in that User Content.
            </p>
            <p>
              By uploading User Content, you grant Careerate a worldwide, non-exclusive, royalty-free license (with the right to sublicense) to use, copy, modify, distribute, create derivative works of, and process that User Content for the purpose of providing and improving our Services.
            </p>
            
            <h2>5. Privacy</h2>
            <p>
              Our Privacy Policy, available at <a href="/privacy">careerate.com/privacy</a>, explains how we collect, use, and protect your information. By using our Services, you agree to the collection and use of information in accordance with our Privacy Policy.
            </p>
            
            <h2>6. Prohibited Conduct</h2>
            <p>
              You agree not to use our Services to:
            </p>
            <ul>
              <li>Violate any applicable law or regulation</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Harass, abuse, or harm another person</li>
              <li>Transmit any material that is harmful, threatening, defamatory, obscene, or otherwise objectionable</li>
              <li>Attempt to gain unauthorized access to our Services or compromise the security of our systems</li>
              <li>Interfere with or disrupt the Services or servers or networks connected to the Services</li>
              <li>Engage in data mining, data harvesting, data extracting, or any other similar activity</li>
            </ul>
            
            <h2>7. Intellectual Property</h2>
            <p>
              The Services, including all content, features, and functionality, are owned by Careerate or its licensors and are protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
            
            <h2>8. Limitation of Liability</h2>
            <p>
              In no event shall Careerate, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Services, (ii) any conduct or content of any third party on the Services, or (iii) unauthorized access, use, or alteration of your transmissions or content.
            </p>
            
            <h2>9. Disclaimer of Warranties</h2>
            <p>
              The Services are provided "as is" and "as available" without warranties of any kind, either express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            <p>
              Careerate does not warrant that (i) the Services will function uninterrupted, secure, or available at any particular time or location, (ii) any errors or defects will be corrected, (iii) the Services are free of viruses or other harmful components, or (iv) the results of using the Services will meet your requirements.
            </p>
            
            <h2>10. AI-Generated Content Disclaimer</h2>
            <p>
              Our Services include AI-generated content and recommendations. While we strive for accuracy and quality, we do not guarantee that AI-generated advice or content will be error-free, complete, or suitable for your specific career circumstances. All career decisions should be made with appropriate professional judgment and, when applicable, consultation with qualified career advisors.
            </p>
            
            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms of Service at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
            
            <h2>12. Governing Law</h2>
            <p>
              These Terms of Service shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
            
            <h2>13. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="font-semibold">
              Careerate Legal Department<br />
              Email: legal@gocareerate.com
            </p>
          </div>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

export default TermsPage;