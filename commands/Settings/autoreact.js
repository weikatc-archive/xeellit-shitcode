const { MessageEmbed } = require('discord.js')
const { findChannel, parseEmoji } = require('../../client/util')

const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        description: 'автоматическая установка реакций',
        usage: '<setup | delete> <#channel>',
        examples: {
            '{{prefix}}autoreact': 'покажет доступные элементы',
            '{{prefix}}autoreact setup #memes': 'добавит автореакт в канале #memes',
            '{{prefix}}autoreact delete #test': ' выключит автореакт в канале #test'
        },
        flags: ['images'],
        aliases: ['ar'],
        permissions: {
            me: ['EMBED_LINKS'],
            user: ['MANAGE_CHANNELS', 'MANAGE_GUILD', 'READ_MESSAGE_HISTORY', 'ADD_REACTIONS']
        }
    },
    execute: async function (message, args, options) {
        let channel = null
        let elements = message.guild.data.utils.autoreact.filter(x =>
            message.guild.channels.cache.has(x.channel) && x.emojis.filter(x => !x.id ? true : xee.client.emojis.cache.has(x.id)).length !== 0)

        switch (args[0]?.toLowerCase()) {
            case 'remove':
            case 'delete':
                if (!args[1]) channel = message.channel
                if (args[1]?.toLowerCase() === 'all') {
                    if (!elements.length) return message.channel.send('Держу в курсе, автореакт везде выключен')
                    
                    const __answer = await (new Confirmation(message).setContent('Ты точно хочешь везде удалить автореакт?').awaitResponse(true))
                    if (__answer === false) return __answer.reply('Я-то уж думал, что ты серьёзно настроен...')

                    await message.guild.data.update({ $set: { 'utils.autoreact': [] } })
                    return __answer.reply('Не знаю, к счастью, или нет, но ты всё удалил')
                }
                channel = await findChannel(message, args.slice(1).join(' '), { text: true })
                if (!channel) return message.channel.send('Такого канала нет на сервере')
                if (!channel.permissionsFor(message.member).has([ 'VIEW_CHANNEL', 'SEND_MESSAGES' ])) return message.channel.send('😒')
                if (!message.guild.data.utils.autoreact.some(x => x.channel === channel.id)) return message.channel.send(`В канале ${channel} нет автореакта...`)

                await message.guild.data.update({ $pull: { 'utils.autoreact': { channel: channel.id } } })
                return message.channel.send(`Автореакт из канала ${channel} был убран`)

            case 'setup':
                channel = (args[1] ? await findChannel(message, args.join(' ')) : null) || message.channel
                if (!channel.isText()) return message.channel.send(channel.name + ' не текстовый канал')
                if (!channel.permissionsFor(message.member).has(['READ_MESSAGE_HISTORY', 'ADD_REACTIONS', 'VIEW_CHANNEL'])) 
                    return message.channel.send(`У тебя недостаточно прав для установки автореакта в канале ${channel}`)

                if (!channel.viewable) return message.channel.send(`Я не могу просмартивать канал ${channel}. Что у меня там по правам...?`)
                if (!channel.permissionsFor(message.guild.me).has(['READ_MESSAGE_HISTORY', 'ADD_REACTIONS']))
                    return message.channel.send(`Я не могу ставить реакции в канале ${channel}. Проверь, есть ли у меня право на установку реакций и право на чтение истории`)

                if (message.guild.data.utils.autoreact.some(x => x.channel === channel.id)) {
                    let element = message.guild.data.utils.autoreact.find(x => x.channel === channel.id)
                    if (element.emojis.length === 20) return message.channel.send('Кажется, настроено уже 20 реакций. Поэтому, дополнить не получится')

                    const _answer = await (new Confirmation(message).setContent('Автореакт в канале {{channel}} уже есть, но, ты можешь его дополнить. Выбор за тобой...'.parse({ channel })).awaitResponse())
                    if (_answer === false) return _answer.reply('Ну как хочешь, выбор твой')

                    return this.add(message, element, options)
                }
                this.setup(message, channel, options)
                break

            default:
                elements = elements.slice(0, 12)
                const embed = new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setDescription('Автореакт — это автоматическая установка реакций, под сообщения.​')
                    .setAuthor({ name: 'Автореакт', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                elements.forEach(x => embed.addField('\u200b', `${message.guild.channels.cache.get(x.channel)}\n\u2514 ${x.emojis.filter(x => !x.id ? true : xee.client.emojis.cache.has(x.id)).map(x => x.id ? xee.client.emojis.cache.get(x.id) : x.name).join(', ')}`))

                if (!elements.length) return message.channel.send({ content: `Похоже, здесь пусто. Это можно исправить этой командой: \`​${options.prefix}autoreact setup\`​.`, embeds: [ embed ] })
                message.channel.send({ embeds: [ embed ] })
                break
        }
    },
    setup: function (message, channel, options) {
        message.channel.send('Напиши эмодзи __в этом канале через пробел__').then(async _message => {
            let collector = await message.channel.awaitMessages({
                max: 1,
                time: 30000,
                filter: x => x.author.id === message.author.id
            })
            if (!collector.size || !collector.first().cleanContent) {
                if (_message?.deletable) _message.delete().catch(() => true)
                return
            }
            let messageArray = collector.first().content.split(/ +/g)
            messageArray = messageArray.map(x => parseEmoji(x)).filter(x => x !== null).slice(0, 19)
            if (!messageArray[0]) return _message.delete().catch(() => true)
            let data = {
                channel: channel.id,
                emojis: messageArray,
                options: {}
            }
            if (message._flags.has('images')) data.options.images = true

            await message.guild.data.update({ $push: { 'utils.autoreact': data } })
            return _message.edit(`Настройка автореакта завершена ${channel}!`).catch(() => true)
        })
    },
    add: async function (message, element, options) {
        let avaible = 20 - element.emojis.length
        message.channel.send(`**Отправляй эмодзи в этот канал, добавлю**. Кстати, ты можешь добавить ещё ${avaible} эмодзи, правда классно?`).then(async _message => {
            let collector = await message.channel.awaitMessages({
                max: 1,
                time: 30000,
                filter: x => x.author.id === message.author.id
            })
            if (!collector.size || !collector.first().cleanContent) return _message.edit('Мне не нужна пустота, которую ты мне дал').catch(() => true)
            let messageArray = collector.first().content.split(/ +/g)
            messageArray = messageArray.map(x => parseEmoji(x)).filter(x => x !== null && !element.emojis.some(_x => (_x.id || _x.name) === (x.id || x.name))).slice(0, avaible - 1)
            if (!messageArray.length) return _message.edit('Спасибо, не надо').catch(() => true)
            if (_message.deletable) _message.delete()

            element.emojis.push(...messageArray)
            message.guild.data.utils.autoreact = message.guild.data.utils.autoreact.filter(x => x.channel !== element.channel)
            message.guild.data.utils.autoreact.push(element)

            await message.guild.data.update({ $set: { 'utils.autoreact': message.guild.data.utils.autoreact } })
            return message.channel.send(`Окей, я дополнил автореакт. Новые эмодзи: ${messageArray.map(x => x.id ? `<${x.animated ? 'a' : ''}:${x.name}:${x.id}>` : x.name)}`).catch(() => true)
        })
    }
}
