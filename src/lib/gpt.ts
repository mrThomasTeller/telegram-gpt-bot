import { ChatGPTAPI, ChatGPTError, type ChatMessage } from 'chatgpt';
import { wait } from './async.ts';
import { required } from './utils.ts';

export async function sendMessageToGpt({
  text,
  maxTries = 5,
  retryTime = 25_000,
  onBusy,
  onBroken,
  api = new ChatGPTAPI({
    apiKey: required(process.env.GPT_API_KEY),
    completionParams: {
      max_tokens: 2048,
      model: 'gpt-4',
    },
  }),
}: {
  text: string;
  maxTries?: number;
  retryTime?: number;
  onBusy?: () => void | Promise<void>;
  onBroken?: () => void | Promise<void>;
  api?: ChatGPTAPI;
}): Promise<ChatMessage> {
  try {
    const result = await api.sendMessage(text, {
      completionParams: { max_tokens: 2048 },
    });
    return result;
  } catch (error) {
    // Too Many Requests - ждём 25 секунд
    if (error instanceof ChatGPTError && error.statusCode === 429) {
      if (maxTries === 1) {
        if (onBroken !== undefined) await onBroken();
        throw new Error('Максимальное количество попыток отправить сообщение GPT достигнуто');
      }

      if (onBusy !== undefined) await onBusy();
      await wait(retryTime);
      return await sendMessageToGpt({
        text,
        onBusy,
        onBroken,
        maxTries: maxTries - 1,
        api,
        retryTime,
      });
    }
    throw error;
  }
}
