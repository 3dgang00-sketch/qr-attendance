const db = require('better-sqlite3')('./data/attendance.db');

// Get the lecturer ID that's logged in
const lecturer = db.prepare('SELECT id FROM users WHERE role = ?').get('LECTURER');
const lecturerId = lecturer ? lecturer.id : 1;

console.log('Creating courses for lecturer ID:', lecturerId);

// Insert CS101 course
db.prepare('INSERT OR IGNORE INTO courses (id, course_code, course_name, department, lecturer_id, credits, semester, academic_year, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  .run(1, 'CS101', 'Introduction to Computer Science', 'Computer Science', lecturerId, 3, 'Spring', '2024', 1);

// Insert CS201 course  
db.prepare('INSERT OR IGNORE INTO courses (id, course_code, course_name, department, lecturer_id, credits, semester, academic_year, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  .run(2, 'CS201', 'Data Structures', 'Computer Science', lecturerId, 3, 'Spring', '2024', 1);

console.log('Courses created successfully!');

// Verify they were created
const courses = db.prepare('SELECT * FROM courses WHERE id IN (1, 2)').all();
console.log('Courses in database:', JSON.stringify(courses, null, 2));
