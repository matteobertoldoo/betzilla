import React, { useState } from 'react';
import './FAQ.css';

const FAQ = () => {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqData = [
    {
      category: "Getting Started",
      questions: [
        {
          question: "What is BetZilla?",
          answer: "BetZilla is a decentralized sports betting platform built on the Ethereum blockchain. We offer a unique 'blind betting' system where users place bets before odds are revealed, ensuring complete fairness and transparency."
        },
        {
          question: "How do I get started?",
          answer: "To get started, you need to: 1) Install MetaMask or another compatible Ethereum wallet, 2) Create an account on BetZilla, 3) Connect your wallet, 4) Add funds to your wallet, and 5) Start placing bets on your favorite sports!"
        },
        {
          question: "What is blind betting?",
          answer: "Blind betting is our innovative system where all participants place their bets before the odds are revealed. This ensures that no one has an unfair advantage based on betting lines, creating a truly fair betting environment."
        },
        {
          question: "Do I need cryptocurrency to use BetZilla?",
          answer: "Yes, BetZilla operates on the Ethereum blockchain, so you'll need ETH (Ethereum) to place bets. You can purchase ETH from various cryptocurrency exchanges and transfer it to your MetaMask wallet."
        }
      ]
    },
    {
      category: "Betting",
      questions: [
        {
          question: "What sports can I bet on?",
          answer: "Currently, we support major sports including football (soccer), basketball, American football, tennis, and more. We're constantly adding new sports and leagues based on user demand."
        },
        {
          question: "How do payouts work?",
          answer: "All payouts are automatic and handled by smart contracts. When a match is resolved, winning bets are automatically distributed to the winners' wallets. There's no need to manually claim winnings in most cases."
        },
        {
          question: "What are the betting limits?",
          answer: "Minimum bet amount is 0.001 ETH. There's no maximum limit, but very large bets may be subject to additional verification for security purposes."
        },
        {
          question: "Can I cancel a bet after placing it?",
          answer: "No, once a bet is placed and confirmed on the blockchain, it cannot be canceled. This is by design to ensure the integrity of the betting system. Please double-check your bets before confirming."
        }
      ]
    },
    {
      category: "Technical",
      questions: [
        {
          question: "Which wallets are supported?",
          answer: "We support MetaMask, WalletConnect, Coinbase Wallet, and most other Ethereum-compatible wallets. MetaMask is recommended for the best experience."
        },
        {
          question: "What blockchain network do you use?",
          answer: "BetZilla runs on the Ethereum mainnet. For development and testing, we also support local Hardhat networks. We're exploring Layer 2 solutions for lower fees in the future."
        },
        {
          question: "Are smart contracts audited?",
          answer: "Yes, all our smart contracts undergo rigorous security audits by leading blockchain security firms. The audit reports are publicly available on our GitHub repository."
        },
        {
          question: "What happens if there's a technical issue?",
          answer: "Our smart contracts are designed to handle edge cases and technical issues. In rare cases where manual intervention is needed, we have emergency protocols in place to protect user funds and resolve disputes fairly."
        }
      ]
    },
    {
      category: "Security & Safety",
      questions: [
        {
          question: "How secure is BetZilla?",
          answer: "BetZilla is built with security as the top priority. We use audited smart contracts, follow best practices for blockchain development, and implement multiple layers of security to protect user funds and data."
        },
        {
          question: "Do you store my private keys?",
          answer: "No, we never store or have access to your private keys. Your wallet remains under your complete control at all times. We only interact with your wallet when you explicitly approve transactions."
        },
        {
          question: "What if I lose access to my wallet?",
          answer: "Since we don't control your wallet, we cannot recover lost access. Always keep your seed phrase safe and consider using hardware wallets for large amounts. We recommend backing up your wallet recovery phrase in multiple secure locations."
        },
        {
          question: "Is BetZilla regulated?",
          answer: "BetZilla operates as a decentralized protocol. Users are responsible for complying with their local laws and regulations regarding online betting. We recommend checking your local laws before using our platform."
        }
      ]
    },
    {
      category: "Fees & Payments",
      questions: [
        {
          question: "What fees does BetZilla charge?",
          answer: "BetZilla charges a small platform fee (typically 2-5%) on winning bets. Additionally, you'll pay standard Ethereum gas fees for blockchain transactions. All fees are clearly displayed before you confirm any transaction."
        },
        {
          question: "How long do withdrawals take?",
          answer: "Since all transactions happen on the blockchain, 'withdrawals' are instant once the transaction is confirmed. Winning payouts are automatically sent to your wallet when matches are resolved."
        },
        {
          question: "Can I see all transaction history?",
          answer: "Yes! All transactions are recorded on the blockchain and are publicly viewable. You can also view your complete betting history in your profile dashboard."
        },
        {
          question: "What about gas fees?",
          answer: "Gas fees are paid to the Ethereum network, not to BetZilla. These fees vary based on network congestion. We're working on Layer 2 solutions to reduce these costs for our users."
        }
      ]
    },
    {
      category: "Account & Support",
      questions: [
        {
          question: "How do I contact support?",
          answer: "You can reach our support team through Discord, Telegram, or email. We also have a comprehensive help center and community forums where you can find answers to common questions."
        },
        {
          question: "Can I have multiple accounts?",
          answer: "Each wallet address can have one associated account. However, you can connect multiple wallets to different accounts if needed. This helps us maintain fair play and prevent abuse."
        },
        {
          question: "How do I delete my account?",
          answer: "You can deactivate your account from your profile settings. However, since betting history is stored on the blockchain, it cannot be completely deleted. Your personal information can be removed from our systems upon request."
        },
        {
          question: "Do you have a mobile app?",
          answer: "Currently, BetZilla is available as a web application that works great on mobile browsers. We're developing native mobile apps for iOS and Android, which will be available soon."
        }
      ]
    }
  ];

  return (
    <div className="faq-page">
      {/* Hero Section */}
      <section className="faq-hero">
        <div className="container">
          <div className="hero-content">
            <h1>❓ Frequently Asked Questions</h1>
            <p>Find answers to common questions about BetZilla</p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="faq-content">
        <div className="container">
          <div className="faq-intro">
            <h2>🔍 Quick Answers</h2>
            <p>
              Can't find what you're looking for? Check out our comprehensive FAQ below or 
              reach out to our support team on Discord.
            </p>
          </div>

          <div className="faq-categories">
            {faqData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="faq-category">
                <div className="category-header">
                  <h3>📂 {category.category}</h3>
                </div>
                
                <div className="faq-items">
                  {category.questions.map((item, itemIndex) => {
                    const globalIndex = `${categoryIndex}-${itemIndex}`;
                    const isOpen = openItems[globalIndex];
                    
                    return (
                      <div key={itemIndex} className={`faq-item ${isOpen ? 'open' : ''}`}>
                        <button 
                          className="faq-question"
                          onClick={() => toggleItem(globalIndex)}
                        >
                          <span className="question-text">{item.question}</span>
                          <span className="question-icon">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        
                        <div className="faq-answer">
                          <div className="answer-content">
                            <p>{item.answer}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="faq-contact">
            <div className="contact-card">
              <h3>🤝 Still Need Help?</h3>
              <p>
                Our community and support team are here to help you with any questions 
                not covered in this FAQ.
              </p>
              
              <div className="contact-options">
                <div className="contact-option">
                  <div className="contact-icon">💬</div>
                  <div className="contact-info">
                    <h4>Discord Community</h4>
                    <p>Join our active community for real-time help</p>
                  </div>
                  <button className="contact-btn">Join Discord</button>
                </div>
                
                <div className="contact-option">
                  <div className="contact-icon">📧</div>
                  <div className="contact-info">
                    <h4>Email Support</h4>
                    <p>Send us an email for detailed assistance</p>
                  </div>
                  <button className="contact-btn">Send Email</button>
                </div>
                
                <div className="contact-option">
                  <div className="contact-icon">📖</div>
                  <div className="contact-info">
                    <h4>Documentation</h4>
                    <p>Comprehensive guides and tutorials</p>
                  </div>
                  <button className="contact-btn">View Docs</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="quick-tips">
            <h3>💡 Quick Tips</h3>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">🦊</div>
                <h4>Setup MetaMask</h4>
                <p>Make sure you're connected to the correct network before placing bets</p>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">⛽</div>
                <h4>Gas Fees</h4>
                <p>Check gas prices before transactions to avoid high fees during network congestion</p>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">🔐</div>
                <h4>Stay Safe</h4>
                <p>Never share your private keys or seed phrase with anyone, including our team</p>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">📊</div>
                <h4>Track Performance</h4>
                <p>Use your profile dashboard to monitor your betting statistics and performance</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
