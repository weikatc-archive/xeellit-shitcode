const Events = require('../../classes/Events')

module.exports = {
    command: {
        ownerOnly: true,
        description: 'перезагрузка бота',
        aliases: ['rl'],
        usage: '[commands | events | имя команды]',
        examples: {
            '{{prefix}}reload': 'перезагрузит ядро бота',
            '{{prefix}}reload events': 'перезагрузит все ивенты',
            '{{prefix}}reload commands': 'перезагрузит все команды',
            '{{prefix}}reload help': 'перезагрузит команду help',
            '{{prefix}}reload core': 'перезагрузит все команды, которые находятся в модуле "core"'
        }
    },
    execute: async function (message, args, options) {
        const send = content => message.channel.send(`${content || ''} \`🔁\``).then(message => setTimeout(() => message.delete(), 2000))
        if (!args.length) {
            await send('Перезагружаю ядро...')
            Object.keys(require.cache).forEach(module => delete require.cache[module])
            xee.client.destroy() delete xee
            xee = null
            return require('../../boi')
        }

        if (args[0].toLowerCase() === 'commands') {
            xee.commands.clear()
            xee.commands.loadCommands()
            return send(`Команды перезагружаются...`)
        } else if (args[0].toLowerCase() === 'events') {
            xee.client.removeAllListeners()
            new Events('./events/').loadFolder()
            return send(`Ивенты перезагружаются...`)
        }

        const command = xee.commands.resolve(args[0].toLowerCase())
        let isModule = false

        if (!command) {
            if (!xee.commands.modules.includes(args[0].toLowerCase())) return message.channel.send(`Команды или модуля с именем \`${args[0]}\` не существует`)
            isModule = true
            xee.commands.filter(c => c.group === args[0].toLowerCase()).map(c => xee.commands.reload(c.name))
        } else xee.commands.reload(command.name)
        return send(`${isModule ? 'Модуль' : 'Команда'} \`${command?.name || args[0].toLowerCase()}\` ${isModule ? 'перезагружен' : 'перезагружена'}`)
    }
}