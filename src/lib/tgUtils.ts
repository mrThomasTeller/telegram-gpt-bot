import _ from 'lodash';
import type TelegramBot from 'node-telegram-bot-api';

// the message is in private chat with the bot or in a group chat addressed to the bot
export async function isCommandForBot(message: TelegramBot.Message): Promise<boolean> {
  return message.chat.type === 'private';
}

export function getAuthorName(msg: TelegramBot.Message): string | undefined {
  const author = msg.from;
  if (author == null) return undefined;

  if (author.first_name != null) {
    return [author.first_name, author.last_name].filter(_.negate(_.isEmpty)).join(' ');
  }

  return author.username ?? undefined;
}
