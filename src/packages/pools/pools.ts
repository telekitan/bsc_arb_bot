import { BigNumber, Contract, utils } from "ethers"
import { arbContract, getMostProfitableBuyAmount, getMostProfitablePool, getPathProfitabilty, getSafeProfitablePool, getSortedAmountOuts, getTokenDecimals, minimumAmountOut, oneEther, provider, routerContract, walletAddress } from "../utils"
import poolABI from "../utils/abi/poolABI.json"
import { PoolData, poolInterface } from "../utils/types"
import { Pool } from "../db/models"
import { Address } from "cluster"
import { ADDRESS, MINIMUM_STABLE_COIN_PROFIT, MINIMUM_WBNB_PROFIT, PROFIT_PERCENTAGE, ROUTERS, STABLE_COIN_ARB_AMOUNT, WBNB_ARB_AMOUNT } from "../config"
import { getTransactionCost, executeArb } from "../arbitrage"
import { sendNotification } from "../telegram"
import { arbMessage, failedTxnMessage } from "../telegram/messages"

const factoryABI = [
    {
        "constant": true,
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "getPair",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
]


const routerABI = [
    {
        "constant": true,
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amountIn",
                "type": "uint256"
            },
            {
                "internalType": "address[]",
                "name": "path",
                "type": "address[]"
            }
        ],
        "name": "getAmountsOut",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
]


let baseTokens = [ADDRESS.busdTokenAddress, ADDRESS.usdtTokenAddress, ADDRESS.wbnbTokenAddress]
baseTokens = baseTokens.map((token) => {
    return token.toLowerCase()
})

const getPoolAddress = async (token0: string, token1: string, factoryAddress: string) => {
    try {
        const factoryContract = new Contract(factoryAddress, factoryABI, provider)
        const pairAddress = await factoryContract.getPair(token0, token1)

        return pairAddress
    } catch (error) {
        console.log("Error getting pool address", error)
    }
}

export const getPoolContract = (poolAddress: string) => {
    return new Contract(poolAddress, poolABI, provider)
}

export const fetchPoolPrice = async (liquidityPoolAddress: string, tokenIn: string, tokenOut: string) => {
    try {

        console.log("\nFetching pool price for ", liquidityPoolAddress, tokenIn, tokenOut)
        const poolContract = getPoolContract(liquidityPoolAddress)

        const poolReserves = await poolContract.getReserves()
        const reserve0 = parseInt(poolReserves._reserve0._hex)
        const reserve1 = parseInt(poolReserves._reserve1._hex)

        const token0 = await poolContract.token0()

        let price: any;

        if (tokenIn.toLowerCase() == token0.toLowerCase()) {
            // tokenIn / tokenOut

            price = reserve0 / reserve1
        } else {
            price = reserve1 / reserve0
        }

        return price

    } catch (error) {
        console.log("Error fetching pool price ", error)
    }
}


export const calculatePaths = (pools: string[]) => {

    console.log("\n\n\n *** Getting all possible paths ***")

    const path: Record<string, string[]> = {}

    for (let i = 0; i < pools.length; i++) {
        const [token0, token1] = pools[i]

        for (let j = 0; j < pools.length; j++) {
            const pool = pools[j];

            if (pool.includes(token0)) {
                let _paths = path[token0]
                if (_paths) {
                    !_paths.includes(token1) && _paths.push(token1)
                } else {
                    path[token0] = [token1]
                }

            } else if (pool.includes(token1)) {
                let _paths = path[token1]
                if (_paths) {
                    !_paths.includes(token0) && _paths.push(token0)
                } else {
                    path[token1] = [token0]
                }

            }
        }
    }

    return path
}


export const calculatePathProfitability = async (path: any, tokenData: any) => {
    try {
        let logData = []

        console.log("\n\nScanning through all paths for profitability")

        console.log("Total number of pools scanned : ", path.length)

        for (let i = 0; i < path.length; i++) {
            const data: any[] = [];
            path[i].map((token: any) => { data.push(tokenData[token] ? tokenData[token].symbol : token); })

            console.log(`\n\nPath - ${i + 1} : `, data)
        }

        let count = 0
        let startTime = Date.now()

        while (true) {
            if (count < 1) {

                for (let j = 0; j < path.length - 1; j++) {
                    const start = Date.now()
                    let tokens = path[j]

                    // TODO: First check if the first token that does not start with wbnb has a pair with a token to be added at the start
                    // If the path does not start with wbnb, append the wbnb to the path
                    if (tokens[0].toLowerCase() != ADDRESS.wbnbTokenAddress.toLowerCase() &&
                        tokens[0].toLowerCase() != ADDRESS.usdtTokenAddress.toLowerCase() &&
                        tokens[0].toLowerCase() != ADDRESS.busdTokenAddress.toLowerCase()) {
                        tokens.unshift(ADDRESS.wbnbTokenAddress.toLowerCase())
                        tokens.push(ADDRESS.wbnbTokenAddress.toLowerCase())
                    }

                    console.log("Ensuring the path starts with wbnb ", Date.now() - startTime)
                    startTime = Date.now()

                    const data: any[] = [];
                    tokens.map((token: any) => { data.push(tokenData[token] ? tokenData[token].symbol : token); })
                    // console.log(`\n\nPath ${j + 1} : `, data)

                    let amountIn: any;
                    let amountOut: any;
                    let startAmount: any;
                    let minimumProfit: any
                    let decimals: number;

                    let swapRouters = []
                    let swapTokens = []
                    let swapPoolTime;

                    for (let k = 0; k < tokens.length - 1; k++) {

                        const tokenIn = tokens[k]
                        let tokenOut = tokens[k + 1]

                        // Amount In and amount Outs
                        // starts with  10_000 of the start token and any subsequent path use the amount out
                        // of the previous path


                        console.log("SINGLE PATH: Fetch token decimals ", Date.now() - startTime)
                        startTime = Date.now()

                        if (k === 0) {
                            if (tokenIn.toLowerCase() == ADDRESS.wbnbTokenAddress.toLowerCase()) {
                                amountIn = utils.parseUnits(WBNB_ARB_AMOUNT.toString(), 18)
                                startAmount = WBNB_ARB_AMOUNT * 10 ** 18
                                minimumProfit = MINIMUM_WBNB_PROFIT * 10 ** 18
                                decimals = 18
                            } else {
                                decimals = await getTokenDecimals(tokenIn)

                                amountIn = utils.parseUnits(STABLE_COIN_ARB_AMOUNT.toString(), decimals)
                                startAmount = STABLE_COIN_ARB_AMOUNT * 10 ** decimals
                                minimumProfit = MINIMUM_STABLE_COIN_PROFIT * 10 ** decimals
                            }
                        }

                        console.log("SINGLE PATH: Prepare the start amount  ", Date.now() - startTime)
                        startTime = Date.now()

                        // console.log(`\nSwap : ${tokenData[tokenIn] ? tokenData[tokenIn].symbol : tokenIn} -> ${tokenData[tokenOut] ? tokenData[tokenOut].symbol : tokenOut}`)
                        // console.log("Amount in ", parseInt(amountIn))

                        // Query the db for pools that have the token in and token out as its tokenIn and tokenOut
                        const pools = await getDBPool(tokenIn, tokenOut)

                        console.log("SINGLE PATH: Look up pool in the db  ", Date.now() - startTime)
                        startTime = Date.now()

                        if (pools && pools.length > 0) {

                            let exchangeFees: number[] = []

                            for (let index = 0; index < pools.length; index++) {
                                exchangeFees.push(3)
                            }

                            if (amountIn > 0) {


                                let startPoolTime = Date.now()
                                let poolData = await getMostProfitablePool(pools, [tokenIn, tokenOut], amountIn, exchangeFees)
                                swapPoolTime = Date.now() - startPoolTime

                                console.log("SINGLE PATH: Get the most profitable pool  ", Date.now() - startTime)
                                startTime = Date.now()

                                if (poolData?.profitablePool) {
                                    swapRouters.push(poolData?.profitablePool)
                                }

                                amountOut = poolData?.amountOut
                                amountIn = amountOut

                                // Check to ensure that similar tokens are not added next to each other
                                // This prevents the path from being created using similar tokens

                                if (swapTokens.length == 0) {
                                    swapTokens.push(utils.getAddress(tokenIn), utils.getAddress(tokenOut))
                                } else {
                                    swapTokens.push(utils.getAddress(tokenOut))
                                }

                                if (k == tokens.length - 1) {
                                    swapTokens.push(utils.getAddress(tokenIn), utils.getAddress(tokenOut))
                                }

                            }

                        } else {
                            // console.log("\nNo pool found to support the two tokens ", tokenData[tokenIn] ? tokenData[tokenIn].symbol : tokenIn, tokenData[tokenOut] ? tokenData[tokenOut].symbol : tokenOut)
                            swapTokens = []
                            swapRouters = []
                        }
                    }

                    // console.log("Time taken ", data, Date.now() - start)

                    console.log("Finish fetching all amount out from all available pools  ", Date.now() - startTime)
                    startTime = Date.now()

                    // console.log("\n\n\n\n *********************************")
                    // console.log("Swap routers ")
                    // console.log(swapRouters)
                    // console.log("\n\n Swap Tokens ")
                    // console.log(swapTokens)
                    // console.log("**************************************")

                    // Check if all the path was complete
                    // This is used to check if there was no pool that was missing which would mean that
                    // the swap does not exits
                    if (swapRouters.length == swapTokens.length - 1) {
                        if (swapTokens[0] == swapTokens[swapTokens.length - 1]) {

                            let _exchangeFees = []

                            for (let index = 0; index < swapRouters.length; index++) {
                                _exchangeFees.push(3)
                            }

                            // Path profitability

                            startTime = Date.now()
                            const profitable = await getMostProfitableBuyAmount(swapRouters, swapTokens, _exchangeFees, startAmount)

                            const _path = swapTokens.map((token: any) => { return tokenData[token.toLowerCase()] ? tokenData[token.toLowerCase()].symbol : token; })

                            let execute = profitable.profit >= minimumProfit ? "Yes" : profitable.profit > 0 ? "-" : ""

                            logData.push({
                                path: JSON.stringify(_path),
                                profit: profitable.profit,
                                // buyAmount: JSON.stringify(profitable.buyAmount),
                                "% profit": profitable.percentageProfit,
                                "Compared profit": execute == "-" ? parseFloat(((profitable.profit - minimumProfit) / 10 ** 18).toFixed(4)) : "",
                                "Pool Time (Secs)": swapPoolTime,
                                "Time Taken (Secs)": (Date.now() - start) / 1000,
                                execute
                            })


                            console.table(logData)

                            if (profitable.profit >= minimumProfit) {

                                console.log("Estimating transaction cost ")
                                const estimatedGas = await getTransactionCost(swapTokens, swapRouters, _exchangeFees, profitable.profitableAmountIn!, profitable.profit * 0.9)

                                if (estimatedGas) {

                                    console.log("\n\nExecuting arbitrage")
                                    console.log("\n\n Estimated cost : ", estimatedGas)

                                    console.log("\n\n\n Profitable ------- >")

                                    const tx = await executeArb(swapTokens, swapRouters, _exchangeFees, profitable.profitableAmountIn!, profitable.profit * 0.9)

                                    if (tx) {
                                        await sendNotification(arbMessage(_path, profitable.profitableAmountIn / (10 ** 18), profitable.percentageProfit, profitable.profit / (10 ** 18), tx.transactionHash))
                                    }
                                } else {
                                    console.log("Error simulating the transaction ")
                                    console.log("Arb profit : ", profitable.percentageProfit)
                                    console.log("Arb % profit : ", profitable.profit)
                                }
                            }


                        } else {
                            // console.log("First token does not match last ", swapTokens)
                        }
                    } else {
                        // console.log("Invalid routers or tokens ", swapRouters, swapTokens)
                    }
                }

                count = 0
            }
        }

    } catch (error) {
        console.log("Error calculating path profitability ", error)
    }
}


export const getSwapPaths = async (pools: any) => {

    console.log("\n\n *** Calculating optimum swap paths ***")
    console.log("\n\n *** Rearranging swap paths to ensure arb ends with start token ***")

    const swapPaths: any = {}

    for (let key in pools) {

        const visitedPaths: any = []
        const tokens0 = pools[key];
        const path = []

        visitedPaths.push(key)

        if (Array.isArray(tokens0)) {
            for (let j in tokens0) {
                const tokens1 = pools[tokens0[j]];

                if (!visitedPaths.includes(tokens0[j])) {

                    visitedPaths.push(tokens0[j])

                    if (Array.isArray(tokens1)) {
                        for (let k in tokens1) {
                            const tokens2 = pools[tokens1[k]];

                            if (!visitedPaths.includes(tokens1[k])) {

                                visitedPaths.push(tokens1[k])

                                const _path = [key, tokens0[j], tokens1[k]]
                                const rearrangedPath = await rearrangePaths(_path)

                                if (rearrangedPath) {
                                    path.push(rearrangedPath)
                                }

                                if (Array.isArray(tokens2)) {
                                    for (let l in tokens2) {
                                        const tokens3 = pools[tokens2[l]];

                                        if (!visitedPaths.includes(tokens2[l])) {

                                            visitedPaths.push(tokens2[l])

                                            const _path = [key, tokens0[j], tokens1[k], tokens2[l]]
                                            const rearrangedPath = await rearrangePaths(_path)

                                            if (rearrangedPath) {
                                                path.push(rearrangedPath)
                                            }


                                            if (Array.isArray(tokens3)) {
                                                for (let m in tokens3) {
                                                    const tokens4 = pools[tokens3[m]];

                                                    if (!visitedPaths.includes(tokens3[m])) {

                                                        visitedPaths.push(tokens3[m])

                                                        const _path = [key, tokens0[j], tokens1[k], tokens2[l], tokens3[m]]
                                                        const rearrangedPath = await rearrangePaths(_path)

                                                        if (rearrangedPath) {
                                                            path.push(rearrangedPath)
                                                        }


                                                        if (Array.isArray(tokens4)) {
                                                            for (let n in tokens4) {
                                                                const tokens5 = pools[tokens4[n]];

                                                                if (!visitedPaths.includes(tokens4[n])) {

                                                                    visitedPaths.push(tokens4[n])

                                                                    const _path = [key, tokens0[j], tokens1[k], tokens2[l], tokens3[m], tokens4[n]]
                                                                    const rearrangedPath = await rearrangePaths(_path)

                                                                    if (rearrangedPath) {
                                                                        path.push(rearrangedPath)
                                                                    }

                                                                    if (Array.isArray(tokens5)) {
                                                                        for (let o in tokens5) {
                                                                            const tokens6 = pools[tokens5[0]];

                                                                            if (!visitedPaths.includes(tokens5[0])) {

                                                                                visitedPaths.push(tokens5[o])

                                                                                const _path = [key, tokens0[j], tokens1[k], tokens2[l], tokens3[m], tokens4[n], tokens5[o]]
                                                                                const rearrangedPath = await rearrangePaths(_path)

                                                                                if (rearrangedPath) {
                                                                                    path.push(rearrangedPath)
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (path.length > 2) {
            swapPaths[key] = path
        }
    }

    return swapPaths

}


// Rearrange the paths such that the arb always ends up to the token that it started with
const rearrangePaths = async (path: string[]) => {

    // If the last path and  the first are the same return the path
    // Nothing needs to be done here
    if (path[0] == path[path.length - 1]) {
        return path
    }

    // Check if there is a pool of the last and first tokens in the path
    // If there is, then append the first token to the end of the path
    const pool = await getDBPool(path[0], path[path.length - 1])

    if (pool) {
        return [...path, path[0]]
    } else {

        // If there in no direct pool between the last and first tokens, 
        // Find if there is any other token in the path that can be used as an in between route
        // to facilitate hopping from the last token to the first token through it.

        for (let i = 1; i < path.length; i++) {
            const poolIn = await getDBPool(path[path.length - 1], path[i])
            const poolOut = await getDBPool(path[i], path[0])

            // If there is a route through the token, append the token and then the first token to the end of the path 
            if (poolIn && poolOut) {
                return [...path, path[i], path[0]]
            } else {
                console.log("No route found to hop through, this path should be discarded ", path)
            }
        }
    }


}




export const fetchAmountOut = async (path: string[], routerAddress: string, amountIn: any) => {
    try {

        const lpPoolContract = new Contract(routerAddress, routerABI, provider)

        if (!amountIn._isBigNumber!) {
            amountIn = `0x${amountIn.toString(16)}`
        }

        const amounts = await lpPoolContract.getAmountsOut(amountIn, path)

        return parseInt(amounts[1]._hex, 16)
    } catch (error) {
        // console.log("Error getting router amount out ", error)
    }
}

export const simulateAmountOut = async (token: string) => {
    try {

        const path = [ADDRESS.wbnbTokenAddress, token]

        // TODO: Convert the signer.getAddress() to a function that can will be called here

        const deadline = utils.hexlify(Math.floor(Date.now() / 1000) + 60)

        const amounts = await routerContract.callStatic.swapExactETHForTokens(minimumAmountOut, path, walletAddress, deadline, { value: oneEther })

        return parseInt(amounts[1]._hex)

    } catch (error) {
        console.log("Error ", error)
    }
}



/**
 * Calculates the percentage a token is charging for transfers
 * @param token The token out of which the amount is being requested
 * @returns The percentage tax amount the token is charging on transfer
 */
// export const getTokenTax = async (tokenIn: string, tokenOut: string, routerAddress: string, amountIn: number): Promise<number | undefined> => {
//     try {
//         const actualAmountOut = await simulateAmountOut(tokenIn)
//         const path = [tokenIn, tokenOut]
//         const taxedAmountOut = await fetchAmountOut(path, routerAddress,  )

//         if (actualAmountOut && taxedAmountOut) {
//             console.log("Actual amount : ", actualAmountOut)
//             console.log("Taxed amount : ", taxedAmountOut)

//             return actualAmountOut / taxedAmountOut
//         } else {
//             console.log("Could not retrieve actual amount out or taxed amount out ", actualAmountOut, taxedAmountOut)
//         }

//     } catch (error) {
//         console.log("Error getting token tax ", error)
//     }
// }


export const getDBPool = async (tokenIn: string, tokenOut: string): Promise<string[] | undefined> => {
    try {
        const pools = await Pool.find(
            { $or: [{ token0: tokenIn, token1: tokenOut }, { token0: tokenOut, token1: tokenIn }] }
        )

        if (pools) {
            let _pools: string[] = [];
            pools.map((pool) => { return _pools.push(pool.lpAddress) })

            return _pools
        }
    }
    catch (error) {
        console.log("Error getting pool with token0 and token1  ", error)
    }

}


export const getFactoryAddress = async (poolAddress: string): Promise<string | undefined> => {
    try {
        const poolContract = getPoolContract(poolAddress)
        const factoryAddress = await poolContract.factory()

        return factoryAddress
    } catch (error) {
        console.log("Error getting factory address ", error)
    }
}
