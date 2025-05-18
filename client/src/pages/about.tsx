import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TubelightNavbar from '@/components/ui/tubelight-navbar';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <TubelightNavbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">About Careerate</h1>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Our Mission</CardTitle>
              <CardDescription>Empowering professionals in the age of AI</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Careerate is designed to help professionals navigate the rapidly changing landscape of work in the age of artificial intelligence. 
                We provide tools and insights to help you understand your career's vulnerability to AI disruption, plan effective transitions, 
                and develop skills that will remain valuable in the future economy.
              </p>
              <p>
                Our platform combines cutting-edge AI analysis with practical career development strategies to give you a clear path forward
                in your professional journey.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Approach</CardTitle>
              <CardDescription>Data-driven career insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                We believe in giving you the most accurate and actionable information possible. Our platform analyzes your skills, experience, 
                and industry trends to provide personalized recommendations that are specific to your situation.
              </p>
              <p>
                Rather than generic advice, Careerate delivers custom insights based on the latest data about how AI is affecting different professions,
                what skills are emerging as valuable, and which career paths offer the most promising futures.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AboutPage;