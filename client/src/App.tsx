import React from 'react';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <header className="w-full py-4 bg-primary text-white text-center mb-6">
        <h1 className="text-2xl font-bold">Careerate</h1>
        <p className="text-sm">AI-Powered Career Acceleration Platform</p>
      </header>
      
      <main className="container mx-auto px-4 flex-1 flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full bg-card p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-4">Welcome to Careerate</h2>
          <p className="mb-6 text-lg">
            Your intelligent, interactive career development platform powered by advanced AI technologies.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-secondary p-4 rounded-md">
              <h3 className="font-bold text-xl mb-2">Career Analytics</h3>
              <p>Get strategic insights into your professional growth potential.</p>
            </div>
            <div className="bg-secondary p-4 rounded-md">
              <h3 className="font-bold text-xl mb-2">Multi-Agent AI</h3>
              <p>Access our advanced AI system for personalized guidance.</p>
            </div>
            <div className="bg-secondary p-4 rounded-md">
              <h3 className="font-bold text-xl mb-2">Skill Analysis</h3>
              <p>Identify gaps and opportunities in your skill portfolio.</p>
            </div>
            <div className="bg-secondary p-4 rounded-md">
              <h3 className="font-bold text-xl mb-2">Career Trajectory</h3>
              <p>Map your professional journey with AI-powered planning.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary hover:bg-primary/90 text-white py-2 px-6 rounded-md">
              Get Started
            </button>
            <button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 px-6 rounded-md">
              Learn More
            </button>
          </div>
        </div>
      </main>
      
      <footer className="w-full py-4 bg-card text-center mt-6 border-t">
        <p className="text-sm">© 2025 Careerate. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;