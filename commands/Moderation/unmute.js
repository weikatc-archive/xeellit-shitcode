const { findMember, isMod } = require('../../client/util')

module.exports = {
    command: {
        description: 'снимает заглушение с замученных людей',
        usage: '<@юзер> [причина]',
        aliases: ['um'],
        examples: {
            '{{prefix}}unmute @Minori': 'уберет заглушение у участника **@Minori**'
        },
        permissions: {
            me: ['MANAGE_ROLES']
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('Зачем ты пытаешься снять мут, если даже не можешь выдать его...')
        if (!args.length) return message.channel.send(xee.commands.help('unmute', options.prefix))

        const member = await findMember(message, args.join(' '))
        if (!member) return message.channel.send('Я не нашел пользователя, которого ты хотел избавить от мучений.')
        const muteCase = message.guild.data.mutes.find(mute => mute.memberId === member.id)

        if (!muteCase) return message.channel.send(`А разве **${member.user.id}** в муте? Я не знал.`)
        if (member.user.id === message.author.id) return message.channel.send('Ты не можешь раззаглушить самого себя 😫')

        const muteRole = message.guild.data.muteRole
        if (!muteRole) return message.channel.send('Роли мута на сервере нет. Интересно, куда она делась...?')
        if (!muteRole.editable) return message.channel.send('Я не могу взаимодействовать с этой ролью.')

        await Promise.all([
            muteCase.clearMute(message.member),
            message.guild.data.entries.createCase('unmute', member, message.member, {
                reason: args.slice(1).join(' ')
            })
        ])

        return message.channel.send(`**${member.user.tag}** вновь может писать в чатах...`)
    }
}
