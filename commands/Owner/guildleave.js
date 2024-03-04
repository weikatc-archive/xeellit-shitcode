const { findByName } = require('../../client/finder')

const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        ownerOnly: true,
        description: 'выйти с сервера',
        usage: '[имя или id сервера]',
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.reply('Эм. А ID забыл указать, чудик')
        let id = args[0].match(/\d{17,19}/)?.[0]

        if (id) {
            id = await xee.client.api.guilds(id).get()
                .catch(() => null)
                .then(x => x.id)
        }

        if (!id) {
            const finded = findByName(xee.client.guilds.cache, args.join(' '))
            id = finded?.id
        }

        if (!id) return message.reply('Что-то я ничего не нашел...')
        const guild = await xee.client.api.guilds(id).get()

        const answer = await (
            new Confirmation(message)
                .setContent(`Ты точно хочешь, чтобы я вышел с сервера **${guild.name}** (${guild.id})?`)
                .awaitResponse(true)
        )

        if (answer === false) return message.reply('Хорошо, я останусь на сервере')
        return xee.client.api.users('@me').guilds(id).delete()
            .then(() => id !== message.guild.id && message.channel.send(`Хорошо, я вышел с сервера **${guild.name}** (${guild.id})`)
            .catch(() => message.channel.send('Что-то пошло не так...')))
    }
}
