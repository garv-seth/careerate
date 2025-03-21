import React, { useEffect, useRef } from 'react';

// Collection of tech companies, job roles, and skills that will appear in the digital rain
const techElements = [
  // Companies
  'Google', 'Amazon', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Twitter',
  'Adobe', 'Salesforce', 'Oracle', 'IBM', 'Intel', 'Cisco', 'Uber', 'Airbnb',
  'Spotify', 'LinkedIn', 'PayPal', 'Square', 'Slack', 'Zoom', 'Dropbox', 'Twilio',
  
  // Tech Roles
  'Engineer', 'Developer', 'Architect', 'Designer', 'Manager', 'Director', 'VP',
  'CTO', 'CEO', 'Analyst', 'Scientist', 'Researcher', 'Lead', 'Specialist',
  
  // Skills
  'JavaScript', 'Python', 'React', 'Angular', 'Node.js', 'TypeScript', 'AWS', 'Azure',
  'Docker', 'Kubernetes', 'SQL', 'NoSQL', 'ML', 'AI', 'Blockchain', 'GraphQL',
  'DevOps', 'Cloud', 'Agile', 'Scrum', 'UI/UX', 'Product', 'Leadership', 'Strategy',
  
  // Transition phrases
  'Career Path', 'Transition', 'Promotion', 'Advancement', 'Growth', 'Journey',
  'Opportunity', 'Evolution', 'Progress', 'Transform', 'Skill Gap', 'Analysis'
];

interface Column {
  x: number;
  speed: number;
  chars: {
    value: string;
    y: number;
    opacity: number;
    color: string;
  }[];
  element?: string;
  elementPos?: number;
  nextUpdate: number;
}

interface DigitalRainProps {
  className?: string;
  height?: number;
  density?: number; // Number of columns per 100px width (1-5)
  speed?: number; // Base speed (1-3)
  primaryColor?: string;
  backgroundColor?: string;
  fontSize?: number;
}

const DigitalRain: React.FC<DigitalRainProps> = ({
  className = '',
  height = 300,
  density = 2,
  speed = 1.5,
  primaryColor = '#00ffaa',
  backgroundColor = 'transparent',
  fontSize = 14,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    let columns: Column[] = [];
    let width = 0;
    let animationRunning = true;

    const initializeColumns = () => {
      width = canvas.width;
      const numColumns = Math.floor((width / 100) * density * 5); // Adjust number of columns based on density
      const baseSpeed = speed * 0.5;

      columns = [];
      for (let i = 0; i < numColumns; i++) {
        const x = Math.floor(Math.random() * width);
        const columnSpeed = baseSpeed + Math.random() * baseSpeed;
        
        const chars: Column['chars'] = [];
        columns.push({
          x,
          speed: columnSpeed,
          chars,
          nextUpdate: Math.random() * 1000 // Stagger start times
        });
      }
      columnsRef.current = columns;
    };

    const addRandomElementToColumn = (column: Column) => {
      // 20% chance to add a tech element instead of just letters
      if (Math.random() < 0.2) {
        column.element = techElements[Math.floor(Math.random() * techElements.length)];
        column.elementPos = -column.element.length; // Start above the canvas
      } else {
        column.element = undefined;
        column.elementPos = undefined;
      }
    };

    const updateColumns = (time: number) => {
      if (!ctx || !canvas) return;
      
      const deltaTime = time - lastTime;
      lastTime = time;
      timeRef.current = time;

      // Clear canvas with slight transparency for trail effect
      ctx.fillStyle = backgroundColor === 'transparent' 
        ? 'rgba(0, 0, 0, 0.1)' 
        : backgroundColor + '11'; // Add slight transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';

      columns.forEach((column, columnIndex) => {
        // Only update on specific intervals based on speed
        if (time < column.nextUpdate) return;
        
        // Character update frequency based on column speed
        column.nextUpdate = time + (600 / column.speed);

        // Update element position if we have one
        if (column.element && column.elementPos !== undefined) {
          column.elementPos += 1;
          
          // Draw tech element at its current position
          const elementY = column.elementPos * fontSize;
          
          // Create gradient effect for element
          const gradient = ctx.createLinearGradient(
            column.x, elementY - fontSize,
            column.x, elementY + (column.element.length * fontSize)
          );
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(1, 'rgba(0,255,170,0.2)');
          
          // Draw each character of the element
          for (let i = 0; i < column.element.length; i++) {
            const char = column.element[i];
            const charY = elementY + (i * fontSize);
            
            if (charY > 0 && charY < canvas.height) {
              ctx.fillStyle = gradient;
              ctx.fillText(char, column.x, charY);
            }
          }
          
          // Remove element once it's off screen
          if (elementY > canvas.height + (column.element.length * fontSize)) {
            addRandomElementToColumn(column);
          }
        } else {
          // If we don't have an element, maybe add one
          if (Math.random() < 0.01) {
            addRandomElementToColumn(column);
          }
          
          // Add a new char at the top every so often
          if (Math.random() < 0.2) {
            const charCode = Math.random() < 0.5 
              ? Math.floor(Math.random() * 26) + 65 // A-Z
              : Math.floor(Math.random() * 10) + 48; // 0-9
              
            const color = Math.random() < 0.1 
              ? primaryColor // Highlighted char
              : `rgba(0,255,170,${0.3 + Math.random() * 0.7})`; // Regular char with varying opacity
              
            column.chars.push({
              value: String.fromCharCode(charCode),
              y: 0,
              opacity: 1,
              color
            });
          }
          
          // Update existing chars
          for (let i = column.chars.length - 1; i >= 0; i--) {
            const char = column.chars[i];
            char.y += column.speed;
            char.opacity -= 0.005 * column.speed;
            
            if (char.y > canvas.height || char.opacity <= 0) {
              column.chars.splice(i, 1);
            } else {
              ctx.fillStyle = char.color.replace('1)', `${char.opacity})`);
              ctx.fillText(char.value, column.x, char.y);
            }
          }
        }
      });

      if (animationRunning) {
        animationRef.current = requestAnimationFrame(updateColumns);
      }
    };

    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = height;
      initializeColumns();
    };

    // Initialize
    handleResize();
    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame(updateColumns);

    // Cleanup
    return () => {
      animationRunning = false;
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [density, speed, height, primaryColor, backgroundColor, fontSize]);

  return (
    <canvas
      ref={canvasRef}
      className={`digital-rain w-full ${className}`}
      style={{ height: `${height}px` }}
    />
  );
};

export default DigitalRain;