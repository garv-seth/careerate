import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Career guide card data
const careerGuides = [
  {
    id: 1,
    title: 'From Software Developer to Product Manager',
    description: 'A comprehensive guide for developers looking to transition into product management roles, with insights on leveraging technical expertise.',
    category: 'Tech',
    readTime: '15 min',
    level: 'Intermediate',
    image: '/assets/images/dev-to-pm.jpg'
  },
  {
    id: 2,
    title: 'Transitioning from Finance to Data Science',
    description: 'Learn how financial professionals can transfer their analytical skills to build a rewarding career in data science.',
    category: 'Finance',
    readTime: '12 min',
    level: 'Advanced',
    image: '/assets/images/finance-to-data.jpg'
  },
  {
    id: 3,
    title: 'Marketing to UX Design: A Complete Roadmap',
    description: 'How marketing professionals can leverage their user-centric thinking to break into the UX design field.',
    category: 'Design',
    readTime: '10 min',
    level: 'Beginner',
    image: '/assets/images/marketing-to-ux.jpg'
  },
  {
    id: 4,
    title: 'Healthcare Professionals Entering Health Tech',
    description: 'Navigate the transition from clinical settings to health technology with this focused career guide.',
    category: 'Healthcare',
    readTime: '18 min',
    level: 'Intermediate',
    image: '/assets/images/healthcare-to-tech.jpg'
  },
  {
    id: 5,
    title: 'Teaching to Corporate Training: Skills Transfer Guide',
    description: 'For educators looking to move into corporate training and L&D roles, with practical steps for highlighting transferable skills.',
    category: 'Education',
    readTime: '14 min',
    level: 'Beginner',
    image: '/assets/images/teacher-to-corporate.jpg'
  },
  {
    id: 6,
    title: 'Project Management Across Industries',
    description: 'How project managers can successfully transition between different industries while leveraging their core competencies.',
    category: 'Management',
    readTime: '11 min',
    level: 'Advanced',
    image: '/assets/images/pm-across-industries.jpg'
  }
];

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Tech': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Finance': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Design': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Healthcare': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'Education': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Management': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  };
  
  return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

const CareerGuides: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text mb-6">
            Career Transition Guides
          </h1>
          <p className="text-text-secondary max-w-3xl mx-auto text-lg">
            Comprehensive resources to help you navigate your career change journey with confidence and clarity.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {careerGuides.map((guide, index) => (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border border-primary/10 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 overflow-hidden group">
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-primary/30 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                  ></div>
                  <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
                  
                  {/* Placeholder for actual image */}
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <div className="text-4xl text-primary/40">{guide.category[0]}</div>
                  </div>
                </div>
                
                <CardHeader className="relative">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={`${getCategoryColor(guide.category)}`}>
                      {guide.category}
                    </Badge>
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {guide.readTime}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {guide.level}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                    {guide.title}
                  </CardTitle>
                  <CardDescription className="text-sm mt-2">
                    {guide.description}
                  </CardDescription>
                </CardHeader>
                
                <CardFooter>
                  <Button variant="ghost" className="w-full group-hover:bg-primary/10 transition-colors duration-300">
                    Read Guide
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="relative border border-primary/20 rounded-2xl p-8 bg-card/30 backdrop-blur-sm max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
          
          <div className="text-center relative z-10">
            <h2 className="text-2xl font-semibold mb-4 text-text">Need Personalized Guidance?</h2>
            <p className="text-text-secondary mb-6">
              Get a customized career transition plan tailored to your specific skills, experience, and goals.
            </p>
            <Link href="/transitions/new">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Start Your Career Assessment
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CareerGuides;