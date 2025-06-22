// 后端代码
// 在api文件夹下有一个名为route.ts的文件，它是Next.js的API路由文件。
// 当我们访问项目路径后面加上/api时，就会访问到这个文件。

// 使用AWS DynamoDB存储分数
// @aws-sdk/client-dynamodb和@aws-sdk/lib-dynamodb这两个包要通过pnpm安装一下
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
// 引入viem框架（这个也是wagmi公司开发的）的verifyMessage函数，用于验证签名
import { verifyMessage } from "viem";
import jwt from "jsonwebtoken";

// 初始化 DynamoDB 客户端
const client = new DynamoDBClient({
  region: "us-west-1",
  credentials: {
    // 从环境变量中（.env.local）获取AWS_USER_ACCESS_KEY_ID和AWS_USER_ACCESS_KEY
    accessKeyId: process.env.AWS_USER_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_USER_ACCESS_KEY || "",
  },
});
// 替换为你的 AWS 区域
const docClient = DynamoDBDocumentClient.from(client);

// 表名
const TABLE_NAME = "blackJack";

// 写入数据到 DynamoDB
async function writeScore(player: string, score: number): Promise<void> {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      player: player, // 分区键
      score: score, // 存储的分数
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log(`Successfully wrote score ${score} for player ${player}`);
  } catch (error) {
    console.error(`Error writing to DynamoDB: ${error}`);
    throw error;
  }
}

// 从 DynamoDB 读取数据
async function readScore(player: string): Promise<number | null> {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      player: player, // 分区键
    },
  };

  try {
    const result = await docClient.send(new GetCommand(params));
    if (result.Item) {
      console.log(`Score for player ${player}: ${result.Item.score}`);
      return result.Item.score as number;
    } else {
      console.log(`No score found for player ${player}`);
      return null;
    }
  } catch (error) {
    console.error(`Error reading from DynamoDB: ${error}`);
    throw error;
  }
}



import { decl } from "postcss";


/**
 * 
 * interface 关键字
    interface 用于在 TypeScript 中定义一个“接口”，即一种类型约束，规定对象应该有哪些属性和类型。
   Card 接口
    rank: string：表示牌的点数，比如 "A"、"2"、"J"、"Q"、"K" 等。
    suit: string：表示牌的花色，比如 "♠️"、"♥️"、"♦️"、"♣️"。
   export
    使用 export 关键字，表示这个接口可以被其他文件导入和使用。
 */
export interface Card {
    rank: string,
    suit: string
}

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suits = ['♠️', '♥️', '♦️', '♣️'];
const initialDeck = suits.map(suit => ranks.map(rank => ({ suit: suit, rank: rank }))).flat();


// 定义gameState对象，并声明了其成员数据，并且赋初始值
const gameState: {
    playerHand: Card[], // 玩家手牌
    dealerHand: Card[], // 庄家手牌
    deck: Card[], // 牌堆（玩家和庄家的手牌都是从牌堆中抽取的）
    message: string, // 消息（胜利或者失败的消息）
    score: number // 得分
} = {
    playerHand: [],
    dealerHand: [],
    deck: initialDeck, // 初始化一整副扑克牌
    message: "",
    score: 0
}

// 从deck中随机抽取count张牌
function getRandomCards(deck: Card[], count: number) {
    const randomIndexSet = new Set<number>();
    // 生成count个随即下标，从deck中随机抽取count张牌
    while (randomIndexSet.size < count) {
        // floor取整
        randomIndexSet.add(Math.floor(Math.random() * deck.length));
    }

    // 用过滤器过滤出deck中随机index的牌
    // 过滤条件是index需要在randomIndexSet集合中
    const randomCards = deck.filter((_, index) => randomIndexSet.has(index));
    // 上面抽出去count张牌，我们这里要记录一下还剩下哪些牌
    const remainingDeck = deck.filter((_, index) => !randomIndexSet.has(index));

    // randomCards和remainingDeck这两个类型是Card类型数组
    return [randomCards, remainingDeck];
}

// 固定写法，GET函数用于处理GET请求，函数名要大写
export async function GET(request: Request) {
    // 获取请求参数
    const url = new URL(request.url);
    const address = url.searchParams.get("address");

    if (!address) {
        return new Response(JSON.stringify({ message: "No address provided" }), {status: 400});
    }


    // 这个函数只有刚开始游戏或者重置游戏的时候才会被调用
    // 所以这里每次都要重置这些数据
    gameState.playerHand = [];
    gameState.dealerHand = [];
    gameState.deck = initialDeck;
    gameState.message = "";


    const [playerCards, remainingDeck] = getRandomCards(gameState.deck, 2);
    const [dealerCards, newDeck] = getRandomCards(remainingDeck, 2);
    gameState.playerHand = playerCards;
    gameState.dealerHand = dealerCards;
    gameState.deck = newDeck;
    gameState.message = "";

    // 从DynamoDB中读取用户分数
    try {
        const data = await readScore(address);
        if (!data) {
            gameState.score = 0;
        } else {
            gameState.score = data;
        }
    } catch (error) {
        return new Response(JSON.stringify({ message: "Failed to read score from DynamoDB" }), {status: 500});
    }

    return new Response(JSON.stringify(
        {
            playerHand: gameState.playerHand,
            dealerHand: [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card], // 第二个参数是Card类型
            message: gameState.message,
            score: gameState.score
        }
    ), {
        status: 200
    })
}

export async function POST(request: Request) {
    const body = await request.json();
    const { action, address } = body;

    // 验证签名,避免恶意用户伪造签名
    if (action === "auth") {
        // 获取请求体中的地址、消息和签名
        const { address, message, signature } = body;
        // 验证签名
        const isValid = await verifyMessage({
            address,
            message,
            signature
        })
        if (!isValid) {
            return new Response(JSON.stringify({ message: "Invalid signature" }), {status: 400});
        } else {
            // 使用jwt缓存签名1个小时，一个小时内用户不用重复登陆
            const token = jwt.sign({address}, process.env.JWT_SECRET || "", {expiresIn: "1h"});
            return new Response(JSON.stringify(
                { 
                    message: "Valid signature",
                    jsonwebtoken : token
             }), {status: 200});
        }
    }

    // 验证jwt
    const token = request.headers.get("Bearer")?.split(" ")[1];
    if (!token) {
        return new Response(JSON.stringify({ message: "No token provided" }), {status: 401});
    }
    /**
     * 在使用 JWT 时，通过 jwt.verify 方法验证 JWT 的有效性。jwt.verify 会自动检查 JWT 的过期时间。
        如果 JWT 已经过期，jwt.verify 会抛出一个错误。
        自动校验：jwt.verify 方法会自动检查 JWT 的过期时间。如果 JWT 已经过期，它会抛出一个 TokenExpiredError。
        错误处理：在实际应用中，你可以通过捕获这个错误来处理过期的 JWT。所以下面的代码还应该加一个捕获过期一场的逻辑才算完整。
     */
    // 验证jwt并解密jwt  如果jwt超时了，就不会通过下面的判断了
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {address: string};
    if (decoded.address.toLowerCase() !== address.toLowerCase()) {
        // 当初jwt就是用addree + JWT_SECRET加工出来的，所以解密出来的东西中也有地址
        // 我们就判断揭秘出来的地址和当前用户的地址是否一致。
        return new Response(JSON.stringify({ message: "Invalid token" }), {status: 401});
    }


    // 点击hit按钮，从牌堆中抽取一张牌给玩家
    if (action === "hit") {
        const [cards, newDeck] = getRandomCards(gameState.deck, 1);
        /**
         * 展开运算符 ...
         * ... 是 JavaScript 的展开运算符（spread operator）。
         * 它用于将一个数组展开成多个独立的元素。
         * 在这段代码中，...cards 将 cards 数组中的每个元素独立展开，然后逐个传递给 push 方法。
         */
        // 玩家增加一张牌
        gameState.playerHand.push(...cards);
        // 更新牌堆
        gameState.deck = newDeck;

        const playerHandValue = calculateHandValue(gameState.playerHand);
        if (playerHandValue === 21) {
            gameState.message = "Black Jack! Player wins!";
            gameState.score += 100;
        } else if (playerHandValue > 21) {
            gameState.message = "BUst! Player loses!";
            gameState.score -= 100;
        }
    // 点击stand按钮，从牌堆中抽取一张牌给庄家
    } else if (action === "stand") {
        while (calculateHandValue(gameState.dealerHand) < 17) {
            const [cards, newDeck] = getRandomCards(gameState.deck, 1);
            gameState.dealerHand.push(...cards);
            gameState.deck = newDeck;
        }

        const dealerHandValue = calculateHandValue(gameState.dealerHand);
        if (dealerHandValue > 21) {
            gameState.message = "Dealer bust! Player wins!";
            gameState.score += 100;
        } else if (dealerHandValue === 21) {
            gameState.message = "Dealer Black Jack! Player loses!";
            gameState.score -= 100;
        } else {
            const playerHandValue = calculateHandValue(gameState.playerHand);
            if (playerHandValue > dealerHandValue) {
                gameState.message = "Player wins!";
                gameState.score += 100;
            } else if (playerHandValue < dealerHandValue) {
                gameState.message = "Player loses!";
                gameState.score -= 100;
            } else {
                gameState.message = "Draw!";
            }
        }
    } else {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400
        })
    }

    // 写入用户分数到DynamoDB
    // 但是要注意，这样等前面分数加工完最后才写入数据库的写法在安全上是有问题的
    // 要遵循先更新状态，再进行外部交互的原则
    try {
        await writeScore(address, gameState.score);
    } catch (error) {
        console.error(`Error writing to DynamoDB: ${error}`);
        return new Response(JSON.stringify({ message: "Failed to write score to DynamoDB" }), {status: 500});
    }


    return new Response(JSON.stringify(
        {
            playerHand: gameState.playerHand,
            dealerHand: gameState.message === "" ?
                [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card]
                : gameState.dealerHand,
            message: gameState.message,
            score: gameState.score
        }
    ), {
        status: 200
    })
}

// 计算手牌的点数
function calculateHandValue(hand: Card[]) {
    // 手牌的点数
    let value = 0;
    // 记录A牌的数量
    let aceCount = 0;

    /**
     * A：两种方式，可以作为11点（软手），亦作为1点（硬手）。
     * 2-10：牌面点数即其数值。
     * J、Q、K：每张牌的点数为10点。
     */

    hand.forEach(card => {
        if (card.rank === "A") {
            aceCount++;
            value += 11;
        } else if (card.rank === "J" || card.rank === "Q" || card.rank === "K") {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    })

    // 如果手牌点数大于21，并且有A牌，则将A牌的点数改为1
    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
    }

    return value;
}