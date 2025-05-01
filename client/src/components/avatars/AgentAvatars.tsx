import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { agentDescriptions } from './types';

// Agent color scheme
export const agentColors = {
  cara: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
    text: 'text-blue-500',
    gradient: 'from-blue-500 to-cyan-500'
  },
  maya: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    border: 'border-purple-500',
    ring: 'ring-purple-500',
    text: 'text-purple-500',
    gradient: 'from-purple-500 to-pink-500'
  },
  ellie: {
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-50',
    border: 'border-pink-500',
    ring: 'ring-pink-500',
    text: 'text-pink-500',
    gradient: 'from-pink-500 to-rose-500'
  },
  sophia: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    border: 'border-green-500',
    ring: 'ring-green-500',
    text: 'text-green-500',
    gradient: 'from-green-500 to-emerald-500'
  }
};

// Agent avatar size configuration
const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
};

// Status indicator styles
const statusClasses = {
  idle: 'bg-gray-300',
  active: 'bg-blue-500 animate-pulse',
  thinking: 'bg-yellow-500 animate-pulse',
  complete: 'bg-green-500'
};

// Agent avatar component that shows agent status
type AgentAvatarProps = {
  name: 'cara' | 'maya' | 'ellie' | 'sophia';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'idle' | 'active' | 'thinking' | 'complete';
  className?: string;
};

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  name, 
  size = 'md', 
  status = 'idle',
  className = ''
}) => {
  const colors = agentColors[name];
  
  return (
    <div className={`relative ${className}`}>
      <Avatar className={cn(
        sizeClasses[size],
        `rounded-full border-2 ${colors.border} ${colors.bgLight}`,
        status === 'active' && 'ring-2 ring-offset-2 ring-offset-background',
        status === 'active' && colors.ring
      )}>
        <AvatarImage src={`/agent-${name}.png`} alt={`Agent ${name}`} />
        <AvatarFallback className={`bg-gradient-to-br ${colors.gradient} text-white font-bold`}>
          {name[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Status indicator */}
      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${statusClasses[status]}`} />
    </div>
  );
};

// Agent avatar with label
export const AgentAvatarWithLabel: React.FC<AgentAvatarProps & { 
  showRole?: boolean 
}> = ({ name, size = 'md', status = 'idle', showRole = false, className = '' }) => {
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1);
  const colors = agentColors[name];
  
  return (
    <div className={`flex items-center ${className}`}>
      <AgentAvatar name={name} size={size} status={status} />
      <div className="ml-3">
        <div className="font-medium">{nameCapitalized}</div>
        {showRole && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {agentDescriptions[name].role}
          </div>
        )}
      </div>
    </div>
  );
};

// Agent avatar group to show multiple agents
export const AgentAvatarGroup: React.FC<{
  statuses: {
    cara: 'idle' | 'active' | 'thinking' | 'complete';
    maya: 'idle' | 'active' | 'thinking' | 'complete';
    ellie: 'idle' | 'active' | 'thinking' | 'complete';
    sophia: 'idle' | 'active' | 'thinking' | 'complete';
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ statuses, size = 'md', className = '' }) => {
  return (
    <div className={`flex -space-x-2 ${className}`}>
      {(['cara', 'maya', 'ellie', 'sophia'] as const).map(agent => (
        <TooltipProvider key={agent} delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <AgentAvatar 
                  name={agent} 
                  size={size} 
                  status={statuses[agent]}
                  className="border-2 border-background"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm font-medium mb-1">
                {agent.charAt(0).toUpperCase() + agent.slice(1)}
              </div>
              <div className="text-xs mb-1">{agentDescriptions[agent].role}</div>
              <div className="flex items-center text-xs">
                <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{ 
                  backgroundColor: statusClasses[statuses[agent]].replace('animate-pulse', '').trim()
                }} />
                <span className="capitalize">{statuses[agent]}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

// Agent status badge
export const AgentStatusBadge: React.FC<{
  status: 'idle' | 'active' | 'thinking' | 'complete';
  className?: string;
}> = ({ status, className = '' }) => {
  let icon = null;
  let variant = 'outline';
  
  switch (status) {
    case 'active':
      icon = <AlertCircle className="h-3.5 w-3.5 mr-1" />;
      variant = 'default';
      break;
    case 'thinking':
      icon = <RefreshCcw className="h-3.5 w-3.5 mr-1 animate-spin" />;
      variant = 'secondary';
      break;
    case 'complete':
      icon = <CheckCircle className="h-3.5 w-3.5 mr-1" />;
      variant = 'success';
      break;
    default:
      break;
  }
  
  return (
    <Badge variant={variant as any} className={`capitalize ${className}`}>
      {icon}
      {status}
    </Badge>
  );
};