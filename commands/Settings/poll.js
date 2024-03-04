const { MessageEmbed, SnowflakeUtil } = require('discord.js')
const { parseDuration } = require('../../client/util')
const finder = require('../../client/finder')

const Poll = require('../../classes/Poll')

module.exports = {
    command: {
        description: 'устроить голосование',
        fullDescription: '> Всего может быть 9 вариантов.\n> Для остановки голосования просто удалите сообщение.',
        usage: '<время | end <ID сообщения>> <название варианты >',
        examples: {
            '{{prefix}}poll': 'покажет активные голосования',
            '{{prefix}}poll 10m плак не плак плак плак': 'создаст голосование с 3-мя вариантами',
            '{{prefix}}poll end 823924681689006180': 'завершит опрос под сообщением 823924681689006180'
        },
        permissions: {
            user: ['MANAGE_GUILD'],
            me: ['EMBED_LINKS', 'READ_MESSAGE_HISTORY', 'ADD_REACTIONS']
        }
    },
    execute: async function (message, args, options) {
        let polls = xee.store.polls.filter(poll => poll.guild?.id === message.guild.id)
        
        if (!args.length) {
            if (!polls.size) return message.channel.send('Активных голосований на сервере нет')
            let i = 0
            return message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: 'Голосования на сервере', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                        .setColor(xee.settings.color)
                        .setDescription(polls.map((poll) => `${++i}. [${poll.title}](https://canary.discord.com/channels/${message.guild.id}/${poll.channelId}/${poll.messageId})`).join('\n'))
                ]
            })
        } else if (args[0].toLowerCase() === 'end') {
            if (!polls.size) return message.channel.send('Как не странно, я не понимаю что ты хочешь завершить')
            if (!args[1]) return message.channel.send('Почему ты не указал ID сообщения или название опроса?')
            let finded = message.guild.data.polls.find(poll => poll.messageId === args[1]) || finder.findOne(message.guild.data.polls, ['title'], args.slice(1).join(' '))
            if (!finded) return message.channel.send('Опрос не найден. (')
            if (finded.end - Date.now() < 15e3) return message.channel.send('Думаю можно и подождать...')
            finded.stop()
            return message.channel.send(`Голосование под сообщением \`${finded.messageId}\` завершёно`)
        } else {
            if (polls.size > 9) return message.channel.send('На сервере 9 активных голосований, больше сделать нельзя')

            let time = parseDuration(args[0])
            if (!time) return message.channel.send(`Не думаю что ты мне дал правильное время... Попробуй его переделать...`)
            if (time < 1e4) return message.channel.send('В чем смысл этого?')
            if (time > 315576e5) return message.channel.send('Нельзя создать голосование, итоги которого, больше чем один год') 

            if (args.length < 2) return message.channel.send(`Ты должен написать название опроса и варианты его выбора через \` \``)

            let values = args.slice(1).join(' ').split(/ ?/).map(c => c.trim()).filter(Boolean)
            let title = values.shift().slice(0, 250)

            values = [ ...new Set(values) ]

            if (!values.length) return message.channel.send('Название есть, а варианты выбора нет...')
            if (values.length === 1) return message.channel.send('Какой смысл голосования, если в нем будет только один вариант?')
            if (values.length > 9) return message.channel.send('Вариантов не может быть больше 9. К сожалению')

            const data = await xee.db.collection('polls').insertOne({
                _id: SnowflakeUtil.generate(),
                channel: message.channel.id,
                values: values.map((text, index) => ({ text, index })),
                title, 
                end: Date.now() + time
            }).then(x => x.ops[0])

            return new Poll(data).load()
        }
    }
}
