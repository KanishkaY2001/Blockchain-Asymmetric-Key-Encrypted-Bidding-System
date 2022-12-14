const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');
const CertificationLogic = require('../../../offchain/CertificationLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let investor = accounts[2];
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;

    it("Test that existing keys are authorized in the registry", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        let keyExists = await SICAR.isKeyAuthorized(signerAuthorityAccount.address, {from: investor});
        assert.equal(keyExists, true, "A key that is not authorized exists in the registry");
    })
})