const pools = [
    [
        "WBNB",
        "BUSD"
    ],
    [
        "USDT",
        "WBNB"
    ],
    [
        "USDT",
        "WBNB"
    ],
    [
        "USDT",
        "FIST"
    ],
    [
        "USDC",
        "WBNB"
    ],
    [
        "BTCB",
        "BUSD"
    ],
    [
        "FON",
        "USDT"
    ],
    [
        "ETH",
        "USDT"
    ],
    [
        "ETH",
        "USDC"
    ],
    [
        "Cake",
        "WBNB"
    ],
    [
        "BTCB",
        "WBNB"
    ],
    [
        "USDT",
        "BTCB"
    ],
    [
        "ETH",
        "WBNB"
    ],
    [
        "USDT",
        "BUSD"
    ]
]

const allPairs: any[] = []


const calculatePaths = (pools: string[]) => {

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

// calculatePaths()