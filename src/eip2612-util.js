import { ethers } from 'ethers'

const {
  keccak256,
  defaultAbiCoder,
  splitSignature,
  toUtf8Bytes
} = ethers.utils

/*
// same function with below function
export const getDomainSeparator = async ({name, version, chainId, verifyingContract}) => {
  return await ethers.utils._TypedDataEncoder.hashDomain({name, version, chainId, verifyingContract})
}
*/

export const getDomainSeparator = ({name, version, chainId, verifyingContract}) => {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes(version)),
        keccak256(toUtf8Bytes(chainId)),
        verifyingContract
      ]
    )
  )
}

const createPermitMessageData = ({
                                   name,
                                   version,
                                   chainId,
                                   verifyingContract,
                                   owner,
                                   spender,
                                   nonce,
                                   deadline,
                                   value
                                 }) => {
  const message = {
    owner,
    spender,
    nonce: nonce.toString(), // Bignumber rejected in metamask
    deadline: deadline.toString(), // Bignumber rejected in metamask
    value: value.toString() // Bignumber rejected in metamask
  }

  const typedData = {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string'
        },
        {
          name: 'version',
          type: 'string'
        },
        {
          name: 'chainId',
          type: 'uint256'
        },
        {
          name: 'verifyingContract',
          type: 'address'
        }
      ],
      Permit: [
        {
          name: 'owner',
          type: 'address'
        },
        {
          name: 'spender',
          type: 'address'
        },
        {
          name: 'value',
          type: 'uint256'
        },
        {
          name: 'nonce',
          type: 'uint256'
        },
        {
          name: 'deadline',
          type: 'uint256'
        }
      ]
    },
    primaryType: 'Permit',
    domain: {name, version, chainId, verifyingContract},
    message: message
  }

  return {
    typedData,
    message
  }
}

/*
/// Following 2 functions should be used for signing with Metamask
 */
const signDataWithMetamask = async (provider, owner, typeData) => {
  const signature = await provider.send('eth_signTypedData_v3', [owner, typeData])
  const r = signature.slice(0, 66)
  const s = '0x' + signature.slice(66, 130)
  const v = Number('0x' + signature.slice(130, 132))

  return {v, r, s}
}

export const signPermitWithMetamask = async function ({
                                                        provider,
                                                        name,
                                                        version,
                                                        chainId,
                                                        verifyingContract,
                                                        owner,
                                                        spender,
                                                        nonce,
                                                        deadline,
                                                        value
                                                      }) {
  const messageData = await createPermitMessageData({
    name, version, chainId, verifyingContract, owner, spender, nonce, deadline, value
  })
  const sig = await signDataWithMetamask(provider, owner, JSON.stringify(messageData.typedData))
  return Object.assign({}, sig, messageData.message)
}
/*
// End of Metamask sign functions
 */

/*
/// Following function should be used for signing without Metamask
 */
export const signPermitWithSigner = async function ({
                                                      signer,
                                                      name,
                                                      version,
                                                      chainId,
                                                      verifyingContract,
                                                      owner,
                                                      spender,
                                                      nonce,
                                                      deadline,
                                                      value
                                                    }) {
  const {typedData, message} = await createPermitMessageData({
    name, version, chainId, verifyingContract, owner, spender, nonce, deadline, value
  })
  const types = typedData.types
  delete types.EIP712Domain // types should not include EIP712Domain (ref: ethers.js issue)
  const digest = await signer._signTypedData(typedData.domain, types, message)
  const sig = splitSignature(digest)
  return Object.assign({}, sig, message)
}
