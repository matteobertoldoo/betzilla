const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying BetZilla contract...");

  const BetZilla = await hre.ethers.getContractFactory("BetZilla");
  const betzilla = await BetZilla.deploy();

  await betzilla.waitForDeployment();

  const address = await betzilla.getAddress();
  console.log("✅ BetZilla deployed to:", address);

  // Create some sample markets
  console.log("📊 Creating sample markets...");
  
  // Market 1: Football match
  await betzilla.createMarket("Juventus vs Inter - Who will win?", 3600); // 1 hour
  console.log("✅ Created market 1: Juventus vs Inter");
  
  // Market 2: Basketball game
  await betzilla.createMarket("Lakers vs Warriors - Final Score", 7200); // 2 hours
  console.log("✅ Created market 2: Lakers vs Warriors");

  console.log("🎉 Deployment complete!");
  console.log("Contract address:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 