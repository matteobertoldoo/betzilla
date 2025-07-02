import React from 'react';

const BettingDiagnostic = ({ 
  account, 
  contract, 
  loading, 
  matches,
  betAmount 
}) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '15px',
      borderRadius: '10px',
      fontSize: '12px',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <h4>🔍 Betting Diagnostic</h4>
      <div>
        <strong>Account:</strong> {account ? `✅ ${account.slice(0,10)}...` : '❌ Not connected'}
      </div>
      <div>
        <strong>Contract:</strong> {contract ? '✅ Connected' : '❌ Not connected'}
      </div>
      <div>
        <strong>Loading:</strong> {loading ? '⏳ Yes' : '✅ No'}
      </div>
      <div>
        <strong>Matches:</strong> {matches.length > 0 ? `✅ ${matches.length} loaded` : '❌ No matches'}
      </div>
      <div>
        <strong>Bet Amount:</strong> {betAmount && betAmount > 0 ? `✅ ${betAmount} ETH` : '❌ Invalid/empty'}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '11px' }}>
        <strong>Button Disabled If:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
          <li>{loading ? '❌' : '✅'} Loading</li>
          <li>{!betAmount ? '❌' : '✅'} No bet amount</li>
          <li>{betAmount <= 0 ? '❌' : '✅'} Invalid amount</li>
        </ul>
      </div>
    </div>
  );
};

export default BettingDiagnostic;
