const { firstUpper, splitMessage } = require('../../client/util')
const { MessageEmbed } = require('discord.js')

const _modules = {
    settings: 'настройки',
    filter: 'фильтры',
    fun: 'развлечения',
    moderation: 'модерация',
    nsfw: 'NSFW',
    owner: 'разработка',
    general: 'основное',
    reactions: 'реакции'
}

module.exports = {
    command: {
        description: 'справка по моим командам',
        usage: '[команда]',
        aliases: ['h'],
        examples: {
            '{{prefix}}help': 'покажет список доступных команд',
            '{{prefix}}help interserver': 'покажет информацию о команде interserver'
        }
    },
    execute: async function (message, args, options) {
        if (!message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS') || args.length) return xee.commands.resolve('_help').execute(message, args, options)

        const modules = xee.commands.modules.filter(x => !['nsfw', 'owner'].includes(x))
        if (message.channel.nsfw) modules.push('nsfw')
        if (xee.settings.owners.includes(message.author.id)) modules.push('owner')

        const embed = new MessageEmbed()
            .setColor(xee.settings.color)
            .setTitle('Список команд')
            .setDescription(`Используй \`${options.prefix}help <команда>\`​, чтобы получить справку об определённой команде.`)
            .setThumbnail(xee.client.user.displayAvatarURL())

        modules.forEach(module => {
            const moduleCommands = xee.commands.get(module) || xee.commands.filter(c => c.group === module && !c.combine && !c.hidden && !message.guild.data.toggle?.includes(c.name))

            if (moduleCommands.name) {
                if (message.guild.data.toggle?.includes(moduleCommands.name)) return
                if (moduleCommands.hidden) return

                const subcommands = moduleCommands.aliases
                const toggle = message.channel.permissionsFor(message.guild.me).has(moduleCommands.permissions?.me || []) && message.channel.permissionsFor(message.member).has(moduleCommands.permissions?.user || []) ? '' : '~~'
                return embed.addField(firstUpper(_modules[moduleCommands.name] || moduleCommands.name), subcommands.map(alias => `${toggle}\`${alias}\`${toggle}`).join(', '))
            }

            if (!moduleCommands.size) return
            return embed.addField(firstUpper(_modules[module.toLowerCase()] || module) || '\u200b', moduleCommands.map(command => {
                const toggle = message.channel.permissionsFor(message.guild.me).has(command.permissions?.me || []) && message.channel.permissionsFor(message.member).has(command.permissions?.user || []) ? '' : '~~'
                return `${toggle}\`${command.name}\`${toggle}`
            }).join(', '))
        })

        const embedMessage = await message.channel.send({ embeds: [embed] })
            .catch(() => xee.commands.resolve('_help').execute(message, args, options))

        if (!embedMessage?.embeds?.length) return
        if (!message.channel.permissionsFor(message.guild.me).has(['READ_MESSAGE_HISTORY', 'ADD_REACTIONS'])) return

        const userDm = await message.author.createDM().catch(() => {})
        if (!userDm || await userDm.send({}).catch(e => e.httpStatus) === 403) return

        await xee.react(embedMessage, '❔')
        const res = await embedMessage.awaitReactions({ 
            max: 1, 
            time: 120000,
            user: message.author.id, 
            filter: (react, user) => user.id === message.author.id && react.emoji.name === '❔'
        })

        if (!res.size) return

        return splitMessage(userDm,  modules.filter(x => !xee.commands.has(x)).map(module => {
            return `**${firstUpper(_modules[module] || module)}**:\n${xee.commands
                .filter(c => c.group === module && !c.hidden && !message.guild.data.toggle?.includes(c.name))
                .map(c => `> \`${options.prefix}${c.name}\`: ${firstUpper(c.description)}`).join('\n')}`
        }).join('\n\n'), { char: '\n' })
    }
}
