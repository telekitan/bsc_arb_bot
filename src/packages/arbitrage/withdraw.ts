import { Contract } from "ethers"
import { ADDRESS } from "../config"
import { arbContract, provider } from "../utils"
import { txStatus } from "../utils/types"

export const tokenABI = [
    {
        "constant": true,
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
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
    },

]

export const withdrawTokens = async (token: string, withdrawAmount: number, slippage: number): Promise<txStatus | undefined> => {
    try {

        const tokenContract = new Contract(token, tokenABI, provider)
        const tokenBalance = tokenContract.balanceOf(ADDRESS.arbBotAddress)
        const tokenDecimals = await tokenContract.decimals()

        withdrawAmount = withdrawAmount * 10 ** tokenDecimals

        if (tokenBalance > withdrawAmount) {
            const tx = await arbContract.callStatic.withdrawTokens(token, withdrawAmount, slippage)

            tx.wait().then(() => {
                console.log(`\n\n Transaction submitted : ${tx}`)

                return { status: true, hash: tx.hash }

            })
                .catch((error: any) => {
                    console.log(`\n\n Transaction failed : ${error}`)

                    return { status: false, error }
                })

        } else {
            return { status: false, reason: "Not enough balance to withdraw" }
        }
    } catch (error) {
        console.log("Error withdrawing tokens ", error)
    }
}