import React, { useState } from 'react';

const BettingDiagnostic = ({ 
  account, 
  contract, 
  loading, 
  matches,
  betAmount 
}) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const runContractDiagnostics = async () => {
    if (!contract || !account) {
      alert('Contract or account not available');
      return;
    }

    setDiagLoading(true);
    const results = {};
    
    try {
      // Check market count
      const marketCount = await contract.marketCount();
      results.marketCount = Number(marketCount);
      
      // Check user markets
      const userMarkets = await contract.getUserMarkets(account);
      results.userMarkets = userMarkets.map(id => Number(id));
      
      // Check first few markets
      const marketDetails = [];
      for (let i = 1; i <= Math.min(5, results.marketCount); i++) {
        try {
          const market = await contract.getMarket(i);
          const userBet = await contract.getUserBet(i, account);
          
          marketDetails.push({
            id: i,
            description: market[0],
            totalAmount: market[1].toString(),
            isClosed: market[3],
            isResolved: market[4],
            userBetAmount: userBet[1].toString(),
            userBetOutcome: Number(userBet[0])
          });
        } catch (error) {
          marketDetails.push({
            id: i,
            error: error.message
          });
        }
      }
      results.marketDetails = marketDetails;
      
      // Check contract address
      results.contractAddress = await contract.getAddress();
      results.accountAddress = account;
      
    } catch (error) {
      results.error = error.message;
    }
    
    setDiagnostics(results);
    setDiagLoading(false);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.9)', 
      color: 'white', 
      padding: '15px',
      borderRadius: '10px',
      fontSize: '12px',
      zIndex: 1000,
      maxWidth: '350px',
      maxHeight: '80vh',
      overflow: 'auto'
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
      
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={runContractDiagnostics} 
          disabled={diagLoading || !contract}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {diagLoading ? 'Running...' : 'Check Contract'}
        </button>
      </div>
      
      {diagnostics && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px' }}>
            <div><strong>Markets:</strong> {diagnostics.marketCount}</div>
            <div><strong>User Markets:</strong> [{diagnostics.userMarkets.join(', ')}]</div>
            <div><strong>Contract:</strong> {diagnostics.contractAddress?.slice(0,10)}...</div>
            {diagnostics.error && <div style={{color: 'red'}}><strong>Error:</strong> {diagnostics.error}</div>}
          </div>
        </div>
      )}
      
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
