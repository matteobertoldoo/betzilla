import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useBetzilla } from './hooks/useBetzilla';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Bet from './pages/Bet';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import PublicHome from './pages/PublicHome';
import About from './pages/About';
import FAQ from './pages/FAQ';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const {
    contract,
    account,
    loading,
    error,
    connectWallet,
    placeBet,
    getAllUserBets,
    claimWinnings,
    getEstimatedOdds,
    getCurrentFee,
  } = useBetzilla();

  return (
    <div className="App">
      <Navigation 
        account={account}
        connectWallet={connectWallet}
        loading={loading}
      />
      
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <div className="container">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Public routes for non-authenticated users */}
          {!isAuthenticated && (
            <>
              <Route path="/" element={<PublicHome />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
            </>
          )}
          
          {/* Protected routes for authenticated users */}
          {isAuthenticated && (
            <>
              <Route path="/" element={<Home />} />
              <Route 
                path="/bet" 
                element={
                  <Bet 
                    account={account}
                    contract={contract}
                    placeBet={placeBet}
                    getEstimatedOdds={getEstimatedOdds}
                    getCurrentFee={getCurrentFee}
                    loading={loading}
                  />
                } 
              />
              <Route 
                path="/portfolio" 
                element={
                  <Portfolio 
                    account={account}
                    contract={contract}
                    getAllUserBets={getAllUserBets}
                    claimWinnings={claimWinnings}
                    loading={loading}
                  />
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <Profile 
                    account={account}
                    contract={contract}
                  />
                } 
              />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;