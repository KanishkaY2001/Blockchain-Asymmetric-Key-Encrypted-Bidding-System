const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');
const CertificationLogic = require('../../../offchain/CertificationLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let financialOrganization = accounts[2];
    let anotherFinancialOrganization = accounts[3];
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;

    it("Test that ASIC can add more keys to the registry", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});
        await SICAR.addKeyToRegistry(financialOrganization, "Bank Of Australia", {from: ASIC});
        await SICAR.addKeyToRegistry(anotherFinancialOrganization, "UnicornFoundation Bank", {from: ASIC});
    })
})