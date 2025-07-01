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
  
  // Get current timestamp and add future times
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Market 1: Football match (starts in 1 hour)
  await betzilla.createMarket("Juventus vs Inter - Who will win?", currentTime + 3600);
  console.log("✅ Created market 1: Juventus vs Inter");
  
  // Market 2: Basketball game (starts in 2 hours)
  await betzilla.createMarket("Lakers vs Warriors - Final Score", currentTime + 7200);
  console.log("✅ Created market 2: Lakers vs Warriors");
  
  // Market 3: Premier League (starts in 3 hours)
  await betzilla.createMarket("Manchester United vs Liverpool - Match Result", currentTime + 10800);
  console.log("✅ Created market 3: Manchester United vs Liverpool");

  console.log("🎉 Deployment complete!");
  console.log("Contract address:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 