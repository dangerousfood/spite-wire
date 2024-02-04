import { MerkleTree } from 'merkletreejs'
import { Uint256, Tree, Bytes32, Leaf } from './tree';
const keccak256 = require('keccak256')

export const encodeUint256 = (value: bigint) => {
  let hexString = value.toString(16)
  hexString = hexString.padStart(64 - hexString.length, '0');
  
  return Uint256.create(split256BitHexStringTo64Bit(hexString));
}

export const encodeBytes32 = (value: string):Bytes32 => {
  const hexString = value.padStart(64 - value.length, '0');
  
  return Bytes32.create(split256BitHexStringTo64Bit(hexString));
}

const split256BitHexStringTo64Bit = (hexString: string) => {
  return {
    part4: BigInt('0x' + hexString.substring(0, 16)),
    part3: BigInt('0x' + hexString.substring(16, 32)),
    part2: BigInt('0x' + hexString.substring(32, 48)),
    part1: BigInt('0x' + hexString.substring(48, 64))
  }
}

export const encodeTree = (merkleTree: MerkleTree):Tree => {
  const tree = Tree.create();
  tree.root = encodeBytes32(merkleTree.getRoot().toString('hex'));
  tree.leaves = merkleTree.getLeaves().reduce((acc: Leaf[], buffer: Buffer, index: number) => {
    const leafHash = encodeBytes32(buffer.toString('hex'))
    const leafIndex = encodeUint256(BigInt(index))
    acc.push(Leaf.create({
      leafHash,
      index: leafIndex
    }))

    return acc;
  }, [] as Leaf[])

  return tree
}

function decodeUint256(message: Uint256 | Bytes32): bigint {
  const part1 = BigInt(message.part1 || 0);
  const part2 = BigInt(message.part2 || 0);
  const part3 = BigInt(message.part3 || 0);
  const part4 = BigInt(message.part4 || 0);
  const result = (part4 << BigInt(48)) | (part3 << BigInt(32)) | (part2 << BigInt(16)) | part1;

  return result;
}

export const decodeTree = (tree: Tree):MerkleTree => {
  const leaves = tree.leaves.reduce((acc: Array<string>, leaf: Leaf) => {
    if(!leaf.index || !leaf.leafHash) throw new Error('Leaf.index or Leaf.leafHash failed to deserialize properly');
    const index = Number(decodeUint256(leaf.index))
    acc[index] = decodeUint256(leaf.leafHash).toString(16)
    return acc
  }, new Array(tree.leaves.length))

  return new MerkleTree(leaves, keccak256, { sort: true });
}

const generateString = (length: number) => {
  const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = ' ';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const getRandomArrayOfStrings = (arrayLength: number, length: number) => {
  const leaves:string[] = []
  for(let i = 0; i < arrayLength; i++){
    leaves.push(generateString(length))
  }
  return leaves
}

// generate random leaves
const leaves:string[] = getRandomArrayOfStrings(100, 5)
// construct merkle tree
const expectedMerkleTree = new MerkleTree(leaves, keccak256, { sort: true })
// store hex root
const expectedRoot = expectedMerkleTree.getHexRoot();
// encode
const expectedTree = encodeTree(expectedMerkleTree)
// serialize
const treeBytes = Tree.toBinary(expectedTree)
// deserialize
const actualTree = Tree.fromBinary(treeBytes)
// decode
const actualMerkleTree = decodeTree(actualTree)

const actualRoot = actualMerkleTree.getHexRoot()
// check hex roots match
if(expectedRoot === actualRoot){
  console.log('If you are reading this, you are officially wrong. Your misunderstanding about how protobufs determinstic is reliant on the faulty assumption that a wire protocol must also be the block encoding schema')
}