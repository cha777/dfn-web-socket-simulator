import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import clui from 'clui';
import { server as WebSocketServer } from 'websocket';
import type { connection, IUtf8Message } from 'websocket';
import type { SocketMessage } from './@types/SocketMessage';
import type { ResponseData } from './@types/ResponseData';

const socketPort = 9898;
const socketQueue: SocketMessage[] = [];
let cluiProgress = new clui.Progress(20);
let socketQueueTimer: NodeJS.Timeout | undefined;
let isConnected = false;
let isAuthenticated = false;
let counter = 0;

const fetchResponseData = () => {
    const responseFilePath = path.join(process.cwd(), 'assets', 'response.json');
    const responseData = fs.readFileSync(responseFilePath.toString(), 'utf8');
    const response = JSON.parse(responseData) as ResponseData;

    if (response.title) {
        console.log(`Processing response feed for ${response.title}`);
    } else {
        console.log('Processing response feed');
    }

    if (!response.messages) {
        throw new Error('Response json file does not include messages');
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

    console.log(`Total feed duration: ${Math.floor(duration / 60000)} minutes`);
};

const startMessageQueue = (connection: connection) => {
    if (socketQueue.length > counter) {
        if (counter === 0) {
            console.log('Starting message queue');
        }

        let record = socketQueue[counter++];

        socketQueueTimer = setTimeout(() => {
            if (counter > 1) {
                process.stdout.moveCursor(0, -1);
            }

            console.log(cluiProgress.update(counter, socketQueue.length));

            connection.sendUTF(record.message);
            startMessageQueue(connection);
        }, record.timeOut);
    } else {
        console.log('end');
    }
};

const stopMessageQueue = () => {
    console.log('Stopping message queue');

    if (socketQueueTimer) {
        clearInterval(socketQueueTimer);
        socketQueueTimer = undefined;
        counter = 0;
    }
};

const validateAuthentication = (wsMessage: string) => {
    const messageStartIdx = wsMessage.indexOf('{');
    const message = wsMessage.slice(messageStartIdx);
    const messageContent = JSON.parse(message);

    return messageContent.AUTHVER && !messageContent.SID;
};

fetchResponseData();

const server = http.createServer();
server.listen(socketPort, () => {
    console.log(`Websocket started in ws://localhost:${socketPort}`);
});

const wsServer = new WebSocketServer({
    httpServer: server,
});

wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);

    connection.on('message', (message) => {
        let socketMsg = message as IUtf8Message;

        if (!isAuthenticated) {
            isAuthenticated = validateAuthentication(socketMsg.utf8Data);

            if (isConnected) {
                stopMessageQueue();
            }

            if (isAuthenticated) {
                startMessageQueue(connection);
            }
        }

        isConnected = true;
    });

    connection.on('close', () => {
        console.warn('Client has disconnected');
    });
});
