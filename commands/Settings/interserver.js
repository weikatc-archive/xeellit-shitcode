const { MessageEmbed } = require('discord.js')
const { chunk, splitMessage } = require('../../client/util')
const finder = require('../../client/finder')

const Confirmation = require('../../classes/Confirmation')
const Pagination = require('../../classes/Pagination')
const Interserver = require('../../classes/Interserver')

module.exports = {
    command: {
        aliases: ['i'],
        description: 'межсерверный чат',
        fullDescription: '**Подкоманды**:\n' + [
            '`create <имя> [публичный | приватный]`: создать свой межсерверный чат',
            '`delete <имя>`: удалит межсервер с указанным именем',
            '`join <имя>`: подключит канал к межсерверу с заданным именем',
            '`exit`: отключет межсервер в текущем канале',
            '`migrate`: миграция на вебхуки',
            '`[имя межсервера] mute <@пользователь>`: замутит пользователя в межсервере',
            '`[имя межсервера] mutes`: покажет список мутов',
            '`[имя межсервера] unmute <@пользователь>`: снимет ранее наложенное заглушение',
            '`[имя межсервера] mod [@пользователь]`: установит нового модератора или покажет их список',
            '`[имя межсервера] channels [удалить]`: покажет список каналов или исключит один из них',
            '`[имя межсервера] logs`: удалит или установит канал межсерверных логов'

        ].map(s => '> ' + s).join('\n'),
        usage: '[delete | create | mute | mutes | unmute | mod | join | exit]',
        permissions: { me: ['EMBED_LINKS'] },
        subcommands: ['create', 'join', 'exit', 'delete', 'migrate'],
        examples: {
            '{{prefix}}interserver': 'просмотр ваших межсерверных чатов',
            '{{prefix}}interserver create peace': 'создать новый межсерверный чат с именем peace',
            '{{prefix}}interserver delete general': 'удалить межсерверный чат с именем general',
            '{{prefix}}interserver join peace': 'подключить межсерверный чат с именем peace в текущем канале',
            '{{prefix}}interserver exit': 'отключит текущий канал от межсервера'
        }
    },

    create: async function (message, args, options) {
        let owners = xee.store.interservers.filter(x => x.creator === message.author.id)
        let type = 'public'

        if (owners.length === 9) return message.channel.send('Нельзя иметь более 9-ти межсерверных чатов')
        if (['публичный', 'приватный'].includes(args.at(-1)?.toLowerCase())) type = args.pop()
        if (!args.length) return message.channel.send('Чат сердечный а как зовут, не знаю')

        const interserverName = args.map(x => x.replaceAll(' ', '-')).join('-').slice(0, 30)
        if (xee.store.interservers.has(interserverName))
            return message.channel.send(`Межсервер с таким именем (\`${interserverName}\`) уже существует`)

        const interserver = await Interserver.create(interserverName, message.author.id, [ type.toLowerCase() === 'приватный' && 'PRIVATE' ].filter(Boolean))

        if (message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS') && 
            !xee.store.interservers.some(i => i.webhooks.some(w => w.channel === message.channel.id))) {
            const answer = await (new Confirmation(message).setContent(`Ты создал межсервер с именем **${interserver.name}**. Хочешь добавить этот канал в свою сеть?`).awaitResponse())
            if (answer.data === false) return answer.reply(`Хорошо. Ты в любой момент можешь присоединись канал используя \`${options.prefix}${options.usage} join ${interserverName}\``)

            await module.exports.join(message, [interserverName], options, true)
            return answer.reply('Отлично! Ты подключил этот канал к своему межсерверу. Желаю удачи в общении')

        } else return message.channel.send(`Ты создал свой межсерверный чат с именем ${interserverName}. Да, это не шутка, ты реально его создал`)
    },

    join: async function(message, args, _, _void) {
        if (!args.length) return message.channel.send('Ты должен был указать имя межсервера')
        if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) return message.channel.send('У тебя недостаточно прав для подключения межсервера \:(')
        if (!message.channel.permissionsFor(message.guild.me).has('MANAGE_WEBHOOKS')) return message.channel.send('Мне нужно право на создание вебхуков в этом канале.')
        if (xee.store.interservers.some(i => i.webhooks.some(w => w.channel === message.channel.id) || i.logs === message.channel.id)) 
            return message.channel.send('В этом канале уже подключен межсерверный чат. Покинь его, прежде чем выполнять эту команду')

        const interserverName = args.join('-')
        const interserver = xee.store.interservers.get(interserverName)
        if (!interserver) return message.channel.send(`Межсервера **${interserverName.slice(0, 30)}** просто-напросто не существует. Печально, не так ли?`)
        if (interserver.flags.has('PRIVATE') && (interserver.creator !== message.author.id && !interserver.mods.includes(message.author.id))) return message.channel.send('Это приватный межсервер, подключить канал к нему может либо владелец, либо один из модераторов')

        const webhooks = await message.channel.fetchWebhooks()
        if (webhooks.size >= 10) return message.channel.send('В канале 10 вебхуков. Удалите один и используйте команду снова!')
        
        const webhook = await message.channel.createWebhook(
            xee.client.user.username,
            {
                avatar: xee.client.user.displayAvatarURL({ format: 'jpeg' }),
                reason: 'присоединение к межсерверному чату ' + interserverName
            }
        )

        await interserver.addChannel(message.channel, webhook)
        return _void ? null : message.channel.send(`Межсерверная сеть **${interserver.name}** теперь доступна в этом канале`)
    },

    delete: async function(message, args) {
        let owners = [...xee.store.interservers.filter(x => x.creator === message.author.id).values()]

        if (owners.size === 0) return message.channel.send('У тебя нету межсерверных чатов. Чем ты думаешь, перед тем, как использовать эту команду?')
        if (!args.length) return message.channel.send('Эм, я не знаю что ты там хочешь удалить. Хоть бы имя написал...')
        const finded = finder.findOne(owners, ['name'], args.join('-'))
        if (!finded) return message.channel.send('Что-то я ничего не нашел, попробуй ещё раз')

        const answer = await (new Confirmation(message).setContent(`Ты точно хочешь удалить межсервер **${finded.name}**?`).awaitResponse())
        if (answer.data === false) return answer.reply('Если ты не хочешь, то зачем использовал команду?')

        xee.store.interservers.delete(finded.name)
        await xee.db.collection('interservers').deleteOne({
            _id: finded.name
        })

        if (xee.cluster) xee.cluster.send('INTERSERVER_DELETE', { name: finded.name })
        return answer.reply(`Хорошо, я удалил межсервер с именем **${finded.name}**.`)
    },

    exit: async function(message) {
        if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) return message.channel.send('Ты думаешь вообще перед тем, как использовать команду? Мне кажется нет')
        const interserver = xee.store.interservers.find(i => i.webhooks.some(w => w.channel === message.channel.id))
        if (!interserver) return message.channel.send('Ты пытаешься чистить зубы не имея их?')

        await interserver.deleteChannel(message.channel)
        return message.channel.send('Как говорится, Лондон гудбай. Хотя кто так говорит кроме меня?...')
    },

    migrate: async function(message) {
        if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) return message.channel.send('Нужно право на управление каналом. У вас его нет.')
        if (!message.channel.permissionsFor(message.guild.me).has('MANAGE_WEBHOOKS')) return message.channel.send('Мне нужно право на создание вебхуков в этом канале.')

        const interserver = xee.store.interservers.find(i => i.channels.includes(message.channel.id))
        if (!interserver) return message.channel.send('Либо в этом канале нет межсерверного чата, либо он уже был мигрирован.')

        const webhooks = await message.channel.fetchWebhooks()
        if (webhooks.size >= 10) return message.channel.send('В канале 10 вебхуков. Удалите один и используйте команду снова!')
        
        const webhook = await message.channel.createWebhook(
            xee.client.user.username,
            {
                avatar: xee.client.user.displayAvatarURL({ format: 'jpeg' }),
                reason: 'мигрирование межсерверного чата'
            }
        )

        interserver.channels = interserver.channels.filter(c => c !== message.channel.id)
        await interserver.addChannel(message.channel, webhook)
        await xee.db.collection('interservers').updateOne({ _id: interserver.name }, {
            $set: {
                channels: interserver.channels
            }
        })

        return message.channel.send('Межсерверный чат был успешно мигрирован на новую вебхук-систему!')
    },

    execute: async function(message, args, options) {
        let interservers = xee.store.interservers.filter(x => x.creator === message.author.id || x.mods.includes(message.author.id))
        

        if (!args.length) {
            if (!interservers.size) return message.channel.send(`Чтобы создать свой межсерверный чат: используй \`${options.prefix}${options.usage} create <имя> [публичный | приватный]\``)
    
            const interface = new Pagination(message.author)

            chunk([...interservers.values()], 3).forEach((c, p, s) => interface.add({
                embeds: [
                    new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setFooter(`Страница: ${++p} / ${s.length}`)
                    .addFields(c.map(i => [{
                        name: i.name,
                        value: `**${i.flags.has('PRIVATE') ? 'Приватный' : 'Открытый'} межсервер**\nКоличество каналов: ${i.webhooks.length}\n└ \`${options.prefix}${options.usage} ${i.name} channels\``,
                        inline: true
                    }, { name: '\u200b', value: `**${i.mods.includes(message.author.id) ? 'Модератор' : 'Владелец'}**\nКанал логов: ${i.logs && `<#${i.logs}>` || 'нет'}\n└ \`${options.prefix}${options.usage} ${i.name} logs\``, inline: true }, { name: '\u200b', value: '\u200b', inline: true }]).flat())
                ]
            }))

            return interface.send(message.channel)
        }

        let interserver = xee.store.interservers.find(i => i.webhooks.some(w => w.channel === message.channel.id))
            || xee.store.interservers.get(args.shift().replaceAll(' ', '-'))
        if (!interserver) return message.channel.send('Выполни команды в канале межсервера или просто укажи его имя')

        if (!args.length) return message.channel.send('Аргументы закончились...?')

        switch(args.shift().toLowerCase()) {
            case 'channels':
                if (!interservers.has(interserver.name)) return message.channel.send('Эта информация не доступна для простых смертных.')
                if (!args.length) return splitMessage(message.channel, `\`\`\`Каналы межсервера ${interserver.name}\`\`\`\n` + interserver.webhooks.map((i, n) => `${++n}. **\`${i.channel}\`**`).join('\n'), { char: '\n' })
                if (isNaN(+args[0] || !isFinite(+args[0]))) return message.channel.send('Ты должен указать Id канала')
                if (!(/^\d{17,19}$/.test(args[0]))) return message.channel.send('Это не похоже на Id....')
                if (interserver.webhooks.every(w => w.channel !== args[0])) return message.channel.send('Канала с таким Id в этом межсервере нет')

                await interserver.deleteChannel(args[0])
                return message.channel.send(`Канал с Id **${args}** был исключен из межсервера **${interserver.name}**`)

            case 'log':
            case 'logger':
            case 'logs':
                if (!interservers.has(interserver.name)) return message.channel.send('Я запрещаю тебе сюда смотреть!')
                if (interserver.logs) {
                    if (interserver.creator !== message.author.id) return message.channel.send('Сбросить канал логов может только владелец межсервера')
                    await xee.db.collection('interservers').updateOne({ _id: interserver.name }, { $set: { logs: null } })
                    if (xee.cluster) xee.cluster.send('INTERSERVER_LOG', { name: interserver.name, id: null })

                    interserver.logs = null
                    return message.channel.send('Канал логов межсервера был сброшен')
                } else {
                    if (interserver.creator !== message.author.id) return message.channel.send(`Тебе нельзя устанавливать логи межсервера ${interserver.name}`)
                    if (xee.store.interservers.some(i => i.webhooks.some(w => w.channel === message.channel.id))) return message.channel.send('В этом канале есть межсерверный чат')
                    if (!message.member.permissions.has('MANAGE_CHANNELS')) return message.channel.send('У тебя должно быть право на управление сообщениями в этом канале')
                    if (!message.member.permissions.has('READ_MESSAGE_HISTORY')) return message.channel.send('У тебя должно быть право на чтение истории')

                    interserver.logs = message.channel.id
                    await xee.db.collection('interservers').updateOne({ _id: interserver.name }, { $set: { logs: message.channel.id } })
                    if (xee.cluster) xee.cluster.send('INTERSERVER_LOG', { name: interserver.name, id: message.channel.id })

                    return message.channel.send(`Логи межсерера **${interserver.name}** теперь будут отправляться в этот канал`)
                }

            case 'bans':
            case 'mutes':
                if (!interserver.block.length) return message.channel.send('Мутов в межсерверном чате нет')
                else return splitMessage(message.channel, `\`\`\`Муты межсерверном чате ${interserver.name}\`\`\`\n` + interserver.block.map((i, n) => `${++n}. **\`${i.user}\`**${i.reason ? ` (${i.reason})` : ''}`).join('\n'), { char: '\n' })

            case 'moders':
            case 'admins':
            case 'mod':
                if (!args.length) return splitMessage(message.channel, `\`\`\`Модераторы межсервера ${interserver.name}\`\`\`\n` + interserver.mods.filter((a, b, c) => c.indexOf(a) === b)
                    .map((i, n) => `${++n}. **\`${i}\`**${xee.client.users.cache.has(i) ? `\n_ _   └ ${xee.client.users.cache.get(i).tag}` : ''}`).join('\n'), { char: '\n' })
                
                if (!interservers.has(interserver.name)) return message.channel.send('Куда полез?')
                const user = message.mentions.users.last() || await xee.client.users.fetch(args[0]).catch(() => null)
                if (!user) return message.channel.send('Пользователя с таким Id не существует')

                await xee.db.collection('interservers').updateOne({ _id: interserver.name }, { 
                    [ interserver.mods.includes(user.id) ? '$pull' : '$push' ]: { mods: user.id } })
                if (xee.cluster) xee.cluster.send('INTERSERVER_MOD', { name: interserver.name, id: user.id, type: interserver.mods.includes(user.id) ? 'remove' : 'add' })
                
                message.channel.send(interserver.mods.includes(user.id) ? `**${user.tag}** теперь не модератор. =\(` : `Поздравляю **${user.tag}** с повышением! Он теперь модератор`)
                return interserver.mods.includes(user.id) ? xee.remove(xee.store.interservers.get(interserver.name).mods, user.id) : xee.store.interservers.get(interserver.name).mods.push(user.id)

            case 'ban':
            case 'mute':
                {
                if (!interservers.has(interserver.name)) return message.channel.send('У тебя недостаточно прав')
                if (!args.length) return message.channel.send('Какого человек блокировать?')

                const chudik = message.mentions.users.last() || await xee.client.users.fetch(args[0]).catch(() => null)
                if (!chudik) return message.channel.send(`Человека с ID ${args[0]} не существует`)

                if (chudik.id === xee.client.user.id) return message.channel.send('Говорю тебе мысленно посос...')
                if (chudik.id === message.author.id) return message.channel.send('Ты не можешь заблокировать себя, суицидник чёртов')
                if (chudik.bot) return message.channel.send('Мутить можно только тех, у кого есть душа')

                if (interserver.creator === chudik.id) return message.channel.send(`Ну так-то, **${chudik.tag}** это создатель межсервера. За что ты его так? 😓`)
                if (interserver.mods.includes(chudik.id)) return message.channel.send('Это же модератор. Зачем ты его блокируешь?...')

                const isLocal = args[1]?.toLowerCase() === 'local'
                let muteChannel

                if (isLocal) {
                    muteChannel = interserver.webhooks.find(w => w.channel === message.channel.id)?.channel
                    if (!muteChannel) return message.channel.send('Выполните эту команду прямо в канале межсервера.')
                    if (interserver.localBlock.some(c => c.user === chudik.id && c.channel === muteChannel)) return message.chanenl.send('Но ведь этот человек уже был заблокирован...')
                } else {
                    if (interserver.block.some(c => c.user === chudik.id)) return message.channel.send('Человек заблокирован. Скажи смысл его блокировать второй раз?')
                }

                await interserver.setMute(chudik.id, null, muteChannel)

                if (!isLocal) {
                    const banAnswer = await (new Confirmation(message).setContent(`Хотите ли вы удалить последние сообщения от **${chudik.tag}**? Удалятся только те, что написаны недавно.`).awaitResponse())
                    if (banAnswer.data) {
                        xee.cluster.eval(`(async () => {
                            const interserver = xee.store.interservers.get(\`${interserver.name.split('').map(w => w === '`' ? '\`' : w).join('')}\`)
                            if (interserver) {
                                for (const msg of interserver.messages.values()) {
                                    if (msg.author !== '${chudik.id}') continue
                                    await interserver.deleteMessage(msg.message).catch(() => {})
                                 }
                            }
                        })()`)
                    }
    
                    return banAnswer.reply(interserver.name === 'general' ? `Пендос **${chudik.tag}** заблокирован (ХАХАХА РИЛ ЧУДИК ДА)` : `Пользователь **${chudik.tag}** был заблокирован в межсерверном чате **${interserver.name}**`)
                } else {
                    return message.channel.send('Все ОК. Человек заблокирован.')
                }
            }
    
            case 'unban':
            case 'unmute':
                if (!interservers.has(interserver.name)) return message.channel.send('У тебя недостаточно прав')
                if (!args.length) return message.channel.send('Ну и кого мне размутить?')

                const pendos = message.mentions.users.last() || await xee.client.users.fetch(args[0]).catch(() => null)
                if (!pendos) return message.channel.send(`Прикинь, в дискорде нету человека с ID ${args[0]}`)
                if (pendos.id === xee.client.user.id) return message.channel.send('Спасибо, не нужно')
                if (message.author.id === pendos.id) return message.channel.send('Зачем ты пытаешься разблокировать себя, когда ты модератор...')
                if (pendos.id === interserver.creator) return message.channel.send('А теперь скажи, зачем разблокировать создателя межсервера?')
                if (pendos.bot) return message.channel.send('Боты не могут иметь муты, прикол?')

                const isLocal = args[1]?.toLowerCase() === 'local'
                let muteChannel
                
                if (isLocal) {
                    muteChannel = interserver.webhooks.find(w => w.channel === message.channel.id)?.channel
                    if (!muteChannel) return message.channel.send('Выполните эту команду прямо в канале межсервера.')
                    if (!interserver.localBlock.some(u => u.user === pendos.id && u.channel === muteChannel)) return message.channel.send(`${pendos.tag} не в муте же...`)
                } else {
                    if (!interserver.block.some(u => u.user === pendos.id)) return message.channel.send(`Пользователь ${pendos.tag} и так не заблокирован`)
                }

                await interserver.removeMute(pendos.id, muteChannel)

                return message.channel.send(
                    isLocal ? 
                        `Выполнено! Пользователь ${pendos.tag} был разблокирован!` : 
                        `Пользователь межсервера **${interserver.name}** — **${pendos.tag}** был разблокирован`
                )

            default: return message.channel.send(xee.commands.help(this, options.prefix))
        }
    }
}
