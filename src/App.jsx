import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Chronicle from './pages/Chronicle';
import NotFound from './components/NotFound';
import BackgroundLayer from './components/BackgroundLayer';

// Part II: the film. Loaded on demand so three.js stays out of the rest of the site.
const Film = lazy(() => import('./film/Experience'));

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <BackgroundLayer />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/chronicle/:id" element={<Chronicle />} />
          <Route path="/film" element={<Suspense fallback={<div className="fixed inset-0 bg-black" />}><Film /></Suspense>} />
          <Route path="*" element={<NotFound onReset={() => navigate('/')} />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

export default App;

