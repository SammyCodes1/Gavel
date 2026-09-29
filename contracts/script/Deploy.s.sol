// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Gavel} from "../src/Gavel.sol";

/// @notice Deploys Gavel with the official Circle USDC address for the current network.
/// @dev Run with a Foundry keystore account, never a raw private key:
///      forge script script/Deploy.s.sol --rpc-url $MONAD_TESTNET_RPC_URL --account gavel-deployer --broadcast
contract Deploy is Script {
    uint256 internal constant MONAD_TESTNET = 10143;
    uint256 internal constant MONAD_MAINNET = 143;

    // Official USDC (Circle), 6 decimals.
    address internal constant USDC_TESTNET = 0x534b2f3A21130d7a60830c2Df862319e593943A3;
    address internal constant USDC_MAINNET = 0x754704Bc059F8C67012fEd69BC8A327a5aafb603;

    error UnsupportedChain(uint256 chainId);

    /// @notice Pick the USDC address for this chain, or revert on any other chain.
    function usdcForChain(uint256 chainId) public pure returns (address) {
        if (chainId == MONAD_TESTNET) return USDC_TESTNET;
        if (chainId == MONAD_MAINNET) return USDC_MAINNET;
        revert UnsupportedChain(chainId);
    }

    /// @notice Deploy Gavel and log the addresses used.
    function run() external returns (Gavel gavel) {
        address usdcAddress = usdcForChain(block.chainid);

        vm.startBroadcast();
        gavel = new Gavel(usdcAddress);
        vm.stopBroadcast();

        console.log("Chain ID:", block.chainid);
        console.log("USDC address:", usdcAddress);
        console.log("Gavel deployed at:", address(gavel));
    }
}
