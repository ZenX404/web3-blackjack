// 前端代码
'use client'
import { useEffect, useState } from "react"
// 引入RainbowKit的ConnectButton组件
import { ConnectButton } from "@rainbow-me/rainbowkit";
// 引入wagmi的useAccount钩子
import { useAccount, useSignMessage } from "wagmi";
import { parseAbi, createPublicClient, createWalletClient, custom } from "viem";
import { avalancheFuji } from "viem/chains";

export default function Page() {

  /**
   * 这行代码使用了 React 的 useState 钩子（Hook），用于在函数组件中声明一个状态变量。
      deck：当前的牌堆（deck），类型是一个对象数组，每个对象有 suit（花色）和 rank（点数）两个属性。
      setDeck：用于更新 deck 状态的函数。
      useState<{suit: string, rank: string}[]>([])：初始值是一个空数组，表示一开始牌堆是空的。
   */
  // 在 JavaScript 和 TypeScript 中，[] 用于定义数组。{} 用于定义对象。
  // 这里的 [] 表示 playerHand 和 dealerHand 是数组，数组中的每个元素都是一个对象，具有 suit 和 rank 属性。
  const [message, setMessage] = useState<string>("");
  const [playerHand, setPlayerHand] = useState<{suit: string, rank: string}[]>([]);
  const [dealerHand, setDealerHand] = useState<{suit: string, rank: string}[]>([]);
  const [score, setScore] = useState<number>(0);
  // 这里的 {} 用于对象解构赋值，从 useAccount() 和 useSignMessage() 返回的对象中提取特定的属性。
  // 获取用户钱包地址和连接状态
  const { address, isConnected } = useAccount();
  const [isSigned, setIsSigned] = useState(false);
  // 获取签名消息
  const { signMessageAsync } = useSignMessage();
  // 获取公链客户端和钱包客户端
  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);


  // 初始化游戏  js中箭头函数可以简写为initGame = async() => {}，函数定义和变量定义写法很像，不用写()
  const initGame = async() => {
    // 发送GET请求，获取初始数据
    const response = await fetch(`/api?address=${address}`, {method: "GET"});
    // 解析响应的json
    const data = await response.json();
    // 把数据赋值给状态变量
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
    // 创建公链客户端和钱包客户端
    // 判断当前浏览器中是否存在钱包插件
    if (typeof window !== "undefined" && window.ethereum) {
      const publicClient = createPublicClient({
        chain: avalancheFuji,
        transport: custom(window.ethereum) // 通过用户的钱包插件发送请求
      });

      const walletClient = createWalletClient({
        chain: avalancheFuji,
        transport: custom(window.ethereum)
      });

      setPublicClient(publicClient);
      setWalletClient(walletClient);
    } else {
      console.log("Please install a wallet");
    }
  }


  async function handleSendTx() {
    // get the contract address
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    // get the contract abi
    const contractAbi = parseAbi([process.env.NEXT_PUBLIC_CONTRACT_ABI || ""]);

    // 模拟合约调用
    await publicClient.simulateContract({
      address: contractAddress, // 合约地址
      abi: contractAbi, // 合约abi
      functionName:"sendRequest", // 合约函数名   指定要调用合约的哪个函数
      args: [[address],address], // 合约函数参数
      account: address, // 合约调用者
    })

    // 通过用户钱包向合约发送真实的交易请求
    const txHash = await walletClient.writeContract({
      to: contractAddress, // 合约地址
      abi:contractAbi, // 合约abi
      functionName:"sendRequest", // 合约函数名
      args: [[address], address], // 合约函数参数
      account: address, // 合约调用者
    })

    console.log("txHash", txHash);

  }


  /**
   * useEffect 是 React 的副作用钩子，用于在组件渲染后执行某些操作。
      这里的 () => { setDeck(initialDeck) } 是一个回调函数，会在组件“挂载”后（即页面加载后）执行一次。
      setDeck(initialDeck)：把 initialDeck（一副完整的扑克牌）设置为当前的 deck 状态。
      []：依赖数组为空，表示这个副作用只会在组件首次渲染时执行一次（类似于 class 组件的 componentDidMount）。

      这段代码的整体作用：
      初始化牌堆：组件加载时，把一副完整的扑克牌（initialDeck）赋值给 deck，这样后续页面就可以用 deck 里的数据来渲染牌面。
      保证只执行一次：依赖数组为空，确保只在页面首次加载时初始化一次，不会因为其他状态变化而重复执行。
   */
  // useEffect(() => {
  //   const initGame = async() => {
  //     // 发送GET请求，获取初始数据
  //     const response = await fetch("/api", {method: "GET"});
  //     // 解析响应的json
  //     const data = await response.json();
  //     // 把数据赋值给状态变量
  //     setPlayerHand(data.playerHand);
  //     setDealerHand(data.dealerHand);
  //     setMessage(data.message);
  //     setScore(data.score);
     
  //   }
  //   // 调用上面定义的这个initGame函数
  //   initGame();
  // }, []) 

  // 编写点击按钮逻辑
  async function handleHit() {
    const response = await fetch("/api", {
      method: "POST",
      headers: {
        Bearer : `Bearer ${localStorage.getItem("jwt") || ""}`
      },
      body: 
        JSON.stringify(
          {
            action: "hit",
            address
          }
        ),
        
    });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  async function handleStand() {
    const response = await fetch("/api", {
      method: "POST",
      // 添加jwt到请求头
      headers: {
        Bearer : `Bearer ${localStorage.getItem("jwt") || ""}`
      },
      body: JSON.stringify(
        {
          action: "stand",
          address
        }
      ),
    });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  async function handleReset() {
    const response = await fetch(`/api?address=${address}`, {method: "GET"});
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setScore(data.score);
  }

  // 所有的连接钱包操作，都要让用户发一个签名，以防恶意用户伪造签名
  async function handleSignIn() {
    if (!isConnected) {
      console.log("Please connect your wallet");
      return;
    }
    /**
     * 说一下这里签名的原理
     * 区块链中每一个账户都有一个公钥和私钥
     * 公钥我们可以理解为这个账户的地址
     * 私钥是用户自己的，不会公开，可以用私钥来对一些数据进行相关的密码学加密算法形成签名数据
     * 我们可以在不知道用户私钥的情况下，指利用这个账户的公钥来验证这个签名是否是这个用户的私钥加工形成的
     * 这也就能证明这个签名是这个用户自己加工的，而不是其他人伪造的，所以我们要在前端页面加一个发送签名的步骤，避免恶意用户伪造签名
     */
    const message = `Welcome to Web3 game black jack at ${new Date().toString()}`;
    // 使用wagmi的signMessageAsync函数签名message消息
    const signature = await signMessageAsync({message});
    // 发送POST请求，验证签名
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify
      (
        {
          action: "auth",
          address,
          message,
          signature,
        }
      ),
    });

    if (response.status === 200) {
      // 获取用户的jwt
      const {jsonwebtoken} = await response.json();
      // 把jwt缓存到本地浏览器
      localStorage.setItem("jwt", jsonwebtoken);

      
      setIsSigned(true);
      // 只要签名校验成功后才能初始化游戏
      initGame();
      console.log("signature is valid");
    }
  }

  // 只有校验通过签名之后，用户才可以进行游戏，否则不展示游戏页面。只连接钱包是不够的，必须校验签名。
  if (!isSigned) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
        <ConnectButton />
        <button onClick={handleSignIn} className="border-black bg-amber-300 p-2 rounded-md">sign in with your wallet</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
      <ConnectButton />
      <h1 className="text-3xl bold">Welcome to Web3 game black jack</h1>
      <h2 className={
        `my-4 text-2xl bold
        ${message.includes("win") ? "bg-green-300" : "bg-yellow-300"}`
      }>Score: {score} {message}</h2>
      <button onClick={handleSendTx} className="bg-amber-300 rounded-md p-2">GET NFT</button>
      <div className="mt-4">
        <h2>Dealer's hand</h2>
        <div className="flex flex-row gap-2">
          {
              dealerHand.map((card, index) => 
                <div className="h-42 w-28 border-black border-1 flex flex-col justify-between rounded-sm bg-white" key={index}>
                  <h2 className="self-start text-2xl pt-3 pl-3">{card.rank}</h2>
                  <h2 className="self-center text-3xl">{card.suit}</h2>
                  <h2 className="self-end text-2xl pb-3 pr-3">{card.rank}</h2>
                </div>
              )
          }
        </div>
      </div>

      <div>
        <h2>Player's hand</h2>
        <div className="flex flex-row gap-2">
          {
              playerHand.map((card, index) => 
                <div className="h-42 w-28 border-black border-1 flex flex-col justify-between rounded-sm bg-white" key={index}>
                  <h2 className="self-start text-2xl pt-3 pl-3">{card.rank}</h2>
                  <h2 className="self-center text-3xl">{card.suit}</h2>
                  <h2 className="self-end text-2xl pb-3 pr-3">{card.rank}</h2>
                </div>
              )
            }
        </div>
      </div>

      <div className="flex flex-row gap-2 mt-4">
        {
          message === "" ?
          <>
            <button onClick={handleHit} className="bg-amber-300 rounded-md p-2">Hit</button>
            <button onClick={handleStand} className="bg-amber-300 rounded-md p-2">Stand</button>
          </>:
          <button onClick={handleReset} className="bg-amber-300 rounded-md p-2">Reset</button>
        }
        
        
      </div>
    </div>

    
  )
}