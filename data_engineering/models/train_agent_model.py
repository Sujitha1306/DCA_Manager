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
         # Check if timestamp actually has time (it likely doesn't based on check)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour_of_day'] = df['timestamp'].dt.hour
        
        # If all hours are 0, it means we only have dates. Inject synthetic hours.
        if df['hour_of_day'].sum() == 0:
            print("Warning: Timestamps missing time component. Simulating 'hour_of_day'...")
            # Assign random hour between 8 and 20 (8 AM to 8 PM)
            df['hour_of_day'] = np.random.randint(8, 21, size=len(df))
    
    # 4. Feature Selection
    # Numerical Features
    num_features = ['amount_due', 'days_overdue', 'risk_score', 'tenure_months', 'hour_of_day']
    
    # Categorical Features to Encode
    cat_features = ['customer_segment', 'skill_level']
    
    X = df[num_features].copy()
    
    # Manual dummy creation to ensure we can reproduce it in inference easily
    X_cat = pd.get_dummies(df[cat_features], drop_first=False)
    
    X = pd.concat([X, X_cat], axis=1)
    y = df['is_success']
    
    return X, y, df

def train_model(X, y):
    print("Training XGBoost Classifier...")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
        use_label_encoder=False,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    
    print("\n" + "="*30)
    print(f"Model Metrics:")
    print(f"Accuracy: {acc:.4f}")
    print(f"ROC-AUC:  {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print("="*30 + "\n")
    
    # Feature Importance
    try:
        xgb.plot_importance(model)
        plt.title("XGBoost Feature Importance")
        plt.tight_layout()
        save_path = os.path.join(SCRIPT_DIR, 'feature_importance.png')
        plt.savefig(save_path)
        print(f"Feature importance plot saved to {save_path}")
    except Exception as e:
        print(f"Could not save plot: {e}")
        
    return model, X.columns.tolist()

# --- INFERENCE FUNCTION ---
def recommend_best_agent(task_data, available_agents_list, model, feature_columns):
    """
    task_data: dict containing 'amount_due', 'days_overdue', 'risk_score', 'customer_segment'
    available_agents_list: list of dicts (or df) containing 'agent_id', 'tenure_months', 'skill_level'
    model: trained xgb model
    feature_columns: list of columns expected by the model
    """
    
    recommendations = []
    
    # Current simulated context (e.g., 2 PM)
    current_hour = 14 
    
    for agent in available_agents_list:
        # Construct input row
        row = {
            'amount_due': task_data['amount_due'],
            'days_overdue': task_data['days_overdue'],
            'risk_score': task_data['risk_score'],
            'tenure_months': agent['tenure_months'],
            'hour_of_day': current_hour
        }
        
        # DataFrame for one row
        input_df = pd.DataFrame([row])
        
        # Handle Categoricals (Customer Segment)
        seg_col = f"customer_segment_{task_data['customer_segment']}"
        skill_col = f"skill_level_{agent['skill_level']}"
        
        # Initialize all known categorical cols to 0
        known_cat_cols = [c for c in feature_columns if 'customer_segment_' in c or 'skill_level_' in c]
        for col in known_cat_cols:
            input_df[col] = 0
            
        # Set active ones to 1
        if seg_col in input_df.columns:
            input_df[seg_col] = 1
        if skill_col in input_df.columns:
            input_df[skill_col] = 1
            
        # Reorder to match model expectation
        input_df = input_df.reindex(columns=feature_columns, fill_value=0)
        
        # Predict
        prob = model.predict_proba(input_df)[0, 1]
        
        recommendations.append({
            'agent_id': agent['agent_id'],
            'success_probability': prob
        })
        
    # Sort by probability DESC
    recommendations.sort(key=lambda x: x['success_probability'], reverse=True)
    
    return recommendations[0] if recommendations else None

def run_functional_tests(model, features, agents_df):
    print("\nRunning Functional Tests...")
    # Get a stable sample of agents for consistent testing
    sample_agents = agents_df.head(10).to_dict('records')
    
    test_cases = [
        {
            "name": "High Value, Retail, Moderate Overdue",
            "task": {'amount_due': 5000, 'days_overdue': 60, 'risk_score': 600, 'customer_segment': 'Retail'}
        },
        {
            "name": "Low Value, SME, Fresh Debt",
            "task": {'amount_due': 100, 'days_overdue': 35, 'risk_score': 800, 'customer_segment': 'SME'}
        },
        {
            "name": "High Risk, Corporate, Very Overdue",
            "task": {'amount_due': 2000, 'days_overdue': 200, 'risk_score': 350, 'customer_segment': 'Corporate'}
        }
    ]
    
    for case in test_cases:
        print(f"\nTest Case: {case['name']}")
        rec = recommend_best_agent(case['task'], sample_agents, model, features)
        
        # Find agent details for context
        agent_details = next(a for a in sample_agents if a['agent_id'] == rec['agent_id'])
        print(f"Recommended: {rec['agent_id']} (Skill: {agent_details['skill_level']}, Tenure: {agent_details['tenure_months']}m)")
        print(f"Success Probability: {rec['success_probability']:.4f}")

def main():
    # 1. Load & Preprocess
    agents_df, tasks_df, interactions_df = load_data()
    X, y, full_df = preprocess_data(agents_df, tasks_df, interactions_df)
    
    # 2. Train
    model, features = train_model(X, y)
    
    # 3. Test Functionality
    run_functional_tests(model, features, agents_df)

if __name__ == "__main__":
    main()
