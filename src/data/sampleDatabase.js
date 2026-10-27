/** A small but varied in-browser database. Nothing here is sent to a server. */
export const DEFAULT_DATABASE = {
  STUDENT: {
    columns: ['StudentID', 'Name', 'Age', 'Department', 'CourseID'],
    rows: [
      { StudentID: 1, Name: 'Arun', Age: 20, Department: 'CSE', CourseID: 'CS101' },
      { StudentID: 2, Name: 'Beena', Age: 22, Department: 'CSE', CourseID: 'CS102' },
      { StudentID: 3, Name: 'Chitra', Age: 19, Department: 'ECE', CourseID: 'EC101' },
      { StudentID: 4, Name: 'Deepak', Age: 21, Department: 'ECE', CourseID: 'EC101' },
      { StudentID: 5, Name: 'Farah', Age: 23, Department: 'ME', CourseID: 'ME101' }
    ]
  },
  COURSE: {
    columns: ['CourseID', 'CourseName', 'Credits', 'Department'],
    rows: [
      { CourseID: 'CS101', CourseName: 'Database Systems', Credits: 4, Department: 'CSE' },
      { CourseID: 'CS102', CourseName: 'Algorithms', Credits: 4, Department: 'CSE' },
      { CourseID: 'EC101', CourseName: 'Digital Electronics', Credits: 3, Department: 'ECE' },
      { CourseID: 'ME101', CourseName: 'Thermodynamics', Credits: 3, Department: 'ME' }
    ]
  },
  FACULTY: {
    columns: ['FacultyID', 'Name', 'Department'],
    rows: [
      { FacultyID: 'F01', Name: 'Dr. Meera', Department: 'CSE' },
      { FacultyID: 'F02', Name: 'Dr. Ravi', Department: 'ECE' },
      { FacultyID: 'F03', Name: 'Dr. Leela', Department: 'ME' }
    ]
  },
  ENROLLMENT: {
    columns: ['StudentID', 'CourseID', 'Grade'],
    rows: [
      { StudentID: 1, CourseID: 'CS101', Grade: 'A' },
      { StudentID: 1, CourseID: 'CS102', Grade: 'B+' },
      { StudentID: 2, CourseID: 'CS101', Grade: 'A-' },
      { StudentID: 2, CourseID: 'CS102', Grade: 'A' },
      { StudentID: 3, CourseID: 'EC101', Grade: 'B' },
      { StudentID: 4, CourseID: 'EC101', Grade: 'A' },
      { StudentID: 5, CourseID: 'ME101', Grade: 'B+' }
    ]
  },
  STUDENT_COURSES: {
    columns: ['StudentID', 'CourseID'],
    rows: [
      { StudentID: 1, CourseID: 'CS101' },
      { StudentID: 1, CourseID: 'CS102' },
      { StudentID: 2, CourseID: 'CS101' },
      { StudentID: 2, CourseID: 'CS102' },
      { StudentID: 3, CourseID: 'EC101' },
      { StudentID: 4, CourseID: 'EC101' },
      { StudentID: 5, CourseID: 'ME101' }
    ]
  },
  CSE_STUDENTS: {
    columns: ['StudentID', 'Name', 'Age', 'Department', 'CourseID'],
    rows: [
      { StudentID: 1, Name: 'Arun', Age: 20, Department: 'CSE', CourseID: 'CS101' },
      { StudentID: 2, Name: 'Beena', Age: 22, Department: 'CSE', CourseID: 'CS102' }
    ]
  },
  ECE_STUDENTS: {
    columns: ['StudentID', 'Name', 'Age', 'Department', 'CourseID'],
    rows: [
      { StudentID: 3, Name: 'Chitra', Age: 19, Department: 'ECE', CourseID: 'EC101' },
      { StudentID: 4, Name: 'Deepak', Age: 21, Department: 'ECE', CourseID: 'EC101' }
    ]
  },
  REQUIRED_COURSES: {
    columns: ['CourseID'],
    rows: [{ CourseID: 'CS101' }, { CourseID: 'CS102' }]
  }
};

export const EXAMPLES = [
  { label: 'Selection', query: 'σ Age > 20 (STUDENT)', description: 'Find students older than 20.' },
  { label: 'Projection', query: 'π Name, Department (STUDENT)', description: 'Show only names and departments.' },
  { label: 'Nested query', query: "π Name (σ Department = 'CSE' (STUDENT))", description: 'Find names of CSE students.' },
  { label: 'Equi join', query: 'STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE', description: 'Match students to their courses.' },
  { label: 'Union', query: 'CSE_STUDENTS ∪ ECE_STUDENTS', description: 'Combine compatible student relations.' },
  { label: 'Difference', query: 'STUDENT − CSE_STUDENTS', description: 'Students who are not in CSE.' },
  { label: 'Product', query: 'FACULTY × COURSE', description: 'All faculty-course combinations.' },
  { label: 'Intersection', query: 'STUDENT ∩ CSE_STUDENTS', description: 'Tuples shared by both relations.' },
  { label: 'Natural join', query: 'STUDENT ⨝ COURSE', description: 'Join automatically on common attributes.' },
  { label: 'Division', query: 'STUDENT_COURSES ÷ REQUIRED_COURSES', description: 'Students enrolled in every required course.' },
  { label: 'Rename', query: 'ρ LEARNER (STUDENT)', description: 'Give a relation a new name.' }
];

export function cloneDatabase(database = DEFAULT_DATABASE) {
  return JSON.parse(JSON.stringify(database));
}
