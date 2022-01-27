import React, { useState } from 'react'
import { ethers } from 'ethers'
import GLMR from './artifacts/contracts/GlmrMock.sol/GLMR.json'
import { getDomainSeparator, signPermitWithSigner } from './eip2612-util'

require('dotenv').config()
// constant variables

const symbol = 'GLMR'
const mintAmount = '100000'
const contractVersion = '1'
const chainId = parseInt(process.env.REACT_APP_CHAIN_ID)
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS

const SmartContract = () => {

  // state variables
  const [signer, setSigner] = useState()
  const [contract, setContract] = useState()
  const [contractInfo, setContractInfo] = useState()
  const [status, setStatus] = useState()
  const [tokenBalance, setTokenBalance] = useState('0')

  const [mintStatus, setMintStatus] = useState()

  const [spender, setSpender] = useState('')
  const [amount, setAmount] = useState('')
  const [transferStatus, setTransferStatus] = useState('')

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const network = await provider.getNetwork()
        if (network.chainId === chainId) {
          await provider.send('eth_requestAccounts', [])
          const signer = provider.getSigner()
          const address = await signer.getAddress()
          const balance = await signer.getBalance()
          const contract = new ethers.Contract(contractAddress, GLMR.abi, signer)
          setSigner({account: signer, address, balance})
          setContract(contract)
          setStatus(null)
          await fetchContractInfo(contract)
          await fetchTokenBalance(contract, address)
        } else {
          setSigner(null)
          setContract(null)
          setStatus('Please choose Mumbai network and connect again.')
        }
      } catch (err) {
        setSigner(null)
        setContract(null)
        setStatus('😥 ' + err.message)
      }
    } else {
      setSigner(null)
      setContract(null)
      setStatus(
        <span>
          <p>
            {' '}
            🦊{' '}
            <a target="_blank" rel="noreferrer" href={`https://metamask.io/download.html`}>
              You must install Metamask, a virtual Ethereum wallet, in your
              browser.
            </a>
          </p>
        </span>
      )
    }
  }

  const mint = async () => {
    try {
      const result = await (await contract.mint(ethers.utils.parseEther(mintAmount))).wait()
      // console.log(result)
      if (result.status === 1) {
        await fetchTokenBalance(contract, signer.address)
      }
    } catch (err) {
      setMintStatus('😥 ' + err.message)
    }
  }

  const fetchContractInfo = async (contract) => {
    try {
      const name = await contract.name()
      const domainSeparator = await contract.DOMAIN_SEPARATOR()
      const calculatedDomainSeparator = await getDomainSeparator({
        name,
        version: contractVersion,
        chainId,
        verifyingContract: contractAddress
      })
      setContractInfo({name, domainSeparator, calculatedDomainSeparator})
    } catch (err) {
      console.log(err)
      setMintStatus('😥 ' + err.message)
    }
  }

  const fetchTokenBalance = async (contract, address) => {
    try {
      const tokenBalance = await contract.balanceOf(address)
      setTokenBalance(tokenBalance)
    } catch (err) {
      console.log(err)
      setMintStatus('😥 ' + err.message)
    }
  }

  const permit = async () => {
    if (!amount) {
      setTransferStatus('Input transfer amount')
      return
    }
    if (!spender) {
      setTransferStatus('Input spender address')
      return
    }
    // TODO: address validation of spender

    // permit parameters
    /// For gasless transaction, owner and signer of contract should be different.
    /// Signer of contract will charge gas, owner should be token holder.
    const owner = signer.address
    const nonce = await contract.nonces(owner)
    const value = ethers.utils.parseEther(amount)
    const deadline = ethers.constants.MaxUint256

    // Sign with Metamask
    // const signature = await signPermitWithMetamask({
    //   provider: signer.account.provider, // ethers.js provider
    //   name: contractInfo.name, // contract name
    //   version: contractVersion,
    //   chainId,
    //   verifyingContract: contractAddress,
    //   owner,
    //   spender,
    //   nonce,
    //   deadline,
    //   value
    // })
    // console.log(signature)

    // Sign without Metamask
    const signature = await signPermitWithSigner({
      signer: signer.account, // signer
      name: contractInfo.name, // contract name
      version: contractVersion,
      chainId,
      verifyingContract: contractAddress,
      owner,
      spender,
      nonce,
      deadline,
      value
    })
    // console.log(signature)
    // Both signature With Metamask and signature With Signer are exactly matched.

    // contract permit
    await contract.permit(owner, spender, value, deadline, signature.v, signature.r, signature.s)
  }

  //the UI of our component
  return (
    <div id="container">
      {
        signer ?
          <>
            <p style={{paddingTop: '50px'}}><b>Connected Address:</b> {signer.address}</p>
            <p><b>ETH Balance:</b> {ethers.utils.formatEther(signer.balance)} ETH</p>
            <p><b>{symbol} Balance:</b> {ethers.utils.formatEther(tokenBalance)} {symbol}</p>
          </>
          :
          <button id="walletButton" onClick={connectWallet}>
            <span>Connect Wallet</span>
          </button>
      }
      {
        status &&
        <p id="status">{status}</p>
      }
      {
        signer && contract &&
        <>
          {
            contractInfo &&
            <>
              <h2 style={{paddingTop: '50px'}}>Contract Information:</h2>
              <p><b>Contract Name:</b> {contractInfo.name} </p>
              <p><b>Domain Separator is
                matched:</b> {(contractInfo.domainSeparator === contractInfo.calculatedDomainSeparator).toString()}</p>
              <p><b>Fetched Domain Separator:</b> {contractInfo.domainSeparator}</p>
              <p><b>Calculated Domain Separator:</b> {contractInfo.calculatedDomainSeparator}</p>
            </>
          }
          <h2 style={{paddingTop: '50px'}}>Mint {mintAmount} {symbol}:</h2>
          <p id="status">{mintStatus}</p>
          <button id="mint" onClick={mint}>
            Mint {symbol}
          </button>
          <h2 style={{paddingTop: '5px'}}>Permit</h2>
          <div>
            <input
              type="text"
              placeholder="Enter Spender Address 0x..."
              onChange={(e) => setSpender(e.target.value)}
              value={spender}
            />
            <input
              type="text"
              placeholder="Enter Amount (to be transferred)"
              onChange={(e) => setAmount(e.target.value)}
              value={amount}
            />
            <p id="status">{transferStatus}</p>
            <button id="publish" onClick={permit}>
              Permit
            </button>
          </div>
        </>
      }
    </div>
  )
}

export default SmartContract
