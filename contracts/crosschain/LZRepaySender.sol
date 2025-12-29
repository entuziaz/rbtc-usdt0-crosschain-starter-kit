contract LZRepaySender {
    ILZEndpoint public immutable endpoint;

    uint16 public immutable dstChainId;
    bytes public immutable dstReceiver;
    IERC20 public immutable usdt0;

    uint8 internal constant MSG_REPAY = 3;

    constructor(
        address _endpoint,
        uint16 _dstChainId,
        address _receiver,
        address _usdt0
    ) {
        endpoint = ILZEndpoint(_endpoint);
        dstChainId = _dstChainId;
        dstReceiver = abi.encodePacked(_receiver);
        usdt0 = IERC20(_usdt0);
    }

    function repayUSDT(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");

        // pull funds from user
        usdt0.transferFrom(msg.sender, address(bridge), amount);

        bytes memory payload = abi.encode(
            MSG_REPAY,
            msg.sender,
            amount
        );

        endpoint.send(
            dstChainId,
            dstReceiver,
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
    }
}
