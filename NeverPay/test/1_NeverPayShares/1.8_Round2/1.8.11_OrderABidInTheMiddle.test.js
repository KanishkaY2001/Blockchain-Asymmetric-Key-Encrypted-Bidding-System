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
    let totalInvestors = 4;
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;
    
    it("Test that a bid that belongs in the middle of the list, is ordered appropriately", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        let investorBidInformationArray = [];

        for (let numberOfInvestors = 0; numberOfInvestors < totalInvestors; ++numberOfInvestors) {
            let certificateSignature = CertificationLogic.createCertificate(accounts[numberOfInvestors + 2]).signature;
            let investorBidInformation = InvestorLogic.getBidHash(10, 1 + (numberOfInvestors * 2));
            let bidHash = investorBidInformation.hash;

            await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: accounts[numberOfInvestors + 2]});
            investorBidInformationArray.push(investorBidInformation);
        }

        certificateSignature = CertificationLogic.createCertificate(accounts[6]).signature;
        middleBidderInformation = InvestorLogic.getBidHash(10, 4);
        bidHash = middleBidderInformation.hash;
        await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: accounts[6]});


        timeMachine.advanceBlockAndSetTime(1650412800 + 1000);


        async function bidHintFindingHelper(investorBidInformation, currentInvestor) {
            let price = investorBidInformation.price;
            let investorBidHash = investorBidInformation.hash;

            let bidsArray = [];
            let currentBidHash = await NeverPayShares.firstBid({from: currentInvestor});
            let roundTwoData = await NeverPayShares.roundTwoData.call(currentBidHash, {from: currentInvestor});
            let roundOneDataFirstBid = await NeverPayShares.roundOneData.call(currentBidHash, {from: currentInvestor});
            let roundOneDataInvestor = await NeverPayShares.roundOneData.call(investorBidHash, {from: currentInvestor});
            let firstBidOrder = roundOneDataFirstBid.order;

            while (currentBidHash != 0) {
                bidData = {
                    bidHash: currentBidHash,
                    roundTwoData: roundTwoData
                }
                bidsArray.push(bidData);
                currentBidHash = roundTwoData.next;
                roundTwoData = await NeverPayShares.roundTwoData(currentBidHash, {from: currentInvestor});
            }

            return InvestorLogic.getBidHint(roundOneDataInvestor.order, price, firstBidOrder, bidsArray);
        }

        for (let numberOfInvestors = 0; numberOfInvestors < totalInvestors; ++numberOfInvestors) {
            let currentInvestor = accounts[numberOfInvestors + 2];
            let investorBidInformation = investorBidInformationArray[numberOfInvestors];
            let nonce = investorBidInformation.nonce;
            let price = investorBidInformation.price;
            let shares = investorBidInformation.shares;
            let valueOfSharesInWei = investorBidInformation.valueOfSharesInWei;

            let bidHint = await bidHintFindingHelper(investorBidInformation, currentInvestor);
            await NeverPayShares.purchaseShares(shares, price, nonce, bidHint, {from: currentInvestor, value: valueOfSharesInWei, gas: 6721975})
        }

        let currentInvestor = accounts[6];
        let nonce = middleBidderInformation.nonce;
        let middleBidHash = middleBidderInformation.hash;
        let valueOfSharesInWei = middleBidderInformation.valueOfSharesInWei;

        let bidHint = await bidHintFindingHelper(middleBidderInformation, currentInvestor);
        await NeverPayShares.purchaseShares(10, 4, nonce, bidHint, {from: currentInvestor, value: valueOfSharesInWei, gas: 6721975});
        
        let roundTwoData = await NeverPayShares.roundTwoData(middleBidHash, {from: currentInvestor});

        assert.notEqual(roundTwoData.next, 0, "This bid should be sorted into the middle, yet it is the tail node");
        assert.notEqual(roundTwoData.prior, 0, "This bid should be sorted into the middle, yet it is the head node");
    })
})