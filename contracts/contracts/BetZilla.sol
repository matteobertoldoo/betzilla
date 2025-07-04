// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BetZilla - Decentralized Sports Betting Platform
 * @dev Parimutuel betting system with individual dynamic fees based on bet timing
 * @notice Users pay 2% fee for early bets (>24h) or 3% fee for late bets (<24h)
 * @author Matteo
 */
contract BetZilla {
    // Possible outcomes for any betting market
    enum Outcome { 
        None,    // 0 - default/invalid value
        Home,    // 1 - home team wins
        Draw,    // 2 - tie/draw result  
        Away     // 3 - away team wins
    }

    /**
     * @dev Market represents a single betting event (e.g., a football match)
     * @notice Contains all information about a betting market including pools and outcomes
     */
    struct Market {
        string description;              // Match description (e.g., "Real Madrid vs Barcelona")
        uint256 totalAmount;             // Total ETH bet on this market
        uint256[3] outcomeAmounts;       // ETH bet on each outcome [home, draw, away]
        bool isClosed;                   // True when betting is closed
        bool isResolved;                 // True when winner is determined
        bool isCancelled;                // True if market was cancelled
        Outcome winningOutcome;          // The actual result (set by owner)
        uint256 startTime;               // When the match starts (timestamp)
        uint256[3] finalOdds;            // Final payout odds (x100 multiplier)
    }

    /**
     * @dev Individual bet placed by a user
     * @notice placedAt is crucial for determining individual fee percentage
     */
    struct Bet {
        Outcome outcome;                 // Which outcome user bet on
        uint256 amount;                  // How much ETH was bet
        bool claimed;                    // True if winnings were claimed
        bool refunded;                   // True if bet was refunded
        uint256 placedAt;                // When bet was placed (timestamp) - KEY FOR FEE CALCULATION
    }

    // === STATE VARIABLES ===
    address public owner;                // Contract owner (admin)
    uint256 public marketCount;          // Total number of markets created
    uint256 public accumulatedFees;      // Platform fees collected from individual winnings
    
    // === CONSTANTS ===
    uint256 public constant EARLY_FEE_PERCENT = 2;     // 2% fee for bets placed >24h before match
    uint256 public constant LATE_FEE_PERCENT = 3;      // 3% fee for bets placed <24h before match
    uint256 public constant MIN_ODDS = 101;            // Minimum 1.01x odds to prevent losses
    uint256 public constant MIN_POOL_SIZE = 0.002 ether;   // Minimum total bets to close market
    uint256 public constant MIN_BET_AMOUNT = 0.001 ether; // Minimum individual bet size

    // === MAPPINGS ===
    mapping(uint256 => Market) public markets;                    // marketId => Market data
    mapping(uint256 => mapping(address => Bet)) public bets;     // marketId => user => Bet data
    mapping(address => uint256[]) public userMarketIds;          // user => list of markets they bet on

    // === EVENTS ===
    event MarketCreated(uint256 marketId, string description, uint256 startTime);
    event BetPlaced(uint256 marketId, address indexed user, Outcome outcome, uint256 amount);
    event BettingClosed(uint256 marketId, uint256[3] finalOdds);
    event MarketResolved(uint256 marketId, Outcome winningOutcome);
    event MarketCancelled(uint256 marketId);
    event WinningsClaimed(uint256 marketId, address user, uint256 netPayout, uint256 feeAmount);
    event RefundClaimed(uint256 marketId, address user, uint256 amount);
    event MarketAutoRefunded(uint256 marketId, string reason);

    // === MODIFIERS ===
    /**
     * @dev Restrict function access to contract owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "BetZilla: Only contract owner can perform this action");
        _;
    }

    /**
     * @dev Ensure the market ID exists and is valid
     */
    modifier marketExists(uint256 marketId) {
        require(marketId > 0 && marketId <= marketCount, "BetZilla: Market does not exist");
        _;
    }

    // === CONSTRUCTOR ===
    constructor() {
        owner = msg.sender;
    }

    // === OWNER FUNCTIONS ===

    /**
     * @dev Create a new betting market
     * @param description Human-readable description of the match
     * @param startTime Unix timestamp when the match begins
     * @notice Only owner can create markets
     */
    function createMarket(string memory description, uint256 startTime) external onlyOwner {
        require(startTime > block.timestamp, "BetZilla: Match start time must be in the future");
        require(bytes(description).length > 0, "BetZilla: Market description cannot be empty");

        marketCount++;
        markets[marketCount] = Market({
            description: description,
            totalAmount: 0,
            outcomeAmounts: [uint256(0), 0, 0],
            isClosed: false,
            isResolved: false,
            isCancelled: false,
            winningOutcome: Outcome.None,
            startTime: startTime,
            finalOdds: [uint256(0), 0, 0]
        });

        emit MarketCreated(marketCount, description, startTime);
    }

    /**
     * @dev Close betting for a market and calculate final parimutuel odds
     * @param marketId The market to close
     * @notice NO fees are deducted here - fees calculated individually when users claim
     * @notice Market auto-cancels if insufficient betting activity
     */
    function closeBetting(uint256 marketId) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        require(block.timestamp >= market.startTime, "BetZilla: Cannot close betting before match starts");
        require(!market.isClosed, "BetZilla: Betting already closed for this market");
        require(!market.isCancelled, "BetZilla: Cannot close betting on cancelled market");

        // Check if market has enough betting activity to be valid
        (bool isValid, string memory reason) = _hasValidBettingActivity(market);
        
        if (!isValid) {
            // Auto-cancel markets with insufficient activity - users can claim refunds
            market.isCancelled = true;
            market.isClosed = true;
            emit MarketAutoRefunded(marketId, reason);
            emit MarketCancelled(marketId);
            return;
        }

        market.isClosed = true;

        // Calculate parimutuel odds WITHOUT deducting any fees
        // Individual fees will be calculated and deducted when each user claims their winnings
        for (uint8 i = 0; i < 3; i++) {
            if (market.outcomeAmounts[i] > 0) {
                // Basic parimutuel formula: (total pool / amount on outcome) * 100
                uint256 calculatedOdds = (market.totalAmount * 100) / market.outcomeAmounts[i];
                
                // Ensure minimum odds to prevent guaranteed losses
                market.finalOdds[i] = calculatedOdds >= MIN_ODDS ? calculatedOdds : MIN_ODDS;
            } else {
                market.finalOdds[i] = 0; // No odds if no bets on this outcome
            }
        }

        emit BettingClosed(marketId, market.finalOdds);
    }

    /**
     * @dev Set the winning outcome for a resolved match
     * @param marketId The market to resolve
     * @param outcome The winning outcome (Home, Draw, or Away)
     * @notice TEMPORARY: Currently manual result setting by owner for testing with mock data
     * @notice FUTURE: Will be replaced with external oracle integration for automated result fetching
     * @notice Since there are no live matches available, we use mock data and manual result setting
     * @notice Once integrated with live sports data oracles, this will become fully decentralized
     */
    function setResult(uint256 marketId, Outcome outcome) external onlyOwner marketExists(marketId) {
        require(outcome >= Outcome.Home && outcome <= Outcome.Away, "BetZilla: Invalid match result - must be Home, Draw, or Away");
        Market storage market = markets[marketId];
        require(market.isClosed, "BetZilla: Cannot set result while betting is still open");
        require(!market.isResolved, "BetZilla: Market result already set");
        require(!market.isCancelled, "BetZilla: Cannot set result for cancelled market");

        // TODO: Replace manual setting with oracle-based result fetching
        // This manual approach is temporary due to lack of live match data
        market.winningOutcome = outcome;
        market.isResolved = true;

        emit MarketResolved(marketId, outcome);
    }

    /**
     * @dev Cancel a market (allows refunds for all bets)
     * @param marketId The market to cancel
     */
    function cancelMarket(uint256 marketId) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        require(!market.isResolved, "BetZilla: Cannot cancel market that already has a result");
        
        market.isCancelled = true;
        market.isClosed = true;

        emit MarketCancelled(marketId);
    }

    /**
     * @dev Withdraw accumulated platform fees
     * @notice Only fees collected from winnings are withdrawn, not user bet funds
     */
    function withdrawFees() external onlyOwner {
        require(accumulatedFees > 0, "BetZilla: No platform fees available for withdrawal");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "BetZilla: Fee withdrawal transfer failed");
    }

    /**
     * @dev Emergency withdrawal function for stuck funds
     * @notice Can only withdraw funds beyond accumulated fees
     */
    function emergencyWithdraw() external onlyOwner {
        require(address(this).balance > accumulatedFees, "BetZilla: Only accumulated fees are available");
        
        uint256 emergencyAmount = address(this).balance - accumulatedFees;
        
        (bool success, ) = payable(owner).call{value: emergencyAmount}("");
        require(success, "BetZilla: Emergency withdrawal failed");
    }

    // === USER FUNCTIONS ===

    /**
     * @dev Place a bet on a specific outcome
     * @param marketId The market to bet on
     * @param outcome Which outcome to bet on (Home=1, Draw=2, Away=3)
     * @notice Bet timing (placedAt) determines fee percentage when claiming winnings
     * @notice Only one bet per user per market allowed
     */
    function placeBet(uint256 marketId, Outcome outcome) external payable marketExists(marketId) {
        Market storage market = markets[marketId];
        require(!market.isClosed, "BetZilla: Betting is closed for this market");
        require(!market.isCancelled, "BetZilla: Cannot bet on cancelled market");
        require(block.timestamp < market.startTime - 1 minutes, "BetZilla: Too close to match start - betting closed");
        require(outcome >= Outcome.Home && outcome <= Outcome.Away, "BetZilla: Invalid bet outcome - must be Home, Draw, or Away");
        require(msg.value >= MIN_BET_AMOUNT, "BetZilla: Bet amount too low - minimum 0.001 ETH required");

        // Add bet amount to market totals
        market.totalAmount += msg.value;
        market.outcomeAmounts[uint8(outcome) - 1] += msg.value;

        // Check if this is user's first bet on this market
        bool isFirstBet = bets[marketId][msg.sender].amount == 0;
        
        if (isFirstBet) {
            // Create new bet record with current timestamp for fee calculation
            bets[marketId][msg.sender] = Bet({
                outcome: outcome,
                amount: msg.value,
                claimed: false,
                refunded: false,
                placedAt: block.timestamp  // CRITICAL: Save bet timing for individual fee calculation
            });
            
            // Track which markets this user has bet on
            userMarketIds[msg.sender].push(marketId);
        } else {
            // Prevent multiple bets on same market (simplification)
            revert("BetZilla: You can only place one bet per market");
        }

        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    /**
     * @dev Claim winnings for a resolved market with individual fee calculation
     * @param marketId The market to claim from
     * @notice Fee percentage depends on WHEN the bet was placed relative to match start
     * @notice Early bets (>24h before match) pay 2% fee, late bets (<24h) pay 3% fee
     */
    function claimWinnings(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        require(market.isResolved, "BetZilla: Match result not yet available");
        require(!bet.claimed, "BetZilla: Winnings already claimed for this market");
        require(bet.outcome == market.winningOutcome, "BetZilla: Your bet did not win this market");
        require(bet.amount > 0, "BetZilla: No bet found for this market");

        // Calculate gross payout using final parimutuel odds
        uint256 odds = market.finalOdds[uint8(bet.outcome) - 1];
        require(odds > 0, "BetZilla: Invalid odds calculation");
        
        uint256 grossPayout = (bet.amount * odds) / 100;

        // Calculate INDIVIDUAL fee based on WHEN this specific bet was placed
        // Protection against underflow if placedAt > startTime (edge case)
        uint256 timeBeforeMatch = market.startTime > bet.placedAt 
            ? market.startTime - bet.placedAt 
            : 0;
        
        // Determine fee percentage: 2% for early bets (>24h), 3% for late bets (<24h)
        uint256 feePercent = timeBeforeMatch > 24 hours ? EARLY_FEE_PERCENT : LATE_FEE_PERCENT;
        
        // Calculate individual fee amount and net payout
        uint256 feeAmount = (grossPayout * feePercent) / 100;
        uint256 netPayout = grossPayout - feeAmount;

        // Safety checks before transfer
        require(address(this).balance >= netPayout, "BetZilla: Insufficient contract balance for payout");
        require(netPayout > 0, "BetZilla: Net payout calculation error");

        // Update state
        bet.claimed = true;
        accumulatedFees += feeAmount; // Add this user's fee to platform fees

        // Transfer net winnings to user (after deducting individual fee)
        (bool success, ) = payable(msg.sender).call{value: netPayout}("");
        require(success, "BetZilla: Winnings transfer failed");

        emit WinningsClaimed(marketId, msg.sender, netPayout, feeAmount);
    }

    /**
     * @dev Claim refund for a cancelled market
     * @param marketId The cancelled market
     * @notice Full original bet amount is refunded (no fees on refunds)
     */
    function claimRefund(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        require(market.isCancelled, "BetZilla: Market was not cancelled - no refund available");
        require(!bet.refunded, "BetZilla: Refund already claimed for this market");
        require(bet.amount > 0, "BetZilla: No bet found to refund for this market");

        uint256 refundAmount = bet.amount;
        bet.refunded = true;

        // Return full original bet amount (no fees on refunds)
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "BetZilla: Refund transfer failed");

        emit RefundClaimed(marketId, msg.sender, refundAmount);
    }

    // === VIEW FUNCTIONS ===

    /**
     * @dev Get fee percentage that would apply to a bet placed right now
     * @param marketId The market to check
     * @return Current fee percentage (2% early, 3% late)
     */
    function getCurrentFee(uint256 marketId) external view marketExists(marketId) returns (uint256) {
        Market storage market = markets[marketId];
        uint256 timeUntilMatch = market.startTime > block.timestamp 
            ? market.startTime - block.timestamp 
            : 0;
        return timeUntilMatch > 24 hours ? EARLY_FEE_PERCENT : LATE_FEE_PERCENT;
    }

    /**
     * @dev Get the specific fee percentage for a user's existing bet
     * @param marketId The market to check
     * @param user The user's address
     * @return Fee percentage for this user's bet (2% or 3%)
     */
    function getUserFee(uint256 marketId, address user) external view marketExists(marketId) returns (uint256) {
        Bet storage bet = bets[marketId][user];
        if (bet.amount == 0) return 0; // No bet placed
        
        Market storage market = markets[marketId];
        uint256 timeBeforeMatch = market.startTime > bet.placedAt 
            ? market.startTime - bet.placedAt 
            : 0; // Protection against underflow
        return timeBeforeMatch > 24 hours ? EARLY_FEE_PERCENT : LATE_FEE_PERCENT;
    }

    /**
     * @dev Preview potential winnings with detailed fee breakdown
     * @param marketId The market to check
     * @param user The user's address
     * @return grossPayout Total payout before fees
     * @return feeAmount Fee amount to be deducted
     * @return netPayout Final amount user receives
     * @return feePercent Fee percentage applied (2% or 3%)
     */
    function previewWinnings(uint256 marketId, address user) external view marketExists(marketId) returns (
        uint256 grossPayout,
        uint256 feeAmount,
        uint256 netPayout,
        uint256 feePercent
    ) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][user];
        
        // Return zeros if user hasn't bet, market isn't resolved, or user didn't win
        if (bet.amount == 0 || !market.isResolved || bet.outcome != market.winningOutcome) {
            return (0, 0, 0, 0);
        }

        // Calculate gross payout
        uint256 odds = market.finalOdds[uint8(bet.outcome) - 1];
        grossPayout = (bet.amount * odds) / 100;
        
        // Calculate individual fee percentage
        uint256 timeBeforeMatch = market.startTime > bet.placedAt 
            ? market.startTime - bet.placedAt 
            : 0; // Protection against underflow
        feePercent = timeBeforeMatch > 24 hours ? EARLY_FEE_PERCENT : LATE_FEE_PERCENT;
        
        // Calculate fee amount and net payout
        feeAmount = (grossPayout * feePercent) / 100;
        netPayout = grossPayout - feeAmount;
        
        return (grossPayout, feeAmount, netPayout, feePercent);
    }

    /**
     * @dev Get comprehensive market status and validation info
     * @param marketId The market to check
     * @return isActive Whether betting is currently open
     * @return hasValidActivity Whether market meets minimum requirements for closure
     * @return statusMessage Human-readable status description
     * @return totalPool Total ETH bet on this market
     * @return activeOutcomes Number of outcomes with bets
     */
    function getMarketStatus(uint256 marketId) external view marketExists(marketId) returns (
        bool isActive,
        bool hasValidActivity,
        string memory statusMessage,
        uint256 totalPool,
        uint8 activeOutcomes
    ) {
        Market storage market = markets[marketId];
        
        // Market is active if open, not cancelled, and match hasn't started
        isActive = !market.isClosed && !market.isCancelled && block.timestamp < market.startTime;
        
        // Count how many outcomes have received bets
        uint8 outcomesWithBets = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (market.outcomeAmounts[i] > 0) {
                outcomesWithBets++;
            }
        }
        
        // Determine if market meets minimum requirements for closure
        if (market.totalAmount < MIN_POOL_SIZE) {
            hasValidActivity = false;
            statusMessage = "Needs more betting volume";
        } else if (outcomesWithBets < 2) {
            hasValidActivity = false;
            statusMessage = "Needs bets on multiple outcomes";
        } else {
            hasValidActivity = true;
            statusMessage = "Ready for closure";
        }
        
        return (isActive, hasValidActivity, statusMessage, market.totalAmount, outcomesWithBets);
    }

    /**
     * @dev Get estimated parimutuel odds for a market
     * @param marketId The market to calculate odds for
     * @return Array of odds for [home, draw, away] (x100 multiplier)
     * @notice Returns final odds if closed, estimated odds if open
     * @notice No fees are factored into odds - fees applied individually on claims
     */
    function getEstimatedOdds(uint256 marketId) external view marketExists(marketId) returns (uint256[3] memory) {
        Market storage market = markets[marketId];
        
        // Return final odds if betting is closed
        if (market.isClosed) {
            return market.finalOdds;
        }
        
        // Return default odds if no bets placed yet
        if (market.totalAmount == 0) {
            return [uint256(200), 200, 200]; // 2.0x default odds for all outcomes
        }
        
        // Calculate current estimated parimutuel odds (without fee deductions)
        uint256[3] memory parimutuelOdds;
        
        for (uint256 i = 0; i < 3; i++) {
            if (market.outcomeAmounts[i] > 0) {
                // Basic parimutuel: (total pool / amount on outcome) * 100
                uint256 calculatedOdds = (market.totalAmount * 100) / market.outcomeAmounts[i];
                parimutuelOdds[i] = calculatedOdds >= MIN_ODDS ? calculatedOdds : MIN_ODDS;
            } else {
                parimutuelOdds[i] = 0; // No odds if no bets on this outcome
            }
        }
        
        return parimutuelOdds;
    }

    /**
     * @dev Get betting phase information for a market
     * @param marketId The market to check
     * @return isEarlyPhase True if >24h until match (2% fee phase)
     * @return isLatePhase True if <24h until match (3% fee phase)
     * @return currentFeePercent Current fee percentage for new bets
     * @return hoursUntilMatch Hours remaining until match starts
     */
    function getBettingPhase(uint256 marketId) external view marketExists(marketId) returns (
        bool isEarlyPhase,
        bool isLatePhase,
        uint256 currentFeePercent,
        uint256 hoursUntilMatch
    ) {
        Market storage market = markets[marketId];
        uint256 timeUntilMatch = market.startTime > block.timestamp 
            ? market.startTime - block.timestamp 
            : 0;
        uint256 hoursValue = timeUntilMatch / 1 hours;
        uint256 feePercent = timeUntilMatch > 24 hours ? EARLY_FEE_PERCENT : LATE_FEE_PERCENT;
        
        return (
            timeUntilMatch > 24 hours,              // isEarlyPhase (blind/hidden odds)
            timeUntilMatch <= 24 hours && timeUntilMatch > 0, // isLatePhase (visible parimutuel)
            feePercent,                             // currentFeePercent
            hoursValue                              // hoursUntilMatch
        );
    }

    /**
     * @dev Get user's betting history
     * @param user The user's address
     * @return Array of market IDs the user has bet on
     */
    function getUserMarkets(address user) external view returns (uint256[] memory) {
        return userMarketIds[user];
    }

    /**
     * @dev Get complete market information
     * @param marketId The market to get information for
     * @return description Market description
     * @return totalAmount Total ETH bet on this market
     * @return outcomeAmounts Array of ETH bet on each outcome [home, draw, away]
     * @return isClosed Whether betting is closed
     * @return isResolved Whether result is set
     * @return isCancelled Whether market is cancelled
     * @return winningOutcome The winning outcome (if resolved)
     * @return finalOdds Final odds for each outcome
     */
    function getMarket(uint256 marketId) external view marketExists(marketId) returns (
        string memory description,
        uint256 totalAmount,
        uint256[3] memory outcomeAmounts,
        bool isClosed,
        bool isResolved,
        bool isCancelled,
        Outcome winningOutcome,
        uint256[3] memory finalOdds
    ) {
        Market storage market = markets[marketId];
        return (
            market.description,
            market.totalAmount,
            market.outcomeAmounts,
            market.isClosed,
            market.isResolved,
            market.isCancelled,
            market.winningOutcome,
            market.finalOdds
        );
    }

    /**
     * @dev Get user's bet information for a specific market
     * @param marketId The market to check
     * @param user The user's address
     * @return outcome The outcome the user bet on
     * @return amount The amount the user bet
     * @return claimed Whether winnings have been claimed
     */
    function getUserBet(uint256 marketId, address user) external view marketExists(marketId) returns (
        Outcome outcome,
        uint256 amount,
        bool claimed
    ) {
        Bet storage bet = bets[marketId][user];
        return (bet.outcome, bet.amount, bet.claimed);
    }

    // === INTERNAL HELPER FUNCTIONS ===

    /**
     * @dev Check if market has sufficient betting activity for closure
     * @param market The market to validate
     * @return isValid Whether market meets minimum requirements
     * @return reason Human-readable reason if invalid
     */
    function _hasValidBettingActivity(Market storage market) internal view returns (bool, string memory) {
        // Check minimum total pool size to ensure viable market
        if (market.totalAmount < MIN_POOL_SIZE) {
            return (false, "Insufficient betting volume");
        }
        
        // Count outcomes that have received bets
        uint8 outcomesWithBets = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (market.outcomeAmounts[i] > 0) {
                outcomesWithBets++;
            }
        }
        
        // Require at least 2 different outcomes to ensure competitive market
        if (outcomesWithBets < 2) {
            return (false, "Need bets on at least 2 outcomes");
        }
        
        return (true, "");
    }

    // === FALLBACK FUNCTIONS ===
    
    /**
     * @dev Receive function for direct ETH transfers
     * @notice Allows contract to receive ETH but limits amount to prevent accidents
     */
    receive() external payable {
        require(msg.value <= 10 ether, "BetZilla: Direct ETH deposit too large - use placeBet() instead");
    }

    /**
     * @dev Fallback function for unknown function calls
     * @notice Prevents accidental calls and provides helpful error message
     */
    fallback() external payable {
        revert("BetZilla: Function not found - check function name and parameters");
    }
}
