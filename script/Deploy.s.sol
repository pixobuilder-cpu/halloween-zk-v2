// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {HalloweenGame} from "../src/HalloweenGame.sol";
import {HalloweenToken} from "../src/HalloweenToken.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address verifierAddress = 0xD72b42CF147c6c3FC6e6E31817c2C937843738DE;

        bytes32 merkleRoot = 0x01d3465393c42331e125582f6cf5a95d7c2c115da91b985dba0dc43bbaf4875d;
        bytes32 secretHash = 0x13f8865c30093ba0bc9114e0d1f9aec79f2522a4254d1af5b861897a5604bb21;

        vm.startBroadcast(deployerPrivateKey);

        HalloweenGame game = new HalloweenGame(verifierAddress, merkleRoot, secretHash);
        HalloweenToken token = new HalloweenToken(address(game));
        game.setToken(address(token));

        vm.stopBroadcast();
    }
}
