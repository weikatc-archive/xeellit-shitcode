const { findChannel } = require('../../client/util')

module.exports = {
    command: {
        aliases: ['modlogs', 'modlog', 'setmodlog', 'ml'],
        description: 'установка канала модеративных логов',
        usage: '[#канал | remove]',
        examples: {
            '{{prefix}}modlogger': 'покажет канал логов',
            '{{prefix}}modlogger #мод-логи': 'установит канал #мод-логи как канал для модеративных логов'
        },
        permissions: {
            user: ['MANAGE_GUILD']
        }
    },
    execute: async function (message, args, options) {
        const isLog = !!message.guild.data.modLogsChannel?.permissionsFor(message.guild.me)?.has('READ_MESSAGE_HISTORY')
        if (!args.length) return message.channel.send(isLog && `В канал ${message.guild.data.modLogsChannel} отправляются модеративные логи.` || xee.commands.help(this, options.prefix))

        if (isLog && ['remove', 'delete', 'reset'].includes(args[0].toLowerCase())) {
            await Promise.all([
                await message.guild.data.update({ $set: { modLogs: null } }),
                xee.db.collection('cases').updateMany({ guild: message.guild.id }, { $unset: { messageId: '' } })
            ])

            return message.channel.send('Канал модеративных логов был удален...')
        }

        const channel = await findChannel(message, args.join(' '), { text: true })
        if (!channel || !channel.viewable) return message.channel.send(`Интересно, ты будешь уверять меня что такой канал существует?`)
        if (!channel.permissionsFor(message.member).has('VIEW_CHANNEL')) return message.channel.send(`Ты не можешь видеть этот канал`)
        if (!channel.permissionsFor(message.member).has('SEND_MESSAGES')) return message.channel.send(`Ты же не можешь писать в канале ${channel}...`)
        if (!channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return message.channel.send(`Я не могу писать в канале ${channel}. И да, шариковыя ручка не похожет`)
        if (!channel.permissionsFor(message.guild.me).has('READ_MESSAGE_HISTORY')) return message.channel.send(`Мне нужно право на прочтение истории сообщений в канале ${channel}`)

        await message.guild.data.update({ $set: { modLogs: channel.id } })
        return message.channel.send(`Канал модеративных логов установлен: ${channel}`)
    }
}
