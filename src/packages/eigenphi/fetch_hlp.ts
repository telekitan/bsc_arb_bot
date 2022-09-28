import axios from "axios";

export const fetchHotLiquidityPools = async () => {

  // TODO: fetch the data from the API to be returned, currently using hardcoded values for testing

  try {

    // Fetch hot pools data from eigenphi API
    const { data } = await axios({
      method: "get",
      url: "https://eigenphi.io/api/v1/arbitrage/stat/lp/hotLp/",
      params: {
        chain: "bsc",
        pageSize: 400,
        period: 7,
        sortBy: "volume",
      },
    });

    const hotPools = data.result
    const dbTokenData: any[] = []
    let tokenData: any = {}

    let pools: any = []

    // Format the data to pick only the required properties
    const dbPools = hotPools.map((pool: any) => {
      const lpAddress = pool.lpAddress;
      const tokens = pool.tokens;

      const token0 = tokens[0].address
      const token1 = tokens[1].address

      tokenData[token0] = tokens[0]
      tokenData[token1] = tokens[1]

      // Set the token data in the pools loop
      dbTokenData.push(tokens[0])
      dbTokenData.push(tokens[1])

      pools.push([token0, token1])

      return { lpAddress, token0, token1 };
    });

    return { pools, dbPools, tokenData, dbTokenData }

  } catch (error) {
    console.log(error);
  }
};
