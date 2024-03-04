const { inspect } = require('util')

const { MessageEmbed, Util } = require('discord.js')

const f = require('../../client/fetch')
const util = require('../../client/util')

const Pagination = require('../../classes/Pagination')
const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        ownerOnly: true,
        description: 'не знаю чё писать. ну и ладн',
        aliases: ['eval', 'ebal', 'e', '?'],
        flags: ['async', 'hidden'],
        usage: '[code]',
        examples: {
            '{{prefix}}evaluate xee.client.guilds.cache.size': 'выведет кол-во серверов бота',
            '{{prefix}}evaluate xee.client.users.cache.random().send(inspect(xee.config))': 'сделает взлом жопы'
        }
    },
    execute: async function (message, args, options) {
        if (!args[0]) return message.channel.send(`Думаю, нужно указать код. Ладно, зря думаю. ${message.channel.permissionsFor(message.guild.me).has('USE_EXTERNAL_EMOJIS') ? '<:plak:739474937282297928>' : ':sob:'}`)
        const code = args.join(' ').replace(/```(js)?/g, '')

        try {
            with (Object.fromEntries(['author', 'guild', 'member', 'channel'].map(e => [ e, message[e] ]))) {
                const evaled = await (message._flags.has('cluster') ? xee.cluster.eval(code) : eval(message._flags.has('async') ? `(async () => {\n${code}\n})()` : code))
                if (message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'])) xee.react(message, xee.config.emojis.yes)
                if (evaled === undefined) return

                const output = inspect(evaled, { depth: 0, maxArrayLength: 30, showHidden: message._flags.has('hidden') })
                    .replace(/`|@/g, m => `${m}${String.fromCharCode(8203)}`).replace(new RegExp(`${xee.config.botToken}|${xee.config.userToken}|${xee.config.webhook}`, 'g'), `[Core]`)

                if (output.length < 1900) return message.channel.send(`\`\`\`json\n${output}\n\`\`\``)

                let interface = new Pagination(message.author.id)
                Util.splitMessage(output, { char: output.includes('\n') ? '\n' : '', maxLength: 1915 })
                    .forEach((value, index, array) => interface.add(`\`\`\`js\n${value}\n\`\`\`${index + 1} / ${array.length}`))
                return interface.send(message.channel)
            }
        } catch (error) {
            if (message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS'])) xee.react(message, xee.config.emojis.no)
            return message.channel.send(`\`\`\`\n${error}\n\`\`\``)
        }
    }
}
