import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div style={{ paddingTop: '100px' }}> {/* Adjust for fixed navbar height */}
            <Routes>
              <Route path="/" element={<Home />} />
              {/* Add more routes here, e.g., Login, Register, Services */}
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
