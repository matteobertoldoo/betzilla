import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useBetzilla } from './hooks/useBetzilla';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Bet from './pages/Bet';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';
import './App.css';

function App() {
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
    <Router>
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
              path="/settings" 
              element={
                <Settings 
                  account={account}
                  contract={contract}
                />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;