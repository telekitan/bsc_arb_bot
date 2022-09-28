import { ethers } from "hardhat";


const main = async () => {
  const factory = await ethers.getContractFactory("Swapper");
  const deploySwap = await factory.deploy();

  let data = {
    address: deploySwap.address,
    abi: JSON.parse(JSON.stringify(deploySwap.interface.format("json"))),
  };

  console.log(data);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
