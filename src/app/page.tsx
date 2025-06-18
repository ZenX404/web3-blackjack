'use client'
import { useEffect, useState } from "react"

export default function Page() {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const initialDeck = suits.map(suit => ranks.map(rank => ({suit: suit, rank: rank}))).flat();

  /**
   * 这行代码使用了 React 的 useState 钩子（Hook），用于在函数组件中声明一个状态变量。
      deck：当前的牌堆（deck），类型是一个对象数组，每个对象有 suit（花色）和 rank（点数）两个属性。
      setDeck：用于更新 deck 状态的函数。
      useState<{suit: string, rank: string}[]>([])：初始值是一个空数组，表示一开始牌堆是空的。
   */
  const [deck, setDeck] = useState<{suit: string, rank: string}[]>([]);
  const [winner, setWinner] = useState<string>("");
  const [message, setMessage] = useState<string>("");


  /**
   * useEffect 是 React 的副作用钩子，用于在组件渲染后执行某些操作。
      这里的 () => { setDeck(initialDeck) } 是一个回调函数，会在组件“挂载”后（即页面加载后）执行一次。
      setDeck(initialDeck)：把 initialDeck（一副完整的扑克牌）设置为当前的 deck 状态。
      []：依赖数组为空，表示这个副作用只会在组件首次渲染时执行一次（类似于 class 组件的 componentDidMount）。

      这段代码的整体作用：
      初始化牌堆：组件加载时，把一副完整的扑克牌（initialDeck）赋值给 deck，这样后续页面就可以用 deck 里的数据来渲染牌面。
      保证只执行一次：依赖数组为空，确保只在页面首次加载时初始化一次，不会因为其他状态变化而重复执行。
   */
  useEffect(() => {
    setWinner("player")
    setMessage("black jack!")
    setDeck(initialDeck)
  }, []) 

  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
      <h1 className="text-3xl bold">Welcome to Web3 game black jack</h1>
      <h2 className={
        `my-4 text-2xl bold
        ${winner === "player" ? "bg-green-300" : "bg-yellow-300"}`
      }>{message}</h2>

      <div className="mt-4">
        <h2>Dealer's hand</h2>
        <div className="flex flex-row gap-2">
          {
              deck.length === 0 ? <></> : deck.slice(0,3).map((card, index) => 
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
              deck.length === 0 ? <></> : deck.slice(0,3).map((card, index) => 
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
        <button className="bg-amber-300 rounded-md p-2">Hit</button>
        <button className="bg-amber-300 rounded-md p-2">Stand</button>
        <button className="bg-amber-300 rounded-md p-2">Reset</button>
      </div>
    </div>

    
  )
}