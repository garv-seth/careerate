import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Video, 
  GraduationCap, 
  Code, 
  FileText, 
  Briefcase,
  Search
} from 'lucide-react';

// Resource types and their icons
const resourceTypes = {
  'course': { icon: <GraduationCap className="h-5 w-5" />, label: 'Course' },
  'book': { icon: <BookOpen className="h-5 w-5" />, label: 'Book' },
  'video': { icon: <Video className="h-5 w-5" />, label: 'Video' },
  'tutorial': { icon: <Code className="h-5 w-5" />, label: 'Tutorial' },
  'article': { icon: <FileText className="h-5 w-5" />, label: 'Article' },
  'tool': { icon: <Briefcase className="h-5 w-5" />, label: 'Tool' }
};

// Learning resources data
const resources = [
  {
    id: 1,
    title: 'Transition to Product Management Masterclass',
    description: 'Comprehensive course teaching you how to leverage your existing skills to become a successful product manager.',
    type: 'course',
    category: 'Product Management',
    platform: 'Udemy',
    url: 'https://www.udemy.com/',
    isPaid: true,
    price: '$49.99',
    tags: ['product management', 'career transition', 'tech']
  },
  {
    id: 2,
    title: 'The Art of UX: A Designer\'s Handbook',
    description: 'Essential reading for understanding UX design principles and practices in the modern digital landscape.',
    type: 'book',
    category: 'UX Design',
    platform: 'Amazon',
    url: 'https://www.amazon.com/',
    isPaid: true,
    price: '$24.95',
    tags: ['ux design', 'user experience', 'design']
  },
  {
    id: 3,
    title: 'Data Science for Beginners: Complete Tutorial',
    description: 'Step-by-step guide to starting your data science journey with practical exercises and real-world examples.',
    type: 'video',
    category: 'Data Science',
    platform: 'YouTube',
    url: 'https://www.youtube.com/',
    isPaid: false,
    tags: ['data science', 'python', 'machine learning']
  },
  {
    id: 4,
    title: 'Building Your First Web Application with JavaScript',
    description: 'Hands-on tutorial for creating web applications from scratch using modern JavaScript frameworks.',
    type: 'tutorial',
    category: 'Web Development',
    platform: 'FreeCodeCamp',
    url: 'https://www.freecodecamp.org/',
    isPaid: false,
    tags: ['javascript', 'web development', 'frontend']
  },
  {
    id: 5,
    title: 'Transitioning from Marketing to UX Research',
    description: 'Comprehensive guide on how marketing professionals can leverage their skills in UX research roles.',
    type: 'article',
    category: 'UX Research',
    platform: 'Medium',
    url: 'https://medium.com/',
    isPaid: false,
    tags: ['ux research', 'marketing', 'career transition']
  },
  {
    id: 6,
    title: 'Resume AI: Optimize Your Resume for Career Transitions',
    description: 'AI-powered tool that helps you tailor your resume for specific career transitions with industry-specific keywords.',
    type: 'tool',
    category: 'Career Tools',
    platform: 'ResumeAI',
    url: 'https://example.com/resume-ai',
    isPaid: true,
    price: '$19.99/month',
    tags: ['resume', 'ai tools', 'job search']
  },
  {
    id: 7,
    title: 'Healthcare to Health Tech: Essential Skills',
    description: 'Learn the technical and business skills needed to transition from clinical healthcare to health technology.',
    type: 'course',
    category: 'Health Tech',
    platform: 'Coursera',
    url: 'https://www.coursera.org/',
    isPaid: true,
    price: '$39.99',
    tags: ['healthcare', 'health tech', 'career transition']
  },
  {
    id: 8,
    title: 'From Teacher to Corporate Trainer: A Practical Guide',
    description: 'Comprehensive resource for educators looking to transition to corporate training and learning development roles.',
    type: 'book',
    category: 'Learning & Development',
    platform: 'Barnes & Noble',
    url: 'https://www.barnesandnoble.com/',
    isPaid: true,
    price: '$29.95',
    tags: ['education', 'corporate training', 'career transition']
  },
  {
    id: 9,
    title: 'Introduction to Artificial Intelligence for Non-Programmers',
    description: 'Beginner-friendly guide to understanding AI concepts without requiring programming experience.',
    type: 'video',
    category: 'Artificial Intelligence',
    platform: 'Khan Academy',
    url: 'https://www.khanacademy.org/',
    isPaid: false,
    tags: ['ai', 'artificial intelligence', 'beginners']
  }
];

const LearningResources: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  
  // Filter resources based on search term and current tab
  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = currentTab === 'all' || resource.type === currentTab;
    
    return matchesSearch && matchesTab;
  });
  
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
            Learning Resources
          </h1>
          <p className="text-text-secondary max-w-3xl mx-auto text-lg">
            Curated learning materials to help you acquire new skills and knowledge for your career transition.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10"
        >
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Search resources by title, description, or category..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tabs defaultValue="all" className="w-full mb-8" onValueChange={setCurrentTab}>
            <TabsList className="w-full max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-7 mb-8">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                All
              </TabsTrigger>
              {Object.entries(resourceTypes).map(([type, { label }]) => (
                <TabsTrigger 
                  key={type} 
                  value={type}
                  className="data-[state=active]:bg-primary/20"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <ResourceGrid resources={filteredResources} />
            </TabsContent>
            
            {Object.keys(resourceTypes).map(type => (
              <TabsContent key={type} value={type} className="mt-0">
                <ResourceGrid resources={filteredResources} />
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="relative border border-primary/20 rounded-2xl p-8 bg-card/30 backdrop-blur-sm max-w-4xl mx-auto mt-16"
        >
          <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
          
          <div className="text-center relative z-10">
            <h2 className="text-2xl font-semibold mb-4 text-text">Need Personalized Resource Recommendations?</h2>
            <p className="text-text-secondary mb-6">
              Let our AI identify the most relevant learning materials based on your career transition goals and current skill set.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Get Custom Recommendations
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Resource card grid component
const ResourceGrid: React.FC<{ resources: typeof resources }> = ({ resources }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {resources.length > 0 ? (
        resources.map((resource, index) => (
          <ResourceCard key={resource.id} resource={resource} index={index} />
        ))
      ) : (
        <div className="col-span-3 text-center py-16">
          <p className="text-text-secondary text-lg">No resources found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

// Resource card component
const ResourceCard: React.FC<{ resource: typeof resources[0], index: number }> = ({ resource, index }) => {
  const { icon } = resourceTypes[resource.type as keyof typeof resourceTypes];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card className="h-full border border-primary/10 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 overflow-hidden group">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="flex items-center gap-1 text-primary">
              {icon}
              <span>{resourceTypes[resource.type as keyof typeof resourceTypes].label}</span>
            </Badge>
            {resource.isPaid ? (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                {resource.price || 'Paid'}
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Free
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
            {resource.title}
          </CardTitle>
          <CardDescription className="text-sm mt-2">
            {resource.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Category:</span>
              <span className="text-text font-medium">{resource.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Platform:</span>
              <span className="text-text font-medium">{resource.platform}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {resource.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant="default" className="w-full">
              Access Resource
            </Button>
          </a>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default LearningResources;