const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

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
    let shares = 10;
    let price = 1;

    it("Test that any bid, other than the first bid to be revealed, will require a valid bid hint parameter", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        let investorBidInformationArray = [];

        for (let numberOfInvestors = 0; numberOfInvestors < totalInvestors; ++numberOfInvestors) {
            let certificateSignature = CertificationLogic.createCertificate(accounts[numberOfInvestors + 2]).signature;
            let investorBidInformation = InvestorLogic.getBidHash(shares, price);
            let bidHash = investorBidInformation.hash;
            await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: accounts[numberOfInvestors + 2]});

            investorBidInformationArray.push(investorBidInformation);
        }

        let valueOfSharesInWei = shares * price * 1000000000000000000;

        timeMachine.advanceBlockAndSetTime(1650412800 + 1000);

        let nonce1 = investorBidInformationArray[0].nonce;
        let nonce2 = investorBidInformationArray[1].nonce;

        await NeverPayShares.purchaseShares(shares, price, nonce1, nonce1, {from: accounts[2], value: valueOfSharesInWei});
        await truffleAssert.reverts(NeverPayShares.purchaseShares(shares, price, nonce2, nonce1, {from: accounts[3], value: valueOfSharesInWei}));
    })
})