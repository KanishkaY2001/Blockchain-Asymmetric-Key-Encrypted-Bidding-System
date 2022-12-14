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
    let investorBidInformation = InvestorLogic.getBidHash(1, 1);
    let bidHash = investorBidInformation.hash;
    let shares = investorBidInformation.shares;
    let price = investorBidInformation.price;
    let nonce = investorBidInformation.nonce;
    let valueOfSharesInWei = price * shares * 1000000000000000000;

    it("Test that an investor may purchase shares if they pay at least 1 ether per share", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});

        await timeMachine.advanceBlockAndSetTime(1650412800 + 1000);

        await NeverPayShares.purchaseShares(shares, price, nonce, nonce, {from: investor, value: valueOfSharesInWei});
    })
})