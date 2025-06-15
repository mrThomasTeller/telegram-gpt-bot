import OpenAI from "openai";
import { wait } from "./async.ts";
import { required } from "./utils.ts";

const openai = new OpenAI({
  apiKey: required(process.env.GPT_API_KEY),
});

type ChatMessage = {
  id: string;
  text: string;
  conversationId?: string;
};

const conversations = new Map<
  string,
  OpenAI.Chat.ChatCompletionMessageParam[]
>();

export async function sendMessageToGpt({
  text,
  maxTries = 5,
  retryTime = 25_000,
  conversationId,
  parentMessageId,
  onBusy,
  onBroken,
}: {
  text: string;
  maxTries?: number;
  retryTime?: number;
  conversationId?: string;
  parentMessageId?: string;
  onBusy?: () => void | Promise<void>;
  onBroken?: () => void | Promise<void>;
}): Promise<ChatMessage> {
  try {
    const conversationKey = conversationId ?? crypto.randomUUID();

    const messages = conversations.get(conversationKey) ?? [];

    if (messages.length === 0) {
      messages.push({
        role: "system",
        content: "You are a helpful assistant.",
      });
    }

    messages.push({ role: "user", content: text });

    const completion = await openai.chat.completions.create({
      messages,
      model: required(process.env.GPT_MODEL),
    });

    const assistantMessage = completion.choices[0]?.message;

    if (assistantMessage?.content === undefined || assistantMessage.content === null || assistantMessage.content === '') {
      throw new Error("No response from OpenAI");
    }

    messages.push(assistantMessage);
    conversations.set(conversationKey, messages);

    return {
      id: completion.id,
      text: assistantMessage.content,
      conversationId: conversationKey,
    };
  } catch (error: unknown) {
    const isRateLimitError = error !== null && 
      typeof error === 'object' && 
      'status' in error && 
      (error as any).status === 429;
    
    if (isRateLimitError) {
      if (maxTries === 1) {
        if (onBroken !== undefined) await onBroken();
        throw new Error(
          "Максимальное количество попыток отправить сообщение GPT достигнуто"
        );
      }

      if (onBusy !== undefined) await onBusy();
      await wait(retryTime);
      return await sendMessageToGpt({
        text,
        onBusy,
        onBroken,
        conversationId,
        parentMessageId,
        maxTries: maxTries - 1,
        retryTime,
      });
    }
    throw error;
  }
}

