import { Brain, FileText, BarChart2, Lightbulb } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { agentColors } from '@/lib/themes';

// Re-export the agent colors for other components
export { agentColors };

type AgentType = 'cara' | 'maya' | 'ellie' | 'sophia';

export interface AgentAvatarProps {
  agent: AgentType;
  size?: 'sm' | 'md' | 'lg';
  status?: 'idle' | 'active' | 'thinking' | 'complete';
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
    thinking: 'ring-2 ring-offset-2 ring-amber-500',
    complete: 'ring-2 ring-offset-2 ring-green-500'
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
      className={cn(
        sizeClasses[size], 
        statusClasses[status], 
        colors.border,
        "transition-all duration-300"
      )}
    >
      <AvatarImage src="" alt={`${agentNames[agent]} AI Agent`} />
      <AvatarFallback className={cn(colors.bg, "text-white")}>
        {agentIcons[agent]}
      </AvatarFallback>
    </Avatar>
  );
}

export interface AgentStatusProps {
  agent: AgentType;
  status: 'idle' | 'active' | 'thinking' | 'complete';
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
    thinking: {
      label: 'Thinking',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    complete: {
      label: 'Complete',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
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
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full transition-colors",
            config.bgColor,
            config.textColor
          )}>
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
    status: 'idle' | 'active' | 'thinking' | 'complete';
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