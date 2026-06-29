# Examples: Curriculum Intelligence Graph (CIG)

This file is the reference implementation of the graph model. It provides concrete, representative examples of nodes, edges, traversals, and output structures. Every future developer and AI agent should read this file to understand how the CIG is expected to behave in practice.

---

## Example 1 — Physics Prerequisite Chain

This chain illustrates how `REQUIRES` edges model a complete learning progression in Physics from SS1 through SS3.

### Nodes

```
Node: States of Matter
  id: "node_physics_ss1_t1_w1_states_of_matter"
  type: TOPIC
  subject: "Physics"
  classLevel: SS1
  term: FIRST
  week: 1
  difficulty: EASY
  estimatedMinutes: 40
  bloomLevels: ["Remember", "Understand"]
  examStandards: ["WAEC", "NECO"]
  keywords: ["solid", "liquid", "gas", "plasma", "kinetic theory"]
  misconceptions: ["Students often think ice is not water"]

Node: Atomic Structure
  id: "node_physics_ss1_t1_w2_atomic_structure"
  type: TOPIC
  subject: "Physics"
  classLevel: SS1
  term: FIRST
  week: 2
  difficulty: MEDIUM
  estimatedMinutes: 50
  bloomLevels: ["Remember", "Understand", "Apply"]
  examStandards: ["WAEC", "NECO", "JAMB"]
  keywords: ["proton", "neutron", "electron", "nucleus", "orbital", "atomic number"]
  misconceptions: [
    "Students confuse atomic number with mass number",
    "Students think electrons have a fixed position (not probabilistic)"
  ]

Node: Electric Charge
  type: TOPIC, subject: Physics, classLevel: SS1, term: SECOND, week: 1

Node: Electric Current
  type: TOPIC, subject: Physics, classLevel: SS2, term: FIRST, week: 1

Node: Ohm's Law
  type: TOPIC, subject: Physics, classLevel: SS2, term: FIRST, week: 3

Node: Kirchhoff's Laws
  type: TOPIC, subject: Physics, classLevel: SS3, term: FIRST, week: 2
```

### Prerequisite Edges

```
States of Matter  --[REQUIRES]--> (nothing — foundational)
Atomic Structure  --[REQUIRES]--> States of Matter
Electric Charge   --[REQUIRES]--> Atomic Structure
Electric Current  --[REQUIRES]--> Electric Charge
Ohm's Law         --[REQUIRES]--> Electric Current
Kirchhoff's Laws  --[REQUIRES]--> Ohm's Law
```

### Sequencing Edges

```
States of Matter  --[TEACHES_BEFORE]--> Atomic Structure
Atomic Structure  --[TEACHES_AFTER]-->  States of Matter
Atomic Structure  --[TEACHES_BEFORE]--> Electric Charge
...
```

### getPrerequisites("Kirchhoff's Laws", depth=5) result:

```javascript
[
  { node: Ohm's Law,        depth: 1 },
  { node: Electric Current, depth: 2 },
  { node: Electric Charge,  depth: 3 },
  { node: Atomic Structure, depth: 4 },
  { node: States of Matter, depth: 5 },
]
```

### findLearningPath("States of Matter", "Kirchhoff's Laws") result:

```javascript
[
  States of Matter,
  Atomic Structure,
  Electric Charge,
  Electric Current,
  Ohm's Law,
  Kirchhoff's Laws
]
```

---

## Example 2 — Mathematics Learning Progression (Algebra)

```
Basic Arithmetic (JSS1, T1, W1)
  ↓ [REQUIRES]
Directed Numbers / Integers (JSS1, T1, W3)
  ↓ [REQUIRES]
Simple Equations (JSS1, T2, W2)
  ↓ [REQUIRES]
Simultaneous Equations (JSS2, T1, W3)
  ↓ [REQUIRES]
Quadratic Equations (JSS3, T1, W1)
  ↓ [REQUIRES]
Polynomials (SS1, T1, W2)
  ↓ [REQUIRES]
Matrices (SS2, T2, W1)
```

**Note:** Quadratic Equations also has a CROSS_SUBJECT edge to Physics (projectile motion parabola) and to Economics (supply/demand curves).

---

## Example 3 — Cross-Subject Relationships: Vectors

Vectors is one of the richest examples of cross-subject graph relationships in the Nigerian secondary curriculum.

### Nodes across subjects

```
Vectors in Mathematics (SS1, T2, W3)
Vectors in Physics     (SS1, T2, W4)
Vectors in Engineering (SS2 Technical Drawing)
```

### Cross-subject edges

```
Vectors (Math)  --[CROSS_SUBJECT]--> Vectors (Physics)
Vectors (Math)  --[CROSS_SUBJECT]--> Vectors (Engineering)
Vectors (Physics) --[CROSS_SUBJECT]--> Vectors (Math)
Vectors (Physics) --[CROSS_SUBJECT]--> Vectors (Engineering)
```

### getCrossSubjectConnections("Vectors (Math)") result:

```javascript
[
  {
    node: Vectors (Physics),
    subject: "Physics"
  },
  {
    node: Vectors (Engineering),
    subject: "Engineering Drawing"
  }
]
```

### Implication for AI generation

When the Lesson Generator receives `getTopicContext("Vectors (Math)")`, the context includes:

```javascript
crossSubjectConnections: [
  { node: "Vectors (Physics)",      subject: "Physics" },
  { node: "Vectors (Engineering)",  subject: "Engineering Drawing" }
]
```

The AI prompt can then include: "Note that this topic connects to Vectors in Physics and Engineering Drawing. Include a real-world application that bridges these disciplines."

---

## Example 4 — Examination Mapping

### EXAM_STANDARD nodes

```
Node: WAEC Physics
  type: EXAM_STANDARD
  label: "WAEC Senior Secondary Certificate Examination — Physics"
  examStandards: ["WAEC"]
  metadata: { examBody: "WAEC", subject: "Physics", format: "OBJ+ESSAY" }

Node: JAMB Physics
  type: EXAM_STANDARD
  label: "Joint Admissions and Matriculation Board — Physics"
  examStandards: ["JAMB"]
  metadata: { examBody: "JAMB", subject: "Physics", format: "MCQ" }
```

### ASSESSED_BY edges

```
Ohm's Law      --[ASSESSED_BY]--> WAEC Physics
Ohm's Law      --[ASSESSED_BY]--> JAMB Physics
Ohm's Law      --[ASSESSED_BY]--> NECO Physics
Atomic Structure --[ASSESSED_BY]--> WAEC Physics
Atomic Structure --[ASSESSED_BY]--> JAMB Physics
```

### In node metadata

```javascript
// On the Ohm's Law node:
examStandards: ["WAEC", "NECO", "JAMB"]
```

The `examStandards` array on each node is a denormalised convenience field populated from ASSESSED_BY edges for fast display. The edges are the authoritative source.

---

## Example 5 — Sample TopicContext Output

`getTopicContext("node_physics_ss1_t1_w2_atomic_structure")` returns:

```javascript
{
  node: {
    id: "node_physics_ss1_t1_w2_atomic_structure",
    type: "TOPIC",
    label: "Atomic Structure",
    description: "The structure of the atom including protons, neutrons, electrons, the nucleus, and atomic orbitals. Foundation for understanding chemical bonding and nuclear physics.",
    subject: "Physics",
    classLevel: "SS1",
    term: "FIRST",
    week: 2,
    difficulty: "MEDIUM",
    estimatedMinutes: 50,
    bloomLevels: ["Remember", "Understand", "Apply"],
    examStandards: ["WAEC", "NECO", "JAMB"],
    keywords: ["proton", "neutron", "electron", "nucleus", "orbital", "atomic number", "mass number"],
    misconceptions: [
      "Students confuse atomic number with mass number",
      "Students think electrons orbit in fixed circular paths"
    ],
    formulae: {
      "Mass Number": "A = Z + N",
      "Atomic Number": "Z = number of protons"
    }
  },

  prerequisites: [
    {
      id: "node_physics_ss1_t1_w1_states_of_matter",
      label: "States of Matter",
      subject: "Physics",
      classLevel: "SS1",
      term: "FIRST",
      week: 1
    }
  ],

  learningObjectives: [
    {
      id: "obj_atomic_001",
      type: "LEARNING_OBJECTIVE",
      label: "State the composition of an atom (protons, neutrons, electrons)",
      bloomLevels: ["Remember"]
    },
    {
      id: "obj_atomic_002",
      type: "LEARNING_OBJECTIVE",
      label: "Describe the arrangement of subatomic particles in the atom",
      bloomLevels: ["Understand"]
    },
    {
      id: "obj_atomic_003",
      type: "LEARNING_OBJECTIVE",
      label: "Calculate atomic number, mass number, and number of neutrons for given elements",
      bloomLevels: ["Apply"]
    }
  ],

  relatedConcepts: [
    { id: "concept_proton",   label: "Proton",   type: "CONCEPT" },
    { id: "concept_neutron",  label: "Neutron",  type: "CONCEPT" },
    { id: "concept_electron", label: "Electron", type: "CONCEPT" },
    { id: "concept_nucleus",  label: "Nucleus",  type: "CONCEPT" }
  ],

  crossSubjectConnections: [
    {
      node: {
        id: "node_chemistry_ss1_t1_w3_atomic_structure",
        label: "Atomic Structure",
        subject: "Chemistry",
        classLevel: "SS1"
      },
      subject: "Chemistry"
    }
  ],

  examStandards: ["WAEC", "NECO", "JAMB"],
  bloomLevels: ["Remember", "Understand", "Apply"],

  misconceptions: [
    "Students confuse atomic number with mass number",
    "Students think electrons orbit in fixed circular paths"
  ],

  formulae: {
    "Mass Number": "A = Z + N",
    "Atomic Number": "Z = number of protons"
  }
}
```

---

## Example 6 — Typical Graph Traversal Scenarios

### Scenario A: Teacher opens Lesson Generator for "Ohm's Law"

```
1. Teacher selects "Ohm's Law" from the curriculum browser
2. Clicks "Generate Lesson"
3. Lesson Generator calls: getTopicContext("node_physics_ss2_t1_w3_ohms_law")
4. CIG returns TopicContext including:
   - prerequisites: [Electric Current, Electric Charge, Atomic Structure]
   - objectives: [State Ohm's Law, Apply V=IR, Plot V-I graph, Identify ohmic vs non-ohmic conductors]
   - crossSubjectConnections: [Mathematics — Linear Equations]
   - examStandards: [WAEC, NECO, JAMB]
   - formulae: { "Ohm's Law": "V = IR", "Resistance": "R = V/I" }
5. Lesson Generator injects this into the AI prompt
6. AI generates a lecture note grounded in the actual curriculum context
```

### Scenario B: Student has mastered Simultaneous Equations — what's next?

```
1. Analytics layer queries: getRelated("node_math_jss2_t1_w3_simultaneous_equations",
     relationships: ["TEACHES_BEFORE"])
2. CIG returns: [Quadratic Equations]
3. Analytics also checks: getPrerequisites("node_math_jss3_t1_w1_quadratic_equations")
4. CIG returns: [Simultaneous Equations, Simple Equations, Directed Numbers]
5. Analytics confirms student has mastered all prerequisites
6. Recommendation: "Next: Quadratic Equations — you're ready."
```

### Scenario C: Quiz Generator building a test for SS2 Physics Term 1

```
1. getTopicsForClass("Physics", "SS2", "FIRST") returns:
   [Electric Current, Ohm's Law, Resistors in Series, Resistors in Parallel,
    Kirchhoff's Current Law, Kirchhoff's Voltage Law, ...]
2. For each topic, Quiz Generator calls getTopicContext(nodeId)
3. Topics with examStandards ["WAEC", "JAMB"] are prioritised
4. Topics with bloomLevels ["Apply", "Analyse"] generate higher-order questions
5. Prerequisites flag conceptual dependencies in the quiz ordering
```

### Scenario D: Teacher adds a school-specific topic

```
School: "St. Mary's Secondary School, Lagos"
Teacher: Wants to add "Introduction to Robotics" as a CS topic for JSS3

1. addNode({
     schoolId: "school_st_marys_lagos",
     type: "TOPIC",
     label: "Introduction to Robotics",
     subject: "Computer Science",
     classLevel: "JSS3",
     term: "THIRD",
     week: 8,
     difficulty: "MEDIUM",
     bloomLevels: ["Understand", "Apply", "Create"],
     keywords: ["robot", "sensor", "actuator", "programming", "automation"]
   })
2. addEdge({
     sourceId: "node_cs_jss3_t3_w8_intro_robotics",  // new school node
     targetId: "node_cs_jss2_t1_w1_programming_basics",  // global node
     relationship: "REQUIRES"
   })
3. Graph now shows Introduction to Robotics as requiring Programming Basics
4. Only St. Mary's teachers see this topic in their curriculum browser
```
