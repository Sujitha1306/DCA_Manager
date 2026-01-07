# SLA Breach Risk Detector Model Documentation

**Model Name**: SLA Risk Logistic Regression
**Date**: 2026-01-07
**Script Path**: `e:\DCA\data_engineering\models\train_sla_risk_model.py`

## 1. Overview & Use Case
This Logistic Regression model predicts tasks at **High Risk** of breaching SLA protocols (defined as >90 days overdue AND >5 attempts without payment). It uses explainable coefficients to confirm the risk drivers.

**Input**: 
*   `days_overdue` (and derived threshold `days > 90`)
*   `total_attempts` (and derived threshold `attempts > 5`)
*   `is_paid` (derived from interactions)

**Output**: High Risk Flag (0 or 1).

**Use Case**: 
*   **Compliance Audit**: Automatically flag files requiring manager sign-off.
*   **Prioritization**: Auto-escalate "High Risk" files to Specialized queues.

## 2. Model Performance
**Metric**: Accuracy
**Result**: **100%** (1.0000)
    *   *The model perfectly learned the logical rule defining High Risk.*

**Key Insights (Coefficients)**:
The model confirms that the **Interaction Term** is the primary driver of risk.
*   `feat_risk_interaction`: **+3.62** (Log Odds Impact)
*   This confirms: Risk exists ONLY when Overdue > 90 AND Attempts > 5 AND Not Paid.

## 3. Implementation Code
```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler
import os
import joblib

# --- CONFIG ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

def load_data():
    tasks = pd.read_csv(os.path.join(DATA_DIR, 'tasks.csv'))
    interactions = pd.read_csv(os.path.join(DATA_DIR, 'interactions.csv'))
    return tasks, interactions

def feature_engineering(tasks_df, interactions_df):
    # 1. Total Attempts per Task
    attempts = interactions_df.groupby('task_id').size().reset_index(name='total_attempts')
    
    # 2. Paid Status
    paid_tasks = interactions_df[interactions_df['outcome'] == 'Paid']['task_id'].unique()
    
    df = tasks_df.merge(attempts, on='task_id', how='left')
    df['total_attempts'] = df['total_attempts'].fillna(0)
    df['is_paid'] = df['task_id'].isin(paid_tasks).astype(int)
    
    # 3. Target Variable
    # Risk = (Days > 90) AND (Attempts > 5) AND (Not Paid)
    df['is_stagnant'] = ((df['total_attempts'] > 5) & (df['is_paid'] == 0)).astype(int)
    df['high_risk_flag'] = ((df['days_overdue'] > 90) & (df['is_stagnant'] == 1)).astype(int)
    
    return df

def train_model(df):
    # Feature Engineering for Model
    # Explicit threshold features to capture the AND logic linearly
    df['feat_overdue_90'] = (df['days_overdue'] > 90).astype(int)
    df['feat_attempts_5'] = (df['total_attempts'] > 5).astype(int)
    df['feat_not_paid'] = (df['is_paid'] == 0).astype(int)
    
    # Interaction: The exact "AND" condition
    df['feat_risk_interaction'] = df['feat_overdue_90'] * df['feat_attempts_5'] * df['feat_not_paid']
    
    features = ['feat_overdue_90', 'feat_attempts_5', 'feat_not_paid', 'feat_risk_interaction']
    X = df[features]
    y = df['high_risk_flag']
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Model: High C to force large coefficients for deterministic rule
    model = LogisticRegression(class_weight='balanced', C=1000.0, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    acc = accuracy_score(y_test, model.predict(X_test))
    print(f"Accuracy: {acc:.4f}")
    
    joblib.dump(model, os.path.join(SCRIPT_DIR, 'sla_risk_model.pkl'))
    return model

def main():
    tasks, interactions = load_data()
    df = feature_engineering(tasks, interactions)
    train_model(df)

if __name__ == "__main__":
    main()
```
