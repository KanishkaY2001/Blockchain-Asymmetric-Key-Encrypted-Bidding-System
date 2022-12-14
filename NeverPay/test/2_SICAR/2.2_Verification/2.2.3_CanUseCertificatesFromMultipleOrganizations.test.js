const NeverPaySmartContract = artifacts.require('NeverPayShares.sol');
const SICARSmartContract = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry.sol');

const CertificationLogic = require('../../../offchain/CertificationLogic.js');
const InvestorLogic = require('../../../offchain/InvestorLogic.js');

contract('NeverPayShares', (accounts) => {
    before(async () => {
        NeverPayShares = await NeverPaySmartContract.deployed();
        SICAR = await SICARSmartContract.deployed();
    })

    let ASIC = accounts[1];
    let investor = accounts[2];

    let investorBidInformation = InvestorLogic.getBidHash(10, 1);
    let bidHash = investorBidInformation.hash;

    it("Test that an investor can use certificates issued from multiple authorities", async () => {
        let totalOrgs = 4;
        for (let numberOfOrgs = 0; numberOfOrgs < totalOrgs; ++numberOfOrgs) {
            let certificate = CertificationLogic.createCustomCertificate(investor);
            let signature = certificate.signature;
            let signer = certificate.signer;
            
            await SICAR.addKeyToRegistry(signer, ("Financial Organization: " + numberOfOrgs), {from: ASIC});
            await NeverPayShares.bid(bidHash, 0, signature, {from: investor});
        }
    })
})