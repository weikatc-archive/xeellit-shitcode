const { MessageEmbed } = require('discord.js')
const { findChannel } = require('../../client/util')
const fetch = require('../../client/fetch')

const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        hidden: true,
        aliases: ['yt'],
        description: 'настройка оповещений с YouTube',
        fullDescription: '**Заменители**:\n' + 
            [
                '`{{title}}`: название видео или прямой трансляции',
                '`{{author}}`: имя автора видео',
                '`{{author.id}}`: Id канала автора',
                '`{{url}}`: ссылка на видео'
            ].map(c => '> ' + c).join('\n') + '\n',
        usage: '[add <#канал> <id youtube канала> | delete <имя канала> | сообщение уведомления]',
        permissions: {
            user: ['MANAGE_GUILD'],
            me: ['EMBED_LINKS']
        }
    },
    execute: async function(message, args, options) {
        const notifications = await xee.db.collection('notifications').find({
            type: 'youtube',
            guild: message.guild.id
        }).toArray()

        if (!notifications.length && (
            !args.length || args[0].toLowerCase() !== 'add'
        )) return message.channel.send(`Чтобы настроить уведомления о новых видео / стримах, используйте \`${options.prefix}${options.usage} add <#канал> <id канала>\``)
        else if (!args.length) return message.channel.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({ name: 'Оповещения с YouTube', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                .setDescription(`__Шаблон уведомлений__:\n\`\`\`\n${notifications[0].message}\n\`\`\``)
                .setColor(xee.settings.color)
                .addField('Каналы', 
                    notifications.map(({ channel, channelName }) => {
                        return `**${channelName}**: уведомления отправляются в ${message.guild.channels.cache.get(channel).toString()}.`
                    }).join('\n')
                )
            ]
        })

        const subcommand = args.shift()
        let channelId
        let channelName

        switch (subcommand.toLowerCase()) {
            case 'add':
                if (notifications.length >= 15) return message.channel.send('Так много оповещений иметь нельзя.')
                if (args.length < 2) return message.channel.send(`Тебе нужно указать **канал уведомлений** и **ID ютуб канала**`)

                const channel = findChannel(message, args.shift(), { text: true })
                if (!channel || !channel.permissionsFor(message.member).has('VIEW_CHANNEL')) return message.channel.send('Разве такой текстовый канал существует...?')
                if (!channel.viewable) return message.channel.send('Мне нужно видеть текстовый канал ' + channel.toString() + '.')
                if (!channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return message.channel.send(`Я не могу отсылать сообщения в ${channel}!`)
                if (!channel.permissionsFor(message.member).has('SEND_MESSAGES')) return message.channel.send(`У тебя нет права на отправку сообщений в ${channel}. К сожалению, это критично.`)

                const channelInfo = await this.getChannel(args.shift())
                channelId = channelInfo.id?.channelId || channelInfo.snippet?.channelId
                channelName = channelInfo.snippet?.channelTitle

                if (!channelId) return message.channel.send('Не уверен, что такой канал существует :face_in_clouds:')
                if (notifications.some(c => c.channelId === channelId)) return message.channel.send(`Оповещения для **${channelName}** уже включены...`)

                await xee.db.collection('notifications').insertOne({
                    message: notifications[0]?.message || '**{{author}}** выпустил новое видео!\n{{url}}',
                    guild: message.guild.id,
                    channel: channel.id,
                    type: 'youtube',
                    channelName: channelName,
                    channelId
                })

                if (await xee.db.collection('notifications').countDocuments({ type: 'youtube', channelId }) === 1) this.sendHook(channelId)
                return message.channel.send(`Ок! Теперь если **${channelName}** выпустит новое видео или будет проводить прямую трансляцию, я оповещу об этом в канале ${channel}.`)

            case 'delete':
            case 'remove':
                if (!args.length) return message.channel.send('А имя ютуб-канала укажи. Не заставляй меня плакать :sob:')

                const deleteChannel = notifications.find(c => [c.channelName, c.channelId].includes(args.join(' ')))
                if (!deleteChannel) return message.channel.send('Канал не найден... 🧐')

                if (notifications.length === 1) {
                    const removeConfirmation = await (
                        new Confirmation(message)
                            .setContent(`Вы точно хотите отписаться от канала **${deleteChannel.items[0].snippet.channelTitle}**? После этого действия шаблон уведомлений будет сброшен!`)
                    ).awaitResponse()
                    if (removeConfirmation.message.deletable) removeConfirmation.message.delete().catch(() => null)
                    if (!removeConfirmation.data) return
                }

                channelId = deleteChannel.channelId
                await xee.db.collection('notifications').deleteOne({
                    guild: message.guild.id,
                    type: 'youtube',
                    channelId
                })

                if (await xee.db.collection('notifications').countDocuments({ type: 'youtube', channelId }) === 0) this.sendHook(channelId, 'unsubscribe')
                return message.channel.send(`Уведомления с канала **${deleteChannel.channelName}** приходить больше не будут.`)

            default:
                args.unshift(subcommand)

                if (args.join(' ').slice(0, 2000) === notifications[0].message) return message.channel.send('А в чем изменение...?')
                const confirmation = await (new Confirmation(message).setContent('Вы хотите изменить сообщение о новых событиях?')).awaitResponse()
                if (!confirmation.data) return confirmation.message.deletable && confirmation.message.delete().catch(() => null)

                await xee.db.collection('notifications').updateMany({ guild: message.guild.id, type: 'youtube' }, {
                    $set: {
                        message: args.join(' ').slice(0, 2000)
                    }
                })

                return confirmation.reply('Сообщение оповещения было изменено!')
        }

    },
    sendHook: function(channelId, mode = 'subscribe') {
        console.log((mode === 'subscribe' ? 'Подписываюсь на канал ' : 'Отписываюсь от канала ') + channelId)
        return fetch('https://pubsubhubbub.appspot.com/', { 
            method: 'POST', 
            form: { 
                'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=' + channelId, 
                'hub.callback': 'https://xeellit-app.herokuapp.com/webhooks/youtube', 
                'hub.secret': '<restricted>',
                'hub.mode': mode
            } 
        })
    },
    getChannel: async function(channelId) {
        return fetch('https://www.googleapis.com/youtube/v3/search', {
            query: {
                q: channelId,
                part: 'snippet',
                key: '<restricted>'
            }
        }).then(res => res.items?.shift() || channelId).catch(() => channelId)
    }
}
