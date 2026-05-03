const axios = require('axios');

const API = 'http://localhost:5000/api';

async function testQRUniqueness() {
  try {
    console.log('🧪 Testing QR Code Uniqueness...\n');

    // Step 1: Register lecturer
    console.log('1️⃣ Registering lecturer...');
    const lecturerRes = await axios.post(`${API}/auth/register`, {
      user_id: `lecturer_${Date.now()}`,
      email: `lecturer_${Date.now()}@test.com`,
      password: 'TestPass123!',
      full_name: 'Test Lecturer',
      role: 'LECTURER',
      department: 'CS'
    });
    const lecturerId = lecturerRes.data.data.id;
    console.log('✅ Lecturer registered:', lecturerId);

    // Step 2: Login
    console.log('\n2️⃣ Logging in...');
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: `lecturer_${Date.now()}@test.com`,
      password: 'TestPass123!'
    });
    const token = loginRes.data.data.token;
    console.log('✅ Logged in, token:', token.substring(0, 20) + '...');

    // Step 3: Create course
    console.log('\n3️⃣ Creating course...');
    const courseRes = await axios.post(`${API}/admin/course/create`, {
      course_code: `CS${Date.now()}`,
      course_name: 'Test Course',
      department: 'CS',
      semester: 'Spring',
      academic_year: '2024-2025'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const courseId = courseRes.data.data.id;
    console.log('✅ Course created:', courseId);

    // Step 4: Create session
    console.log('\n4️⃣ Creating session...');
    const sessionRes = await axios.post(`${API}/session/create`, {
      courseId,
      classDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      roomLocation: 'Room 101'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const sessionId = sessionRes.data.data.session_id || sessionRes.data.data.sessionId;
    console.log('✅ Session created:', sessionId);

    // Step 5: Start session and generate QR codes multiple times
    console.log('\n5️⃣ Generating QR codes (3 times)...\n');
    const tokens = [];

    for (let i = 1; i <= 3; i++) {
      const qrRes = await axios.post(`${API}/session/start`, {
        sessionId
      }, { headers: { Authorization: `Bearer ${token}` } });

      const qrToken = qrRes.data.data.qrToken;
      tokens.push(qrToken);

      console.log(`  Token ${i}: ${qrToken.substring(0, 40)}...`);
      console.log(`  QR Image: ${qrRes.data.data.qrImage.substring(0, 50)}...`);
      console.log(`  Expires At: ${qrRes.data.data.expiresAt}`);
      console.log('');
    }

    // Step 6: Check uniqueness
    console.log('6️⃣ Uniqueness Check:');
    const uniqueTokens = new Set(tokens);
    console.log(`  Total tokens: ${tokens.length}`);
    console.log(`  Unique tokens: ${uniqueTokens.size}`);
    console.log(`  ✅ All unique: ${tokens.length === uniqueTokens.size ? 'YES' : 'NO'}\n`);

    if (tokens.length === uniqueTokens.size) {
      console.log('🎉 SUCCESS: Every QR code generation produces a unique token!');
    } else {
      console.log('❌ FAILED: Duplicate tokens detected!');
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

testQRUniqueness();
