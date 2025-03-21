import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DigitalRain from './DigitalRain';

type LoadingStage = 'stories' | 'skills' | 'plan' | 'insights';

interface EngagingLoaderProps {
  currentStage?: LoadingStage;
  transition: {
    currentRole: string;
    targetRole: string;
  };
}

// Career transition facts to show during loading
const careerFacts = [
  "Did you know? According to LinkedIn, software engineers who change jobs see an average salary increase of 13-15%.",
  "On average, it takes 3-6 months to successfully transition between technical roles at different companies.",
  "Top-performing engineers often spend 5-10 hours per week on continuous learning outside of work.",
  "Professionals who actively network are 4x more likely to receive job offers from top tech companies.",
  "Strong system design skills correlate with 20% higher interview success rates for senior engineering roles.",
  "Companies like Google and Amazon consider previous industry experience alongside technical skills in their hiring process.",
  "More than 60% of successful technical career transitions involve mentorship from someone in the target role.",
  "Demonstrating leadership experience can increase your chances of landing senior engineering roles by up to 30%.",
  "Building a public portfolio (GitHub, blog posts, conference talks) can significantly increase visibility to recruiters.",
  "Technical interviews at top companies typically assess both algorithm knowledge and system design capabilities."
];

// Tips specific to different careers
const careerTips: Record<string, string[]> = {
  'Google': [
    "Google interviews heavily focus on algorithm optimization and data structures.",
    "System design questions at Google often involve large-scale distributed systems.",
    "Google's promotion process values impact, scope, and leadership alongside technical skills.",
    "Googlers who contribute to open source projects often have higher internal visibility."
  ],
  'Microsoft': [
    "Microsoft interviews often include questions about design patterns and architecture.",
    "Microsoft values cross-team collaboration skills in senior engineering roles.",
    "Experience with Azure services can be advantageous for Microsoft engineering positions.",
    "Microsoft's career growth framework emphasizes impact across multiple products."
  ],
  'Amazon': [
    "Amazon interviews emphasize their leadership principles alongside technical expertise.",
    "System design at Amazon often focuses on high-availability and fault-tolerant systems.",
    "Amazon values operational excellence and ownership in senior engineering roles.",
    "Experience with AWS services is highly valued in Amazon engineering positions."
  ],
  'Apple': [
    "Apple interviews place high emphasis on attention to detail and product quality.",
    "System design questions at Apple often focus on performance optimization.",
    "Apple values deep domain expertise and innovation in engineering roles.",
    "Experience with Apple's ecosystem (iOS, macOS) can be advantageous."
  ],
  'Meta': [
    "Meta interviews often include questions about scaling systems to billions of users.",
    "Meta values engineers who can move fast and iterate quickly on products.",
    "Experience with open source contributions is highly regarded at Meta.",
    "Meta's promotion process emphasizes impact, technical skills, and collaboration."
  ]
};

// Quick quiz questions to engage users
const quizQuestions = [
  {
    question: "Which of these skills is typically most valued for senior engineering roles?",
    options: ["Code optimization", "System design", "UI development", "Database administration"],
    correctAnswer: "System design"
  },
  {
    question: "What's the typical timeframe for a successful technical career transition?",
    options: ["2-4 weeks", "1-2 months", "3-6 months", "1-2 years"],
    correctAnswer: "3-6 months"
  },
  {
    question: "Which preparation activity yields the highest return for technical interviews?",
    options: ["Reading technical books", "Practicing system design", "Doing coding challenges", "Building side projects"],
    correctAnswer: "Practicing system design"
  },
  {
    question: "What percentage of career transitions involve networking with insiders?",
    options: ["Less than 20%", "About 30%", "Over 60%", "Around 45%"],
    correctAnswer: "Over 60%"
  }
];

const EngagingLoader: React.FC<EngagingLoaderProps> = ({ currentStage, transition }) => {
  const [currentFact, setCurrentFact] = useState<string>('');
  const [currentQuiz, setCurrentQuiz] = useState<typeof quizQuestions[0] | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [contentType, setContentType] = useState<'fact' | 'tip' | 'quiz'>('fact');

  // Get tips specific to the target company if available
  const getTargetCompany = () => {
    const { targetRole } = transition;
    if (targetRole.includes('Google')) return 'Google';
    if (targetRole.includes('Amazon')) return 'Amazon';  
    if (targetRole.includes('Microsoft')) return 'Microsoft';
    if (targetRole.includes('Apple')) return 'Apple';
    if (targetRole.includes('Meta')) return 'Meta';
    return null;
  };

  const targetCompany = getTargetCompany();
  
  useEffect(() => {
    // Reset when stage changes
    setIsAnswered(false);
    setSelectedAnswer(null);
    
    // Rotate between facts, tips, and quizzes
    const timer = setInterval(() => {
      // If quiz is answered, show a fact or tip next
      if (contentType === 'quiz' && isAnswered) {
        const nextType = Math.random() > 0.5 ? 'fact' : (targetCompany && careerTips[targetCompany] ? 'tip' : 'fact');
        setContentType(nextType);
        if (nextType === 'fact') {
          setCurrentFact(careerFacts[Math.floor(Math.random() * careerFacts.length)]);
        } else if (nextType === 'tip' && targetCompany && careerTips[targetCompany]) {
          setCurrentFact(careerTips[targetCompany][Math.floor(Math.random() * careerTips[targetCompany].length)]);
        }
      } 
      // If showing fact or tip, rotate to next or show quiz
      else if (contentType === 'fact' || contentType === 'tip') {
        if (Math.random() > 0.7) { // 30% chance to show a quiz
          setContentType('quiz');
          setCurrentQuiz(quizQuestions[Math.floor(Math.random() * quizQuestions.length)]);
        } else {
          // Show a tip if target company is known, otherwise show a fact
          const nextType = targetCompany && careerTips[targetCompany] && Math.random() > 0.5 ? 'tip' : 'fact';
          setContentType(nextType);
          if (nextType === 'fact') {
            setCurrentFact(careerFacts[Math.floor(Math.random() * careerFacts.length)]);
          } else if (nextType === 'tip' && targetCompany && careerTips[targetCompany]) {
            setCurrentFact(careerTips[targetCompany][Math.floor(Math.random() * careerTips[targetCompany].length)]);
          }
        }
      }
      // If quiz is showing but not answered, keep it
    }, 8000);

    // Initialize with a fact
    setContentType('fact');
    setCurrentFact(careerFacts[Math.floor(Math.random() * careerFacts.length)]);

    return () => clearInterval(timer);
  }, [currentStage, isAnswered, contentType, targetCompany]);

  const handleAnswerClick = (answer: string) => {
    setSelectedAnswer(answer);
    setIsAnswered(true);
  };

  // Determine loading message based on stage
  let loadingMessage = "Gathering data...";
  if (currentStage === 'stories') {
    loadingMessage = "Finding relevant career transition stories...";
  } else if (currentStage === 'skills') {
    loadingMessage = "Analyzing skill gaps for your transition...";
  } else if (currentStage === 'plan') {
    loadingMessage = "Creating your personalized development plan...";
  } else if (currentStage === 'insights') {
    loadingMessage = "Generating key insights for your career move...";
  }

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 overflow-hidden opacity-20 -z-10">
        <DigitalRain height={300} density={2} speed={1.5} />
      </div>
      
      <div className="bg-surface-dark/80 backdrop-blur-sm rounded-xl border border-primary/20 p-6 shadow-glow-sm">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <svg className="w-12 h-12 text-primary-light animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-light">CARA</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-white">{loadingMessage}</h3>
              <p className="text-sm text-text-muted">
                Analyzing {transition.currentRole} → {transition.targetRole} transitions
              </p>
            </div>
          </div>

          <div className="w-full max-w-2xl bg-surface/30 backdrop-blur-sm rounded-lg border border-primary/10 p-4 mb-6">
            {contentType === 'quiz' && currentQuiz && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="quiz-container"
              >
                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Quick Career Quiz
                </h4>
                <p className="text-sm text-text-secondary mb-4">{currentQuiz.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentQuiz.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerClick(option)}
                      disabled={isAnswered}
                      className={`py-2 px-3 text-xs rounded-md transition-colors ${
                        isAnswered
                          ? option === currentQuiz.correctAnswer
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : option === selectedAnswer
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-surface-dark/50 text-text-muted border border-transparent'
                          : 'bg-surface-dark/50 hover:bg-surface-lighter/20 text-text-secondary hover:text-text border border-transparent cursor-pointer'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {isAnswered && (
                  <p className="mt-3 text-xs text-primary-light">
                    {selectedAnswer === currentQuiz.correctAnswer 
                      ? "Correct! This knowledge will help in your transition." 
                      : `The correct answer is: ${currentQuiz.correctAnswer}`}
                  </p>
                )}
              </motion.div>
            )}
            
            {(contentType === 'fact' || contentType === 'tip') && (
              <motion.div
                key={currentFact}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start"
              >
                <div className="flex-shrink-0 mt-1">
                  {contentType === 'fact' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-white mb-1">
                    {contentType === 'fact' ? 'Career Insight' : `${targetCompany} Tip`}
                  </h4>
                  <p className="text-sm text-text-secondary">{currentFact}</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="w-full bg-surface-darkest/50 h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-dark via-primary to-primary-light"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 15,
                ease: "linear",
                repeat: Infinity,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            CARA.AI is gathering real-world data to build your personalized career plan
          </p>
        </div>
      </div>
    </div>
  );
};

export default EngagingLoader;