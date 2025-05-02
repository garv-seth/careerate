import React from 'react';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import Footer2 from '@/components/ui/footer2';
import { Separator } from '@/components/ui/separator';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-16 pt-24 md:pt-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: May 2, 2025</p>
          
          <Separator className="my-8" />
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2>Our Commitment to Privacy</h2>
            <p>
              At Careerate, we are committed to protecting your privacy and the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered career acceleration platform. By using Careerate's services, you consent to the data practices described in this policy.
            </p>
            
            <h2>Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            
            <h3>1. Personal Information</h3>
            <ul>
              <li>Account information (name, email address, username, and password)</li>
              <li>Professional information (work history, education, skills, certifications)</li>
              <li>Contact information (phone number, address)</li>
              <li>Resume data and career documents uploaded to our platform</li>
              <li>Profile pictures and other identifying information you choose to provide</li>
            </ul>
            
            <h3>2. Career Analysis Data</h3>
            <ul>
              <li>Skills assessments and career preferences</li>
              <li>Learning objectives and professional development goals</li>
              <li>Career aspirations and job search parameters</li>
              <li>Feedback provided to and interactions with our AI agents</li>
            </ul>
            
            <h3>3. Technical Information</h3>
            <ul>
              <li>IP address and device identifiers</li>
              <li>Browser type and version</li>
              <li>Operating system information</li>
              <li>Time zone and geography information</li>
              <li>Usage data, including page views, features used, and interaction patterns</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
            
            <h2>How We Use Your Information</h2>
            <p>We use the information we collect for various purposes, including to:</p>
            <ul>
              <li>Provide, maintain, and improve our AI-powered career services</li>
              <li>Generate personalized career insights, recommendations, and learning pathways</li>
              <li>Create and maintain your account and user profile</li>
              <li>Process and complete transactions</li>
              <li>Send you technical notices, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Develop new products, services, and features</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our Services</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>Protect the rights and property of Careerate and others</li>
            </ul>
            
            <h2>AI Model Training and Data Usage</h2>
            <p>
              To provide our AI-powered services, we may use your data to train and improve our machine learning models. This helps us enhance the accuracy and relevance of our career insights and recommendations. We implement strict protocols to protect your privacy during this process, including:
            </p>
            <ul>
              <li>Anonymizing and aggregating data where possible</li>
              <li>Limiting access to raw data to authorized personnel only</li>
              <li>Implementing technical safeguards to prevent unauthorized access or misuse</li>
              <li>Regularly reviewing and improving our data handling practices</li>
            </ul>
            
            <h2>Information Sharing and Disclosure</h2>
            <p>We may share your information in the following situations:</p>
            <ul>
              <li><strong>Service Providers:</strong> We may share your information with third-party vendors, consultants, and other service providers who need access to your information to perform services on our behalf.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
              <li><strong>Business Transfers:</strong> If Careerate is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction.</li>
              <li><strong>With Your Consent:</strong> We may share your information with third parties when you have given us your consent to do so.</li>
            </ul>
            
            <h2>Data Security</h2>
            <p>
              We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk.
            </p>
            
            <h2>Your Privacy Rights</h2>
            <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
            <ul>
              <li>The right to access and review your personal information</li>
              <li>The right to correct inaccurate or incomplete information</li>
              <li>The right to delete your personal information</li>
              <li>The right to restrict or object to our processing of your personal information</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
            </p>
            
            <h2>Data Retention</h2>
            <p>
              We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy, unless a longer retention period is required or permitted by law. When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize it.
            </p>
            
            <h2>Children's Privacy</h2>
            <p>
              Our Services are not directed to children under the age of 16, and we do not knowingly collect personal information from children under 16. If we learn that we have collected personal information from a child under 16, we will promptly take steps to delete such information.
            </p>
            
            <h2>International Data Transfers</h2>
            <p>
              Your information, including personal information, may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the information, including personal information, to the United States and process it there.
            </p>
            
            <h2>Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
            </p>
            
            <h2>Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="font-semibold">
              Careerate Data Protection Officer<br />
              Email: privacy@gocareerate.com
            </p>
          </div>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

export default PrivacyPage;