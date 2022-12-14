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

    it("Test that a single investor may place multiple bids, and withdraw multiple bids", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        let totalBids = 5;
        let bids = [];

        for (let numberOfBids = 0; numberOfBids < totalBids; ++numberOfBids) {
            let investorBidInformation = InvestorLogic.getBidHash(10 + numberOfBids, 1);
            let bidHash = investorBidInformation.hash;
            await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});

            let bidInformation = await NeverPayShares.roundOneData.call(bidHash, {from: investor});
            assert.notEqual(bidInformation.id, 0, "Investor crypto address was not saved onchain");
            assert.notEqual(bidInformation.order, 0, "Investor's bid order number was not saved onchain");

            bids.push(bidHash);
        }

        for (let numberOfBids = 0; numberOfBids < totalBids; ++numberOfBids) {
            let bidHash = bids[numberOfBids];
            await NeverPayShares.bid(bidHash, 1, certificateSignature, {from: investor});

            bidInformation = await NeverPayShares.roundOneData.call(bidHash, {from: investor});
            assert.notEqual(bidInformation.id, 0, "Investor crypto address was removed from onchain, which is not intended");
            assert.equal(bidInformation.order, 0, "Investor's bid order number still exists onchain, which is not intended");
        }
    })
})