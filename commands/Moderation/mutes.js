const { MessageEmbed, Util } = require('discord.js')
const Pagination = require('../../classes/Pagination')

const { findByName } = require('../../client/finder')

module.exports = {
    command: {
        description: 'показывает список тех, кто находится в муте',
        usage: '[roles | @роль]',
        examples: {
            '{{prefix}}mutes': 'отправит список заглушенных участников',
            '{{prefix}}mutes roles': 'отключит или включит изъятие ролей при муте',
            '{{prefix}}mutes @Muted': 'установит роль мутов'
        },
        permissions: {
            me: ['EMBED_LINKS'],
        }
    },
    execute: async function (message, args, options) {
        if (args.length && message.member.permissions.has(['MANAGE_ROLES', 'MANAGE_MESSAGES'])) {
            if (args[0].toLowerCase() === 'roles') {
                await message.guild.data.update({ $set: { autoHardMute: !message.guild.data.autoHardMute } })
                return message.channel.send(message.guild.data.autoHardMute ? 'Теперь при заглушении я буду изымать все роли наказуемого участника' : 'С данного момента я перестаю забирать роли на время мутов')
            }

            const role = findByName(message.guild.roles.cache, args.join(' '))
            if (!role) return message.channel.send(`**${args.join(' ').slice(0, 60)}** для меня обычная пустышка.`)
            if (role.id === message.guild.roles.everyone.id) return message.channel.send('Нельзя установить роль **@everyone**, как роль мута.')

            const tags = role.tags
            if (tags) {
                if (tags.botId) return message.channel.send(`Роль **${role.name}** принадлежит боту **${(await xee.client.users.fetch(tags.botId)).tag}**.`)
                if (tags.premiumSubscriberRole) return message.channel.send(`Роль **${role.name}** выдается только бустерам сервера...`)
            }

            if (role.managed) return message.channel.send(`Роль **${role.name}** управляется интеграцией.`)
            if (!role.editable) return message.channel.send(`Роль **${role.name}** выше или на одной позиции со мной.`)
            if (message.member.roles.cache.size !== 1 && role.position >= message.member.roles.highest.position) return message.channel.send('Нужна роль, которая ниже твоей наивысшей...')

            await message.guild.data.update({ $set: { 'utils.muterole': role.id } })
            return message.channel.send(`Теперь роль мута — это ${role}.`)
        }

        let elements = message.guild.data.mutes
        if (!elements.size) return message.channel.send('Никто не заглушен, соответственно, список пуст...')

        let interface = new Pagination(message.author.id)
        Util.splitMessage(elements.map(mute => `**${xee.client.users.cache.get(mute.memberId)?.tag || `<@${mute.memberId}>`}**: снятие через ${xee.constructor.ruMs(mute.remain, true)}`)
            .join('\n'), { char: '\n', maxLength: 1800 })
                .forEach(value => 
                    interface.add({
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({ name: 'Список мутов', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                                .setColor(xee.settings.color)
                                .setDescription(value)
                        ]
                    }))
        return interface.send(message.channel)
    }
}