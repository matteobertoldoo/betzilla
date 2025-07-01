// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BetZilla {
    struct Market {
        string description;
        uint256 totalAmount;
        uint256[3] outcomeAmounts;
        bool isClosed;
        bool isResolved;
        uint8 winningOutcome; // 1 = Home, 2 = Draw, 3 = Away
        uint256 startTime;
        uint256[3] finalOdds; // stored as x100 multiplier
    }

    struct Bet {
        uint8 outcome;
        uint256 amount;
        bool claimed;
        bool refunded; // nuovo campo per tracciare i rimborsi
        uint256 placedAt; // timestamp della scommessa
        uint8 feePercent; // fee fissata al momento della scommessa
    }

    address public owner;
    uint256 public marketCount;
    uint256 public constant FEE_PERCENT = 3;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public bets;

    event MarketCreated(uint256 marketId, string description, uint256 startTime);
    event BetPlaced(uint256 marketId, address indexed user, uint8 outcome, uint256 amount);
    event BettingClosed(uint256 marketId, uint256[3] finalOdds);
    event MarketResolved(uint256 marketId, uint8 winningOutcome);
    event WinningsClaimed(uint256 marketId, address user, uint256 payout);
    event Debug(string message);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId > 0 && marketId <= marketCount, "Market does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createMarket(string memory description, uint256 startTime) external onlyOwner {
        require(startTime > block.timestamp, "Start time must be in the future");

        marketCount++;
        markets[marketCount] = Market({
            description: description,
            totalAmount: 0,
            outcomeAmounts: [uint256(0), 0, 0],
            isClosed: false,
            isResolved: false,
            winningOutcome: 0,
            startTime: startTime,
            finalOdds: [uint256(0), 0, 0]
        });

        emit MarketCreated(marketCount, description, startTime);
    }

    function placeBet(uint256 marketId, uint8 outcome) external payable marketExists(marketId) {
        Market storage market = markets[marketId];
        if (market.isClosed) {
            emit Debug("Betting is closed for this market");
            revert("Betting is closed for this market");
        }
        if (block.timestamp >= market.startTime) {
            emit Debug("Match has already started");
            revert("Match has already started");
        }
        if (outcome < 1 || outcome > 3) {
            emit Debug("Outcome must be 1, 2, or 3");
            revert("Outcome must be 1, 2, or 3");
        }
        if (msg.value == 0) {
            emit Debug("Bet amount must be greater than 0");
            revert("Bet amount must be greater than 0");
        }

        // Se l'utente ha già una scommessa, sovrascrive con la nuova
        Bet storage userBet = bets[marketId][msg.sender];
        if (userBet.amount > 0) {
            // Rimuovi la vecchia puntata dal pool
            market.totalAmount -= userBet.amount;
            market.outcomeAmounts[userBet.outcome - 1] -= userBet.amount;
        }
        uint8 feePercent = (market.startTime > block.timestamp + 1 days) ? 2 : 3;
        bets[marketId][msg.sender] = Bet({
            outcome: outcome,
            amount: msg.value,
            claimed: false,
            refunded: false,
            placedAt: block.timestamp,
            feePercent: feePercent
        });
        market.totalAmount += msg.value;
        market.outcomeAmounts[outcome - 1] += msg.value;
        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    function closeBetting(uint256 marketId) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        require(block.timestamp >= market.startTime, "Match has not started yet");
        require(!market.isClosed, "Betting is already closed");

        market.isClosed = true;

        uint256 total = market.totalAmount;
        for (uint8 i = 0; i < 3; i++) {
            uint256 pool = market.outcomeAmounts[i];
            market.finalOdds[i] = pool == 0 ? 0 : (total * 100) / pool; // odds x100
        }

        emit BettingClosed(marketId, market.finalOdds);
    }

    function setResult(uint256 marketId, uint8 outcome) external onlyOwner marketExists(marketId) {
        require(outcome >= 1 && outcome <= 3, "Winning outcome must be 1, 2, or 3");
        Market storage market = markets[marketId];
        require(market.isClosed, "Betting is still open");
        require(!market.isResolved, "Market is already resolved");

        market.winningOutcome = outcome;
        market.isResolved = true;

        emit MarketResolved(marketId, outcome);
    }

    /**
     * Calcola le quote live sulla base delle attuali scommesse.
     * Disponibile solo nelle 24 ore precedenti all'inizio dell'evento.
     * Ritorna odds x100 per ogni esito (1=Home, 2=Draw, 3=Away).
     */
    function getEstimatedOdds(uint256 marketId) external view marketExists(marketId) returns (uint256[3] memory) {
        Market storage market = markets[marketId];
        require(!market.isClosed, "Betting is closed for this market");
        require(block.timestamp >= market.startTime - 1 days, "Odds disponibili solo nelle 24h precedenti all'inizio");
        uint256 total = market.totalAmount;
        uint256[3] memory odds;
        for (uint8 i = 0; i < 3; i++) {
            uint256 pool = market.outcomeAmounts[i];
            odds[i] = pool == 0 ? 0 : (total * 100) / pool;
        }
        return odds;
    }

    function claimWinnings(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        require(market.isResolved, "Market is not resolved yet");
        require(!bet.claimed, "Winnings already claimed");
        require(bet.outcome == market.winningOutcome, "Bet outcome does not match winning outcome");

        uint256 odds = market.finalOdds[bet.outcome - 1];
        uint256 gross = (bet.amount * odds) / 100;
        // Fee fissata al momento della scommessa
        uint256 fee = (gross * bet.feePercent) / 100;
        uint256 payout = bet.amount + (gross - fee);

        bet.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /// Permette all'utente di ritirare la puntata se il mercato non viene chiuso entro 24 ore dall'inizio
    function refundBet(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        require(!market.isClosed, "Betting is already closed");
        require(block.timestamp > market.startTime + 1 days, "Refund not available yet");
        require(bet.amount > 0, "No bet to refund");
        require(!bet.refunded, "Already refunded");
        require(!bet.claimed, "Already claimed");

        uint256 refundAmount = bet.amount;
        bet.refunded = true;
        market.totalAmount -= refundAmount;
        market.outcomeAmounts[bet.outcome - 1] -= refundAmount;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }

    function getFinalOdds(uint256 marketId) external view returns (uint256[3] memory) {
        return markets[marketId].finalOdds;
    }

    function getMarket(uint256 marketId) external view returns (
        string memory description,
        uint256 totalAmount,
        uint256[3] memory outcomeAmounts,
        bool isClosed,
        bool isResolved,
        uint8 winningOutcome,
        uint256 startTime,
        uint256[3] memory finalOdds
    ) {
        Market storage market = markets[marketId];
        return (
            market.description,
            market.totalAmount,
            market.outcomeAmounts,
            market.isClosed,
            market.isResolved,
            market.winningOutcome,
            market.startTime,
            market.finalOdds
        );
    }

    function getUserBet(uint256 marketId, address user) external view returns (
        uint8 outcome,
        uint256 amount,
        bool claimed,
        bool refunded // aggiunto campo refunded
    ) {
        Bet storage bet = bets[marketId][user];
        return (bet.outcome, bet.amount, bet.claimed, bet.refunded);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees available to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }

    /**
     * Restituisce la fee attuale (2 o 3) in base al tempo mancante all'inizio dell'evento.
     * 2% se mancano più di 24h, 3% se meno di 24h.
     */
    function getCurrentFee(uint256 marketId) external view marketExists(marketId) returns (uint256) {
        Market storage market = markets[marketId];
        if (market.startTime > block.timestamp + 1 days) {
            return 2;
        } else {
            return 3;
        }
    }

    receive() external payable {}
}