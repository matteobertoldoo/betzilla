import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BetZillaArtifact from '../abi/BetZilla.json';
const BetZillaABI = BetZillaArtifact.abi;

// Contract address from latest deployment
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const useBetzilla = () => {
  const [contract, setContract] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if wallet is already connected
  const checkWalletConnection = async () => {
    try {
      if (!window.ethereum) {
        return false;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setAccount(accounts[0]);
        setSigner(signer);

        // Create contract instance
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          BetZillaABI,
          signer
        );
        setContract(contractInstance);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error checking wallet connection:', err);
      return false;
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      setAccount(accounts[0]);
      setSigner(signer);

      // Create contract instance
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        BetZillaABI,
        signer
      );
      setContract(contractInstance);

      return accounts[0];
    } catch (err) {
      console.error('Error connecting wallet:', err);
      
      // Handle specific error cases
      let errorMessage = 'Failed to connect wallet';
      
      if (err.code === 4001) {
        errorMessage = 'User rejected the connection request';
      } else if (err.code === -32002) {
        errorMessage = 'MetaMask is already processing a connection request';
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize wallet connection on app start
  useEffect(() => {
    const initializeWallet = async () => {
      if (!isInitialized) {
        await checkWalletConnection();
        setIsInitialized(true);
      }
    };

    initializeWallet();
  }, [isInitialized]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Recreate contract instance with new signer
          const provider = new ethers.BrowserProvider(window.ethereum);
          provider.getSigner().then(signer => {
            setSigner(signer);
            const contractInstance = new ethers.Contract(
              CONTRACT_ADDRESS,
              BetZillaABI,
              signer
            );
            setContract(contractInstance);
          });
        } else {
          setAccount(null);
          setContract(null);
          setSigner(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Place a bet
  const placeBet = async (marketId, outcome, amount) => {
    if (!contract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🎯 Placing bet: Market ${marketId}, Outcome ${outcome}, Amount ${amount} ETH`);

      const tx = await contract.placeBet(marketId, outcome, {
        value: ethers.parseEther(amount.toString())
      });

      console.log(`📝 Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Bet placed successfully! Block: ${receipt.blockNumber}`);
      
      return receipt;
    } catch (err) {
      console.error('❌ Error placing bet:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Place a bet without affecting global loading state
  const placeBetWithoutGlobalLoading = async (marketId, outcome, amount) => {
    if (!contract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      setError(null);

      console.log(`🎯 Placing bet: Market ${marketId}, Outcome ${outcome}, Amount ${amount} ETH`);

      const tx = await contract.placeBet(marketId, outcome, {
        value: ethers.parseEther(amount.toString())
      });

      console.log(`📝 Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Bet placed successfully! Block: ${receipt.blockNumber}`);
      
      return receipt;
    } catch (err) {
      console.error('❌ Error placing bet:', err);
      setError(err.message);
      throw err;
    }
  };

  // Get market info
  const getMarket = async (marketId) => {
    if (!contract) {
      throw new Error('Contract not connected');
    }

    try {
      const market = await contract.markets(marketId);
      return market;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Get user bet
  const getUserBet = async (marketId) => {
    if (!contract || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const bet = await contract.bets(marketId, account);
      return bet;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Get all user bets (using getUserMarkets and Promise.all)
  const getAllUserBets = async () => {
    if (!contract || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🔍 Fetching user bets for account:', account);

      // Check if contract is properly connected first
      if (!contract.target) {
        throw new Error('Contract not properly initialized');
      }

      let userMarketIds;
      try {
        userMarketIds = await contract.getUserMarkets(account);
        console.log('📋 User has bets on markets:', userMarketIds.map(id => Number(id)));
      } catch (getUserMarketsError) {
        console.log('⚠️ Could not fetch user markets from blockchain:', getUserMarketsError.message);
        // If getUserMarkets fails, return empty array instead of throwing
        return [];
      }

      // If no markets, return empty array
      if (!userMarketIds || userMarketIds.length === 0) {
        return [];
      }

      const userBets = [];
      
      for (const id of userMarketIds) {
        try {
          const numericId = Number(id);
          const [outcome, amount, claimed, refunded, placedAt] = await contract.getUserBet(numericId, account);
          const market = await contract.getMarket(numericId);

          userBets.push({
            marketId: numericId,
            bet: {
              outcome,
              amount,
              claimed,
              refunded,
              placedAt,
            },
            market: {
              description: market[0],
              totalAmount: market[1],
              outcomeAmounts: market[2],
              isClosed: market[3],
              isResolved: market[4],
              winningOutcome: market[5],
              startTime: market[6],
              finalOdds: market[7],
            },
          });
        } catch (error) {
          console.log(`⚠️ Could not fetch bet data for market ${id}:`, error.message);
          // Skip this bet and continue with others
        }
      }

      // Simplified filtering - just check if amount > 0
      const filteredBets = userBets.filter(bet => {
        const amount = bet.bet.amount;
        return amount && Number(amount) > 0;
      });
      
      return filteredBets;
    } catch (err) {
      console.error('💥 Error in getAllUserBets:', err);
      // Don't set error state for empty results
      if (!err.message.includes('No markets found')) {
        setError(err.message);
      }
      // Return empty array instead of throwing for better UX
      return [];
    }
  };

  // Claim winnings
  const claimWinnings = async (marketId) => {
    if (!contract || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.claimWinnings(marketId);
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get match details from backend
  const getMatchDetails = async (marketId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/matches/${marketId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching match details:', error);
      return null;
    }
  };

  // Get all matches
  const getAllMatches = async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.upcoming) queryParams.append('upcoming', 'true');
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.sport) queryParams.append('sport', filters.sport);
      if (filters.limit) queryParams.append('limit', filters.limit);
      
      const response = await fetch(`http://localhost:4000/api/matches?${queryParams}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  };

  // Get estimated odds for a market
  const getEstimatedOdds = async (marketId) => {
    if (!contract) {
      return null;
    }

    try {
      const odds = await contract.getEstimatedOdds(marketId);
      return odds;
    } catch (error) {
      console.error('Error fetching estimated odds:', error);
      return null;
    }
  };

  // Get current fee for a market
  const getCurrentFee = async (marketId) => {
    if (!contract) {
      return 3; // Default fee percentage
    }

    try {
      // Check if the function exists before calling it
      if (typeof contract.getCurrentFee === 'function') {
        const fee = await contract.getCurrentFee(marketId);
        return Number(fee);
      } else {
        console.log('getCurrentFee function not available, using default fee');
        return 3; // Default 3% fee
      }
    } catch (error) {
      console.log('Error fetching current fee, using default:', error.message);
      return 3; // Default fee percentage
    }
  };

  // Get market details including outcome amounts for parimutuel calculation
  const getMarketDetails = async (marketId) => {
    if (!contract) {
      throw new Error('Contract not connected');
    }

    try {
      const market = await contract.getMarket(marketId);
      return {
        description: market[0],
        totalAmount: market[1],
        outcomeAmounts: market[2], // This is what we need for parimutuel odds
        isClosed: market[3],
        isResolved: market[4],
        winningOutcome: market[5],
        startTime: market[6],
        finalOdds: market[7]
      };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    contract,
    signer,
    account,
    loading,
    error,
    connectWallet,
    placeBet,
    placeBetWithoutGlobalLoading,
    getMarket,
    getUserBet,
    getAllUserBets,
    claimWinnings,
    getMatchDetails,
    getAllMatches,
    getEstimatedOdds,
    getCurrentFee,
    getMarketDetails,
  };
};