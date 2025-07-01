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
        bool refunded;
        uint256 placedAt;
    }

    address public owner;
    uint256 public marketCount;
    uint256 public constant FEE_PERCENT = 3;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public bets;

    // Storico dei marketId su cui ogni utente ha scommesso
    mapping(address => uint256[]) public userMarketIds;

    event MarketCreated(uint256 marketId, string description, uint256 startTime);
    event BetPlaced(uint256 marketId, address indexed user, uint8 outcome, uint256 amount);
    event BettingClosed(uint256 marketId, uint256[3] finalOdds);
    event MarketResolved(uint256 marketId, uint8 winningOutcome);
    event WinningsClaimed(uint256 marketId, address user, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId > 0 && marketId <= marketCount, "Invalid market");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createMarket(string memory description, uint256 startTime) external onlyOwner {
        require(startTime > block.timestamp, "Start time must be in future");

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
        require(!market.isClosed, "Betting closed");
        require(block.timestamp < market.startTime, "Match started");
        require(outcome >= 1 && outcome <= 3, "Invalid outcome");
        require(msg.value > 0, "Bet must be > 0");
        require(bets[marketId][msg.sender].amount == 0, "Already bet");

        market.totalAmount += msg.value;
        market.outcomeAmounts[outcome - 1] += msg.value;

        bets[marketId][msg.sender] = Bet({
            outcome: outcome,
            amount: msg.value,
            claimed: false,
            refunded: false,
            placedAt: block.timestamp
        });

        // Aggiorna lo storico dei marketId per l'utente
        userMarketIds[msg.sender].push(marketId);

        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    function closeBetting(uint256 marketId) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        require(block.timestamp >= market.startTime, "Match not started");
        require(!market.isClosed, "Already closed");

        market.isClosed = true;

        uint256 total = market.totalAmount;
        for (uint8 i = 0; i < 3; i++) {
            uint256 pool = market.outcomeAmounts[i];
            market.finalOdds[i] = pool == 0 ? 0 : (total * 100) / pool; // odds x100
        }

        emit BettingClosed(marketId, market.finalOdds);
    }

    function setResult(uint256 marketId, uint8 outcome) external onlyOwner marketExists(marketId) {
        require(outcome >= 1 && outcome <= 3, "Invalid result");
        Market storage market = markets[marketId];
        require(market.isClosed, "Betting still open");
        require(!market.isResolved, "Already resolved");

        market.winningOutcome = outcome;
        market.isResolved = true;

        emit MarketResolved(marketId, outcome);
    }

    function claimWinnings(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        require(market.isResolved, "Market not resolved");
        require(!bet.claimed, "Already claimed");
        require(bet.outcome == market.winningOutcome, "Not a winner");

        uint256 odds = market.finalOdds[bet.outcome - 1];
        uint256 gross = (bet.amount * odds) / 100;
        uint256 fee = (gross * FEE_PERCENT) / 100;
        uint256 payout = bet.amount + (gross - fee);

        bet.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
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
        bool refunded,
        uint256 placedAt
    ) {
        Bet storage bet = bets[marketId][user];
        return (bet.outcome, bet.amount, bet.claimed, bet.refunded, bet.placedAt);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }

    // Getter per i marketId su cui un utente ha scommesso
    function getUserMarkets(address user) external view returns (uint256[] memory) {
        return userMarketIds[user];
    }

    receive() external payable {}
} 