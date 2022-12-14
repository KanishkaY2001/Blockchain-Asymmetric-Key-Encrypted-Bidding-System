const SICAR = artifacts.require("SophisticatedInvestorCertificateAuthorityRegistry");
const NeverPayShares = artifacts.require("NeverPayShares");

module.exports = function (deployer, network, accounts) {
    const NeverPay = accounts[0];
    deployer.deploy(NeverPayShares, SICAR.address, {from: NeverPay});
};
