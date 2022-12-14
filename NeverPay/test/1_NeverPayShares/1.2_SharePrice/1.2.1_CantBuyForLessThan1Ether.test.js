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
    let investorBidInformation = InvestorLogic.getBidHash(10, 0.1);
    let bidHash = investorBidInformation.hash;
    let shares = investorBidInformation.shares;
    let price = investorBidInformation.price;
    let nonce = investorBidInformation.nonce;
    let valueOfSharesInWei = price * shares * 1000000000000000000;

    it("Test that an investor may not purchase shares for less than 1 Ether", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});

        timeMachine.advanceBlockAndSetTime(1650412800 + 1000);

        try {
            await NeverPayShares.purchaseShares(shares, price, nonce, nonce, {from: investor, value: valueOfSharesInWei});
        } catch (error) {
            const invalidNumber = error.message.search('NUMERIC_FAULT') >= 0;
            assert(invalidNumber, "Despite not designed to accept floating point numbers, NeverPayShares accepted the bid")
            return;
        }
        assert.fail('Expected throw not received');
    })
})