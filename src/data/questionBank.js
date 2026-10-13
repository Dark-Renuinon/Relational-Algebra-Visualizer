const practice = (id, difficulty, topic, prompt, options, answer, solution, distractors = []) => ({
  id, difficulty, topic, prompt, options, answer, solution, distractors, sourceType: 'practice'
});

export const QUIZ_QUESTIONS = [
  practice('easy-selection', 'easy', 'Selection', 'Which relational algebra operator keeps only the tuples satisfying a predicate?', ['Projection (π)', 'Selection (σ)', 'Rename (ρ)', 'Union (∪)'], 1,
    ['Selection filters rows using a Boolean condition.', 'Its standard notation is σcondition(R).', 'For example, σAge > 20(STUDENT) keeps students older than 20.'], ['Projection chooses columns; rename changes a relation or attribute name; union combines compatible relations.']),
  practice('easy-projection', 'easy', 'Projection', 'For STUDENT(StudentID, Name, Age), which expression returns only names?', ['σ Name (STUDENT)', 'π Name (STUDENT)', 'ρ Name (STUDENT)', 'STUDENT × Name'], 1,
    ['Projection selects attributes (columns).', 'Apply πName to STUDENT.', 'Under set semantics, duplicate projected tuples are removed.']),
  practice('easy-union', 'easy', 'Set operations', 'When is R ∪ S defined in classical relational algebra?', ['Whenever R and S have at least one attribute', 'When R and S are union-compatible', 'Only when R and S have the same name', 'Only when both relations are empty'], 1,
    ['Union requires union compatibility.', 'The relations must have the same number of attributes and corresponding domains.', 'The output contains tuples appearing in either relation, with duplicates removed.']),
  practice('easy-rename', 'easy', 'Rename', 'What is the main purpose of ρ in relational algebra?', ['Filter tuples', 'Rename a relation or its attributes', 'Combine matching tuples', 'Remove duplicate rows'], 1,
    ['ρ is the rename operator.', 'It can assign an alias to a relation and, where specified, rename attributes.', 'Renaming is especially useful when the same relation participates more than once.']),
  practice('easy-cartesian', 'easy', 'Cartesian product', 'If R has 3 tuples and S has 4 tuples, how many tuples are in R × S?', ['7', '12', '3', '4'], 1,
    ['Cartesian product pairs every tuple of R with every tuple of S.', 'The result cardinality is |R| × |S|.', 'Here 3 × 4 = 12 tuple pairs.']),
  practice('medium-join', 'medium', 'Equi-join', 'R(A,B) has (1,x), (2,y); S(B,C) has (x,p), (z,q). How many rows are in R ⋈R.B=S.B S?', ['0', '1', '2', '4'], 1,
    ['An equi-join is a product filtered by equality of the named attributes.', 'Only the R tuple with B=x matches the S tuple with B=x.', 'The result has one matching pair: (1,x,x,p), before any optional projection.']),
  practice('medium-difference', 'medium', 'Set difference', 'R(A) = {1,2,3} and S(A) = {2,4}. What is R − S?', ['{2}', '{1,3}', '{1,2,3,4}', '{4}'], 1,
    ['Difference keeps tuples in the left operand that are absent from the right operand.', 'Remove 2 from R; 4 is not in R and therefore cannot appear.', 'The result is {1,3}.']),
  practice('medium-sql', 'medium', 'RA to SQL', 'Which SQL query corresponds to πName(σDepartment=\'CSE\'(STUDENT))?', ['SELECT Department FROM STUDENT WHERE Name = \'CSE\';', 'SELECT DISTINCT Name FROM STUDENT WHERE Department = \'CSE\';', 'SELECT Name FROM STUDENT;', 'SELECT * FROM STUDENT WHERE Department = \'CSE\';'], 1,
    ['Selection becomes WHERE Department = \'CSE\'.', 'Projection keeps only Name.', 'Classical relational algebra has set semantics, so DISTINCT represents duplicate elimination.']),
  practice('medium-natural', 'medium', 'Natural join', 'R(StudentID, CourseID) ⨝ S(CourseID, Title) matches rows on which attribute?', ['StudentID only', 'CourseID', 'Every pair (Cartesian product)', 'No attributes'], 1,
    ['A natural join matches all same-named attributes.', 'Here CourseID is the only common attribute name.', 'The common join attribute appears once in the natural-join result.']),
  practice('medium-commute', 'medium', 'Equivalence', 'For set-based relations, which identity is always valid (with compatible schemas)?', ['R − S = S − R', 'R ∪ S = S ∪ R', 'R × S = S × R with identical attribute order', 'πA(R ∪ S) = πA(R) − πA(S)'], 1,
    ['Set union is commutative.', 'Swapping operands leaves the set of tuples unchanged.', 'Difference is not commutative, and product schemas can differ in attribute order.']),
  practice('hard-division', 'hard', 'Division', 'Takes(Student, Course) lists enrollments and Required(Course) lists required courses. Which expression returns students enrolled in every required course?', ['πStudent(Takes) − πStudent(Takes ÷ Required)', 'Takes ÷ Required', 'Required ÷ Takes', 'πCourse(Takes ∪ Required)'], 1,
    ['Division T ÷ U returns values of T’s non-divisor attributes paired with every value in U.', 'The dividend has attributes (Student, Course) and divisor has (Course).', 'Therefore Takes ÷ Required has schema (Student) and returns students meeting the universal condition.']),
  practice('hard-pushdown', 'hard', 'Optimization', 'Assume Department belongs to STUDENT. Which rewrite is valid under set semantics?', ['σDepartment=\'CSE\'(πName(STUDENT)) = πName(σDepartment=\'CSE\'(STUDENT))', 'πName(σDepartment=\'CSE\'(STUDENT)) = σDepartment=\'CSE\'(πName(STUDENT))', 'σName=\'CSE\'(πDepartment(STUDENT)) = πName(STUDENT)', 'πDepartment(σName=\'CSE\'(STUDENT)) = πName(STUDENT)'], 0,
    ['The selection needs Department, so it must happen while Department is still present.', 'Then projection keeps only Name.', 'Thus σDepartment=\'CSE\' is applied before πName.']),
  practice('hard-division-logic', 'hard', 'Universal queries', 'To find suppliers who supply every part in Parts, with Supplies(Supplier, Part), choose:', ['πSupplier(Supplies) ∪ Parts', 'Supplies ÷ Parts', 'Parts ÷ Supplies', 'πPart(Supplies) − Parts'], 1,
    ['This is a universal condition: for each tuple in Parts, a matching Supplies tuple must exist.', 'Division removes the divisor attributes and keeps Supplier values paired with every Part.', 'The output schema is Supplier.']),
  practice('hard-selection-pushdown', 'hard', 'Optimization', 'For a product R × S, with predicate p using only R attributes, which rewrite is valid?', ['σp(R × S) = (σp(R)) × S', 'σp(R × S) = R × (σp(S))', 'σp(R × S) = R ∪ S', 'σp(R × S) = σp(R) × σp(S)'], 0,
    ['Since p refers only to R, tuples of S cannot affect whether a tuple of R satisfies p.', 'Filter R first, then form pairs with all tuples of S.', 'This is a standard selection pushdown rule and can reduce intermediate results.']),
  practice('hard-outer-join', 'hard', 'Outer joins', 'What does R ⟕ S preserve that an inner join may discard?', ['Every tuple of S, padding missing R values', 'Every tuple of R, padding unmatched S attributes with NULL', 'Only pairs with equal values', 'All tuples from both relations without matching'], 1,
    ['A left outer join preserves every row from its left input R.', 'Matching S data is attached when available.', 'For an R row with no match, S-side attributes are filled with NULLs.']),
  practice('easy-difference', 'easy', 'Set difference', 'Which operator returns tuples in R that are not in S?', ['R ∩ S', 'R − S', 'R × S', 'R ∪ S'], 1,
    ['Difference is written R − S.', 'It keeps tuples from the left relation R that are absent from S.', 'The inputs must be union-compatible.']),
  practice('easy-intersection', 'easy', 'Intersection', 'R ∩ S contains which tuples?', ['Only tuples in R', 'Only tuples in S', 'Tuples common to both R and S', 'All tuple pairs from R and S'], 2,
    ['Intersection keeps only tuples that occur in both input relations.', 'It is a set operation and requires compatible schemas.', 'This differs from union, which keeps tuples appearing in either relation.']),
  practice('easy-degree', 'easy', 'Schemas', 'A relation schema has attributes (ID, Name, Age). What is its degree?', ['2', '3', 'The number of tuples', 'The number of distinct values of Age'], 1,
    ['Degree, also called arity, is the number of attributes in the schema.', 'ID, Name, and Age are three attributes.', 'The number of tuples is called cardinality.']),
  practice('easy-join', 'easy', 'Joins', 'A theta join is most directly defined as which operation?', ['A Cartesian product followed by a selection condition', 'A projection followed by rename', 'A union followed by difference', 'A division followed by selection'], 0,
    ['A theta join applies a comparison predicate to pairs from the Cartesian product.', 'In notation, R ⋈θ S is equivalent to σθ(R × S).', 'An equi-join is the special case where the predicate uses equality.']),
  practice('easy-primary-key', 'easy', 'Keys', 'Which statement describes a primary key?', ['It may contain duplicate values', 'It uniquely identifies tuples and cannot be NULL', 'It must be the last attribute in the schema', 'It is always a foreign key'], 1,
    ['A primary key uniquely identifies each tuple.', 'Its values must be unique and non-NULL.', 'It need not be the last attribute and need not reference another relation.']),
  practice('medium-product-select', 'medium', 'Expression evaluation', 'R(A) = {1,2}, S(B) = {x,y}. How many tuples are in σA=2(R × S)?', ['0', '1', '2', '4'], 2,
    ['The product pairs each A value with both B values.', 'The selection retains only pairs whose A value is 2.', 'Both (2,x) and (2,y) remain, so the result has two tuples.']),
  practice('medium-rename-self-join', 'medium', 'Rename and self-joins', 'To find pairs of distinct employees with the same manager from EMP(Eid, Manager), what is essential before joining EMP with itself?', ['Rename the two copies to different aliases', 'Union the relation with itself', 'Divide EMP by itself', 'Project Manager away first'], 0,
    ['A self-join uses two logical copies of the same relation.', 'Rename them, for example ρE1(EMP) and ρE2(EMP), so attributes can be distinguished.', 'Then select E1.Manager = E2.Manager and E1.Eid ≠ E2.Eid.']),
  practice('medium-union-projection', 'medium', 'Set semantics', 'R(A,B) and S(A,B) are union-compatible. What is πA(R ∪ S) under set semantics?', ['The distinct A values appearing in either relation', 'Only A values appearing in both relations', 'Every A value repeated once per tuple', 'A values appearing in R but not S'], 0,
    ['Union forms the set of tuples appearing in either relation.', 'Projection then keeps only attribute A.', 'Set semantics eliminate duplicate A values.']),
  practice('medium-sql-difference', 'medium', 'SQL semantics', 'Which SQL pattern most closely represents πCourse(ENROLLMENT) − πCourse(REQUIRED) in set semantics?', ['SELECT Course FROM ENROLLMENT EXCEPT SELECT Course FROM REQUIRED', 'SELECT Course FROM ENROLLMENT UNION SELECT Course FROM REQUIRED', 'SELECT * FROM ENROLLMENT CROSS JOIN REQUIRED', 'SELECT Course FROM REQUIRED'], 0,
    ['Project Course from each relation.', 'Set difference keeps projected enrollment courses absent from REQUIRED.', 'SQL EXCEPT represents this set difference, with duplicate elimination in standard set semantics.']),
  practice('medium-precedence', 'medium', 'Expression trees', 'In σA=1(R) ∪ σA=2(S), what is the root operation of the expression tree?', ['Selection', 'Union', 'Cartesian product', 'Projection'], 1,
    ['The two selections are operands inside the union.', 'The outermost operator is union, so it is the root of the syntax tree.', 'Each branch first filters its own relation.']),
  practice('hard-equivalence', 'hard', 'Equivalence', 'For union-compatible R and S, which selection pushdown identity is valid?', ['σp(R ∪ S) = σp(R) ∪ σp(S)', 'σp(R ∪ S) = σp(R) ∩ σp(S)', 'σp(R ∪ S) = σp(R) − σp(S)', 'σp(R ∪ S) = R × S'], 0,
    ['A tuple belongs to R ∪ S when it belongs to either input.', 'Applying predicate p to that union keeps tuples satisfying p from either side.', 'Therefore selection distributes over union: σp(R ∪ S) = σp(R) ∪ σp(S).']),
  practice('hard-two-required', 'hard', 'Division', 'Takes(Student, Course) has (A,DB), (A,OS), (B,DB); Required(Course) has DB and OS. Which students are in Takes ÷ Required?', ['A only', 'B only', 'A and B', 'No students'], 0,
    ['Division returns students paired with every required course.', 'A has both DB and OS, so A satisfies the universal condition.', 'B lacks OS, so B is excluded. The result is {A}.']),
  practice('hard-sql-exists', 'hard', 'SQL and universal queries', 'How is “student enrolled in every required course” commonly expressed in SQL without division?', ['NOT EXISTS a required course for which no matching enrollment exists', 'EXISTS any enrollment', 'COUNT all students', 'LEFT JOIN with no predicate'], 0,
    ['The universal condition ∀c∈Required, Enrolled(s,c) can be rewritten using negation.', 'Search for a counterexample: a required course with no matching enrollment for the student.', 'Reject students for whom such a course exists; those with no counterexample satisfy the condition.', 'This is the SQL pattern corresponding to relational division.']),
  practice('hard-join-optimize', 'hard', 'Query optimization', 'For R(A,B) and S(B,C), which expression is equivalent to σA>5 ∧ C<9(R × S)?', ['σA>5(R) × σC<9(S)', 'σA>5(R) × S', 'R × σA>5(S)', 'σA>5(R) ∪ σC<9(S)'], 0,
    ['The predicate separates into A>5, which uses only R, and C<9, which uses only S.', 'Selections on independent inputs can be pushed below the product.', 'The equivalent expression is σA>5(R) × σC<9(S), reducing the intermediate product size.']),
  practice('hard-division-expr', 'hard', 'Division', 'For R(A,B) and S(B), which expression is equivalent to R ÷ S using projection, product, and difference?', ['πA(R) − πA((πA(R) × S) − R)', '(πA(R) × S) ∪ R', 'πB(R) − S', 'R − S'], 0,
    ['Start with all candidate A values, πA(R).', 'Form every required (A,B) pair using πA(R) × S.', 'Subtract R to obtain the candidate pairs that are missing.', 'Project the A values with a missing pair and subtract them from all candidates. The remaining A values are related to every B in S, giving R ÷ S.'])
];

const gateSource = (url, label, date = 'Exact exam date not verified', session = 'Not stated in cited paper') => ({ exam: 'GATE CS', year: label, date, session, sourceUrl: url, verified: true });

export const EXAM_QUESTIONS = [
  {
    id: 'gate-2023-q16', difficulty: 'easy', topic: 'Relational model', sourceType: 'verified-exam',
    prompt: 'Which option gives the degree (arity) of a relation in a relational database?',
    options: ['Number of attributes in its relation schema', 'Number of tuples stored in the relation', 'Number of entries in the relation', 'Number of distinct domains of its relation schema'], answer: 0,
    solution: ['Degree (arity) counts the attributes in the relation schema.', 'Tuple count is the relation cardinality, not its degree.', 'The number of entries depends on both tuples and attributes; distinct domains need not equal the attribute count.', 'Therefore option A is correct.'],
    exam: { ...gateSource('https://gate.iitk.ac.in/GATE2023/doc/papers/2023/CS_GATE2023.pdf', '2023', '4 February 2023', 'Forenoon (FN), 09:30–12:30 IST'), answerKeyUrl: 'https://gate2026.iitg.ac.in/doc/download/Answer_keys2023/CS_ANS_GATE2023.pdf', verificationStatus: 'Official question paper and official answer key verified', scheduleUrl: 'https://gate.iitk.ac.in/GATE2023/schedule.html' }, questionNumber: 'Q.16', paper: 'Computer Science and Information Technology (CS)', citationLabel: 'Official GATE 2023 CS question paper', wording: 'Paraphrase'
  },
  {
    id: 'gate-2001-q1-23', difficulty: 'medium', topic: 'Lossless decomposition', sourceType: 'verified-exam',
    prompt: 'A schema R(A,B,C,D) has functional dependencies A → B and C → D. It is decomposed into R₁(A,B) and R₂(C,D). Which statement is correct?',
    options: ['Dependency preserving and lossless join', 'Lossless join but not dependency preserving', 'Dependency preserving but not lossless join', 'Neither dependency preserving nor lossless join'], answer: 2,
    solution: ['A → B is fully represented in R₁ and C → D is fully represented in R₂, so the decomposition preserves the given dependencies.', 'R₁ ∩ R₂ is empty.', 'For a binary lossless decomposition, the common attributes must functionally determine one component; an empty intersection does not do so here.', 'Thus it is dependency preserving but not guaranteed lossless: option C.'],
    exam: { ...gateSource('https://www.gateexam.info/docs/papers/CS/CS-2001.pdf', '2001'), answerKeyUrl: 'https://gateoverflow.in/716/gate2001-1-23-ugcnet-june2012-iii-18', verificationStatus: 'Archived paper scan and independent answer discussion checked' }, questionNumber: '1.23', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 2001 paper scan', wording: 'Paraphrase'
  },
  {
    id: 'gate-2001-q1-24', difficulty: 'hard', topic: 'Relational algebra expressiveness', sourceType: 'verified-exam',
    prompt: 'Let Adj(X,Y) represent directed graph edges. Which query cannot be expressed by a relational algebra expression of constant length?',
    options: ['List vertices adjacent to a given vertex', 'List vertices that have self-loops', 'List vertices that belong to cycles of fewer than three vertices', 'List all vertices reachable from a given vertex'], answer: 3,
    solution: ['A fixed-length relational algebra expression can use only a fixed number of joins, so it can describe paths only up to a bounded length.', 'Adjacency and self-loops require a single relation scan with a selection.', 'Cycles with length below three have a fixed finite bound and can be expressed using a fixed number of renamed copies and joins.', 'Reachability allows paths of arbitrary length. It needs recursion or a transitive-closure operator, so option D is not expressible by a constant-length classical RA expression.'],
    exam: { ...gateSource('https://www.gateexam.info/docs/papers/CS/CS-2001.pdf', '2001'), answerKeyUrl: 'https://gateoverflow.in/717/gate-cse-2001-question-1-24', verificationStatus: 'Archived paper scan and answer discussion checked' }, questionNumber: '1.24', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 2001 paper scan', wording: 'Paraphrase'
  },
  {
    id: 'gate-1999-q1-18', difficulty: 'easy', topic: 'Join cardinality', sourceType: 'verified-exam',
    prompt: 'If R has m tuples and S has n tuples, what are the maximum and minimum possible tuple counts for R ⋈ S, respectively?',
    options: ['m+n and 0', 'mn and 0', 'm+n and |m−n|', 'mn and m+n'], answer: 1,
    solution: ['A join cannot produce more tuple pairs than the Cartesian product, so its maximum is m×n.', 'If the schemas share a join attribute, the value sets can be disjoint, producing no matches and a minimum of 0.', 'Thus the maximum/minimum pair is mn and 0: option B.'],
    exam: { ...gateSource('https://gateoverflow.in/1471/gate-cse-1999-question-1-18-isro2016-53', '1999'), answerKeyUrl: 'https://gateoverflow.in/1471/gate-cse-1999-question-1-18-isro2016-53', verificationStatus: 'Archived question transcription and accepted solution checked' }, questionNumber: '1.18', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 1999 question record', wording: 'Paraphrase'
  },
  {
    id: 'gate-2000-q1-23', difficulty: 'easy', topic: 'Relational algebra expressiveness', sourceType: 'verified-exam',
    prompt: 'With employee(name, salary, deptNo) and department(deptNo, deptName, address), which query cannot be expressed with basic relational algebra operators?',
    options: ['Department address for each employee', 'Employees whose name equals their department name', 'Sum of all employee salaries', 'Employees belonging to a given department'], answer: 2,
    solution: ['The department and employee queries can use joins, selections, and projections.', 'Basic relational algebra has no aggregation operator.', 'Computing a sum requires aggregation, so option C is not expressible in the listed basic operators.'],
    exam: { ...gateSource('https://www.gateexam.info/docs/papers/CS/CS-2000.pdf', '2000'), answerKeyUrl: 'https://gateoverflow.in/647/gate-cse-2000-question-1-23-isro2016-57', verificationStatus: 'Archived paper scan and answer discussion checked' }, questionNumber: '1.23', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 2000 paper scan', wording: 'Paraphrase'
  },
  {
    id: 'gate-2012-q43', difficulty: 'easy', topic: 'Referential integrity', sourceType: 'verified-exam',
    prompt: 'R₁(A,B) has primary key A; R₂(C,D) has primary key C; B is a foreign key referencing C. Under referential integrity, which statement must hold?',
    options: ['πB(R₁) − πC(R₂) = ∅', 'πC(R₂) − πB(R₁) = ∅', 'πB(R₁) = πC(R₂)', 'πB(R₁) − πC(R₂) ≠ ∅'], answer: 0,
    solution: ['Every non-NULL foreign-key value in B must match a referenced key value in C.', 'Therefore no value in πB(R₁) can be absent from πC(R₂).', 'The reverse inclusion need not hold because some referenced rows may have no referencing row. Option A is always true.'],
    exam: { ...gateSource('https://gateoverflow.in/2151/gate-cse-2012-question-43', '2012'), answerKeyUrl: 'https://gateoverflow.in/2151/gate-cse-2012-question-43', verificationStatus: 'Archived question transcription and answer discussion checked' }, questionNumber: '43', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 2012 question record', wording: 'Paraphrase'
  },
  {
    id: 'gate-2014-set3-q21', difficulty: 'medium', topic: 'Relational algebra optimization', sourceType: 'verified-exam',
    prompt: 'For A₁ ⊆ A₂, simplify πA₁(πA₂(σF₁(σF₂(R)))) to the equivalent optimized expression.',
    options: ['πA₁(σF₁∧F₂(R))', 'πA₁(σF₁∨F₂(R))', 'πA₂(σF₁∧F₂(R))', 'πA₂(σF₁∨F₂(R))'], answer: 0,
    solution: ['Cascaded selections combine using conjunction: σF₁(σF₂(R)) = σF₁∧F₂(R).', 'Because A₁ is a subset of A₂, the nested projections collapse to πA₁.', 'The resulting expression is πA₁(σF₁∧F₂(R)), option A.'],
    exam: { ...gateSource('https://gateoverflow.in/2055/gate-cse-2014-set-3-question-21', '2014', 'Exact exam date not verified', 'Set 3; exact session time not stated in cited question record'), answerKeyUrl: 'https://gateoverflow.in/2055/gate-cse-2014-set-3-question-21', verificationStatus: 'Archived question transcription and answer discussion checked' }, questionNumber: '21', paper: 'Computer Science (CS), Set 3', citationLabel: 'Archived GATE CS 2014 Set 3 question record', wording: 'Paraphrase'
  },
  {
    id: 'gate-2014-set3-q30', difficulty: 'medium', topic: 'Query semantics and set difference', sourceType: 'verified-exam',
    prompt: 'The query πempId(employee) − πempId(employee ⋈(empId=eId ∧ empAge≤depAge) dependent) returns employees whose age is greater than the age of:',
    options: ['At least one dependent', 'Every dependent in the database', 'At least one of their dependents', 'All of their dependents'], answer: 3,
    solution: ['The join finds each employee who has at least one dependent whose age is at least the employee age.', 'Projecting empId marks those employees as violating “older than every dependent.”', 'Subtracting those IDs from all employee IDs leaves employees older than each of their dependents. Option D is correct.'],
    exam: { ...gateSource('https://gateoverflow.in/2064/gate-cse-2014-set-3-question-30', '2014', 'Exact exam date not verified', 'Set 3; exact session time not stated in cited question record'), answerKeyUrl: 'https://gateoverflow.in/2064/gate-cse-2014-set-3-question-30', verificationStatus: 'Archived question transcription and accepted answer checked' }, questionNumber: '30', paper: 'Computer Science (CS), Set 3', citationLabel: 'Archived GATE CS 2014 Set 3 question record', wording: 'Paraphrase'
  },
  {
    id: 'gate-2024-set2-q45', difficulty: 'medium', topic: 'Self-joins and Cartesian products', sourceType: 'verified-exam',
    prompt: 'Person(pid, city) stores each person’s city. Using only selection, projection, Cartesian product, and rename, what is the minimum number of Cartesian products needed to list cities where at least three people reside?',
    options: ['1', '2', '3', '4'], answer: 1,
    solution: ['Create three renamed copies of Person so each copy represents a candidate resident.', 'Combine the three copies using two binary Cartesian products.', 'Select triples with equal city values and pairwise-distinct pids, then project the city.', 'Three distinct people require three relation copies, hence two products: option B.'],
    exam: { ...gateSource('https://gate2026.iitg.ac.in/doc/download/2024/CS224S6.pdf', '2024', '10 February 2024', 'Afternoon (AN), Session 6, 14:30–17:30 IST'), answerKeyUrl: 'https://gate2026.iitg.ac.in/doc/download/2024/CS2FinalAnswerKey.pdf', scheduleUrl: 'https://gate2024.iisc.ac.in/examination-schedule/', verificationStatus: 'Official master question paper and final answer key verified' }, questionNumber: 'Q.45', paper: 'Computer Science and Information Technology (CS-2), Set 2', citationLabel: 'Official GATE 2024 CS-2 master question paper', wording: 'Paraphrase'
  },
  {
    id: 'gate-2007-q59', difficulty: 'hard', topic: 'Set difference and query semantics', sourceType: 'verified-exam',
    prompt: "Let femaleIds = πstudId(σsex='female'(studInfo)) and courseIds = πcourseId(enroll). What does πcourseId((femaleIds × courseIds) − enroll) return?",
    options: ['Courses taken by every female student', 'Courses taken by a proper subset of female students', 'Courses taken only by male students', 'No courses, because the schemas differ'], answer: 1,
    solution: ['femaleIds × courseIds forms every possible female-student/course pair.', 'Subtracting enroll leaves pairs where that female student is not enrolled in that course.', 'Projecting courseId returns courses missing at least one female enrollment; given the exam’s condition that every course has a female enrollee, these are courses taken by a proper subset of female students. Option B is correct.'],
    exam: { ...gateSource('https://gateoverflow.in/2428/gate-cse-2007-question-59', '2007'), answerKeyUrl: 'https://gateoverflow.in/2428/gate-cse-2007-question-59', verificationStatus: 'Archived question transcription and detailed solution checked' }, questionNumber: '59', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 2007 question record', wording: 'Paraphrase'
  },
  {
    id: 'gate-it-2007-q68', difficulty: 'hard', topic: 'Query optimization', sourceType: 'verified-exam',
    prompt: "In a bank schema where branch is much smaller than account and depositor, which rewrite best optimizes πcName(σbCity='Agra' ∧ bal<0(branch ⋈ account ⋈ depositor))?",
    options: ['Filter Agra branches, join account, apply bal<0, then join depositor', 'Join account with depositor first, then filter Agra branches', 'Filter account by bCity and join it to depositor', 'Apply the Agra filter to account and depositor before joining branch'], answer: 0,
    solution: ['The city predicate belongs to branch and can be applied before any join.', 'The balance predicate belongs to account and should be applied as soon as branch and account have been joined.', 'This joins the relatively small filtered branch relation with account before the large depositor relation, reducing intermediate results.', 'Options C and D apply bCity to relations that do not have that attribute; B needlessly joins the two large relations first. Option A is the valid efficient rewrite.'],
    exam: { ...gateSource('https://gateoverflow.in/3513/gate-it-2007-question-68', '2007'), exam: 'GATE IT', answerKeyUrl: 'https://gateoverflow.in/3513/gate-it-2007-question-68', verificationStatus: 'Archived question transcription and accepted optimization solution checked' }, questionNumber: '68', paper: 'Information Technology (IT)', citationLabel: 'Archived GATE IT 2007 question record', wording: 'Paraphrase', distractors: ['A selection must reference attributes present at that stage; bCity belongs to branch.']
  },
  {
    id: 'gate-2015-set1-q7', difficulty: 'easy', topic: 'SQL and projection semantics', sourceType: 'verified-exam',
    prompt: 'In SQL, SELECT column_list is most like which relational algebra operation, accounting for SQL’s default duplicate behavior?',
    options: ['Selection σ, because both filter rows', 'Selection σ, except SQL retains duplicate rows', 'Projection π, except SQL retains duplicates unless DISTINCT is used', 'Projection π, because both always remove duplicates'], answer: 2,
    solution: ['SQL SELECT chooses output columns; filtering rows is done separately with WHERE.', 'In relational algebra, choosing columns is projection π.', 'Classical relational algebra uses set semantics and removes duplicate projected tuples, while SQL keeps duplicates by default unless DISTINCT is specified.', 'Therefore option C is the closest equivalence.'],
    exam: { ...gateSource('https://gateoverflow.in/8094/gate-cse-2015-set-1-question-7', '2015'), answerKeyUrl: 'https://gateoverflow.in/8094/gate-cse-2015-set-1-question-7', verificationStatus: 'Archived question transcription and accepted answer checked' }, questionNumber: '7', paper: 'Computer Science (CS), Set 1', citationLabel: 'Archived GATE CS 2015 Set 1 question record', wording: 'Paraphrase'
  },
  {
    id: 'gate-2007-q60', difficulty: 'hard', topic: 'Tuple relational calculus', sourceType: 'verified-exam',
    prompt: 'For employee(name, sex, supervisorName), consider {e.name | employee(e) ∧ ∀x [¬employee(x) ∨ x.supervisorName ≠ e.name ∨ x.sex = “male”]}. What does it return?',
    options: ['Employees with a male supervisor', 'Employees with no immediate male subordinates', 'Employees with no immediate female subordinates', 'Employees with a female supervisor'], answer: 2,
    solution: ['The universal condition is checked for every tuple x in employee.', 'If x is an immediate subordinate of e (x.supervisorName = e.name), the remaining disjunction requires x.sex = male.', 'So e is retained only when every immediate subordinate is male; equivalently, e has no immediate female subordinates. Option C is correct.'],
    exam: { ...gateSource('https://gateoverflow.in/1258/gate-cse-2007-question-60', '2007'), answerKeyUrl: 'https://gateoverflow.in/1258/gate-cse-2007-question-60', verificationStatus: 'Archived question transcription and accepted calculus solution checked' }, questionNumber: '60', paper: 'Computer Science (CS)', citationLabel: 'Archived GATE CS 2007 question record', wording: 'Paraphrase'
  }
];

export function getQuestions(section, difficulty) {
  const source = section === 'quiz' ? QUIZ_QUESTIONS : EXAM_QUESTIONS;
  return source.filter((question) => question.difficulty === difficulty);
}

export function validateQuestionBank() {
  const combined = [...QUIZ_QUESTIONS, ...EXAM_QUESTIONS];
  const ids = new Set();
  const errors = [];
  for (const question of combined) {
    if (!question.id || ids.has(question.id)) errors.push(`Missing or duplicate question id: ${question.id || '(empty)'}`);
    ids.add(question.id);
    if (!['easy', 'medium', 'hard'].includes(question.difficulty)) errors.push(`${question.id}: invalid difficulty`);
    if (!question.topic || !question.prompt || !Array.isArray(question.options) || question.options.length !== 4 || new Set(question.options).size !== 4) errors.push(`${question.id}: question must have a topic, prompt, and four distinct options`);
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) errors.push(`${question.id}: invalid correct option`);
    if (!Array.isArray(question.solution) || question.solution.length < 2) errors.push(`${question.id}: solution must have at least two steps`);
    if (question.sourceType === 'verified-exam' && (!question.exam?.sourceUrl || !question.exam?.answerKeyUrl || !question.exam?.exam || !question.exam?.year || !question.exam?.date || !question.exam?.session || !question.exam?.verificationStatus || !question.questionNumber || !question.citationLabel || !['Verbatim', 'Paraphrase'].includes(question.wording) || question.exam.verified !== true)) errors.push(`${question.id}: incomplete exam provenance`);
  }
  return errors;
}
