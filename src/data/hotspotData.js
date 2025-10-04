// src/data/hotspotData.js
// SIMULATED MODEL OUTPUT (P(Forage) for each grid cell)

// Helper function to create a grid cell (polygon)
const createCell = (coords, prob) => ({
    type: "Feature",
    properties: { probability: prob },
    geometry: {
      type: "Polygon",
      // GeoJSON format: [ [ [lon, lat], [lon, lat], ... ] ]
      coordinates: [coords], 
    }
  });
  
  // Mock grid coordinates (simplified for the North Atlantic near the Gulf Stream)
  // Cell [lon, lat] definitions
  const C1 = [[-55, 38], [-54, 38], [-54, 39], [-55, 39], [-55, 38]]; // High Prob Zone
  const C2 = [[-54, 39], [-53, 39], [-53, 40], [-54, 40], [-54, 39]]; // High Prob Zone
  const C3 = [[-52, 36], [-51, 36], [-51, 37], [-52, 37], [-52, 36]]; // Low Prob Zone
  
  // Create time-dependent hotspot data (simulating animation frames)
  export const HotspotFrames = [
    // Frame 1 (Time = T0): Hotspot forming (moderate probability)
    {
      time: 0,
      features: [
        createCell(C1, 0.45), // Moderate Activity
        createCell(C2, 0.50), // Moderate Activity
        createCell(C3, 0.10), // Low Activity
      ],
    },
    // Frame 2 (Time = T1): Hotspot fully formed (high probability)
    {
      time: 1,
      features: [
        createCell(C1, 0.85), // HIGH HOTSPOT (e.g., shark data enters this zone)
        createCell(C2, 0.75), // HIGH HOTSPOT
        createCell(C3, 0.15), // Low Activity
      ],
    },
    // Frame 3 (Time = T2): Hotspot dissipating (low probability)
    {
      time: 2,
      features: [
        createCell(C1, 0.20), // Low Activity
        createCell(C2, 0.30), // Low Activity
        createCell(C3, 0.05), // Very Low Activity
      ],
    },
  ];