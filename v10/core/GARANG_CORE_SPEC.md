# GARANG V10 Core Specification

**Version:** V10.0  
**Status:** Architecture Contract / Source of Truth

---

## 1. Product Definition

GARANG is a Personal AI Coach / Personal Performance OS.

GARANG's core loop is:

**Observe → Remember → Understand → Decide → Act → Learn**

GARANG is not merely a chat application.

The AI must continuously use:

- user data
- long-term memory
- recent activity
- goals
- preferences
- domain knowledge
- current external information when required

to determine the user's next useful action.

---

## 2. Golden Rules

1. Never modify or delete the Golden Baseline.
2. Preserve existing V9.x functionality while reorganizing it.
3. LLM providers are replaceable adapters, not the GARANG core.
4. Conversation history is not the same as long-term memory.
5. Personal data must be isolated by authenticated user ID.
6. Important AI decisions should be traceable to the context and tools used.
7. Estimated or unverified data must never be presented as verified facts.
8. Web Search is a tool, not a replacement for memory or domain logic.
9. Specialist agents handle domain tasks; GARANG Core coordinates them.
10. UI changes must not break existing product flows.

---

## 3. High-Level Architecture

```text
GARANG APP
   │
   ├── UI Layer
   └── Local State
          │
          ▼
     GARANG CORE
          │
    ┌─────┼───────────┐
    ▼     ▼           ▼
  Data  Memory     Learning
 Engine  Engine      Engine
    │     │           │
    └─────┼───────────┘
          ▼
    Context Engine
          │
          ▼
    Agent Orchestrator
          │
     ┌────┼──────────────┐
     ▼    ▼              ▼
 Workout Nutrition     Running
 Agent    Agent          Agent
     └────┼──────────────┘
          ▼
      Tool Router
          │
   ┌──────┼─────────────┐
   ▼      ▼             ▼
Knowledge Web Search  Domain Tools
          │
          ▼
       AI Router
          │
   ┌──────┼─────────────┐
   ▼      ▼             ▼
  GPT   Claude        Gemini
{
  user: {
    id,
    profile,
    goals,
    preferences,
    subscription
  },

  body: {
    weight,
    bodyMeasurements,
    inbody,
    history
  },

  workout: {
    recentSessions,
    exercises,
    programs,
    volume,
    intensity,
    recoverySignals
  },

  nutrition: {
    recentMeals,
    dailyTotals,
    targets,
    foodRecords
  },

  running: {
    recentRuns,
    globalRunningContext,
    pace,
    distance,
    heartRate,
    programs
  },

  memory: {
    facts,
    goals,
    preferences,
    topics,
    feedback,
    summaries
  },

  learning: {
    behaviorPatterns,
    successfulRecommendations,
    rejectedRecommendations,
    preferenceSignals
  },

  conversation: {
    recentMessages,
    currentTopic
  },

  knowledge: {
    relevantKnowledge,
    sources
  }
}
{
  id,
  userId,
  type,
  content,
  source,
  confidence,
  importance,
  createdAt,
  updatedAt,
  lastUsedAt,
  status
}
Current Request
      ↓
Intent Detection
      ↓
Relevant User Data
      ↓
Relevant Memories
      ↓
Recent Events
      ↓
Domain State
      ↓
Knowledge / Search if required
      ↓
Context Package
Workout Tools
Nutrition Tools
Running Tools
Body Data Tools
Memory Tools
Learning Tools
Knowledge Tools
Web Search Tools
Report Tools
Subscription Tools
{
  success,
  data,
  source,
  confidence,
  timestamp,
  errors
}
User Request
      ↓
Need personal context?
      ↓
Memory / User Data
      ↓
Need domain knowledge?
      ↓
Knowledge
      ↓
Need current information?
      ↓
Web Search
      ↓
Agent Reasoning
      ↓
LLM
      ↓
Actionable Response
generate({
  messages,
  context,
  tools,
  model,
  temperature
})
{
  value: 520,
  unit: "kcal",
  source: "food_database",
  confidence: 0.92,
  status: "verified"
}
estimated
verified
exercise_id
name
muscle_primary
muscle_secondary
equipment
difficulty
movement_pattern
goal
ROM
technique
common_errors
substitutions
progression
regression
RPE_guideline
RIR_guideline
exercise
weight
reps
sets
RPE
RIR
volume
rest_time
date
food_id
brand
product
serving_size
calories
protein
carbs
fat
sodium
source
updated_at
Natural Language
      ↓
Food Recognition
      ↓
Food DB Search
      ↓
Portion Estimation
      ↓
Nutrition Calculation
      ↓
Daily Total
      ↓
Nutrition Agent
      ↓
Coaching
run_id
date
distance
duration
pace
heart_rate
route
elevation
source
weight
body_fat
skeletal_muscle_mass
body_water
BMI
visceral_fat
segmental_measurements
measurement_date
source
FREE
PRO
┌──────────────────────────────────┐
│ GARANG                     ⋯     │
├──────────────────────────────────┤
│                                  │
│ Conversation                     │
│                                  │
│ GARANG message                   │
│                                  │
│                 User message     │
│                                  │
│ GARANG message                   │
│                                  │
│                                  │
├──────────────────────────────────┤
│ +   Message GARANG...       ↑    │
└──────────────────────────────────┘
GARANG Core
Memory Engine
Learning Engine
Context Engine
Agent System
Tool Router
AI Router
users/{userId}/...
Web Search unavailable
        ↓
Use internal knowledge if sufficient
        ↓
Disclose freshness limitation when relevant
Primary provider unavailable
        ↓
Configured fallback provider
        ↓
Safe local response if possible
Food lookup unavailable
        ↓
Ask for clarification
        ↓
Never invent nutrition facts
GPS unavailable
        ↓
Manual run entry
Existing Feature
      ↓
Identify Data
      ↓
Identify Business Logic
      ↓
Identify UI
      ↓
Assign to Core / Engine / Agent / Tool
      ↓
Create Stable Interface
      ↓
Connect to V10
      ↓
Regression Test
1. Data Core
2. Memory Engine
3. Learning Engine
4. Context Engine
5. Tool Router
6. AI Router
7. GARANG Core Agent
8. Workout Agent
9. Nutrition Agent
10. Running Agent
11. Knowledge + Web Search
12. Report Agent
13. Body / InBody
14. FREE / PRO + Entitlement
15. i18n
16. AI Chat UI integration
17. Regression testing
### 지금 네가 할 것

GitHub에서 현재 선택된 **`garang-v10-core`** 브랜치에 들어가서:

**Add file → Create new file**

파일명:

```text
v10/core/GARANG_CORE_SPEC.md
