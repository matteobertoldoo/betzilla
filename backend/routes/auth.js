const express = require('express');
const authService = require('../services/authService');
const { 
  validateRequiredFields, 
  validateEmail, 
  sanitizeInput, 
  authenticateToken,
  rateLimit 
} = require('../middleware/auth');
const { ethers } = require('ethers');

const router = express.Router();

// Register endpoint
router.post('/register', [
  rateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  sanitizeInput,
  validateRequiredFields(['username', 'email', 'password']),
  validateEmail
], async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const result = await authService.register(username, email, password);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Username') || 
        error.message.includes('Password') || 
        error.message.includes('email')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Login endpoint
router.post('/login', [
  rateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  sanitizeInput,
  validateRequiredFields(['email', 'password']),
  validateEmail
], async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    
    // For security, always return the same error message for login failures
    res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
});

// Token validation endpoint
router.get('/validate', authenticateToken, async (req, res) => {
  try {
    // If middleware passes, token is valid
    res.json({
      success: true,
      message: 'Token is valid',
      user: req.user
    });
  } catch (error) {
    console.error('Token validation error:', error.message);
    res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await authService.logout(req.token);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Update wallet address endpoint
router.put('/wallet', [
  authenticateToken,
  sanitizeInput,
  validateRequiredFields(['walletAddress'])
], async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    // Basic wallet address validation (Ethereum address format)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    await authService.updateWalletAddress(req.user.id, walletAddress);
    
    res.json({
      success: true,
      message: 'Wallet address updated successfully'
    });
  } catch (error) {
    console.error('Wallet update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet address'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Change password endpoint
router.put('/password', [
  authenticateToken,
  sanitizeInput,
  validateRequiredFields(['currentPassword', 'newPassword'])
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // This would require adding a changePassword method to AuthService
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Password change functionality not implemented yet'
    });
  } catch (error) {
    console.error('Password change error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// --- Wallet-based login endpoints ---

// 1. Request nonce for wallet address
router.post('/wallet-nonce', [
  sanitizeInput, 
  validateRequiredFields(['walletAddress'])
], async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    // Generate a random nonce and store it
    const nonce = 'Sign this message to login to BetZilla: ' + Math.floor(Math.random() * 1e16);
    await authService.setWalletNonce(walletAddress, nonce);
    
    res.json({ success: true, nonce });
  } catch (error) {
    console.error('Nonce generation error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate nonce' });
  }
});

// 2. Verify signature and login/register
router.post('/wallet-login', [
  sanitizeInput, 
  validateRequiredFields(['walletAddress', 'signature'])
], async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    // Get nonce from storage
    const nonce = await authService.getWalletNonce(walletAddress);
    if (!nonce) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nonce expired or not found. Please try again.' 
      });
    }
    
    // Verify signature
    const recovered = ethers.verifyMessage(nonce, signature);
    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Signature verification failed' 
      });
    }
    
    // Login or register user
    const result = await authService.loginWithWallet(walletAddress);
    
    res.json({ 
      success: true, 
      user: result.user, 
      token: result.token, 
      message: 'Wallet login successful' 
    });
  } catch (error) {
    console.error('Wallet login error:', error.message);
    // Add error.message to response for easier debugging
    res.status(401).json({ 
      success: false, 
      message: error.message || 'Wallet login failed' 
    });
  }
});

module.exports = router;
