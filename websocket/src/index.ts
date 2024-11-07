import { createClient } from 'redis';
import WebSocket, {WebSocketServer} from 'ws';
const wss = new WebSocketServer({port: 8080});
async function startServer() {
    await subscriber.connect();
}
const subscriber = createClient();
startServer();


wss.on('connection', (ws) => {
    ws.on('error', (error) => {
        console.log(error);
    });
    ws.on('message', async(message) => {
        const finalMessage = message.toString();
        const finalFinalMessage = JSON.parse(finalMessage);
        if(finalFinalMessage.type === 'SUB') {
            const symbol = finalFinalMessage.symbol;
            await subscriber.subscribe(`webSocket${symbol}`, (message) => {
                const orderbook = JSON.parse(message);
                ws.send(JSON.stringify(orderbook));
            })
        }
        else if (finalFinalMessage.type === "UNSUB") {
            const symbol = finalFinalMessage.symbol;
            await subscriber.unsubscribe(`webSocket${symbol}`);
        }
    });
    ws.send("Hi, sending data");
})

