
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Footer2 from '@/components/ui/footer2';

const SettingsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // No direct redirect needed here, the ProtectedRoute component will handle it

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Preferences</CardTitle>
              <CardDescription>Configure the AI models used by different agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cara-model">Cara (Orchestration) Model</Label>
                  <Select defaultValue="gpt-4">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                      <SelectItem value="claude">Claude 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="maya-model">Maya (Resume Analysis) Model</Label>
                  <Select defaultValue="gpt-4">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                      <SelectItem value="claude">Claude 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis Settings</CardTitle>
              <CardDescription>Configure how agents analyze your career data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deep Analysis Mode</Label>
                  <p className="text-sm text-muted-foreground">Perform more thorough but slower analysis</p>
                </div>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Real-time Market Data</Label>
                  <p className="text-sm text-muted-foreground">Include latest market trends in analysis</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Configure the appearance of the application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you want to receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive desktop notifications</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

export default SettingsPage;
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import Footer2 from '@/components/ui/footer2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ModelSelector, ModelOption } from '@/components/ui/model-selector';

const modelOptions: Record<string, ModelOption[]> = {
  orchestration: [
    {
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet',
      description: 'Latest Claude model with exceptional reasoning and comprehension',
      provider: 'anthropic'
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'High-capability model balancing intelligence and speed',
      provider: 'anthropic'
    },
    {
      id: 'gpt-4-1106',
      name: 'GPT-4 Turbo',
      description: 'OpenAI\'s most capable model for complex tasks',
      provider: 'openai'
    }
  ],
  resume: [
    {
      id: 'gpt-4-1106-preview',
      name: 'GPT-4 Turbo',
      description: 'Best for detailed resume analysis and skill extraction',
      provider: 'openai'
    },
    {
      id: 'claude-3-7-haiku',
      name: 'Claude 3.7 Haiku',
      description: 'Fast and efficient resume parsing with good accuracy',
      provider: 'anthropic'
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Google\'s efficient model for resume parsing',
      provider: 'google'
    }
  ],
  research: [
    {
      id: 'pplx-70b-online',
      name: 'Perplexity Sonar',
      description: 'Specialized for real-time market research with web access',
      provider: 'perplexity'
    },
    {
      id: 'claude-3-7-opus',
      name: 'Claude 3.7 Opus',
      description: 'Anthropic\'s most capable model for in-depth analysis',
      provider: 'anthropic'
    },
    {
      id: 'gpt-4-1106-vision',
      name: 'GPT-4 Vision',
      description: 'Can analyze images and text for comprehensive research',
      provider: 'openai'
    }
  ],
  learning: [
    {
      id: 'gpt-4-1106-mini',
      name: 'GPT-4 Mini',
      description: 'Efficient and cost-effective model for content generation',
      provider: 'openai'
    },
    {
      id: 'claude-3-7-haiku',
      name: 'Claude 3.7 Haiku',
      description: 'Fast response times for interactive learning sessions',
      provider: 'anthropic'
    },
    {
      id: 'gemini-2-0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Google\'s latest lightweight model optimized for learning tasks',
      provider: 'google'
    }
  ]
};

const SettingsPage = () => {
  const { toast } = useToast();
  
  // Example default settings - would be fetched from API
  const [settings, setSettings] = useState({
    models: {
      orchestration: 'claude-3-7-sonnet',
      resume: 'gpt-4-1106-preview',
      research: 'pplx-70b-online',
      learning: 'claude-3-7-haiku'
    },
    analysis: {
      deepAnalysis: false,
      realTimeMarketData: true
    },
    theme: {
      darkMode: true,
      highContrast: false
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Mock settings save mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      // This would be a real API call in production
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to save settings',
        description: 'An error occurred while saving your preferences.',
        variant: 'destructive',
      });
    }
  });

  const handleModelChange = (modelType: string, modelId: string) => {
    setSettings(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [modelType]: modelId
      }
    }));
  };

  const handleSwitchChange = (category: string, setting: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: checked
      }
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await saveSettingsMutation.mutateAsync(settings);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Settings</h1>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>AI Model Preferences</CardTitle>
              <CardDescription>Configure the AI models used by the different agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <ModelSelector
                  modelType="Cara (Orchestration)"
                  availableModels={modelOptions.orchestration}
                  selectedModelId={settings.models.orchestration}
                  onModelChange={(id) => handleModelChange('orchestration', id)}
                />
                
                <ModelSelector
                  modelType="Maya (Resume Analysis)"
                  availableModels={modelOptions.resume}
                  selectedModelId={settings.models.resume}
                  onModelChange={(id) => handleModelChange('resume', id)}
                />
                
                <ModelSelector
                  modelType="Ellie (Industry Research)"
                  availableModels={modelOptions.research}
                  selectedModelId={settings.models.research}
                  onModelChange={(id) => handleModelChange('research', id)}
                />
                
                <ModelSelector
                  modelType="Sophia (Learning)"
                  availableModels={modelOptions.learning}
                  selectedModelId={settings.models.learning}
                  onModelChange={(id) => handleModelChange('learning', id)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Analysis Settings</CardTitle>
              <CardDescription>Configure how agents analyze your career data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deep-analysis">Deep Analysis Mode</Label>
                  <p className="text-sm text-muted-foreground">Perform more thorough but slower analysis</p>
                </div>
                <Switch
                  id="deep-analysis"
                  checked={settings.analysis.deepAnalysis}
                  onCheckedChange={(checked) => handleSwitchChange('analysis', 'deepAnalysis', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="market-data">Real-time Market Data</Label>
                  <p className="text-sm text-muted-foreground">Include latest market trends in analysis</p>
                </div>
                <Switch
                  id="market-data"
                  checked={settings.analysis.realTimeMarketData}
                  onCheckedChange={(checked) => handleSwitchChange('analysis', 'realTimeMarketData', checked)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the appearance of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme throughout the application</p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={settings.theme.darkMode}
                  onCheckedChange={(checked) => handleSwitchChange('theme', 'darkMode', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast">High Contrast</Label>
                  <p className="text-sm text-muted-foreground">Increase contrast for better readability</p>
                </div>
                <Switch
                  id="high-contrast"
                  checked={settings.theme.highContrast}
                  onCheckedChange={(checked) => handleSwitchChange('theme', 'highContrast', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

export default SettingsPage;
