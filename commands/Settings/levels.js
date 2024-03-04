const { MessageEmbed } = require('discord.js')
const { findByName } = require('../../client/finder')
const { findMember, findChannel, splitMessage, parseDuration } = require('../../client/util')

const MemberData = require('../../classes/MemberData')
const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        aliases: ['lv', 'lvl', 'level'],
        description: 'управление системой уровней',
        usage: '[disable | reset [@пользователь] | role <уровень> <@роль> | roles | onerole | voicexp | ignore [#канал] | messagechannel | message <#канал> <сообщение> | cooldown | messagexp | @пользователь <уровень>]',
        examples: {
            '{{prefix}}levels': 'включит систему уровней',
            '{{prefix}}levels disable': 'отключит систему уровней',
            '{{prefix}}levels reset': 'сбросит все ранги сервера',
            '{{prefix}}levels onerole': 'включит или же выключить одну роль за уровень',
            '{{prefix}}levels voicexp': 'включит или выключит получение опыта за общение в голосовом канале',
            '{{prefix}}levels messagechannel': 'переключит настройку: будет ли сообщение о повышении отправляться в канал, в котором человек повысил уровень',
            '{{prefix}}levels messagexp 15 25': 'будет выдавать от 15 до 25 за сообщение',
            '{{prefix}}levels cooldown 30s': 'установит промежуток получения опыта в текстовых каналах',
            '{{prefix}}levels role 10 Крутыш': 'установит выдачу роли Крутыш при достижении 10 уровня',
            '{{prefix}}levels ignore #команды': 'установит запрет на получение опыта в канале команды',
            '{{prefix}}levels @Frigalhik 2': 'установит 2 уровень у пользователя Frigalhik',
            '{{prefix}}levels message #общение {{member}} получает {{level}} уровень': 'установит сообщение при повышении уровня'
        },
        permissions: { user: ['MANAGE_GUILD'], me: ['EMBED_LINKS'] }
    },
    execute: async function(message, args, options) {
        const levels = message.guild.data.levels
        if (!levels) {
            const toggle = await (new Confirmation(message).setContent('Вы хотите включить систему уровней на сервере?').awaitResponse())
            if (!toggle.data) return toggle.reply('Случайно написали получается. Бывает.')

            await message.guild.data.update({ 
                $set: { 
                    levels: {
                        oneRole: false, 
                        roles: [], 
                        ignore: [], 
                        voiceXpCount: 15,
                        messageXp: [ 15, 25 ]
            
                    } 
                } 
            })
            
            return toggle.reply('Система уровней на этом сервере включена! 🎉 🥀 ')
        }

        if (!args.length) return message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setAuthor({ name: 'Уровни', iconURL: message.guild.iconURL() })
                    .setDescription(
                        message.guild.channels.cache.get(levels.message?.channel)?.permissionsFor(message.guild.me)?.has(['SEND_MESSAGES', 'VIEW_CHANNEL']) ? 
                        `__Сообщение о повышении уровня__ ${levels.message.messageChannel ? 'либо в канале, в котором участник поднял уровень, либо ' : ''}в канале <#${levels.message.channel}>:\n\`\`\`\n${levels.message.content.slice(0, 1800).replaceAll('```', '')}\`\`\`` : 
                        'Пока-что здесь пусто. Почему? Сообщение об повышении уровня не установлено.'
                    )
                    .addField('Примечания', `- Чтобы получать опыт можно писать в текстовых каналов (будет капать ${levels.messageXp[1] ? `от ${levels.messageXp[0]} до ${levels.messageXp[1]}` : levels.messageXp[0]} XP с промежутком в ${xee.constructor.ruMs(levels.cooldown || 6e4, true)})\n` +
                                            `${levels.voiceXp ? `- Вы можете разговаривать с друзьями в голосовых каналах, что тоже является способом получения опыта\n` : ''}` +
                                            `${levels.roles?.length ? `- Если Вы желаете посмотреть список ролей за уровни, используйте "${options.prefix}${options.usage} roles"\n` : ''}` +
                                            `${message.guild.channels.cache.get(levels.message?.channel)?.permissionsFor(message.guild.me)?.has('SEND_MESSAGES') ? `- Сообщение о повышении уровня отправляется в канал #${message.guild.channels.cache.get(levels.message.channel).name}${levels.message.time ? ` и удаляется по истечении ${xee.constructor.ruMs(levels.message.time, true)}` : ''}` : ''}`)
                    .setFooter(levels.oneRole ? 'Вы знали, что после достижения след. уровня роли полученные на пред. уровне снимуться?' : '')
            ]
        })

        const subcommand = args.shift().toLowerCase()

        if (subcommand === 'disable') {
            const answer = await (new Confirmation(message).setContent('Вы точно хотите отключить систему уровней на этой сервере? Все ранги будут удалены.').awaitResponse(true))
            if (answer === false) return message.channel.send('Ничего не трону. Честно.')

            await Promise.all([
                message.guild.members.cache.forEach(member => delete member.data),
                message.guild.data.update({ $set: { levels: null } }),
                xee.db.collection('members').deleteMany({ guild: message.guild.id })
            ])

            return message.channel.send('Все данные о уровнях сервера были удалены. Модуль отключен.')
        } else if (subcommand === 'reset') {
            if (args.length) {
                const member = await findMember(message, args.join(' '))
                if (!member) return message.channel.send('Такого пользователя на мой взгляд нет.')
                if (member.permissions.has('ADMINISTRATOR') && !message.member.permissions.has('ADMINISTRATOR')) return message.channel.send(`У участника **${member.user.tag}** есть право Администратора. У тебя его нет. Как это понимать?`)
                if (await xee.db.collection('members').countDocuments({ guild: message.guild.id, user: member.id }) === 0) return message.channel.send(`Ранговой карточки у пользователя **${member.user.tag}** и так нет.`)

                await xee.db.collection('members').deleteOne({ guild: message.guild.id, user: member.id })
                await xee.store.members.delete(member.id + member.guild.id)

                member.roles.cache.filter(role => levels.roles.some(r => r.id === role.id) && 
                    message.guild.roles.cache.get(role.id)?.editable).forEach(role => member.roles.remove(role.id))
                return message.channel.send(`Ранговая карточка пользователя **${member.user.tag}** на сервере была сброшена.`)
            }

            const answer = await (new Confirmation(message).setContent('Вы точно хотите обнулить все ранги сервера?').awaitResponse(true))
            if (!answer) return message.channel.send('Понятно... Ложный вызов...')

            await message.guild.members.cache.forEach(member => xee.store.members.delete(member.id + member.guild.id))
            await xee.db.collection('members').deleteMany({ guild: message.guild.id })

            message.channel.send(`Ранги сервера очищены.${levels.roles.length ? ' Идет удаление ролей у пользователей' : ''}`)
            if (!levels.roles.length) return

            const guildMembers = await message.guild.members.fetch()

            for (const role of levels.roles) {
                if (!message.guild.roles.cache.get(role.id)?.editable) continue
                const membersWithRole = guildMembers.filter(member => member.roles.cache.has(role.id))
                await Promise.all(membersWithRole.map(member => member.roles.remove(role.id)))
            }

            return message.channel.send('Удаление ролей завершено.')
        } else if (subcommand === 'onerole') {
            await message.guild.data.update({ $set: { 'levels.oneRole': !levels.oneRole } })
            return message.channel.send( levels.oneRole ? 'Теперь участники сервера будут получать несколько ролей за все полученные уровни' : 'Теперь участники сервера будут получать только одну роль за уровень' )
        } else if (subcommand === 'roles') {
            const roles = levels.roles.filter(role => message.guild.roles.cache.has(role.id))
            if (!roles.length) return message.channel.send('Роли за уровни на сервере отсутствуют')
            else return splitMessage(message.channel, '```Роли за уровни```\n' + roles.sort((a, b) => a.level - b.level).map(r => `<@&${r.id}> за ${r.level} уровень`).join('\n'), { char: '\n' })
        } if (subcommand === 'role') {
            if (!message.guild.members.me.permissions.has('MANAGE_ROLES')) return message.channel.send('У меня нет права на выдачу ролей')
            if (!args.length) return message.channel.send('Так как ты мне ничего не даешь, то я тебе дам это бессмысленное сообщение.\n|| Укажи уровень цифрой ||')

            const level = +args.shift()
            if (isNaN(level) || !isFinite(level)) return message.channel.send('Цифрой...')
            if (level <= 0) return message.channel.send('Шутки в сторону!')
            if (level > 999) return message.channel.send('Максимальный уровень — 999')

            if (!args.length) return message.channel.send('Роль укажи, гениус...')

            const role = findByName(message.guild.roles.cache, args.join(' '))
            if (!role) return message.channel.send(`Ты видишь роль **${args.join(' ')}**? Я нет. А если попробовать посмотреть через очки...?`)
            if (role.id === message.guild.roles.everyone.id) return message.channel.send('Нельзя использовать роль **@everyone**!')

            const tags = role.tags
            if (tags) {
                if (tags.botId) return message.channel.send(`Роль **${role.name}** принадлежит боту **<@!${tags.botId}**.`)
                if (tags.premiumSubscriberRole) return message.channel.send(`Роль **${role.name}** выдается только бустерам сервера...`)
            }

            if (role.managed) return message.channel.send(`Ролью **${role.name}** управляет какая-то интеграция.`)
            if (!role.editable) return message.channel.send(`Я не смогу выдавать роль **${role.name}** участникам сервера, так как она выше моей наивысшей.`)
            if (message.member.roles.cache.size !== 1 && role.position >= message.member.roles.highest.position) return message.channel.send('Нужна роль ниже твоей наивысшей...')

            const exists = levels.roles.some(l => l.id === role.id && l.level === level)
            if (exists) message.guild.data.update({ $pull: { 'levels.roles': { id: role.id, level } } })
            else message.guild.data.update({ $push: { 'levels.roles': { id: role.id, level } } })

            message.channel.send(!exists ? `Роль **${role.name}** была назначена как роль за **${level}** уровень.`
                : `Роль **${role.name}** больше не будет выдаваться при достижении **${level}** уровня.`)

            const users = await xee.db.collection('members').find({ guild: message.guild.id }).toArray()
            return users.filter(user => MemberData.xpMethod(user.xp, 'level') === level).forEach(async user => {
                const member = await message.guild.members.fetch(user.user)
                member.roles[exists ? 'remove' : 'add'](role, `роль за ${level} уровень ${exists ? 'удалена' : 'установлена'}`)
            })
        } else if (subcommand === 'ignore') {
            const ignore = levels.ignore?.filter(c => message.guild.channels.cache.has(c)) || []
            if (!args.length) return splitMessage(message.channel, (ignore?.length ? 
                '```Игнорируемые ботом каналы```\n' + ignore.map((c, i) => `${++i}. <#${c}>`) : '' + `\nЧтобы занести канал в игнорируемые, используйте \`${options.prefix}${options.usage} ignore <#канал>\``), { char: '\n' })

            const channel = findChannel(message, args.join(' '), { text: true })
            if (!channel) return message.channel.send(`Ты уверен в наличии канала ${args.join(' ').slice(0, 60)} на сервере?`)
            if (!channel.viewable) return message.channel.send(`Зачем? Я и так не могу видеть что находится в канале ${channel}`)

            if (!message.guild.data.levels.ignore) await message.guild.data.update({ $set: { 'levels.ignore': [] } })
            await message.guild.data.update({ [ignore.includes(channel.id) ? '$pull' : '$push']: { 'levels.ignore': channel.id } })

            return message.channel.send(message.guild.data.levels.ignore.includes(channel.id) ? 
                `${channel} добавлен в список игнорируемых каналов. Это значит, что при общении в нем опыт повышаться не будет.` : 
                `${channel} был удален из игнорируемых каналов.`
            )
        } else if (subcommand === 'messagechannel') {
            const exists = message.guild.channels.cache.get(levels.message?.channel)?.permissionsFor(message.guild.me)?.has('SEND_MESSAGES')
            if (!exists) return message.channel.send('Сначала нужно создать сообщение о повышении уровня.')

            await message.guild.data.update({ $set: { 'levels.message.messageChannel': !levels.message.messageChannel } })
            return message.channel.send(`Настройки отправки сообщения о повышении уровня обновлены.`)
        } else if (subcommand === 'message') {
            const exists = message.guild.channels.cache.get(levels.message?.channel)?.permissionsFor(message.guild.me)?.has('SEND_MESSAGES')

            if (!args.length) {
                if (!exists) return message.channel.send('Сообщение о повышении уровня отсутствует.')

                const answer = await (new Confirmation(message).setContent('Вы точно хотите удалить сообщение о повышении уровня?').awaitResponse(true))
                if (!answer) return message.channel.send('Ну ладно уж...')

                await message.guild.data.update({ $set: { 'levels.message': null } })
                return message.channel.send('Сообщение о повышении уровня было удалено.')
            }

            const channel = findChannel(message, args.shift(), { text: true })
            if (!channel) return message.channel.send('Такого текстового канала не существует. Включи мозги.')
            if (!channel.viewable || !channel.permissionsFor(message.member).has('VIEW_CHANNEL')) return message.channel.send(`Я притворюсь, что не вижу такой канал.`)
            if (!channel.permissionsFor(message.member).has('SEND_MESSAGGES')) return message.channel.send(`Ты точно можешь писать в канал ${channel}? Облом`)
            if (!channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return message.channel.send(`Я не могу писать в канал ${channel}, проверь мои права.`)

            let _time = 0
            if (args.length && parseDuration(args[0])) {
                _time = parseDuration(args.shift())
                if (_time <= 1000) return message.channel.send('А в чем тогда вообще смысл удалять сообщение?')
                else if (_time > 120000) return message.channel.send('Меньше 2-х минут пожалуйста...')
            }

            if (!args.length) return message.channel.send('Что писать-то?')
            const content = args.join(' ').slice(0, 1800)

            let _message = `Сообщение о повышении уровня было установлено в канале ${channel}.`

            if (exists) {
                if (levels.message.content === content && levels.message.channel === channel.id) return message.channel.send('Ничего же не изменилось...')
                if (message.channel.permissionsFor(message.guild.me).has(['READ_MESSAGE_HISTORY', 'ADD_REACTIONS'])) {
                    await message.channel.send('Сообщение уже было. Можешь выбрать, обновлять его или нет.')

                    const answer = await (
                        new Confirmation(message)
                            .setContent({
                                embeds: [
                                    new MessageEmbed()
                                        .setColor(xee.settings.color)
                                        .addField('До изменения', xee.commands.resolve('goodbye').format(levels.message.content))
                                        .addField('После изменения', xee.commands.resolve('goodbye').format(content))
                                ]
                            })
                            .awaitResponse()
                    )
                    
                    answer.delete()
                    if (answer.data === false) return message.channel.send('Ок')
                }
                _message = 'Сообщение о повышении уровня было изменено.'
            }


            await message.guild.data.update({ $set: { 'levels.message': {
                content, channel: channel.id, time: _time || null
            } } })

            return message.channel.send(_message + (_time ? ` Кстати, сообщение будет удаляться спустя ${xee.constructor.ruMs(_time, true)}, круто, не правда ли?` : ''))
        } else if (subcommand === 'voicexp') {
            await message.guild.data.update({ $set: { 'levels.voiceXp': !message.guild.data.levels.voiceXp } })

            if (!message.guild.data.levels.voiceXp) {
                xee.db.collection('members').updateMany({ guild: message.guild.id }, { $unset: {   
                    inVoice: '', joinTime: '', voiceTime: ''
                } })
            } else {
                for (const channel of message.guild.channels.cache.values()) {
                    if (channel.type !== 'GUILD_VOICE') continue
                    if (channel.id === message.guild.afkChannelId) continue

                    const channelSize = channel.members.filter(member => !member.voice?.mute && !member.user.bot).size
                    if (channelSize < 1) continue

                    for (const member of channel.members.values()) {
                        const memberData = await member.getData()
                        memberData.startVoice()
                    }
                }
            }

            return message.channel.send(message.guild.data.levels.voiceXp ? 'Теперь опыт можно получать за общение в голосовых каналах.' : 'Опыт за голосовой онлайн больше не капает...')
        } else if (subcommand === 'cooldown') {
            if (args.length && !parseDuration(args[0])) return message.channel.send('Балда, укажи нормальную длительность')

            const cooldown = parseDuration(args[0] || '1m')
            if (cooldown > 12e4 || 5e3 > cooldown) return message.channel.send('Кулдаун не должен быть больше 2-х минут, но и меньше 5 секунд') 

            await message.guild.members.cache.forEach(user => clearTimeout(user.data?.cooldown))
            await message.guild.data.update({ $set: { 'levels.cooldown': cooldown } })
            return message.channel.send(`Кулдаун получения XP установлен: **${xee.constructor.ruMs(cooldown)}**`)
        } else if (subcommand === 'messagexp') {
            if (!args.length) return message.channel.send('Укажи сколько XP будет капать с сообщения. Примеры:\n' + 
                `\`${options.prefix}${options.usage} messgaexp 10\`: участники будут получать 10 XP за сообщение\n` +
                `\`${options.prefix}${options.usage} messgaexp 15 50\`: участники будут получать от 15 до 50 XP`
            )

            const entries = []

            const verifyNumber = (number) => {
                if (isNaN(number) && !isFinite(number)) return message.channel.send(`Где в ${number} ты видишь число?`)
                if (number > 50) return message.channel.send('Число должно быть меньше 50')
                if (number < 5) return message.channel.send(`${number} < 5, понимаешь?`)
            }

            if (verifyNumber(+args[0]) instanceof Promise) return
            else entries.push(+args[0])

            if (args[1] && verifyNumber(+args[1]) instanceof Promise) return
            else if (entries[0] !== +args[1]) entries.push(+args[1])
            if (entries[0] > entries[1]) entries.reverse()

            await message.guild.members.cache.forEach(member => clearTimeout(member.data?.cooldown))
            await message.guild.data.update({ $set: { 'levels.messageXp': entries } })
            return message.channel.send(`Теперь за одно сообщение участник сервера будет получать **${entries[1] ? `от ${entries[0]} до ${entries[1]}` : entries[0]} XP**!`)
        } else {
            const member = await findMember(message, subcommand)
            if (!member) return message.channel.send('Такого участника вообще-то нет.')
            if (member.id === message.author.id && !member.permissions.has('ADMINISTRATOR')) return message.channel.send('Нет =\(')
            if (member.permissions.has('ADMINISTRATOR') && !message.member.permissions.has('ADMINISTRATOR')) return message.channel.send('Ты не можешь так сделать!')

            if (!args.length) return message.channel.send('На какой уровень прыгать-то?')
            const toLevel = +args.shift()
            if (isNaN(toLevel) || !isFinite(toLevel)) return message.channel.send('Сомневаюсь, что это цифра...')
            if (toLevel <= 0) return message.channel.send('Не надоело?')
            if (toLevel > 999) return message.channel.send('Максимальный уровень — 999')

            const memberData = await member.getData()
            if (memberData.level === toLevel) return message.channel.send(`У **${member.user.tag}** уже был ${toLevel} уровень (когда?)`)

            memberData.xp = 0
            memberData.level = toLevel
            memberData.totalXp = MemberData.levelToXp(toLevel)

            memberData.fetchRoles()
            memberData.update({ $set: { xp: memberData.totalXp } })
            return message.channel.send(`**${member.user.tag}** получает ${toLevel} уровень. Ого?`)
        }
    }
}
