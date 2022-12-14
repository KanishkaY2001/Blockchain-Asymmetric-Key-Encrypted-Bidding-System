const ethers = require('ethers');
const Web3 = require("web3");
let web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));

const NeverPaySmartContract = artifacts.require('NeverPayShares.sol');
const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');

const CertificationLogic = require('../../../offchain/CertificationLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        NeverPayShares = await NeverPaySmartContract.deployed();
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let investor = accounts[2];

    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;
    let certificateSignature = CertificationLogic.createCertificate(investor).signature;

    let nonce = web3.utils.randomHex(32);
    let packedBidInput = ethers.utils.solidityPack(["uint256", "uint256", "bytes32"], [20, 4, nonce]);
    let bidHash = web3.utils.keccak256(packedBidInput).toString('hex');

    it("Test that the bid does not publically reveal the investor's shares or price per share", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});
        assert.notEqual(bidHash, 25, "bid reveals the number of shares that the investor bids for");
        assert.notEqual(bidHash, 4, "bid reveals the price that the investor is willing to pay per share");
    })
})