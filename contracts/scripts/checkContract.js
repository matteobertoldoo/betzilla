const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking BetZilla contract state...");

  // Connect to the deployed contract
  const CONTRACT_ADDRESS = '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690';
  const BetZilla = await hre.ethers.getContractFactory("BetZilla");
  const betzilla = BetZilla.attach(CONTRACT_ADDRESS);

  try {
    // Get market count
    const marketCount = await betzilla.marketCount();
    console.log(`📊 Total markets: ${Number(marketCount)}`);

    // Check first few markets
    console.log("\n🏟️ First 5 markets:");
    for (let i = 0; i < Math.min(5, Number(marketCount)); i++) {
      try {
        const market = await betzilla.getMarket(i);
        console.log(`Market ${i}: ${market[0]} (Start: ${new Date(Number(market[6]) * 1000).toLocaleString()})`);
      } catch (error) {
        console.log(`Market ${i}: Error - ${error.message}`);
      }
    }

    // Check valid market ID range
    console.log(`\n✅ Valid market IDs: 0 to ${Number(marketCount) - 1}`);

  } catch (error) {
    console.error("❌ Error checking contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
