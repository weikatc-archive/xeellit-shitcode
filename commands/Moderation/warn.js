const { findMember, isMod, parseDuration } = require('../../client/util')

module.exports = {
    command: {
        description: 'дает варн пользователю',
        usage: '<@юзер> [причина]',
        aliases: ['w'],
        examples: {
            '{{prefix}}warn @Egor#7777': 'дает предупреждение пользователю **Egor**'
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('Не думаю, что ты модератор...')
        if (!args.length) return message.channel.send(xee.commands.help('warn', options.prefix))

        const member = await findMember(message, args[0])
        if (!member) return message.channel.send(`**${message.member.displayName}**, жертва варноприношения не найдена`)

        if (member.id === message.author.id) return message.channel.send('=|')
        if (member.id === message.guild.ownerId) return message.channel.send('Эм... Это же овнер сервера...')

        if (isMod(message, ['KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_MESSAGES'], member) && message.author.id !== message.guild.ownerId) return message.channel.send('Но ведь это модератор. Зачем ты так делаешь? 0_0')
        if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) return message.channel.send('Ты не можешь заварнить того, кто выше или наравне с тобой')

        const warnId = await xee.db.collection('warns').countDocuments({ guild: message.guild.id, user: member.id }).then(res => ++res)
        const formatted = xee.constructor.plural(['предупреждение', 'предупреждения', 'предупреждений'], warnId, true)
        const penalty = message.guild.data.penalty.find(p => p.count === warnId)

        if (message.guild.data.penalty.length) {
            const resetWarns = () => {
                xee.db.collection('warns').deleteMany({ guild: message.guild.id, user: member.id })
                message.channel.send('У участника были очищены все варны, так как больше наказаний нет.')
                delete resetWarns
            }

            const _sorted = message.guild.data.penalty.sort((a, b) => b.count - a.count)
            if (_sorted.at(-1).count <= warnId) setTimeout(resetWarns, 3000)
            delete _sorted
        }

        await Promise.all([
            message.guild.data.entries.createCase('warn', member, message.member, { 
                formattedWarns: formatted,
                reason: args.slice(1).join(' '), 
                penalty: penalty && { time: penalty?.time, type: penalty?.type } || null 
            }),
            xee.db.collection('warns').insertOne({
                user: member.id,
                guild: message.guild.id,
                mod: message.author.id,
                text: args[1] ? args.slice(1).join(' ') : null,
                date: Date.now(),
                penalty
            })
        ])

        if (penalty) {
            message._flags.add('force')
            options.warn = true
            switch(penalty.type) {
                case 'ban':
                    if (message.guild.members.me.permissions.has('BAN_MEMBERS')) return xee.commands.resolve('ban').execute(message, [member.id, penalty.time, `Получено ${warnId} предупреждений`].filter(Boolean), {
                        message: `**${member.user.tag}** получил **${formatted}** и был заблокирован на сервере${penalty.time ? ` на **${xee.constructor.ruMs(parseDuration(penalty.time))}**` : ''}.`,
                        ...options
                    })
                    break
                case 'kick':
                    if (message.guild.members.me.permissions.has('KICK_MEMBERS')) return xee.commands.resolve('kick').execute(message, [member.id, `Получено ${warnId} предупреждений`], {
                        message: `**${member.user.tag}** получил **${formatted}** и был кикнут с сервера.`,
                        ...options
                    })
                    break
                case 'mute':
                    if (message.guild.members.me.permissions.has('MANAGE_ROLES')) return xee.commands.resolve('mute').execute(message, [member.id, penalty.time, `Получено ${warnId} предупреждений`], {
                        message: `**${member.user.tag}** получил **${formatted}** и был заглушен на **${xee.constructor.ruMs(parseDuration(penalty.time))}**.`,
                        ...options
                    })
                    break
            }
        }
        message.channel.send(`**${member.user.tag}** получил предупреждение #${warnId}.${args[1] ? `\nПричина: **${args.slice(1).join(' ').slice(0, 100)}**.` : ''}`)
    }
}
