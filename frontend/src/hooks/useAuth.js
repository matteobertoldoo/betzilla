import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('betzilla_token');
    if (token) {
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        localStorage.removeItem('betzilla_token');
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('betzilla_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('betzilla_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.message || 'Login failed');
        return { success: false, message: data.message };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, username) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('betzilla_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.message || 'Registration failed');
        return { success: false, message: data.message };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('betzilla_token');
    setUser(null);
    setError(null);
  };

  const loginWithWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!window.ethereum) {
        return { success: false, message: 'MetaMask not installed' };
      }

      // Step 1: Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        return { success: false, message: 'No accounts found' };
      }

      const walletAddress = accounts[0];
      
      // Step 2: Get nonce from backend
      const nonceResponse = await fetch('http://localhost:4000/api/auth/wallet-nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const nonceData = await nonceResponse.json();
      
      if (!nonceResponse.ok) {
        return { success: false, message: nonceData.message || 'Failed to get nonce' };
      }

      // Step 3: Sign the nonce with MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceData.nonce, walletAddress],
      });

      // Step 4: Send signature to backend for verification and login
      const response = await fetch('http://localhost:4000/api/auth/wallet-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, signature }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('betzilla_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.message || 'Wallet login failed');
        return { success: false, message: data.message };
      }
    } catch (error) {
      let errorMessage = 'MetaMask connection failed';
      
      // Handle specific MetaMask errors
      if (error.code === 4001) {
        errorMessage = 'User rejected the request';
      } else if (error.code === -32002) {
        errorMessage = 'MetaMask is already processing a request';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    loginWithWallet,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
