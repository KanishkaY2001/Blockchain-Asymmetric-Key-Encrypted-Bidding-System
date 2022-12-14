const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');
const CertificationLogic = require('../../../offchain/CertificationLogic.js');
const truffleAssert = require('truffle-assertions');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let financialOrganization = accounts[2];
    let randomPerson = accounts[3];
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;

    it("Test that a random person can't remove keys from the registry", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        await truffleAssert.reverts(SICAR.removeKeyFromRegistry(financialOrganization, {from: randomPerson}));
    })
})