// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HalloweenToken is ERC20 {
    address public immutable gameContract;
    error OnlyGameAllowed();

    constructor(address _gameContract) ERC20("Halloween ZK Token", "HZK") {
        gameContract = _gameContract;
    }

    function mintReward(address to, uint256 amount) external {
        if (msg.sender != gameContract) revert OnlyGameAllowed();
        _mint(to, amount);
    }
}
