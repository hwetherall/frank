import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import FindExpert from './components/FindExpert';
import ViewDatabase from './components/ViewDatabase';
import Pipeline from './components/Pipeline';
import ContactProfile from './components/ContactProfile';
import Settings from './components/Settings';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Routes>
        <Route path="/" element={<FindExpert />} />
        <Route path="/database" element={<ViewDatabase />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/contact/:id" element={<ContactProfile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;
