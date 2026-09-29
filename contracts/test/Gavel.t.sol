// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/IERC6093.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Gavel} from "../src/Gavel.sol";

/// @dev Minimal USDC stand-in for tests: 6 decimals and a public mint.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    /// @dev USDC uses 6 decimals.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @dev Anyone can mint in tests.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Malicious bidder that tries to re-enter withdrawMon() when it receives MON.
contract ReentrancyAttacker {
    Gavel public immutable gavel;
    bool public catchReentry; // if true, swallow the failed re-entry so the outer withdraw can finish
    bool public reentryFailed;
    bytes public reentryError; // revert data of the failed re-entry
    uint256 public timesReceived;

    constructor(Gavel _gavel) {
        gavel = _gavel;
    }

    /// @dev Place a MON bid from this contract.
    function placeBid(uint256 auctionId) external payable {
        gavel.bid{value: msg.value}(auctionId, msg.value);
    }

    /// @dev Start the attack by withdrawing what this contract is owed.
    function attack(bool _catchReentry) external {
        catchReentry = _catchReentry;
        gavel.withdrawMon();
    }

    /// @dev On receiving MON, try to withdraw again before the first call finishes.
    receive() external payable {
        timesReceived++;
        if (catchReentry) {
            try gavel.withdrawMon() {}
            catch (bytes memory reason) {
                reentryFailed = true;
                reentryError = reason;
            }
        } else {
            gavel.withdrawMon();
        }
    }
}

contract GavelTest is Test {
    Gavel internal gavel;
    MockUSDC internal usdc;

    address internal seller = makeAddr("seller");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint64 internal constant ONE_HOUR = 1 hours;

    // MON amounts (18 decimals)
    uint256 internal constant MON_START = 1 ether;
    uint256 internal constant MON_INC = 0.1 ether;

    // USDC amounts (6 decimals)
    uint256 internal constant USDC_START = 10e6; // 10 USDC
    uint256 internal constant USDC_INC = 1e6; // 1 USDC

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

    function setUp() public {
        vm.warp(1_700_000_000);
        usdc = new MockUSDC();
        gavel = new Gavel(address(usdc));

        vm.deal(seller, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);

        usdc.mint(alice, 1_000e6);
        usdc.mint(bob, 1_000e6);
        usdc.mint(carol, 1_000e6);

        vm.prank(alice);
        usdc.approve(address(gavel), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(gavel), type(uint256).max);
        vm.prank(carol);
        usdc.approve(address(gavel), type(uint256).max);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function _createMon() internal returns (uint256) {
        vm.prank(seller);
        return gavel.createAuction("Vintage camera", "https://example.com/cam.png", false, MON_START, MON_INC, ONE_HOUR);
    }

    function _createUsdc() internal returns (uint256) {
        vm.prank(seller);
        return gavel.createAuction("Signed poster", "", true, USDC_START, USDC_INC, ONE_HOUR);
    }

    function _bidMon(address who, uint256 id, uint256 amount) internal {
        vm.prank(who);
        gavel.bid{value: amount}(id, amount);
    }

    function _bidUsdc(address who, uint256 id, uint256 amount) internal {
        vm.prank(who);
        gavel.bid(id, amount);
    }

    function _endOf(uint256 id) internal view returns (uint64) {
        return gavel.getAuction(id).endTime;
    }

    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------

    function test_CreateMonAuction() public {
        uint64 expectedEnd = uint64(block.timestamp) + ONE_HOUR;
        vm.expectEmit(true, true, false, true, address(gavel));
        emit AuctionCreated(1, seller, "Vintage camera", false, MON_START, MON_INC, expectedEnd);
        uint256 id = _createMon();

        assertEq(id, 1);
        assertEq(gavel.auctionCount(), 1);
        Gavel.Auction memory a = gavel.getAuction(id);
        assertEq(a.seller, seller);
        assertFalse(a.payInUsdc);
        assertEq(a.title, "Vintage camera");
        assertEq(a.imageUrl, "https://example.com/cam.png");
        assertEq(a.startPrice, MON_START);
        assertEq(a.minIncrement, MON_INC);
        assertEq(a.endTime, expectedEnd);
        assertEq(a.createdBlock, uint64(block.number));
        assertEq(a.highestBidder, address(0));
        assertEq(a.highestBid, 0);
        assertEq(a.bidCount, 0);
        assertFalse(a.settled);
        assertFalse(a.cancelled);
    }

    function test_CreateUsdcAuction() public {
        _createMon();
        uint64 expectedEnd = uint64(block.timestamp) + ONE_HOUR;
        vm.expectEmit(true, true, false, true, address(gavel));
        emit AuctionCreated(2, seller, "Signed poster", true, USDC_START, USDC_INC, expectedEnd);
        uint256 id = _createUsdc();

        assertEq(id, 2);
        assertEq(gavel.auctionCount(), 2);
        Gavel.Auction memory a = gavel.getAuction(id);
        assertEq(a.seller, seller);
        assertTrue(a.payInUsdc);
        assertEq(a.title, "Signed poster");
        assertEq(a.imageUrl, "");
        assertEq(a.startPrice, USDC_START);
        assertEq(a.minIncrement, USDC_INC);
        assertEq(a.endTime, expectedEnd);
        assertEq(a.createdBlock, uint64(block.number));
    }

    function test_UsdcIsStored() public view {
        assertEq(address(gavel.usdc()), address(usdc));
    }

    function test_RevertWhen_ConstructorUsdcZero() public {
        vm.expectRevert(Gavel.ZeroAddress.selector);
        new Gavel(address(0));
    }

    function test_RevertWhen_EmptyTitle() public {
        vm.expectRevert(Gavel.EmptyTitle.selector);
        gavel.createAuction("", "", false, MON_START, MON_INC, ONE_HOUR);
    }

    function test_RevertWhen_TitleTooLong() public {
        string memory title = string(new bytes(101));
        vm.expectRevert(Gavel.TitleTooLong.selector);
        gavel.createAuction(title, "", false, MON_START, MON_INC, ONE_HOUR);
    }

    function test_TitleAtMaxLengthWorks() public {
        string memory title = string(new bytes(100));
        gavel.createAuction(title, "", false, MON_START, MON_INC, ONE_HOUR);
        assertEq(gavel.auctionCount(), 1);
    }

    function test_RevertWhen_ImageUrlTooLong() public {
        string memory url = string(new bytes(301));
        vm.expectRevert(Gavel.ImageUrlTooLong.selector);
        gavel.createAuction("t", url, false, MON_START, MON_INC, ONE_HOUR);
    }

    function test_RevertWhen_StartPriceZero() public {
        vm.expectRevert(Gavel.ZeroStartPrice.selector);
        gavel.createAuction("t", "", false, 0, MON_INC, ONE_HOUR);
    }

    function test_RevertWhen_MinIncrementZero() public {
        vm.expectRevert(Gavel.ZeroMinIncrement.selector);
        gavel.createAuction("t", "", false, MON_START, 0, ONE_HOUR);
    }

    function test_RevertWhen_DurationTooShort() public {
        vm.expectRevert(Gavel.InvalidDuration.selector);
        gavel.createAuction("t", "", false, MON_START, MON_INC, 5 minutes - 1);
    }

    function test_RevertWhen_DurationTooLong() public {
        vm.expectRevert(Gavel.InvalidDuration.selector);
        gavel.createAuction("t", "", false, MON_START, MON_INC, 7 days + 1);
    }

    function test_DurationBoundsWork() public {
        gavel.createAuction("min", "", false, MON_START, MON_INC, 5 minutes);
        gavel.createAuction("max", "", true, USDC_START, USDC_INC, 7 days);
        assertEq(gavel.auctionCount(), 2);
    }

    // ------------------------------------------------------------------
    // Bid
    // ------------------------------------------------------------------

    function test_FirstBidAtStartPrice_Mon() public {
        uint256 id = _createMon();
        vm.expectEmit(true, true, false, true, address(gavel));
        emit BidPlaced(id, alice, MON_START, _endOf(id));
        _bidMon(alice, id, MON_START);

        Gavel.Auction memory a = gavel.getAuction(id);
        assertEq(a.highestBidder, alice);
        assertEq(a.highestBid, MON_START);
        assertEq(a.bidCount, 1);
        assertEq(address(gavel).balance, MON_START);
    }

    function test_FirstBidAtStartPrice_Usdc() public {
        uint256 id = _createUsdc();
        vm.expectEmit(true, true, false, true, address(gavel));
        emit BidPlaced(id, alice, USDC_START, _endOf(id));
        _bidUsdc(alice, id, USDC_START);

        Gavel.Auction memory a = gavel.getAuction(id);
        assertEq(a.highestBidder, alice);
        assertEq(a.highestBid, USDC_START);
        assertEq(a.bidCount, 1);
    }

    function test_RevertWhen_MonValueMismatch() public {
        uint256 id = _createMon();
        vm.prank(alice);
        vm.expectRevert(Gavel.WrongMsgValue.selector);
        gavel.bid{value: MON_START - 1}(id, MON_START);

        vm.prank(alice);
        vm.expectRevert(Gavel.WrongMsgValue.selector);
        gavel.bid{value: MON_START + 1}(id, MON_START);
    }

    function test_RevertWhen_UsdcBidSendsMon() public {
        uint256 id = _createUsdc();
        vm.prank(alice);
        vm.expectRevert(Gavel.WrongMsgValue.selector);
        gavel.bid{value: 1}(id, USDC_START);
    }

    function test_RevertWhen_UsdcBidWithoutEnoughApproval() public {
        uint256 id = _createUsdc();
        address dave = makeAddr("dave");
        usdc.mint(dave, 1_000e6);
        vm.prank(dave);
        usdc.approve(address(gavel), USDC_START - 1);

        vm.prank(dave);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector, address(gavel), USDC_START - 1, USDC_START
            )
        );
        gavel.bid(id, USDC_START);
    }

    function test_UsdcBidMovesExactAmount() public {
        uint256 id = _createUsdc();
        uint256 amount = USDC_START + 123_456; // 10.123456 USDC
        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 gavelBefore = usdc.balanceOf(address(gavel));

        _bidUsdc(alice, id, amount);

        assertEq(usdc.balanceOf(alice), aliceBefore - amount);
        assertEq(usdc.balanceOf(address(gavel)), gavelBefore + amount);
        assertEq(address(gavel).balance, 0);
    }

    function test_RevertWhen_FirstBidBelowStartPrice() public {
        uint256 id = _createMon();
        vm.prank(alice);
        vm.expectRevert(Gavel.BidTooLow.selector);
        gavel.bid{value: MON_START - 1}(id, MON_START - 1);

        uint256 uid = _createUsdc();
        vm.prank(alice);
        vm.expectRevert(Gavel.BidTooLow.selector);
        gavel.bid(uid, USDC_START - 1);
    }

    function test_RevertWhen_SecondBidBelowMinIncrement() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);

        uint256 tooLow = MON_START + MON_INC - 1;
        vm.prank(bob);
        vm.expectRevert(Gavel.BidTooLow.selector);
        gavel.bid{value: tooLow}(id, tooLow);

        // Exactly highestBid + minIncrement is accepted.
        _bidMon(bob, id, MON_START + MON_INC);
        assertEq(gavel.getAuction(id).highestBidder, bob);
    }

    function test_OutbidMon_CreditsPendingMon() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        _bidMon(bob, id, MON_START + MON_INC);

        assertEq(gavel.pendingMon(alice), MON_START);
        assertEq(gavel.pendingUsdc(alice), 0);
        assertEq(gavel.pendingMon(bob), 0);
        Gavel.Auction memory a = gavel.getAuction(id);
        assertEq(a.highestBidder, bob);
        assertEq(a.highestBid, MON_START + MON_INC);
        assertEq(a.bidCount, 2);
    }

    function test_OutbidUsdc_CreditsPendingUsdc() public {
        uint256 id = _createUsdc();
        _bidUsdc(alice, id, USDC_START);
        _bidUsdc(bob, id, USDC_START + USDC_INC);

        assertEq(gavel.pendingUsdc(alice), USDC_START);
        assertEq(gavel.pendingMon(alice), 0);
        assertEq(gavel.pendingUsdc(bob), 0);
        assertEq(gavel.getAuction(id).highestBidder, bob);
        assertEq(gavel.getAuction(id).bidCount, 2);
    }

    function test_SelfOutbidCreditsOldBid() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        _bidMon(alice, id, MON_START + MON_INC);
        assertEq(gavel.pendingMon(alice), MON_START);
        assertEq(gavel.getAuction(id).highestBidder, alice);

        uint256 uid = _createUsdc();
        _bidUsdc(alice, uid, USDC_START);
        _bidUsdc(alice, uid, USDC_START + USDC_INC);
        assertEq(gavel.pendingUsdc(alice), USDC_START);
    }

    function test_RevertWhen_SellerBids() public {
        uint256 id = _createMon();
        vm.prank(seller);
        vm.expectRevert(Gavel.SellerCannotBid.selector);
        gavel.bid{value: MON_START}(id, MON_START);
    }

    function test_RevertWhen_BidAfterEnd() public {
        uint256 id = _createMon();
        vm.warp(_endOf(id));
        vm.prank(alice);
        vm.expectRevert(Gavel.AuctionEnded.selector);
        gavel.bid{value: MON_START}(id, MON_START);
    }

    function test_RevertWhen_BidOnCancelled() public {
        uint256 id = _createMon();
        vm.prank(seller);
        gavel.cancelAuction(id);
        vm.prank(alice);
        vm.expectRevert(Gavel.AuctionIsCancelled.selector);
        gavel.bid{value: MON_START}(id, MON_START);
    }

    function test_RevertWhen_BidOnNonexistent() public {
        vm.prank(alice);
        vm.expectRevert(Gavel.AuctionNotFound.selector);
        gavel.bid{value: MON_START}(42, MON_START);

        vm.prank(alice);
        vm.expectRevert(Gavel.AuctionNotFound.selector);
        gavel.bid{value: MON_START}(0, MON_START);
    }

    function test_BidInLastTwoMinutesExtends() public {
        uint256 id = _createMon();
        uint64 end = _endOf(id);
        vm.warp(end - 60); // 1 minute left
        uint64 expectedEnd = uint64(block.timestamp) + 2 minutes;

        vm.expectEmit(true, false, false, true, address(gavel));
        emit AuctionExtended(id, expectedEnd);
        vm.expectEmit(true, true, false, true, address(gavel));
        emit BidPlaced(id, alice, MON_START, expectedEnd);
        _bidMon(alice, id, MON_START);

        assertEq(_endOf(id), expectedEnd);
    }

    function test_BidInLastTwoMinutesExtends_Usdc() public {
        uint256 id = _createUsdc();
        vm.warp(_endOf(id) - 1); // 1 second left
        uint64 expectedEnd = uint64(block.timestamp) + 2 minutes;

        vm.expectEmit(true, false, false, true, address(gavel));
        emit AuctionExtended(id, expectedEnd);
        _bidUsdc(alice, id, USDC_START);
        assertEq(_endOf(id), expectedEnd);
    }

    function test_BidBeforeLastTwoMinutesDoesNotExtend() public {
        uint256 id = _createMon();
        uint64 end = _endOf(id);
        vm.warp(end - 2 minutes); // exactly 2 minutes left: not inside the window
        vm.recordLogs();
        _bidMon(alice, id, MON_START);
        assertEq(_endOf(id), end);

        // Only BidPlaced was emitted, no AuctionExtended.
        assertEq(vm.getRecordedLogs().length, 1);
    }

    // ------------------------------------------------------------------
    // Settle
    // ------------------------------------------------------------------

    function test_RevertWhen_SettleBeforeEnd() public {
        uint256 id = _createMon();
        vm.warp(_endOf(id) - 1);
        vm.expectRevert(Gavel.AuctionNotEnded.selector);
        gavel.settle(id);
    }

    function test_SettleMonCreditsSellerPendingMon() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        _bidMon(bob, id, 2 ether);
        vm.warp(_endOf(id));

        vm.expectEmit(true, true, false, true, address(gavel));
        emit AuctionSettled(id, bob, 2 ether);
        gavel.settle(id);

        assertTrue(gavel.getAuction(id).settled);
        assertEq(gavel.pendingMon(seller), 2 ether);
        assertEq(gavel.pendingUsdc(seller), 0);
    }

    function test_SettleUsdcCreditsSellerPendingUsdc() public {
        uint256 id = _createUsdc();
        _bidUsdc(alice, id, USDC_START);
        _bidUsdc(bob, id, 25e6);
        vm.warp(_endOf(id));

        vm.expectEmit(true, true, false, true, address(gavel));
        emit AuctionSettled(id, bob, 25e6);
        gavel.settle(id);

        assertEq(gavel.pendingUsdc(seller), 25e6);
        assertEq(gavel.pendingMon(seller), 0);
    }

    function test_SettleWithNoBids() public {
        uint256 id = _createMon();
        vm.warp(_endOf(id));
        vm.expectEmit(true, true, false, true, address(gavel));
        emit AuctionSettled(id, address(0), 0);
        gavel.settle(id);

        assertTrue(gavel.getAuction(id).settled);
        assertEq(gavel.pendingMon(seller), 0);
        assertEq(gavel.pendingUsdc(seller), 0);
    }

    function test_RevertWhen_SettleTwice() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        vm.warp(_endOf(id));
        gavel.settle(id);
        vm.expectRevert(Gavel.AuctionAlreadySettled.selector);
        gavel.settle(id);
        assertEq(gavel.pendingMon(seller), MON_START);
    }

    function test_AnyoneCanSettle() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        vm.warp(_endOf(id));
        vm.prank(carol); // not seller, not a bidder
        gavel.settle(id);
        assertTrue(gavel.getAuction(id).settled);
        assertEq(gavel.pendingMon(seller), MON_START);
    }

    function test_RevertWhen_SettleCancelled() public {
        uint256 id = _createMon();
        vm.prank(seller);
        gavel.cancelAuction(id);
        vm.warp(_endOf(id));
        vm.expectRevert(Gavel.AuctionIsCancelled.selector);
        gavel.settle(id);
    }

    function test_RevertWhen_BidAfterSettle() public {
        uint256 id = _createMon();
        vm.warp(_endOf(id));
        gavel.settle(id);
        vm.prank(alice);
        vm.expectRevert(Gavel.AuctionAlreadySettled.selector);
        gavel.bid{value: MON_START}(id, MON_START);
    }

    // ------------------------------------------------------------------
    // Cancel
    // ------------------------------------------------------------------

    function test_SellerCanCancelWithNoBids() public {
        uint256 id = _createMon();
        vm.expectEmit(true, false, false, true, address(gavel));
        emit AuctionCancelled(id);
        vm.prank(seller);
        gavel.cancelAuction(id);
        assertTrue(gavel.getAuction(id).cancelled);
    }

    function test_RevertWhen_CancelAfterBid() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        vm.prank(seller);
        vm.expectRevert(Gavel.HasBids.selector);
        gavel.cancelAuction(id);
    }

    function test_RevertWhen_NonSellerCancels() public {
        uint256 id = _createMon();
        vm.prank(alice);
        vm.expectRevert(Gavel.NotSeller.selector);
        gavel.cancelAuction(id);
    }

    function test_RevertWhen_CancelTwice() public {
        uint256 id = _createMon();
        vm.prank(seller);
        gavel.cancelAuction(id);
        vm.prank(seller);
        vm.expectRevert(Gavel.AuctionIsCancelled.selector);
        gavel.cancelAuction(id);
    }

    // ------------------------------------------------------------------
    // Withdraw
    // ------------------------------------------------------------------

    function test_OutbidBidderWithdrawsMon() public {
        uint256 id = _createMon();
        _bidMon(alice, id, MON_START);
        _bidMon(bob, id, MON_START + MON_INC);

        uint256 before = alice.balance;
        vm.expectEmit(true, false, false, true, address(gavel));
        emit Withdrawn(alice, false, MON_START);
        vm.prank(alice);
        gavel.withdrawMon();

        assertEq(alice.balance, before + MON_START);
        assertEq(gavel.pendingMon(alice), 0);
    }

    function test_OutbidBidderWithdrawsUsdc() public {
        uint256 id = _createUsdc();
        _bidUsdc(alice, id, USDC_START);
        _bidUsdc(bob, id, USDC_START + USDC_INC);

        uint256 before = usdc.balanceOf(alice);
        vm.expectEmit(true, false, false, true, address(gavel));
        emit Withdrawn(alice, true, USDC_START);
        vm.prank(alice);
        gavel.withdrawUsdc();

        assertEq(usdc.balanceOf(alice), before + USDC_START);
        assertEq(gavel.pendingUsdc(alice), 0);
    }

    function test_RevertWhen_WithdrawMonNothingOwed() public {
        vm.prank(alice);
        vm.expectRevert(Gavel.NothingToWithdraw.selector);
        gavel.withdrawMon();
    }

    function test_RevertWhen_WithdrawUsdcNothingOwed() public {
        vm.prank(alice);
        vm.expectRevert(Gavel.NothingToWithdraw.selector);
        gavel.withdrawUsdc();
    }

    function test_SellerWithdrawsAfterSettle_Mon() public {
        uint256 id = _createMon();
        _bidMon(alice, id, 3 ether);
        vm.warp(_endOf(id));
        gavel.settle(id);

        uint256 before = seller.balance;
        vm.prank(seller);
        gavel.withdrawMon();
        assertEq(seller.balance, before + 3 ether);
        assertEq(gavel.pendingMon(seller), 0);
    }

    function test_SellerWithdrawsAfterSettle_Usdc() public {
        uint256 id = _createUsdc();
        _bidUsdc(alice, id, 42e6);
        vm.warp(_endOf(id));
        gavel.settle(id);

        uint256 before = usdc.balanceOf(seller);
        vm.prank(seller);
        gavel.withdrawUsdc();
        assertEq(usdc.balanceOf(seller), before + 42e6);
        assertEq(gavel.pendingUsdc(seller), 0);
    }

    function test_ReentrancyOnWithdrawMonFails() public {
        uint256 id = _createMon();
        ReentrancyAttacker attacker = new ReentrancyAttacker(gavel);

        attacker.placeBid{value: MON_START}(id);
        _bidMon(bob, id, MON_START + MON_INC);
        // A second, unrelated balance in the contract that the attacker would like to steal.
        _bidMon(carol, _createMon(), 5 ether);

        assertEq(gavel.pendingMon(address(attacker)), MON_START);
        uint256 gavelBefore = address(gavel).balance;

        // Variant 1: the re-entry reverts, which makes the MON transfer fail, so the whole withdraw reverts.
        vm.expectRevert(Gavel.TransferFailed.selector);
        attacker.attack(false);
        assertEq(address(attacker).balance, 0);
        assertEq(gavel.pendingMon(address(attacker)), MON_START);
        assertEq(address(gavel).balance, gavelBefore);

        // Variant 2: the attacker swallows the failed re-entry; it is paid exactly once.
        attacker.attack(true);
        assertTrue(attacker.reentryFailed());
        assertEq(attacker.timesReceived(), 1);
        assertEq(address(attacker).balance, MON_START);
        assertEq(gavel.pendingMon(address(attacker)), 0);
        assertEq(address(gavel).balance, gavelBefore - MON_START);
    }

    function test_ReentryIsBlockedByGuard() public {
        // Direct check that the nested call fails with OpenZeppelin's guard error.
        uint256 id = _createMon();
        ReentrancyAttacker attacker = new ReentrancyAttacker(gavel);
        attacker.placeBid{value: MON_START}(id);
        _bidMon(bob, id, MON_START + MON_INC);

        vm.expectCall(address(gavel), abi.encodeCall(Gavel.withdrawMon, ()), 2);
        attacker.attack(true);
        assertTrue(attacker.reentryFailed());
        assertEq(bytes4(attacker.reentryError()), ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
    }

    // ------------------------------------------------------------------
    // Balance check
    // ------------------------------------------------------------------

    function test_ContractBalancesEndAtZero() public {
        uint256 monId = _createMon();
        uint256 usdcId = _createUsdc();

        // Interleaved bidding on both auctions at the same time.
        _bidMon(alice, monId, 1 ether);
        _bidUsdc(bob, usdcId, 10e6);
        _bidMon(bob, monId, 1.5 ether);
        _bidUsdc(carol, usdcId, 12e6);
        _bidMon(carol, monId, 2 ether);
        _bidUsdc(alice, usdcId, 15.5e6);
        _bidMon(alice, monId, 3 ether);
        _bidUsdc(bob, usdcId, 20e6);

        // A late bid on the MON auction triggers anti-sniping.
        vm.warp(_endOf(monId) - 30);
        _bidMon(bob, monId, 4 ether);

        vm.warp(_endOf(monId) > _endOf(usdcId) ? _endOf(monId) : _endOf(usdcId));
        gavel.settle(monId);
        gavel.settle(usdcId);

        // Owed MON: alice 1 + 3, bob 1.5, carol 2, seller 4 = 11.5 total bid, all owed.
        assertEq(gavel.pendingMon(alice), 4 ether);
        assertEq(gavel.pendingMon(bob), 1.5 ether);
        assertEq(gavel.pendingMon(carol), 2 ether);
        assertEq(gavel.pendingMon(seller), 4 ether);
        // Owed USDC: bob 10, carol 12, alice 15.5, seller 20.
        assertEq(gavel.pendingUsdc(bob), 10e6);
        assertEq(gavel.pendingUsdc(carol), 12e6);
        assertEq(gavel.pendingUsdc(alice), 15.5e6);
        assertEq(gavel.pendingUsdc(seller), 20e6);

        address[4] memory everyone = [alice, bob, carol, seller];
        for (uint256 i = 0; i < everyone.length; i++) {
            vm.startPrank(everyone[i]);
            if (gavel.pendingMon(everyone[i]) > 0) gavel.withdrawMon();
            if (gavel.pendingUsdc(everyone[i]) > 0) gavel.withdrawUsdc();
            vm.stopPrank();
        }

        assertEq(address(gavel).balance, 0);
        assertEq(usdc.balanceOf(address(gavel)), 0);
        // Everyone got back what they were owed: seller gained 4 MON and 20 USDC.
        assertEq(seller.balance, 104 ether);
        assertEq(usdc.balanceOf(seller), 20e6);
    }
}
