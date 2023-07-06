// the message is in private chat with the bot or in a group chat addressed to the bot
export async function isCommandForBot(bot, message) {
    return message.chat.type === 'private';
    // const botName = (await bot.getMe()).username;
    // assert(botName);
    // return (
    //   (message.chat.type === 'private' || message.text?.includes(`@${botName}`) === true) &&
    //   message.text?.startsWith('/') === true
    // );
}
