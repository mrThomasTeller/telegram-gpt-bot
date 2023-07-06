import TelegramBot from 'node-telegram-bot-api';
import { required } from './utils.js';
class TelegramConnection {
    bot;
    constructor(bot = new TelegramBot(required(process.env.TELEGRAM_BOT_TOKEN), {
        polling: true,
    })) {
        this.bot = bot;
    }
}
export default TelegramConnection;
