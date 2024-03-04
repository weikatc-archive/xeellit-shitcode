const { findChannel } = require('../../client/util')

module.exports = {
    command: {
        aliases: ['logs', 'log', 'setlog', 'l'],
        description: 'установка канала логов',
        fullDescription: `Бот логирует удаления и изменения сообщений`,
        usage: '[#канал | remove]',
        examples: {
            '{{prefix}}logger': 'покажет канал логов',
            '{{prefix}}logger #логи': 'установит канал #логи как канал для логов'
        },
        permissions: {
            user: ['MANAGE_GUILD']
        }
    },
    execute: async function (message, args, options) {
        if (!xee.redis?.ready) return message.channel.send('Подожди-ка...')
        const isLog = !!message.guild.data.logsChannel

        if (!args.length) return message.channel.send(isLog && `В канал ${message.guild.data.logsChannel} отправляются удаленные или измененные сообщения.` || xee.commands.help(this, options.prefix))

        if (isLog && ['remove', 'delete', 'reset'].includes(args[0].toLowerCase())) {
            await message.guild.data.update({ $set: { logs: null } })
            return message.channel.send('Канал логов удален. Ну и пусть')
        }

        const channel = await findChannel(message, args.join(' '), { text: true })
        if (!channel || !channel.viewable) return message.channel.send(`Как по мне, такого канала нет`)
        if (!channel.permissionsFor(message.member).has('VIEW_CHANNEL')) return message.channel.send(`Ты не можешь видеть этот канал`)
        if (!channel.permissionsFor(message.member).has('SEND_MESSAGES')) return message.channel.send(`Ты же не можешь писать в канале ${channel}...`)
        if (!channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return message.channel.send(`Я не могу писать в канале ${channel}. И да, шариковыя ручка не похожет`)

        await message.guild.data.update({ $set: { logs: channel.id } })
        return message.channel.send(`Канал логов установлен: ${channel}`)
    }
}
