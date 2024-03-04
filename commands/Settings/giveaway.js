const { MessageEmbed, SnowflakeUtil } = require('discord.js')
const { parseDuration } = require('../../client/util')

const Giveaway = require('../../classes/Giveaway')

module.exports = {
    command: {
        aliases: ['repick'],
        description: 'система розыгрышей',
        fullDescription: '> Всего может быть 9 активных розыгрышей.\n',
        usage: '<время | end <ID сообщения> | repick <ID сообщения>> <кол-во победителей> <название>',
        subcommands: ['repick', 'end'],
        examples: {
            '{{prefix}}giveaway': 'покажет активные розыгрыши',
            '{{prefix}}giveaway 10m 2 значки в межсервере': 'создаст розыгрыш на 10 минут с 2-мя победителями',
            '{{prefix}}giveaway end 810711411201277982': 'остановит розыгрыш под сообщением 810711411201277982'
        },
        permissions: {
            user: ['MANAGE_GUILD'],
            me: ['EMBED_LINKS', 'READ_MESSAGE_HISTORY', 'ADD_REACTIONS']
        }
    },

    repick: async function(message, args) {
        if (!args.length) return message.channel.send(`Укажите __ID сообщения__ с розыгрышем __в этом канале__`)
        if (!(/^\d{17,19}$/.test(args[0]))) return message.channel.send('Это не похоже на ID')

        const repickMessage = await message.channel.messages.fetch(args[0]).catch(() => null)
        if (!repickMessage) return message.channel.send('Сообщения с таким ID в канале нет')

        if (repickMessage.author.id !== xee.client.user.id || !repickMessage.embeds.length || 
            !repickMessage.embeds[0].footer?.text?.startsWith('Розыгрыш ') || !repickMessage.reactions.cache.has('🎉'))
            return message.channel.send('Это не сообщение розыгрыша. =/')

        const repickEmbed = repickMessage.embeds[0]
        if (repickEmbed.fields[1]?.value?.split('\n')?.length === 20) 
            return message.channel.send('Нельзя перевыберать победителя больше 20 раз. ¯\\_(ツ)_/¯')

        const newWinner = await Giveaway.getWinners(
            repickMessage,
            repickMessage.reactions.cache.get('🎉'),
            { count: 1, filter: member => !repickEmbed.fields[0].value.includes(member.id) && !repickEmbed.fields[1]?.value?.includes(member.id) }
        )

        if (!newWinner.length) return message.channel.send('Нового победителя выбрать не получилось...')

        if (!repickEmbed.fields[1]) repickEmbed.addField('Перевыбранные:', `> <@${newWinner[0]}>`)
        else repickEmbed.fields[1].value += `\n> <@${newWinner[0]}>`

        await repickMessage.edit({ embeds: [repickEmbed] })
        return message.channel.send({ content: `Хорошо, новый победитель: <@${newWinner[0]}>!`, allowedMentions: { users: newWinner } })
    },

    end: async function(message, args) {
        if (!args.length) return message.channel.send(`Нужно было указать ID сообщения...`)
        if (!(/^\d{17,19}$/.test(args[0]))) return message.channel.send('Это не похоже на ID')
        let giveaway = xee.store.giveaways.find(ga => ga.messageId === args[0].match(/\d{17,19}/)[0])
        if (!giveaway) return message.channel.send(`Розыгрыша под сообщением \`${args[0].slice(0, 100)}\` нет. ¯\\_(ツ)_/¯`)
        if (giveaway.end - Date.now() < 5000) return message.channel.send('Ничего, подождешь, осталось немного')
        
        clearTimeout(giveaway.timeout)
        giveaway.stop()

        return xee.react(message, '👌')
    },

    execute: async function (message, args, options) {
        if (options.usage === 'repick') return this.repick(message, args)

        if (!args.length) {
            if (!message.guild.data.giveaways.size) return message.channel.send(`Для того, чтобы создать розыгрыш, **смотрите** ${xee.commands.help(this, options.prefix).split('\n').slice(6, 10).join('\n').toLowerCase()}`)
            const fetchedGiveawys = await xee.db.collection('giveaways').find({ guild: message.guild.id }).toArray()
            return message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: 'Розыгрыши на сервере', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                        .setColor(xee.settings.color)
                        .setDescription(fetchedGiveawys.map((g, i) => `${i + 1}. [${g.title}](https://canary.discord.com/channels/${message.guild.id}/${g.channel}/${g.message})`).join('\n'))
                ]
            })
        }

        if (message.guild.data.giveaways.size >= 9) return message.channel.send('Может, ты, прочитаешь то послание, которое в хелпе оставил я?') 
        const time = parseDuration(args.shift())
        if (!time) return message.channel.send(`Сложно указать нормальное время? Сожалею...`)
        if (time < 1e4) return message.channel.send('Нельзя запускать розыгрыш меньше, чем на 10 секунд')
        if (time > 315576e5) return message.channel.send('1 год — максимальная длина розыгрыша')

        if (!args.length) return message.channel.send('Количество победителей не указано')
        const winners = +args.shift()
        if (isNaN(winners) || !isFinite(winners)) return message.channel.send('Это адекватное число?')
        if (winners <= 0) return message.channel.send('Почему это число меньше нуля?')
        if (winners > 20) return message.channel.send('Нельзя установить больше 20-ти победителей')

        if (!args.length) return message.channel.send('Ты не указал название розыгрыша. Укажи. :rage:')

        const giveawayMessage = await message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor('BLUE')
                    .setAuthor({ name: args.join(' ').slice(0, 250), iconURL: message.guild.iconURL({ dynamic: true }) })
                    .setDescription(`**Нажмите на :tada:, чтобы принять участие**.\n> ${xee.constructor.plural(['победитель', 'победителя', 'победителей'], winners, true)}`)
                    .setFooter('Розыгрыш начался')
                    .setTimestamp(Date.now() + time)
            ]
        })

        xee.react(giveawayMessage, '🎉')
        
        return new Giveaway(
            await xee.db.collection('giveaways').insertOne({
                _id: SnowflakeUtil.generate(),
                channel: message.channel.id,
                guild: message.guild.id,
                message: giveawayMessage.id,
                title: giveawayMessage.embeds[0].author.name,
                end: Date.now() + time, winners
        }).then(x => x.ops[0])).setTimeout()
    }
}
