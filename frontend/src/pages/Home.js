import React from 'react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <div className="container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Welcome to <span className="brand-name gradient-brand-text">BetZilla</span>
              </h1>
              <p className="hero-subtitle">
                The Future of Decentralized Sports Betting
              </p>
              <p className="hero-description">
                Experience the thrill of blind betting on your favorite sports matches. 
                Place your bets before odds are revealed, ensuring complete transparency 
                and fairness powered by blockchain technology.
              </p>
              <div className="hero-buttons">
                <a href="/bet" className="btn btn-primary">
                  🎯 Start Betting
                </a>
                <a href="#features" className="btn btn-secondary">
                  📖 Learn More
                </a>
              </div>
            </div>
            <div className="hero-image">
              <img 
                src="/hero-image.jpg" 
                alt="BetZilla Logo" 
                className="logo-image"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="section-header">
            <h2>🌟 Why Choose BetZilla?</h2>
            <p>Discover the advantages of decentralized sports betting</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Blind Betting System</h3>
              <p>
                Place your bets before odds are revealed, creating a fair and 
                transparent betting environment where no one has an advantage.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Blockchain Security</h3>
              <p>
                All transactions are recorded on the Ethereum blockchain, 
                ensuring complete transparency and immutable betting records.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Instant Payouts</h3>
              <p>
                Claim your winnings instantly through smart contracts. 
                No waiting periods, no middlemen, just pure blockchain efficiency.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Portfolio Tracking</h3>
              <p>
                Monitor all your bets in real-time with detailed statistics 
                and comprehensive performance analytics.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Decentralized</h3>
              <p>
                No central authority controls your bets. Experience true 
                decentralization with peer-to-peer betting.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Low Fees</h3>
              <p>
                Enjoy competitive fees with transparent pricing. 
                More of your winnings stay in your pocket.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <div className="section-header">
            <h2>🚀 How It Works</h2>
            <p>Getting started with BetZilla is simple and secure</p>
          </div>
          
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Connect Your Wallet</h3>
                <p>Connect your MetaMask wallet to start your betting journey</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Choose Your Match</h3>
                <p>Browse available matches and select the one you want to bet on</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Place Your Blind Bet</h3>
                <p>Place your bet before odds are revealed for a fair experience</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Claim Your Winnings</h3>
                <p>Automatically claim your winnings when matches are resolved</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="section-header">
            <h2>📈 Platform Statistics</h2>
            <p>Join thousands of users already betting on BetZilla</p>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">Total Bets Placed</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Users</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">1,000+</div>
              <div className="stat-label">ETH Wagered</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Start Betting?</h2>
            <p>Join the revolution of decentralized sports betting today!</p>
            <a href="/bet" className="btn btn-primary btn-large">
              🎯 Place Your First Bet
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
