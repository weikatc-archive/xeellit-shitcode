const { findMember, isMod } = require('../../client/util')

module.exports = {
    command: {
        description: 'закрывает или открывает канал',
        usage: '[@юзер]',
        aliases: ['lock'],
        examples: {
            '{{prefix}}lockdown': 'закроет или откроет данный канал для роли everyone',
            '{{prefix}}lockdown 546255966723637268': 'закроет или откроет канал для пользователя 546255966723637268'
        },
        permissions: {
            me: ['MANAGE_CHANNELS', 'MANAGE_ROLES']
        }
    },
    execute: async function (message, args) {
        if (!isMod(message, 'MANAGE_CHANNELS')) return message.channel.send('Тебе нужно право на Управление каналом. К сожалению или к счастью, его у тебя нет')

        const permissions = message.channel.permissionOverwrites

        if (!args.length) {
            let type = 'allow'
            let everyone = permissions.cache.get(message.guild.roles.everyone.id)
            if (!everyone || everyone.allow.has('VIEW_CHANNEL')) type = 'deny'
            if (everyone?.allow?.has('ADMINISTRATOR')) return message.channel.send('Не думал, что здесь все админы...')
            if (message.guild.members.me.roles.highest.id === message.guild.roles.everyone.id) return message.channel.send('Я нахожусь наравне со всеми (роль everyone — моя высшая)')

            return permissions.upsert(message.guild.roles.everyone, {
                VIEW_CHANNEL: type === 'allow'
            }, `${type === 'allow' ? 'открытие канала' : 'закрытие канала'} пользователем ${message.author.tag}`)
                .catch(() => message.channel.send('К сожалению, закрыть этот канал я не могу...'))
                .then(() => message.channel.send(`Я ${type === 'allow' ? 'открыл' : 'закрыл'} этот канал для роли **@everyone**.`))
        }
        const member = await findMember(message, args.join(' '))
        if (!member) return message.channel.send(`Не знаю что ты хотел сделать, но юзера с именем **${args.join(' ').slice(0, 100)}** нет`)
        if (member.id === message.author.id) return message.channel.send('Ты что делаешь? Зачем ты пытаешься закрыть канал для себя?')
        if (member.id === message.guild.ownerId) return message.channel.send('Сейчас бы закрывать каналы для овнера...')
        if (message.channel.permissionsFor(member).has('ADMINISTRATOR')) return message.channel.send('Думал, что не нужно говорить о том, что администраторы могут сидеть хоть где и не смотря на права. Пришлось сказать')
        if (isMod(message, 'MANAGE_CHANNELS', member)) return message.channel.send(`Что тебе сделал **${member.user.tag}**, что ты его так ненавидишь?`)
        if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) return message.channel.send(`Я нахожусь ниже пользователя **${member.user.username}** по ролям. Прости, ничего не могу поделать`)

        let type = 'allow'
        if (message.channel.permissionsFor(member).has('VIEW_CHANNEL')) type = 'deny'

        return permissions.upsert(member, {
            VIEW_CHANNEL: type === 'allow'
        }, `${type === 'allow' ? 'открытие канала' : 'закрытие канала'} для пользователя ${member.user.tag} пользователем ${message.author.tag}`)
            .catch(() => message.channel.send('К сожалению, закрыть этот канал я не могу...'))
            .then(() => message.channel.send(`Я ${type === 'allow' ? 'открыл' : 'закрыл'} этот канал для пользователя **${member.user.tag}**`))
    }
}
