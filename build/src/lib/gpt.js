import { ChatGPTAPI, ChatGPTError } from 'chatgpt';
import { wait } from './async.js';
import { required } from './utils.js';
export async function sendMessageToGpt({ text, maxTries = 5, retryTime = 25_000, onBusy, onBroken, api = new ChatGPTAPI({
    apiKey: required(process.env.GPT_API_KEY),
    completionParams: {
        max_tokens: 2048,
        model: 'gpt-4',
    },
}), }) {
    try {
        const result = await api.sendMessage(text, {
            completionParams: { max_tokens: 2048 },
        });
        return result;
    }
    catch (error) {
        // Too Many Requests - ждём 25 секунд
        if (error instanceof ChatGPTError && error.statusCode === 429) {
            if (maxTries === 1) {
                if (onBroken !== undefined)
                    await onBroken();
                throw new Error('Максимальное количество попыток отправить сообщение GPT достигнуто');
            }
            if (onBusy !== undefined)
                await onBusy();
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
