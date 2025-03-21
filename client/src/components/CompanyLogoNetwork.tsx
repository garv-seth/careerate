import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Company logo data with industry segmentation
const COMPANY_DATA = [
  // Tech Giants
  { name: 'Google', industry: 'tech', size: 1.2 },
  { name: 'Apple', industry: 'tech', size: 1.2 },
  { name: 'Microsoft', industry: 'tech', size: 1.2 },
  { name: 'Amazon', industry: 'tech', size: 1.2 },
  { name: 'Meta', industry: 'tech', size: 1.1 },
  
  // Enterprise Software
  { name: 'Salesforce', industry: 'enterprise', size: 0.9 },
  { name: 'Oracle', industry: 'enterprise', size: 0.9 },
  { name: 'SAP', industry: 'enterprise', size: 0.9 },
  { name: 'Adobe', industry: 'enterprise', size: 0.9 },
  { name: 'IBM', industry: 'enterprise', size: 1.0 },
  
  // Fintech
  { name: 'PayPal', industry: 'fintech', size: 0.8 },
  { name: 'Square', industry: 'fintech', size: 0.8 },
  { name: 'Stripe', industry: 'fintech', size: 0.8 },
  { name: 'Robinhood', industry: 'fintech', size: 0.7 },
  
  // Consumer Tech
  { name: 'Netflix', industry: 'consumer', size: 0.9 },
  { name: 'Spotify', industry: 'consumer', size: 0.8 },
  { name: 'Uber', industry: 'consumer', size: 0.9 },
  { name: 'Airbnb', industry: 'consumer', size: 0.8 },
  { name: 'Lyft', industry: 'consumer', size: 0.7 },
  
  // Social Media
  { name: 'Twitter', industry: 'social', size: 0.8 },
  { name: 'LinkedIn', industry: 'social', size: 0.9 },
  { name: 'Snap', industry: 'social', size: 0.7 },
  { name: 'TikTok', industry: 'social', size: 0.8 },
  
  // Cloud
  { name: 'AWS', industry: 'cloud', size: 1.0 },
  { name: 'Azure', industry: 'cloud', size: 0.9 },
  { name: 'GCP', industry: 'cloud', size: 0.9 },
  
  // Misc Tech
  { name: 'Tesla', industry: 'misc', size: 1.0 },
  { name: 'Intel', industry: 'misc', size: 0.8 },
  { name: 'Nvidia', industry: 'misc', size: 0.9 },
  { name: 'AMD', industry: 'misc', size: 0.8 },
];

// Colors by industry
const INDUSTRY_COLORS = {
  tech: '#00c3ff',       // Primary blue
  enterprise: '#4caf50', // Green
  fintech: '#ff9800',    // Orange
  consumer: '#e91e63',   // Pink
  social: '#9c27b0',     // Purple
  cloud: '#03a9f4',      // Light blue
  misc: '#607d8b',       // Blue grey
};

interface Node {
  id: string;
  name: string;
  industry: string;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  color: string;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

interface CompanyLogoNetworkProps {
  className?: string;
  height?: number;
  width?: number;
  interactionStrength?: number;
  selectedCompany?: string;
  onSelectCompany?: (company: string | null) => void;
}

const CompanyLogoNetwork: React.FC<CompanyLogoNetworkProps> = ({
  className = '',
  height = 400,
  width = 800,
  interactionStrength = 1,
  selectedCompany,
  onSelectCompany,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: width, height: height });
  
  // Mouse interaction state
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const selectedNodeRef = useRef<string | null>(null);
  
  // Initialize the simulation
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Update dimensions to match container
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setDimensions({
          width: containerWidth,
          height: height,
        });
      }
    };
    
    // Initial dimension setting
    updateDimensions();
    
    // Update on resize
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);
  
  // Setup the simulation
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // Create nodes
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const nodes: Node[] = COMPANY_DATA.map(company => {
      // Distribute around center initially
      const angle = Math.random() * 2 * Math.PI;
      const distance = 50 + Math.random() * 100;
      
      return {
        id: company.name,
        name: company.name,
        industry: company.industry,
        size: company.size,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        color: INDUSTRY_COLORS[company.industry as keyof typeof INDUSTRY_COLORS],
      };
    });
    
    // Create edges - connections between companies in the same industry and some cross-industry links
    const edges: Edge[] = [];
    
    // Create industry clusters
    const industries = [...new Set(nodes.map(node => node.industry))];
    industries.forEach(industry => {
      const industryNodes = nodes.filter(node => node.industry === industry);
      
      // Connect nodes within the same industry
      for (let i = 0; i < industryNodes.length; i++) {
        for (let j = i + 1; j < industryNodes.length; j++) {
          edges.push({
            source: industryNodes[i].id,
            target: industryNodes[j].id,
            strength: 0.3 + Math.random() * 0.3, // Stronger connections within industry
          });
        }
      }
    });
    
    // Add some cross-industry connections
    const totalCrossIndustryLinks = Math.floor(nodes.length * 0.3);
    for (let i = 0; i < totalCrossIndustryLinks; i++) {
      const sourceIndex = Math.floor(Math.random() * nodes.length);
      let targetIndex;
      do {
        targetIndex = Math.floor(Math.random() * nodes.length);
      } while (
        sourceIndex === targetIndex ||
        nodes[sourceIndex].industry === nodes[targetIndex].industry
      );
      
      edges.push({
        source: nodes[sourceIndex].id,
        target: nodes[targetIndex].id,
        strength: 0.1 + Math.random() * 0.2, // Weaker connections across industries
      });
    }
    
    nodesRef.current = nodes;
    edgesRef.current = edges;
    
    // Start the animation loop
    animateNetwork();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);
  
  // Mouse interaction handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      mouseRef.current.x = mouseX;
      mouseRef.current.y = mouseY;
      
      // Check if hovering over a node
      const nodes = nodesRef.current;
      let hoveredNodeId: string | null = null;
      
      for (const node of nodes) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = 24 * node.size;
        
        if (distance < nodeRadius) {
          hoveredNodeId = node.id;
          break;
        }
      }
      
      setHoveredNode(hoveredNodeId);
      
      // If mouse is down and we have a selected node, update its position
      if (mouseRef.current.down && selectedNodeRef.current) {
        const selectedNode = nodes.find(node => node.id === selectedNodeRef.current);
        if (selectedNode) {
          selectedNode.fx = mouseX;
          selectedNode.fy = mouseY;
        }
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      mouseRef.current.down = true;
      
      // Check if clicking on a node
      const nodes = nodesRef.current;
      for (const node of nodes) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = 24 * node.size;
        
        if (distance < nodeRadius) {
          selectedNodeRef.current = node.id;
          node.fx = mouseX;
          node.fy = mouseY;
          
          if (onSelectCompany) {
            onSelectCompany(node.id);
          }
          return;
        }
      }
      
      // If clicked empty space, deselect
      selectedNodeRef.current = null;
      if (onSelectCompany) {
        onSelectCompany(null);
      }
    };
    
    const handleMouseUp = () => {
      mouseRef.current.down = false;
      
      // Release the fixed position on the selected node
      if (selectedNodeRef.current) {
        const selectedNode = nodesRef.current.find(node => node.id === selectedNodeRef.current);
        if (selectedNode) {
          selectedNode.fx = null;
          selectedNode.fy = null;
        }
      }
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onSelectCompany]);
  
  // Update selected company from props
  useEffect(() => {
    if (selectedCompany) {
      selectedNodeRef.current = selectedCompany;
    } else {
      selectedNodeRef.current = null;
    }
  }, [selectedCompany]);
  
  // Force simulation functions
  const applyForces = () => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    
    // Reset forces
    nodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });
    
    // Apply edge forces
    edges.forEach(edge => {
      const source = nodes.find(node => node.id === edge.source);
      const target = nodes.find(node => node.id === edge.target);
      
      if (!source || !target) return;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Target distance based on node sizes
      const idealDistance = 80 * (source.size + target.size) / 2;
      
      if (distance === 0) return;
      
      // Strength increases or decreases based on how far from ideal distance
      const strength = edge.strength * interactionStrength * 0.05;
      const force = (distance - idealDistance) * strength;
      
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;
      
      // Apply force to both nodes
      if (!source.fx) source.vx += forceX;
      if (!source.fy) source.vy += forceY;
      if (!target.fx) target.vx -= forceX;
      if (!target.fy) target.vy -= forceY;
    });
    
    // Apply repulsive forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) continue;
        
        const minDistance = 40 * (nodeA.size + nodeB.size);
        
        if (distance < minDistance) {
          const strength = 0.2 * interactionStrength;
          const force = strength * (minDistance - distance) / distance;
          
          const forceX = dx * force;
          const forceY = dy * force;
          
          if (!nodeA.fx) nodeA.vx -= forceX;
          if (!nodeA.fy) nodeA.vy -= forceY;
          if (!nodeB.fx) nodeB.vx += forceX;
          if (!nodeB.fy) nodeB.vy += forceY;
        }
      }
    }
    
    // Apply centering force
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    nodes.forEach(node => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 150) {
        const strength = 0.003 * interactionStrength;
        if (!node.fx) node.vx += dx * strength;
        if (!node.fy) node.vy += dy * strength;
      }
    });
    
    // Apply containment forces to keep nodes within bounds
    const padding = 50;
    
    nodes.forEach(node => {
      // Left boundary
      if (node.x < padding) {
        if (!node.fx) node.vx += 0.2 * (padding - node.x);
      }
      
      // Right boundary
      if (node.x > dimensions.width - padding) {
        if (!node.fx) node.vx -= 0.2 * (node.x - (dimensions.width - padding));
      }
      
      // Top boundary
      if (node.y < padding) {
        if (!node.fy) node.vy += 0.2 * (padding - node.y);
      }
      
      // Bottom boundary
      if (node.y > dimensions.height - padding) {
        if (!node.fy) node.vy -= 0.2 * (node.y - (dimensions.height - padding));
      }
    });
    
    // Update positions
    nodes.forEach(node => {
      // Apply damping
      node.vx *= 0.9;
      node.vy *= 0.9;
      
      // Update position if not fixed
      if (!node.fx) node.x += node.vx;
      if (!node.fy) node.y += node.vy;
    });
  };
  
  const drawNetwork = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(node => node.id === edge.source);
      const target = nodes.find(node => node.id === edge.target);
      
      if (!source || !target) return;
      
      const isHighlighted = 
        selectedNodeRef.current !== null && 
        (edge.source === selectedNodeRef.current || edge.target === selectedNodeRef.current);
      
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      
      if (isHighlighted) {
        // Highlighted edge
        const gradientColor = source.id === selectedNodeRef.current ? source.color : target.color;
        const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        gradient.addColorStop(0, gradientColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
      } else {
        // Normal edge
        ctx.strokeStyle = `rgba(255, 255, 255, ${edge.strength * 0.3})`;
        ctx.lineWidth = 0.5;
      }
      
      ctx.stroke();
    });
    
    // Glow effect for selected node
    if (selectedNodeRef.current) {
      const selected = nodes.find(node => node.id === selectedNodeRef.current);
      if (selected) {
        ctx.beginPath();
        ctx.arc(selected.x, selected.y, 28 * selected.size, 0, 2 * Math.PI);
        const gradient = ctx.createRadialGradient(
          selected.x, selected.y, 0,
          selected.x, selected.y, 40 * selected.size
        );
        gradient.addColorStop(0, `${selected.color}40`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
    
    // Draw company nodes
    nodes.forEach(node => {
      const isSelected = node.id === selectedNodeRef.current;
      const isHovered = node.id === hoveredNode;
      
      const nodeSize = 24 * node.size * (isSelected || isHovered ? 1.2 : 1);
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
      
      // Fill with company color
      ctx.fillStyle = isSelected 
        ? node.color 
        : `${node.color}80`; // semi-transparent for non-selected
      
      ctx.strokeStyle = isHovered ? '#ffffff' : node.color;
      ctx.lineWidth = isHovered ? 2 : 1;
      
      ctx.fill();
      ctx.stroke();
      
      // Company name
      ctx.font = isSelected ? 'bold 12px Arial' : '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(node.name, node.x, node.y);
    });
  };
  
  const animateNetwork = () => {
    applyForces();
    drawNetwork();
    animationRef.current = requestAnimationFrame(animateNetwork);
  };
  
  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height}
        className="cursor-pointer"
      />
      
      {/* Overlay elements */}
      <div className="absolute top-3 left-3 text-xs text-text-secondary bg-surface/80 backdrop-blur-sm px-3 py-1 rounded-md border border-primary/30">
        Company Network
      </div>
      
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-sm px-4 py-2 rounded-md border border-primary/30 shadow-glow-sm z-10"
        >
          <div className="font-medium text-text">{hoveredNode}</div>
          <div className="text-xs text-text-secondary">Click to explore connections</div>
        </motion.div>
      )}
    </div>
  );
};

export default CompanyLogoNetwork;