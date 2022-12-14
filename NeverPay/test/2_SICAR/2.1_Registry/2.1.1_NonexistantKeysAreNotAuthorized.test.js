const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');
const CertificationLogic = require('../../../offchain/CertificationLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let investor = accounts[2];
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;

    it("Test that keys that don't exist at all, are not authorized", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        let keyExists = await SICAR.isKeyAuthorized(accounts[3], {from: investor});
        assert.equal(keyExists, false, "A key that is not authorized exists in the registry");
    })
})