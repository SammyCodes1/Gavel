// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Gavel
/// @notice Live onchain auctions on Monad. Each auction is priced in native MON or in USDC.
/// @dev Payouts use a pull ("withdraw") pattern: the contract only records what each
///      address is owed, and the owner of that balance calls withdrawMon()/withdrawUsdc().
///      No owner, no admin, no fees, no pause, no upgradeability, no sweep.
contract Gavel is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    uint64 public constant MIN_DURATION = 5 minutes;
    uint64 public constant MAX_DURATION = 7 days;
    uint64 public constant EXTENSION_WINDOW = 2 minutes;
    uint64 public constant EXTENSION_TIME = 2 minutes;
    uint256 public constant MAX_TITLE_LENGTH = 100; // bytes
    uint256 public constant MAX_IMAGE_URL_LENGTH = 300; // bytes

    // ---------------------------------------------------------------------
    // Data
    // ---------------------------------------------------------------------

    struct Auction {
        address seller;
        bool payInUsdc; // false = MON, true = USDC. Set once at creation, never changes.
        string title;
        string imageUrl; // optional, may be empty
        uint256 startPrice; // first bid must be >= this
        uint256 minIncrement; // each new bid must be >= highestBid + minIncrement
        uint64 endTime;
        uint64 createdBlock; // block number when created, used by the website to load bid history
        address highestBidder;
        uint256 highestBid;
        uint32 bidCount;
        bool settled;
        bool cancelled;
    }

    /// @notice The USDC token used by USDC-priced auctions (6 decimals).
    IERC20 public immutable usdc;

    /// @notice Number of auctions created so far. Auction IDs start at 1.
    uint256 public auctionCount;

    /// @notice All auctions by ID.
    mapping(uint256 => Auction) public auctions;

    /// @notice MON owed to each address (collect with withdrawMon).
    mapping(address => uint256) public pendingMon;

    /// @notice USDC owed to each address (collect with withdrawUsdc).
    mapping(address => uint256) public pendingUsdc;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        string title,
        bool payInUsdc,
        uint256 startPrice,
        uint256 minIncrement,
        uint64 endTime
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint64 endTime);
    event AuctionExtended(uint256 indexed auctionId, uint64 newEndTime);
    event AuctionSettled(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionCancelled(uint256 indexed auctionId);
    event Withdrawn(address indexed account, bool isUsdc, uint256 amount);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroAddress();
    error EmptyTitle();
    error TitleTooLong();
    error ImageUrlTooLong();
    error ZeroStartPrice();
    error ZeroMinIncrement();
    error InvalidDuration();
    error AuctionNotFound();
    error AuctionIsCancelled();
    error AuctionAlreadySettled();
    error AuctionEnded();
    error AuctionNotEnded();
    error SellerCannotBid();
    error WrongMsgValue();
    error BidTooLow();
    error NotSeller();
    error HasBids();
    error NothingToWithdraw();
    error TransferFailed();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @param usdcAddress The official USDC token for this network.
    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert ZeroAddress();
        usdc = IERC20(usdcAddress);
    }

    // ---------------------------------------------------------------------
    // Auction lifecycle
    // ---------------------------------------------------------------------

    /// @notice Create a new auction priced in MON (payInUsdc = false) or USDC (payInUsdc = true).
    /// @dev startPrice and minIncrement are in the auction's currency units
    ///      (wei for MON, 6-decimal units for USDC).
    function createAuction(
        string calldata title,
        string calldata imageUrl,
        bool payInUsdc,
        uint256 startPrice,
        uint256 minIncrement,
        uint64 duration
    ) external returns (uint256 auctionId) {
        // Checks
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(title).length > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (bytes(imageUrl).length > MAX_IMAGE_URL_LENGTH) revert ImageUrlTooLong();
        if (startPrice == 0) revert ZeroStartPrice();
        if (minIncrement == 0) revert ZeroMinIncrement();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();

        // Effects
        auctionId = ++auctionCount;
        // Casting to uint64 is safe: block timestamps and block numbers stay far below 2^64.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 endTime = uint64(block.timestamp) + duration;

        Auction storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.payInUsdc = payInUsdc;
        a.title = title;
        a.imageUrl = imageUrl;
        a.startPrice = startPrice;
        a.minIncrement = minIncrement;
        a.endTime = endTime;
        // forge-lint: disable-next-line(unsafe-typecast)
        a.createdBlock = uint64(block.number);

        emit AuctionCreated(auctionId, msg.sender, title, payInUsdc, startPrice, minIncrement, endTime);
    }

    /// @notice Bid `amount` on an auction. For MON auctions send msg.value == amount.
    ///         For USDC auctions send no MON and approve this contract for `amount` USDC first.
    function bid(uint256 auctionId, uint256 amount) external payable nonReentrant {
        Auction storage a = auctions[auctionId];

        // Checks
        if (a.seller == address(0)) revert AuctionNotFound();
        if (a.cancelled) revert AuctionIsCancelled();
        if (a.settled) revert AuctionAlreadySettled();
        if (block.timestamp >= a.endTime) revert AuctionEnded();
        if (msg.sender == a.seller) revert SellerCannotBid();

        bool isUsdc = a.payInUsdc;
        if (isUsdc) {
            if (msg.value != 0) revert WrongMsgValue();
        } else {
            if (msg.value != amount) revert WrongMsgValue();
        }

        address previousBidder = a.highestBidder;
        uint256 previousBid = a.highestBid;
        if (previousBidder == address(0)) {
            if (amount < a.startPrice) revert BidTooLow();
        } else {
            if (amount < previousBid + a.minIncrement) revert BidTooLow();
        }

        // Effects
        // Refund the previous highest bidder through the pull pattern
        // (this also covers someone outbidding themselves).
        if (previousBidder != address(0)) {
            if (isUsdc) {
                pendingUsdc[previousBidder] += previousBid;
            } else {
                pendingMon[previousBidder] += previousBid;
            }
        }

        a.highestBidder = msg.sender;
        a.highestBid = amount;
        a.bidCount += 1;

        // Anti-sniping: a bid in the last EXTENSION_WINDOW pushes the end out.
        if (a.endTime - block.timestamp < EXTENSION_WINDOW) {
            // Safe cast: block.timestamp is far below 2^64.
            // forge-lint: disable-next-line(unsafe-typecast)
            uint64 newEndTime = uint64(block.timestamp) + EXTENSION_TIME;
            a.endTime = newEndTime;
            emit AuctionExtended(auctionId, newEndTime);
        }

        emit BidPlaced(auctionId, msg.sender, amount, a.endTime);

        // Interactions
        if (isUsdc) {
            usdc.safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    /// @notice Close an auction after it ends. Anyone can call. Credits the seller with the winning bid.
    function settle(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];

        // Checks
        if (a.seller == address(0)) revert AuctionNotFound();
        if (a.cancelled) revert AuctionIsCancelled();
        if (a.settled) revert AuctionAlreadySettled();
        if (block.timestamp < a.endTime) revert AuctionNotEnded();

        // Effects
        a.settled = true;
        address winner = a.highestBidder;
        uint256 amount = a.highestBid;
        if (winner != address(0)) {
            if (a.payInUsdc) {
                pendingUsdc[a.seller] += amount;
            } else {
                pendingMon[a.seller] += amount;
            }
        }

        emit AuctionSettled(auctionId, winner, amount);
    }

    /// @notice Cancel an auction. Only the seller, and only while nobody has bid.
    function cancelAuction(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];

        // Checks
        if (a.seller == address(0)) revert AuctionNotFound();
        if (msg.sender != a.seller) revert NotSeller();
        if (a.settled) revert AuctionAlreadySettled();
        if (a.cancelled) revert AuctionIsCancelled();
        if (a.bidCount != 0) revert HasBids();

        // Effects
        a.cancelled = true;

        emit AuctionCancelled(auctionId);
    }

    // ---------------------------------------------------------------------
    // Withdrawals
    // ---------------------------------------------------------------------

    /// @notice Collect all MON owed to the caller.
    function withdrawMon() external nonReentrant {
        // Checks
        uint256 amount = pendingMon[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        // Effects
        pendingMon[msg.sender] = 0;
        emit Withdrawn(msg.sender, false, amount);

        // Interactions
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Collect all USDC owed to the caller.
    function withdrawUsdc() external nonReentrant {
        // Checks
        uint256 amount = pendingUsdc[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        // Effects
        pendingUsdc[msg.sender] = 0;
        emit Withdrawn(msg.sender, true, amount);

        // Interactions
        usdc.safeTransfer(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Return the full auction struct (the public `auctions` getter returns a tuple).
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }
}
