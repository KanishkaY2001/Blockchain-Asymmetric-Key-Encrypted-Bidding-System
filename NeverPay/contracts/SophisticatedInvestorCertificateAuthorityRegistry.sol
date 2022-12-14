// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


//==============================================================================//
//                   ASIC Certification Registry Contract                       //
//==============================================================================//


/// @title ASIC's authorized certificate organization registry
/// @author Kanishka G Yamani
/// @notice The registry is managed by ASIC and smart contracts may verify public keys
/// @dev All functions are fully implemented, and function appropriately
contract SophisticatedInvestorCertificateAuthorityRegistry {
    

    //===========================================================//
    //               Registry Variables & Mappings               //
    //===========================================================//


    /// @notice Stores ASIC's crypto address, set during contract creation
    address ASIC;

    /// @notice A mapping of authorized organization public keys to their business names
    mapping(address => string) public certificateOrganizations;


    //===========================================================//
    //                    Contract Constructor                   //
    //===========================================================//


    /// @notice Sets ASIC's official address during contract creation
    /// @dev The ASIC address may not be changed after deployment
    /// @param _ASIC - This is the address of the contract creator (manages the registry)
    constructor(address _ASIC) {
        ///@notice Set the ASIC state variable to the provided public address
        ASIC = _ASIC;
    }


    //===========================================================//
    //                    Registry Management                    //
    //===========================================================//


    /// @notice Checks if the provided key exists in the authorized organization registry
    /// @dev Assumes that a valid organization must have a business name
    /// @param _key - This is the key that a function caller will provide to verify
    /// @return authorized - Whether or not the provided key is authorized
    function isKeyAuthorized(address _key) external view returns (bool authorized) {
        /// @notice Ensures that the length is not 0, meaning that the business is registered
        return (bytes(certificateOrganizations[_key]).length != 0);
    }

    /// @notice Adds the provided key and business name to the registry mapping
    /// @dev ASIC must add a business name which is not empty (length = 0)
    /// @param _key - This is the organization's public key to add into the registry
    /// @param _organizationName - The name of the organization to be registered
    function addKeyToRegistry(address _key, string memory _organizationName) external {
        /// @notice Ensures ASIC is the caller and that the organization has a name
        require(msg.sender == ASIC && bytes(_organizationName).length != 0, "Invalid Input");
        
        /// @notice Adds the organization to the registry
        certificateOrganizations[_key] = _organizationName;
    }

    /// @notice Removes an organization from the registry (may no longer verify investors)
    /// @dev By setting the string to "", its length effectively becomes 0
    /// @param _key - This is the organization's public key to remove from the registry
    function removeKeyFromRegistry(address _key) external {
        /// @notice Ensures that the function caller is ASIC's address, as a security measure
        require(msg.sender == ASIC, "Unauthorized");

        /// @notice Set the organization name to an empty string, can no longer authorize
        certificateOrganizations[_key] = "";
    }
 }