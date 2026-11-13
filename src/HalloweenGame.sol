// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}

interface IHalloweenToken {
    function mintReward(address to, uint256 amount) external;
}

contract HalloweenGame {
    address public immutable verifier;
    address public token;
    bytes32 public immutable merkleRoot;
    bytes32 public immutable riddleCommitment;
    uint256 public constant REWARD = 13 * 10**18;

    mapping(address => bool) public hasClaimed;
    error AlreadyClaimed();
    error InvalidProof();

    constructor(address _verifier, bytes32 _merkleRoot, bytes32 _riddleCommitment) {
        verifier = _verifier;
        merkleRoot = _merkleRoot;
        riddleCommitment = _riddleCommitment;
    }

    function setToken(address _token) external {
        if (token == address(0)) token = _token;
    }

    function claim(bytes calldata proof, bytes32[] calldata publicInputs) external {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        if (publicInputs.length < 2 || publicInputs[0] != merkleRoot || publicInputs[1] != riddleCommitment) {
            revert InvalidProof();
        }
        if (!IVerifier(verifier).verify(proof, publicInputs)) revert InvalidProof();

        hasClaimed[msg.sender] = true;
        IHalloweenToken(token).mintReward(msg.sender, REWARD);
    }
}
