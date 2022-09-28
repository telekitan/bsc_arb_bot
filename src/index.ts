import { calculatePathProfitability, calculatePaths, getSwapPaths } from "./packages/pools";
import { fetchHotLiquidityPools } from "./packages/eigenphi/fetch_hlp";
import { savePoolsAndTokens } from "./packages/utils";
import cron from "node-cron"
import "./packages/db/connect";


const main = async () => {
    try {

        console.log("Waiting for scheduled start time")

        // cron.schedule("12 21 * * *", async () => {

        // // Fetch hot pools from Eigenphi
        const poolData = await fetchHotLiquidityPools();
        const tokenData = poolData?.tokenData;
        const tokenDataToSaveToDb = poolData?.dbTokenData;

        let pools = poolData?.pools;
        let poolsToSaveToDB = poolData?.dbPools

        let allPaths: any;

        console.log("====> ", pools.length)
        await savePoolsAndTokens(poolsToSaveToDB, tokenDataToSaveToDb!);

        // Fetch all pools ever processed

        if (pools.length > 0) {
            // Get all possible paths
            allPaths = calculatePaths(pools)
        }

        // Get tokens that can be paired together
        const swapPaths = await getSwapPaths(allPaths)

        // Check  if the token are in a pool and if liquidity exists
        if (swapPaths) {
            let pathFunctions = []

            let pathCount = 0;

            for (let key in swapPaths) {
                const path = swapPaths[key]
                pathCount + path.length

                await pathFunctions.push(calculatePathProfitability(path, tokenData))
                // await calculatePathProfitability(path, tokenData);
            }

            console.log("\n\n\nPaths Used : ", pathCount)

            // use promise.all to calculate path profitability in parallel
            Promise.all(pathFunctions)
        }
        // }, {
        //     timezone: "Africa/Nairobi"
        // }
        //     )


    } catch (error) {
        console.log("Error ", error)
    }
}

main()