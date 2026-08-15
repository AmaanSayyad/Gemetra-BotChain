// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ERC-20 surface used for payroll / VAT disbursement.
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title GemetraCore
/// @notice On-chain settlement + RWA VAT registry + AI agent action log for Gemetra on BOT Chain.
/// @dev Users keep custody. The contract never holds funds; it routes transfers and emits compliance events.
contract GemetraCore {
    event Disbursed(
        address indexed payer,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bytes32 ref,
        string kind
    );

    event VatRefundRecorded(
        bytes32 indexed claimId,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 amount,
        string receiptRef
    );

    event AgentActionLogged(
        address indexed actor,
        bytes32 indexed actionId,
        string kind,
        bytes32 payloadHash
    );

    error LengthMismatch();
    error ZeroAddress();
    error TransferFailed();
    error NativeMismatch();

    /// @notice Batch payroll or refund payouts. `token == address(0)` means native BOT.
    function disburse(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 ref,
        string calldata kind
    ) external payable {
        if (recipients.length != amounts.length) revert LengthMismatch();

        uint256 total;
        for (uint256 i; i < recipients.length; ++i) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            total += amounts[i];
        }

        if (token == address(0)) {
            if (msg.value != total) revert NativeMismatch();
            for (uint256 i; i < recipients.length; ++i) {
                (bool ok, ) = recipients[i].call{value: amounts[i]}("");
                if (!ok) revert TransferFailed();
                emit Disbursed(msg.sender, address(0), recipients[i], amounts[i], ref, kind);
            }
            return;
        }

        if (msg.value != 0) revert NativeMismatch();
        for (uint256 i; i < recipients.length; ++i) {
            bool ok = IERC20(token).transferFrom(msg.sender, recipients[i], amounts[i]);
            if (!ok) revert TransferFailed();
            emit Disbursed(msg.sender, token, recipients[i], amounts[i], ref, kind);
        }
    }

    /// @notice Immutable on-chain VAT refund claim record (RWA / compliance).
    function recordVatRefund(
        bytes32 claimId,
        address recipient,
        address token,
        uint256 amount,
        string calldata receiptRef
    ) external {
        if (recipient == address(0)) revert ZeroAddress();
        emit VatRefundRecorded(claimId, msg.sender, recipient, token, amount, receiptRef);
    }

    /// @notice AI-native audit trail for agent-driven payroll / refund decisions.
    function logAgentAction(bytes32 actionId, string calldata kind, bytes32 payloadHash) external {
        emit AgentActionLogged(msg.sender, actionId, kind, payloadHash);
    }
}
