const { MessageEmbed } = require('discord.js')
const fetch = require('../../client/fetch')
const uri = 'https://oldeb.nadeko.bot/'

module.exports = {
    command: {
        description: 'отправить сообщение от имени бота',
        fullDescription: `Для генерации кода, используйте ${uri}`,
        usage: '[code | message]', aliases: ['say', 'talk'], jsonArgs: true,
        examples: { '{{prefix}}send {"description": ":v:"}': 'отправил эмбед с описaнием :v:' },
        permissions: { user: ['MANAGE_MESSAGES'] }
    },
    execute: async function (message, args, options) {
        if (!args.length) { 
            const waitMessage = await message.channel.send(`Напиши текст или код, который ты сгенерировал или сгенерируешь на ${uri}`)
            const messages = await message.channel.awaitMessages({ max: 1, time: 3e5, filter: ({ author, content }) => author.id === message.author.id && content.length })
            if (waitMessage.deleted) return
            else waitMessage.delete()       
            if (!messages.size) return
            else args = [ messages.first().content ]
            if (messages.first().deletable) messages.first().delete()
            delete waitMessage delete messages
        }
        
        if (message.deletable) message.delete()

        let fullMessage = args.join(' ')

        const pastebinId = fullMessage.match(/(https?:\/\/)?pastebin\.com\/(raw\/)?([0-9a-zA-Z]+)/)?.pop()
        if (args.length === 1 && pastebinId) {
            const data = await fetch('https://pastebin.com/raw/' + pastebinId).catch(() => null)
            if (data?.length) fullMessage = data.trim()
        }

        const _message = { content: '' }

        if (fullMessage.includes('{') && fullMessage.includes('}')) {
            try {
                const json = JSON.parse(fullMessage.slice(fullMessage.indexOf('{'), fullMessage.lastIndexOf('}') + 1))
                if (json.plainText) _message.content = json.plainText

                if (message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) {
                    const embed = new MessageEmbed(json)
                    if (json.image) embed.setImage(json.image)
                    if (json.thumbnail) embed.setThumbnail(json.thumbnail)
                    if (json.author?.icon_url) embed.setAuthor({ name: json.author.name ?? message.author.tag, iconURL: json.author.icon_url, url: json.author.url })

                    embed.fields = embed.fields.filter(f => f.name && f.value)
                    _message.embeds = [ embed ]
                }
            } catch(error) {
                console.log(error)
                _message.content = fullMessage
            }
        } else _message.content = fullMessage

        if (!_message.content?.length && !_message.embeds[0]?.length && !_message.embeds[0]?.image?.url?.length) return message.channel.send('Так как ты мне ничего даешь, я отправлю эту ошибку')
 
        try {
            await message.channel.send({ ..._message, content: _message.content.slice(0, 2000) || null })
        } catch (error) {
            const validProtocol = error.stack.match(/(.+): Scheme "(.+)" is not supported\./) || []
            if (validProtocol.length) return message.channel.send(`\`${validProtocol[1]}\`: протокол ссылки \`${validProtocol[2]}\` не поддерживается. Используй либо \`http\`, либо \`https\``)
            
            const validURL = error.stack.match(/(.+): Not a well formed URL./) || []
            if (validURL.length) return message.channel.send(`\`${validURL[1]}\`: неправильный URL`)

            const validLength = error.stack.match(/(.+): Must be (\d+) or fewer in length./) || []
            if (validLength.length) return message.channel.send(`\`${validLength[1]}\`: должно быть ${validLength[2]} или меньше по длине. Попробуй написать меньше символов...`)

            return message.channel.send(error.message)
        }
    }
}
