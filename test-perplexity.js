async function testPerplexity() {
  console.log("Testing Perplexity API connection...");
  
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "Be precise and concise."
          },
          {
            role: "user",
            content: "What is Careerate?"
          }
        ],
        temperature: 0.2,
        max_tokens: 100,
        stream: false
      })
    });
    
    const data = await response.json();
    console.log("Perplexity API Response:", JSON.stringify(data, null, 2));
    console.log("✅ Perplexity API test successful!");
    return true;
  } catch (error) {
    console.error("❌ Perplexity API test failed:", error);
    return false;
  }
}

// Execute only if called directly
if (import.meta.url === import.meta.main) {
  testPerplexity().then(success => {
    if (!success) {
      process.exit(1);
    }
  });
}

export { testPerplexity };
