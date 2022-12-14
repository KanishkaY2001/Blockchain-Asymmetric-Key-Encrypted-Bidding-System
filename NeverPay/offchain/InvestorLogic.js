//==============================================================================//
//                      Investor Off-chain Computation                          //
//==============================================================================//



/**
 * Instructions to the Investor:
 * =============================
 * --> (1) Install Node.js and npm
 * --> (2) Install Web3 through npm
 * --> (3) Install ethers through npm
 * 
 * Installation guides:
 * ====================
 * (1): https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
 * (2): https://www.npmjs.com/package/web3
 * (3): https://www.npmjs.com/package/ethers
*/



//=======================================//
//          Initialize Libraries         //
//=======================================//



const ethers = require('ethers');
const Web3 = require("web3");
let web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));



//=======================================//
//           Generate Bid Hash           //
//=======================================//



/*
 * [Get bid hash] JavaScript code:

 * This function will allow an investor to combine the amount of shares they're willing to purchase and the price they wish to pay per share (in ether)
 * into a packed keccak256 (sha-3 family) one-way hash. The nature and security that this hash provides will ensure that the investor's bid information
 * will remain anonymous to an utmost extent. Moreover, a nonce, produced using crypto.randomBytes(32), will allow the investor's bid information to
 * become much more randomized, as this nonce is cryptographically well-built artificial random data. This nonce will need to be stored by the investor
 * and what I mean by this is the off-chain application through which they are interacting with the contract. In this way, all of this information may
 * be reliably saved and the investor may provide this information during round 2, when they are purchasing shares, making the validation process easier.
 */

// Typically, this functionality is offered by the frontend that NeverPay provides, to allow the user to interact with a simple user interface
function getBidHash(amountOfShares, pricePerShare) {
    // A random nonce to produce an-ever random bid hash, to differentiate from the other bids more reliably
    const nonce = web3.utils.randomHex(32);
    var packedBidInput;
    
    // If a decimal input is given, as Solidity does not operate with floating point, I must convert these into string format
    if (amountOfShares < 1 || pricePerShare < 1) {
        // Concatenates the values within the parameters into a packed value
        packedBidInput = ethers.utils.solidityPack(["string", "string", "bytes32"], [""+amountOfShares, ""+pricePerShare, nonce]);
    } else {
    // If whole numbers are provided, an appropriate and expected keccak hashing will take place
        packedBidInput = ethers.utils.solidityPack(["uint256", "uint256", "bytes32"], [amountOfShares, pricePerShare, nonce]);
    }

    // A web3 utility which allows for easier handling of big numbers
    // Computes the value of the shares that the investor is purchasing, and the price, in ether, as a value in wei
    let valueBN = web3.utils.toWei((amountOfShares * pricePerShare).toString(), 'ether');
    let valueOfSharesInWei = web3.utils.toBN(valueBN);

    // A struct is designed to represent the useful information pertaining to an investor's bid
    // This format is similar to the roundTwoData state struct, found in NeverPayShares.sol
    investorBidInformation = {
        price: pricePerShare,
        shares: amountOfShares,
        valueOfSharesInWei: valueOfSharesInWei,
        nonce: nonce,
        hash: web3.utils.keccak256(packedBidInput).toString('hex')
    }

    // This struct is then returned in order to be used as a local method of storing all the essential bid data
    return investorBidInformation;
}
module.exports.getBidHash = getBidHash;



//=======================================//
//             Find Bid Hint             //
//=======================================//



/*
 * [Get bid hint] JavaScript code:

 * In order to get a hint, a bid must be given as a parameter to this function so it can be compared against all existing bids in the contract, if any.
 * The parameters in the getBidHint function will be bidHash and currentBid. The bidHash variable may be obtained by calling the getBidHash
 * function by passing the investor's bid information such as number of shares, and price per share. The currentBid variable may be obtained
 * by calling NeverPayShares.sol smart contract and retrieving the value of public variable firstBid. This value is passed as the intial comparison.
 * This function does not break trust between the investor and the client (NeverPay) because it only serves to reduce the computation time required to 
 * find the location to insert a new bid. And this is a vital functionality to ensure that the bids list remains sorted at all times, from index = 0
 * being the lowest valued bid, and index = n being the highest valued bid. If an investor were to provide a false bidHint, then the transaction itself
 * would potentially cost more gas, as it may take longer to find the correct position to insert the investor's bid, to ensure that the list remains sorted.
 */

// Typically this functionality is also offered by NeverPay, however, this may compromise the trust of the investor. Hence, they may perform
// the same logic on their local computer, or with the aid of a software program / stackoverflow.
function getBidHint(order, price, otherOrder, bidsArray) {
    // There exist no bids in the system (linked list), implying that this is the first bid
    if (bidsArray.length == 0) {
        // The bid hint does not matter, because it does not exist, as this is the first bid, hence return random
        return web3.utils.randomHex(32);
    }

    // Iterate through all the bids in the system, starting from the first (lowest valid) bid
    for (let bidNumber = 0; bidNumber < bidsArray.length; ++bidNumber) {

        // Identify the price that an investor is offering for some bid (bidNumber) in the list
        let otherPrice = bidsArray[bidNumber].roundTwoData.priceEth;

        // If the investor's bid is the greatest bid in the system, and the end of the array is reached
        if (bidNumber == bidsArray.length - 1 && isBidGreater(order, price, otherOrder, otherPrice)) {
            // The hint is the current highest bid in the system, because the investor's bid is greater than this hint
            return bidsArray[bidNumber].bidHash;
        }

        // If the investor's bid is ever not greater than a bid, the hint is found
        if (!isBidGreater(order, price, otherOrder, otherPrice)) {
            // The hint is simply the hint that the investor's bid is not greater than, as it may be ordered prior to it
            return bidsArray[bidNumber].bidHash;
        }
    }
}
module.exports.getBidHint = getBidHint;


// A helper function, similar to the one which exists in the contract, to identify the higher bid
// Determines whether the first bid (order, price) is greater than the second bid (secondOrder, secondPrice)
// If first bid is greater, return true, otherwise return false to imply that the first bid is less valuable.
function isBidGreater(order, price, secondOrder, secondPrice) {
    if (price > secondPrice) return true;
    if (price == secondPrice && order < secondOrder) return true;
    return false;
}
