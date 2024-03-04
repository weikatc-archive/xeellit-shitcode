const { SnowflakeUtil } = require('discord.js')
const { findChannel, parseDuration, formatDate } = require('../../client/util')

module.exports = { 
    command: {
        aliases: ['remindme'],
        description: 'установка напоминания',
        usage: '<me | here | #канал> <длительность> [сообщение]',
        examples: {
            '{{prefix}}remindme 10m попить чай': 'напомнит вам через 10 минут попить чай',
            '{{prefix}}remind here 10s что?': 'напомнит в этом канале через 10 секунд о "что?"',
            '{{prefix}}remind #кладовка 1d': 'напомнит в канале #кладовка ваше сообщение через 1 день'
        }
    },
    execute: async function (message, args, options) { 
        if (options.usage === 'remindme') args.unshift('me')
        if (!args.length) return message.channel.send(xee.commands.help('remind', options.prefix))

        let channel = null
        let content = args[2] ? args.slice(2).join(' ') : message.url
        if (args[0].toLowerCase() === 'here') channel = message.channel
        else if (args[0].toLowerCase() === 'me') {
            const dmChannel = await message.author.createDM()
            if (await dmChannel.send({}).catch(e => e.httpStatus) === 403) return message.channel.send('Кажется, у тебя закрыты личные сообщения')
            else channel = dmChannel
        } else channel = await findChannel(message, args[0])
        if (!channel) return message.channel.send(`Канал **#${args[0]}** на сервере не найден...`)
        if (channel.type !== 'DM') {
            const permissions = channel.permissionsFor(message.member)
            const botPermissions = channel.permissionsFor(message.guild.me)
            if (!permissions.has('VIEW_CHANNEL')) return message.channel.send('Зачем ты хочешь добавить напоминание в канал, который не видишь?')
            if (!permissions.has('SEND_MESSAGES')) return message.channel.send('Ты не можешь туда писать. Думал я поведусь, да?')
            if (!permissions.has('MANAGE_MESSAGES')) return message.channel.send('У тебя должны быть права на управление сообщениями')
            if ((content.includes('@everyone') || content.includes('@here')) && !permissions.has('MENTION_EVERYONE')) return message.channel.send('Сейчас бы линкать всех без прав, да?')

            if (!botPermissions.has('VIEW_CHANNEL')) return message.channel.send(`Прости, но я не вижу канал ${channel}`)
            if (!botPermissions.has('SEND_MESSAGES')) return message.channel.send(`Я не могу писать сообщения в канал ${channel}. Прости, я не Clyde`)
        }
        if (!args[1]) return message.channel.send('А через сколько тебя пинать-то?')
        let time = parseDuration(args[1].toLowerCase())
        if (!time) return message.channel.send(`Прости меня, но я не знаю, что **${args[1].slice(0, 100)}** это время :(((`)
        if (time < 1e4) return message.channel.send(`Минимальная длительность: 10 секунд.`)
        if (time > 315576e5) return message.channel.send('Максимальная длительность: 1 год.')

        let end = message.createdTimestamp + time
        let id = SnowflakeUtil.generate()

        await xee.db.collection('reminds').insertOne({
            _id: id,
            guild: channel.guild?.id ?? null,
            message: content,
            channel: channel.id,
            user: message.author.id,
            start:  message.createdTimestamp,
            end
        })

        await xee.rest.kaneki.api.bot.remind.post({ json: { id } })

        return message.channel.send({content: `Напоминание создано. ${channel.type === 'DM' ? 'Напишу тебе' : `Напишу в канале ${channel}`} через ${xee.constructor.ruMs(time, true)} (${formatDate(end, 'F')
    }).`})
    }
}
