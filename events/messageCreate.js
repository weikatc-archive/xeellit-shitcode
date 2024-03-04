module.exports = {
    async execute(message) {
        if (!message.content.length) return
        if (message.author.bot) return

        if ('viewable' in message.channel && !message.channel.viewable || 
            !message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')
        ) return

        const guildData = await message.guild.getData()

        if (guildData.logs && xee.redis?.ready) xee.redis.setex(message.id, xee.config.messageCacheLifetime, JSON.stringify({u: message.author.id, c: message.content }))
        if (new RegExp(`^<@!?${xee.client.user.id}>`).test(message.content)) return message.channel.send(`Мой префикс на сервере: \`${guildData.prefixes[0].name}\``)

        const parsedCommand = this.parseCommand(message, guildData)
        if (!parsedCommand) return

        const { command, commandName, args, prefix } = parsedCommand

        const [ botMissing, userMissing ] = [
            message.channel.permissionsFor(message.guild.me).missing(command.permissions?.me),
            message.channel.permissionsFor(message.member).missing(command.permissions?.user)
        ]

        if (command.ownerOnly && !xee.settings.owners.includes(message.author.id)) return
        if (botMissing.length) return message.channel.send(`Для выполнения этой команды мне не хватает следующих прав: ${xee.constructor.formatPermissions(botMissing, true).map(p => `\`${p}\``).join(', ').toLowerCase()}`)
        if (userMissing.length) return message.channel.send(`Чтобы выполнить эту команду, нужно иметь следующие права: ${xee.constructor.formatPermissions(userMissing, true).map(p => `\`${p}\``).join(', ').toLowerCase()}`)

        if (command.combine && command.aliases.includes(commandName)) args.unshift(commandName)
        if (guildData.toggle?.includes(command.name) && !message.channel.permissionsFor(message.member).has('MANAGE_MESSAGES')) return
        if (!xee.settings.owners.includes(message.author.id) && this.checkCooldown(command, message.author.id)) 
            return message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY']) && xee.react(message, '⏲️')

        const flags = new Set()
        if (command.name !== 'shell') {
            args.filter(a => a.startsWith('--') && a.length !== 2).map(f => flags.add(f.substr(2)) && xee.remove(args, f))
        }

        message._flags = flags
        let subExecute

        console.log(`${message.author.tag} использовал команду ${prefix.name + command.name} на сервере ${message.guild.name}`)

        if (command.subcommands?.length && args.length) {
            const subcommand = args.shift().toLowerCase()
            const _subExecute = command.subcommands.find(c => c === subcommand || Array.isArray(c) && c.includes(subcommand))
            if (_subExecute?.length) subExecute = command[Array.isArray(_subExecute) ? _subExecute[0] : _subExecute]
            else args.unshift(subcommand)
        } 

        command.uses++
        return (subExecute || command.execute).bind(command)(
            message, 
            args, 
            {
                usage: commandName.toLowerCase(),
                prefix: prefix.name
            }
        )
    },

    checkCooldown(command, id) {
        if (!command.cooldown) return false
        if (command.cooldowns?.has(id)) return true
        if (!command.cooldowns) command.cooldowns = new Set
        command.cooldowns.add(id)
        setTimeout(() => command.cooldowns.delete(id), command.cooldown)
        return false
    },

    parseCommand(message, guildData) {
        const prefixes = guildData.prefixes

        if (guildData.aliases?.length) {
            const alias = this.parseAlias(message, guildData)
            if (alias) return alias
        }

        for (const prefix of prefixes) {
            if (!message.content.toLowerCase().startsWith(prefix.name)) continue

            let [commandName, ...args] = message.content.slice(prefix.name.length).trim().split(/ +/g)
            const command = xee.commands.resolve(commandName)

            
            if (!command) return null
            if (!command.jsonArgs) args = [...args.join(' ').matchAll(/"(.*?)(?<!\\)"|[^ ]+/g)].map(c => c.pop() || c.shift())

            return {
                commandName,
                command,
                prefix,
                args
            }
        }
    },

    parseAlias(message, guildData) {
        for (const alias of guildData.aliases) {
            const regexp = this.aliasToRegexp(alias.text, guildData.prefixes)
            const match = message.content.match(regexp)

            if (!match) continue
            if (!match[0].endsWith(' ') && message.content.length !== match[0].length) continue
            
            command = xee.commands.resolve(alias.command)

            const aliasArgs = alias.args.includes('[args]') ? alias.args : alias.args + ' [args]'
            args = aliasArgs.replace('[args]', message.content.slice(match[1].length)).trim().split(/ +/g)

            return {
                prefix: { name: match.at(-1) || '' },
                commandName: alias.command,
                command,
                args: args.filter(Boolean)
            }
        }
    },

    aliasToRegexp(txt, prefixes) {
        return new RegExp(('^(' +
            txt
                .toLowerCase()
                .replace(/(\\|\^|\$|\.|\?|\*|\+|\(|\)|\|)/g, '\\$&')
                .replace(/\[p\]/g, `(${prefixes.map(p => p.name.replace(/(\[|\\|\^|\$|\.|\?|\*|\+|\(|\)|\|)/g, '\\$&')).join('|')})`)
            + ')'
            + '\\s?'
        ))
    }
}
