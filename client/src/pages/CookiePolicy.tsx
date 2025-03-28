import React from 'react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';

const CookiePolicy: React.FC = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Cookie Policy</h1>
          
          <div className="text-text-secondary space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">1. Introduction</h2>
              <p>
                This Cookie Policy explains how Careerate ("we", "us", or "our") uses cookies and similar technologies on our website and platform. By using Careerate, you consent to the use of cookies in accordance with this policy.
              </p>
              <p>
                This Cookie Policy should be read alongside our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, which explains how we use personal information.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">2. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and to provide information to the owners of the site.
              </p>
              <p>
                Cookies can be "persistent" or "session" cookies. Persistent cookies remain on your device when you go offline, while session cookies are deleted as soon as you close your web browser.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">3. How We Use Cookies</h2>
              <p>
                We use cookies for a variety of reasons detailed below. Unfortunately, in most cases, there are no industry standard options for disabling cookies without completely disabling the functionality and features they add to the site.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-text">3.1 Essential Cookies</h3>
                  <p>
                    These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access. You may disable these by changing your browser settings, but this may affect how the website functions.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">3.2 Functionality Cookies</h3>
                  <p>
                    These cookies allow us to remember choices you make (such as your username, language, or the region you are in) and provide enhanced, more personalized features. They may also be used to provide services you have requested.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">3.3 Analytics Cookies</h3>
                  <p>
                    These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular and see how visitors move around the site.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">3.4 Personalization Cookies</h3>
                  <p>
                    These cookies are used to recognize you when you return to our website. This enables us to personalize our content for you, greet you by name, and remember your preferences (for example, your choice of language or region).
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-text">3.5 AI Service Improvement Cookies</h3>
                  <p>
                    These cookies collect information about how you interact with our AI-powered features, such as career recommendations and skill analyses. This helps us improve the accuracy and relevance of our AI systems for your career transition goals.
                  </p>
                </div>
              </div>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">4. Third-Party Cookies</h2>
              <p>
                In some cases, we also use cookies provided by trusted third parties. The following section details which third-party cookies you might encounter through our site.
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>
                  <strong>Analytics providers:</strong> We use Google Analytics to help us understand how visitors use our site. These cookies may track things such as how long you spend on the site and the pages that you visit.
                </li>
                <li>
                  <strong>Payment processors:</strong> When you make a purchase or enter payment information on our site, third-party payment processors may use cookies to process these transactions securely.
                </li>
                <li>
                  <strong>Social media:</strong> We use social media buttons and/or plugins on this site that allow you to connect with your social network. These social media platforms may set cookies that can be used to enhance your profile on their site or contribute to the data they hold.
                </li>
              </ul>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">5. Managing Cookies</h2>
              <p>
                Most web browsers allow you to control cookies through their settings. To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit <a href="http://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.allaboutcookies.org</a>.
              </p>
              <p>
                You can choose to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies if you prefer. This may prevent you from taking full advantage of the website.
              </p>
              <div className="space-y-2 mt-4">
                <p className="font-medium">Here's how to manage cookie settings in common browsers:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                  <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data</li>
                  <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                </ul>
              </div>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">6. Cookie Preferences</h2>
              <p>
                When you first visit our website, you will be shown a cookie banner that allows you to accept or decline non-essential cookies. You can change your cookie preferences at any time by clicking on the "Cookie Settings" link in the footer of our website.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">7. Changes to This Cookie Policy</h2>
              <p>
                We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last Updated" date.
              </p>
              <p>
                You are advised to review this Cookie Policy periodically for any changes. Changes to this Cookie Policy are effective when they are posted on this page.
              </p>
            </section>
            
            <Separator className="my-6 bg-primary/10" />
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-text">8. Contact Us</h2>
              <p>
                If you have any questions about our use of cookies, please contact us at:
              </p>
              <div className="mt-2">
                <p className="font-medium">Careerate</p>
                <p>Email: privacy@careerate.ai</p>
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

export default CookiePolicy;