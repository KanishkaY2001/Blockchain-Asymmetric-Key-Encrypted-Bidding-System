// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


//==============================================================================//
//                         ERC-20 Standard Interface                            //
//==============================================================================//


/// @title Interface for the ERC-20 standard
/// @author Fabian Vogelsteller & Others
/// @notice The six fundemental functions and two events for ERC-20 are implemented
/// @dev To save gas, the optional functionalities of the ERC-20 standard are not included
interface IERC20 {
    /// @notice Specifics about each function are explored in detail in the NeverPayShares contract
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /// @notice Communicate with a client that a transfer of shares has been made between accounts
    event Transfer(address indexed from, address indexed to, uint256 value);
    /// @notice Communicate with client that an address has been given approval to transfer some shares
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


//==============================================================================//
//                      ASIC Authority Registry Interface                       //
//==============================================================================//


/// @title Interface for the SophisticatedInvestorCertificateAuthorityRegistry smart contract
/// @author Kanishka G Yamani
/// @notice NeverPay sells shares to investors and collects Ethereum funds
/// @dev The purpose of this contract, for NeverPay, is to ensure sophisticated investors
interface ISICAR {
    /// @notice Investor calls this function to verify that the signer of their certificate is a registered authority
    function isKeyAuthorized(address _key) external view returns (bool authorized);

    /// @dev These functions may not be reliably called by an investor, because only ASIC can manage registry
    function addKeyToRegistry(address _key, string memory _organizationName) external;
    function removeKeyFromRegistry(address _key) external;
}


//==============================================================================//
//                     NeverPay Shares Auction Contract                         //
//==============================================================================//


/// @title NeverPay crypto-shares distribution fundraiser scheme
/// @author Kanishka G Yamani
/// @notice NeverPay sells shares to investors and collects Ethereum funds
/// @dev Function logic is tightly bundled together for gas optimization and efficiency
contract NeverPayShares is IERC20 {


    //===========================================================//
    //                     Function Modifiers                    //
    //===========================================================//


    /// @notice Determines whether a function execute its logic, when not blocked
    bool internal blocked;

    /// @notice Ensures that an investor may not perform a re-entrancy attack to refund ether or claim shares
    /// @dev Manually setting the value of blocked to true may damange the integrity of this protection
    modifier reEntrancyBlock {
        /// @notice Once a function is called, it may not be called again until it has finished executing
        require(!blocked, "Re-entrancy");
        blocked = true;
        _;
        blocked = false;
    }


    //===========================================================//
    //                   ERC20 Implementation                    //
    //===========================================================//


    /// @notice Represents the total supply of claimed and distributable shares
    uint public override totalSupply;

    /// @notice Stores an investor's balance of distributable shares, once claimed
    mapping(address => uint) public override balanceOf;

    /// @notice Determines how much shares allowance an investor is giving another person's address
    mapping(address => mapping(address => uint)) public override allowance;

    /// @notice Allows an investor to transfer their shares to another person's address
    /// @dev Transferring more shares than they own will only revert the transaction
    /// @param _id - This is the address of the person whom the investor wants to transfer to
    /// @param _shares - The amount of shares that the investor wishes to transfer
    /// @return success - Whether the transfer was performed successfully
    function transfer(address _id, uint256 _shares) external override returns (bool success) {
        /// @notice Shares deducted from investor, and sent to provided address
        balanceOf[msg.sender] -= _shares;
        balanceOf[_id] += _shares;

        /// @notice Transfer event emitted to allow clients to collect logs
        emit Transfer(msg.sender, _id, _shares);
        return true;
    }

    /// @notice Enables an investor to give an allowance of the shares they own, to another address
    /// @dev Investor needs shares in order to allow this function to work properly
    /// @param _id - This is the address of the person whom the investor wants to transfer to
    /// @param _shares - The amount of shares that the investor wishes to transfer
    /// @return success - Whether the transfer was performed successfully
    function approve(address _id, uint256 _shares) external override returns (bool success) {
        /// @notice Investor's address is linked to provided address, and allocates a number of shares
        allowance[msg.sender][_id] = _shares;

        /// @notice Approval event emitted to allow clients to collect logs
        emit Approval(msg.sender, _id, _shares);
        return true;
    }

    /// @notice If a person has approval for an allowance of shares, they may transfer them on behalf of the investor
    /// @dev Investor requires shares in order for this function to work, and will revert otherwise
    /// @param _fromId - This is the address of the investor who has given approval to use the allowance
    /// @param _toId - This is the address of the person whom the investor wants to transfer to
    /// @param _shares - The amount of shares that the investor wishes to transfer
    /// @return success - Whether the transfer was performed successfully
    function transferFrom(address _fromId, address _toId, uint256 _shares) external override returns (bool success) {
        /// @notice Approved address may deduct shares from the investor's balance, to transfer to another address
        allowance[_fromId][msg.sender] -= _shares;
        balanceOf[_fromId] -= _shares;
        balanceOf[_toId] += _shares;

        /// @notice Transfer event emitted to allow clients to collect logs
        emit Transfer(_fromId, _toId, _shares);
        return true;
    }


    //===========================================================//
    //                    Contract Constructor                   //
    //===========================================================//


    /// @notice The address which represents ASIC's smart contract
    address contractASIC;

    /// @notice Sets ASIC's official contract address during contract creation
    /// @dev ASIC does not create multiple contracts every x time, so this is constant
    /// @param _contractASIC - This is the address of the ASIC smart contract
    constructor (address _contractASIC) {
        contractASIC = _contractASIC;
    }


    //===========================================================//
    //                Bidding Variables & Mappings                //
    //===========================================================//


    /// @notice The lowest valued bid for which an investor may claim shares for
    bytes32 public lowestValidBid;

    /// @notice The investor who found the lowestValidBid
    bytes32 public lowestValidFinder;

    /// @notice Head node, or current lowest valued bid in the linked list
    bytes32 public firstBid;

    /// @notice Tail node, or current highest valued bid in the linked list
    bytes32 public lastBid;

    /// @notice Used to determine order and is the total blind bids that investors have placed and removed
    uint public blindBidCount;

    /// @notice The total bids for which investors have paid ether to compete against others and claim shares
    uint public paidBidCount;

    /// @notice Data which is collected during round 1, that identifies their bid
    mapping(bytes32 => Data) public roundOneData;

    /// @notice Data which is collected during round 2, that reveals and sorts their bid according to bid value
    mapping(bytes32 => BidNode) public roundTwoData;

    /// @notice Hashed bid which identifies an investor by their address and the order that they placed the bid
    struct Data {
        /// @notice Represents the investor's address, to identify them
        address id;

        /// @notice The order number for which the investor has placed their bid
        /// @dev When this is 0, the bid is considered withdrawn. Otherwise, it is a valid bid
        uint order;
    }
    
    /// @notice Hashed bid which stores their true bid information, sent ether, and sorted order in the linked list
    struct BidNode {
        /// @notice The amount of ether that the bidder is paying per sharae
        uint priceEth;

        /// @notice The amount of shares that the bidder is willing to purchase
        uint shares;

        /// @notice Ether provided by the potential investor, to account for the cost of shares * price
        uint deposit;

        /// @notice The next (higher valued) bid in the linked list
        bytes32 next;

        /// @notice The prior (lower valued) bid in the linked list
        bytes32 prior;
    }


    //===========================================================//
    //                Functionality During Round 1               //
    //===========================================================//


    /// @notice Enables a sophisticated investor to place or withdraw a blinded bid for a price to buy a number of shares
    /// @dev The place and withdraw functionality is encapsulated in this function to reduce deployment cost
    /// @param _bidHash - This is the blinded bid hash that is generated by a bidder and provided to represent their bid
    /// @param _remove - Determines whether or not to place or withdraw a bid (0 to place, 1 to withdraw)
    /// @param _signature - The public key signature that is given by a trusted organization upon verifying investor status
    function bid(bytes32 _bidHash, uint _remove, bytes memory _signature) external { // this is round 1

        /// @notice Mirrors the message on the signer's certification, and creates an Eth signed message using the bidder's address and current year
        /// @dev The signed message is hard-coded, meaning that an update to this format, by ASIC, will require updated code
        bytes32 signedMessageVerification = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(
                "the owner of Ethereum address ",

                /// @notice To dynamically ensure that the certificate is owned by the investor calling the function
                msg.sender,
                " is a sophisticated investor for year ",

                /// @notice Certificate organizations issue certificates for each year, so this dynamically finds the current year
                (1970 + (block.timestamp / 31536000)),
                "."
            ))
        ));

        /// @notice Ensures that the deadline for round 1 has not passed and that the signature is of a valid format
        require(_signature.length == 65 &&  block.timestamp < 1650412800, "Invalid - Round 1"); // 
        bytes32 r;
        bytes32 s;
        uint8 v;

        // @notice The public key signature is segregated into bytes in order to derive the public key which signed the message
        assembly {
            /// @notice After skipping the first 32 bytes of message length, value for r stored in next 32 bytes.
            r := mload(add(_signature, 32))

            /// @notice Skip another 32 bytes of data length that holds r, to get the value of s
            s := mload(add(_signature, 64))

            /// @notice Skip another 32 bytes of data length that holds r and s, to get the value of v
            v := byte(0,mload(add(_signature, 96)))
        }

        /// @notice Check with ASIC smart contract to ensure that the certificate's signer is a legitimate certificate organization
        /// @notice This acts as proof that the investor a) controls the address in the certificate and b) the certificate is valid
        /// @dev If true, the investor calling the bid function is a verified sophisticated investor
        bool sophisticatedInvestor = ISICAR(contractASIC).isKeyAuthorized(ecrecover(signedMessageVerification, v, r, s));
        require(sophisticatedInvestor, "Unapproved");

        /// @notice This is the investor's bid data for the first round in this auction
        Data storage data = roundOneData[_bidHash];

        /// @notice Check if the investor wants to remove or place a bid, and ensure that their bid does not exist in the map
        address id = data.id;
        if (_remove == 0 && id == address(0)) {
            /// @notice _remove = 0, meaning a bid is being placed, it is not a duplicate bid, and the bid's order is stored
            data.id = msg.sender;
            data.order = ++blindBidCount;
        } else if (_remove == 1 && id == msg.sender) {
            /// @notice _remove = 1, meaning the investor who places a bid may withdraw their own bid, by setting order to 0
            data.order = 0;
        }
    }


    //===========================================================//
    //                Functionality During Round 2               //
    //===========================================================//


    /// @notice Investor may purchase shares during round 2, while revealing their initial blinded bid information
    /// @dev Ensure that the function is called during the timeframes specified by the blocktime (in unix epoch)
    /// @param _shares - This is the number of shares that the investor wants to purchase
    /// @param _priceEth - The amount of ether that the investor is offering per share
    /// @param _nonce - The random 32b hex, which allows their bid to be represented uniquely (more randomness)
    /// @param _bidHint - A hint, generated locally by the investor, to ensure that the sorting process remains fair for all investors
    function purchaseShares(uint _shares, uint _priceEth, bytes32 _nonce, bytes32 _bidHint) external payable reEntrancyBlock {

        /// @notice This is the total price in ether that the investor is paying
        uint value = _priceEth * _shares;
        
        /// @notice Ensures that the deadline for round 1 has passed, and that the deadline for round 2 has not occured yet
        /// @notice Checks that at least 1 ether is being paid, and that the ether being sent covers the total cost of all shares
        require(block.timestamp >= 1650412800 && block.timestamp < 1651017600 && msg.value >= (value * 1 ether) && value >= 1, "Invalid Bid Attempt");

        /// @notice This is the concatenation of all the values used to make up a blinded bid hash for each bid
        bytes32 trueHash = keccak256(abi.encodePacked(_shares, _priceEth, _nonce));

        /// @notice Ensure that the function caller is the owner of the bid and that the bid is not withdrawn
        require(roundOneData[trueHash].id == msg.sender && roundOneData[trueHash].order != 0, "Authentication Failed");
        
        /// @notice If there are bids for this round, check that the bid hint exists in the linked list and that the bid is not a duplicate
        if (paidBidCount > 0) require(roundTwoData[_bidHint].deposit != 0 && roundTwoData[trueHash].deposit == 0, "Invalid or Duplicate");
        
        /// @notice Stores the revealed information of the investor's bid in order to distribute shares later on
        BidNode storage data = roundTwoData[trueHash];
        data.deposit = msg.value;
        data.priceEth = _priceEth;
        data.shares = _shares;

        /// @notice When there are 0 bids in the linked list, the first bid is both the head and tail node (first and last bid)
        if (paidBidCount == 0) {
            firstBid = lastBid = trueHash;
        } else {
            /// @notice Calls the helper function to reorder and correctly sort the bid into the linked list
            bidPlacement(trueHash, _bidHint, 0);
            bidPlacement(trueHash, _bidHint, 1);
        }

        /// @notice The total number of bids, which have been paid for, is now incremented by 1
        ++paidBidCount;
    }


    //===========================================================//
    //                  Bidding Helper Functions                 //
    //===========================================================//


    /// @notice Helper function to check whether the bid in the first parameter is more valuable than the second bid parameter
    /// @dev To make this more gas effective, returning uint instead of bool (1 representing true, 0 representing false)
    /// @param _firstBid - The function intends to check if this bid is greater
    /// @param _secondBid - This is the assumed 'less valuable' bid, which the function checks
    /// @return greater - represents that the first bid (_firstBid) is greater than the second bid (1 = true, 0 = false)
    function isBidGreater(bytes32 _firstBid, bytes32 _secondBid) private view returns (uint greater) {

        /// @notice A bid's value is dictated by the price, in Ether, offered by the investor, and secondly by the order which the bid is placed
        /// @notice Price takes priority and if it is simply greater, then the first bid is greater than the second bid
        /// @notice The next priority is order, if the price is equal, then if the first bid is placed sooner, it is more valuable
        /// @notice If the price is simply lower than the second bid, or the conditions above are not met, then the second bid is more valuable
        uint firstPrice = roundTwoData[_firstBid].priceEth;
        uint secondPrice = roundTwoData[_secondBid].priceEth;
        if (firstPrice > secondPrice || (firstPrice == secondPrice && roundOneData[_firstBid].order <= roundOneData[_secondBid].order)) return 1;
    }

    /// @notice Recursively changes the order of a given bid to ensure that it is sorted (smallest -> largest)
    /// @dev The head node (firstBid) is the smallest, while the tail node (lastBid) is the greatest
    /// @param _bidHash - This is the bid which the investor is trying to insert into the linked list, when revealing
    /// @param _bidHint - Provided by the investor, generated locally, aids in quickly finding the correct bid location
    /// @param _polarity - Implies whether the bid hint is higher or lower than the given bid hash
    function bidPlacement(bytes32 _bidHash, bytes32 _bidHint, uint _polarity) private {

        /// @notice Ensures that the bid hint exists (has been placed by another investor in round 2)
        require(roundTwoData[_bidHint].deposit != 0, "Invalid Hint");

        /// @notice This points to the next less valuable bid, compared to the bid hint
        bytes32 prior = roundTwoData[_bidHint].prior;

        /// @notice This points to the next most valuable bid, compared to the bid hint
        bytes32 next = roundTwoData[_bidHint].next;

        /// @notice _polarity of 1 represents that the function is checking whether the bid hint is greater than bid hash
        /// @notice Check if the hint is larger than the investor's bid
        if (_polarity == 1 && isBidGreater(_bidHint, _bidHash) == 1) {

            /// @notice Check if the bid hint is the lowest bid in the list, or if the investor's bid is the next lowest bid, compared to hint
            if (_bidHint == firstBid || isBidGreater(prior, _bidHash) != 1) {

                /// @notice The investor's bid has been identified to be the next less valuable bid, compared to bid hint
                /// @notice Link the bids together in the linked list, with the investor's bid toward the side of the head node
                roundTwoData[_bidHint].prior = _bidHash;
                roundTwoData[_bidHash].next = _bidHint;
                return;
            }
            
            /// @notice Investor's bid is lower than the bid hint and also lower than the next lowest hint
            /// @notice Recursively call the helper to sort the investor's bid in a lower position, as their bid is less valuable
            bidPlacement(_bidHash, prior, _polarity);

        /// @notice _polarity of 0 represents that the function is checking whether the bid hint is smaller than bid hash
        /// @notice Check if the investor's bid is greather than the bid hint
        } else if (_polarity == 0 && isBidGreater(_bidHash, _bidHint) == 1) {

            /// @notice Check if the bid hint is the highest bid in the list, or if the investor's bid is the next highest bid, compared to hint
            if (_bidHint == lastBid || isBidGreater(_bidHash, next) != 1 || next == 0) {

                /// @notice The investor's bid has been identified to be the next most valuable bid, compared to bid hint
                /// @notice Link the bids together in the linked list, with the investor's bid toward side of the tail node
                roundTwoData[_bidHint].next = _bidHash;
                roundTwoData[_bidHash].prior = _bidHint;
                return;
            }

            /// @notice Investor's bid is lower than the bid hint and also lower than the next lowest hint
            /// @notice Recursively call the helper to sort the investor's bid in a lower position, as their bid is less valuable
            bidPlacement(_bidHash, next, _polarity);
        }

        // this checks if the provided hint bid is the first or last bid in the list. If that is the case, then return 0.
        // 0 is returned as it signifies the 0 hash (0x00...) which means that there is no other bid in the next or previous position.

        /// @notice Check if the bid hint is the first bid in the list, and a polarity of 0 implies that the investor's bid is less valuable
        if ((_bidHint == firstBid && _polarity == 0)) {
            /// @notice Due to being less valuable, the new head node (first Bid) is the investor's bid
            firstBid = _bidHash;
            return;

        /// @notice Check if the bid hint is the first bid in the list, and a polarity of 0 implies that the investor's bid is more valuable
        } else if ((_bidHint == lastBid && _polarity == 1)) {
            /// @notice Due to being more valuable, the new tail node (last Bid) is the investor's bid
            lastBid = _bidHash;
            return;
        }

        /// @notice The investor's bid is more valuable than the bid hint, implied by a polarity of 1
        /// @notice However, it requires additional sorting, as the bid belongs somewhere in the middle of the linked list
        if (_polarity == 1) {
            /// @notice As the bid is more valuable than the current hint, recursively call the helper, while passing the next highest bid as the hint
            bidPlacement(_bidHash, next, _polarity);
            return;
        }

        /// @notice The investor's bid is less valuable than the bid hint, implicitly implied by a polarity of 0, as the polarity is not 1
        /// @notice As the bid is less valuable than the current hint, recursively call the helper, while passing the next lowest bid as the hint
        bidPlacement(_bidHash, prior, _polarity);
    }
    

    //===========================================================//
    //                Functionality After Round 2                //
    //===========================================================//


    /// @notice Allows a successful investor to claim the shares they have purchased in the previous round, and claim a refund if eligible
    /// @dev The first investor will do the heavy computation, but their address is identifiable by the contract, to allow NeverPay to offer incentive
    /// @param _investor - This is the bid hash that was submitted in round 1, that the investor wants to claim their shares for
    function claimShares(bytes32 _investor) external reEntrancyBlock {

        /// @notice Ensure that round 2 deadline has passed and that the function caller is the owner of the passed bid
        require(block.timestamp >= 1651017600 && roundOneData[_investor].id == msg.sender && roundTwoData[_investor].shares != 0, "Not Authenticated");

        /// @notice This information pertains to all the revealed information provided by the investor during round 2
        BidNode storage bidInfo = roundTwoData[_investor];
        
        /// @notice Check whether the lowest valuable bid has been identified, otherwise, proceed to compute this investor
        if (lowestValidBid == 0) {

            /// @notice This is the sum of all the shares that have been bought, starting from the most valuable bid
            /// @notice A temporary value to aggregate the share amount that an investor wants to purchase
            /// @notice Start this process from the tail node (the most valuable bid) because these investors will take first priority
            uint sharesSum;
            uint tempShares;
            bytes32 topBid = lastBid;

            /// @notice Continue the process of locating the lowest valid bidder until they are found
            while (lowestValidBid == 0) {

                /// @notice Retrieve the data pertaining to the current bid being tested to verify if it is the lowest valid bid
                bidInfo = roundTwoData[topBid];
                tempShares = bidInfo.shares;

                /// @notice Check if the current investor purchasing shares causes the demand to become greater or equal to the supply of 10000
                if (sharesSum + tempShares >= 10000) {

                    /// @notice Once demand >= supply, the lowest valid bidder is identified as the current investor attempting to purchase shares
                    /// @notice If there is more demand than supply, then the lowest valid bidder gets whatever shares are left over
                    lowestValidBid = topBid;
                    bidInfo.shares = 10000 - sharesSum;

                /// @notice If there is more supply than demand, then the lowest valid bidder is evidently the lowest valuable bid placer in the list
                } else if (bidInfo.prior == 0) lowestValidBid = topBid;

                /// @notice Sum the total number of identified bids, to verify if the demand grows larger than the supply
                /// @notice As the tail node takes priority (most valuable), to find the next least valuable, continue the process with a prior bid
                sharesSum += tempShares;
                topBid = bidInfo.prior;
            }
            lowestValidFinder = _investor;
        }

        /// @notice Retrieve the investor's bid information and the ether that they deposited during round 2
        bidInfo = roundTwoData[_investor];
        uint shares = bidInfo.shares;
        uint deposit = bidInfo.deposit;

        /// @notice Ensure that the bidder is purchasing at least 1 share, and that the deposit is not 0
        /// @notice A deposit of 0 implies that the investor has already received a refund, or is not eligible for one
        require(shares > 0 && deposit != 0, "Not Eligible");

        /// @notice Verify if the investor's bid is greater or equal to the value of the lowest valid bid
        /// @notice This is an important check because it represents whether or not an investor is successful
        if (isBidGreater(_investor, lowestValidBid) == 1) {

            /// @notice If an investor overpays, then they will be eligible to refund the amount of ether that exceeds the value of the shares they buy
            /// @notice If the investor pays the exact amount required to purchase the shares, their deposit becomes 0, so they cannot refund
            bidInfo.deposit = bidInfo.deposit - (bidInfo.priceEth * shares * 1 ether);
            deposit = bidInfo.deposit;

            /// @notice The investor receives shares equivalent to the value which they purchased, and they may now transfer them to others
            /// @notice Represents the total supply of the shares as the accumulation of all shares which are sold and claimed by investors
            balanceOf[msg.sender] += shares;
            totalSupply += shares;

            /// @notice Transfer event emitted to allow clients to collect logs
            emit Transfer(address(0), msg.sender, shares);
        }

        /// @notice Check if the investor requires a refund, if they are unsuccessful or if they overpay for their shares
        if (deposit != 0) {
            /// @notice Immediately set their deposit to 0, to ensure it may not be abused in any way whatsoever
            bidInfo.deposit = 0;

            /// @notice Send the investor a refund for the ether they are owed, and ensure that the refund is successful, or revert otherwise
            (bool sent, ) = payable(msg.sender).call{value: deposit}("");
            require(sent, "Failed to send Ether");  
        }
    }
}
