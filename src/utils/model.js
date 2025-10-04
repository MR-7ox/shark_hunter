// src/utils/model.js

// HYPOTHETICAL COEFFICIENTS (BETA VALUES)
// These coefficients are determined by the conceptual "training" phase.
// They quantify the ecological links based on the provided research.
const BETA_COEFFICIENTS = {
    // B0 (Intercept): Baseline probability when all other factors are zero
    B0: -5.0, 
    // B1: Anticyclonic Eddy Core (1=in ACE, 0=not in ACE)
    B1_ACE_CORE: 2.5,  // Strong positive influence: ACE is a thermal conduit.
    // B2: SST Anomaly (e.g., in degrees C)
    B2_SST_ANOMALY: 1.0, // Positive influence: Warmer water helps deep diving.
    // B3: PACE Phyto Type (e.g., 0=low/picoplankton, 1=high/diatom)
    B3_PACE_PHYTO: 0.5, // Moderate positive influence: Healthier base of the food web.
    // B4: SWOT Shear (proxy for frontal strength/prey aggregation)
    B4_SWOT_SHEAR: 1.5,  // Strong positive influence: Aggregated prey layer.
  };
  
  /**
   * Calculates the predicted probability of shark foraging (P(Y=1)) 
   * for a single ocean grid cell using the Logistic Regression (RSF) formula.
   * @param {object} input - Satellite data for the cell.
   * @returns {number} Probability between 0 and 1.
   */
  export function predictForagingProbability(input) {
    const { 
      isAceCore,   // 1 or 0
      sstAnomaly,  // e.g., 0.5 to 2.0
      phytoScore,  // e.g., 0.1 to 1.0
      shearScore   // e.g., 0.1 to 1.0
    } = input;
  
    // 1. Calculate the Linear Predictor (z)
    // z = B0 + B1*x1 + B2*x2 + B3*x3 + B4*x4
    const z = 
      BETA_COEFFICIENTS.B0 +
      BETA_COEFFICIENTS.B1_ACE_CORE * isAceCore +
      BETA_COEFFICIENTS.B2_SST_ANOMALY * sstAnomaly +
      BETA_COEFFICIENTS.B3_PACE_PHYTO * phytoScore +
      BETA_COEFFICIENTS.B4_SWOT_SHEAR * shearScore;
  
    // 2. Convert Linear Predictor (z) to Probability (P) using the Sigmoid function
    // P(Y=1) = 1 / (1 + e^-z)
    const probability = 1 / (1 + Math.exp(-z));
  
    return parseFloat(probability.toFixed(3));
  }
  
  // Example usage to verify model logic:
  // console.log("Prob in high-energy ACE:", predictForagingProbability({ isAceCore: 1, sstAnomaly: 1.5, phytoScore: 0.8, shearScore: 0.7 }));
  // console.log("Prob in quiet water:", predictForagingProbability({ isAceCore: 0, sstAnomaly: 0.1, phytoScore: 0.2, shearScore: 0.1 }));