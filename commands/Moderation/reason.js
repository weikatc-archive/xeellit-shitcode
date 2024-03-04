const { isMod } = require('../../client/util')

module.exports = {
    command: {
        description: 'изменяет причину модеративного случая',
        usage: '<случай> <причина>',
        examples: {
            '{{prefix}}reason 1 Спам хз где': 'установит причину кейса под номером 1'
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('А твои права где...?')
        if (!message.guild.data.modLogsChannel?.permissionsFor(message.guild.me)?.has('READ_MESSAGE_HISTORY')) return message.channel.send('Нужно чтобы канал модеративных логов был установлен.')
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))

        const caseId = Math.floor(+args.shift())
        if (isNaN(caseId) || !isFinite(caseId)) return message.channel.send('Ты уверен, что это число?')

        const сase = await xee.db.collection('cases').findOne({ guild: message.guild.id, caseId })
        if (!сase) return message.channel.send('Такого кейса нет или был утерен')

        if (!args.length) return message.channel.send('А новую причину...?')

        const reason = args.join(' ').slice(0, 1024)
        const caseMessage = await message.guild.data.modLogsChannel.messages.fetch(сase.messageId).catch(() => null)
        if (caseMessage?.embeds.length) {
            const embed = caseMessage.embeds[0]
            embed.fields.at(-1).value = reason

            await caseMessage.edit(embed)
        }

        await xee.db.collection('cases').updateOne({ caseId, guild: message.guild.id }, { $set: { reason } })
        return message.channel.permissionsFor(message.guild.me).has([ 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY' ]) ? xee.react(message, '👌') : message.channel.send('👌')
    }
}