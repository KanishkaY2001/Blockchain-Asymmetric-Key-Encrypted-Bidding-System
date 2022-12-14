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
    let totalInvestors = 2;
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;
    
    it("Test that a bid higher than the top bid (tail node) will be ordered higher than it", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        let investorBidInformationArray = [];

        for (let numberOfInvestors = 0; numberOfInvestors < totalInvestors; ++numberOfInvestors) {
            let certificateSignature = CertificationLogic.createCertificate(accounts[numberOfInvestors + 2]).signature;
            let investorBidInformation = InvestorLogic.getBidHash(10, 1 + numberOfInvestors);
            let bidHash = investorBidInformation.hash;

            await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: accounts[numberOfInvestors + 2]});
            investorBidInformationArray.push(investorBidInformation);
        }

        timeMachine.advanceBlockAndSetTime(1650412800 + 1000);

        for (let numberOfInvestors = 0; numberOfInvestors < totalInvestors; ++numberOfInvestors) {
            let currentInvestor = accounts[numberOfInvestors + 2];
            let investorBidInformation = investorBidInformationArray[numberOfInvestors];
            let nonce = investorBidInformation.nonce;
            let price = investorBidInformation.price;
            let shares = investorBidInformation.shares;
            let valueOfSharesInWei = investorBidInformation.valueOfSharesInWei;

            let bidHint = await NeverPayShares.firstBid({from: currentInvestor});
            await NeverPayShares.purchaseShares(shares, price, nonce, bidHint, {from: currentInvestor, value: valueOfSharesInWei})
        }

        bidHint = await NeverPayShares.firstBid({from: accounts[3]});
        let revealedInformation = await NeverPayShares.roundTwoData.call(bidHint, {from: accounts[3]});
        
        let theExpectedHigherBid = investorBidInformationArray[1].hash;
        assert.equal(revealedInformation.next, theExpectedHigherBid, "A bid of higher value has been sorted incorrectly, as having less value")
    })
})