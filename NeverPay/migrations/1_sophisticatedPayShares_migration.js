const SICAR = artifacts.require("SophisticatedInvestorCertificateAuthorityRegistry");

module.exports = function (deployer, network, accounts) {
    const ASIC = accounts[1];
    deployer.deploy(SICAR, ASIC, {from: ASIC});
};
