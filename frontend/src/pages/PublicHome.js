import React from 'react';
import { Link } from 'react-router-dom';
import './PublicHome.css';

const PublicHome = () => {
  return (
    <div className="public-home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>🎰 Welcome to BetZilla</h1>
              <h2>The Future of Sports Betting</h2>
              <p>
                Experience decentralized sports betting like never before. 
                Place blind bets with complete transparency, powered by blockchain technology.
              </p>
              <div className="hero-actions">
                <Link to="/login" className="cta-primary">
                  🚀 Get Started
                </Link>
                <a href="#how-it-works" className="cta-secondary">
                  📖 Learn More
                </a>
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-illustration">
                <span className="hero-emoji">🎯</span>
                <span className="hero-emoji">⚡</span>
                <span className="hero-emoji">🏆</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>🌟 Why Choose BetZilla?</h2>
            <p>Revolutionary features that set us apart</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Blind Betting System</h3>
              <p>Place bets before odds are revealed. Experience true excitement with our unique blind betting mechanism.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Blockchain Security</h3>
              <p>All transactions are secured by Ethereum blockchain. Complete transparency and immutable records.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Payouts</h3>
              <p>Automatic winning distribution through smart contracts. No delays, no middlemen, just pure efficiency.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track your betting performance with detailed statistics and portfolio management tools.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Decentralized</h3>
              <p>No central authority. The platform runs on smart contracts, ensuring fairness for everyone.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3>Low Fees</h3>
              <p>Minimal transaction costs compared to traditional betting platforms. More winnings for you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2>🎮 How It Works</h2>
            <p>Simple steps to start your betting journey</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>🦊 Connect Wallet</h3>
                <p>Connect your MetaMask or any EVM-compatible wallet to get started. We support all major Ethereum wallets.</p>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>👤 Create Account</h3>
                <p>Register your account to track your betting history and access advanced features.</p>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>🎯 Place Bets</h3>
                <p>Choose your sport, select your team, and place blind bets before odds are revealed.</p>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>🏆 Win & Claim</h3>
                <p>Watch the games, celebrate your wins, and automatically claim your rewards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Sports Markets</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">$10M+</div>
              <div className="stat-label">Total Volume</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>🚀 Ready to Start Betting?</h2>
            <p>Join thousands of users who trust BetZilla for their sports betting needs</p>
            <Link to="/login" className="cta-button">
              Join BetZilla Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicHome;
