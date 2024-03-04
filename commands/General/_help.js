const { firstUpper } = require('../../client/util')

module.exports = {
    command: {
        description: 'справка по моим командам',
        usage: '[команда]',
        hidden: true,
        examples: {
            '{{prefix}}help': 'покажет список доступных команд',
            '{{prefix}}help interserver': 'покажет информацию о команде interserver'
        }
    },
    execute: async function (message, args, options) {
        if (!args.length) {
            let content = `\`\`\`markdown\n> Список доступных команд\`\`\`\nИспользуйте \`${options.prefix}help <команда>\`​, чтобы получить справку об определённой команде\n\n`
            let modules = xee.commands.modules.filter(x => !['nsfw', 'owner', 'economy'].includes(x))
            if (message.channel.nsfw) modules.push('nsfw')
            if (xee.settings.owners.includes(message.author.id)) modules.push('owner')

            modules.sort().map(m => content += this.formatModule(m, message, options.prefix))
            return message.channel.send(content)

        } else {
            const command = xee.commands.resolve(args[0].toLowerCase())
            if (!command) return message.channel.send(`Команды \`${options.prefix}${args[0].toLowerCase()}\` в боте нет...`)
            if (command.ownerOnly && !xee.settings.owners.includes(message.author.id)) return message.channel.send(`Команды \`${options.prefix}${args[0].toLowerCase()}\` в боте нет...`)
            if (message.guild.data.toggle?.includes(command.name)) return message.channel.send(`Команда \`${command.name}\` на этом сервере отключена`)
            return message.channel.send(xee.commands.help(command, options.prefix))
        }
    },
    permLevel: function (command, message) {
        if (!command.permissions) return ''
        if (command.permissions?.user &&
            !message.channel.permissionsFor(message.member).has(command.permissions?.user)) return '~~'
        if (command.permissions?.me &&
            !message.channel.permissionsFor(message.guild.me).has(command.permissions?.me)) return '~~'
        return ''
    },
    formatModule: function (module, message, prefix) {
        if (xee.commands.has(module)) module = xee.commands.get(module)
        if (typeof module === 'object') {
            const permLevel = this.permLevel(module, message)
            return `**${firstUpper(module.name)}**: ${module.aliases.length < 12 ? 
                module.aliases.map(a => `${permLevel}\`${a}\`${permLevel}`).join(', ') :
                `${permLevel}используй \`${prefix}help ${module.name}\`${permLevel}, для получения списка команд`}\n`
        } else {
            const commands = xee.commands.filter(c => c.group === module && !c.hidden && !c.combine && !message.guild.data.toggle?.includes(c.name))
            if (!commands.size) return ''
            return `**${firstUpper(module)}**: ${commands.map(c => {
                const permLevel = this.permLevel(c, message)
                if (permLevel === null) return null
                else return `${permLevel}\`${c.name}\`${permLevel}`
            }).filter(Boolean).join(', ')}\n`
        }
    }
}