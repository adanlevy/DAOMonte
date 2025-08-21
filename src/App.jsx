import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  Upload, ThumbsUp, ThumbsDown, Users, Settings, Shield, Hash, ListFilter,
  Loader2, RefreshCcw, ChevronDown, ChevronRight, LogIn, LogOut, UserCog,
  Eye, LinkIcon, Hourglass, CircleSlash, Pause, Play
} from "lucide-react";
import Papa from "papaparse";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminPanel from "./AdminPanel";
import GroupList from "./GroupList";
import ProposalList from "./ProposalList";

// ------------------ CONFIG ------------------
const AMOY = {
  chainIdHex: "0x13882",
  chainIdDec: 80002,
  chainName: "Polygon Amoy",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"]
};

const CONTRACT_ADDRESS = "0x865F0417746423B46B1CDc84e37246a6de8e9729";

const ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "a",
				"type": "address"
			}
		],
		"name": "addAdmin",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "address[]",
				"name": "addrs",
				"type": "address[]"
			}
		],
		"name": "addUsersToGroup",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "admin",
				"type": "address"
			}
		],
		"name": "AdminAdded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "admin",
				"type": "address"
			}
		],
		"name": "AdminRemoved",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "newChoice",
				"type": "uint8"
			}
		],
		"name": "changeVote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "createGroup",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "text",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint64",
				"name": "startTime",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "endTime",
				"type": "uint64"
			}
		],
		"name": "createProposal",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "title",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint64",
				"name": "startDate",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "endDate",
				"type": "uint64"
			}
		],
		"name": "createProposal2",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "active",
				"type": "bool"
			}
		],
		"name": "GroupActiveSet",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "GroupCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "GroupMemberAdded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "GroupMemberRemoved",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "oldOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "pause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Paused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "title",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "startDate",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint64",
				"name": "endDate",
				"type": "uint64"
			}
		],
		"name": "ProposalCreated",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "dniHash",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "nameHash",
				"type": "bytes32"
			}
		],
		"name": "registerUser",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "a",
				"type": "address"
			}
		],
		"name": "removeAdmin",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "removeUserFromAllGroups",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "removeUserFromGroup",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			}
		],
		"name": "retractVote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "uri",
				"type": "string"
			}
		],
		"name": "RosterURIUpdated",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "active",
				"type": "bool"
			}
		],
		"name": "setGroupActive",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "uri",
				"type": "string"
			}
		],
		"name": "setRosterURI",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "unpause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Unpaused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "dniHash",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "nameHash",
				"type": "bytes32"
			}
		],
		"name": "UserRegistered",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "choice",
				"type": "uint8"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "oldChoice",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "newChoice",
				"type": "uint8"
			}
		],
		"name": "VoteChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "oldChoice",
				"type": "uint8"
			}
		],
		"name": "VoteRetracted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "choice",
				"type": "uint8"
			}
		],
		"name": "Voted",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "getAdmins",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "count",
				"type": "uint256"
			}
		],
		"name": "getAllProposals",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "out",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			}
		],
		"name": "getGroupCore",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "active",
				"type": "bool"
			},
			{
				"internalType": "uint32",
				"name": "memberCount",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			}
		],
		"name": "getGroupMembers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "count",
				"type": "uint256"
			}
		],
		"name": "getGroupMembersSlice",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "out",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			}
		],
		"name": "getProposalCore",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "text",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint64",
				"name": "startTime",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "endTime",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "upCount",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "downCount",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			}
		],
		"name": "getProposalCore2",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "title",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint64",
				"name": "startDate",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "endDate",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "upCount",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "downCount",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			}
		],
		"name": "getProposalCounts",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "up",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "down",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "noVotaron",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			}
		],
		"name": "getProposalsByGroup",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "count",
				"type": "uint256"
			}
		],
		"name": "getProposalsByGroupSlice",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "out",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "start",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "count",
				"type": "uint256"
			}
		],
		"name": "getRegisteredUsers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "out",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUserGroups",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "u",
				"type": "address"
			}
		],
		"name": "getUserHashes",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "dniHash",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "nameHash",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUserVote",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "groupCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "groups",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "active",
				"type": "bool"
			},
			{
				"internalType": "uint32",
				"name": "memberCount",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isAdmin",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isInGroup",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "u",
				"type": "address"
			}
		],
		"name": "isRegistered",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			}
		],
		"name": "isVotingOpen",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "proposalCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "proposals",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "title",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "legacyText",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint64",
				"name": "startDate",
				"type": "uint64"
			},
			{
				"internalType": "uint64",
				"name": "endDate",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "upCount",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "downCount",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "rosterURI",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "users",
		"outputs": [
			{
				"internalType": "bool",
				"name": "registered",
				"type": "bool"
			},
			{
				"internalType": "bytes32",
				"name": "dniHash",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "nameHash",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// ------------------ Context ------------------
import { GroupDAOContext } from "./GroupDAOContext";

// ------------------ Helpers ------------------
const nowSec = () => Math.floor(Date.now() / 1000);

const withGas = async (estimatePromise, txPromiseFactory) => {
  try {
    const est = await estimatePromise;
    const gasLimit = (est * 110n) / 100n; // +10%
    return await txPromiseFactory({ gasLimit });
  } catch {
    return await txPromiseFactory({});
  }
};

// ------------------ Componente Principal ------------------
export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState({});
  const [groups, setGroups] = useState([]);
  const [myGroupIds, setMyGroupIds] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [groupMembersCache, setGroupMembersCache] = useState({});
  const [openMembersGroup, setOpenMembersGroup] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [roster, setRoster] = useState([]);
  const [rosterFilter, setRosterFilter] = useState("");
  const [rosterSelection, setRosterSelection] = useState({});
  const [targetGroupId, setTargetGroupId] = useState("");
  const [rosterURL, setRosterURL] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [baseAddresses, setBaseAddresses] = useState([]);

  const isBusy = (k) => !!busy[k];

  const run = useCallback(async (key, fn) => {
    setBusy((s) => ({ ...s, [key]: true }));
    try {
      await fn();
      toast.success(`Acción ${key} completada con éxito`);
    } catch (e) {
      const msg = e?.shortMessage || e?.message || "Error en la acción";
      toast.error(msg);
      setError(msg);
    } finally {
      setBusy((s) => ({ ...s, [key]: false }));
    }
  }, []);

  const rosterIndex = useMemo(() => {
    const m = new Map();
    for (const r of roster) if (r.address) {
      m.set(r.address.toLowerCase(), {
        name: r.name || r.nombre || "",
        surname: r.surname || r.apellido || "",
        dni: r.dni || r.DNI || ""
      });
    }
    return m;
  }, [roster]);

  const demoGroups = [
    { id: 1, name: "Socios/as", active: true, memberCount: 3 },
    { id: 2, name: "Comisión Directiva", active: true, memberCount: 5 }
  ];
  const demoProposals = [
    {
      id: 1,
      title: "Aprobar presupuesto 2025",
      description: "Detalle lorem ipsum.",
      groupId: 2,
      groupIds: [2],
      startTime: nowSec() - 3600,
      endTime: nowSec() + 7200,
      creator: "0xAdmin",
      upCount: 3,
      downCount: 1,
      noVotaron: 2,
      myVote: 0
    },
    {
      id: 2,
      title: "Cambiar reglamento",
      description: "Texto más largo…",
      groupId: 1,
      groupIds: [1],
      startTime: nowSec() - 10000,
      endTime: nowSec() - 5000,
      creator: "0xAdmin",
      upCount: 10,
      downCount: 12,
      noVotaron: 0,
      myVote: 0
    }
  ];

  // ------------------ Web3 Helpers ------------------
  const ensureAmoy = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask no detectado");
    const cid = await window.ethereum.request({ method: "eth_chainId" });
    if (cid !== AMOY.chainIdHex) {
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: AMOY.chainIdHex }] }); }
      catch (err) {
        if (err.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [AMOY] });
        else throw err;
      }
    }
  }, []);

  // ------------------ Acciones ------------------
  const fetchAdmins = useCallback(async () => {
    if (!contract) return;
    try {
      const list = await contract.getAdmins?.();
      if (Array.isArray(list)) setAdmins(list);
    } catch {
      // silently ignore errors
    }
  }, [contract]);

  const buildRegisteredBase = useCallback(async () => {
    if (!contract) return [];
    const addrsSet = new Set();

    try {
      const totalUsers = await contract.getRegisteredUsers(0, 1000);
      totalUsers.forEach(addr => addr && addrsSet.add(addr.toLowerCase()));
    } catch (e) {
      console.warn("getRegisteredUsers falló, usando eventos", e);
      try {
        const f = contract.filters?.UserRegistered?.();
        if (f) {
          const evts = await contract.queryFilter(f, 0, "latest");
          evts.forEach(e => {
            const addr = e.args?.user;
            if (addr) addrsSet.add(addr.toLowerCase());
          });
        }
      } catch {
        // Intentionally ignore errors here
      }
    }

    if (addrsSet.size === 0 && !demo) {
      toast.warn("No se encontraron usuarios registrados. Verifica el contrato o carga un CSV.");
    }

    return Array.from(addrsSet.values());
  }, [contract, demo]);
  
  const fetchAll = useCallback(async () => {
    if (!contract || !account || demo) return;
    setLoadingAll(true);
    setError("");
    try {
      setLoadingGroups(true);
      const admin = await contract.isAdmin(account);
      setIsAdmin(admin);
      const reg = await contract.isRegistered(account);
      setRegistered(reg);

      const totalGroups = Number(await contract.groupCount());
      if (totalGroups > 100) throw new Error("Demasiados grupos, usa paginación");
      const g = [];
      for (let id = 1; id <= totalGroups; id++) {
        const core = await contract.getGroupCore(id);
        g.push({ id, name: core[1], active: core[2], memberCount: Number(core[3]) });
      }
      setGroups(g);

      const mg = await contract.getUserGroups(account);
      setMyGroupIds(mg.map(Number));
      await fetchAdmins();

      setLoadingProposals(true);
      const propList = [];
      const totalP = Number(await contract.proposalCount());
      if (totalP > 1000) throw new Error("Demasiadas propuestas, usa paginación");
      const pids = await contract.getAllProposals(0, totalP);
      for (const pid of pids.map(Number)) {
        try {
          let title = "", description = "";
          let groupId, start, end, creator, up, down;
          try {
            const p2 = await contract.getProposalCore2(pid);
            title = p2[1];
            description = p2[2];
            groupId = Number(p2[3]);
            start = Number(p2[4]);
            end = Number(p2[5]);
            creator = p2[6];
            up = Number(p2[7]);
            down = Number(p2[8]);
          } catch {
            const p1 = await contract.getProposalCore(pid);
            const text = p1[1] || "";
            const split = text.split("||");
            title = split[0] || text;
            description = split.slice(1).join("||");
            groupId = Number(p1[2]);
            start = Number(p1[3]);
            end = Number(p1[4]);
            creator = p1[5];
            up = Number(p1[6]);
            down = Number(p1[7]);
          }
          let noV = 0;
          try { const counts = await contract.getProposalCounts(pid); noV = Number(counts[2]); } catch { /* intentionally ignore errors */ }
          let myVote = 0;
          try { myVote = Number(await contract.getUserVote(pid, account)); } catch { /* intentionally ignore errors */ }
          propList.push({
            id: pid,
            title,
            description,
            groupId,
            groupIds: [groupId],
            startTime: start,
            endTime: end,
            creator,
            upCount: up,
            downCount: down,
            noVotaron: noV,
            myVote
          });
        } catch {
          // Intentionally ignore errors here
        }
      }
      setProposals(propList);

      const list = await buildRegisteredBase();
      setBaseAddresses(list);
    } catch (e) {
      toast.error(e.message || String(e));
      setError(e.message || String(e));
    } finally {
      setLoadingGroups(false);
      setLoadingProposals(false);
      setLoadingAll(false);
    }
  }, [contract, account, demo, fetchAdmins, buildRegisteredBase]);


  const connect = useCallback(async () => {
    await run('connect', async () => {
      await ensureAmoy();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const _acc = await signer.getAddress();
      const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      setAccount(_acc);
      setContract(_contract);
    });
  }, [ensureAmoy, run]);

  const disconnect = useCallback(() => {
    run('disconnect', async () => {
      setAccount(null);
      setContract(null);
      setIsAdmin(false);
      setIsOwner(false);
      setRegistered(null);
      setGroups([]);
      setMyGroupIds([]);
      setProposals([]);
      setGroupMembersCache({});
      setAdmins([]);
      setBaseAddresses([]);
      setCsvData([]);
      setRoster([]);
    });
  }, [run]);

  // Inicialización con proveedor HTTP estático
  useEffect(() => {
    const initializeContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(AMOY.rpcUrls[0]);
        const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        setContract(_contract); // Contrato de solo lectura inicialmente
      } catch (e) {
        console.error("Error inicializando contrato:", e);
        setError("No se pudo conectar al nodo RPC. Verifica la red.");
      }
    };
    initializeContract();
  }, []);

  // Escuchar eventos y cambios de cuenta/chain solo si MetaMask está disponible
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accs) => { if (accs?.length) setAccount(ethers.getAddress(accs[0])); else disconnect(); };
    const onChain = () => ensureAmoy().catch(() => {});
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, [connect, disconnect, ensureAmoy]);

  // Obtener datos completos al establecer cuenta y contrato
  useEffect(() => {
    if (!contract || !account || demo) return;
    fetchAll();
  }, [contract, account, demo, fetchAll]);

  // Verificar si es owner tras conectar
  useEffect(() => {
    if (!contract || !account) return;
    run('checkOwner', async () => {
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());
    });
  }, [contract, account, run]);

  // Cargar rosterURI
  useEffect(() => {
    if (!contract) return;
    run('fetchRosterURI', async () => {
      let url = await contract.rosterURI();
      if (!url) url = localStorage.getItem('groupdao.rosterURL') || "";
      setRosterURL(url);
    });
  }, [contract, fetchAll, run]);

  // Escuchar eventos
  useEffect(() => {
    if (!contract) return;
    const onUserRegistered = () => fetchAll();
    const onGroupCreated = () => fetchAll();
    const onProposalCreated = () => fetchAll();
    const onRosterURIUpdated = (uri) => setRosterURL(uri);
    contract.on("UserRegistered", onUserRegistered);
    contract.on("GroupCreated", onGroupCreated);
    contract.on("ProposalCreated", onProposalCreated);
    contract.on("RosterURIUpdated", onRosterURIUpdated);
    return () => {
      contract.off("UserRegistered", onUserRegistered);
      contract.off("GroupCreated", onGroupCreated);
      contract.off("ProposalCreated", onProposalCreated);
      contract.off("RosterURIUpdated", onRosterURIUpdated);
    };
  }, [contract, fetchAll]);

  const recomputeRoster = useCallback((baseAddrList, csvRows) => {
    const mapCSV = new Map();
    (csvRows || []).forEach(r => {
      const addr = (r.address || r.wallet || "").trim().toLowerCase();
      if (!addr || !ethers.isAddress(addr)) return;
      mapCSV.set(addr, {
        name: r.name || r.nombre || "",
        surname: r.surname || r.apellido || "",
        dni: r.dni || r.DNI || "",
        puesto: r.puesto || "",
        address: addr
      });
    });

    const rows = [];
    (baseAddrList || []).forEach(addr => {
      const found = mapCSV.get(addr.toLowerCase());
      rows.push({
        address: addr,
        name: found?.name || "",
        surname: found?.surname || "",
        dni: found?.dni || "",
        puesto: found?.puesto || ""
      });
    });

    setRoster(rows.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
  }, []);

  useEffect(() => {
    recomputeRoster(baseAddresses, csvData);
  }, [baseAddresses, csvData, recomputeRoster]);

  const parseRemoteCSV = useCallback(async (url) => new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).map(r => ({
          name: r.name || r.nombre || "",
          surname: r.surname || r.apellido || "",
          dni: r.dni || r.DNI || "",
          puesto: r.puesto || "",
          address: (r.address || r.wallet || "").trim()
        }));
        setCsvData(rows);
        recomputeRoster(baseAddresses, rows);
        resolve();
      },
      error: reject,
    });
  }), [baseAddresses, recomputeRoster]);

  const clearRosterAssociation = useCallback(() => {
    setCsvData([]);
    setRosterURL("");
    localStorage.removeItem('groupdao.rosterURL');
    recomputeRoster(baseAddresses, []);
  }, [baseAddresses, recomputeRoster]);

  // Cargar CSV remoto
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rosterURL) return;
      try {
        await parseRemoteCSV(rosterURL);
        if (!cancelled) { /* merge en otro efecto */ }
      } catch {
        toast.error("Error al cargar CSV remoto");
      }
    })();
    return () => { cancelled = true; };
  }, [rosterURL, parseRemoteCSV]);

  // ------------------ Nueva Función: registerUser ------------------
  const registerUser = useCallback(async (name, surname, dni) => {
    if (demo) return toast.success("Demo: usuario registrado");
    if (!contract || !account) return toast.error("Conectá tu wallet");
    const fullName = `${name} ${surname}`.trim();
    const dniHash = ethers.keccak256(ethers.toUtf8Bytes(dni));
    const nameHash = ethers.keccak256(ethers.toUtf8Bytes(fullName));
    await run('registerUser', async () => {
      const tx = await withGas(
        contract.registerUser.estimateGas(dniHash, nameHash),
        (opts) => contract.registerUser(dniHash, nameHash, opts)
      );
      await tx.wait();
      setRegistered(true); // Actualizar estado de registro
      await fetchAll(); // Refrescar datos
      toast.success("Usuario registrado exitosamente");
    });
  }, [contract, account, demo, run, fetchAll]);

  // ------------------ Render ------------------
  return (
    <GroupDAOContext.Provider value={{
      contract, account, isAdmin, isOwner, registered, demo, groups, myGroupIds, proposals,
      groupMembersCache, setGroupMembersCache, openMembersGroup, setOpenMembersGroup,
      admins, setAdmins, loadingGroups, loadingProposals, roster, rosterFilter, setRosterFilter,
      rosterSelection, setRosterSelection, targetGroupId, setTargetGroupId, rosterURL, setRosterURL,
      csvData, setCsvData, baseAddresses, setBaseAddresses, run, withGas, isBusy, fetchAll,
      parseRemoteCSV, clearRosterAssociation, rosterIndex, demoGroups, demoProposals, registerUser
    }}>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">GroupDAO – Polygon Amoy</h1>
              <p className="text-sm text-gray-500">Votaciones por grupos • MetaMask • Registro con hash • Modo Demo</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={demo} onChange={(e) => setDemo(e.target.checked)} aria-label="Activar modo demo" />
                Modo demo
              </label>
              <button onClick={fetchAll} disabled={loadingAll || !contract} className="px-3 py-2 rounded-xl border flex items-center gap-1 text-sm disabled:opacity-50" aria-label="Actualizar datos">
                <RefreshCcw className={`w-4 h-4 ${loadingAll ? "animate-spin" : ""}`} /> {loadingAll ? 'Actualizando…' : 'Actualizar'}
              </button>
              {!account ? (
                <button onClick={connect} disabled={isBusy('connect')} className="px-3 py-2 rounded-xl bg-black text-white flex items-center gap-1 disabled:opacity-50" aria-label="Conectar wallet">
                  {isBusy('connect') && <Loader2 className="w-4 h-4 animate-spin"/>}
                  <LogIn className="w-4 h-4"/> Conectar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-200">{account.slice(0, 6)}…{account.slice(-4)}</span>
                  <button onClick={disconnect} disabled={isBusy('disconnect')} className="px-3 py-2 rounded-xl border flex items-center gap-1 text-sm disabled:opacity-50" aria-label="Desconectar wallet">
                    {isBusy('disconnect') && <Loader2 className="w-4 h-4 animate-spin"/>}
                    <LogOut className="w-4 h-4"/> Desconectar
                  </button>
                </div>
              )}
            </div>
          </header>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">{error}</div>
          )}

          <AdminPanel />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GroupList />
            <ProposalList />
          </div>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </GroupDAOContext.Provider>
  );
}