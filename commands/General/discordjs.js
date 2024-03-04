const { MessageEmbed } = require('discord.js')
const fetch = require('../../client/fetch')
module.exports = {
    command: {
        aliases: ['djs'],
        description: 'поиск по документации disocrdjs',
        usage: '[stable | master | v12 | v11] <что искать>',
        examples: {
            '{{prefix}}discordjs Message': 'найдет класс Message в документации Discord.js'
        },
        hidden: true,
        permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send('Куда...?')

        let version = 'v12'
        if (['stable', 'v12', 'v11', 'master'].includes(args[0].toLowerCase())) 
            version = args.shift().toLowerCase()

        try {
            let data = await fetch(`https://djsdocs.sorta.moe/v2/embed`, { query: {
                src: `https://raw.githubusercontent.com/discordjs/discord.js/docs/${version}.json`,
                q: args.join(' ')
            } })
            let embed = new MessageEmbed().setThumbnail('https://discord.js.org/static/logo-square.png').setColor(xee.settings.color)
            if (!data) return message.channel.send('Ничё не нашел')
            if (data.fields) {
                embed.addFields(data.fields).setDescription(data.description)
            } else {
                if (data.title === 'Search results:') {
                    embed.setFooter('Результаты поиска').setDescription(data.description)
                }
            }
            message.channel.send({ embeds: [embed] })
        } catch (error) {
            return message.channel.send('Произошла ошибка. =/')
        }
    }
}