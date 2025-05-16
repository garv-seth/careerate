import React from 'react';
import ReactDOM from 'react-dom';

// Simple component for testing
const App = () => {
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#0066cc', fontSize: '2.5rem' }}>Careerate</h1>
        <p style={{ color: '#666' }}>AI-Powered Career Acceleration Platform</p>
      </header>
      
      <main>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '2rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#333', marginBottom: '1rem' }}>Welcome to Careerate</h2>
          <p>Your intelligent, interactive career development platform powered by advanced AI technologies.</p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            margin: '2rem 0' 
          }}>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px' }}>
              <h3 style={{ color: '#0066cc' }}>Career Analytics</h3>
              <p>Get strategic insights into your professional growth potential.</p>
            </div>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px' }}>
              <h3 style={{ color: '#0066cc' }}>Multi-Agent AI</h3>
              <p>Access our advanced AI system for personalized guidance.</p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button style={{ 
              background: '#0066cc', 
              color: 'white', 
              border: 'none', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '1rem'
            }}>
              Get Started
            </button>
            <button style={{ 
              background: '#f8f9fa', 
              color: '#333', 
              border: '1px solid #ddd', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Learn More
            </button>
          </div>
        </div>
      </main>
      
      <footer style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>© 2025 Careerate. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));