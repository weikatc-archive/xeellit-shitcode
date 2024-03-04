const { findChannel } = require('../../client/util')
const { MessageEmbed } = require('discord.js')

const Confirmation = require('../../classes/Confirmation')

const replaces = {
    'guild': 'имя сервера',
    'guild.id': 'Id сервера',
    'member': '@линк юзера',
    'member.tag': 'тег юзера',
    'member.username': 'юзернейм юзера',
    'member.id': 'айди юзера',
    'member.discriminator': 'дискриминатор юзера',
    'member.createdAt': 'дата создания аккаунта',
    'member.createdTime': 'сколько прошло времени с создания аккаунта'
}

module.exports = {
    replaces,
    command: {
        description: 'настроить прощальное сообщение',
        usage: '[#channel | delete] <message>',
        fullDescription: '**Заменители**:\n' + Object.entries(replaces).map(e => `> \`{{${e[0]}}}\`: ${e[1]}`).join('\n'),
        examples: {
            '{{prefix}}goodbye #goodbye 👺 {{member}}': 'будет писать "**:japanese_goblin: @user**" в канале #goodbye'
        }, aliases: ['farewell'],
        permissions: {
            user: ['MANAGE_CHANNELS'],
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) {
        const goodbye = message.guild.data.goodbye ? {
            ...message.guild.data.goodbye,
            channel: message.guild.channels.cache.get(message.guild.data.goodbye.channel)
        } : null

        switch (args[0]?.toLowerCase()) {
            case 'delete':
            case 'remove':
                if (!goodbye) return message.channel.send('Блин, как же было бы прикольно, если бы можно было удалять пустоту. Но жаль, что так нельзя....')
                
                const _answer = await (new Confirmation(message).setContent('Ты точно хочешь удалить прощальное сообщение?').awaitResponse())
                if (_answer.data === false) return _answer.reply('Так и думал, что перехочешь')

                await message.guild.data.update({ $set: { goodbye: null } })
                return _answer.reply('Прощальное сообщение ушло не сказав пока. Странно')

            case undefined:
                if (!goodbye?.channel) return message.channel.send(xee.commands.help('goodbye', options.prefix))
                const access = !goodbye.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES') && '~~' || ''

                return message.channel.send({
                    content: `${access}Шаблон прощального сообщения в канале ${goodbye.channel}${access}\n${access && 'У меня нет права на отправку сообщений в канале прощальных сообщений'}`,
                    embeds: [
                        new MessageEmbed()
                            .setColor(xee.settings.color)
                            .setDescription(`\`\`\`${goodbye.message.replace(/`​/g, '\'')}\`\`\``)
                    ]
                })
            default:
                const channel = await findChannel(message, args[0]) || message.channel
                if (!channel.isText()) return message.channel.send('Жду гифку, на которой ты будешь писать в этот канал')
                if (!channel.viewable) return message.channel.send('Наверное, когда я слушал песню "Тает лед" я закрыл глаза, как там сказали в первой строке. И из-за этого я не вижу канал, который ты указал')
                if (!channel.permissionsFor(message.guild.me)?.has('SEND_MESSAGES')) return message.channel.send('Спс за канал, в котором я не могу писать')

                if (!args[1]) {
                    if (goodbye?.channel) {
                        if (channel.id === goodbye.channel.id) return message.channel.send('Это же одинаковые каналы: что ты мне дал, и что был')

                        const ___answer = await (new Confirmation(message).setContent(`Ты хочешь изменить канал прощальных сообщений ${goodbye.channel} на ${channel}?`).awaitResponse())
                        if (!___answer.data) return ___answer.delete().catch(() => null)

                        await message.guild.data.update({ $set: { 'goodbye.channel': channel.id } })
                        return ___answer.reply({ content: `Канал, в который я буду отправлять приветственные сообщения изменён`,
                            embeds: [
                                new MessageEmbed() 
                                    .setColor(xee.settings.color)
                                    .addField('До изменения', goodbye.channel.toString(), true)
                                    .addField('После измениния', channel.toString(), true)
                            ]
                        }).catch(() => null)
                    } else return message.channel.send(`Ты забыл написать шаблон сообщенния.\n> В самом шаблоне ты можешь использовать эти заменители\`\`\`${Object.keys(this.replaces).map(r => `{{${r}}}`).join(', ')}\`\`\``)
                }

                const text = args.slice(1).join(' ')
                if ((
                    text.includes('@everyone') || text.includes('@here')
                    ) && !channel.permissionsFor(message.member).has('MENTION_EVERYONE')
                ) return message.channel.send(`Ты не можешь использовать **@everyone** и **@here** в канале ${channel}`)

                let _message = `Теперь в канале ${channel} будут отправляться сообщения, когда кто-нибудь выйдет с сервера.`
                if (goodbye) {
                    await message.channel.send('Тебе не кажется, но сообщение уже есть? Хорошо, дам тебе право выбора')

                    const __answer = await (
                        new Confirmation(message)
                            .setContent({
                                embeds: [
                                    new MessageEmbed()
                                        .setColor(xee.settings.color)
                                        .addField('До изменения', this.format(goodbye.message))
                                        .addField('После изменения', this.format(text))
                                ]
                            })
                            .awaitResponse()                               
                    )
                        
                    __answer.delete()
                    if (__answer.data === false) return message.channel.send('Передумал. Ну и ладно')
                    _message = 'Прощальное сообщение изменил, вот и хорошо.'
                }

                await message.guild.data.update({ $set: { 'goodbye': {
                    channel: channel.id,
                    message: text
                } } })

                return message.channel.send(_message.parse({ channel }))
        }
    },
    format: function (string) {
        let slice = (string, max = 600) => string.length > max ? string.slice(0, max) + '...' : string
        return `\`\`\`${slice(string).replace(/`​/g, '\'')}\`\`\``
    }
}
