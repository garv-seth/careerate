// Auth API testing script
const fetch = require('node-fetch');

async function testAuth() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing Careerate Authentication API');
    console.log('---------------------------------------');
    
    // 1. Attempt to register a new user
    console.log('\n🔹 Testing registration...');
    const registerData = {
      username: 'testuser',
      password: 'password123',
      name: 'Test User',
      email: 'test@example.com'
    };
    
    const registerResponse = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData),
      credentials: 'include'
    });
    
    const registerResult = await registerResponse.json();
    console.log(`Registration status: ${registerResponse.status}`, registerResult);
    
    // 2. Attempt to log in
    console.log('\n🔹 Testing login...');
    const loginData = {
      username: 'testuser',
      password: 'password123'
    };
    
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData),
      credentials: 'include'
    });
    
    const loginResult = await loginResponse.json();
    console.log(`Login status: ${loginResponse.status}`, loginResult);
    
    // Get the session cookie for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    const cookieHeader = cookies || '';
    
    // 3. Get user info after login
    console.log('\n🔹 Testing user info retrieval...');
    const userResponse = await fetch(`${baseUrl}/api/user`, {
      headers: {
        Cookie: cookieHeader
      },
      credentials: 'include'
    });
    
    const userResult = await userResponse.json();
    console.log(`User info status: ${userResponse.status}`, userResult);
    
    // 4. Test logout
    console.log('\n🔹 Testing logout...');
    const logoutResponse = await fetch(`${baseUrl}/api/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader
      },
      credentials: 'include'
    });
    
    console.log(`Logout status: ${logoutResponse.status}`);
    
    // 5. Verify user is logged out
    console.log('\n🔹 Verifying logout...');
    const afterLogoutResponse = await fetch(`${baseUrl}/api/user`, {
      headers: {
        Cookie: cookieHeader
      },
      credentials: 'include'
    });
    
    const afterLogoutResult = await afterLogoutResponse.json();
    console.log(`After logout status: ${afterLogoutResponse.status}`, afterLogoutResult);
    
    console.log('\n✅ Authentication tests completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();