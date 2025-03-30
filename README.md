
# Careerate 🚀

Careerate is an AI-powered career transition platform leveraging advanced multi-agent systems and LLM technology to help tech professionals navigate career paths effectively.

## 🛠️ Technical Stack

### Frontend
- React + TypeScript for the UI framework
- TailwindCSS with custom components using Radix UI primitives
- Vite for build tooling and development
- React Query for state management
- React Hook Form for form handling
- Wouter for lightweight routing

### Backend
- Node.js + Express for the API server
- TypeScript for type safety
- Drizzle ORM with PostgreSQL for data persistence
- Express Session + Passport.js for authentication
- Rate limiting and security middleware

### AI/ML Infrastructure
- LangChain for orchestrating multi-agent systems
- Google Gemini Pro for natural language processing
- Anthropic Claude for advanced reasoning
- LangGraph for agent workflow management
- Custom agents including:
  - Research Agent for data gathering
  - Analyst Agent for insight generation
  - Planning Agent for career roadmap creation

### Third-Party Integrations (via RapidAPI)
- LinkedIn Jobs API for real-time job market analysis
- Company data enrichment APIs
- Skills taxonomy APIs
- Industry trend analysis endpoints

### Cloud Infrastructure
- Replit for deployment and hosting
- PostgreSQL (NeonDB) for serverless database
- Object storage for file management
- SendGrid for email communications

### Core Features
- Real-time job market analysis
- Skill gap identification
- Career transition planning
- Success probability calculation
- Resource recommendation
- Industry trend analysis
- Multi-company level mapping

## 🔒 Security & Performance
- Rate limiting on API endpoints
- Session-based authentication
- Environment variable management
- Request validation using Zod
- API key rotation and management

## 🚀 Getting Started

1. Clone the repository
```bash
git clone https://github.com/garv-seth/careerate.git
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Create a .env file with the following:
DATABASE_URL=your_postgres_url
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
SENDGRID_API_KEY=your_sendgrid_key
```

4. Start the development server
```bash
npm run dev
```

## 📜 License

MIT License - see LICENSE file for details
