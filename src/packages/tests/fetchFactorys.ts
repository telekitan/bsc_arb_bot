import axios from "axios"
import { Contract } from "ethers"
import "../db/connect"
import { Pool, Token } from "../db"
import { connectedSigner, provider } from "../utils"
import { ADDRESS } from "../config"


const getTokensABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "token0",
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
    {
        "constant": true,
        "inputs": [],
        "name": "token1",
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
    {
        "constant": true,
        "inputs": [],
        "name": "factory",
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
    }
]

const getliquidityPools = async (url: string) => {
    try {

        // REVIEW Uncommented this line to get the data from the database
        const { data } = await axios.get(url)
        const pools = data.result.data

        console.log(pools.length)

        for (const pool of pools) {
            const lpAddress = pool.lpAddress

            const liquidityPool = new Contract(lpAddress, getTokensABI, provider)

            const token0 = await liquidityPool.token0()
            const token1 = await liquidityPool.token1()

            const data = { lpAddress: lpAddress.toLowerCase(), token0: token0.toLowerCase(), token1: token1.toLowerCase() }

            const _newPool = new Pool(data)
            await _newPool.save()
                .then(() => console.log(`Pool ${lpAddress} saved`))
                .catch((err) => console.log("Error saving ", err))
        }

    } catch (error) {
        console.log("Error fetching data ", error)
    }
}

const getTokens = async (url: string) => {
    try {
        const { data } = await axios.get(url)

        const tokens = data.result.data

        console.log(tokens.length)

        for (const token of tokens) {

            await Token.insertMany(token.tokens, { ordered: false })
                .then(() => {
                    console.log("Tokens saved successfully ")
                })
                .catch((err) => {
                    console.log("Error saving tokens ", err)
                })
        }


    } catch (error) {
        console.log("Error fetching token data ", error)
    }
}

const approveABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "guy",
                "type": "address"
            },
            {
                "name": "wad",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const approveBaseTokens = async (baseTokens: string[]) => {
    const MAX_INT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    try {
        for (let i = 0; i < baseTokens.length; i++) {
            const token = baseTokens[i];

            console.log("\n\n Approving ", token)

            const contract = new Contract(token, approveABI, connectedSigner)

            await contract.approve(ADDRESS.arbBotAddress, MAX_INT)
        }
    } catch (error) {
        console.log("Error approving token ", error)
    }
}

// approveBaseTokens([ADDRESS.wbnbTokenAddress, ADDRESS.busdTokenAddress, ADDRESS.usdtTokenAddress])

getTokens("https://eigenphi.io/api/v2/arbitrage/stat/lp/hotLp/?chain=bsc&pageSize=1000&period=7&sortBy=volume")

// getliquidityPools("https://eigenphi.io/api/v2/arbitrage/stat/lp/hotLp/?chain=bsc&pageSize=1000&period=7&sortBy=volume")