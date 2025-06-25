// 这个是基于page.tsx前端代码，让AI优化后的前端页面
'use client'
import { useEffect, useState } from "react"
// 引入RainbowKit的ConnectButton组件
import { ConnectButton } from "@rainbow-me/rainbowkit";
// 引入wagmi的useAccount钩子
import { useAccount, useSignMessage } from "wagmi";
import { parseAbi, createPublicClient, createWalletClient, custom } from "viem";
import { avalancheFuji } from "viem/chains";

export default function Page() {
  const [message, setMessage] = useState<string>("");
  const [playerHand, setPlayerHand] = useState<{suit: string, rank: string}[]>([]);
  const [dealerHand, setDealerHand] = useState<{suit: string, rank: string}[]>([]);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [gameLoading, setGameLoading] = useState(false);
  
  // 获取用户钱包地址和连接状态
  const { address, isConnected } = useAccount();
  const [isSigned, setIsSigned] = useState(false);
  // 获取签名消息
  const { signMessageAsync } = useSignMessage();
  // 获取公链客户端和钱包客户端
  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);

  // 初始化游戏
  const initGame = async() => {
    setGameLoading(true);
    try {
      const response = await fetch(`/api?address=${address}`, {method: "GET"});
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
      
      if (typeof window !== "undefined" && window.ethereum) {
        const publicClient = createPublicClient({
          chain: avalancheFuji,
          transport: custom(window.ethereum)
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
    } catch (error) {
      console.error("Error initializing game:", error);
    } finally {
      setGameLoading(false);
    }
  }

  async function handleSendTx() {
    setIsLoading(true);
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      const contractAbi = parseAbi([process.env.NEXT_PUBLIC_CONTRACT_ABI || ""]);

      await publicClient.simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName:"sendRequest",
        args: [[address],address],
        account: address,
      })

      const txHash = await walletClient.writeContract({
        to: contractAddress,
        abi:contractAbi,
        functionName:"sendRequest",
        args: [[address], address],
        account: address,
      })

      console.log("txHash", txHash);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleHit() {
    setGameLoading(true);
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          Bearer : `Bearer ${localStorage.getItem("jwt") || ""}`
        },
        body: JSON.stringify({
          action: "hit",
          address
        }),
      });
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
    } catch (error) {
      console.error("Hit action failed:", error);
    } finally {
      setGameLoading(false);
    }
  }

  async function handleStand() {
    setGameLoading(true);
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          Bearer : `Bearer ${localStorage.getItem("jwt") || ""}`
        },
        body: JSON.stringify({
          action: "stand",
          address
        }),
      });
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
    } catch (error) {
      console.error("Stand action failed:", error);
    } finally {
      setGameLoading(false);
    }
  }

  async function handleReset() {
    setGameLoading(true);
    try {
      const response = await fetch(`/api?address=${address}`, {method: "GET"});
      const data = await response.json();
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setMessage(data.message);
      setScore(data.score);
    } catch (error) {
      console.error("Reset failed:", error);
    } finally {
      setGameLoading(false);
    }
  }

  async function handleSignIn() {
    if (!isConnected) {
      console.log("Please connect your wallet");
      return;
    }
    
    setIsLoading(true);
    try {
      const message = `Welcome to Web3 game black jack at ${new Date().toString()}`;
      const signature = await signMessageAsync({message});
      
      const response = await fetch("/api", {
        method: "POST",
        body: JSON.stringify({
          action: "auth",
          address,
          message,
          signature,
        }),
      });

      if (response.status === 200) {
        const {jsonwebtoken} = await response.json();
        localStorage.setItem("jwt", jsonwebtoken);
        setIsSigned(true);
        initGame();
        console.log("signature is valid");
      }
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // 获取卡片颜色
  const getCardColor = (suit: string) => {
    return suit === '♠' || suit === '♣' ? 'text-gray-900' : 'text-red-500';
  };

  // 加载动画组件
  const LoadingSpinner = () => (
    <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  );

  // 只有校验通过签名之后，用户才可以进行游戏
  if (!isSigned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col gap-8 items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            🎲 Web3 Blackjack
          </h1>
          <p className="text-xl text-gray-300 max-w-md">
            Connect your wallet and sign in to start playing the ultimate Web3 Blackjack experience
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="flex flex-col gap-6 items-center">
            <ConnectButton />
            <button 
              onClick={handleSignIn} 
              disabled={!isConnected || isLoading}
              className="relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  Signing In...
                </span>
              ) : (
                "🔐 Sign In with Wallet"
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col gap-6 items-center justify-center p-4">
      {/* 顶部区域 */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <ConnectButton />
        <button 
          onClick={handleSendTx} 
          disabled={isLoading}
          className="relative bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Processing...
            </span>
          ) : (
            "🎁 GET NFT"
          )}
        </button>
      </div>

      {/* 游戏标题 */}
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
        🎲 Web3 Blackjack
      </h1>

      {/* 分数和消息 */}
      <div className={`px-6 py-3 rounded-xl text-xl font-semibold text-white shadow-lg transition-all duration-300 ${
        message.includes("win") ? "bg-gradient-to-r from-green-500 to-emerald-600" : 
        message.includes("lose") ? "bg-gradient-to-r from-red-500 to-pink-600" :
        "bg-gradient-to-r from-blue-500 to-purple-600"
      }`}>
        💰 Score: {score} {message && `• ${message}`}
      </div>

      {gameLoading && (
        <div className="flex items-center gap-2 text-white">
          <LoadingSpinner />
          <span>Processing game action...</span>
        </div>
      )}

      {/* 游戏区域 */}
      <div className="w-full max-w-4xl space-y-8">
        {/* 庄家手牌 */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">🎩 Dealer's Hand</h2>
          <div className="flex flex-row gap-4 justify-center flex-wrap">
            {dealerHand.map((card, index) => 
              <div className="h-32 w-20 md:h-40 md:w-24 border-2 border-gray-300 flex flex-col justify-between rounded-lg bg-white shadow-lg transform hover:scale-105 transition-transform duration-200" key={index}>
                <h2 className={`self-start text-lg md:text-xl font-bold pt-2 pl-2 ${getCardColor(card.suit)}`}>{card.rank}</h2>
                <h2 className={`self-center text-2xl md:text-3xl ${getCardColor(card.suit)}`}>{card.suit}</h2>
                <h2 className={`self-end text-lg md:text-xl font-bold pb-2 pr-2 transform rotate-180 ${getCardColor(card.suit)}`}>{card.rank}</h2>
              </div>
            )}
          </div>
        </div>

        {/* 玩家手牌 */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">👤 Your Hand</h2>
          <div className="flex flex-row gap-4 justify-center flex-wrap">
            {playerHand.map((card, index) => 
              <div className="h-32 w-20 md:h-40 md:w-24 border-2 border-gray-300 flex flex-col justify-between rounded-lg bg-white shadow-lg transform hover:scale-105 transition-transform duration-200" key={index}>
                <h2 className={`self-start text-lg md:text-xl font-bold pt-2 pl-2 ${getCardColor(card.suit)}`}>{card.rank}</h2>
                <h2 className={`self-center text-2xl md:text-3xl ${getCardColor(card.suit)}`}>{card.suit}</h2>
                <h2 className={`self-end text-lg md:text-xl font-bold pb-2 pr-2 transform rotate-180 ${getCardColor(card.suit)}`}>{card.rank}</h2>
              </div>
            )}
          </div>
        </div>

        {/* 游戏控制按钮 */}
        <div className="flex flex-row gap-4 justify-center">
          {message === "" ? (
            <>
              <button 
                onClick={handleHit} 
                disabled={gameLoading}
                className="relative bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
              >
                {gameLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner />
                    Processing...
                  </span>
                ) : (
                  "🃏 Hit"
                )}
              </button>
              <button 
                onClick={handleStand} 
                disabled={gameLoading}
                className="relative bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
              >
                {gameLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner />
                    Processing...
                  </span>
                ) : (
                  "✋ Stand"
                )}
              </button>
            </>
          ) : (
            <button 
              onClick={handleReset} 
              disabled={gameLoading}
              className="relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
            >
              {gameLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  Resetting...
                </span>
              ) : (
                "🔄 New Game"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}