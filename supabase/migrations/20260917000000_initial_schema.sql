-- Fixed teaching relations. Schema changes are intentionally migration-only.
create table public.students ("StudentID" integer primary key, "Name" text not null, "Age" integer not null, "Department" text not null, "CourseID" text not null);
create table public.courses ("CourseID" text primary key, "CourseName" text not null, "Credits" integer not null, "Department" text not null);
create table public.faculty ("FacultyID" text primary key, "Name" text not null, "Department" text not null);
create table public.enrollments ("StudentID" integer not null, "CourseID" text not null, "Grade" text not null, primary key ("StudentID", "CourseID"));
create table public.student_courses ("StudentID" integer not null, "CourseID" text not null, primary key ("StudentID", "CourseID"));
create table public.cse_students ("StudentID" integer primary key, "Name" text not null, "Age" integer not null, "Department" text not null, "CourseID" text not null);
create table public.ece_students ("StudentID" integer primary key, "Name" text not null, "Age" integer not null, "Department" text not null, "CourseID" text not null);
create table public.required_courses ("CourseID" text primary key);
create table public.query_history (id text primary key, query text not null, mode text not null check (mode in ('ra', 'sql')), algebra text, timestamp timestamptz not null, result jsonb, "executionTime" numeric, status text not null check (status in ('success', 'error')), error text);

insert into public.students values (1, 'Arun', 20, 'CSE', 'CS101'), (2, 'Beena', 22, 'CSE', 'CS102'), (3, 'Chitra', 19, 'ECE', 'EC101'), (4, 'Deepak', 21, 'ECE', 'EC101'), (5, 'Farah', 23, 'ME', 'ME101');
insert into public.courses values ('CS101', 'Database Systems', 4, 'CSE'), ('CS102', 'Algorithms', 4, 'CSE'), ('EC101', 'Digital Electronics', 3, 'ECE'), ('ME101', 'Thermodynamics', 3, 'ME');
insert into public.faculty values ('F01', 'Dr. Meera', 'CSE'), ('F02', 'Dr. Ravi', 'ECE'), ('F03', 'Dr. Leela', 'ME');
insert into public.enrollments values (1, 'CS101', 'A'), (1, 'CS102', 'B+'), (2, 'CS101', 'A-'), (2, 'CS102', 'A'), (3, 'EC101', 'B'), (4, 'EC101', 'A'), (5, 'ME101', 'B+');
insert into public.student_courses select "StudentID", "CourseID" from public.enrollments;
insert into public.cse_students select * from public.students where "Department" = 'CSE';
insert into public.ece_students select * from public.students where "Department" = 'ECE';
insert into public.required_courses values ('CS101'), ('CS102');

alter table public.students enable row level security;
alter table public.courses enable row level security;
alter table public.faculty enable row level security;
alter table public.enrollments enable row level security;
alter table public.student_courses enable row level security;
alter table public.cse_students enable row level security;
alter table public.ece_students enable row level security;
alter table public.required_courses enable row level security;
alter table public.query_history enable row level security;

-- Demo mode: the publishable client can operate the fixed teaching data.
create policy "public demo access" on public.students for all to anon using (true) with check (true);
create policy "public demo access" on public.courses for all to anon using (true) with check (true);
create policy "public demo access" on public.faculty for all to anon using (true) with check (true);
create policy "public demo access" on public.enrollments for all to anon using (true) with check (true);
create policy "public demo access" on public.student_courses for all to anon using (true) with check (true);
create policy "public demo access" on public.cse_students for all to anon using (true) with check (true);
create policy "public demo access" on public.ece_students for all to anon using (true) with check (true);
create policy "public demo access" on public.required_courses for all to anon using (true) with check (true);
create policy "public demo access" on public.query_history for all to anon using (true) with check (true);
