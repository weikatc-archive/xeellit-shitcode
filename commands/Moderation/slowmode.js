const { parseDuration, isMod } = require('../../client/util')

module.exports = {
    command: {
        description: 'устанавливает медленный режим в канале',
        usage: '<время | remove>',
        aliases: ['ratelimit', 'cooldown'],
        fullDescription: 'Слоумод не может быть больше, чем 6 часов.',
        examples: {
            '{{prefix}}slowmode 1s': 'установит слоумод как 1 секунда',
            '{{prefix}}slowmode remove': 'уберет медленный режим'
        },
        permissions: { me: ['MANAGE_CHANNELS'] }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('Эта команда не для тебя')
        if (message.channel.type !== 'GUILD_TEXT') return message.channel.send('Эта команда работает только в текстовых каналах')
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))
        
        if (args[0].toLowerCase() === 'remove') {
            await message.channel.setRateLimitPerUser(null)
            return message.channel.send('Медленный режим в этом канале был отключён').then(message => setTimeout(() => message.delete().catch(() => null), 1500))
        }

        let time = parseDuration(args.join(' '))
        if (!time) return message.channel.send('Это не сильно похоже на время')
        if (time > 216e5) return message.channel.send('Нельзя поставить слоумод больше, чем 6 часов')
        if (time < 1e3) return message.channel.send('😅')
        if (message.channel.rateLimitPerUser * 1000 === time) return message.channel.send('И зачем ты это делаешь?')
        
        await message.channel.setRateLimitPerUser(time / 1000)
        return message.channel.send(`Медленный режим установлен как ${xee.constructor.ruMs(time)}`).then(message => setTimeout(() => message.delete().catch(() => null), 1500))
    }
}
