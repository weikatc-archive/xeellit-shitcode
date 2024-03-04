const { isMod, parseDuration } = require('../../client/util')
const { SnowflakeUtil, MessageActionRow, MessageSelectMenu } = require('discord.js')
const Mute = require('../../classes/Mute')

module.exports = {
    aliases: ['Заглушить'],
    guildOnly: true,
    config: {
        name: 'mute',
        description: 'Заглушает пользователя в текстовых каналах',
        options: [{
            name: 'пользователь',
            description: 'Пользователя, которого нужно заглушить',
            required: true,
            type: 6,
        }, {
            name: 'длительность',
            description: 'Длительность мута',
            type: 3
        }, {
            name: 'причина',
            description: 'Причина блокировки. Идет в модеративный лог',
            type: 3
        }]
    },
    async execute(interaction) {
        const reply = str => interaction.reply({ content: str, ephemeral: true })
        if (!interaction.guild.members.me.permissions.has('MANAGE_ROLES')) return reply('Мне нужно право на управление ролями на сервере...')
        if (!isMod(interaction, 'MANAGE_MESSAGES')) return reply('Интересно, чем ты думал, когда использовал эту команду. Так вот, подумаю за тебя. У тебя нет прав')

        const member = interaction.options.get('пользователь')?.member || interaction.options.get('user')?.member
        if (!member) return reply('Пользователь должен находиться на этом сервере.')

        if (member.id === interaction.user.id) return reply('Зачем же ты пытаешься замутить самого себя?')
        if (member.id === xee.client.user.id) return reply('Почему ты пытаешься меня замутить? 😨')

        if (isMod(interaction, 'MANAGE_MESSAGES', member)) return reply(`**${member.user.tag}** модератор. Вы не можете заглушать своих коллег.`)
        if (!(interaction.member.roles.highest.comparePositionTo(member.roles.highest) > 0)) return reply(`Ваша высшая роль должна быть выше, чем у **${member.user.tag}**.`)

        if (!interaction.guild.data.muteRole) return reply(`Роли для заглушенных не наблюдается. Чтобы назначить роль загрушения: используйте \`${interaction.guild.data.prefixes[0]?.name}mutes <@роль>\``)
        if (!interaction.guild.data.muteRole.editable) return reply('Роль для заглушений находится выше или на одной высоте со мной. Прикольно!')

        const reasons = await xee.db.collection('reasons').find({
            guild: interaction.guild.id,
            type: 'mute'
        }).toArray()

        const _duration = interaction.options.get('длительность')?.value
        let reason = interaction.options.get('причина')?.value

        const mute = interaction.guild.data.mutes.find(mute => mute.memberId === member.id)
        const _remain = mute?.remain
        const roles = []

        let duration = parseDuration(_duration) || 63115200000

        if (reasons.length) {
            if (!_duration && !reason) {
                await interaction.reply({
                    content: `Так как вы не указали причину заглушения **${member.user.tag}**, вы должны выбрать её из заготовленного списка:`,
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu() 
                                    .setCustomId(interaction.id + '-reason')
                                    .setPlaceholder('Причина заглушения')
                                    .addOptions(
                                        reasons.map(({ reason, time }, index) => ({
                                            description: `Заглушение на ${xee.constructor.ruMs(parseDuration(time))}`,
                                            value: index.toString(),
                                            label: reason
                                        }))
                                    )
                            )
                    ]
                })

                const selected = await interaction.channel.awaitMessageComponent({
                    filter: c => c.user.id === interaction.user.id && c.message.interaction.id === interaction.id,
                    idle: 120000
                }).catch(() => null)

                if (!selected) return interaction.deleteReply()
                const _reason = reasons[+selected?.values.shift()]
                duration = parseDuration(_reason.time)
                reason = _reason.reason
            } else if (reason && !_duration) {
                const _reason = reasons.find(r => r.reason.toLowerCase().includes(reason))
                if (_reason) {
                    duration = parseDuration(_reason.time)
                    reason = _reason.reason
                }
            }
        }

        if (_remain) duration += _remain
        if (duration > 63115200000) return reply('Время заглушение должно быть меньше, чем 2 года.')
        if (duration < 10000) return reply('Минимальное время заглушения — 10 секунд. Держу в курсе.')

        if (mute) {
            await mute.purge()
            mute.clearTimeout()
        } else await Promise.all([
            roles.length && member.roles.remove(roles),
            member.roles.add(
                interaction.guild.data.muteRole,
                `заглушение на ${xee.constructor.ruMs(duration)} [${interaction.user.tag}]`
            ),
        ].filter(Boolean))

        if (interaction.guild.data.autoHardMute) {
            for (const role of [...member.roles.cache.values()]) {
                if (role.editable && ![
                    interaction.guild.roles.everyone.id,
                    interaction.guild.data.muteRole.id
                ].includes(role.id)) roles.push(role.id)
            }
        }

        const data = new Mute(interaction.guild, {
            member: member.id,
            time: Date.now() + duration,
            id: SnowflakeUtil.generate(),
            roles: mute ? mute.roles : roles,
            reason: reason || null,
        })

        await data.save()
        data.setTimeout()

        interaction.guild.data.entries.createCase(mute ? 'muteTime' : 'mute', member, interaction.member, {
            reason: data.reason, time: mute && _remain || duration
        })

        (interaction.replied && interaction.editReply || interaction.reply).bind(interaction)({
            content: (mute ? 
                `У участника **${member.user.tag}** был продлён мут на **${xee.constructor.ruMs(duration - _remain)}**.` : 
                `Участник сервера **${member.user.tag}** получил мут на **${xee.constructor.ruMs(duration)}**`
            ) + `${data.reason ? `\nПричина: \`${data.reason.slice(0, 600)}\`` : ''}`,
            components: []
        })
    }
}