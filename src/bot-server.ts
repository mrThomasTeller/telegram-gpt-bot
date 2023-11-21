import 'dotenv/config';
import TelegramConnection from './lib/TelegramConnection.ts';
import { catchError } from './lib/async.ts';
import { isCommandForBot } from './lib/tgUtils.ts';
import message, { startNewTopic } from './commands/message.ts';
import ping from './commands/ping.ts';

catchError(main());

const whiteChatsList = (process.env.WHITE_CHATS_LIST ?? '')
  .split(',')
  .map((id) => parseInt(id, 10));

async function main(): Promise<void> {
  const tg = new TelegramConnection();
  // const store = new Store();

  await tg.bot.setMyCommands([
    { command: 'ping', description: 'Проверить работоспособность бота' },
    { command: 'new_topic', description: 'Начать новую тему' },
  ]);

  tg.bot.onText(/.*/, async (msg) => {
    if (msg.text == null) return;

    const inWhiteList = whiteChatsList.includes(msg.chat.id);

    if (await isCommandForBot(msg)) {
      if (process.env.MODE === 'MAINTENANCE' || !inWhiteList) {
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
