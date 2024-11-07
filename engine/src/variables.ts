export let INR_BALANCES: inr = {
    "user1": {
        balance: 1000,
        locked: 0
    },
    "user2": {
        balance: 2000,
        locked: 0
    },
    "user3": {
        balance: 25,
        locked: 0
    },
    "user4": {
        balance: 500,
        locked: 0
    }
}

export interface user {
    balance: number,
    locked: number
}

export interface inr {
    [userId: string]: user
}



export let ORDERBOOK: book = {
    "BTC_USDT_10_OCT_2024": {
        "yes": {
            3.5: {
                "total": 6,
                "orders": [{userId: "user1", type: "reverse", quantity: 4, orderId: 1}, {userId: "user4", type: "normal", quantity: 2, orderId: 2}]
            },
            4.5: {
                "total": 4,
                "orders": [{userId: "user2", type: "normal", quantity: 3, orderId: 3}, {userId: "user1", type: "normal", quantity: 5, orderId: 4}]
            }
        },
        "no": {
            1: {
                "total": 3,
                "orders": [{userId: "user3", type: "normal", quantity: 2, orderId: 5}, {userId: "user2", type: "normal", quantity: 1, orderId: 6}]
            },
            2: {
                "total": 1,
                "orders": [{userId: "user3", type: "normal", quantity: 2, orderId: 5}, {userId: "user2", type: "normal", quantity: 1, orderId: 6}]
            }
        }
    },
    "BTC_USDT_9_OCT_2024": {
        "yes": {
            5: {
                "total": 9,
                "orders": [{userId: "user1", type: "reverse", quantity: 4, orderId: 7}, {userId: "user4", type: "normal", quantity: 5, orderId: 8}]
            },
            6: {
                "total": 30,
                "orders": [{userId: "user3", type: "normal", quantity: 10, orderId: 9}, {userId: "user2", type: "reverse", quantity: 20, orderId: 10}]
            }
        }
    }
}

export interface orders {
    userId: string,
    type: string,
    quantity: number,
    orderId: number
}
export interface price {
    total: number,
    orders: orders[]
}
export interface stockType {
    [key: number]: price
}
export interface stockSymbol {
    [key: string]: stockType
}
export interface book {
    [key: string]: stockSymbol
}


export let STOCK_BALANCES: stockBalanceInterface = {
	"user1": {
	   "BTC_USDT_10_OCT_2024": {
		   "yes": {
			   "quantity": 5,
			   "locked": 0
		   },
           "no": {
                "quantity": 0,
                "locked": 0
           }
	   }
	},
	"user2": {
		"BTC_USDT_10_OCT_2024": {
		   "no": {
			   "quantity": 3,
			   "locked": 4
		   }
	   }
	},
    "user4": {
		"BTC_USDT_10_OCT_2024": {
		   "yes": {
			   "quantity": 3,
			   "locked": 0
		   },
           "no": {
            "quantity": 9,
            "locked": 0
           }
	   }
	},
}


export interface yesOrNo {
    quantity: number,
    locked: number
}

export interface stock {
    [key: string] : yesOrNo
}

export interface user2 {
    [key: string]: stock
}

export interface stockBalanceInterface {
    [key: string]: user2
}

export function resetVariables() {
    INR_BALANCES = {};
    ORDERBOOK = {};
    STOCK_BALANCES = {};
}