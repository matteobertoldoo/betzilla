const { ethers } = require("hardhat");

async function main() {
  console.log("Starting market check...");
  
  try {
    // Get the contract instance
    const BetZilla = await ethers.getContractFactory("BetZilla");
    const contractAddress = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690";
    const contract = BetZilla.attach(contractAddress);
    
    console.log("Contract attached successfully");
    console.log("Contract address:", contractAddress);
    
    // Get market count first
    const marketCount = await contract.marketCount();
    console.log(`Total markets on contract: ${marketCount.toString()}`);
    
    if (marketCount > 0) {
      // Check first few markets
      for (let i = 1; i <= Math.min(5, Number(marketCount)); i++) {
        console.log(`\nChecking market ${i}:`);
        try {
          const market = await contract.getMarket(i);
          console.log(`  Description: "${market[0]}"`);
          console.log(`  Total amount: ${ethers.formatEther(market[1])} ETH`);
          console.log(`  Outcome amounts: [${market[2].map(x => ethers.formatEther(x)).join(', ')}] ETH`);
          console.log(`  Is closed: ${market[3]}`);
          console.log(`  Is resolved: ${market[4]}`);
        } catch (error) {
          console.log(`  Error: ${error.message}`);
        }
      }
    } else {
      console.log("No markets found on contract");
    }
    
  } catch (error) {
    console.error("Main error:", error.message);
    console.error("Stack:", error.stack);
  }
}

main()
  .then(() => {
    console.log("\nCheck completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
