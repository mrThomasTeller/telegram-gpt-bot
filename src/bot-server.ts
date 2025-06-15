import 'dotenv/config';
import TelegramConnection from './lib/TelegramConnection.ts';
import { catchError } from './lib/async.ts';
import { isCommandForBot } from './lib/tgUtils.ts';
import message, { startNewTopic } from './commands/message.ts';
import ping from './commands/ping.ts';

catchError(main());

const whiteChatsList = (process.env.WHITE_CHATS_LIST ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter((item) => item.length > 0);

async function main(): Promise<void> {
  const tg = new TelegramConnection();
  // const store = new Store();

  await tg.bot.setMyCommands([
    { command: 'new_topic', description: 'Начать новую тему' },
    { command: 'ping', description: 'Проверить работоспособность бота' },
  ]);

  tg.bot.onText(/.*/, async (msg) => {
    if (msg.text == null) return;

    const inWhiteList = whiteChatsList.some((item) => {
      // Проверяем ID чата
      if (!isNaN(Number(item)) && Number(item) === msg.chat.id) {
        return true;
      }
      // Проверяем username пользователя (без @)
      const username = msg.from?.username;
      if (username != null && (item === username || item === `@${username}`)) {
        return true;
      }
      return false;
    });

    if (await isCommandForBot(msg)) {
      if (!inWhiteList) {
        await tg.bot.sendMessage(
          msg.chat.id,
          '🚫 Бот недоступен для вашего аккаунта. Попросите администратора добавить вас в список разрешенных.'
        );
      } else if (process.env.MODE === 'MAINTENANCE') {
        await tg.bot.sendMessage(
          msg.chat.id,
          '😴 Бот временно отключен для технического обслуживания. Пожалуйста, попробуйте позже.'
        );
      } else {
        const command = msg.text.split(/ |@/)[0];
        switch (command) {
          case '/ping':
            await ping(tg, msg);
            return;

          case '/new_topic':
            await startNewTopic(tg, msg.chat.id);
            return;

          default:
            await message(tg, msg);
        }
      }
    }
  });

  console.log('Telegram GPT bot started');
}
