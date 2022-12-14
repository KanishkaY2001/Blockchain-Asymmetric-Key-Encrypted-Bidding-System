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
    let signerAuthorityAccount = CertificationLogic.signerAuthorityAccount;
    

    it("Test that a single investor may place multiple bids, and this data is saved", async () => {
        await SICAR.addKeyToRegistry(signerAuthorityAccount.address, "Commonwealth Bank", {from: ASIC});

        let totalBids = 50;
        let gasCosts = [];

        let alternate = 0;
        function GenerateTableValue(gasUsage) {
            if (alternate % 2 == 0) {
                this.Column_One = gasUsage;
            } else {
                this.Column_Two = gasUsage;
            }
        }
        
        for (let numberOfBids = 0; numberOfBids < totalBids; ++numberOfBids) {
            let investorBidInformation = InvestorLogic.getBidHash(10, (1 + numberOfBids));
            let bidHash = investorBidInformation.hash;
            let investor = accounts[numberOfBids + 2];
            let certificateSignature = CertificationLogic.createCertificate(investor).signature;
            const receipt = await NeverPayShares.bid(bidHash, 0, certificateSignature, {from: investor});
            const gasUsed = receipt.receipt.gasUsed;

            let message = "Investor " + (numberOfBids+1) + " | " + "GasCost: " + gasUsed;
            if (alternate % 2 == 0) {
                investorGas = new GenerateTableValue(message);
            } else {
                investorGas = new GenerateTableValue(message);
            }
            gasCosts.push(investorGas);
            ++alternate;

        }
        console.table(gasCosts);
    })
})