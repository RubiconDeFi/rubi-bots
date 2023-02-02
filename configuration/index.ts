// Goal is to configure according to the following heirarchy:
// 1. What type of bot would you like to run? 
// 2. What strategy would you like to employ?
// 3. What network would you like to deploy to?
// 4. What tokens would you like to target in your strategy? (strategy-specific UX flow here!)

import { BotType } from "./config";

// 5. Start
const readline = require('node:readline');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


async function main() {
    console.log("\n Hello there! Welcome to Rubi Bots 🤖");
    // 1. What type of bot would you like to run? 
    async function botTypeUserCallback(): Promise<BotType> {
        return new Promise(resolve => {
            rl.question('\n What type of bot would you like to run?\n1. Market-Making Bot\n2. Trading Bot\n3. Liquidator Bot\n:', (answer) => {
                switch (answer.toLowerCase()) {
                    case '1':
                        console.log('\nSuper! Time to market-make!');
                        resolve(BotType.MarketMaking);
                        break;
                    case '2':
                        console.log('Sorry! :( No trading bots yet');
                        resolve(BotType.Trading);
                        break;
                    case '3':
                        console.log('Sorry! :( No liquidator bots yet');
                        resolve(BotType.Liquidator);
                        break;
                    default:
                        console.log('Invalid answer! Pick a number 1 through 3');
                        resolve(BotType.ErrorOrNone);
                        break;
                }
            })
        });
    }

    botTypeUserCallback().then((r: BotType) => {
        console.log("this was selected", r);

    })
    // Ends input collection
    // rl.close();



}

main();

// export {};
