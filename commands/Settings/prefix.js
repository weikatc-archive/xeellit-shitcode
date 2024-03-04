const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        description: 'настройка префиксов бота',
        usage: '<new-prefix | delete> [prefix]',
        examples: {
            '{{prefix}}prefix': 'покажет все существующие префиксы', 
            '{{prefix}}prefix !': 'добавит префикс `​!`​',
            '{{prefix}}prefix delete x.': 'удалит префикс `​x.`​ из серверных префиксов',
        },
        permissions: {
            me: ['EMBED_LINKS'],
            user: ['MANAGE_MESSAGES', 'MANAGE_GUILD']
        }
    },
    execute: async function (message, args, options) {

        switch (args[0]?.toLowerCase()) {
            case undefined:
                return message.channel.send(
                    `> Префиксы на сервере **${message.guild.name}**:\`\`\`${message.guild.data.prefixes.map(x => `"${x.name}"`).join(', ')}\`\`\``
                )


            case 'delete':
                if (message.guild.data.prefixes.length === 1) return message.channel.send('Эм, ты что удалить пытаешься?\n> Префикс только один')
                if (!args[1]) return message.channel.send('Эм, ты это, кажется, забыл префикс написать')

                const prefix = message.guild.data.prefixes.find(x => x.name.toLowerCase() === args.slice(1).join(' '))
                if (!prefix) return message.channel.send(`По моему, команда \`​${options.prefix}${options.usage}\`​ показывает доступные префиксы. - В чем прикол?\n> Там нету этого префикса, к сожалению.`)

                await message.guild.data.update({ $pull: { prefixes: { name: prefix.name } } })
                return message.channel.send(`Ладно, ты удалил префикс ${prefix.name}, но зачем`)

            default:
                let string = args.join(' ')
                let block = ['\`', '\\']
                if (message.guild.data.prefixes.length > 10) return message.channel.send('Зачем тебе так много префиксов?')
                if (message.mentions.users.size > 0 || block.includes(string)) return message.channel.send(`Ты понимаешь, что префикс не должен быть @​упоминанием и не должен содержать этих символов:\n\`\`\`${block.map(x => `"${x}"`).join(', ')}\`\`\``)

                if (string.length > 6) {
                    const __answer = await (new Confirmation(message).setContent(`Не знаю, знаешь ты или нет, но максимальная длина префикса - это 6 символов.\n> Хочешь обрезанную версию? \`\`\`${string.slice(0, 6)}\`\`\``).awaitResponse())
                    if (__answer.data === false) return __answer.reply('Ну ладно, как хочешь. Моё дело - это предложить')
                    string = string.slice(0, 6)
                }

                if (message.guild.data.prefixes.some(x => x.name.toLowerCase() === string)) return message.channel.send('Такой префикс уже существует. Зачем же ты добавляешь его заного?')

                await message.guild.data.update({ $push: { prefixes: {
                    name: string, 
                    creator: message.author.id
                } } })

                return message.channel.send(`Поздравляю, ты добавил префикс. Теперь ты можешь его использовать, например: \`${string}help\``)

        }
    }
}