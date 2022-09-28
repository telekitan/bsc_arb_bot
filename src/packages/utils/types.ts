export interface PoolData {
    lpAddress: string,
    token0: string,
    token1: string,
}


export interface poolInterface {
    lpAddress: string,
    token0: string,
    token1: string
}

export interface tokenInterface {
    address: string,
    symbol: string,
    decimals: number
}

export interface Routers {
    [key: string]: string
}

export interface txStatus {
    status: boolean,
    hash?: string,
    error?: string,
    reason?: string
}