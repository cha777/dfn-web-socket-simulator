const http = require('http');
const path = require('path');
const fs = require('fs-extra');
const WebSocketServer = require('websocket').server;

const socketQueue = [];
const socketPort = 9898;
let socketQueueTimer;
let isConnected = false;
let counter = 0;

function fetchResponse() {
    const responseFilePath = path.join(process.cwd(), 'assets', 'response.json');
    const responseData = fs.readFileSync(responseFilePath.toString(), 'utf8');
    const response = JSON.parse(responseData);

    if (response.title) {
        console.log(`processing response feed for ${response.title}`);
    } else {
        console.log('processing response feed');
    }

    if (!response.messages) {
        throw new Error('response json file does not include messages');
    }

    let timeOffset = 0;
    let duration = 0;

    response.messages.shift(); // Auth request

    response.messages.forEach((record) => {
        if (record.type === 'receive') {
            if (timeOffset === 0) {
                timeOffset = record.time;
            }

            socketQueue.push({
                message: record.data,
                timeOut: Math.floor((record.time - timeOffset) * 1000),
            });

            duration += socketQueue[socketQueue.length - 1].timeOut;
            timeOffset = record.time;
        }
    });

    console.log(`total feed duration: ${duration} ms`);
}

function startMessageQueue(connection) {
    if (socketQueue.length > counter) {
        let record = socketQueue[counter++];

        setTimeout(() => {
            connection.sendUTF(record.message);
            startMessageQueue(connection);
        }, record.timeOut);
    } else {
        console.log('end');
    }
}

function stopMessageQueue() {
    if (socketQueueTimer) {
        clearInterval(socketQueueTimer);
        socketQueueTimer = undefined;
        counter = 0;
    }
}

fetchResponse();

const server = http.createServer();
server.listen(socketPort);

const wsServer = new WebSocketServer({
    httpServer: server,
});

wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);

    connection.on('message', (message) => {
        if (isConnected) {
            stopMessageQueue();
        } else {
            startMessageQueue(connection);
        }

        isConnected = true;
    });

    connection.on('close', (code, desc) => {
        stopMessageQueue();
        isConnected = false;
        console.log('Client has disconnected');
    });
});
