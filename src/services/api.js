import { supabase } from './supabase';

const RELATIONS = {
  STUDENT: { table: 'students', columns: ['StudentID', 'Name', 'Age', 'Department', 'CourseID'], key: ['StudentID'] },
  COURSE: { table: 'courses', columns: ['CourseID', 'CourseName', 'Credits', 'Department'], key: ['CourseID'] },
  FACULTY: { table: 'faculty', columns: ['FacultyID', 'Name', 'Department'], key: ['FacultyID'] },
  ENROLLMENT: { table: 'enrollments', columns: ['StudentID', 'CourseID', 'Grade'], key: ['StudentID', 'CourseID'] },
  STUDENT_COURSES: { table: 'student_courses', columns: ['StudentID', 'CourseID'], key: ['StudentID', 'CourseID'] },
  CSE_STUDENTS: { table: 'cse_students', columns: ['StudentID', 'Name', 'Age', 'Department', 'CourseID'], key: ['StudentID'] },
  ECE_STUDENTS: { table: 'ece_students', columns: ['StudentID', 'Name', 'Age', 'Department', 'CourseID'], key: ['StudentID'] },
  REQUIRED_COURSES: { table: 'required_courses', columns: ['CourseID'], key: ['CourseID'] }
};

function fail(error) { if (error) throw new Error(error.message); }
function spec(name) { const value = RELATIONS[name]; if (!value) throw new Error(`Unknown relation: ${name}`); return value; }

export async function getDatabase() {
  const pairs = await Promise.all(Object.entries(RELATIONS).map(async ([name, relation]) => {
    const { data, error } = await supabase.from(relation.table).select('*');
    fail(error);
    return [name, { columns: relation.columns, key: relation.key, rows: data }];
  }));
  return Object.fromEntries(pairs);
}

export async function getHistory() {
  const { data, error } = await supabase.from('query_history').select('*').order('timestamp', { ascending: false }).limit(25);
  fail(error);
  return data || [];
}

export async function createRow(name, row) { const { error } = await supabase.from(spec(name).table).insert(row); fail(error); }
export async function updateRow(name, originalKey, row) {
  let query = supabase.from(spec(name).table).update(row);
  Object.entries(originalKey).forEach(([column, value]) => { query = query.eq(column, value); });
  const { error } = await query; fail(error);
}
export async function deleteRow(name, key) {
  let query = supabase.from(spec(name).table).delete();
  Object.entries(key).forEach(([column, value]) => { query = query.eq(column, value); });
  const { error } = await query; fail(error);
}
export async function saveHistoryEntry(entry) { const { error } = await supabase.from('query_history').insert(entry); fail(error); }
export async function deleteHistoryEntry(id) { const { error } = await supabase.from('query_history').delete().eq('id', id); fail(error); }
export async function clearHistory() { const { error } = await supabase.from('query_history').delete().not('id', 'is', null); fail(error); }
