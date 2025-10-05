import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SciFiHome from './components/SciFiHome';
import MapUI from './components/MapUI';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SciFiHome />} />
        <Route path="/map" element={<MapUI />} />
      </Routes>
    </Router>
  );
}

export default App;