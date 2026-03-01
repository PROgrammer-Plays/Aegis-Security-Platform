// test-login-api.js - Test Login Directly (Bypass Frontend)
require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.BACKEND_API_URL;

async function testLogin() {
    console.log('🧪 Testing Login API Directly');
    console.log('═══════════════════════════════════════════');
    console.log('');
    
    try {
        console.log('1️⃣  Testing backend health...');
        const healthResponse = await axios.get(`${API_URL}/api/health`);
        console.log('   ✅ Backend is running');
        console.log('   Status:', healthResponse.data.status);
        console.log('');
        
        console.log('2️⃣  Attempting login...');
        console.log('   URL:', `${API_URL}/api/auth/login`);
        console.log('   Payload:', { username: 'admin', password: 'admin' });
        console.log('');
        
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin'
        });
        
        console.log('   ✅ LOGIN SUCCESSFUL!');
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('✅ API LOGIN WORKS!');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('Response:');
        console.log('   Token:', loginResponse.data.token?.substring(0, 20) + '...');
        console.log('   User:', loginResponse.data.user.username);
        console.log('   Role:', loginResponse.data.user.role);
        console.log('');
        console.log('🎉 Backend login API works perfectly!');
        console.log('');
        console.log('Since API works but frontend doesn\'t:');
        console.log('1. Check browser console (F12) for errors');
        console.log('2. Check Network tab - is request reaching backend?');
        console.log('3. Check if frontend is sending to correct URL');
        console.log('4. Check CORS - should allow localhost:3000');
        console.log('');
        
    } catch (error) {
        console.log('   ❌ LOGIN FAILED');
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('❌ API LOGIN ERROR');
        console.log('═══════════════════════════════════════════');
        console.log('');
        
        if (error.response) {
            console.log('Backend responded with error:');
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data.error || error.response.data);
            console.log('');
            
            if (error.response.status === 401) {
                console.log('🔐 Authentication failed');
                console.log('   This means backend rejected the credentials');
                console.log('');
                console.log('   But debug script said password works! 🤔');
                console.log('');
                console.log('   Possible causes:');
                console.log('   1. User model pre-save hook is interfering');
                console.log('   2. bcrypt.compare() not being called correctly');
                console.log('   3. Password field not matching');
                console.log('');
                console.log('   Fix: Replace User.js with the fixed version');
                console.log('');
            } else if (error.response.status === 500) {
                console.log('⚠️  Server error');
                console.log('   Check backend logs for details');
            }
            
        } else if (error.request) {
            console.log('❌ No response from backend');
            console.log('   Backend might not be running on port 5000');
            console.log('');
            console.log('   Start backend with: node server.js');
            
        } else {
            console.log('❌ Request setup error');
            console.log('   Error:', error.message);
        }
    }
}

console.log('Make sure backend is running: node server.js');
console.log('');

testLogin();
