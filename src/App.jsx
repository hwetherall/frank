import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import FindExpert from './components/FindExpert';
import ViewDatabase from './components/ViewDatabase';
import ExpertProfile from './components/ExpertProfile';
import UpdateExpert from './components/UpdateExpert';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Routes>
        <Route path="/" element={<FindExpert />} />
        <Route path="/database" element={<ViewDatabase />} />
        <Route path="/expert/:id" element={<ExpertProfile />} />
        <Route path="/update/:id" element={<UpdateExpert />} />
      </Routes>
    </div>
  );
}

export default App;
