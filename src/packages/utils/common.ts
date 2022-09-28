import { BigNumber, Contract, providers, utils, Wallet } from "ethers";
import routerABI from "../utils/abi/routerABI.json"
import arbABI from "../utils/abi/arbABI.json"
import { ADDRESS, ROUTERS } from "../config"
import { Pool, Token } from "../db";
import { poolInterface, tokenInterface } from "./types";
import { getFactoryAddress } from "../pools";

// TODO: Implement a project wide check to ensure enviroment variables are provided.
export const provider = new providers.WebSocketProvider(process.env.MAINNET_RPC!)
const signer = new Wallet(process.env.PRIVATE_KEY!)
export const connectedSigner = signer.connect(provider)
export const walletAddress = process.env.WALLET_ADDRESS

export const oneEther = utils.parseEther("1")
export const minimumAmountOut = utils.hexlify(0)

export const routerContract = new Contract(ADDRESS.routerAddress, routerABI, connectedSigner)
export const arbContract = new Contract(ADDRESS.arbBotAddress, arbABI, connectedSigner)


const decimalsABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
]


export const fetchDBPools = async () => {
    try {

        const dbPools = new Map()
        const pools = await Pool.find()

        if (pools.length > 0) {
            for (const pool of pools) {
                dbPools.set(pool.lpAddress, pool)
            }
        }

        return dbPools

    } catch (error) {
        console.log("Error getting pools from DB ", error)
    }
}




export const fetchDBTokens = async () => {
    try {

        const dbTokens = new Map()
        const tokens = await Token.find()

        if (tokens.length > 0) {
            for (const token of tokens) {
                dbTokens.set(token.address, token)
            }
        }

        return dbTokens

    } catch (error) {
        console.log("Error getting pools from DB ", error)
    }
}

export const savePoolsAndTokens = async (pools: poolInterface[], tokens: tokenInterface[]) => {
    // console.log("Pools ", pools)

    // try {
    await Pool.insertMany(pools, { ordered: false })
        .then((pools) => {
            console.log("Pools saved to DB ", pools.length)
        })
        .catch((err) => {
            // console.log("Error saving pools to DB ", err)
        })

    await Token.insertMany(tokens, { ordered: false })
        .then(() => {
            console.log("Tokens saved to DB")
        })
        .catch((err) => {
            // console.log("Error saving tokens to DB ", err)
        })

    // } catch (error) {
    //     console.log("Error saving tokens and pools in bulk ", error)
    // }

}

/**
 * Sorts the amounts out in a descending order.
 * @param amountOuts Array of amount outs to be sorted
 * @returns a sorted array of amount outs in a descending order
 */
export const getSortedAmountOuts = (amountOuts: any) => {
    return amountOuts.sort((a: number, b: number) => b - a);
}

export const getTokenDecimals = async (tokenAddress: string) => {
    try {
        const contract = new Contract(tokenAddress, decimalsABI, provider)

        return await contract.decimals()
    } catch (error) {
        console.log("Error getting token decimals ", error)
    }
}


export const getPathProfitabilty = async (swapRouters: string[], swapTokens: string[], startAmount: string, exchangeFees: number[]) => {
    try {
        // console.log("DATA ", swapRouters, swapTokens, exchangeFees, startAmount)
        const data = await arbContract.getpathprofitability(
            swapRouters,
            swapTokens,
            startAmount,
            exchangeFees
        )

        // console.log("PROFIT ", data)

        const profit = parseInt(data[0]._hex)
        const amountOut = parseInt(data[1]._hex)

        return { profit, amountOut }

    } catch (error) {
        console.log("Error getting path profitability ", error)
    }
}


export const getMostProfitableBuyAmount = async (swapRouters: string[], swapTokens: string[], _exchangeFees: number[], amount: number) => {
    try {

        let _functions = []
        let amounts: any[] = []

        for (let i = 1; i < 1000; i++) {
            amounts.push(amount * (i / 1000))
        }

        for (let i = 0; i < amounts.length; i++) {
            const amount = `0x${amounts[i].toString(16)}`

            _functions.push(getPathProfitabilty(
                swapRouters,
                swapTokens,
                amount,
                _exchangeFees))
        }

        let profitable: any = { profit: 0, percentageProfit: 0, amounts: {}, profitableAmountIn: 0 };

        await Promise.all(_functions).then((data: any) => {
            if (data) {

                let _amounts: any = {}

                for (let i = 0; i < data.length; i++) {
                    let buyAmount = amounts[i]
                    let profit = (data[i].amountOut - buyAmount)

                    let percentageProfit = parseFloat(((profit / buyAmount) * 100).toFixed(2))
                    // console.log("Current profitable ", profitable)
                    // console.log("Check ", buyAmount, data[i].amountOut, percentageProfit, profit, profitable.profit, profit > profitable.profit)

                    _amounts[buyAmount / 10 ** 18] = percentageProfit

                    if (profitable.profit == 0 || profit > profitable.profit) {
                        profitable = { profit, percentageProfit, buyAmount: _amounts, profitableAmountIn: buyAmount };
                    }

                }

            }
        })

        return profitable

    } catch (error) {
        console.log("Error getting most efficient buy amount ", error)
    }
}




export const getMostProfitablePool = async (pairs: string[], path: string[], amountIn: number, exchangeFee: number[]) => {
    try {

        // pools?.filter(pair => [""] pair.toLowerCase() == "0xa57ff643d8d346c17116ac64c1b70808cd231225")

        // console.log("DATA ", pairs, path, amountIn)
        const data = await arbContract.getprofitablepool(pairs, path, amountIn, exchangeFee)

        const profitablePool = data[0]
        const amountOut = data[1]

        return { profitablePool, amountOut }

    } catch (error) {
        // console.log("Error fetching most profitable pool ", error)
    }
}


export const getSafeProfitablePool = async (amountOuts: any, allAmountOuts: any) => {
    for (const amount of amountOuts) {

        // Get the pool which has the given amountOut (amount)
        const pool = Object.keys(allAmountOuts).find(key => allAmountOuts[key] === amount);

        return { pool, highestAmountOut: amount }

        // if (pool) {
        //     // Get the factory address from which the pool was created
        //     // This is used to get the router at which the pool exists for swapping purposes
        //     let profitableFactory = await getFactoryAddress(pool)

        //     if (profitableFactory) {

        //         // Trim and lowercase the factory to be able to access the router address from ROUTERS
        //         profitableFactory = profitableFactory.trim().toLowerCase()
        //         const router = ROUTERS[profitableFactory]

        //         // console.log("Profitable Factory  ", profitableFactory, router)

        //         if (router) {
        //             return { router, highestAmountOut: amount }
        //         } else {
        //             console.log(`Could not get the pools factory address OR the router address (factory: ${profitableFactory})`)
        //         }
        //     }
        // }
    }
}


// Pause execution for the given amount of time
export const wait = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
}
