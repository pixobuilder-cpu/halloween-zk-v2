fn compute_merkle_root(leaf: Field, index: Field, hash_path: [Field; 1]) -> Field {
    let index_bits: [u1; 1] = index.to_le_bits();
    let mut current = leaf;
    for i in 0..1 {
        let path_bit = index_bits[i] != 0;
        let (hash_left, hash_right) = if path_bit {
            (hash_path[i], current)
        } else {
            (current, hash_path[i])
        };
        current = std::hash::pedersen_hash([hash_left, hash_right]);
    }
    current
}

fn main(
    merkle_root: pub Field,
    riddle_commitment: pub Field,
    player_address: Field,
    riddle_secret: Field,
    merkle_proof: [Field; 1],
    merkle_index: Field
) {
    // 1. Secret word verification
    let computed_secret = std::hash::pedersen_hash([riddle_secret]);
    assert(computed_secret == riddle_commitment);

    // 2. Merkle tree inclusion verification
    let leaf = std::hash::pedersen_hash([player_address]);
    let computed_root = compute_merkle_root(leaf, merkle_index, merkle_proof);
    assert(computed_root == merkle_root);
}
