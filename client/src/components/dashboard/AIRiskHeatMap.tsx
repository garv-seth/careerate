import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface HeatMapProps {
  riskLevel?: 'Low' | 'Medium' | 'High';
  className?: string;
}

export function AIRiskHeatMap({ riskLevel = 'Medium', className }: HeatMapProps) {
  // Define color configuration for each cell
  const gridConfig = [
    // First row - low risk
    ['bg-green-400', 'bg-green-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-green-400'],
    // Second row - medium risk
    ['bg-green-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-red-400', 'bg-red-400'],
    // Third row - high risk
    ['bg-yellow-400', 'bg-yellow-400', 'bg-red-400', 'bg-red-400', 'bg-red-400'],
  ];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">AI Automation Risk Heat Map</h3>
        <Badge 
          variant="outline"
          className={cn(
            "py-1 px-3 text-sm font-medium rounded-full",
            riskLevel === 'Low' && "bg-green-100 text-green-800 border-green-200",
            riskLevel === 'Medium' && "bg-yellow-100 text-yellow-800 border-yellow-200",
            riskLevel === 'High' && "bg-red-100 text-red-800 border-red-200"
          )}
        >
          {riskLevel} Risk
        </Badge>
      </div>
      
      <div className="grid grid-cols-5 gap-1 rounded-lg overflow-hidden">
        {gridConfig.map((row, rowIndex) => (
          row.map((cellColor, cellIndex) => (
            <div 
              key={`${rowIndex}-${cellIndex}`}
              className={cn(
                cellColor,
                "w-full h-20 transition-colors duration-300"
              )}
            />
          ))
        ))}
      </div>
    </div>
  );
}

export default AIRiskHeatMap;