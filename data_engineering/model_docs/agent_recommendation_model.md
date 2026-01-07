# Agent Recommendation Model Documentation

**Model Name**: XGBoost Agent Classifier
**Date**: 2026-01-07
**Script Path**: `e:\DCA\data_engineering\models\train_agent_model.py`

## 1. Overview & Use Case
This model is designed to optimize debt collection by recommending the most effective agent for a specific debt task.

**Input**: Debt details (Amount, Overdue Days, Risk Score) and Agent details (Skill, Tenure).
**Output**: Probability of success ("Paid" or "PTP").
**Use Case**: When a new task enters the system, the model scores all available agents. The agent with the highest probability is assigned the task to maximize recovery rates.

## 2. Model Performance
**Metrics:**
*   **Accuracy**: ~0.70
*   **ROC-AUC**: ~0.75

**Classification Report:**
```
              precision    recall  f1-score   support

           0       0.79      0.82      0.80      9032
           1       0.40      0.36      0.38      2968

    accuracy                           0.70     12000
   macro avg       0.60      0.59      0.59     12000
weighted avg       0.69      0.70      0.70     12000
```
*Note: The lower recall for class 1 (Success) is expected given the noisy synthetic data where success is harder to predict than failure.*

**Feature Importance:**
See: `data_engineering/models/feature_importance.png` 

## 3. Implementation Code
```python
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.preprocessing import OneHotEncoder
import matplotlib.pyplot as plt
import os
import random

# --- CONFIG ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

def load_data():
    print("Loading data...")
    agents = pd.read_csv(os.path.join(DATA_DIR, 'agents.csv'))
    tasks = pd.read_csv(os.path.join(DATA_DIR, 'tasks.csv'))
    interactions = pd.read_csv(os.path.join(DATA_DIR, 'interactions.csv'))
    return agents, tasks, interactions

def preprocess_data(agents, tasks, interactions):
    print("Preprocessing & Feature Engineering...")
    
    # 1. Merge
    df = interactions.merge(tasks, on='task_id').merge(agents, on='agent_id')
    
    # 2. Target Variable
    # Success = 'Paid' or 'PTP'
    success_outcomes = ['Paid', 'PTP']
    df['is_success'] = df['outcome'].isin(success_outcomes).astype(int)
    
    # 3. Context Features
    # Simulate hour_of_day because source timestamp is just Date
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour_of_day'] = df['timestamp'].dt.hour
        if df['hour_of_day'].sum() == 0:
            print("Warning: Timestamps missing time component. Simulating 'hour_of_day'...")
            df['hour_of_day'] = np.random.randint(8, 21, size=len(df))
    
    # 4. Feature Selection
    num_features = ['amount_due', 'days_overdue', 'risk_score', 'tenure_months', 'hour_of_day']
    cat_features = ['customer_segment', 'skill_level']
    
    X = df[num_features].copy()
    X_cat = pd.get_dummies(df[cat_features], drop_first=False)
    X = pd.concat([X, X_cat], axis=1)
    y = df['is_success']
    
    return X, y, df

def train_model(X, y):
    print("Training XGBoost Classifier...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
        use_label_encoder=False,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluation Logic (Metrics printing omitted for brevity)
    return model, X.columns.tolist()

def recommend_best_agent(task_data, available_agents_list, model, feature_columns):
    recommendations = []
    current_hour = 14 
    
    for agent in available_agents_list:
        row = {
            'amount_due': task_data['amount_due'],
            'days_overdue': task_data['days_overdue'],
            'risk_score': task_data['risk_score'],
            'tenure_months': agent['tenure_months'],
            'hour_of_day': current_hour
        }
        
        input_df = pd.DataFrame([row])
        
        # Manual dummy matching
        seg_col = f"customer_segment_{task_data['customer_segment']}"
        skill_col = f"skill_level_{agent['skill_level']}"
        
        known_cat_cols = [c for c in feature_columns if 'customer_segment_' in c or 'skill_level_' in c]
        for col in known_cat_cols:
            input_df[col] = 0
            
        if seg_col in input_df.columns: input_df[seg_col] = 1
        if skill_col in input_df.columns: input_df[skill_col] = 1
            
        input_df = input_df.reindex(columns=feature_columns, fill_value=0)
        prob = model.predict_proba(input_df)[0, 1]
        
        recommendations.append({
            'agent_id': agent['agent_id'],
            'success_probability': prob
        })
        
    recommendations.sort(key=lambda x: x['success_probability'], reverse=True)
    return recommendations[0] if recommendations else None
```

## 4. Inference & Usage
The model is persisted in memory (in this script context) but can be saved using `joblib`. 

**Example Call:**
```python
sample_task = {
    'amount_due': 5000,
    'days_overdue': 60,
    'risk_score': 600,
    'customer_segment': 'Retail'
}
best_agent = recommend_best_agent(sample_task, agents_list, model, features)
print(f"Assign to: {best_agent['agent_id']}")
```
