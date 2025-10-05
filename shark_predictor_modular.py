import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score
import joblib # Used for saving/loading real models

# --- 1. FEATURE SELECTION AND COEFFICIENTS (FINAL TUNING) ---

# NORTH ATLANTIC MODEL: APEX PREDATOR (4 features)
ATLANTIC_COEFFS = {
    'B0_INTERCEPT': -3.0,     
    'B1_ACE_CORE': 3.5,     
    'B2_SHEAR': 2.0,            
    'B3_SST_ANOMALY': 1.0,      
    'B4_PHYTO_SCORE': 0.5,      
}
ATLANTIC_FEATURES = ['ace_core', 'shear', 'sst_anomaly', 'phyto_score']

# INDIAN OCEAN MODEL: FILTER FEEDER (4 features)
INDIAN_COEFFS = {
    'B0_INTERCEPT': -0.5,     
    'B1_CHL_ABUNDANCE': 5.0,    
    'B2_COASTAL_DIST': -0.5,    
    'B3_SST': -0.8,              
    'B4_ACE_CORE': 0.5,         
}
INDIAN_FEATURES = ['chl_abundance', 'coastal_dist', 'sst', 'ace_core']


# --- Global Scaling Factors ---
SCALING_FACTOR_K = 10 
MIN_SCALING_THRESHOLD = 0.5 # Ensures count is at least 1 when probability is non-zero


# --- 2. MODEL CLASS AND PREDICTION LOGIC ---

class SharkRSFModel:
    """
    Modular class to load, encapsulate, and run predictions on a specific XGBoost model.
    """
    def __init__(self, ocean_name):
        self.ocean = ocean_name
        
        if ocean_name == 'Atlantic':
            self.features = ATLANTIC_FEATURES
            self.coeffs = ATLANTIC_COEFFS
        else: # Indian Ocean
            self.features = INDIAN_FEATURES
            self.coeffs = INDIAN_COEFFS
            
        self.model = self._load_or_train_placeholder_model()
        
    def _create_placeholder_data(self, size=1000):
        """Creates dummy data for training the placeholder model (using 4 features)."""
        
        # The data keys must match the feature names defined globally
        data = {
            self.features[0]: np.random.uniform(0, 10, size),
            self.features[1]: np.random.uniform(0, 10, size),
            self.features[2]: np.random.uniform(280, 305, size),
            self.features[3]: np.random.uniform(0, 5, size),
            'shark_present': np.random.randint(0, 2, size) # Target variable
        }
        return pd.DataFrame(data)

    def _load_or_train_placeholder_model(self):
        """Trains a simple placeholder model so the server starts correctly."""
            
        print(f"[{self.ocean}] Training placeholder model...")
        
        df = self._create_placeholder_data()
        X = df[self.features]
        Y = df['shark_present']
        
        # We use a simple XGBoost model with low complexity for fast training
        model = XGBClassifier(
            objective='binary:logistic',
            n_estimators=50,
            learning_rate=0.1,
            use_label_encoder=False, 
            eval_metric='logloss',
            random_state=42
        )
        model.fit(X, Y)
        
        Y_proba = model.predict_proba(X)[:, 1]
        auc = roc_auc_score(Y, Y_proba)
        print(f"[{self.ocean}] Placeholder AUC: {auc:.4f} (Features: {len(self.features)})")
        
        return model

    def predict_location_probability(self, input_data):
        """
        Runs the model prediction and calculates the scaled shark abundance count.
        
        Args:
            input_data (list): A list of feature values matching the order 
                               of self.features.
                               
        Returns:
            tuple: (probability, numerical_count, status_string)
        """
        if len(input_data) != len(self.features):
            raise ValueError(
                f"Expected {len(self.features)} features for the {self.ocean} model ({self.features}), but received {len(input_data)}."
            )

        # Convert feature list to a DataFrame for model input
        input_df = pd.DataFrame([input_data], columns=self.features)

        # Predict probability
        probability = self.model.predict_proba(input_df)[:, 1][0]
        
        # 1. Predict Numerical Abundance (New Formula)
        scaled_value = probability * SCALING_FACTOR_K
        
        # Ensure count is never zero if probability > a small tolerance
        if probability > 0.01:
            final_scaled_count = max(MIN_SCALING_THRESHOLD, scaled_value)
            num_sharks = np.ceil(final_scaled_count).astype(int)
        else:
            num_sharks = 0 # If P is truly negligible (near 0)

        # 2. Create descriptive output string
        if probability > 0.75:
            prediction = "CRITICAL HOTSPOT"
        elif probability > 0.5:
            prediction = "High Probability Foraging Zone"
        else:
            prediction = "Transit / Low Activity"
            
        return probability, num_sharks, f"{prediction} ({num_sharks} Sharks)"

# --- If you want to use the ML code to save your actual models:
# import joblib
# joblib.dump(xgb_model, 'Atlantic_xgb_model.joblib')
