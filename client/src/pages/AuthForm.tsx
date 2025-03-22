} catch (error) {
        console.error('Authentication error:', error);
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           "An unexpected error occurred during authentication";
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      }