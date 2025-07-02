import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="hero-content">
            <h1>🏢 Who We Are</h1>
            <p>Revolutionizing sports betting through blockchain technology</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-content">
            <div className="mission-text">
              <h2>🎯 Our Mission</h2>
              <p>
                At BetZilla, we believe that sports betting should be transparent, fair, and accessible to everyone. 
                We're building the future of decentralized sports betting where every bet is recorded on the blockchain, 
                every outcome is verifiable, and every player has an equal chance to win.
              </p>
              <p>
                Our innovative blind betting system ensures that all participants place their bets before odds are revealed, 
                creating a truly fair and exciting betting environment that eliminates any possibility of manipulation.
              </p>
            </div>
            <div className="mission-image">
              <div className="mission-illustration">
                <span className="mission-emoji">🎰</span>
                <span className="mission-emoji">⚡</span>
                <span className="mission-emoji">🌟</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <h2>💎 Our Values</h2>
            <p>The principles that guide everything we do</p>
          </div>
          
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">🔒</div>
              <h3>Transparency</h3>
              <p>Every transaction, every bet, every outcome is recorded on the blockchain for complete transparency.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">⚖️</div>
              <h3>Fairness</h3>
              <p>Our blind betting system ensures that no one has an unfair advantage over other players.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">🛡️</div>
              <h3>Security</h3>
              <p>Built on Ethereum blockchain with industry-leading security practices to protect your assets.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">🌍</div>
              <h3>Accessibility</h3>
              <p>Open to everyone, anywhere in the world. No barriers, no discrimination, just pure betting fun.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">⚡</div>
              <h3>Innovation</h3>
              <p>Constantly pushing the boundaries of what's possible in decentralized sports betting.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">🤝</div>
              <h3>Community</h3>
              <p>Building a strong community of sports enthusiasts and betting aficionados.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <h2>👥 Meet Our Team</h2>
            <p>The brilliant minds behind BetZilla</p>
          </div>
          
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">
                <img src="https://media.licdn.com/dms/image/v2/D4D35AQFpbXIKmlyrBQ/profile-framedphoto-shrink_200_200/profile-framedphoto-shrink_200_200/0/1693577999751?e=1752098400&v=beta&t=aaXlQ5zca_Fn0m80rCcOktaXecaEtPk84JphqpamQIk" alt="Matteo Bertoldo" />
              </div>
              <h3>Matteo Bertoldo</h3>
              <p className="member-role">Founder & CEO</p>
              <p className="member-bio">
                Blockchain enthusiast with 2 years in fintech. Passionate about democratizing sports betting.
              </p>
            </div>
            
            <div className="team-member">
              <div className="member-avatar">
                <img src="https://media.licdn.com/dms/image/v2/D4E03AQG9TL0Wkld_ng/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1718270904593?e=1756944000&v=beta&t=-S4fYyyb1HIUASxToz8yFcCCcAQQIKGk84GEXAyL6Ms" alt="Filippo Basilico" />
              </div>
              <h3>Filippo Basilico</h3>
              <p className="member-role">CTO</p>
              <p className="member-bio">
                Smart contract expert and security specialist. Former lead developer at major DeFi protocols.
              </p>
            </div>
            
            <div className="team-member">
              <div className="member-avatar">
                <img src="https://media.licdn.com/dms/image/v2/D5603AQHngS8gRlUPRg/profile-displayphoto-shrink_200_200/B56ZTB00zTHwAY-/0/1738418639100?e=1756944000&v=beta&t=ajWR-o4448s_BxFRJrpVDdM-53SkpJqkrcgosfGVMrE" alt="Jacopo Corrao" />
              </div>
              <h3>Jacopo Corrao</h3>
              <p className="member-role">Head of Design</p>
              <p className="member-bio">
                UX/UI designer focused on creating intuitive and beautiful betting experiences.
              </p>
            </div>
            
            <div className="team-member">
              <div className="member-avatar">
                <img src="https://media.licdn.com/dms/image/v2/D4E03AQHLvsmnJ4gNvw/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1725904945530?e=1756944000&v=beta&t=r9wDb7VSha6LiecST1Hscx7awcbds5BfP6wDZYGWe8g" alt="Mario Sguario" />
              </div>
              <h3>Mario Sguario</h3>
              <p className="member-role">Head of Marketing</p>
              <p className="member-bio">
                Growth expert with deep knowledge of sports betting markets and user acquisition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="technology-section">
        <div className="container">
          <div className="tech-content">
            <div className="tech-text">
              <h2>🔧 Our Technology</h2>
              <p>
                BetZilla is built on cutting-edge blockchain technology that ensures security, 
                transparency, and fairness for all users.
              </p>
              
              <div className="tech-features">
                <div className="tech-feature">
                  <span className="tech-icon">⚡</span>
                  <div>
                    <h4>Smart Contracts</h4>
                    <p>Automated execution of bets and payouts without human intervention</p>
                  </div>
                </div>
                
                <div className="tech-feature">
                  <span className="tech-icon">🔐</span>
                  <div>
                    <h4>Ethereum Blockchain</h4>
                    <p>Built on the most secure and decentralized blockchain network</p>
                  </div>
                </div>
                
                <div className="tech-feature">
                  <span className="tech-icon">🛡️</span>
                  <div>
                    <h4>Security Audits</h4>
                    <p>Regular security audits by leading blockchain security firms</p>
                  </div>
                </div>
                
                <div className="tech-feature">
                  <span className="tech-icon">📱</span>
                  <div>
                    <h4>User-Friendly Interface</h4>
                    <p>Intuitive design that makes blockchain betting accessible to everyone</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="tech-image">
              <div className="tech-illustration">
                <span className="tech-emoji">⛓️</span>
                <span className="tech-emoji">🔒</span>
                <span className="tech-emoji">💡</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="vision-section">
        <div className="container">
          <div className="vision-content">
            <h2>🚀 Our Vision</h2>
            <p>
              We envision a world where sports betting is completely transparent, fair, and free from 
              manipulation. A world where every bet is equal, every outcome is verifiable, and every 
              player has the same opportunity to win.
            </p>
            <p>
              BetZilla is just the beginning. We're working towards a future where decentralized 
              betting platforms become the standard, replacing traditional centralized systems with 
              transparent, community-driven alternatives.
            </p>
            
            <div className="vision-stats">
              <div className="vision-stat">
                <div className="stat-number">🎯</div>
                <div className="stat-text">100% Transparent</div>
              </div>
              <div className="vision-stat">
                <div className="stat-number">⚡</div>
                <div className="stat-text">Instant Payouts</div>
              </div>
              <div className="vision-stat">
                <div className="stat-number">🌍</div>
                <div className="stat-text">Global Access</div>
              </div>
              <div className="vision-stat">
                <div className="stat-number">🔒</div>
                <div className="stat-text">Blockchain Secured</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
