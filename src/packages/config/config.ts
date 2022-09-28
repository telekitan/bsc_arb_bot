import { Routers } from "../utils/types"

export const ADDRESS = {
    "routerAddress": "0x10ed43c718714eb63d5aa57b78b54704e256024e",
    "busdTokenAddress": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    "wbnbTokenAddress": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "usdtTokenAddress": "0x55d398326f99059fF775485246999027B3197955",
    "arbBotAddress": "0x6c2B72f1A2f4EC2fF1d1026De635D65E5d60B78b",      // You can change this
}


// REVIEW: The key for the routers (factory addresses) should be entered in lower case
// A list of all exchanges from eigenphi paired with their factory addresses
// for the purpose pf querying the exchanges
export const ROUTERS: Routers = {
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73": "0x10ED43C718714eb63d5aA57B78B54704E256024E",  // pancakeSwap - swapExactETHforTokens
    "0x858e3312ed3a876947ea49d572a7c42de08af7ee": "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",  // BiSwap - swapExactETHforTokens
    "0xd6715a8be3944ec72738f0bfdc739d48c3c29349": "0xD654953D746f0b114d1F85332Dc43446ac79413d",   // nomiSwap - swapExactETHforTokens
    "0x3cd1c46068daea5ebb0d3f55f6915b10648062b8": "0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8",   //mDex - swapExactETHforTokens
    "0x86407bea2078ea5f5eb5a52b2caa963bc1f889da": "0x8317c460C22A9958c27b4B6403b98d2Ef4E2ad32",  // babySwap - swapExactETHforTokens
    "0x0841bd0b734e4f5853f0dd8d7ea041c241fb0da6": "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",   // apeSwap - swapExactETHforTokens
    "0xf0bc2e21a76513aa7cc2730c7a1d6dee0790751f": "0x05E61E0cDcD2170a76F9568a110CEe3AFdD6c46f",   // knightSwap - swapExactETHforTokens
    "0xd654cbf99f2907f06c88399ae123606121247d5c": "0x069A306A638ac9d3a68a6BD8BE898774C073DCb3",    // jSwap - swapExactETHforTokens
    "0x1a04afe9778f95829017741bf46c9524b91433fb": "0x6B45064F128cA5ADdbf79825186F4e3e3c9E7EB5",   // orbitalSwap - swapExactETHforTokens
    "0x98957ab49b8bc9f7ddbcfd8bcc83728085ecb238": "0x5bc3ED94919af03279c8613cB807ab667cE5De99",    // radioShack - swapExactETHforTokens
    "0x01bf7c66c6bd861915cdaae475042d3c4bae16a7": "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F",    // bakerySwap - swapExactBNBforTokens
    "0xc35dadb65012ec5796536bd9864ed8773abc74c4": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",   // sushiSwap - swapExactETHforTokens
    "0x6100af6980d35fdb119bece4969ff6b68da6e4ea": "0xBa67BA73774dA585664661d22775dB9761418dC5",    // annex - swapExactETHforTokens
    "0xd04a80baeef12fd7b1d1ee6b1f8ad354f81bc4d7": "0xF29acE1FE5f36389d0dDe450a0195A30c3770245",     // w3swap - swapExactETHforTokens
    "0x130f7f261b086204c565c7c45025cac128a88612": "0xA8B5D59E36E26769925B22B73Cb1E2c568e2F570",     // PYESwap - swapExactETHforTokens
    "0x9a272d734c5a0d7d84e0a892e891a553e8066dce": "0xB3ca4D73b1e0EA2c53B42173388cC01e1c226F40",     // fstSwap - swapExactETHforTokens
    "0x0eb58e5c8aa63314ff5547289185cc4583dfcbd5": "0xBe65b8f75B9F20f4C522e0067a3887FADa714800",   // JetSwap - swapExactETHforTokens
    "0x8ba1a4c24de655136ded68410e222cca80d43444": "0x0C8094a69e8e44404371676f07B2C32923B5699c",     // sphynx - swapExactETHforTokens
    "0xbcfccbde45ce874adcb698cc183debcf17952812": "0x10ed43c718714eb63d5aa57b78b54704e256024e",     // pancakeSwap - swapExactETHforTokens
    "0xb9fa84912ff2383a617d8b433e926adf0dd3fea1": "0x849B7b4541CDE9cBE41cfd064d9d7fF459b9cEa4",     // NarwhalSwap - swapExactETHforTokens
}

// Profit expected (%)
export const PROFIT_PERCENTAGE = 0.85

/**
 * The amount to be invested on the arb opportunity
 */
export const STABLE_COIN_ARB_AMOUNT = 1000
export const WBNB_ARB_AMOUNT = 2.9


/**
 * Minimum profit expected from the arb opportunities
 */
export const MINIMUM_WBNB_PROFIT = 0.0015   // wbnb
export const MINIMUM_STABLE_COIN_PROFIT = 0.4    // stables

/**
 * Base Tokens 
 * These are the tokens used as the starting point for the swaps
 */
export const BASE_TOKENS = ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x55d398326f99059fF775485246999027B3197955", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"]

/**
 * Slippage percentage to use for each swap in the arb operation
 */

export const ARB_SLIPPAGE = 10


/**
 * TG_USERS is the list of user ids that have the permission to send commands to the bot from Telegram
 */
export const TG_USERS = ["584173555", "1904545054"]
