const { findChannel } = require('../../client/util')
const { MessageEmbed } = require('discord.js')
module.exports = { 
    command: {
        description: 'настройка звездной доски',
        usage: '[число | #канал | delete | selfreact]',
        examples: {
            '{{prefix}}starboard': 'покажет информацию о звездной доске на сервере',
            '{{prefix}}starboard #звездная-доска': 'установит канал звездной доски как "#звездная-доска".',
            '{{prefix}}starboard 10': 'установит минимальное кол-во звезд для отправки',
            '{{prefix}}starboard selfreact': 'настройка учета звезды от автора сообщения'
        },
        permissions: {
            user: ['MANAGE_CHANNELS', 'MANAGE_MESSAGES']
        }
    },
    execute: async function(message, args, options) {
        const settings = message.guild.data.starboard

        if (!args.length) {
            const starChannel = message.guild.channels.cache.get(settings?.channel)
            if (!starChannel) return message.channel.send(`Кажется, канал звездной доски не назначен. Используй \`${options.prefix}${options.usage} here\`, чтобы установить этот канал, как канал звездной доски`)
            if (!starChannel.permissionsFor(message.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'READ_MESSAGE_HISTORY'])) return message.channel.send(`Звездная доска недоступна, так как у меня должны быть следующие права в канале **${starChannel.name}**: право на отправку сообщений, встраивание ссылок и чтение истории сообщений. К сожалению, их нет`)
            
            let last = message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS') ?
                 await Promise.all(message.guild.data.starboard.messages.filter(m => message.guild.channels.cache.get(m.channel)?.permissionsFor(message.guild.me)?.has('READ_MESSAGE_HISTORY')).reverse().slice(0, 3).map(m => message.guild.channels.cache.get(m.channel).messages.fetch(m.message).catch(() => null))).then(r => r.filter(Boolean)) : []
            
            const reactions = await Promise.all(last.map(r => new Promise(async resolve => {
                const reaction = r.reactions.cache.get('⭐')
                if (!reaction) return resolve(0)

                if (settings.self_react) return resolve(reaction.count)
                const reactions = await reaction.users.fetch({ limit: 1, before: r.author.id })
                return resolve(reactions.has(r.author.id) ? reaction.count - 1 : reaction.count)
            })))
            
            if (!reactions.filter(Boolean).length) last = []
            
            let embed = new MessageEmbed()
                .setColor(0xffac33)
                .addField('Последние звёзды', last.map((r, i) => `└ [[${r.id}]](${r.url}): ${reactions[i]} :star:`).join('\n') || 'Здесь пусто...')
            
            return message.channel.send({
                content: `Звездная доска включена в канале **${starChannel}**. Чтобы сообщение отправилось, нужно набрать как минимум **${settings.min}** ⭐ на сообщении. ${settings.self_react ? 'Кстати, люди могут ставить звезды себе на сообщения, и они тоже будут учитываться.' : ''}`,
                embeds: message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS') && reactions.length ? [embed] : []
            })
        }

        if (!isNaN(+args[0]) && isFinite(+args[0])) {
            if (!message.guild.channels.cache.has(settings?.channel)) return message.channel.send('Ты сначала канал установи, а потом минимум')
            const min = +args[0]
            if (min === 0) return message.channel.send('Мне что-ли все сообщения отправлять? Да ну, бред какой-то')
            if (min > 30) return message.channel.send('Ты знал что **больше 30** нельзя поставить?')
            if (settings.min === min) return message.channel.send(`У тебя и так стояло **${min}** как минимум. .__.`)

            await message.guild.data.update({ $set: { 'starboard.min': min } })
            return message.channel.send(`Теперь чтобы сообщение отправилось в канал <#${settings.channel}> нужно набрать **${min}** ⭐`)
        }

        if (message.guild.channels.cache.has(settings?.channel) && args[0].toLowerCase() === 'selfreact') {
            await message.guild.data.update({ $set: { 'starboard.self_react': !settings.self_react } })
            return message.channel.send(`Теперь реакции от отправителя сообщения ${settings.self_react ? 'не ' : ''}будут учитываться`)
        }

        if (message.guild.channels.cache.has(settings?.channel) && ['remove', 'delete'].includes(args[0].toLowerCase())) {
            message.channel.send(`Теперь в канале <#${settings.channel}> не будут отправляться "звездные сообщения"`)
            return message.guild.data.update({ $set: { starboard: null } })
        }

        let channel = await findChannel(message, args.join(' '), { text: true })
        if (!channel) return message.channel.send(`Текстового канала с именем **${args.join(' ').slice(0, 100)}** на сервере нет`)
        if (!channel.permissionsFor(message.guild.me).has('VIEW_CHANNEL')) return message.channel.send(`Да, я частично вижу канал **${channel}**, но скажу, что вообще не вижу`)
        if (!channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return message.channel.send(`Я не смогу отправлять сообщения в канал ${channel}`)
        if (!channel.permissionsFor(message.guild.me).has('READ_MESSAGE_HISTORY')) return message.channel.send(`Я должен видеть все сообщения в канале ${channel}. Поэтому, дай мне права. -__-`)
        if (settings?.channel === channel.id) return message.channel.send('Прикола не понял...')

        await message.guild.data.update({ $set: { starboard: { 
            channel: channel.id, 
            messages: [], 
            self_react: false, 
            min: 1 
        } } })
        
        return message.channel.send(settings?.channel ? `Канал звездной доски обновлен: ${channel}.` : `Звездная доска включена в канале ${channel}`)
    }
}
