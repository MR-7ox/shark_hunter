// src/components/MapUI.jsx (FINAL DEBUGGED VERSION)

import React, { useState, useMemo } from 'react';
// FIX: Removed unused 'useMap'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// NOTE: Assuming simData.js is correctly defined
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


// --- Main Map Component ---

const MapUI = () => {
  const [currentTime, setCurrentTime] = useState(1); 
  const [activeLayers, setActiveLayers] = useState({ 
    hotspot: true, 
    swot: false, 
    pace: false,
    modis: false
  });

  // --- Data Calculations ---
  const currentFrameData = useMemo(() => {
    return HotspotFrames.find(f => f.time === currentTime);
  }, [currentTime]);

  const currentSharkPos = useMemo(() => {
    // FIX 4: Accesses the correct object properties from the SharkTrack array
    const pos = SharkTrack.find(t => t.time === currentTime);
    // Returns a safe fallback array for the Marker position if time is not found
    return pos || { lat: defaultCenter[0], lon: defaultCenter[1], status: 'Unknown' };
  }, [currentTime]);

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


  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex' }}>
      
      {/* --- Sidebar for Controls and Explanations --- */}
      <div style={{ width: '25%', padding: '20px', backgroundColor: '#f0f0f0', overflowY: 'auto' }}>
        <h2>Dynamic Shark Hotspot Model</h2>
        
        {/* Time Slider Control */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="time-slider" style={{ display: 'block' }}>Narrative Time Step: **T{currentTime}**</label>
          <input 
            id="time-slider"
            type="range"
            min="0"
            max={HotspotFrames.length - 1}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <hr />
        
        {/* --- Model Insight Narrative --- */}
        <h4>Model Insight at T{currentTime}</h4>
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
        center={defaultCenter} 
        zoom={defaultZoom} 
        style={{ height: '100vh', width: '75%' }}
        scrollWheelZoom={true}
      >
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
        <Marker 
            position={[currentSharkPos.lat, currentSharkPos.lon]} 
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
                {/* 2. Conceptual Tag Pop-up */}
                <PaceTrackerTagContent />
            </Popup>
        </Marker>

      </MapContainer>
    </div>
  );
};

export default MapUI;