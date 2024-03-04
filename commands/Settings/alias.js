module.exports = {
    command: {
        usage: '<алиас> [<команда> [аргументы]]',
        description: 'добавит или удалит серверный алиас',
        hidden: true,
        permissions: {
            user: ['MANAGE_MESSAGES']
        }
    }, 
    execute: async function(message, args, options) {
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))
        const aliases = message.guild.data.aliases || []

        const alias = args.shift()

        if (aliases.some(al => al.text === alias)) {
            await message.guild.data.update({ $pull: { aliases: { text: alias } } })
            return message.channel.send(`Алиас \`${alias.slice(0, 100)}\` был удален из списка серверных алиасов.`)
        }

        if (aliases.length >= 50) return message.channel.send('У тебя уже есть 50 алиасов, больше нельзя.')
        if (!args.length) return message.channel.send('А имя команды указать не нужно?')

        const command = xee.commands.resolve(args.shift())?.name
        if (!command) return message.channel.send('Такой команды не существует...')

        const aliasArgs = args.join(' ') || '[args]'

        await message.guild.data.update({
            $push: {
                aliases: {
                    command,
                    text: alias,
                    args: aliasArgs
                }
            }
        })

        return message.channel.send(`Алиас \`${alias.slice(0, 100)}\` для команды \`${options.prefix}${command}\` был создан!`)
    }
}