# DFN Price Websocket Simulator

This tool is used to simulate a provided price websocket response feed (obtained by editing HAR file)

## Usage

-   Replace response.jon file at assets location in the repo.
-   This json file should contain `messages` key which includes websocket data
-   Each message record should include `data` field which is the stringified message and `time` field which denotes the timestamp of message occurrence. (If you are using HAR file from the dev tool, these fields are included by default)
-   First record of the response messages is considered as the auth request
-   Start server by running `npm run start` in the terminal
-   Change Pro11 application connection settings json to connect to ws://localhost:9898 qs

## Author

Chathuranga Mohottala – [@cha777](https://github.com/cha777) – chathuranga_wm@yahoo.com
