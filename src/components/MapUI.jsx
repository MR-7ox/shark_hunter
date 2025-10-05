// src/components/MapUI.jsx (FINAL DEBUGGED VERSION)

import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { HotspotFrames, SharkTrack } from '../data/simData'; 
import L from 'leaflet';

// Fix default marker icons (required by Leaflet)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const defaultCenter = [39.0, -56.0]; // Centered near the Gulf Stream area
const defaultZoom = 6;

// --- Region Center Definitions ---
const regionCenters = {
  "North Atlantic": { center: [39.0, -56.0], zoom: 6 },
  "California Current": { center: [36.5, -122.0], zoom: 5 },
  "Mozambique Channel": { center: [-18.0, 41.0], zoom: 5 }
};

// --- Helper to Change Map View ---
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// --- Helper Functions ---

// 1. Color function based on model probability (P(Forage))
const getProbabilityColor = (prob) => {
  return prob > 0.8 ? '#a50026' :   // Dark Red (Critical Hotspot)
         prob > 0.6 ? '#f46d43' :   // Orange (High Foraging)
         prob > 0.4 ? '#fee090' :   // Yellow (Moderate Activity)
         prob > 0.2 ? '#e0f3f8' :   // Light Blue (Low Activity)
                      '#4575b4';   // Deep Blue (Transit)
};

// 2. Styling function for the Hotspot GeoJSON layer
const hotspotStyle = (feature) => {
  const probability = feature.properties.probability;
  return {
    fillColor: getProbabilityColor(probability),
    weight: 1,
    opacity: 0.8,
    color: '#000', // Outline color
    fillOpacity: 0.75
  };
};

// --- Modal Content (Conceptual Tag) ---
const PaceTrackerTagContent = () => (
    <div style={{ maxWidth: '300px' }}>
        <h4>PACE-Tracker Tag Concept 🦈</h4>
        <p>This is our next-gen tag designed to validate the model in real-time:</p>
        <ul>
            <li>**Foraging Flag (Y=1):** **Internal pH Sensor** detects stomach acidity changes from feeding, providing instant proof of a kill.</li>
            <li>**Dietary eDNA Sampler:** A microfluidic chamber collects water *only* when a feeding event is detected, allowing scientists to find the **DNA of the prey species** upon tag recovery.</li>
            <li>**Real-time Link:** Transmits the 'Feeding Event' flag via Argos satellite, directly validating the map's red zones.</li>
        </ul>
    </div>
);


// --- Add API call function ---
async function fetchSharkPrediction(ocean, coords, features) {
  try {
    const response = await fetch('http://127.0.0.1:5000/predict_sharks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ ocean, coords, features }])
    });
    return await response.json();
  } catch (err) {
    return [{ error: err.message }];
  }
}

// --- Helper: Interpolate between two points for smooth animation ---
function interpolateCoords(start, end, t) {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t
  ];
}

// --- Main Map Component ---

const MapUI = () => {
  // --- NEW: Region Selection State ---
  const [selectedRegion, setSelectedRegion] = useState('North Atlantic');

  // --- NEW: Animation Frame State ---
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const totalFrames = HotspotFrames.length;

  // --- Animation Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % totalFrames);
    }, 5000); // 5s per frame, 15s total for 3 frames
    return () => clearInterval(interval);
  }, [totalFrames]);

  // --- Layer Toggles ---
  const [activeLayers, setActiveLayers] = useState({
    hotspot: true,
    swot: false,
    pace: false,
    modis: false
  });

  // --- Data Calculations ---
  const currentFrameData = useMemo(() => {
    return HotspotFrames[currentFrameIndex];
  }, [currentFrameIndex]);

  const currentSharkPos = useMemo(() => {
    const pos = SharkTrack.find(t => t.time === currentFrameIndex);
    return pos || { lat: regionCenters[selectedRegion].center[0], lon: regionCenters[selectedRegion].center[1], status: 'Unknown' };
  }, [currentFrameIndex, selectedRegion]);

  // --- UI Handlers ---
  const toggleLayer = (layerName) => {
    setActiveLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  // Function to generate content for GeoJSON Popups (showing input data)
  const getModelNarrative = (cellData) => {
    const prob = cellData.probability;
    const { isAceCore, sstAnomaly, shearScore, phytoTypeScore } = cellData;
    
    let mainDriver = '';
    if (isAceCore === 1) {
      mainDriver = `SWOT/MODIS: Strong Anticyclonic Eddy (ACE Core: ${isAceCore}, Temp Anomaly: +${sstAnomaly}°C).`;
    } else if (shearScore > 0.5) {
      mainDriver = `SWOT: High current shear (${shearScore}) aggregating prey.`;
    } else if (phytoTypeScore > 0.6) {
      mainDriver = `PACE: High food quality (${phytoTypeScore}) supporting food web.`;
    } else {
      mainDriver = 'Low activity, no strong drivers.';
    }

    return (
      <>
        **Predicted Foraging Probability:** <span style={{ color: getProbabilityColor(prob), fontWeight: 'bold' }}>{prob * 100}%</span>
        <br/>**Model Status:** {prob > 0.6 ? '🚨 CRITICAL HOTSPOT ZONE' : 'Low Activity'}
        <br/>**Main Driver:** {mainDriver}
        <br/>*(Click map to hide)*
      </>
    );
  };
  
  // Dynamic Sidebar Text for Current Time
  const currentHotspotNarrative = currentSharkPos.status === 'Foraging' ? (
    <p style={{ backgroundColor: '#fff3cd', padding: '10px', borderLeft: '3px solid #ffc107', fontWeight: 'bold' }}>
      **FORAGING HOTSPOT ALERT!** At this time, the model predicts high foraging (Red Zone). The shark is in this zone, driven by **SWOT** detecting a strong Anticyclonic Eddy.
    </p>
  ) : (
    <p>The shark is currently **{currentSharkPos.status.toLowerCase()}** in low-probability waters (Blue Zone). Environmental factors are not yet optimal for deep foraging.</p>
  );

  const [predictionResult, setPredictionResult] = useState(null);

  // --- Example: Call Flask API when region or frame changes ---
  useEffect(() => {
    // Example features for demo; replace with real features as needed
    const features = [1, 0.9, 1.8, 0.7];
    const coords = [currentSharkPos.lat, currentSharkPos.lon];
    const ocean = selectedRegion === "North Atlantic" ? "Atlantic" : "Indian Ocean";
    fetchSharkPrediction(ocean, coords, features).then(setPredictionResult);
  }, [selectedRegion, currentFrameIndex]);

  // --- Shark Animation State ---
  const [animationProgress, setAnimationProgress] = useState(0);

  // --- Animation Effect (smooth transition between frames) ---
  useEffect(() => {
    let frame = 0;
    const steps = 50; // More steps = smoother
    const interval = setInterval(() => {
      setAnimationProgress(frame / steps);
      frame++;
      if (frame > steps) frame = 0;
    }, 100); // 100ms per step
    return () => clearInterval(interval);
  }, [currentFrameIndex]);

  // --- Calculate animated position ---
  const prevFrame = SharkTrack.find(t => t.time === (currentFrameIndex === 0 ? totalFrames - 1 : currentFrameIndex - 1));
  const nextFrame = currentSharkPos;
  const animatedPos = prevFrame
    ? interpolateCoords([prevFrame.lat, prevFrame.lon], [nextFrame.lat, nextFrame.lon], animationProgress)
    : [currentSharkPos.lat, currentSharkPos.lon];

  // --- Shark Path Polyline ---
  const sharkPath = SharkTrack.slice(0, currentFrameIndex + 1).map(t => [t.lat, t.lon]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex' }}>
      
      {/* --- Sidebar for Controls and Explanations --- */}
      <div style={{ width: '25%', padding: '20px', backgroundColor: '#f0f0f0', overflowY: 'auto' }}>
        <h2>Dynamic Shark Hotspot Model</h2>

        {/* --- NEW: Ocean Region Selector --- */}
        <h4>Select Ocean Region</h4>
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
        >
          <option value="North Atlantic">North Atlantic (Gulf Stream)</option>
          <option value="California Current">California Current (White Sharks)</option>
          <option value="Mozambique Channel">Mozambique Channel (Whale Sharks)</option>
        </select>
        <p>Selected Region: <strong>{selectedRegion}</strong></p>
        <hr />

        {/* --- Display Current Frame Index --- */}
        <h4>Model Insight at T{currentFrameIndex}</h4>
        {currentHotspotNarrative}
        
        <hr />

        {/* --- Model Coefficients (The Math Explanation) --- */}
        <h4>The Mathematical Link ($\beta$ Coefficients)</h4>
        <p>Our model quantifies the influence of each NASA measurement:</p>
        
        <ul style={{ fontSize: '0.9em', listStyleType: 'none', paddingLeft: 0 }}>
          <li>**SWOT Eddy Core ($\beta_1 = +2.5$):** **The Primary Driver.** Being *inside* a warm eddy provides the crucial thermal refuge for deep foraging.</li>
          <li>**SWOT Shear ($\beta_2 = +1.5$):** **Prey Aggregator.** Strong currents concentrate food along fronts, making hunting efficient.</li>
          <li>**MODIS Anomaly ($\beta_3 = +1.0$):** **Thermal Indicator.** The hotter the water compared to normal, the more favorable the environment is.</li>
          <li>**PACE Phyto Score ($\beta_4 = +0.5$):** **Food Quality.** The health of the ecosystem's base layer supports the predicted biomass.</li>
        </ul>
        
        <hr />
        
        {/* --- Input Layer Toggles --- */}
        <h4>NASA Data Input Layers</h4>
        <div className='layer-toggles'>
          <label><input type="checkbox" checked={activeLayers.hotspot} onChange={() => toggleLayer('hotspot')} /> **$P(\text{'Forage'})$ Prediction (Output)**</label><br />
          <label><input type="checkbox" checked={activeLayers.swot} onChange={() => toggleLayer('swot')} /> SWOT Eddy Tracker (SSHA/Shear)</label><br />
          <label><input type="checkbox" checked={activeLayers.pace} onChange={() => toggleLayer('pace')} /> PACE Phyto Mapper (Quality)</label><br />
          <label><input type="checkbox" checked={activeLayers.modis} onChange={() => toggleLayer('modis')} /> MODIS Temp Anomaly (Warmth)</label><br />
        </div>

        <hr />

        <h4>Policy & Innovation</h4>
        <p style={{fontSize: '0.9em'}}>
            **Why it Matters:** This dynamic map enables **Dynamic Ocean Management (DOM)**—closing only the small Red Zones to fishing nets when the sharks are predicted to be foraging there, protecting them without shutting down vast ocean areas permanently.
        </p>

      </div>
      
      {/* --- Map View --- */}
      <MapContainer 
        center={regionCenters[selectedRegion].center} 
        zoom={regionCenters[selectedRegion].zoom} 
        style={{ height: '100vh', width: '75%' }}
        scrollWheelZoom={true}
      >
        {/* --- Change Map View on Region Change --- */}
        <ChangeMapView center={regionCenters[selectedRegion].center} zoom={regionCenters[selectedRegion].zoom} />

        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | NASA PACE/SWOT Concept'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Dynamic Predictive Layer (GeoJSON) - Hotspot Layer */}
        {activeLayers.hotspot && currentFrameData && (
          <GeoJSON 
              data={{ type: "FeatureCollection", features: currentFrameData.features }}
              style={hotspotStyle}
              onEachFeature={(feature, layer) => {
                  layer.bindPopup(getModelNarrative(feature.properties));
              }}
          />
        )}
        
        {/* 2. Mock NASA Input Layers (Conceptual Visualization) */}
        {/* SWOT Eddy Tracker: Uses ACE/Shear data from the properties */}
        {activeLayers.swot && currentFrameData && (
          <GeoJSON 
            data={{ type: "FeatureCollection", features: currentFrameData.features }}
            style={(feature) => ({
                fillColor: feature.properties.isAceCore === 1 ? '#e31a1c' : '#047bbf', // Red for ACE, Blue for non-ACE
                fillOpacity: feature.properties.isAceCore === 1 ? 0.2 : 0.0,
                color: '#e31a1c', 
                weight: feature.properties.shearScore * 5, // Thicker line for high shear
            })}
            pane="overlayPane"
          />
        )}

        {/* PACE Phyto Layer: Uses phytoTypeScore */}
        {activeLayers.pace && currentFrameData && (
          <GeoJSON 
            data={{ type: "FeatureCollection", features: currentFrameData.features }}
            style={(feature) => ({
                fillColor: `hsl(120, 100%, ${50 - (feature.properties.phytoTypeScore * 30)}%)`, // Green gradient
                fillOpacity: feature.properties.phytoTypeScore,
                color: 'transparent', 
                weight: 0
            })}
            pane="overlayPane"
          />
        )}

        {/* MODIS Temp Anomaly Layer: Uses sstAnomaly */}
        {activeLayers.modis && currentFrameData && (
          <GeoJSON 
            data={{ type: "FeatureCollection", features: currentFrameData.features }}
            style={(feature) => ({
                fillColor: feature.properties.sstAnomaly > 1.0 ? '#ffb74d' : '#81d4fa', // Warm vs Cool
                fillOpacity: feature.properties.sstAnomaly * 0.4,
                color: 'transparent', 
                weight: 0
            })}
            pane="overlayPane"
          />
        )}
        
        {/* 4. Shark Animation Marker (The Ground Truth) */}
        <Polyline positions={sharkPath} color="blue" weight={3} opacity={0.5} />
        <Marker 
            position={animatedPos} 
            icon={L.divIcon({ 
                className: 'shark-icon', 
                html: '<span style="font-size: 30px;">🦈</span>', 
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })}
        >
            <Popup>
                {/* 1. Actual status based on mock track */}
                Shark ID: Lydia (Hypothetical)<br/>
                Status: **{currentSharkPos.status}**<br/>
                ---<br/>
                {predictionResult && predictionResult[0] && !predictionResult[0].error && (
                  <div>
                    <b>Model Probability:</b> {predictionResult[0].probability}<br/>
                    <b>Weather:</b> {predictionResult[0].features_used ? predictionResult[0].features_used.join(', ') : 'N/A'}
                  </div>
                )}
                {predictionResult && predictionResult[0] && predictionResult[0].error && (
                  <div style={{color: 'red'}}>Error: {predictionResult[0].error}</div>
                )}
                <PaceTrackerTagContent />
            </Popup>
        </Marker>

      </MapContainer>
    </div>
  );
};

export default MapUI;