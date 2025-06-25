// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract FunctionsConsumerExample is FunctionsClient, ConfirmedOwner, ERC721URIStorage {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    uint8 private donHostedSecretsSlotID;
    uint64 private donHostedSecretsVersion;
    uint64 private subscriptionId;
    mapping(bytes32 reqId => address player) reqIdToPlayer;
    uint256 tokenId = 0;

    // 要执行的发送GET请求的代码，向lambda function请求dynamodb的数据
    // 我们要在以太坊上部署这个智能合约，然后把SOURCE这段代码发送给chainlink function，
    // 让chinlink function中的节点去执行SOURCE代码发送请求
    // 注意代码中本身已经有双引号了，要用单引号包裹
    string constant SOURCE = 
        "if (!secrets.apiKey) {"
           ' throw Error("API key should be provided");'
        "}"
        "const playerAddress = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
       " url: `https://myhfhed3vy5wsy4durexwxhnka0iliin.lambda-url.us-west-1.on.aws/`,"
        "method: 'GET',"
        "headers: {"
          '  "player": playerAddress,'
            '"api-key": secrets.apiKey'
        "}"
       " })"
       " if (apiResponse.error) {"
       " console.error(apiResponse.error);"
        'throw Error("Request failed");'
        "}"
       " const { data } = apiResponse;"
       " if (!data.score) {"
           ' console.log("score does not exist");'
           ' throw Error("score does not exist");'
      "  }"
      "  return Functions.encodeInt256(data.score);";

    uint32 constant GAS_LIMIT = 300_000;
    // 不同的产品对应不同的chainlink function网络，所以这里要指定预言机网络id
    // 下面是Avalanche Fuji Testnet的网络id
    bytes32 constant DON_ID = 0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000;
    string constant META_DATA = "ipfs://QmbEseErg5xQYaJQ2oFyvtm7NF1GKQh9qbT7AFVT3ru1sw";
    address constant ROUTER = 0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);

    // 引入的类也要调用上他们的构造函数
    constructor(
    ) FunctionsClient(ROUTER) ConfirmedOwner(msg.sender) ERC721("BlackJack", "BJK") {}

    // _slotID和_version用于获得加密信息
    // _sub_id是chainlink functions的订阅id，用于请求对应的functions
    // 部署完智能合约后，合约的所有者应该先调用这个set函数，来设置这三个变量
    // 使得这个函数能够让合约获取到之前上传的敏感加密信息（通过_slotID和_version）
    // 并且使得智能合约知道要向哪个chainlink function发送请求（通过_sub_id）
    // 所有者掌握这三个变量的值，只需要在部署合约的时候调用一次这个set函数配置一下即可
    function setDonHostSecretConfig(uint8 _slotID, uint64 _version, uint64 _sub_id) public onlyOwner {
        donHostedSecretsSlotID = _slotID;
        donHostedSecretsVersion = _version;
        subscriptionId = _sub_id;
    }   

    /**
    * 向Chainlink functions发送请求。前端就会通过请求这个函数来发送铸造nft请求
     * @notice Send a simple request
     * @param args List of arguments accessible from within the source code
     */
    function sendRequest(
        string[] memory args,
        address player
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);
 
        req.addDONHostedSecrets(
            donHostedSecretsSlotID,
            donHostedSecretsVersion
        );
     
        if (args.length > 0) req.setArgs(args);
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            GAS_LIMIT,
            DON_ID
        );

        reqIdToPlayer[s_lastRequestId] = player;
        return s_lastRequestId;
    }

    
    /**
     * 获取chainlink functions返回的数据
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;
        s_lastError = err;

        // 分数大于1000的玩家可以申请铸造nft
        int256 score = abi.decode(response, (int256));
        if (score >= 1000) {
             // mint a nft to player
            address player = reqIdToPlayer[requestId];
            _safeMint(player, tokenId);
            _setTokenURI(tokenId, META_DATA);
            tokenId++;
        }

       

        emit Response(requestId, s_lastResponse, s_lastError);
    }
}
