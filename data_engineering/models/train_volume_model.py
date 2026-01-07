import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import os
import joblib
from datetime import timedelta

# --- CONFIG ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

def load_data():
    print("Loading data...")
    tasks = pd.read_csv(os.path.join(DATA_DIR, 'tasks.csv'))
    return tasks

def preprocess_data(tasks):
    print("Aggregating daily volume...")
    tasks['entry_date'] = pd.to_datetime(tasks['entry_date'])
    
    # Count tasks per day
    daily_counts = tasks.groupby('entry_date').size().reset_index(name='task_count')
    
    # Fill missing dates with 0
    full_idx = pd.date_range(start=daily_counts['entry_date'].min(), end=daily_counts['entry_date'].max())
    daily_counts = daily_counts.set_index('entry_date').reindex(full_idx, fill_value=0).reset_index()
    daily_counts.columns = ['entry_date', 'task_count']
    
    # Feature Engineering for Time Series
    daily_counts['day_of_week'] = daily_counts['entry_date'].dt.dayofweek
    daily_counts['month'] = daily_counts['entry_date'].dt.month
    daily_counts['day_of_year'] = daily_counts['entry_date'].dt.dayofyear
    daily_counts['is_weekend'] = daily_counts['day_of_week'].isin([5, 6]).astype(int)
    
    # Lag Features (Last 7 days)
    # We can't strictly use lags for 30-day forecast without recursive prediction loop.
    # To keep it simple and robust for specific "next 30 days" where we assume independent time features drive volume (Seasonality):
    # We will rely mainly on Time Features (Seasonality) as built into generation.
    
    return daily_counts

def train_model(df):
    print("Training Volume Forecasting Model...")
    
    features = ['day_of_week', 'month', 'day_of_year', 'is_weekend']
    X = df[features]
    y = df['task_count']
    
    # Split: Train on past, Test on recent
    train_size = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n" + "="*30)
    print(f"Model Metrics:")
    print(f"MAE: {mae:.2f} tasks/day")
    print(f"R2:  {r2:.4f}")
    print("="*30 + "\n")
    
    # Save Model
    joblib.dump(model, os.path.join(SCRIPT_DIR, 'volume_model.pkl'))
    
    return model

def forecast_future(model, last_date, days=30):
    print(f"Forecasting next {days} days...")
    future_dates = [last_date + timedelta(days=i) for i in range(1, days + 1)]
    future_df = pd.DataFrame({'entry_date': future_dates})
    
    future_df['date'] = pd.to_datetime(future_df['entry_date'])
    future_df['day_of_week'] = future_df['date'].dt.dayofweek
    future_df['month'] = future_df['date'].dt.month
    future_df['day_of_year'] = future_df['date'].dt.dayofyear
    future_df['is_weekend'] = future_df['day_of_week'].isin([5, 6]).astype(int)
    
    predictions = model.predict(future_df[['day_of_week', 'month', 'day_of_year', 'is_weekend']])
    future_df['predicted_volume'] = predictions
    
    return future_df

def plot_forecast(full_df, future_df):
    plt.figure(figsize=(12, 6))
    
    # Historical
    plt.plot(full_df['entry_date'], full_df['task_count'], 'k.', label='Historical Data', alpha=0.5)
    
    # Smooth Trend Line for Historical (Rolling Mean)
    plt.plot(full_df['entry_date'], full_df['task_count'].rolling(7).mean(), 'b-', label='7-Day Avg', alpha=0.7)
    
    # Future
    plt.plot(future_df['entry_date'], future_df['predicted_volume'], 'r-', label='Forecast (30 Days)', linewidth=2)
    
    plt.title("Task Volume Forecast")
    plt.xlabel("Date")
    plt.ylabel("New Tasks")
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    save_path = os.path.join(SCRIPT_DIR, 'volume_forecast.png')
    plt.savefig(save_path)
    print(f"Forecast plot saved to {save_path}")

def main():
    tasks = load_data()
    df = preprocess_data(tasks)
    model = train_model(df)
    
    last_date = df['entry_date'].max()
    future_df = forecast_future(model, last_date)
    
    plot_forecast(df, future_df)

if __name__ == "__main__":
    main()
