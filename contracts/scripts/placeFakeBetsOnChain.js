const { ethers } = require("hardhat");
const axios = require("axios");

const FRIENDS = [
  "alice_bet",
  "bob_gambler",
  "carol_sports",
  "david_fan",
  "eve_bettor",
  "frank_lucky",
  "grace_wins",
  "henry_odds"
];

async function main() {
  console.log("💸 Placing fake bets on-chain for test users...");

  // 1. Get Hardhat accounts
  const signers = await ethers.getSigners();
  // Map friend usernames to signers (first 8)
  const friendSigners = signers.slice(0, FRIENDS.length);

  // 2. Get contract instance
  const contractAddress = process.env.BETZILLA_CONTRACT || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const BetZilla = await ethers.getContractFactory("BetZilla");
  const contract = BetZilla.attach(contractAddress);

  // 3. Get matches from backend with contract_market_id
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const res = await axios.get(`${backendUrl}/api/matches?upcoming=true&limit=15`);
  const matches = res.data.data.filter(m => m.contract_market_id);

  if (matches.length === 0) {
    console.log("❌ No matches with contract_market_id found.");
    return;
  }

  // 4. For each match, let a subset of friends place a bet on random outcome
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const marketId = Number(match.contract_market_id);
    const hasDraw = match.sport === "Football" || match.sport === "Soccer";
    // Pick 3-5 random friends for this match
    const shuffled = [...friendSigners].sort(() => 0.5 - Math.random());
    const numBets = Math.floor(Math.random() * 3) + 3; // 3-5 bets
    const bettors = shuffled.slice(0, numBets);

    console.log(`\n🏟️ Market ${marketId}: ${match.title} (${match.sport})`);

    for (let j = 0; j < bettors.length; j++) {
      const signer = bettors[j];
      const friendName = FRIENDS[signers.indexOf(signer)];
      // Random outcome: 1 (home), 2 (draw), 3 (away)
      let outcome;
      if (hasDraw) {
        outcome = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      } else {
        outcome = Math.random() > 0.5 ? 1 : 3; // 1 or 3 (no draw)
      }
      // Random amount: 0.01 - 0.2 ETH
      const amount = (Math.random() * 0.19 + 0.01).toFixed(3);

      try {
        const tx = await contract.connect(signer).placeBet(marketId, outcome, {
          value: ethers.parseEther(amount)
        });
        await tx.wait();
        console.log(`  ✅ ${FRIENDS[signers.indexOf(signer)]} bet ${amount} ETH on outcome ${outcome}`);
      } catch (err) {
        if (err.message && err.message.includes("You can only place one bet per market")) {
          console.log(`  ⏩ ${friendName} already bet on this market`);
        } else {
          console.log(`  ❌ ${friendName} failed: ${err.message}`);
        }
      }
    }
  }

  console.log("\n🎉 Fake on-chain bets placed for test users!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error placing fake bets:", err);
    process.exit(1);
  });
