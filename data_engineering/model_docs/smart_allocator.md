# Smart Allocator Model Documentation

**Model Name**: Intelligent Task Allocator (XGBoost)
**Date**: 2026-01-07
**Script Path**: `e:\DCA\data_engineering\models\ai_allocator.py`

## 1. Overview & Use Case
The **Smart Allocator** optimizes recovery rates by assigning unassigned tasks to the agent with the highest predicted probability of success (`Paid`/`PTP`).

**Mechanics**:
1.  **Prediction**: Calculates $P(Success | Agent, Task)$ for every possible pair.
2.  **Constraint**: Enforces `MAX_TASKS_PER_AGENT = 50` to prevent burnout.
3.  **Strategy**: **Greedy Algorithm**. It sorts all potential assignments by probability and locks in the best ones first.

**Input Features**:
*   **Agent**: `skill_level`, `tenure_months`
*   **Task**: `risk_score`, `amount_due`, `days_overdue`, `customer_segment`

**Output**: 
*   Assignment List (Task -> Agent)
*   Predicted Success Probability for each assignment.

## 2. Model Performance
**Metric**: Accuracy
**Result**: **85.1%** (Target Met >85%)
*   *The model successfully learned the strong relationship between Agent Skill and Task Risk.*

**Top Drivers**:
1.  `skill_level`: The most critical factor (Senior agents handle difficult tasks better).
2.  `risk_score`: High-risk tasks are inherently harder.
3.  `tenure_months`: Experienced agents add stability.

## 3. Usage
To run the allocator on new tasks:
```python
from data_engineering.models.ai_allocator import SmartAllocator

allocator = SmartAllocator()
# Load trained model
allocator.model = joblib.load('allocator_model.pkl')

# Run allocation
assignments = allocator.allocate_bulk(unassigned_tasks_df, available_agents_df)
print(assignments.head())
```

## 4. Sample Output
| task_id | assigned_agent_id | predicted_success_prob |
| :--- | :--- | :--- |
| T0045 | A0012 | 0.98 |
| T0103 | A0007 | 0.96 |
| T0992 | A0007 | 0.95 |
```
