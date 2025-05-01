import React from 'react';

// Agent colors based on their personalities and roles
export const agentColors = {
  cara: {
    primary: '#4E85EB',    // Blue - Lead coordinator
    secondary: '#92B6F1',
    gradient: 'linear-gradient(135deg, #4E85EB 0%, #92B6F1 100%)',
    bg: 'bg-blue-600',
    bgLight: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-600'
  },
  maya: {
    primary: '#A855F7',    // Purple - Resume analyzer
    secondary: '#D8B4FE',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #D8B4FE 100%)',
    bg: 'bg-purple-600',
    bgLight: 'bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-600'
  },
  ellie: {
    primary: '#EC4899',    // Pink - Industry insights
    secondary: '#F9A8D4',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F9A8D4 100%)',
    bg: 'bg-pink-600',
    bgLight: 'bg-pink-100',
    text: 'text-pink-600',
    border: 'border-pink-600'
  },
  sophia: {
    primary: '#16A34A',    // Green - Learning advisor
    secondary: '#86EFAC',
    gradient: 'linear-gradient(135deg, #16A34A 0%, #86EFAC 100%)',
    bg: 'bg-green-600',
    bgLight: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-600'
  }
};

type AgentAvatarProps = {
  name: 'cara' | 'maya' | 'ellie' | 'sophia';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'idle' | 'active' | 'thinking' | 'complete';
  className?: string;
};

// Stylized SVG avatars for each agent
export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  name, 
  size = 'md', 
  status = 'idle',
  className = ''
}) => {
  const colors = agentColors[name];
  
  // Size mappings
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };
  
  // Status indicator styles
  const statusStyles = {
    idle: 'bg-gray-300',
    active: 'bg-green-500 animate-pulse',
    thinking: 'bg-yellow-400 animate-pulse',
    complete: 'bg-green-500'
  };
  
  const avatarClass = `relative rounded-full ${sizeMap[size]} ${className}`;
  
  const getInitial = () => {
    return name.charAt(0).toUpperCase();
  };
  
  return (
    <div className={avatarClass} style={{ background: colors.gradient }}>
      <div className="absolute inset-0 flex items-center justify-center text-white font-semibold">
        {getInitial()}
      </div>
      
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border-2 border-white ${statusStyles[status]}`}></div>
    </div>
  );
};

// Agent avatar with name label and status
export const AgentAvatarWithLabel: React.FC<AgentAvatarProps & { 
  showName?: boolean;
  showStatus?: boolean;
}> = ({ 
  name, 
  size = 'md', 
  status = 'idle',
  showName = true,
  showStatus = true,
  className = '' 
}) => {
  const getFullName = () => {
    const names = {
      'cara': 'Cara',
      'maya': 'Maya',
      'ellie': 'Ellie',
      'sophia': 'Sophia'
    };
    return names[name];
  };
  
  const getStatusText = () => {
    const statusTexts = {
      idle: 'Idle',
      active: 'Active',
      thinking: 'Thinking...',
      complete: 'Complete'
    };
    return statusTexts[status];
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      <AgentAvatar name={name} size={size} status={status} />
      {showName && (
        <div className="ml-3">
          <p className="font-medium">{getFullName()}</p>
          {showStatus && (
            <p className="text-xs text-gray-500">{getStatusText()}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Group avatar display for all agents
export const AgentAvatarGroup: React.FC<{
  statuses?: {
    cara: 'idle' | 'active' | 'thinking' | 'complete';
    maya: 'idle' | 'active' | 'thinking' | 'complete';
    ellie: 'idle' | 'active' | 'thinking' | 'complete';
    sophia: 'idle' | 'active' | 'thinking' | 'complete';
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({
  statuses = {
    cara: 'idle',
    maya: 'idle',
    ellie: 'idle',
    sophia: 'idle'
  },
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex -space-x-2 ${className}`}>
      <AgentAvatar name="cara" size={size} status={statuses.cara} className="z-40 border-2 border-white" />
      <AgentAvatar name="maya" size={size} status={statuses.maya} className="z-30 border-2 border-white" />
      <AgentAvatar name="ellie" size={size} status={statuses.ellie} className="z-20 border-2 border-white" />
      <AgentAvatar name="sophia" size={size} status={statuses.sophia} className="z-10 border-2 border-white" />
    </div>
  );
};