const NeverPaySmartContract = artifacts.require('NeverPayShares.sol');
const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');

const CertificationLogic = require('../../../offchain/CertificationLogic.js');
const InvestorLogic = require('../../../offchain/InvestorLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        NeverPayShares = await NeverPaySmartContract.deployed();
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let investor = accounts[2];

    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;
    let certificateSignature = CertificationLogic.createCertificate(investor).signature;
    let investorBidInformation = InvestorLogic.getBidHash(10, 1);
    let bidHash = investorBidInformation.hash;

    it("Test that an investor may place a single bid and withdraw this bid", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});
        let bidInformation = await NeverPayShares.roundOneData.call(bidHash, {from: investor});
        assert.notEqual(bidInformation.id, 0, "Investor crypto address was not saved onchain");
        assert.notEqual(bidInformation.order, 0, "Investor's bid order number was not saved onchain");

        await NeverPayShares.bid(bidHash, 1, certificateSignature, {from: investor});
        bidInformation = await NeverPayShares.roundOneData.call(bidHash, {from: investor});
        assert.notEqual(bidInformation.id, 0, "Investor crypto address was removed from onchain, which is not intended");
        assert.equal(bidInformation.order, 0, "Investor's bid order number still exists onchain, which is not intended");

    })
})