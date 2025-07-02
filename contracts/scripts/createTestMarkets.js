const { ethers } = require("hardhat");

async function main() {
  console.log("Creating test markets on blockchain...");
  
  try {
    // Get the contract instance
    const BetZilla = await ethers.getContractFactory("BetZilla");
    const contractAddress = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690";
    const contract = BetZilla.attach(contractAddress);
    
    console.log("Contract attached successfully");
    console.log("Contract address:", contractAddress);
    
    // Get current market count
    const marketCount = await contract.marketCount();
    console.log(`Current market count: ${marketCount.toString()}`);
    
    // Create test markets for the next few hours
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 60 * 60;
    
    const testMarkets = [
      {
        description: "Premier League: Manchester United vs Liverpool",
        startTime: now + (1 * oneHour) // 1 hour from now
      },
      {
        description: "La Liga: Real Madrid vs Barcelona", 
        startTime: now + (2 * oneHour) // 2 hours from now
      },
      {
        description: "NBA: Lakers vs Warriors",
        startTime: now + (3 * oneHour) // 3 hours from now
      },
      {
        description: "Champions League: PSG vs Bayern Munich",
        startTime: now + (4 * oneHour) // 4 hours from now
      },
      {
        description: "Serie A: Juventus vs AC Milan",
        startTime: now + (5 * oneHour) // 5 hours from now
      }
    ];
    
    console.log("Creating markets...");
    
    for (let i = 0; i < testMarkets.length; i++) {
      const market = testMarkets[i];
      
      try {
        console.log(`Creating market ${i + 1}: ${market.description}`);
        
        const tx = await contract.createMarket(market.description, market.startTime);
        console.log(`Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Market created successfully! Gas used: ${receipt.gasUsed.toString()}`);
        
        // Get the new market count
        const newMarketCount = await contract.marketCount();
        console.log(`New market ID: ${newMarketCount.toString()}`);
        
      } catch (error) {
        console.error(`❌ Error creating market ${i + 1}:`, error.message);
      }
    }
    
    // Final market count
    const finalMarketCount = await contract.marketCount();
    console.log(`\n🎉 Final market count: ${finalMarketCount.toString()}`);
    
    // List all markets
    console.log("\n📋 All markets on contract:");
    for (let i = 1; i <= Number(finalMarketCount); i++) {
      try {
        const market = await contract.getMarket(i);
        console.log(`Market ${i}: "${market[0]}" - Start: ${new Date(Number(market[6]) * 1000).toISOString()}`);
      } catch (error) {
        console.log(`Market ${i}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error("Main error:", error.message);
    console.error("Stack:", error.stack);
  }
}

main()
  .then(() => {
    console.log("\n✅ Market creation completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
