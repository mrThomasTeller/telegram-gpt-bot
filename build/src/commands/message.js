import { sendMessageToGpt } from '../lib/gpt.js';
export default async function message(telegramConnection, msg) {
    const chatId = msg.chat.id;
    const { bot } = telegramConnection;
    try {
        await bot.sendMessage(chatId, '🤔 Думаю...');
        const response = await sendMessageToGpt({
            text: msg.text ?? '',
            onBusy: async () => {
                await bot.sendMessage(chatId, '😮‍💨 Бот усердно трудится, нужно немножко подождать');
            },
            onBroken: async () => {
                await bot.sendMessage(chatId, '💔 С ботом что-то случилось... Попробуйте позже. Мы починим его и сообщим вам как можно скорее.');
            },
        });
        await bot.sendMessage(chatId, response.text);
    }
    catch (error) {
        console.log(error);
        await telegramConnection.bot.sendMessage(chatId, 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.');
    }
}
