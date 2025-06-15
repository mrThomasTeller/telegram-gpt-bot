import OpenAI from 'openai';
import { wait } from './async.ts';
import { required } from './utils.ts';

const openai = new OpenAI({
  apiKey: required(process.env.GPT_API_KEY),
});

type ChatMessage = {
  id: string;
  text: string;
  conversationId?: string;
};

const conversations = new Map<string, OpenAI.Chat.ChatCompletionMessageParam[]>();

export async function sendMessageToGpt({
  text,
  maxTries = 5,
  retryTime = 25_000,
  conversationId,
  parentMessageId,
  onBusy,
  onBroken,
  onChunk,
}: {
  text: string;
  maxTries?: number;
  retryTime?: number;
  conversationId?: string;
  parentMessageId?: string;
  onBusy?: () => void | Promise<void>;
  onBroken?: () => void | Promise<void>;
  onChunk?: (chunk: string) => void | Promise<void>;
}): Promise<ChatMessage> {
  try {
    const conversationKey = conversationId ?? crypto.randomUUID();

    const messages = conversations.get(conversationKey) ?? [];

    if (messages.length === 0) {
      messages.push({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
    }

    messages.push({ role: 'user', content: text });

    if (onChunk !== undefined) {
      // Стриминг режим
      const stream = await openai.chat.completions.create({
        messages,
        model: required(process.env.GPT_MODEL),
        stream: true,
      });

      let fullContent = '';
      let messageId = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        
        // Обрабатываем контент, даже если это пустая строка (но не null/undefined)
        if (content !== undefined && content !== null) {
          fullContent += content;
          
          // Вызываем onChunk только для непустого контента
          if (content !== '') {
            await onChunk(content);
          }
        }
        
        if (chunk.id !== undefined && chunk.id !== '') {
          messageId = chunk.id;
        }
      }

      if (fullContent === '') {
        throw new Error('No response from OpenAI');
      }

      const assistantMessage: OpenAI.Chat.ChatCompletionMessageParam = {
        role: 'assistant',
        content: fullContent,
      };

      messages.push(assistantMessage);
      conversations.set(conversationKey, messages);

      return {
        id: messageId,
        text: fullContent,
        conversationId: conversationKey,
      };
    } else {
      // Обычный режим без стриминга
      const completion = await openai.chat.completions.create({
        messages,
        model: required(process.env.GPT_MODEL),
      });

      const assistantMessage = completion.choices[0]?.message;

      if (
        assistantMessage?.content === undefined ||
        assistantMessage.content === null ||
        assistantMessage.content === ''
      ) {
        throw new Error('No response from OpenAI');
      }

      messages.push(assistantMessage);
      conversations.set(conversationKey, messages);

      return {
        id: completion.id,
        text: assistantMessage.content,
        conversationId: conversationKey,
      };
    }
  } catch (error: unknown) {
    const isRateLimitError =
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      (error as any).status === 429;

    if (isRateLimitError) {
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
        onChunk,
        conversationId,
        parentMessageId,
        maxTries: maxTries - 1,
        retryTime,
      });
    }
    throw error;
  }
}
