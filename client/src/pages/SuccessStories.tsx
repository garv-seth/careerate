import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Star } from 'lucide-react';

// Success stories data
const successStories = [
  {
    id: 1,
    name: 'Sophia Martinez',
    avatar: '/assets/avatars/sophia.jpg',
    initials: 'SM',
    role: 'Product Manager at TechCorp',
    previousRole: 'Senior Software Engineer',
    quote: 'Careerate helped me identify the exact skills I needed to move from engineering to product management. The AI-powered analysis highlighted my strengths in user understanding and stakeholder management, which were crucial for my transition.',
    transition: 'Software Engineer → Product Manager',
    transitionTime: '8 months',
    skills: ['Stakeholder Management', 'Product Strategy', 'User Research'],
    story: 'After 7 years as a software engineer, I was looking for a new challenge that would utilize my technical knowledge while allowing me to work more directly with users and business strategy. Careerate\'s skill gap analysis pinpointed exactly what I needed to focus on, and the personalized learning path made the transition much smoother than I expected.'
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    avatar: '/assets/avatars/marcus.jpg',
    initials: 'MJ',
    role: 'Data Scientist at FinanceAI',
    previousRole: 'Financial Analyst',
    quote: 'The career transition roadmap provided by Careerate was a game-changer. It helped me leverage my financial background while guiding me through the technical skills I needed to acquire for data science.',
    transition: 'Financial Analyst → Data Scientist',
    transitionTime: '12 months',
    skills: ['Python', 'Machine Learning', 'Statistical Analysis'],
    story: 'My background in financial analysis gave me a strong foundation in working with numbers, but I needed technical programming skills to move into data science. Careerate helped me develop a strategic learning plan focused on Python and machine learning, while highlighting how my financial domain knowledge was actually my competitive advantage.'
  },
  {
    id: 3,
    name: 'Aisha Patel',
    avatar: '/assets/avatars/aisha.jpg',
    initials: 'AP',
    role: 'UX Designer at CreativeHub',
    previousRole: 'Marketing Specialist',
    quote: 'Careerate showed me how my marketing experience gave me a unique perspective on user psychology that was valuable in UX design. The personalized learning resources and practical projects helped me build a portfolio that got me hired.',
    transition: 'Marketing Specialist → UX Designer',
    transitionTime: '10 months',
    skills: ['User Research', 'Wireframing', 'Usability Testing'],
    story: 'I always had an interest in design, but wasn\'t sure how to make the jump from marketing. Careerate helped me understand that my experience in audience targeting and campaign optimization was relevant to UX research and testing. With guided practice projects and portfolio advice, I secured my first UX role within 10 months.'
  },
  {
    id: 4,
    name: 'David Chen',
    avatar: '/assets/avatars/david.jpg',
    initials: 'DC',
    role: 'Healthcare Solutions Architect',
    previousRole: 'Registered Nurse',
    quote: 'As a nurse wanting to move into healthtech, I wasn\'t sure where to start. Careerate analyzed my clinical experience and showed me exactly how it translated to tech roles, giving me confidence in interviews.',
    transition: 'Registered Nurse → Healthcare Solutions Architect',
    transitionTime: '14 months',
    skills: ['Health Informatics', 'System Design', 'Healthcare Integration'],
    story: 'After 12 years in clinical nursing, I wanted to impact healthcare at a broader scale. Careerate helped me position my deep domain knowledge as a critical asset for healthtech companies, and guided me through acquiring the technical foundations I needed. The role-specific interview preparation was invaluable.'
  },
  {
    id: 5,
    name: 'Jennifer Taylor',
    avatar: '/assets/avatars/jennifer.jpg',
    initials: 'JT',
    role: 'Corporate Learning Strategist',
    previousRole: 'High School Teacher',
    quote: 'Careerate\'s analysis of my transferable skills was eye-opening. It helped me reframe my classroom experience into valuable corporate learning expertise, and guided me in filling specific knowledge gaps.',
    transition: 'High School Teacher → Corporate Learning Strategist',
    transitionTime: '6 months',
    skills: ['Learning Experience Design', 'Training Facilitation', 'Performance Analysis'],
    story: 'I loved teaching but was ready for a change after 8 years in education. Careerate showed me that my curriculum development and assessment skills were highly relevant to corporate learning and development. With focused skill development in business metrics and e-learning platforms, I made a successful transition in just 6 months.'
  },
  {
    id: 6,
    name: 'Michael Robinson',
    avatar: '/assets/avatars/michael.jpg',
    initials: 'MR',
    role: 'Project Manager at BuildTech',
    previousRole: 'Construction Supervisor',
    quote: 'The transition from construction to tech project management seemed daunting, but Careerate broke it down into achievable steps. Their AI tool identified my transferable leadership and planning skills while pinpointing exactly what I needed to learn about software development processes.',
    transition: 'Construction Supervisor → Tech Project Manager',
    transitionTime: '9 months',
    skills: ['Agile Methodologies', 'Software Development Lifecycle', 'Cross-functional Leadership'],
    story: 'After 15 years in construction management, I wanted to leverage my experience in a growing industry. Careerate\'s assessment showed that many of my skills in timeline management, resource allocation, and stakeholder communication were directly transferable to tech project management. Their targeted recommendations for learning agile methodologies and software development concepts helped me make a successful career pivot.'
  }
];

const SuccessStories: React.FC = () => {
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
            Success Stories
          </h1>
          <p className="text-text-secondary max-w-3xl mx-auto text-lg">
            Real career transformations powered by Careerate's AI-driven insights and personalized guidance.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {successStories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border border-primary/10 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarFallback>{story.initials}</AvatarFallback>
                      {/* Avatar fallback image will be shown since the actual images don't exist */}
                    </Avatar>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl">{story.name}</CardTitle>
                  <CardDescription className="text-primary font-medium">
                    {story.role}
                  </CardDescription>
                  <CardDescription className="text-sm opacity-70">
                    Previously: {story.previousRole}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <blockquote className="italic text-text-secondary border-l-2 border-primary/30 pl-4 py-1">
                    "{story.quote}"
                  </blockquote>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Transition:</span>
                      <span className="text-text font-medium">{story.transition}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Time to transition:</span>
                      <span className="text-text font-medium">{story.transitionTime}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {story.skills.map(skill => (
                        <Badge key={skill} variant="outline" className="bg-primary/5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 text-center">
                    <Button variant="ghost" className="w-full text-primary hover:bg-primary/10 transition-colors duration-300">
                      Read Full Story
                    </Button>
                  </div>
                </CardContent>
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
            <h2 className="text-2xl font-semibold mb-4 text-text">Ready to Write Your Success Story?</h2>
            <p className="text-text-secondary mb-6">
              Join thousands of professionals who have successfully transformed their careers with personalized guidance from Careerate.
            </p>
            <Link href="/transitions/new">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Start Your Career Transition
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessStories;