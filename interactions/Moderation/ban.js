const { isMod, parseDuration } = require('../../client/util')
const { SnowflakeUtil, MessageActionRow, MessageSelectMenu } = require('discord.js')
const Mute = require('../../classes/Mute')

module.exports = {
    aliases: ['Заблокировать'],
    guildOnly: true,
    config: {
        name: 'ban',
        description: 'Банит пользователя на сервере',
        options: [{
            name: 'пользователь',
            description: 'Пользователя, которого нужно забанить',
            required: true,
            type: 6,
        }, {
            name: 'длительность',
            description: 'Длительность бана',
            type: 3
        }, {
            name: 'причина',
            description: 'Причина блокировки. Идет в модеративный лог',
            type: 3
        }]
    },
    async execute(interaction) {
        const reply = str => interaction.reply({ content: str, ephemeral: true })
        if (!interaction.guild.members.me.permissions.has('BAN_MEMBERS')) return reply('Ну вот, облом. У меня нет право на блокировку пользователей.')

        const member = interaction.options.get('пользователь')?.member || interaction.options.get('user')?.member
        if (!member) return reply('Пользователь должен находиться на этом сервере.')

        if (member.id === interaction.user.id) return reply('Зачем ты пытаешься заблокировать самого себя? Дурик...')
        if (member.id === xee.client.user.id) return reply('Не нужно пытаться меня забанить, ведь я не могу этого сделать...')
        if (!isMod(interaction, 'BAN_MEMBERS')) return reply(xee.random([
            '♻️ **{{member}}** был утилизирован пользователем **{{author}}**',
            '🕯️ **{{member}}** был заблокирован пользователем **{{author}}**'
        ]).parse({ author: interaction.user.tag, member: member.user.username }) + ' на этом сервере.')

        if (!member.bannable) return reply(`Моя наивысшая роль ниже, чем наивысшая роль **${member.user.tag}**. Забанить не получится.`)

        if (interaction.user.id !== interaction.guild.ownerId) {
            if (isMod(interaction, 'BAN_MEMBERS', member) && (
                interaction.member.permissions.has('ADMINISTRATOR') ? 
                    member.permissions.has('ADMINISTRATOR')
                : true
            )) return reply(`Вы не можете заблокировать **${member.user.tag}**, так как он имеет права модератора.`)
            if (!(interaction.member.roles.highest.comparePositionTo(member.roles.highest) > 0)) return reply(`Ваша высшая роль должна быть выше, чем у **${member.user.tag}**.`)
        }

        const data = await interaction.guild.getData()
        if (data.toggle?.includes?.('ban')) return reply('Возможность блокировать пользователей на севрере выключена.')

        const bans = await interaction.guild.bans.fetch()
        if (bans && bans.some(x => x.user && x.user.id === member.id)) return reply(`Пользователь **${member.user.tag}** был ранее заблокирован на сервере.`)

        let reason = interaction.options.get('причина')?.value
        const _duration = interaction.options.get('длительность')?.value

        
        const reasons = await xee.db.collection('reasons').find({
            guild: interaction.guild.id,
            type: 'ban'
        }).toArray()

        let duration = parseDuration(_duration) || null

        if (reasons.length) {
            if (!_duration && !reason) {
                await interaction.reply({
                    content: `Так как вы не указали причину блокировки **${member.user.tag}**, вы должны выбрать её из заготовленного списка:`,
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu() 
                                    .setCustomId(interaction.id + '-reason')
                                    .setPlaceholder('Причина заглушения')
                                    .addOptions(
                                        reasons.map(({ reason, time }, index) => ({
                                            description: time ? `Блокировка на ${xee.constructor.ruMs(parseDuration(time))}` : 'Перманентная блокировка',
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
                if (_reason.time) duration = parseDuration(_reason.time)
                reason = _reason.reason
            } else if (reason && !_duration) {
                const _reason = reasons.find(r => r.reason.toLowerCase().includes(reason))
                if (_reason) {
                    if (_reason.time) duration = parseDuration(_reason.time)
                    reason = _reason.reason
                }
            }
        }

        if (duration) {
            if (duration < 1e4) return reply('Минимальное время бана: 10 секунд')
            if (duration > 63115200000) return reply('Максимальное время бана: 2 года')
        }

        await member.ban({
            reason: `${reason?.slice(0, 509 - interaction.user.tag.length) || ''} [${interaction.user.tag}]`
        })

        await (interaction.replied && interaction.editReply || interaction.reply).bind(interaction)({
            content: `Пользователь **${member.user.tag}** был заблокирован на этом сервере${duration ? ` на **${xee.constructor.ruMs(duration)}**` : ''}.\n${reason ? `Причина: \`${reason.slice(0, 600)}\`` : ''}`,
            components: []
        })

        if (duration) {
            const banId = SnowflakeUtil.generate()
            await xee.db.collection('bans').insertOne({ _id: banId, user: member.id, guild: interaction.guild.id, end: Date.now() + duration })
            await xee.rest.kaneki.api.bot.ban.post({ json: { id: banId } })
        }
    
        interaction.guild.data.entries.createCase('ban', member, interaction.member, {
            time: duration,
            reason
        })
    }
}
