const { MessageEmbed } = require('discord.js')
const { firstUpper } = require('../../client/util')

module.exports = {
    command: {
        description: 'покажет настройки сервера',
        usage: '',
        examples: { '{{prefix}}config': 'покажет текущие настройки сервера' },
        permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function (message, args, options) {
        with (message.guild) {
            await data.fetch()

            const toggled = data.toggle?.filter(c => xee.commands.has(c)) || []
            const prefixes = data.prefixes.map(p => p.name)

            const autoRole = roles.cache.get(data.autoRole)
            const modRole = roles.cache.get(data.modRole)
            const muteRole = roles.cache.get(data.utils.muterole)

            const log = data.logsChannel
            const modlog = channels.cache.get(data.modLogs)
            const reports = channels.cache.get(data.reports?.channel)
            const welcome = channels.cache.get(data.welcome?.channel)
            const goodbye = channels.cache.get(data.goodbye?.channel)
            const starboard = channels.cache.get(data.starboard?.channel)
            const level = channels.cache.get(data.levels?.message?.channel)

            const interservers = channels.cache.filter(channel => xee.store.interservers.some(i => i.webhooks.some(w => w.channel === channel.id)) && channel.permissionsFor(message.member).has('VIEW_CHANNEL'))

            const rooms = data.rooms.filter(x => channels.cache.has(x.channel))
            const autoReact = data.utils.autoreact.filter(x => channels.cache.has(x.channel) && x.emojis.filter(x => !x.id ? true : xee.client.emojis.cache.has(x.id)).length !== 0)
            const reactRoles = data.reactroles.filter(r => channels.cache.has(r.channel) && roles.cache.has(r.role))

            const embed = new MessageEmbed()
                .setColor(xee.settings.color)
                .setAuthor({ name: 'Настройки сервера', iconURL: iconURL({ size: 2048, dynamic: true }) })
                .setDescription(
                    `Префиксы на сервере: ${new Intl.ListFormat('ru').format(prefixes.map(p => `\`${p}\``))}\n` + 
                    `Отключенные команды: ${toggled.length ? new Intl.ListFormat('ru').format(toggled.map(c => `\`${c}\``)) : `нет (\`${options.prefix}toggle\`)`}\n` + 
                    `>>> \`${xee.constructor.plural(['создатель комнат', 'создателя комнат', 'создателей комнат'], rooms.length, true)}\`.\n` + 
                    `\`${xee.constructor.plural(['автореакт', 'автореакта', 'автореактаров'], autoReact.length, true)}\`.\n` +
                    `\`${xee.constructor.plural(['роль за реакцию', 'роли за реакции', 'ролей за реакцию'], reactRoles.size, true)}\`.`
                )
                .addField('Уровни', `${data.levels ? `Сообщение о повышении уровня: ${level ?? `\`${options.prefix}levels message\``}\nЗадержка начисления опыта в ТК: \`${xee.constructor.ruMs(data.levels?.cooldown || 6e4)}\`\n` : ''}Подробнее: \`${options.prefix}${data.levels ? '' : 'help '}levels\``)
                .addField('Каналы', `Приветствие: ${welcome ?? `\`${options.prefix}welcome\``}\nПрощание: ${goodbye ?? `\`${options.prefix}goodbye\``}\nЗвездная Доска: ${starboard ?? `\`${options.prefix}starboard\``}`, true)
                .addField('\u200b', `Логи: ${log ?? `\`${options.prefix}logger\``}\nМод-лог: ${modlog ?? `\`${options.prefix}modlogger\``}\nРепорты: ${reports ?? `\`${options.prefix}reports\``}`, true)
                .addField('Роли', `Авто-роль: ${autoRole ?? `\`${options.prefix}autorole\``}\nМод-Роль: ${modRole ?? `\`${options.prefix}modrole\``}\nМут-роль: ${muteRole ?? `\`${options.prefix}mutes\``}`)
                .setFooter(name)
            
            if (interservers.size) embed.addField('Межсерверные чаты', interservers.map(i => `${firstUpper(xee.store.interservers.find(ii => ii.webhooks.some(d => d.channel === i.id)).name)} в ${i}`).join('\n'))

            const permissions = message.channel.permissionsFor(message.guild.me).missing(xee.commands.filter(c => c.permissions?.me).map(c => c.permissions.me).flat().filter((p, i, s) => s.indexOf(p) === i))
            if (permissions.length) embed.addField('Недостающие права', permissions.map(p => `> ${xee.constructor.formatPermissions(p)}`).join('\n'))

            return message.channel.send({ embeds: [embed] })
        }
    }
}
