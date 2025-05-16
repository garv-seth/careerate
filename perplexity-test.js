/**
 * Simple script to test Perplexity API Integration
 */
async function testPerplexity() {
  console.log("Testing Perplexity API connection...");
  
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error("❌ PERPLEXITY_API_KEY is not set");
      return false;
    }
    
    console.log("PERPLEXITY_API_KEY found, attempting API call...");
    
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
            content: "What is the current date and time?"
          }
        ],
        temperature: 0.2,
        max_tokens: 100,
        stream: false
      })
    });
    
    if (!response.ok) {
      console.error(`❌ Perplexity API request failed with status ${response.status}`);
      console.error(await response.text());
      return false;
    }
    
    const data = await response.json();
    console.log("Perplexity API Response:", JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices.length > 0) {
      console.log("Response content:", data.choices[0].message.content);
    }
    
    console.log("✅ Perplexity API test successful!");
    return true;
  } catch (error) {
    console.error("❌ Perplexity API test failed:", error);
    return false;
  }
}

// Execute test
testPerplexity().then(success => {
  console.log(`Test ${success ? 'passed' : 'failed'}`);
  process.exit(success ? 0 : 1);
});