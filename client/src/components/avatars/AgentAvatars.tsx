import { Brain, FileText, BarChart2, Lightbulb } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Agent color scheme
export const agentColors = {
  cara: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    text: 'text-blue-500',
    border: 'border-blue-200',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-700',
  },
  maya: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    text: 'text-purple-500',
    border: 'border-purple-200',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-purple-700',
  },
  ellie: {
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-50',
    text: 'text-pink-500',
    border: 'border-pink-200',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-pink-700',
  },
  sophia: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    text: 'text-green-500',
    border: 'border-green-200',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-green-700',
  }
};

type AgentType = 'cara' | 'maya' | 'ellie' | 'sophia';

export interface AgentAvatarProps {
  agent: AgentType;
  size?: 'sm' | 'md' | 'lg';
  status?: 'idle' | 'active' | 'complete' | 'error';
}

export function AgentAvatar({ agent, size = 'md', status = 'idle' }: AgentAvatarProps) {
  const colors = agentColors[agent];
  
  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  // Status classes
  const statusClasses = {
    idle: '',
    active: 'animate-pulse ring-2 ring-offset-2',
    complete: 'ring-2 ring-offset-2 ring-green-500',
    error: 'ring-2 ring-offset-2 ring-red-500'
  };

  // Agent icons
  const agentIcons = {
    cara: <Brain className="h-4 w-4" />,
    maya: <FileText className="h-4 w-4" />,
    ellie: <BarChart2 className="h-4 w-4" />,
    sophia: <Lightbulb className="h-4 w-4" />
  };

  // Agent display names
  const agentNames = {
    cara: 'Cara',
    maya: 'Maya',
    ellie: 'Ellie',
    sophia: 'Sophia'
  };

  return (
    <Avatar 
      className={`${sizeClasses[size]} ${statusClasses[status]} ${colors.border}`}
    >
      <AvatarImage src="" alt={`${agentNames[agent]} AI Agent`} />
      <AvatarFallback className={`${colors.bg} text-white`}>
        {agentIcons[agent]}
      </AvatarFallback>
    </Avatar>
  );
}

export interface AgentStatusProps {
  agent: AgentType;
  status: 'idle' | 'active' | 'complete' | 'error';
  message?: string;
}

export function AgentStatus({ agent, status, message }: AgentStatusProps) {
  const colors = agentColors[agent];
  
  // Status text and colors
  const statusConfig = {
    idle: {
      label: 'Idle',
      textColor: 'text-muted-foreground',
      bgColor: 'bg-muted'
    },
    active: {
      label: 'Working',
      textColor: colors.text,
      bgColor: colors.bgLight
    },
    complete: {
      label: 'Complete',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    error: {
      label: 'Error',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-2">
      <AgentAvatar agent={agent} size="sm" status={status} />
      <div>
        <div className="flex items-center space-x-1">
          <span className="font-medium text-sm">
            {agent.charAt(0).toUpperCase() + agent.slice(1)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        {message && (
          <p className="text-xs text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export interface AgentStatusGroupProps {
  statuses: {
    agent: AgentType;
    status: 'idle' | 'active' | 'complete' | 'error';
    message?: string;
  }[];
}

export function AgentStatusGroup({ statuses }: AgentStatusGroupProps) {
  return (
    <div className="space-y-2">
      {statuses.map((status, index) => (
        <AgentStatus
          key={index}
          agent={status.agent}
          status={status.status}
          message={status.message}
        />
      ))}
    </div>
  );
}