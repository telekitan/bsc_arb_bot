// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract Swapper is Ownable {
    using SafeERC20 for IERC20;
    // Modifier to ensure transaction is confirmed within the specified time period
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "UniswapV2Router: EXPIRED");
        _;
    }

    function _slippagedamountout(
        address[] memory path,
        address pair,
        uint256 amountIn,
        uint256 exchangeFee,
        uint256 slippage
    ) internal view returns (uint256) {
        require(slippage < 100, "Err: 005"); // slippage must be less than 100%

        (uint256 reserveIn, uint256 reserveOut, ) = _getreserves(
            path[0],
            path[path.length - 1],
            pair
        );

        // TODO: Replace this with actual calculation from the respective pair the tokens belong to
        // Calculate the amount out
        uint256 amountOut = _getamountout(
            amountIn,
            reserveIn,
            reserveOut,
            exchangeFee
        );

        // Get the slippaged amount out
        uint256 slippagedAmountOut = (amountOut * (100 - slippage)) / 100;

        return slippagedAmountOut;
    }

    function getprofitablepool(
        address[] memory pairs,
        address[] memory path,
        uint256 startAmount,
        uint256[] memory exchangeFees
    ) external view returns (address profitablePool, uint256 amountOut) {
        // If there is only one pool supporting the tokens, return the pair and the amountOut from that pool
        if (pairs.length == 1) {
            (uint256 reserveIn, uint256 reserveOut, ) = _getreserves(
                path[0],
                path[1],
                pairs[0]
            );

            amountOut = _getamountout(
                startAmount,
                reserveIn,
                reserveOut,
                exchangeFees[0]
            );

            profitablePool = pairs[0];
        } else {
            uint256 previousAmount = 0;

            for (uint256 i = 0; i < pairs.length; i++) {
                // _getreserves sorts tokens and the reserves before returning them so we don't need
                // to sort them before passing them through _getreserves
                (uint256 reserveIn, uint256 reserveOut, ) = _getreserves(
                    path[0],
                    path[1],
                    pairs[i]
                );

                uint256 _amountOut = _getamountout(
                    startAmount,
                    reserveIn,
                    reserveOut,
                    exchangeFees[i]
                );

                if (_amountOut > previousAmount) {
                    profitablePool = pairs[i];
                    amountOut = _amountOut;
                    previousAmount = _amountOut;
                }
            }
        }
    }

    function getpathprofitability(
        address[] memory pairs,
        address[] memory paths,
        uint256 startAmount,
        uint256[] memory exchangeFees
    ) external view returns (uint256 profit, uint256 amountOut) {
        require(
            pairs.length == paths.length - 1,
            "Path or Pairs invalid length "
        );

        uint256 _startAmount = startAmount;

        for (uint256 i = 0; i <= pairs.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut, ) = _getreserves(
                paths[i],
                paths[i + 1],
                pairs[i]
            );

            amountOut = _getamountout(
                _startAmount,
                reserveIn,
                reserveOut,
                exchangeFees[i]
            );

            // console.log("Each amount out", amountOut);

            _startAmount = amountOut;
        }

        profit = amountOut > startAmount ? amountOut - startAmount : 0;

        // console.log("Amounts ", amountOut, startAmount, profit);
    }

    // Sorts tokens
    // Gets their reserves and sorts the reserves
    // Also returns token0 (already sorted) to be used later on
    function _getreserves(
        address tokenA,
        address tokenB,
        address pairAddress
    )
        internal
        view
        returns (
            uint256 reserveA,
            uint256 reserveB,
            address token0
        )
    {
        (token0, ) = sortTokens(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pairAddress)
            .getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    function _swap(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address pair,
        address to,
        uint256 exchangeFee
    ) internal ensure(block.timestamp) {
        // Approve tokens before before transferring them to the pair
        IERC20 fromToken = IERC20(path[0]);
        IERC20 toToken = IERC20(path[path.length - 1]);

        // Transfer tokens from caller to pair
        fromToken.safeTransfer(pair, amountIn);

        // Store the balanceBefore to be used to check that we don't get lower than the minimum amountOut
        uint256 balanceBefore = toToken.balanceOf(to);

        _swapsupportingfeeontransfertokens(
            address(fromToken),
            path[1],
            to,
            pair,
            exchangeFee
        );

        // console.log(
        //     "Balance After swap",
        //     to,
        //     address(toToken),
        //     toToken.balanceOf(to)
        // );

        require(
            ((toToken.balanceOf(to)) - balanceBefore) >= amountOutMin,
            "UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT"
        );
    }

    // Since the path involves swapping on different pairs,
    // we are not lopping through the path array but assuming that
    // the pair will include 2 tokens only (tokenA and tokenB)
    function _swapsupportingfeeontransfertokens(
        address input,
        address output,
        address to,
        address pair,
        uint256 exchangeFee
    ) internal {
        (
            uint256 reserveInput,
            uint256 reserveOutput,
            address token0
        ) = _getreserves(input, output, pair);

        // console.log(
        //     "Pair balance ",
        //     IERC20(input).balanceOf(pair),
        //     reserveInput,
        //     IERC20(input).balanceOf(pair) - reserveInput
        // );

        // console.log("Pair ", address(pair));

        uint256 amountInput = (IERC20(input).balanceOf(pair)) - reserveInput;
        uint256 amountOutput = _getamountout(
            amountInput,
            reserveInput,
            reserveOutput,
            exchangeFee
        );

        (uint256 amount0Out, uint256 amount1Out) = input == token0
            ? (uint256(0), amountOutput)
            : (amountOutput, uint256(0));

        // Swap tokens using pair
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, to, new bytes(0));
    }

    function _getamountout(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 exchangeFee
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "UniswapV2Library 1: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
        );

        uint256 amountInWithFee = amountIn * (1000 - exchangeFee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "UniswapV2Library: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV2Library: ZERO_ADDRESS");
    }

    function executearb(
        address[] calldata tokens,
        address[] calldata pairs,
        uint256[] calldata exchangeFees,
        uint256 arbAmount,
        uint256 profitAmount,
        uint256 slippage
    ) external payable onlyOwner {
        require(pairs.length == tokens.length - 1, "Err: 001"); // Invalid parameters: routers.length should be equal to tokens.length - 1

        address lastToken = tokens[tokens.length - 1];
        require(tokens[0] == lastToken, "Err: 002"); // Invalid path: The path should end with the tokens it started with

        // Pull the start token from the callers wallet using transferFrom
        IERC20(tokens[0]).transferFrom(msg.sender, address(this), arbAmount);

        // Initialize the path array once to reduce gas consumption
        // Its cheaper to update a non-zero
        address[] memory path = new address[](2);

        for (uint256 i = 0; i < pairs.length; i++) {
            path[0] = tokens[i];
            path[1] = tokens[i + 1];

            uint256 amountIn = IERC20(path[0]).balanceOf(address(this));
            require(amountIn > 0, "Err: 006"); // Invalid amount: The amount In should be greater than 0

            uint256 amountOutMin = _slippagedamountout(
                path,
                pairs[i],
                amountIn,
                exchangeFees[i],
                slippage
            );

            _swap(
                amountIn,
                amountOutMin,
                path,
                pairs[i],
                address(this),
                exchangeFees[i]
            );
        }

        uint256 endBalance = IERC20(lastToken).balanceOf(address(this));

        require(endBalance > (arbAmount + profitAmount), "Err: 003"); // Not profitable: The end balance should be greater than the start amount

        IERC20(lastToken).transfer(msg.sender, endBalance);
    }

    function withdrawtokens(IERC20 token, uint256 amount) external onlyOwner {
        address self = address(this);

        // Either withdraw the whole amount or the amount specified
        uint256 tokenBalance = token.balanceOf(self);
        amount = amount > 0 ? amount : tokenBalance;

        require(amount <= tokenBalance, "Err: 004"); // Not enough tokens to withdraw

        IERC20(token).transfer(msg.sender, amount);
    }

    function approve(
        IERC20 token,
        address spender,
        uint256 amount
    ) external onlyOwner {
        token.approve(spender, amount);
    }

    function withdrawether() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function destroysmartcontract(address payable _to) external onlyOwner {
        selfdestruct(_to);
    }
}
