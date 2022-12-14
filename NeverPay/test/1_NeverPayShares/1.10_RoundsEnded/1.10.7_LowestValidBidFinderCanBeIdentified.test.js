const timeMachine = require('ganache-time-traveler');

const NeverPaySmartContract = artifacts.require('NeverPayShares.sol');
const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');

const CertificationLogic = require('../../../offchain/CertificationLogic.js');
const InvestorLogic = require('../../../offchain/InvestorLogic.js');

contract('NeverPayShares', (accounts) => {

    beforeEach(async() => {
        let snapshot = await timeMachine.takeSnapshot();
        snapshotId = snapshot['result'];
    });
 
    afterEach(async() => {
        await timeMachine.revertToSnapshot(snapshotId);
    });

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
    let shares = investorBidInformation.shares;
    let price = investorBidInformation.price;
    let nonce = investorBidInformation.nonce;
    let valueOfSharesInWei = investorBidInformation.valueOfSharesInWei;

    it("Test that the bidder with the lowest valid bid can be identified to receive incentives", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});
        
        timeMachine.advanceBlockAndSetTime(1650412800 + 1000);

        await NeverPayShares.purchaseShares(shares, price, nonce, nonce, {from: investor, value: valueOfSharesInWei});

        timeMachine.advanceBlockAndSetTime(1651017600 + 1000);

        await NeverPayShares.claimShares(bidHash, {from: investor, gas: 6721975});
        let lowestValidFinder = await NeverPayShares.lowestValidFinder({from: investor});
        let lowestValidBidHashFinder = await NeverPayShares.roundTwoData(lowestValidFinder, {from: investor})

        assert.notEqual(lowestValidBidHashFinder, 0, "LowestValidBid has not been found, which goes against intended design")
    })
})