import { BigNumber } from "ethers"
import { ARB_SLIPPAGE } from "../config"
import { sendNotification } from "../telegram"
import { failedTxnMessage } from "../telegram/messages"
import { arbContract, wait } from "../utils"

export const executeArb = async (tokens: string[], routers: string[], exchangeFees: number[], buyAmount: any, profit: any) => {
    try {

        console.log("Tokens ", tokens)
        console.log("Routers ", routers)

        if (!buyAmount._isBigNumber!) {
            buyAmount = `0x${buyAmount.toString(16)}`
        }

        profit = `0x${parseInt(profit).toString(16)}`

        const tx = await arbContract.executearb(
            tokens,
            routers,
            exchangeFees,
            buyAmount,
            profit,
            ARB_SLIPPAGE,
            {
                gasLimit: 3000000
            }
        )

        const txn = await tx.wait()

        console.log("Txn : ", txn)

        await wait(5000)

        return txn

    } catch (error: any) {
        console.log("Error ", error)

        await sendNotification(failedTxnMessage(tokens, error))
    }
}



export const getTransactionCost = async (tokens: string[], routers: string[], exchangeFees: number[], buyAmount: any, profit: any) => {
    try {

        console.log("\n\n Data ", tokens, routers, buyAmount)

        if (!buyAmount._isBigNumber!) {
            buyAmount = `0x${buyAmount.toString(16)}`
        }

        profit = `0x${parseInt(profit).toString(16)}`

        const estimatedGas = await arbContract.estimateGas.executearb(
            tokens,
            routers,
            exchangeFees,
            buyAmount,
            profit,
            ARB_SLIPPAGE
        )

        return parseInt(estimatedGas._hex, 16)

    } catch (error) {
        console.log("Error getting transaction cost ", error)
    }
}