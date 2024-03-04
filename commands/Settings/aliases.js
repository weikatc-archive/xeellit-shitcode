const { splitMessage } = require('../../client/util')

module.exports = {
    command: {
        usage: '',
        description: 'отправит список серверных алиасов',
        hidden: true,
    }, 
    execute: async function(message) {
        if (!message.guild.data.aliases?.length) return message.channel.send('Алиасов на сервере нет.')
        return splitMessage( message.channel, message.guild.data.aliases.map(alias => `**${alias.text}**:\n\`\`\`\n${alias.args.slice(0, 1500)}\n\`\`\``).join('\n'), {
            split: '\n'
        })
    }
}