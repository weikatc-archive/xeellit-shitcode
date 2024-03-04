const { MessageEmbed, Util, SnowflakeUtil } = require('discord.js')
const { parseEmoji } = require('../../client/util')
const { findByName } = require('../../client/finder')

const Pagination = require('../../classes/Pagination')
const Confirmation = require('../../classes/Confirmation')

const modes = { normal: 'обычный', single: 'одиночный' }

module.exports = {
    command: {
        description: 'настройка меню реакций',
        fullDescription: '**Режимы**:\n> `normal`: стандартный режим. Позволяет брать несколько ролей на одном сообщении.\n> `single`: одиночный режим. Позволяет брать одну роль с сообщения.\n',
        flags: ['add', 'remove', 'once'],
        usage: '[delete | clear | single | normal | :emoji:] <message-id> <@role | emoji>',
        examples: {
            '{{prefix}}reactrole': 'покажет текущие настройки',
            '{{prefix}}reactrole delete 632419521768194048': 'удалит все элементы, которые установлены на сообщении 632419521768194048',
            '{{prefix}}reactrole delete 708310803006357584 :v:': 'удалит элемент с эмодзи :v: на сообщении 708310803006357584',
            '{{prefix}}reactrole :v: 806368182570582036 Бойчик': 'назначит реакцию :v: на сообщении 806368182570582036 на выдачу роли **Бойчик**',
            '{{prefix}}reactrole clear': 'удалит все элементы сервера',
            '{{prefix}}reactrole single 824497955829710859': 'включит одиночный режим у сообщения 824497955829710859'
        },
        aliases: ['reactionrole', 'rero', 'rr'],
        permissions: {
            me: ['EMBED_LINKS', 'MANAGE_ROLES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'],
            user: ['MANAGE_GUILD']
        }
    },
    execute: async function (message, args, options) {
        const elements = message.guild.data.reactroles.filter(r => message.guild.channels.cache.has(r.channel) && message.guild.roles.cache.has(r.role))

        let confirm
        let _elements

        switch (args[0]?.toLowerCase()) {
            case undefined:
                if (!elements.size) return message.channel.send(`На этом сервере нет ролей за реакции, но ты их можешь настроить. Для получения информации, как это сделать, используй \`${options.prefix}help reactrole\``)

                let interface = new Pagination(message.author.id)
                Util.splitMessage(elements.map(rr => `**<#${rr.channel}>**: [[сообщение]](https://discord.com/channels/${rr.guild}/${rr.channel}/${rr.message}): <@&${rr.role}>: ${rr.emoji.includes(':') ? `<${rr.emoji.startsWith('a') ? '' : ':'}${rr.emoji}>` : decodeURI(rr.emoji)}\n\u2514 Режим: ${rr.mode ? modes[rr.mode] : 'обычный'}`)
                .join('\n'), { char: '\n', maxLength: 1800 })
                    .forEach(value => 
                        interface.add({
                            embeds: [
                                new MessageEmbed()
                                    .setAuthor({ name: 'Роли за реакции', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                                    .setColor(xee.settings.color)
                                    .setDescription(value)
                            ]
                        }))
                return interface.send(message.channel)

            case 'clear':
            case 'bulk':
            case 'reset':
                if (!elements.size) return message.channel.send('Странно, здесь и так чисто...')
                const data = await (new Confirmation(message).setContent( `Ты точно хочешь удалить **${elements.size}** роли за реакции?`).awaitResponse(true))
                if (!data) return message.channel.send(':ok_hand:')

                await xee.db.collection('reactroles').deleteMany({ guild: message.guild.id })
                await elements.forEach(rr => xee.store.reactroles.delete(rr._id))
                return message.channel.send('🧹')

            case 'delete':
            case 'remove':
                if (!args[1]) return message.channel.send('Хотя бы укажи ID сообщения, а...?')
                if (!+args[1]) return message.channel.send('Почему-то это не сильно похоже на ID')
                let deleteElements = elements.filter(rr => rr.message === args[1].toLowerCase())
                if (!deleteElements.size) return message.channel.send(`Хочешь удивлю? Элементов на сообщении **${args[1].slice(0, 30)}** нет. А кстати, такой ID вообще есть...?`)

                if (!args[2]) {
                    confirm = await (
                        new Confirmation(message)
                            .setContent(`Раз уж ты не указал эмодзи, то я тебе предлагаю удалить все элементы под сообщением **${deleteElements.first().message}** (их ${deleteElements.size}). Ты точно хочешь их удалить?`)
                            .awaitResponse()
                    )
                    if (!confirm.data) return confirm.message.delete().catch(() => null)

                    await deleteElements.forEach(rr => xee.store.reactroles.delete(rr._id))
                    await xee.db.collection('reactroles').deleteMany({ message: deleteElements.first().message, channel: deleteElements.first().channel })
                    return confirm.message.edit(`Удалил все элементы под сообщением **${deleteElements.first().message}**`).catch(() => null)
                }

                const deleteEmoji = parseEmoji(args.slice(2).join(' '))
                if (!deleteEmoji) return message.channel.send(`Что-то **${args.slice(2).join(' ').slice(0, 40)}** не очень похоже на эмодзи, или нет...`) 
                deleteElements = deleteElements.find(rr => rr.emoji === (deleteEmoji.id ? `${deleteEmoji.animated ? 'a:' : ''}${deleteEmoji.name}:${deleteEmoji.id}` : encodeURI(deleteEmoji.name)))
                if (!deleteElements) return message.channel.send('По моему, такого нету. А если даже и есть, то я не знал')
                xee.db.collection('reactroles').deleteOne({ _id: deleteElements._id })
                xee.store.reactroles.delete(deleteElements._id)
                return message.channel.send('Хорошо, я удалил')

            case 'single':
                if (!args[1]) return message.channel.send('На каком сообщении мне включать одиночный режим?')
                if (!+args[1]) return message.channel.send('Не думаю что это ID')
                _elements = elements.filter(rr => rr.message === args[1])
                if (!_elements.size) return message.channel.send('У этого сообщения нет элементов')
                if (_elements.size < 2) return message.channel.send('Одиночный режим всегда включен у сообщений с одним элементом')
                if (_elements.first().mode === 'single') return message.channel.send('Этот режим уже включен на этом сообщении. (・o・)')
                _elements.forEach(element => element.mode = 'single')
                xee.db.collection('reactroles').updateMany({ channel: _elements.first().channel, message: _elements.first().message }, { $set: { mode: 'single' } })
                return message.channel.send(`Одиночный режим включен у всех элеметов сообщения ${_elements.first().message}`)

             case 'normal':
                if (!args[1]) return message.channel.send('Ты думаешь я для тебя шутка?')
                if (!+args[1]) return message.channel.send('Не похоже это на ID')
                _elements = elements.filter(rr => rr.message === args[1])
                if (!_elements.size) return message.channel.send('У этого сообщения нет элементов')
                if (_elements.size < 2) return message.channel.send('Зачем? У сообщения один элемент')
                if (_elements.first().mode === 'normal') return message.channel.send('У этого сообщения я так был обычный режим')
                _elements.forEach(element => element.mode = 'normal')
                xee.db.collection('reactroles').updateMany({ channel: _elements.first().channel, message: _elements.first().message }, { $set: { mode: 'normal' } })
                return message.channel.send(`Обычный режим включен у всех элеметов сообщения ${_elements.first().message}`)

            default: 
                const _emoji = args.shift()
                const emoji = parseEmoji(_emoji)
                if (!emoji) return message.channel.send(`Возможно, эмодзи **${_emoji.slice(0, 50)}** находится на сервере, где нет меня, а может и просто его не существует...`)

                const _id = message.reference ? message.reference.messageId : args.shift()
                if (!_id) return message.channel.send('Текущий аргумент: айди сообщения в **этом** канале')
                if (!message.channel.permissionsFor(message.member).has('READ_MESSAGE_HISTORY')) return message.channel.send('Сейчас я должен был найти это сообщение. Но вот беда, я не могу читать здесь историю сообщений')

                const reactM = await message.channel.messages.fetch(_id).catch(() => null)
                if (!reactM) return message.channel.send(`Ты уверен, что сообщение с ID **${_id.slice(0, 30)}** существует? Убедись, что указанное сообщение находится в этом канале`)
                if (elements.some(rr => rr.message === reactM.id && 
                    rr.emoji === (emoji.id ? `${emoji.animated ? 'a:' : ''}${emoji.name}:${emoji.id}` : encodeURI(emoji.name)))) return message.channel.send('Элемент на эту реакцию уже установлен')

                if (!args.length) return message.channel.send(`Ну вот допустим люди будут нажимать на реакцию, да. И что они будут получать? Роль everyone? :clown:`)

                const role = await findByName(message.guild.roles.cache, args.join(' '))
                if (!role) return message.channel.send(`Роли **${args.join(' ').slice(0, 40)}** на сервере нет. Печально.`)
                if (role.id === message.guild.roles.everyone.id) return message.channel.send('Эта роль даётся просто так, не по реакции...')

                if (role.tags) {
                    if (role.tags.botId) return message.channel.send(`Роль **${role.name}** принадлежит боту **${(await xee.client.users.fetch(role.tags.botId)).tag}**.`)
                    if (role.tags.premiumSubscriberRole) return message.channel.send(`Роль **${role.name}** выдается только бустерам сервера...`)
                }

                if (role.managed) return message.channel.send(`Роль **${role.name}** управляется какой-то интеграцией.`)
                if (!role.editable) return message.channel.send('Роль выше меня. По логике, я не смогу её выдавать участникам. Это же логично...')

                if (
                    (message.member.roles.cache.size !== 1 && role.position >= message.member.roles.highest.position) 
                    && message.author.id !== message.guild.ownerId
                ) return message.channel.send('Прости, взломать меня не получится... Ты ниже этой роли, да...')
                if (elements.some(rr => rr.role === role.id && rr.message === reactM.id)) return message.channel.send(`Выдача роли **${role.name}** уже существует на сообщении ${reactM.id}`)

                const mode = elements.find(rr => rr.message === reactM.id)?.mode
                const create_data = await xee.db.collection('reactroles').insertOne({
                    _id: SnowflakeUtil.generate(),
                    guild: message.guild.id,
                    channel: message.channel.id,
                    message: reactM.id,
                    role: role.id,
                    once: message._flags.has('once'),
                    action: message._flags.has('remove') ? 'remove' : 'add',
                    emoji: emoji.id ? `${emoji.animated ? 'a:' : ''}${emoji.name}:${emoji.id}` : encodeURI(emoji.name),
                    mode
                }).then(r => r.ops[0])
                xee.store.reactroles.set(create_data._id, create_data)
                xee.react(reactM, emoji.id ?? emoji.name)

                return reactM.reply(`Роль **${role.name}** теперь будет выдаваться по реакции ${_emoji}.`).catch(() => {
                    message.channel.send(`Роль **${role.name}** теперь будет выдаваться по реакции ${_emoji}.`) //todo fix
                })
        }
    }
}
