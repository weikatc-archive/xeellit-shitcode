const { findMember, parseDuration: parse, isMod, selectReason } = require('../../client/util')
const { SnowflakeUtil } = require('discord.js')
const Mute = require('../../classes/Mute')

module.exports = {
    command: {
        description: 'заглушает пользователя на время в текстовых чатах',
        fullDescription: 'Чтобы при муте изымались все роли участника, пропишите `{{prefix}}mutes roles`',
        usage: '<@юзер> [время]',
        aliases: ['m'],
        examples: {
            '{{prefix}}mute @Tatsumaki 1h': 'заглушит **@Tatsumaki** на 1 час'
        },
        permissions: {
            me: ['MANAGE_ROLES']
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('Интересно, чем ты думал, когда использовал эту команду. Так вот, подумаю за тебя. У тебя нет прав')
        if (!args.length) return message.channel.send(xee.commands.help('mute', options.prefix))

        const member = await findMember(message, args.shift())
        if (!member) return message.channel.send(`По моему, ты не правильно указал пользователя`)

        if (member.user.id === message.author.id) return message.channel.send('Зачем же ты пытаешься замутить самого себя?')
        if (member.user.id === xee.client.user.id) return message.channel.send('Почему ты пытаешься меня замутить? 😨')

        if (!options.warn && message.author.id !== message.guild.ownerId) {
            if (isMod(message, 'MANAGE_MESSAGES', member)) return message.channel.send(`**${member.user.tag}** модератор, вы не можете заглушать своих коллег.`)
            if (!(message.member.roles.highest.comparePositionTo(member.roles.highest) > 0)) return message.channel.send(`Ваша высшая роль должна быть выше, чем у **${member.user.tag}**.`)
        }

        if (!message.guild.data.muteRole) return message.channel.send(`Роли для заглушенных не наблюдается. Чтобы назначить роль загрушения: используйте \`${options.prefix}mutes <@роль>\``)
        if (!message.guild.data.muteRole.editable) return message.channel.send('Роль для заглушений находится выше или на одной высоте со мной. Прикольно!')

        if (!args.length) {
            const reasons = await xee.db.collection('reasons').find({ guild: message.guild.id, type: 'mute' }).toArray()
            if (reasons?.length) {
                const reason = reasons[
                    await selectReason('mute', message, {
                        content: `Так как вы не указали причину заглушения **${member.user.tag}**, вы должны выбрать её из заготовленного списка:`,
                        placeholder: 'Причина заглушения',
                        user: message.author.id,
                        menuOptions: reasons.map(({ reason, time }, index) => ({
                            description: `Заглушение на ${xee.constructor.ruMs(parse(time))}`,
                            value: index.toString(),
                            label: reason
                        }))
                    })
                ]

                if (!reason) return
                message._flags.add('force')
                args = [ reason.time, reason.reason ].filter(c => c !== undefined)
            } else args = ['2y']
        }

        let _muteTime = args.shift()
        let muteTime = (+_muteTime * 1000) || parse(_muteTime?.toLowerCase())

        if (!muteTime) {
            muteTime = 63115200000
            args.unshift(_muteTime)
        }

        if (muteTime < 0) return message.channel.send('Что ты пытаешься сделать?')
        if (muteTime > 63115200000) return message.channel.send('Максимальное время заглушения: 2 года')

        const auditReason = `заглушение на ${xee.constructor.ruMs(muteTime)} [${message.author.tag}]`
        const mute = message.guild.data.mutes.find(mute => mute.memberId === member.id)
        const roles = []

        if (message.guild.data.autoHardMute) {
            for (const role of member.roles.cache.values()) {
                if (role.editable && ![
                    message.guild.id,
                    message.guild.data.muteRole.id
                ].includes(role.id)) roles.push(role.id)
            }
        }

        if (mute) {
            await mute.purge()
            mute.clearTimeout()
            _muteTime = muteTime
            muteTime += mute.time - Date.now()
        } else await Promise.all([
            roles.length && member.roles.remove(roles).catch(() => {}),
            member.roles.add(message.guild.data.muteRole, auditReason),
        ].filter(Boolean))


        const data = new Mute(message.guild, {
            member: member.id,
            time: Date.now() + muteTime,
            id: SnowflakeUtil.generate(),
            roles: mute ? mute.roles : roles,
            reason: args.join(' ') || null,
        })

        await data.save()
        data.setTimeout()

        if (!options.message) {
            options.message = (
                mute ? 
                `У участника **${member.user.tag}** был продлён мут на **${xee.constructor.ruMs(_muteTime)}**.` : 
                `Участник сервера **${member.user.tag}** получил мут на **${xee.constructor.ruMs(muteTime)}**`
            ) + `${data.reason ? `\nПричина: \`${data.reason.slice(0, 600)}\`` : ''}`
        }

        if (!options.warn) {
            message.guild.data.entries.createCase(mute ? 'muteTime' : 'mute', member, message.member, {
                reason: data.reason, time: mute && _muteTime || muteTime
            })
        }
        
        return message.channel.send(options.message)
    }
}
