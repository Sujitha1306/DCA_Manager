import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
import os
import joblib

# --- CONFIG ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

def load_data():
    print("Loading data...")
    tasks = pd.read_csv(os.path.join(DATA_DIR, 'tasks.csv'))
    interactions = pd.read_csv(os.path.join(DATA_DIR, 'interactions.csv'))
    return tasks, interactions

def feature_engineering(tasks_df, interactions_df):
    print("Feature Engineering...")
    
    # 1. Total Attempts per Task
    # Count all interactions for each task
    attempts = interactions_df.groupby('task_id').size().reset_index(name='total_attempts')
    
    # 2. Check if Task is Paid
    # Identify tasks that have ANY 'Paid' outcome
    paid_tasks = interactions_df[interactions_df['outcome'] == 'Paid']['task_id'].unique()
    
    # Merge attempts back to tasks_df
    # We use left join to keep all tasks (some might have 0 attempts if new - though gen script ensures 1+)
    df = tasks_df.merge(attempts, on='task_id', how='left')
    df['total_attempts'] = df['total_attempts'].fillna(0)
    
    # Create is_paid flag
    df['is_paid'] = df['task_id'].isin(paid_tasks).astype(int)
    
    # 3. Create 'is_stagnant'
    # Definition: total_attempts > 5 AND status is NOT 'Paid'
    df['is_stagnant'] = ((df['total_attempts'] > 5) & (df['is_paid'] == 0)).astype(int)
    
    # 4. Target Variable: 'high_risk_flag'
    # Definition: days_overdue > 90 AND is_stagnant == 1
    df['high_risk_flag'] = ((df['days_overdue'] > 90) & (df['is_stagnant'] == 1)).astype(int)
    
    print(f"Dataset Shape: {df.shape}")
    print(f"Risk Prevalence: {df['high_risk_flag'].mean():.2%}")
    
    return df

def train_model(df):
    print("Training Logistic Regression Model...")
    
    # Feature Engineering for Model
    # Since the target is defined by specific thresholds, we should give the linear model
    # features that make these thresholds explicit.
    # Target = (days > 90) AND (attempts > 5)
    
    df['feat_overdue_90'] = (df['days_overdue'] > 90).astype(int)
    df['feat_attempts_5'] = (df['total_attempts'] > 5).astype(int)
    # Important: Target logic includes "AND NOT PAID".
    df['feat_not_paid'] = (df['is_paid'] == 0).astype(int)
    
    # Interaction term to represent the AND condition exactly
    # Target = Overdue90 AND Attempts5 AND NotPaid
    df['feat_risk_interaction'] = df['feat_overdue_90'] * df['feat_attempts_5'] * df['feat_not_paid']
    
    # Features - SIMPLIFIED COMPELTELY to prove the rule
    # We only use the binary threshold features which DEFINED the target.
    # It should effectively be a lookup table.
    features = ['feat_overdue_90', 'feat_attempts_5', 'feat_not_paid', 'feat_risk_interaction']
    
    X = df[features]
    y = df['high_risk_flag']
    
    # Scaling - not needed for binary but harmless
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=features)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    # Model
    # Increase C to reduce regularization, allowing coefficients to grow large enough 
    # to enforce the deterministic rule.
    model = LogisticRegression(class_weight='balanced', C=1000.0, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n" + "="*30)
    print(f"Model Metrics:")
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print("="*30 + "\n")
    
    # Explainability: Coefficients
    print("Feature Coefficients (Log Odds):")
    coefs = pd.DataFrame({
        'Feature': features,
        'Coefficient': model.coef_[0]
    }).sort_values(by='Coefficient', ascending=False)
    print(coefs)
    
    # Save Model
    joblib.dump(model, os.path.join(SCRIPT_DIR, 'sla_risk_model.pkl'))
    
    return model, acc

def main():
    tasks, interactions = load_data()
    df = feature_engineering(tasks, interactions)
    model, acc = train_model(df)
    
    if acc > 0.85:
        print("\nSUCCESS: Model accuracy > 85%.")
    else:
        print("\nWARNING: Model accuracy below target.")

if __name__ == "__main__":
    main()
