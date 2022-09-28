



export const helpMessage = () => {
    let help = "Welcome to the BSC Arb Bot"
    help += "\n\nTo operate the bot, send one of the commands below: "
    help += "\n\n\n👉 Withdraw: "
    help += "\n\nwithdraw, token, amount, slippage"
    help += "\n\nExample: 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56, 1000000, 10"
    return help
}

export const txMessage = (txHash: string) => {
    let message = "Successfully sent transaction: "
    message += `\n\nTransaction: " https://bscscan.com/tx/${txHash}`
    return message
}

export const arbMessage = (path: string[], arbAmount: number, percentageProfit: number, profit: number, txHash: string) => {
    let message = "Bot captured an ARB opportunity"
    message += "\n\nPath: "
    message += `\n${path}`
    message += "\n\nBuy Amount: "
    message += `\n${arbAmount.toFixed(2)} ${path[0]}`
    message += "\n\nProfit %"
    message += `\n${percentageProfit} %`
    message += "\n\nExpected profit"
    message += `\n${profit.toFixed(2)} ${path[0]}`
    message += "\n\nTransaction hash"
    message += `\nhttps://bscscan.com/tx/${txHash}`

    return message
}

export const failedTxnMessage = (path: string[], error: string) => {
    let message = "Failed to execute ARB transaction"
    message += "\n\nPath: "
    message += `\n${path}`
    message += "\n\nError: "
    message += `\n${error}`

    return message
}