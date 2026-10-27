import { ALL_EXAM_QUESTIONS } from './questionBank';

function makeReserveQuestion(id, difficulty, topic, prompt, options, answer, explanation, metadata = {}) {
  return {
    id,
    difficulty,
    topic,
    prompt,
    question: prompt,
    options,
    answer,
    correctAnswer: options[answer],
    explanation,
    solution: [explanation],
    source: 'reserve',
    sourceType: 'exam-style-practice',
    ...metadata,
  };
}

const existingQuestions = ALL_EXAM_QUESTIONS.map((item) => makeReserveQuestion(
  `reserve-${item.id}`,
  item.difficulty,
  item.topic,
  item.prompt,
  [...item.options],
  item.answer,
  item.solution.join(' '),
  {
    sourceType: item.sourceType,
    exam: item.exam,
    paper: item.paper,
    questionNumber: item.questionNumber,
    citationLabel: item.citationLabel,
    wording: item.wording,
  },
));

const additionalQuestions = [
  makeReserveQuestion('reserve-extra-e01', 'easy', 'Selection', 'Let R(A,B) contain {(1,4),(2,5),(3,4)}. What is σB=4(R)?', ['{(1,4),(3,4)}', '{(4,1),(4,3)}', '{(2,5)}', 'R'], 0, 'Selection keeps complete tuples whose B value is 4, namely the first and third tuples.'),
  makeReserveQuestion('reserve-extra-e02', 'easy', 'Projection', 'Under set semantics, what is πA({(1,x),(1,y),(2,x)})?', ['{1,1,2}', '{1,2}', '{x,y}', '{(1,x),(2,x)}'], 1, 'Projection keeps only A values and set semantics remove the repeated value 1, producing {1,2}.'),
  makeReserveQuestion('reserve-extra-e03', 'easy', 'Rename', 'Which relational algebra operator changes a relation or attribute name without changing its tuples?', ['Selection σ', 'Rename ρ', 'Projection π', 'Difference −'], 1, 'Rename ρ changes a relation or attribute name; it does not filter or project tuples.'),
  makeReserveQuestion('reserve-extra-e04', 'easy', 'Union', 'For R ∪ S to be defined, which condition must hold?', ['R and S have equal degree and compatible corresponding domains', 'R and S have the same relation name', 'R and S have the same tuple count', 'R and S have a common key'], 0, 'Union-compatible relations have the same number of attributes and compatible domains in corresponding positions.'),
  makeReserveQuestion('reserve-extra-e05', 'easy', 'Set difference', 'If R={1,2,3} and S={2,4}, what is R−S?', ['{2}', '{1,3}', '{1,3,4}', '{4}'], 1, 'Set difference keeps members of the left relation that are absent from the right relation, so only 1 and 3 remain.'),
  makeReserveQuestion('reserve-extra-e06', 'easy', 'Cartesian product', 'If relation R has 4 tuples and S has 6 tuples, how many tuples are in R×S?', ['10', '24', '6', '4'], 1, 'Every tuple in R pairs with every tuple in S, giving 4×6=24 tuple pairs.'),
  makeReserveQuestion('reserve-extra-e07', 'easy', 'Theta join', 'A theta join R ⋈θ S is equivalent to which expression?', ['σθ(R×S)', 'πθ(R∪S)', 'R−S', 'ρ(R×S)'], 0, 'A theta join forms the Cartesian product and then selects pairs that satisfy θ.'),
  makeReserveQuestion('reserve-extra-e08', 'easy', 'Natural join', 'R(Student,Course) ⋈ S(Course,Title) matches tuples using which attribute?', ['Student', 'Course', 'Title', 'All attributes by position'], 1, 'Natural join equates all same-named attributes; Course is the only name shared by these schemas.'),
  makeReserveQuestion('reserve-extra-e09', 'easy', 'Selection', 'Which property does selection preserve?', ['The input relation’s attributes', 'Only the matching predicate attribute', 'No tuples', 'The relation name must change'], 0, 'Selection filters rows but retains the input schema and all of its attributes.'),
  makeReserveQuestion('reserve-extra-e10', 'easy', 'Projection', 'Which property does projection primarily change?', ['The set of attributes in the result', 'The truth value of predicates', 'The input relation name only', 'The order of tuples'], 0, 'Projection chooses the attributes included in the result schema.'),
  makeReserveQuestion('reserve-extra-e11', 'easy', 'Set semantics', 'In classical relational algebra, can a relation contain two identical tuples?', ['No; relations use set semantics', 'Yes; duplicates are always retained', 'Only after a join', 'Only when a key is absent'], 0, 'Classical relations are sets of tuples, so identical tuples are not stored as separate copies.'),
  makeReserveQuestion('reserve-extra-e12', 'easy', 'Empty relations', 'What is the result of selecting from an empty relation?', ['An empty relation with the same schema', 'A one-row relation containing NULLs', 'A relation with the predicate as its schema', 'An error in all cases'], 0, 'Selection cannot create tuples; on an empty input it returns an empty relation with the input schema.'),
  makeReserveQuestion('reserve-extra-e13', 'easy', 'Selection cascade', 'Which identity combines two selections on relation R?', ['σp(σq(R)) = σp∧q(R)', 'σp(σq(R)) = πp∨q(R)', 'σp(σq(R)) = R×R', 'σp(σq(R)) = ρp(R)'], 0, 'A tuple survives both selections exactly when it satisfies both predicates, equivalent to their conjunction.'),
  makeReserveQuestion('reserve-extra-e14', 'easy', 'SQL correspondence', 'In the usual SQL-to-relational-algebra correspondence, WHERE most closely matches which operator?', ['Selection σ', 'Projection π', 'Rename ρ', 'Cartesian product ×'], 0, 'WHERE filters rows by a predicate, which is the role of selection.'),
  makeReserveQuestion('reserve-extra-e15', 'easy', 'Cartesian product', 'If R has schema (A,B) and S has schema (C), what is the schema of R×S?', ['(A,B,C)', '(A,C)', '(B,C)', '(A,B)'], 0, 'The Cartesian product combines the attributes of both inputs, preserving the attributes A, B, and C.'),

  makeReserveQuestion('reserve-extra-m01', 'medium', 'Selection pushdown', 'If predicate p refers only to attributes of R, which expression is equivalent to σp(R×S)?', ['σp(R)×S', 'R×σp(S)', 'σp(R)×σp(S)', 'R∪S'], 0, 'Since p depends only on R, filtering R before pairing it with S preserves exactly the qualifying tuple pairs.'),
  makeReserveQuestion('reserve-extra-m02', 'medium', 'Projection pushdown', 'To push πX below σp(R), what must be retained in the lower projection?', ['Attributes in X and every attribute used by p', 'Only the attributes used by p', 'Only the primary key', 'No attributes from X'], 0, 'The lower projection must preserve requested output attributes and predicate attributes so the selection can still be evaluated.'),
  makeReserveQuestion('reserve-extra-m03', 'medium', 'Selection and union', 'For union-compatible R and S, which identity holds?', ['σp(R∪S)=σp(R)∪σp(S)', 'σp(R∪S)=σp(R)∩σp(S)', 'σp(R∪S)=R×S', 'σp(R∪S)=R−S'], 0, 'A tuple in the union is retained exactly when it occurs in an input and satisfies p; filtering both inputs then unioning gives the same set.'),
  makeReserveQuestion('reserve-extra-m04', 'medium', 'Product selections', 'Which selection can be split across a product when p references R and q references S only?', ['σp∧q(R×S)=σp(R)×σq(S)', 'σp∨q(R×S)=σp(R)×σq(S)', 'σp∧q(R×S)=R∪S', 'σp∧q(R×S)=R−S'], 0, 'Conjunctive predicates on disjoint inputs can be applied independently before forming the product.'),
  makeReserveQuestion('reserve-extra-m05', 'medium', 'Join semantics', 'If R(A,B) and S(B,C) are joined with an explicit equality R.B=S.B, which attributes are present in the ordinary theta-join result before projection?', ['A, R.B, S.B, C', 'A, B, C with B always removed', 'Only A and C', 'Only the matching B value'], 0, 'A theta join is a selection over a product, so it retains both input schemas unless a separate projection removes a duplicate join column.'),
  makeReserveQuestion('reserve-extra-m06', 'medium', 'Division', 'Given Enrolled(Student,Course) and Required(Course), what does Enrolled÷Required return?', ['Students enrolled in every required course', 'Courses taken by any student', 'Students enrolled in no courses', 'Required courses missing from Enrolled'], 0, 'Relational division expresses “for every”: it returns students paired with every course in Required.'),
  makeReserveQuestion('reserve-extra-m07', 'medium', 'Set difference', 'Which identity is valid when R and S are union-compatible?', ['R−S = R−(R∩S)', 'R−S = S−R', 'R−S = R∪S', 'R−S = R∩S'], 0, 'R∩S contains exactly the R tuples that must be removed, so subtracting it from R yields R−S.'),
  makeReserveQuestion('reserve-extra-m08', 'medium', 'Join cardinality', 'If R and S each contain unique join-key values and have matching key sets of size 7, how many rows does an equijoin on that key produce?', ['7', '14', '49', '0'], 0, 'With unique keys and identical seven-value key sets, each key contributes exactly one matching pair.'),
  makeReserveQuestion('reserve-extra-m09', 'medium', 'Rename and self-join', 'Why rename two copies of Employee before comparing employees with the same manager?', ['To distinguish attributes from the two logical copies', 'To remove all duplicate employees', 'To force the manager values to differ', 'To sort employees by name'], 0, 'Renaming the two copies gives their attributes distinct qualifiers, making the self-join predicate unambiguous.'),
  makeReserveQuestion('reserve-extra-m10', 'medium', 'Projection and union', 'For union-compatible R and S, which equivalence holds for an attribute list X?', ['πX(R∪S)=πX(R)∪πX(S)', 'πX(R∪S)=πX(R)∩πX(S)', 'πX(R∪S)=R×S', 'πX(R∪S)=R−S'], 0, 'Projecting the union yields every X-tuple appearing in either input, exactly the union of their projections.'),
  makeReserveQuestion('reserve-extra-m11', 'medium', 'Natural join', 'If R(A,B) and S(B,C) share B, which schema does their natural join produce?', ['(A,B,C), with one copy of B', '(A,B,B,C)', '(A,C)', '(B)'], 0, 'Natural join matches on the common attribute B and keeps one copy of that common attribute in the result.'),
  makeReserveQuestion('reserve-extra-m12', 'medium', 'Predicate placement', 'For σA>5(R ⋈ S), where A belongs only to R, what is a valid optimization?', ['σA>5(R) ⋈ S', 'R ⋈ σA>5(S)', 'σA>5(R) × S regardless of join condition', 'R∪S'], 0, 'The predicate references only R, so selection can be pushed to R before the join without changing the result.'),
  makeReserveQuestion('reserve-extra-m13', 'medium', 'Projection', 'Under set semantics, what is πA({(a,1),(a,2),(b,3)})?', ['{a,b}', '{a,a,b}', '{1,2,3}', '{(a,1),(b,3)}'], 0, 'Projection removes the second attribute, then set semantics collapse the two occurrences of a.'),
  makeReserveQuestion('reserve-extra-m14', 'medium', 'Selection distributivity', 'For predicates p and q over the same relation, what is σp(σq(R))?', ['σp∧q(R)', 'σp∨q(R)', 'πp(R)', 'R×R'], 0, 'Nested selections retain rows satisfying both predicates, equivalent to one selection with p∧q.'),
  makeReserveQuestion('reserve-extra-m15', 'medium', 'Join order', 'Why can equivalent join reorderings have different execution costs?', ['They can produce intermediate relations of different sizes', 'They change the logical answer by definition', 'One ordering always eliminates all tuples', 'Relational algebra forbids reordering'], 0, 'Associative and commutative join reorderings preserve the result but can change intermediate cardinalities and cost.'),

  makeReserveQuestion('reserve-extra-h01', 'hard', 'Division expansion', 'Using only projection, product, and difference, which expression is equivalent to R(A,B)÷S(B)?', ['πA(R)−πA((πA(R)×S)−R)', 'πB(R)−S', 'R−(πA(R)×S)', 'πA(R)×S'], 0, 'Build all candidate A,B pairs, subtract R to find missing required pairs, project A values with a miss, then subtract those A values from πA(R).'),
  makeReserveQuestion('reserve-extra-h02', 'hard', 'Query optimization', 'For R(A,B), S(B,C), and predicate A>10 ∧ C<5, which rewrite reduces the product before joining?', ['σA>10(R) ⋈ σC<5(S)', 'σA>10(R×S) ∪ σC<5(R×S)', 'πA(R)×πC(S)', 'R−S'], 0, 'Each conjunct references one input, so filter both inputs first and then perform the same join.'),
  makeReserveQuestion('reserve-extra-h03', 'hard', 'Difference and selection', 'For a predicate p on R, what is σp(R−S)?', ['σp(R)−S', 'R−σp(S)', 'σp(R)∪S', 'R∩σp(S)'], 0, 'A tuple is in R−S and satisfies p exactly when it is in σp(R) but not in S.'),
  makeReserveQuestion('reserve-extra-h04', 'hard', 'Join associativity', 'When is (R⋈S)⋈T equivalent to R⋈(S⋈T) for natural joins?', ['When schemas and common-attribute comparisons follow the same natural-join semantics', 'Only when all three relations have identical schemas', 'Never; natural join is not associative', 'Only when each relation has one tuple'], 0, 'Natural join is associative under its standard matching-on-all-common-attributes semantics; both groupings enforce the same equalities and retain common attributes once.'),
  makeReserveQuestion('reserve-extra-h05', 'hard', 'Selection and difference', 'For relations R and S with the same schema, which identity holds?', ['σp(R−S)=σp(R)−σp(S)', 'σp(R−S)=σp(R)∪σp(S)', 'σp(R−S)=R×S', 'σp(R−S)=S−R'], 0, 'A tuple survives the difference and selection when it is in R, not in S, and satisfies p; this is the difference of the selected inputs.'),
  makeReserveQuestion('reserve-extra-h06', 'hard', 'Division edge case', 'If the divisor S(B) is empty, what does R(A,B)÷S return under the standard candidate-based definition?', ['πA(R)', 'An empty relation in all cases', 'πB(R)', 'R itself'], 0, 'Every candidate A value is related to every B in the empty divisor vacuously, so the result contains the candidate values πA(R).'),
  makeReserveQuestion('reserve-extra-h07', 'hard', 'Projection pushdown', 'For πX(σp(R)), where predicate p uses attributes Y, which lower projection is sufficient before selection?', ['πX∪Y(R)', 'πX−Y(R)', 'πY(R) only in every case', 'π∅(R)'], 0, 'Retain both output attributes X and predicate attributes Y below selection; the final projection can then discard Y if needed.'),
  makeReserveQuestion('reserve-extra-h08', 'hard', 'Relational algebra equivalence', 'Which expression is equivalent to σp∧q(R) when p and q use only attributes in R?', ['σp(R)∩σq(R)', 'σp(R)∪σq(R)', 'πp(R)−σq(R)', 'R×R'], 0, 'A tuple satisfies both predicates exactly when it appears in both selected sets, so their intersection is equivalent.'),
  makeReserveQuestion('reserve-extra-h09', 'hard', 'Natural join ambiguity', 'R has attributes (StudentId, Dept) and S has (CourseId, Dept), but Dept is not a join key. Why can R⋈S be wrong?', ['Natural join implicitly equates the same-named Dept attributes', 'Natural join ignores Dept because it is not a key', 'Natural join sorts by Dept', 'Natural join removes all attributes named Dept'], 0, 'Natural join matches every identically named attribute, regardless of key intent; an explicit theta join should be used if Dept must not be matched.'),
  makeReserveQuestion('reserve-extra-h10', 'hard', 'Division and counterexamples', 'To express “students enrolled in every required course” without division, what should be removed from all candidate students?', ['Students with at least one required course for which no enrollment exists', 'Students enrolled in any course', 'Courses that have no students', 'Students with duplicate enrollments only'], 0, 'Universal membership can be expressed by finding counterexample student-course pairs, projecting the students with a missing pair, and subtracting them from the candidates.'),
];

export const RESERVE_QUESTION_BANK = [...existingQuestions, ...additionalQuestions];
