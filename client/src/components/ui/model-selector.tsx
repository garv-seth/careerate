
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type ModelOption = {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'anthropic' | 'google' | 'perplexity';
};

interface ModelSelectorProps {
  modelType: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  modelType,
  availableModels,
  selectedModelId,
  onModelChange,
  disabled = false,
}) => {
  const handleChange = (value: string) => {
    onModelChange(value);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '✨';
      case 'anthropic':
        return '🧠';
      case 'google':
        return '🔍';
      case 'perplexity':
        return '🔮';
      default:
        return '🤖';
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`model-${modelType}`}>{modelType}</Label>
      <Select
        value={selectedModelId}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger id={`model-${modelType}`} className="w-full">
          <SelectValue placeholder={`Select ${modelType} model`} />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="flex items-center">
              <div className="flex items-center">
                <span className="mr-2">{getProviderIcon(model.provider)}</span>
                <span>{model.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {availableModels.find(m => m.id === selectedModelId)?.description || 
        'Select a model to see its description'}
      </p>
    </div>
  );
};
