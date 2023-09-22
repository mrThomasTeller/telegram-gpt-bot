import { sendMessageToGpt } from '../lib/gpt.ts';
import type TelegramConnection from '../lib/TelegramConnection.ts';
import type TelegramBot from 'node-telegram-bot-api';

const conversations = new Map<
  number,
  {
    gptConversationId?: string;
    gptParentMessageId?: string;
  }
>();

export async function startNewTopic(
  telegramConnection: TelegramConnection,
  chatId: number
): Promise<void> {
  conversations.delete(chatId);
  await telegramConnection.bot.sendMessage(chatId, '💬 О чём ещё поговорим?');
}

export default async function message(
  telegramConnection: TelegramConnection,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;

  const { bot } = telegramConnection;

  try {
    await bot.sendMessage(chatId, '🤔 Думаю...');

    const conversationData = conversations.get(chatId);

    const response = await sendMessageToGpt({
      text: msg.text ?? '',
      conversationId: conversationData?.gptConversationId,
      parentMessageId: conversationData?.gptParentMessageId,
      onBusy: async () => {
        await bot.sendMessage(chatId, '😮‍💨 Бот усердно трудится, нужно немножко подождать');
      },
      onBroken: async () => {
        await bot.sendMessage(
          chatId,
          '💔 С ботом что-то случилось... Попробуйте позже. Мы починим его и сообщим вам как можно скорее.'
        );
      },
    });

    conversations.set(chatId, {
      gptConversationId: response.conversationId,
      gptParentMessageId: response.id,
    });

    await bot.sendMessage(chatId, response.text);
  } catch (error) {
    console.log(error);
    await telegramConnection.bot.sendMessage(
      chatId,
      'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.'
    );
  }
}
