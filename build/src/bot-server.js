import 'dotenv/config';
import TelegramConnection from './lib/TelegramConnection.js';
import { catchError } from './lib/async.js';
import { isCommandForBot } from './lib/tgUtils.js';
import message from './commands/message.js';
import ping from './commands/ping.js';
catchError(main());
const whiteChatsList = (process.env.WHITE_CHATS_LIST ?? '')
    .split(',')
    .map((id) => parseInt(id, 10));
async function main() {
    const tg = new TelegramConnection();
    // const store = new Store();
    tg.bot.onText(/.*/, async (msg) => {
        if (msg.text == null)
            return;
        const inWhiteList = whiteChatsList.includes(msg.chat.id);
        if (await isCommandForBot(tg.bot, msg)) {
            if (process.env.MODE === 'MAINTENANCE' || !inWhiteList) {
                await tg.bot.sendMessage(msg.chat.id, '😴 Бот временно отключен для технического обслуживания. Пожалуйста, попробуйте позже.');
            }
            else {
                const command = msg.text.split(/ |@/)[0];
                switch (command) {
                    case '/ping':
                        await ping(tg, msg);
                        return;
                    default:
                        await message(tg, msg);
                }
            }
        }
    });
    console.log('Telegram GPT bot started');
}
