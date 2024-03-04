const { findChannel } = require('../../client/util')
const { MessageEmbed } = require('discord.js')

const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        description: 'настроит приветственное сообщение',
        usage: '[#channel | delete] <message>',
        fullDescription: require('./goodbye').command.fullDescription,
        examples: {
            '{{prefix}}welcome': 'покажет авто-роль и текущее приветственное сообщение',
            '{{prefix}}welcome #чичики Чичик {{member.tag}} залател на сервер': 'установит приветственное сообщение в канале #чичики',
            '{{prefix}}welcome remove': 'удалит приветственное сообщение',
        },
        aliases: ['greeting', 'greet'],
        permissions: {
            user: ['MANAGE_CHANNELS'],
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) {
        const welcome = message.guild.data.welcome ? {
            ...message.guild.data.welcome,
            channel: message.guild.channels.cache.get(message.guild.data.welcome.channel)
        } : null

        switch (args[0]?.toLowerCase()) {
            case 'remove':
            case 'delete':
                if (!welcome?.channel) return message.channel.send('Ты видишь приветственное сообщение? Нет? Я тоже')
                
                const _answer = await (new Confirmation(message).setContent('Ты точно хочешь удалить приветственное сообещние?').awaitResponse())
                if (_answer.data === false) return _answer.reply('И зачем ты тогда использовал эту команду? 😒')

                await message.guild.data.update({ $set: { welcome: null } })
                return _answer.reply('Ты удалил приветственное сообщение. Если что, ты сам захотел')

            case undefined:
                if (!welcome?.channel) return message.channel.send(xee.commands.help(this, options.prefix))
                const access = !welcome.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES') && '~~' || ''

                return message.channel.send({
                    content: `${access}Шаблон приветственного сообщения в канале ${welcome.channel}${access}\n${access && 'У меня нет права на отправку сообщений в канале приветственных сообщений'}`,
                    embeds: [
                        new MessageEmbed()
                            .setColor(xee.settings.color)
                            .setDescription(`\`\`\`${welcome?.message?.replace(/`​/g, '\'') ?? 'Не настроено'}\`\`\``)
                    ]
                })
            default:
                const channel = await findChannel(message, args[0]) || message.channel
                if (!channel.isText()) return message.channel.send('Хочу посмотреть на сообщения в том чате, но вот беда, он не текствовый')
                if (!channel.viewable) return message.channel.send(`Может быть, ты видишь канал ${channel}, но, я не вижу`)
                if (!channel.permissionsFor(message.guild.me)?.has('SEND_MESSAGES')) return message.channel.send('Прости, но у меня нет прав там писать :(')

                if (!args[1]) {
                    if (welcome?.channel) {
                        if (channel.id === welcome.channel.id) return message.channel.send('Это же одинаковые каналы: что ты мне дал, и что был')

                        const ___answer = await (new Confirmation(message).setContent(`Ты хочешь изменить канал приветственных сообщений ${welcome.channel} на ${channel}? `).awaitResponse())
                        if (!___answer.data) return ___answer.delete()

                        await message.guild.data.update({ $set: { 'welcome.channel': channel.id } })
                        return ___answer.reply({ content: `Канал, в который я буду отправлять приветственные сообщения изменён`,
                            embeds: [
                                new MessageEmbed() 
                                    .setColor(xee.settings.color)
                                    .addField('До изменения', welcome.channel.toString(), true)
                                    .addField('После измениния', channel.toString(), true)
                            ]
                        })
                    } else return message.channel.send(`Ты забыл написать шаблон сообщенния.\n> В самом шаблоне ты можешь использовать эти заменители\`\`\`${Object.keys(require('./goodbye').replaces).map(r => `{{${r}}}`).join(', ')}\`\`\``)
                }

                let text = args.slice(1).join(' ')
                if ((text.includes('@everyone') || text.includes('@here')) && !channel.permissionsFor(message.member).has('MENTION_EVERYONE')) return message.channel.send(`Ты не можешь использовать **@everyone** и **@here** в канале ${channel}`)

                let _message = `Ты установил приветственное сообщение. Теперь, при заходе человека на сервер в канал ${channel} будет отправляться оповещение о входе участника.`

                if (welcome?.channel) {
                    if (message.channel.permissionsFor(message.guild.me).has(['READ_MESSAGE_HISTORY', 'ADD_REACTIONS'])) {
                        await message.channel.send('Приветственное сообщение в канале уже существует. Хочешь его изменить?')

                        let __answer = await (new Confirmation(message).setContent({
                            embeds: [
                                new MessageEmbed()
                                    .setColor(xee.settings.color)
                                    .addField('До изменения', this.format(welcome.message))
                                    .addField('После измениния', this.format(text))
                            ]
                        }).awaitResponse())
                        __answer.delete()
                        if (__answer.data === false) return message.channel.send('Хорошо, ничего не изменил, честно')
                    }
                    _message = `Хорошо, я изменил приветственное сообщение в канале ${channel}.`
                }

                await message.guild.data.update({ $set: { welcome: { 
                    channel: channel.id, 
                    message: text 
                } } })

                return message.channel.send(_message)
        }
    },
    format: function (string) {
        let slice = (string, max = 600) => string.length > max ? string.slice(0, max) + '...' : string
        return `\`\`\`${slice(string).replace(/`​/g, '\'')}\`\`\``
    }
}
