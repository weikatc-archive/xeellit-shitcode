const { MessageEmbed, Util } = require('discord.js')
const { findMember } = require('../../client/util')

const Pagination = require('../../classes/Pagination')

module.exports = {
    command: {
        description: 'показывает варны юзера',
        usage: '[@юзер]',
        examples: {
            '{{prefix}}warns': 'покажет ваши полученные варны',
            '{{prefix}}warns @Rabi': 'покажет предупреждения @Rabi'
        },
        permissions: {
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args) {
        const member = args.length ? await findMember(message, args.join(' ')) : message.member
        if (!member) return message.channel.send(`Пользователь **${args.join(' ')}** не найден...`)

        const memberWarns = await xee.db.collection('warns').find({ guild: message.guild.id, user: member.id }).toArray()
        if (!memberWarns.length) return message.channel.send(member.id === message.author.id ? 'У тебя нет предупреждений. И да, старайся их не получать.' : `У **${member.user.tag}** нет предупреждений. Возможно, это временно, хотя, кто знает...`)

        const interface = new Pagination(message.author.id)

        Util.splitMessage(memberWarns.map((warn, index) => `[**${index + 1}**]: <@${warn.mod}>: **${warn.text || '...'}**`).join('\n'), { char: '\n', maxLength: 1800 })
            .forEach(value => interface.add({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: `Варны ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                        .setColor(xee.settings.color)
                        .setDescription(value)
                ]
            }))

        return interface.send(message.channel)
    }
}