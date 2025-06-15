import logger from '../config/logger.ts';
import { sendMessageToGpt } from '../lib/gpt.ts';
import type TelegramConnection from '../lib/TelegramConnection.ts';
import type TelegramBot from 'node-telegram-bot-api';
import { getAuthorName } from '../lib/tgUtils.ts';

const conversations = new Map<
  number,
  {
    gptConversationId?: string;
    gptParentMessageId?: string;
    lastMessageTime?: number;
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
  const currentTime = Date.now();
  const conversationData = conversations.get(chatId);

  // Проверяем прошел ли час с последнего сообщения
  if (conversationData?.lastMessageTime !== undefined) {
    const timeDifference = currentTime - conversationData.lastMessageTime;
    const oneHourInMs = 60 * 60 * 1000;

    if (timeDifference > oneHourInMs) {
      // Начинаем новую тему
      conversations.delete(chatId);
      await telegramConnection.bot.sendMessage(
        chatId,
        '⏰ Прошло больше часа с нашего последнего разговора. Начинаю новую тему!'
      );
    }
  }

  const { bot } = telegramConnection;

  try {
    const thinkingMessage = await bot.sendMessage(chatId, '🤔 Думаю...');
    const thinkingMessageId = thinkingMessage.message_id;

    const updatedConversationData = conversations.get(chatId);

    let accumulatedText = '';
    let lastEditTime = Date.now();
    const MIN_EDIT_INTERVAL = 1000; // Минимальный интервал между редактированиями в мс

    const response = await sendMessageToGpt({
      text: msg.text ?? '',
      conversationId: updatedConversationData?.gptConversationId,
      parentMessageId: updatedConversationData?.gptParentMessageId,
      onBusy: async () => {
        await bot.sendMessage(chatId, '😮‍💨 Бот усердно трудится, нужно немножко подождать');
      },
      onBroken: async () => {
        await bot.sendMessage(
          chatId,
          '💔 С ботом что-то случилось... Попробуйте позже. Мы починим его и сообщим вам как можно скорее.'
        );
      },
      onChunk: async (chunk: string) => {
        accumulatedText += chunk;
        const currentTime = Date.now();

        // Обновляем сообщение не чаще чем раз в секунду
        if (currentTime - lastEditTime >= MIN_EDIT_INTERVAL) {
          try {
            await bot.editMessageText(accumulatedText + '...', {
              chat_id: chatId,
              message_id: thinkingMessageId,
            });
            lastEditTime = currentTime;
          } catch (editError) {
            // Игнорируем ошибки редактирования (например, если текст не изменился)
          }
        }
      },
    });

    // Финальное обновление сообщения с полным текстом
    if (accumulatedText !== response.text) {
      try {
        await bot.editMessageText(response.text, {
          chat_id: chatId,
          message_id: thinkingMessageId,
        });
      } catch (editError) {
        // Если не удалось отредактировать, отправим новое сообщение
        await bot.sendMessage(chatId, response.text);
      }
    }

    conversations.set(chatId, {
      gptConversationId: response.conversationId,
      gptParentMessageId: response.id,
      lastMessageTime: currentTime,
    });

    logger.info(`Query from ${getAuthorName(msg) ?? 'unknown'}`);
  } catch (error) {
    console.log(error);
    await telegramConnection.bot.sendMessage(
      chatId,
      'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.'
    );
  }
}
