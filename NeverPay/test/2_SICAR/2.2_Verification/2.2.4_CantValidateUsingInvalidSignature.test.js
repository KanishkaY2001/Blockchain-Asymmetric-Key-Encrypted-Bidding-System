const NeverPaySmartContract = artifacts.require('NeverPayShares.sol');
const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');
const truffleAssert = require('truffle-assertions');
const InvestorLogic = require('../../../offchain/InvestorLogic.js');
const CertificationLogic = require('../../../offchain/CertificationLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        NeverPayShares = await NeverPaySmartContract.deployed();
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let investor = accounts[2];
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;

    let investorBidInformation = InvestorLogic.getBidHash(10, 1);
    let bidHash = investorBidInformation.hash;

    it("Test that an invalid signature, (that is not signed by an authority) can't be validated", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        let invalidRandomSignature = web3.utils.randomHex(65);
        await truffleAssert.reverts(NeverPayShares.bid(bidHash, 0, invalidRandomSignature, {from: investor}));
    })
})