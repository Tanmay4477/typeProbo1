import {
  ORDERBOOK,
  STOCK_BALANCES,
  INR_BALANCES,
  orders,
  resetVariables,
} from "./variables";
import { createClient } from "redis";
const client = createClient();
const publisher = createClient();

async function startWorker() {
  try {
    await client.connect();
    await publisher.connect();
    while (true) {
      const response = await client.brPop("probo", 0);
      if (response) {
        const element = response.element;
        const element1 = JSON.parse(element);

        switch (element1.func) {
          case "createUSer":
            await createAUser(element1.data);
            break;
          case "inrBalances":
            await getInrVariable();
          case "balOfUser":
            await balanceOfAUser(element1.id);
          case "onRamp":
            await onRamp(element1.userId, element1.amount);
          case "stockBalance":
            await stockBalanc();
          case "balOfUser":
            await balOfUser(element1.id);
          case "reset":
            await resetFn();
          case "orderbook":
            await orderlist();
          case "viewSymbol":
            await viewSymbol(element1.symbol);
          case "createSymbol":
            await createSymbol(element1.symbol);
          case "mint":
            await mint(element1.id, element1.symbol, element1.quantity);
          case "cancel": 
            await cancel(element1.orderId, element1.quantity, element1.stockSymbol, element1.stockType, element1.price, element1.userId);
          case "sell": 
            await sellYesNo(element1.userId, element1.stockSymbol, element1.quantity, element1.stockType, element1.price);
          case "buy": 
            await buyYesNo(element1.uuid, element1.userId, element1.stockSymbol, element1.quantity, element1.stockType, element1.price)
        }
      }
    }
  } catch (error) {
    console.log(error);
    return error;
  }
}

startWorker();

export const createAUser = async (data: any) => {
  try {
    INR_BALANCES[data.id] = {
      balance: 0,
      locked: 0,
    };
    STOCK_BALANCES[data.id] = {};
    await publisher.publish(data.channelName, "User created Successfully");
    return;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const getInrVariable = async () => {
  try {
    await publisher.publish("channel1", JSON.stringify(INR_BALANCES));
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const balanceOfAUser = async (id: string) => {
  try {
    const balance = INR_BALANCES[id];
    if (!!balance) {
      await publisher.publish("channel3", JSON.stringify(balance));
    } else {
      await publisher.publish("channel3", balance);
    }
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const onRamp = async (id: string, amount: number) => {
  try {
    if (!INR_BALANCES[id]) {
      INR_BALANCES[id] = INR_BALANCES[id] || { balance: 0, locked: 0 };
    }
    INR_BALANCES[id].balance += amount / 100;
    publisher.publish("onrampChannel", JSON.stringify(INR_BALANCES[id]));
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const stockBalanc = async () => {
  try {
    client.publish("stockBalanceChannel", JSON.stringify(STOCK_BALANCES));
  } catch (error) {
    console.log(error);
    return;
  }
};

export const balOfUser = async (id: string) => {
  try {
    let output = STOCK_BALANCES.hasOwnProperty(id);
    if (output) {
      publisher.publish("balOfUserChannel", JSON.stringify(STOCK_BALANCES[id]));
    } else
      publisher.publish(
        "balOdUserChannel",
        JSON.stringify({ msg: "USER ID not valid" })
      );
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const resetFn = async () => {
  try {
    resetVariables();
    publisher.publish("resetChannel", "All variables reset successfully");
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const orderlist = async () => {
  try {
    client.lPush("orderbook", JSON.stringify(ORDERBOOK));
  } catch (error) {
    console.log(error);
    return;
  }
};

export const viewSymbol = async (symbol: string) => {
  try {
    if (!ORDERBOOK[symbol]) {
      publisher.publish(
        "viewSymbol",
        JSON.stringify({ msg: "This does not exist in the orderbook" })
      );
    } else publisher.publish("viewSymbol", JSON.stringify(ORDERBOOK[symbol]));
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const createSymbol = async (symbol: string) => {
  try {
    ORDERBOOK[symbol] = { yes: {}, no: {} };
    publisher.publish("createSymbol", "Symbol created successfully");
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const mint = async (id: string, symbol: string, quantity: number) => {
  try {
    STOCK_BALANCES[id] = STOCK_BALANCES[id] ?? {};
    STOCK_BALANCES[id][symbol] = STOCK_BALANCES[id][symbol] ?? {};

    let stock = STOCK_BALANCES[id][symbol];
    stock.yes = stock.yes ?? { quantity: 0, locked: 0 };
    stock.no = stock.no ?? { quantity: 0, locked: 0 };

    stock.yes["quantity"] += quantity;
    stock.no["quantity"] += quantity;

    publisher.publish("mint", "Token credit successfully");
    return;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const cancel = async (
  orderId: number,
  quantity: number,
  stockSymbol: string,
  stockType: string,
  price: number,
  userId: string
) => {
  try {
    const oppositePrice: number = 10 - price;
    const oppositeType: string = stockType === "yes" ? "no" : "yes";
    const array = ORDERBOOK[stockSymbol][stockType][price].orders;
    const oppositeArray =
      ORDERBOOK[stockSymbol]?.[oppositeType]?.[oppositePrice]?.orders || [];

    if (!array || !oppositeArray) {
      publisher.publish("cancel", "Orders array is not present");
      return;
    }

    let success: boolean = false;

    array.forEach((item) => {
      if (
        item.orderId === orderId &&
        item.type === "normal" &&
        item.userId === userId &&
        item.quantity >= quantity
      ) {
        item.quantity -= quantity;
        success = true;
        STOCK_BALANCES[userId][stockSymbol][stockType].quantity += quantity;
        STOCK_BALANCES[userId][stockSymbol][stockType].locked -= quantity;
      }
    });
    if (success) {
      ORDERBOOK[stockSymbol][stockType][price].total -= quantity;
      publisher.publish("cancel", "Order cancelled, stock balance updated");
      return;
    }
    success = false;

    oppositeArray.forEach((item) => {
      if (
        item.orderId === orderId &&
        item.type === "reverse" &&
        item.userId === userId &&
        item.quantity >= quantity
      ) {
        item.quantity -= quantity;
        success = true;
        INR_BALANCES[userId].locked -= price * quantity;
        INR_BALANCES[userId].balance += price * quantity;
      }
    });
    if (success) {
      ORDERBOOK[stockSymbol][oppositeType][oppositePrice].total -= quantity;
      publisher.publish("cancel", "Order cancelled, INR balance updated");
      return;
    }
    publisher.publish("cancel", "Order Id does not have this much quantity");
    return;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const sellYesNo = async (userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no", price: number) => {
    try {
        STOCK_BALANCES[userId] = STOCK_BALANCES[userId] || {};
        STOCK_BALANCES[userId][stockSymbol] = STOCK_BALANCES[userId][stockSymbol] || {};
        STOCK_BALANCES[userId][stockSymbol][stockType] =  STOCK_BALANCES[userId][stockSymbol][stockType] || {quantity: 0, locked: 0};

        const presentStockQuantity = STOCK_BALANCES[userId][stockSymbol][stockType].quantity;

        if (presentStockQuantity < quantity) {
            publisher.publish("sell", JSON.stringify({code: 400, value: "Quantity shortage"}));
            return
        }

        const oppositeStockType: string = stockType === "yes" ? "no" : "yes";
        const oppositePrice: number = 10-Number(price);
        const orderId: number = Math.floor(Math.random() * 100);
        ORDERBOOK[stockSymbol] = ORDERBOOK[stockSymbol] || {};
        ORDERBOOK[stockSymbol][stockType] = ORDERBOOK[stockSymbol][stockType] || {};
        ORDERBOOK[stockSymbol][oppositeStockType] = ORDERBOOK[stockSymbol][oppositeStockType] || {};
        let proboProfit = 0;

        if (ORDERBOOK[stockSymbol][oppositeStockType]) {
            
            const priceArray:number[] = Object.keys(ORDERBOOK[stockSymbol][oppositeStockType]).map(Number).sort();
            const finalPriceArray:number[] = priceArray.filter(num => num <= oppositePrice);  
            if(finalPriceArray.length === 0) {
                ORDERBOOK[stockSymbol] = ORDERBOOK[stockSymbol] || {};
                ORDERBOOK[stockSymbol][stockType] = ORDERBOOK[stockSymbol][stockType] || {};
                ORDERBOOK[stockSymbol][stockType][price] = ORDERBOOK[stockSymbol][stockType][price] || {total: 0, orders: []};
                ORDERBOOK[stockSymbol][stockType][price].total += quantity;
                ORDERBOOK[stockSymbol][stockType][price].orders.push({ userId: userId, type: "normal", quantity: quantity, orderId: orderId });
           
                STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantity;
                STOCK_BALANCES[userId][stockSymbol][stockType].locked += quantity;
                publisher.publish("sell", JSON.stringify({code: 200, value: "Sell Order placed successfully, All the quantity is updated in the orderbook"}));
                publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
                return
            }
                for (const item of finalPriceArray) {
                    let quantityPresentInFirstElement = ORDERBOOK[stockSymbol][oppositeStockType][Number(item)].total;
                    INR_BALANCES[userId] = INR_BALANCES[userId] ?? {balance: 0, locked: 0};

                    if (quantityPresentInFirstElement < quantity) {
                        INR_BALANCES[userId].balance += price*quantityPresentInFirstElement;
                        STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantityPresentInFirstElement;
                        const array = ORDERBOOK[stockSymbol][oppositeStockType][Number(item)].orders;
                        for (let el of array) {
                            quantity -= el.quantity;
                            proboProfit += (oppositePrice - item) * el.quantity;
                            if (el.type === "normal") {
                                INR_BALANCES[el.userId] = INR_BALANCES[el.userId] ?? {balance: 0, locked: 0};
                                INR_BALANCES[el.userId].balance += (el.quantity * Number(el));
                                STOCK_BALANCES[el.userId][stockSymbol][oppositeStockType].locked -= el.quantity;
                            } else {
                                INR_BALANCES[el.userId].locked -= (el.quantity * price) + proboProfit;
                                await functionUsedInsideArrayBuy(el, stockSymbol, stockType);
                                STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity += el.quantity;
                            }
                        }
                        // quantity -= quantityPresentInFirstElement;
                        delete ORDERBOOK[stockSymbol][oppositeStockType][Number(item)];
                    } else {
                        INR_BALANCES[userId].balance += (quantity * price);
                        STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantity;
                        ORDERBOOK[stockSymbol][oppositeStockType][Number(item)].total -= quantity;
                        const array = ORDERBOOK[stockSymbol][oppositeStockType][Number(item)].orders;

                        for (let el of array) {
                            if (quantity >= el.quantity) {
                                quantity -= el.quantity;
                                proboProfit += (oppositePrice - item) * el.quantity;
                                if (el.type === "normal") {
                                    INR_BALANCES[el.userId] = INR_BALANCES[el.userId] ?? {balance: 0, locked: 0};
                                    INR_BALANCES[el.userId].balance += (el.quantity * Number(item));
                                    STOCK_BALANCES[el.userId][stockSymbol][oppositeStockType].locked -= el.quantity;
                                } else {
                                    INR_BALANCES[el.userId].locked -= (el.quantity * price) + proboProfit;
                                    await functionUsedInsideArrayBuy(el, stockSymbol, stockType);
                                    STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity += el.quantity;
                                }
                                array.shift();
                            } else {
                                el.quantity -= quantity;
                                proboProfit += (oppositePrice - item) * quantity;
                                if (el.type === "normal") {
                                    INR_BALANCES[el.userId] = INR_BALANCES[el.userId] ?? {balance: 0, locked: 0};
                                    INR_BALANCES[el.userId].balance += (quantity * Number(item));
                                    STOCK_BALANCES[el.userId][stockSymbol][oppositeStockType].locked -= quantity;
                                } else {
                                    INR_BALANCES[el.userId].locked -= (quantity * price) + proboProfit;
                                    await functionUsedInsideArrayBuy(el, stockSymbol, stockType);
                                    STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity += quantity;
                                }
                                quantity = 0;
                                publisher.publish("sell", JSON.stringify({code: 200, value: "Order matched successfully, Your stock balance and INR balance got updated"}));
                                publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
                                return                            
                            }
                        }
                    }
                }   

            ORDERBOOK[stockSymbol][stockType][price] = ORDERBOOK[stockSymbol][stockType][price] || {total: 0, orders: []};
            ORDERBOOK[stockSymbol][stockType][price].total += quantity;
            ORDERBOOK[stockSymbol][stockType][price].orders.push({ userId: userId, type: "normal", quantity: quantity, orderId: orderId });
           
            STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantity;
            STOCK_BALANCES[userId][stockSymbol][stockType].locked += quantity;
            publisher.publish("sell", JSON.stringify({code: 200, value: "Order placed successfully, partial order matched"}));
            publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
            return
            
        } else {

            ORDERBOOK[stockSymbol][stockType][price] = ORDERBOOK[stockSymbol][stockType][price] || {total: 0, orders: []};
            ORDERBOOK[stockSymbol][stockType][price].total += quantity;
            ORDERBOOK[stockSymbol][stockType][price].orders.push({ userId: userId, type: "normal", quantity: quantity, orderId: orderId });
            STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantity;
            STOCK_BALANCES[userId][stockSymbol][stockType].locked += quantity;
            publisher.publish("sell", JSON.stringify({code: 200, value: "Order Placed successfully"}));
            publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
            return
        }
    } catch (error) {
        console.log(error);
        return error;
    }
};


export const buyYesNo = async (uuid: any, userId: string, stockSymbol: string, quantity: number, stockType: "yes" | "no", price: number) => {
  try {
    if(!INR_BALANCES[userId]) {
      publisher.publish(`buy${uuid}`, JSON.stringify({code: 400, value: "User not exist"}));
      return
  }

  const userBalance = INR_BALANCES[userId].balance;
  if(userBalance < quantity*price) {
      publisher.publish(`buy${uuid}`, JSON.stringify({code: 400, value: "INR not available", userId: userId}));
      return
  }
  const oppositePrice = 10-price;
  const oppositeStockType = stockType === "yes" ? "no" : "yes";
  const orderId = Math.floor(Math.random() * 100);
  ORDERBOOK[stockSymbol] = ORDERBOOK[stockSymbol] || {};
  ORDERBOOK[stockSymbol][stockType] = ORDERBOOK[stockSymbol][stockType] || {};

  if(ORDERBOOK[stockSymbol][stockType]) {
    console.log("fkbgvsdkjcskvj");
      const priceArray = Object.keys(ORDERBOOK[stockSymbol][stockType]).map(Number).sort();
      const finalPriceArray:number[] = priceArray.filter(num => num <= price);
      if(finalPriceArray.length === 0) {
          // A check
          ORDERBOOK[stockSymbol][oppositeStockType] = ORDERBOOK[stockSymbol][oppositeStockType] || {};
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice] = ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice] || {total: 0, orders: []};
          // A check
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice].total += quantity;
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice].orders.push({userId: userId, type: "reverse", quantity: quantity, orderId: orderId});
          INR_BALANCES[userId].balance -= (price*quantity);
          INR_BALANCES[userId].locked += (price*quantity);
          // res.status(200).json({ORDERBOOK, STOCK_BALANCES, INR_BALANCES}); 
          // return
          publisher.publish(`buy${uuid}`, JSON.stringify({code: 200, value: "Buy Order placed successfully", userId: userId}));
          publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
          return
      }
      for (const item of finalPriceArray) {  
          let quantityPresentInFirstElement = ORDERBOOK[stockSymbol][stockType][Number(item)].total;
          STOCK_BALANCES[userId] = STOCK_BALANCES[userId] || {}
          STOCK_BALANCES[userId][stockSymbol] = STOCK_BALANCES[userId][stockSymbol] || {}
          STOCK_BALANCES[userId][stockSymbol][stockType] = STOCK_BALANCES[userId][stockSymbol][stockType] || {quantity: 0, locked: 0};

          if(quantityPresentInFirstElement < quantity) {         
                  INR_BALANCES[userId].balance -= Number(item)*quantityPresentInFirstElement;               
                  STOCK_BALANCES[userId][stockSymbol][stockType].quantity += quantityPresentInFirstElement;
                  const array = ORDERBOOK[stockSymbol][stockType][Number(item)].orders;
                  for (let el of array) {
                          quantity -= el.quantity;
                          if(el.type === "normal") {
                              STOCK_BALANCES[el.userId][stockSymbol][stockType].locked -= el.quantity;
                              INR_BALANCES[el.userId] = INR_BALANCES[el.userId] ?? {balance: 0, locked: 0};
                              INR_BALANCES[el.userId].balance += el.quantity * Number(item);
                          }
                          else {
                              await functionUsedInsideArrayBuy(el, stockSymbol, stockType);
                              INR_BALANCES[el.userId].locked -= el.quantity * Number(item);
                              STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity += el.quantity;
                          }
                      }
                  // quantity -= quantityPresentInFirstElement;
                  delete ORDERBOOK[stockSymbol][stockType][Number(item)];
              }        
          else {   
                  ORDERBOOK[stockSymbol][stockType][Number(item)].total -= quantity;
                  INR_BALANCES[userId].balance -= quantity*Number(item);
                  STOCK_BALANCES[userId][stockSymbol][stockType].quantity += quantity;
                  
                  const array = ORDERBOOK[stockSymbol][stockType][Number(item)].orders;
                  
                  for (let el of array) {
                      if(quantity >= el.quantity) {
                          quantity -= el.quantity;
                          if(el.type === "normal") {
                              STOCK_BALANCES[el.userId][stockSymbol][stockType].locked -= el.quantity;
                              INR_BALANCES[el.userId] = INR_BALANCES[el.userId] ?? {balance: 0, locked: 0};
                              INR_BALANCES[el.userId].balance += el.quantity * Number(item);                                
                          }
                          else {
                              await functionUsedInsideArrayBuy(el, stockSymbol, stockType);
                              INR_BALANCES[el.userId].locked -= el.quantity * Number(item);
                              STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity += el.quantity;
                          }
                          array.shift();
                      }
                      else {                                
                          el.quantity -= quantity;
                          if(el.type === "normal") {
                              STOCK_BALANCES[el.userId][stockSymbol][stockType].locked -= quantity;
                              INR_BALANCES[el.userId] = INR_BALANCES[el.userId] ?? {balance: 0, locked: 0};
                              INR_BALANCES[el.userId].balance += quantity * Number(item);                                   
                          }
                          else {
                              await functionUsedInsideArrayBuy(el, stockSymbol, stockType);
                              INR_BALANCES[el.userId].locked -= quantity * Number(item);
                              STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity += quantity;
                          }
                          quantity = 0;
                          publisher.publish(`buy${uuid}`, JSON.stringify({code: 200, value: "Order matched successfully", userId: userId}));
                          publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
                          return
                      }
                  }
              }
          }
          // A check
          ORDERBOOK[stockSymbol][oppositeStockType] = ORDERBOOK[stockSymbol][oppositeStockType] || {};
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice] = ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice] || {total: 0, orders: []};
          // A check
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice].total += quantity;
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice].orders.push({userId: userId, type: "reverse", quantity: quantity, orderId: orderId});
          INR_BALANCES[userId].balance -= (price*quantity);
          INR_BALANCES[userId].locked += (price*quantity);
          publisher.publish(`buy${uuid}`, JSON.stringify({code: 200, value: "Partial Order matched", userId: userId}));
          publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
          return            
  }
  else {
      // pseudo order laga do, bina price ki bakchodi ke to matlab same code
          // A check
          ORDERBOOK[stockSymbol][oppositeStockType] = ORDERBOOK[stockSymbol][oppositeStockType] || {};
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice] = ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice] || {total: 0, orders: []};
          // A check
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice].total += quantity;
          ORDERBOOK[stockSymbol][oppositeStockType][oppositePrice].orders.push({userId: userId, type: "reverse", quantity: quantity, orderId: orderId});
          INR_BALANCES[userId].balance -= (price*quantity);
          INR_BALANCES[userId].locked += (price*quantity);
          publisher.publish(`buy${uuid}`, JSON.stringify({code: 200, value: "Order Placed Successfully", userId: userId}));
          publisher.publish(`webSocket${stockSymbol}`, JSON.stringify(ORDERBOOK));
          return
  } }
    catch (error) {
    console.log(error);
    return error;
  }
}






export const functionUsedInsideArrayBuy = async (el: orders, stockSymbol: string, stockType: string) => {
    try {
        STOCK_BALANCES[el.userId] = STOCK_BALANCES[el.userId] || {}
        STOCK_BALANCES[el.userId][stockSymbol] = STOCK_BALANCES[el.userId][stockSymbol] || {}
        STOCK_BALANCES[el.userId][stockSymbol][stockType] = STOCK_BALANCES[el.userId][stockSymbol][stockType] || {}
        STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity = STOCK_BALANCES[el.userId][stockSymbol][stockType].quantity || 0;
        STOCK_BALANCES[el.userId][stockSymbol][stockType].locked = STOCK_BALANCES[el.userId][stockSymbol][stockType].locked || 0;
    } catch (error) {
        console.log(error);
        return error;
    }
}