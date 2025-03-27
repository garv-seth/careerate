
# Careerate 🚀

Careerate is an AI-powered career transition platform that helps tech professionals navigate their career paths with precision and confidence. Using advanced multi-agent systems and LLM technology, Careerate analyzes real-world transition data to create personalized career advancement strategies.

## 🌟 Key Features

### 1. AI-Powered Career Analysis
- **Multi-Agent System**: Utilizes a sophisticated network of specialized AI agents (Research, Coordinator, Analyst) working together to provide comprehensive career insights
- **Real-Time Data Analysis**: Scrapes and analyzes current career transition stories and trends from multiple sources
- **Personalized Success Rate**: Calculates custom success probability based on your specific skills and experience

### 2. Skill Gap Analysis
- **Dynamic Skill Assessment**: Identifies critical skill gaps between your current and target roles
- **Priority-Based Learning**: Recommends skills to acquire based on market demand and impact
- **Confidence Scoring**: Provides confidence scores for skill recommendations

### 3. Transition Planning
- **Custom Development Plans**: Creates milestone-based development plans tailored to your career goals
- **Resource Recommendations**: Suggests learning resources, courses, and materials for each milestone
- **Progress Tracking**: Monitors your advancement through interactive milestones

### 4. Data-Driven Insights
- **Success Stories**: Aggregates and analyzes real transition experiences
- **Market Intelligence**: Provides current trends in career transitions
- **Challenge Analysis**: Identifies common obstacles and strategies to overcome them

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript with TailwindCSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: 
  - LangGraph for multi-agent orchestration
  - Google Gemini Pro for natural language processing
  - Custom-built career analysis algorithms

## 🧠 AI Architecture

### Multi-Agent System
- **Coordinator Agent**: Orchestrates the analysis workflow
- **Research Agent**: Gathers and validates career transition data
- **Analyst Agent**: Processes data and generates insights
- **Plan Execute Agent**: Creates actionable transition plans

### Memory Systems
- **Long-term Memory**: Stores analyzed career patterns and successful transitions
- **Working Memory**: Manages active analysis sessions and user context
- **Vectorized Knowledge Base**: Enables semantic search across career data

### Core Functions
- Career transition path analysis
- Skill gap identification
- Success rate calculation
- Resource curation
- Personalized planning
- Market trend analysis

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
TAVILY_API_KEY=your_tavily_key
```

4. Start the development server
```bash
npm run dev
```

## 📜 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🌟 Acknowledgments

Special thanks to the amazing open-source community and the cutting-edge AI technologies that make Careerate possible.
