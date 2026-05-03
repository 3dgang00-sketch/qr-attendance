const db = require('better-sqlite3')('./data/attendance.db');
const { v4: uuidv4 } = require('uuid');

// Get the lecturer ID 
const lecturer = db.prepare('SELECT id FROM users WHERE role = ?').get('LECTURER');
const lecturerId = lecturer ? lecturer.id : 1;

// Get the geofence zone (Neotia University or any available)
const geofence = db.prepare('SELECT id FROM geofence_zones LIMIT 1').get();
const geofenceZoneId = geofence ? geofence.id : null;

console.log('Creating class sessions for lecturer ID:', lecturerId);
console.log('Using geofence zone ID:', geofenceZoneId);

// Create session for CS101
const session1Id = uuidv4();
db.prepare(`
  INSERT OR IGNORE INTO class_sessions 
  (session_id, course_id, lecturer_id, class_date, start_time, end_time, room_location, geofence_zone_id, session_status, created_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  session1Id, 
  1,  // course_id for CS101
  lecturerId,
  '2024-01-20',
  '09:00:00',
  '10:30:00',
  'Room 101',
  geofenceZoneId,
  'SCHEDULED',
  new Date().toISOString()
);

// Create session for CS201
const session2Id = uuidv4();
db.prepare(`
  INSERT OR IGNORE INTO class_sessions 
  (session_id, course_id, lecturer_id, class_date, start_time, end_time, room_location, geofence_zone_id, session_status, created_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  session2Id,
  2,  // course_id for CS201
  lecturerId,
  '2024-01-21',
  '10:00:00',
  '11:30:00',
  'Room 201',
  geofenceZoneId,
  'SCHEDULED',
  new Date().toISOString()
);

console.log('Created session 1 (CS101):', session1Id);
console.log('Created session 2 (CS201):', session2Id);

// Store these IDs for frontend use
console.log('\nUpdate the frontend with these session IDs:');
console.log('Session 1 ID:', session1Id);
console.log('Session 2 ID:', session2Id);

// Verify
const sessions = db.prepare('SELECT id, session_id, course_id FROM class_sessions WHERE course_id IN (1, 2)').all();
console.log('\nSessions in database:', JSON.stringify(sessions, null, 2));
