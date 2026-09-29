// Generated from contracts/out/Gavel.sol/Gavel.json by scripts/export-abi.mjs. Do not edit by hand.
export const gavelAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "usdcAddress",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "EXTENSION_TIME",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "EXTENSION_WINDOW",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_DURATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_IMAGE_URL_LENGTH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_TITLE_LENGTH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_DURATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "auctionCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "auctions",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "seller",
        type: "address",
        internalType: "address",
      },
      {
        name: "payInUsdc",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "title",
        type: "string",
        internalType: "string",
      },
      {
        name: "imageUrl",
        type: "string",
        internalType: "string",
      },
      {
        name: "startPrice",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minIncrement",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "endTime",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "createdBlock",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "highestBidder",
        type: "address",
        internalType: "address",
      },
      {
        name: "highestBid",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "bidCount",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "settled",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "cancelled",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "cancelAuction",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createAuction",
    inputs: [
      {
        name: "title",
        type: "string",
        internalType: "string",
      },
      {
        name: "imageUrl",
        type: "string",
        internalType: "string",
      },
      {
        name: "payInUsdc",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "startPrice",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minIncrement",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "duration",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "auctionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAuction",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Gavel.Auction",
        components: [
          {
            name: "seller",
            type: "address",
            internalType: "address",
          },
          {
            name: "payInUsdc",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "title",
            type: "string",
            internalType: "string",
          },
          {
            name: "imageUrl",
            type: "string",
            internalType: "string",
          },
          {
            name: "startPrice",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "minIncrement",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "endTime",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "createdBlock",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "highestBidder",
            type: "address",
            internalType: "address",
          },
          {
            name: "highestBid",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "bidCount",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "settled",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "cancelled",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingMon",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingUsdc",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "settle",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawMon",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawUsdc",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AuctionCancelled",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AuctionCreated",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "seller",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "title",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "payInUsdc",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "startPrice",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "minIncrement",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "endTime",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AuctionExtended",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "newEndTime",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AuctionSettled",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "winner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BidPlaced",
    inputs: [
      {
        name: "auctionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "bidder",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "endTime",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "isUsdc",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AuctionAlreadySettled",
    inputs: [],
  },
  {
    type: "error",
    name: "AuctionEnded",
    inputs: [],
  },
  {
    type: "error",
    name: "AuctionIsCancelled",
    inputs: [],
  },
  {
    type: "error",
    name: "AuctionNotEnded",
    inputs: [],
  },
  {
    type: "error",
    name: "AuctionNotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "BidTooLow",
    inputs: [],
  },
  {
    type: "error",
    name: "EmptyTitle",
    inputs: [],
  },
  {
    type: "error",
    name: "HasBids",
    inputs: [],
  },
  {
    type: "error",
    name: "ImageUrlTooLong",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidDuration",
    inputs: [],
  },
  {
    type: "error",
    name: "NotSeller",
    inputs: [],
  },
  {
    type: "error",
    name: "NothingToWithdraw",
    inputs: [],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "SellerCannotBid",
    inputs: [],
  },
  {
    type: "error",
    name: "TitleTooLong",
    inputs: [],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "WrongMsgValue",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroMinIncrement",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroStartPrice",
    inputs: [],
  },
] as const;
