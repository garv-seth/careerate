# Careerate Architecture

## Overview

Careerate is an AI-powered career acceleration platform that helps professionals navigate the future of work through AI-powered career insights, skill gap analysis, and personalized learning roadmaps. The application employs a multi-agent AI system with four specialized agents:

1. **Cara**: Orchestration agent coordinating personalized career strategies
2. **Maya**: Resume analysis AI identifying strengths, gaps, and automation risks
3. **Ellie**: Industry insights agent monitoring market trends and opportunities
4. **Sophia**: Learning AI creating personalized skill development roadmaps

The system is built as a full-stack TypeScript application with a React frontend and Node.js backend, using a PostgreSQL database for data persistence. It leverages various AI capabilities through services like OpenAI, Perplexity, and Pinecone.

## System Architecture

### High-Level Architecture

Careerate follows a modern web application architecture with the following components:

1. **Frontend**: React-based SPA (Single Page Application) with TypeScript
2. **Backend**: Node.js server with Express.js framework using TypeScript
3. **Database**: PostgreSQL via Neon serverless PostgreSQL (cloud-based)
4. **AI Services**: Integration with OpenAI, Perplexity, Anthropic, and Pinecone
5. **Object Storage**: Replit Object Storage for file uploads (resumes)
6. **Session Management**: PostgreSQL-based session storage

### Key Design Decisions

1. **Monorepo Structure**: The application uses a monorepo approach with shared code between frontend and backend, simplifying dependency management and deployment.

2. **TypeScript Throughout**: Both frontend and backend use TypeScript, providing type safety across the entire application.

3. **Modular AI System**: The AI functionality is structured as a multi-agent system, with each agent having specific responsibilities and capabilities.

4. **API-First Backend**: The backend exposes a RESTful API consumed by the frontend, with clear separation of concerns.

5. **Serverless Database**: Using NeonDB's serverless PostgreSQL for scalable and managed database services.

## Key Components

### Frontend

- **Technology Stack**: React, TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: React Query for server state, React Context for global state
- **Routing**: Uses Wouter for client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

The frontend is organized into the following structure:
- `/client/src/components`: UI components including shadcn/ui components
- `/client/src/hooks`: Custom React hooks for shared functionality
- `/client/src/pages`: Page components for different routes
- `/client/src/lib`: Utility functions and configuration

### Backend

- **Technology Stack**: Node.js, Express.js, TypeScript
- **API Framework**: Express.js with RESTful endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Custom auth implementation with Passport.js and session-based auth

The backend is structured as follows:
- `/server`: Main server code
- `/server/api`: API route handlers
- `/server/middleware`: Express middleware functions
- `/shared`: Shared code between frontend and backend (e.g., types, schemas)
- `/src/agents`: AI agent implementations and related code

### Database

The application uses Drizzle ORM with PostgreSQL. The database schema is defined in `/shared/schema.ts` and includes:

- **users**: User account information
- **sessions**: Session storage for authentication
- **profiles**: User profile data including career information
- **vectors**: Vector embeddings for AI models
- **careerPaths**, **careerMilestones**, **alternativePaths**: Career path data
- **skillsLibrary**, **userSkills**: Skills catalog and user's skills
- **learningResources**, **learningPathResources**: Learning materials and paths

### AI System

The AI system uses a multi-agent architecture based on LangChain and custom implementations:

- **Agent Core**: `/src/agents/agents.ts` - Base agent implementations
- **Agent Graph**: `/src/agents/graph.ts` - Workflow orchestration between agents
- **Agent Memory**: `/src/agents/memory.ts` - Persistent memory for agents
- **Vector Store**: Integration with Pinecone for semantic search
- **External Tools**: Integrations with Perplexity, Brave Search, and other services

Each agent has specialized prompts and capabilities defined in `/src/agents/prompts.ts`.

### Authentication & Authorization

- **Session-Based Authentication**: Express sessions stored in PostgreSQL
- **Replit Auth Integration**: Support for Replit's authentication system
- **Passport.js**: Local strategy implementation for username/password login
- **Role-Based Authorization**: Middleware for protecting routes based on user roles

## Data Flow

### Authentication Flow

1. User logs in via `/api/auth/login` endpoint
2. Passport.js validates credentials 
3. On success, a session is created and stored in PostgreSQL
4. Frontend receives user data and stores authentication state

### Resume Analysis Flow

1. User uploads resume via frontend
2. File is processed and stored in Replit Object Storage
3. Resume text is extracted and analyzed by Maya (resume analysis agent)
4. Text is vectorized and stored in Pinecone for semantic search
5. Analysis results are processed by Cara (orchestration agent)
6. Career insights and automation risks are determined by Ellie (industry insights agent)
7. Learning recommendations are generated by Sophia (learning AI)
8. Results are returned to the frontend and displayed to the user

### Real-time Agent Activity

1. Socket.io is used for real-time communication between agents and frontend
2. Agent activities are broadcast to the frontend as they occur
3. Frontend displays agent status and activities in real-time

## External Dependencies

### AI Services
- **OpenAI API**: For LLM capabilities (GPT models) and embeddings
- **Anthropic API**: For Claude LLM as an alternative model
- **Perplexity API**: For additional research and knowledge capabilities
- **Pinecone**: Vector database for semantic search and embeddings storage

### Infrastructure
- **Neon Database**: Serverless PostgreSQL database
- **Replit Object Storage**: For storing user-uploaded files
- **Replit Deployment**: Hosting platform with serverless capabilities

### Frontend Libraries
- **shadcn/ui**: Component library based on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and cache management
- **Framer Motion**: Animation library

## Deployment Strategy

The application uses a production-optimized deployment strategy:

1. **Build Process**:
   - Frontend is built with Vite for production
   - Backend TypeScript is transpiled to JavaScript
   - Assets are bundled and optimized

2. **Deployment Target**:
   - Configured for deployment on Replit's "autoscale" infrastructure
   - Supports both HTTP and WebSocket connections

3. **Environment Configuration**:
   - Environment variables for API keys and configuration
   - Separate configurations for development and production

4. **Database Migration**:
   - Drizzle ORM handles database schema migrations
   - Migration scripts for schema updates

5. **Continuous Deployment**:
   - Build scripts in `.deployment` and `build.sh`
   - Run configuration specified in `.replit`

## Development Workflow

1. **Local Development**:
   - `npm run dev`: Starts development server with hot reloading
   - TypeScript checks with `npm run check`
   - Database schema updates with `npm run db:push`

2. **Production Build**:
   - `npm run build`: Creates optimized production build
   - `npm start`: Runs the production server

3. **API Testing**:
   - Test scripts for verifying API connections
   - Mock implementations for development without API keys