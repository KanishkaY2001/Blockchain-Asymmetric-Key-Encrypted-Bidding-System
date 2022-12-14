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
    let investor = accounts[2];

    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;
    let investorBidInformation = InvestorLogic.getBidHash(10, 1);
    let bidHash = investorBidInformation.hash;

    it("Test that investor can't claim shares that are not revealed in round 1", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        timeMachine.advanceBlockAndSetTime(1651017600 + 1000);

        await truffleAssert.reverts(NeverPayShares.claimShares(bidHash, {from: investor, gas: 6721975}));

    })
})