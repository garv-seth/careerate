async function testPerplexity() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  console.log('API Key available:', !!apiKey);
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Be precise and concise.'
          },
          {
            role: 'user',
            content: 'What are the top skills in demand for software engineers in 2025?'
          }
        ],
        max_tokens: 100,
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Response received successfully!');
    console.log('Model used:', data.model);
    console.log('Content snippet:', data.choices[0].message.content.substring(0, 100) + '...');
    
    if (data.citations) {
      console.log('Citations found:', data.citations.length);
    }
  } catch (error) {
    console.error('Error testing Perplexity API:', error);
  }
}

testPerplexity();
