import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import OneHotEncoder
import matplotlib.pyplot as plt
import os
import joblib

# --- CONFIG ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

def load_data():
    print("Loading data...")
    agents = pd.read_csv(os.path.join(DATA_DIR, 'agents.csv'))
    interactions = pd.read_csv(os.path.join(DATA_DIR, 'interactions.csv'))
    return agents, interactions

def aggregate_weekly_metrics(interactions_df, agents_df):
    print("Aggregating weekly metrics...")
    
    # 1. Convert Timestamp
    interactions_df['timestamp'] = pd.to_datetime(interactions_df['timestamp'])
    
    # 2. Extract Week Number (and Year to be safe)
    interactions_df['Year'] = interactions_df['timestamp'].dt.year
    interactions_df['Week_Number'] = interactions_df['timestamp'].dt.isocalendar().week
    
    # 3. Define Success
    interactions_df['is_success'] = interactions_df['outcome'].isin(['Paid', 'PTP']).astype(int)
    
    # 4. Group by Agent + Year + Week
    weekly_agg = interactions_df.groupby(['agent_id', 'Year', 'Week_Number']).agg(
        total_calls=('log_id', 'count'),
        total_success=('is_success', 'sum')
    ).reset_index()
    
    weekly_agg['weekly_recovery_rate'] = weekly_agg['total_success'] / weekly_agg['total_calls']
    
    # 5. Sort for rolling calculations
    weekly_agg = weekly_agg.sort_values(by=['agent_id', 'Year', 'Week_Number'])
    
    # 6. Advanced Feature Engineering (Rolling & Lags)
    # To hit >0.85 R2, we need recent history to be very predictive.
    
    # Lag 1: Last week's performance (Direct predictor for next week)
    # Note: 'weekly_recovery_rate' is the CURRENT week (Row T).
    # We want to use Row T stats to predict Row T (target is T+1).
    # So 'weekly_recovery_rate' IS the most recent lag relative to the prediction target.
    
    # Let's verify:
    # Row T: Week 10.
    # Target: Week 11 Rate.
    # Feature: Week 10 Rate. -> Strong correlation.
    
    # We will rename 'weekly_recovery_rate' to 'current_week_rate' for clarity in features
    weekly_agg['current_week_rate'] = weekly_agg['weekly_recovery_rate']
    
    # Lag 1 (relative to current week) -> Week T-1
    weekly_agg['lag_1_rate'] = weekly_agg.groupby('agent_id')['weekly_recovery_rate'].shift(1)
    
    # Rolling 4 Week Mean INCLUDING Current Week
    weekly_agg['avg_rate_last_4_weeks'] = (
        weekly_agg.groupby('agent_id')['weekly_recovery_rate']
        .transform(lambda x: x.rolling(window=4, min_periods=1).mean())
    )
    
    # Expanding Mean 
    weekly_agg['career_avg_rate'] = (
        weekly_agg.groupby('agent_id')['weekly_recovery_rate']
        .transform(lambda x: x.expanding().mean())
    )
    
    # Trend: Current vs 4-week avg
    weekly_agg['performance_trend'] = weekly_agg['current_week_rate'] - weekly_agg['avg_rate_last_4_weeks']
    
    # 7. Target: Next Week Recovery Rate
    weekly_agg['next_week_recovery_rate'] = weekly_agg.groupby('agent_id')['weekly_recovery_rate'].shift(-1)
    
    # 8. Merge with Agent Profiles
    main_df = weekly_agg.merge(agents_df[['agent_id', 'tenure_months', 'skill_level']], on='agent_id', how='left')
    
    # Drop rows with missing targets
    main_df = main_df.dropna(subset=['next_week_recovery_rate'])
    
    print(f"Aggregated Data Shape: {main_df.shape}")
    return main_df

def feature_engineering(df):
    print("Feature Engineering...")
    
    num_features = [
        'total_calls', 
        'current_week_rate',
        'avg_rate_last_4_weeks', 
        'tenure_months',
        'lag_1_rate',
        'career_avg_rate',
        'performance_trend'
    ]
    
    # Fill any NaNs in lags (first weeks) with 0 or mean
    df[num_features] = df[num_features].fillna(0)
    
    cat_features = ['skill_level']
    
    X_num = df[num_features].copy()
    X_cat = pd.get_dummies(df[cat_features], drop_first=False) 
    
    X = pd.concat([X_num, X_cat], axis=1)
    y = df['next_week_recovery_rate']
    
    return X, y

def train_model(X, y):
    print("Training Random Forest Regressor...")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Tuning: Increase estimators and depth for better capture of the noisy signal
    model = RandomForestRegressor(
        n_estimators=500,
        max_depth=25, 
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print("\n" + "="*30)
    print(f"Model Performance Metrics:")
    print(f"R2 Score: {r2:.4f}")
    print(f"MAE:      {mae:.4f}")
    print(f"RMSE:     {rmse:.4f}")
    print("="*30 + "\n")
    
    # Save Model
    model_path = os.path.join(SCRIPT_DIR, 'agent_performance_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
    
    return model, r2

def main():
    agents, interactions = load_data()
    agg_df = aggregate_weekly_metrics(interactions, agents)
    X, y = feature_engineering(agg_df)
    model, r2 = train_model(X, y)
    
    # Simple validation check
    if r2 >= 0.85:
        print("SUCCESS: Target accuracy reached!")
    else:
        print("WARNING: R2 Score is below 0.85 target. Consider data adjustments or more features.")

if __name__ == "__main__":
    main()
