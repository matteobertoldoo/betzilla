// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BetZilla {
    struct Market {
        string description;
        uint256 totalAmount;
        uint256 outcome1Amount;
        uint256 outcome2Amount;
        uint256 outcome3Amount;
        bool isActive;
        bool isResolved;
        uint8 winningOutcome;
        uint256 endTime;
        address[] earlyBettors;
        mapping(address => bool) hasBet;
    }

    struct Bet {
        uint8 outcome;
        uint256 amount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public bets;
    mapping(address => uint256[]) public userMarkets;

    uint256 public marketCount;
    uint256 public platformFee = 2; // 2% platform fee
    uint256 public earlyBettorBonus = 5; // 5% bonus for early bettors
    address public owner;

    event MarketCreated(uint256 indexed marketId, string description, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, uint8 outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint8 winningOutcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId > 0 && marketId <= marketCount, "Market does not exist");
        _;
    }

    modifier marketActive(uint256 marketId) {
        require(markets[marketId].isActive, "Market is not active");
        require(!markets[marketId].isResolved, "Market is already resolved");
        require(block.timestamp < markets[marketId].endTime, "Market has ended");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createMarket(
        string memory description,
        uint256 duration
    ) external onlyOwner {
        marketCount++;
        Market storage market = markets[marketCount];
        market.description = description;
        market.isActive = true;
        market.endTime = block.timestamp + duration;
        
        emit MarketCreated(marketCount, description, market.endTime);
    }

    function placeBet(uint256 marketId, uint8 outcome) external payable marketExists(marketId) marketActive(marketId) {
        require(outcome >= 1 && outcome <= 3, "Invalid outcome");
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(!markets[marketId].hasBet[msg.sender], "Already placed a bet on this market");

        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        bet.outcome = outcome;
        bet.amount = msg.value;

        market.totalAmount += msg.value;
        market.hasBet[msg.sender] = true;

        // Add to early bettors if first 10 bettors
        if (market.earlyBettors.length < 10) {
            market.earlyBettors.push(msg.sender);
        }

        // Update outcome amounts
        if (outcome == 1) {
            market.outcome1Amount += msg.value;
        } else if (outcome == 2) {
            market.outcome2Amount += msg.value;
        } else {
            market.outcome3Amount += msg.value;
        }

        // Add market to user's list if not already there
        bool marketAlreadyExists = false;
        for (uint i = 0; i < userMarkets[msg.sender].length; i++) {
            if (userMarkets[msg.sender][i] == marketId) {
                marketAlreadyExists = true;
                break;
            }
        }
        if (!marketAlreadyExists) {
            userMarkets[msg.sender].push(marketId);
        }

        emit BetPlaced(marketId, msg.sender, outcome, msg.value);
    }

    function resolveMarket(uint256 marketId, uint8 winningOutcome) external onlyOwner marketExists(marketId) {
        require(winningOutcome >= 1 && winningOutcome <= 3, "Invalid winning outcome");
        require(block.timestamp >= markets[marketId].endTime, "Market has not ended yet");

        Market storage market = markets[marketId];
        market.isResolved = true;
        market.winningOutcome = winningOutcome;
        market.isActive = false;

        emit MarketResolved(marketId, winningOutcome);
    }

    function claimWinnings(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][msg.sender];

        require(market.isResolved, "Market is not resolved");
        require(bet.amount > 0, "No bet found");
        require(!bet.claimed, "Winnings already claimed");
        require(bet.outcome == market.winningOutcome, "Bet did not win");

        uint256 winnings = calculateWinnings(marketId, msg.sender);
        require(winnings > 0, "No winnings to claim");

        bet.claimed = true;

        // Transfer winnings
        (bool success, ) = payable(msg.sender).call{value: winnings}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(marketId, msg.sender, winnings);
    }

    function calculateWinnings(uint256 marketId, address bettor) public view returns (uint256) {
        Market storage market = markets[marketId];
        Bet storage bet = bets[marketId][bettor];

        if (!market.isResolved || bet.amount == 0 || bet.claimed || bet.outcome != market.winningOutcome) {
            return 0;
        }

        uint256 winningAmount;
        if (market.winningOutcome == 1) {
            winningAmount = market.outcome1Amount;
        } else if (market.winningOutcome == 2) {
            winningAmount = market.outcome2Amount;
        } else {
            winningAmount = market.outcome3Amount;
        }

        if (winningAmount == 0) return 0;

        // Calculate winnings based on proportion
        uint256 winnings = (market.totalAmount * bet.amount) / winningAmount;

        // Apply early bettor bonus
        bool isEarlyBettor = false;
        for (uint i = 0; i < market.earlyBettors.length; i++) {
            if (market.earlyBettors[i] == bettor) {
                isEarlyBettor = true;
                break;
            }
        }

        if (isEarlyBettor) {
            winnings = winnings + (winnings * earlyBettorBonus) / 100;
        }

        return winnings;
    }

    function getOdds(uint256 marketId) external view returns (uint256[3] memory) {
        Market storage market = markets[marketId];
        uint256[3] memory odds;
        
        if (market.outcome1Amount > 0) {
            odds[0] = (market.totalAmount * 100) / market.outcome1Amount;
        }
        if (market.outcome2Amount > 0) {
            odds[1] = (market.totalAmount * 100) / market.outcome2Amount;
        }
        if (market.outcome3Amount > 0) {
            odds[2] = (market.totalAmount * 100) / market.outcome3Amount;
        }
        
        return odds;
    }

    function calculateOdds(uint256 marketId, uint8 outcome) external view returns (uint256) {
        Market storage market = markets[marketId];
        require(outcome >= 1 && outcome <= 3, "Invalid outcome");
        
        uint256 outcomeAmount;
        if (outcome == 1) {
            outcomeAmount = market.outcome1Amount;
        } else if (outcome == 2) {
            outcomeAmount = market.outcome2Amount;
        } else {
            outcomeAmount = market.outcome3Amount;
        }
        
        if (outcomeAmount == 0) return 0;
        return (market.totalAmount * 100) / outcomeAmount;
    }

    function getMaxBet(uint256 marketId, uint8 outcome) external view returns (uint256) {
        Market storage market = markets[marketId];
        require(outcome >= 1 && outcome <= 3, "Invalid outcome");
        
        // Se il pool è vuoto, permetti una scommessa di 1 ETH
        if (market.totalAmount == 0) {
            return 1 ether; // 1 ETH come limite per la prima scommessa
        }
        
        // Altrimenti calcola normalmente: 10% del pool totale
        return market.totalAmount / 10;
    }

    function getMarket(uint256 marketId) external view returns (
        string memory description,
        uint256 totalAmount,
        uint256 outcome1Amount,
        uint256 outcome2Amount,
        uint256 outcome3Amount,
        bool isActive,
        bool isResolved,
        uint8 winningOutcome,
        uint256 endTime
    ) {
        Market storage market = markets[marketId];
        return (
            market.description,
            market.totalAmount,
            market.outcome1Amount,
            market.outcome2Amount,
            market.outcome3Amount,
            market.isActive,
            market.isResolved,
            market.winningOutcome,
            market.endTime
        );
    }

    function getUserMarkets(address user) external view returns (uint256[] memory) {
        return userMarkets[user];
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
} 