import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
import os
import joblib

# --- CONFIG ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

class SmartAllocator:
    def __init__(self):
        self.model = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
        self.label_encoders = {}
        self.feature_columns = None
    
    def load_data(self):
        print("Loading data...")
        self.agents = pd.read_csv(os.path.join(DATA_DIR, 'agents.csv'))
        self.tasks = pd.read_csv(os.path.join(DATA_DIR, 'tasks.csv'))
        self.interactions = pd.read_csv(os.path.join(DATA_DIR, 'interactions.csv'))
        return self.agents, self.tasks, self.interactions

    def train_engine(self):
        print("Training Allocator Engine...")
        # 1. Merge Data
        # Interactions + Tasks (on task_id) + Agents (on agent_id)
        df = self.interactions.merge(self.tasks, on='task_id').merge(self.agents, on='agent_id')
        
        # 2. Create Target
        # Success = Paid or PTP
        df['is_success'] = df['outcome'].isin(['Paid', 'PTP']).astype(int)
        
        # 3. Features
        # Categorical: skill_level, customer_segment
        # Numerical: amount_due, days_overdue, risk_score, tenure_months
        
        # Encoding
        le_skill = LabelEncoder()
        df['skill_level_encoded'] = le_skill.fit_transform(df['skill_level'])
        self.label_encoders['skill_level'] = le_skill
        
        le_segment = LabelEncoder()
        df['customer_segment_encoded'] = le_segment.fit_transform(df['customer_segment'])
        self.label_encoders['customer_segment'] = le_segment
        
        features = ['amount_due', 'days_overdue', 'risk_score', 'tenure_months', 
                    'skill_level_encoded', 'customer_segment_encoded']
        self.feature_columns = features
        
        X = df[features]
        y = df['is_success']
        
        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        
        print("\n" + "="*30)
        print(f"Model Metrics:")
        print(f"Accuracy: {acc:.4f}")
        
        # Improve Feature Importance Output
        importances = self.model.feature_importances_
        feat_imp = pd.DataFrame({'Feature': features, 'Importance': importances}).sort_values(by='Importance', ascending=False)
        print("\nTop 3 Important Features:")
        print(feat_imp.head(3))
        print("="*30 + "\n")
        
        # Save
        joblib.dump(self.model, os.path.join(SCRIPT_DIR, 'allocator_model.pkl'))
        return acc

    def allocate_bulk(self, unassigned_tasks_df, available_agents_df, max_tasks_per_agent=50):
        print(f"Allocating {len(unassigned_tasks_df)} tasks to {len(available_agents_df)} agents...")
        
        # Pre-process Inputs for Prediction
        # We need to cross-join Tasks and Agents to score every pair
        
        # 1. Create Prediction Dataset (Cartesian Product)
        # To avoid massive memory usage, we can do this in batches or just be careful.
        # For 100 tasks * 50 agents = 5000 rows (trivial)
        
        # Add a common key for cross join
        unassigned_tasks_df['key'] = 1
        available_agents_df['key'] = 1
        
        pairs = pd.merge(unassigned_tasks_df, available_agents_df, on='key').drop('key', axis=1)
        
        # Encode Features for Pairs
        pairs['skill_level_encoded'] = self.label_encoders['skill_level'].transform(pairs['skill_level'])
        pairs['customer_segment_encoded'] = self.label_encoders['customer_segment'].transform(pairs['customer_segment'])
        
        X_predict = pairs[self.feature_columns]
        
        # Predict Probabilities
        probs = self.model.predict_proba(X_predict)[:, 1]
        pairs['predicted_success_prob'] = probs
        
        # 2. Greedy Allocation Loop
        assignments = []
        agent_current_load = available_agents_df.set_index('agent_id')['current_workload'].to_dict()
        task_assigned = set()
        
        # Sort all pairs by Probability DESC
        pairs_sorted = pairs.sort_values(by='predicted_success_prob', ascending=False)
        
        for idx, row in pairs_sorted.iterrows():
            t_id = row['task_id']
            a_id = row['agent_id']
            
            # If task already assigned, skip
            if t_id in task_assigned:
                continue
            
            # If agent full, skip
            if agent_current_load.get(a_id, 0) >= max_tasks_per_agent:
                continue
            
            # Assign
            assignments.append({
                'task_id': t_id,
                'assigned_agent_id': a_id,
                'predicted_success_prob': row['predicted_success_prob']
            })
            
            task_assigned.add(t_id)
            agent_current_load[a_id] = agent_current_load.get(a_id, 0) + 1
            
            # Optimization: If all tasks assigned, break early
            if len(task_assigned) == len(unassigned_tasks_df):
                break
                
        results_df = pd.DataFrame(assignments)
        print(f"Allocated {len(results_df)} tasks.")
        return results_df

def main():
    allocator = SmartAllocator()
    
    # 1. Train
    allocator.load_data()
    acc = allocator.train_engine()
    
    if acc < 0.85:
        print("WARNING: Model accuracy < 85%. Consider improving data generation logic.")
    
    # 2. Simulate Allocation
    # Pick 100 random tasks as 'Unassigned' and reset their status
    sample_tasks = allocator.tasks.sample(100).copy()
    sample_agents = allocator.agents.copy()
    
    # Reset agent workloads for simulation (or keep as is, but let's assume we are allocating for next day)
    sample_agents['current_workload'] = 0 
    
    assignments = allocator.allocate_bulk(sample_tasks, sample_agents)
    
    print("\nTop 5 Assignments:")
    print(assignments.head())
    
    # Save Assignment Report
    assignments.to_csv(os.path.join(DATA_DIR, 'assignments_report.csv'), index=False)
    print(f"Assignments saved to {os.path.join(DATA_DIR, 'assignments_report.csv')}")

if __name__ == "__main__":
    main()
