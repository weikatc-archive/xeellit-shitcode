const { findMember, isMod, parseDuration, selectReason } = require('../../client/util')

const Confirmation = require('../../classes/Confirmation')
const { SnowflakeUtil } = require('discord.js')

module.exports = {
    command: {
        description: 'блокирует пользователя на сервере',
        usage: '<@юзер> [время] [причина]',
        aliases: ['b'],
        flags: ['force'],
        examples: {
            '{{prefix}}ban @JuniperBot': 'заблокирует пользователя **@JuniperBot**',
            '{{prefix}}ban 159985870458322944 10d': 'заблокирует пользователя с ID **159985870458322944** на 10 дней'
        },
        permissions: {
            me: ['BAN_MEMBERS']
        }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send(xee.commands.help('ban', options.prefix))

        const id = args.shift()
        const member = await findMember(message, id) || /^\d{17,19}$/.test(id) && await xee.client.users.fetch(id).catch(() => null)
        const username = member?.tag ?? member?.user?.tag

        if (!member) return message.channel.send(`Нужно указать пользователя, которого нужно забанить.`)
        if (member.id === message.author.id) return message.channel.send('Зачем ты пытаешься заблокировать самого себя? Дурик...')
        if (member.id === xee.client.user.id) return message.channel.send('Не нужно пытаться меня забанить, ведь я не могу этого сделать...')
        if (!isMod(message, 'BAN_MEMBERS')) return message.channel.send(xee.random([
            '♻️ **{{member}}** был утилизирован пользователем **{{author}}**',
            '🕯️ **{{member}}** был заблокирован пользователем **{{author}}**'
        ]).parse({ author: message.author.tag, member: username }) + ' на этом сервере.')

        if (member.guild) {
            if (!member.bannable) return message.channel.send(`Моя наивысшая роль ниже, чем наивысшая роль **${member.user.tag}**. Забанить не получится.`)
            if (!options.warn && message.author.id !== message.guild.ownerId) {
                if (isMod(message, 'BAN_MEMBERS', member) && (
                    message.member.permissions.has('ADMINISTRATOR') ? 
                        member.permissions.has('ADMINISTRATOR')
                    : true
                )) return message.channel.send(`Вы не можете заблокировать **${member.user.tag}**, так как он имеет права модератора.`)
                if (!(message.member.roles.highest.comparePositionTo(member.roles.highest) > 0)) return message.channel.send(`Ваша высшая роль должна быть выше, чем у **${member.user.tag}**.`)
            }
        }

        const bans = await message.guild.bans.fetch()
        if (bans && bans.some(x => x.user && x.user.id === member.id)) return message.channel.send(`Пользователь **${username}** был ранее заблокирован на сервере.`)

        if (!args.length && !message._flags.has('force')) {
            const reasons = await xee.db.collection('reasons').find({ guild: message.guild.id, type: 'ban' }).toArray()
            if (reasons?.length) {
                const reason = reasons[
                    await selectReason('ban', message, {
                        content: `Так как вы не указали причину блокировки **${username}**, вы должны выбрать её из заготовленного списка:`,
                        placeholder: 'Причина блокировки',
                        user: message.author.id,
                        menuOptions: reasons.map(({ reason, time }, index) => ({
                            description: time ? `Блокировка на ${xee.constructor.ruMs(parseDuration(time))}` : 'Перманентная блокировка',
                            label: reason,
                            value: index.toString()
                        }))
                    })
                ]

                if (!reason) return
                message._flags.add('force')
                args = [ reason.time, reason.reason ].filter(c => c !== undefined)
            }
        }

        const banTime = parseDuration(args[0])
        if (banTime) {
            args.shift()
            if (banTime < 1e4) return message.channel.send('Минимальное время бана: 10 секунд')
            if (banTime > 63115200000) return message.channel.send('Максимальное время бана: 2 года')
        }

        const reason = args.join(' ')
        const banOptions = { reason: `${reason?.slice(0, 509 - message.author.tag.length)} [${message.author.tag}]`, days: message._flags.has('messages') ? 7 : 0 }
        if (!options.message) options.message = `Пользователь **${member.user?.tag || member.tag}** был заблокирован на этом сервере${banTime ? ` на **${xee.constructor.ruMs(banTime)}**` : ''}.\n${reason ? `Причина: \`${reason.slice(0, 600)}\`` : ''}`

        const answer = await (
            new Confirmation(message)
                .setContent(`Вы уверены, что хотите заблокировать пользователя **${username}**${banTime ? ` на ${xee.constructor.ruMs(banTime)}` : ''}${args.length ? ` по принине \`${reason.slice(0, 100)}\`` : ''}?`)
                .awaitResponse()
        )

        if (!answer.data) return answer.reply('Ладно, действие отменено.')
        message.guild.members.ban(member.id, banOptions)
            .then(async () => {
                answer.reply(options.message)

                if (banTime) {
                    const banId = SnowflakeUtil.generate()
                    await xee.db.collection('bans').insertOne({ _id: banId, user: member.id, guild: message.guild.id, end: Date.now() + banTime })
                    await xee.rest.kaneki.api.bot.ban.post({ json: { id: banId } })
                }
    
                if (!options.warn) message.guild.data.entries.createCase('ban', member, message.member, {
                    time: banTime,
                    reason
                })
            })
    }
}
