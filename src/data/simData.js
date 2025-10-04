// src/data/simData.js (FULL CODE - Ensure this matches your file)

import { predictForagingProbability } from '../utils/model';

// --- I. Grid Definition ---
const GridCells = [
  { id: 'C1', coords: [[-55, 38], [-54, 38], [-54, 39], [-55, 39], [-55, 38]] },
  { id: 'C2', coords: [[-54, 39], [-53, 39], [-53, 40], [-54, 40], [-54, 39]] },
  { id: 'C3', coords: [[-58, 36], [-57, 36], [-57, 37], [-58, 37], [-58, 36]] },
  { id: 'C4', coords: [[-60, 39], [-59, 39], [-59, 40], [-60, 40], [-60, 39]] },
];

// --- II. Simulated Environmental Inputs (NASA Data) per Time Step ---
const TimeSeriesInputs = {
  0: {
    C1: { isAceCore: 0, sstAnomaly: 0.1, phytoTypeScore: 0.3, shearScore: 0.1 },
    C2: { isAceCore: 0, sstAnomaly: 0.2, phytoTypeScore: 0.2, shearScore: 0.1 },
    C3: { isAceCore: 0, sstAnomaly: 0.0, phytoTypeScore: 0.1, shearScore: 0.0 },
    C4: { isAceCore: 0, sstAnomaly: 0.1, phytoTypeScore: 0.7, shearScore: 0.2 },
  },
  1: {
    C1: { isAceCore: 1, sstAnomaly: 1.8, phytoTypeScore: 0.6, shearScore: 0.9 },
    C2: { isAceCore: 1, sstAnomaly: 1.5, phytoTypeScore: 0.5, shearScore: 0.8 },
    C3: { isAceCore: 0, sstAnomaly: 0.1, phytoTypeScore: 0.1, shearScore: 0.0 },
    C4: { isAceCore: 0, sstAnomaly: 0.2, phytoTypeScore: 0.7, shearScore: 0.2 },
  },
  2: {
    C1: { isAceCore: 0, sstAnomaly: 0.5, phytoTypeScore: 0.4, shearScore: 0.3 },
    C2: { isAceCore: 0, sstAnomaly: 0.4, phytoTypeScore: 0.4, shearScore: 0.3 },
    C3: { isAceCore: 0, sstAnomaly: 0.0, phytoTypeScore: 0.1, shearScore: 0.0 },
    C4: { isAceCore: 0, sstAnomaly: 0.1, phytoTypeScore: 0.7, shearScore: 0.2 },
  },
};

// --- III. Shark Track Data (The Ground Truth Proxy) ---
export const SharkTrack = [
  { time: 0, lat: 37.5, lon: -56.5, status: 'Transiting' }, 
  { time: 1, lat: 38.5, lon: -54.5, status: 'Foraging' },  
  { time: 2, lat: 40.0, lon: -53.0, status: 'Transiting' }, 
];

// --- IV. Generate Final Hotspot Frames (The Model Output) ---
export function generateHotspotFrames() {
  const frames = [];
  for (const time in TimeSeriesInputs) {
    const features = [];
    for (const cellId in TimeSeriesInputs[time]) {
      const inputs = TimeSeriesInputs[time][cellId];
      const cellCoords = GridCells.find(c => c.id === cellId).coords;
      
      const probability = predictForagingProbability(inputs); 

      features.push({
        type: "Feature",
        properties: {
          id: cellId,
          time: parseInt(time),
          probability: probability,
          ...inputs 
        },
        geometry: {
          type: "Polygon",
          coordinates: [cellCoords],
        }
      });
    }
    frames.push({ time: parseInt(time), features: features });
  }
  return frames;
}

// FIX 1: Explicitly export the HotspotFrames constant
export const HotspotFrames = generateHotspotFrames();