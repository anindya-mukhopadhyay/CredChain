// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract CredentialRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    enum CredentialStatus {
        None,
        Active,
        Revoked
    }

    enum RelationshipType {
        DerivedFrom,
        PartOf,
        Supports,
        PrerequisiteFor
    }

    struct CredentialProof {
        bytes32 documentHash;
        bytes32 credentialType;
        address issuer;
        uint64 issuedAt;
        CredentialStatus status;
    }

    struct CredentialRelationship {
        bytes32 sourceCredentialId;
        bytes32 targetCredentialId;
        RelationshipType relationshipType;
    }

    mapping(bytes32 => CredentialProof) private credentials;
    mapping(bytes32 => CredentialRelationship[]) private credentialRelationships;

    event CredentialRegistered(
        bytes32 indexed credentialId,
        bytes32 indexed documentHash,
        bytes32 indexed credentialType,
        address issuer
    );
    event CredentialRevoked(bytes32 indexed credentialId, address indexed revokedBy, bytes32 reasonCode);
    event CredentialRelationshipAdded(
        bytes32 indexed sourceCredentialId,
        bytes32 indexed targetCredentialId,
        RelationshipType relationshipType
    );

    error CredentialAlreadyRegistered(bytes32 credentialId);
    error CredentialNotFound(bytes32 credentialId);
    error CredentialNotActive(bytes32 credentialId);
    error InvalidZeroValue();
    error InvalidRelationship();

    constructor(address admin) {
        if (admin == address(0)) {
            revert InvalidZeroValue();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
    }

    function registerCredential(
        bytes32 credentialId,
        bytes32 documentHash,
        bytes32 credentialType
    ) external onlyRole(ISSUER_ROLE) {
        if (credentialId == bytes32(0) || documentHash == bytes32(0) || credentialType == bytes32(0)) {
            revert InvalidZeroValue();
        }

        if (credentials[credentialId].status != CredentialStatus.None) {
            revert CredentialAlreadyRegistered(credentialId);
        }

        credentials[credentialId] = CredentialProof({
            documentHash: documentHash,
            credentialType: credentialType,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            status: CredentialStatus.Active
        });

        emit CredentialRegistered(credentialId, documentHash, credentialType, msg.sender);
    }

    function addCredentialRelationship(
        bytes32 sourceCredentialId,
        bytes32 targetCredentialId,
        RelationshipType relationshipType
    ) external onlyRole(ISSUER_ROLE) {
        if (sourceCredentialId == bytes32(0) || targetCredentialId == bytes32(0)) {
            revert InvalidZeroValue();
        }

        if (sourceCredentialId == targetCredentialId) {
            revert InvalidRelationship();
        }

        _requireActive(sourceCredentialId);
        _requireActive(targetCredentialId);

        credentialRelationships[sourceCredentialId].push(
            CredentialRelationship({
                sourceCredentialId: sourceCredentialId,
                targetCredentialId: targetCredentialId,
                relationshipType: relationshipType
            })
        );

        emit CredentialRelationshipAdded(sourceCredentialId, targetCredentialId, relationshipType);
    }

    function revokeCredential(bytes32 credentialId, bytes32 reasonCode) external onlyRole(REVOKER_ROLE) {
        _requireActive(credentialId);
        credentials[credentialId].status = CredentialStatus.Revoked;
        emit CredentialRevoked(credentialId, msg.sender, reasonCode);
    }

    function verifyCredential(bytes32 credentialId, bytes32 documentHash) external view returns (bool) {
        CredentialProof memory credential = credentials[credentialId];
        return credential.status == CredentialStatus.Active && credential.documentHash == documentHash;
    }

    function isCredentialValid(bytes32 credentialId) external view returns (bool) {
        return credentials[credentialId].status == CredentialStatus.Active;
    }

    function getCredential(bytes32 credentialId) external view returns (CredentialProof memory) {
        if (credentials[credentialId].status == CredentialStatus.None) {
            revert CredentialNotFound(credentialId);
        }

        return credentials[credentialId];
    }

    function getCredentialRelationships(
        bytes32 credentialId
    ) external view returns (CredentialRelationship[] memory) {
        return credentialRelationships[credentialId];
    }

    function _requireActive(bytes32 credentialId) private view {
        if (credentials[credentialId].status == CredentialStatus.None) {
            revert CredentialNotFound(credentialId);
        }

        if (credentials[credentialId].status != CredentialStatus.Active) {
            revert CredentialNotActive(credentialId);
        }
    }
}

