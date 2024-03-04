const { isMod } = require('../../client/util')
const finder = require('../../client/finder')

module.exports = {
    command: {
        description: 'разблокирует пользователя на сервере',
        usage: '<@юзер> [причина]',
        aliases: ['ub'],
        examples: {
            '{{prefix}}unban 745878483288457326': 'разблокирует **Kazuma Sato** на сервере'
        },
        permissions: {
            me: ['BAN_MEMBERS']
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'BAN_MEMBERS')) return message.channel.send('Я дико извиняюсь, но у тебя нет прав для использования этой команды')

        if (!args.length) return message.channel.send(xee.commands.help('unban', options.prefix))

        let member = /\d{17,19}/.test(args[0]) ? await xee.client.users.fetch(args[0].match(/\d{17,19}/)[0]).catch(() => 'invalid') : null
        if (member === 'invalid') return message.channel.send('Если пользователя засосало в черную дыру, то, я уже ничем помочь не смогу')

        const bans = await message.guild.bans.fetch()
        if (!member) {
            member = finder.findOne(bans, ['user.username', 'user.tag', 'reason'], args[0])
            if (!member) return message.channel.send('Может ты мне дашь его ID...?')
        }

        if (member.id) member = bans.get(member.id)
        if (!member) return message.channel.send('Он же не в бане, иль я глюкаю...')
        return message.guild.members.unban(member.user.id, `${args.slice(1).join(' ')} [${message.author.tag}]`)
            .then(() => message.guild.data.entries.createCase('unban', member, message.member, { reason: args.slice(1).join(' ') }) &&
                        message.channel.send(`**${member.user.tag}**, что был забанен${member.reason ? ` по причине **${member.reason.trim()}**` : ''} был разбанен`))
            .catch(() => message.channel.send('Разбанить этого человека у меня не получилось =\('))
    }
}