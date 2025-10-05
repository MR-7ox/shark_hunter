import json
from flask import Flask, request, jsonify
from flask_cors import CORS
# Import the model classes and feature lists from your prediction script
from shark_predictor_modular import SharkRSFModel, ATLANTIC_FEATURES, INDIAN_FEATURES 

app = Flask(__name__)
# Enable CORS so your React app (running on localhost:3000) can communicate with Flask
CORS(app) 

# --- 1. MODEL INITIALIZATION ---
# Load and train the models once when the server starts up.
print("Initializing and training all RSF Models...")
try:
    # This calls the SharkRSFModel class defined in your Canvas file.
    ATLANTIC_MODEL = SharkRSFModel('Atlantic')
    INDIAN_MODEL = SharkRSFModel('Indian Ocean')
    print("Models successfully loaded and ready for predictions.")
except Exception as e:
    print(f"FATAL ERROR: Could not initialize models. {e}")
    ATLANTIC_MODEL = None
    INDIAN_MODEL = None

# ------------------------------
# --- NEW ENDPOINT FOR STATUS ---
# ------------------------------
@app.route('/', methods=['GET'])
def server_status():
    """Returns a simple message to confirm the server is running."""
    return jsonify({
        "status": "online",
        "message": "Shark Habitat Prediction API is running. Use POST /predict_sharks to make predictions.",
        "models_ready": ATLANTIC_MODEL is not None and INDIAN_MODEL is not None
    }), 200


# --- 2. API ENDPOINT (POST) ---

@app.route('/predict_sharks', methods=['POST'])
def predict_sharks():
    """
    Accepts a list of locations/feature sets and returns a list of predictions.
    """
    
    if request.method != 'POST':
        return jsonify({"error": "Method not allowed. Use POST."}), 405

    try:
        data = request.get_json(force=True)
        if not isinstance(data, list):
            data = [data] # Handle single location queries as a list

    except Exception:
        return jsonify({"error": "Invalid JSON format in request body."}), 400

    results = []
    
    for item in data:
        ocean = item.get('ocean')
        features = item.get('features')
        coords = item.get('coords') # [lat, lon]
        
        if not ocean or not features or not coords:
            results.append({
                "query": item, 
                "error": "Missing 'ocean', 'features', or 'coords' key."
            })
            continue

        # Select the correct model based on the ocean name
        if ocean == 'Atlantic':
            model = ATLANTIC_MODEL
            feature_names = ATLANTIC_FEATURES
        elif ocean == 'Indian Ocean':
            model = INDIAN_MODEL
            feature_names = INDIAN_FEATURES
        else:
            results.append({
                "coords": coords, 
                "error": f"Invalid ocean: {ocean}. Must be 'Atlantic' or 'Indian Ocean'."
            })
            continue
            
        # Ensure model is initialized
        if model is None:
            results.append({"coords": coords, "error": "Server failed to load the model."})
            continue

        try:
            # Call the predictive function
            probability, count, pred_str = model.predict_location_probability(features)
            
            # Append results in a web-friendly JSON structure
            results.append({
                "coords": coords,
                "ocean": ocean,
                "probability": float(probability),
                "count": int(count),
                "status": pred_str,
                "features_used": feature_names
            })

        except ValueError as ve:
            results.append({"coords": coords, "error": f"Feature count mismatch: {ve}"})
        except Exception as e:
            results.append({"coords": coords, "error": f"Prediction failed: {str(e)}"})

    return jsonify(results), 200

if __name__ == '__main__':
    # Flask will typically run on http://127.0.0.1:5000
    app.run(debug=True, host='0.0.0.0', port=5000)