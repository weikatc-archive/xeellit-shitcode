const { findChannel } = require('../../client/util')

let lastChannel
let lastPlayed

module.exports = {
    command: {
        ownerOnly: true,
        description: 'зайти в голосовой канал',
        usage: '<#канал | exit | play | pause>',
        examples: {
            '{{prefix}}voice exit': 'выйдет из текущего канала',
            '{{prefix}}voice': 'зайдет в тот канал, в которым находитесь вы'
        }
    },
    execute: async function(message, args, options) {
        const connection = xee.client.voice.connections.first()
        if (!connection) {
            let channel = message.member.voice?.channel
            if (!channel) {
                if (!args[0]) return message.channel.send('Ты должен сказать мне канал, в который я должен зайти. Но ты этого не сделал...')
                if (args[0].toLowerCase() === 'last' && message.guild.channels.cache.has(lastChannel)) channel = message.guild.channels.cache.get(lastChannel)
                else channel = findChannel(message, args.join(' '), {
                    type: 'GUILD_VOICE'
                })
                if (!channel) return message.channel.send(`Я не нашел канала **${args.join(' ')}**`)
            }
            if (channel.full && !channel.permissionsFor(message.guild.me).has('MANAGE_CHANNELS')) return message.channel.send(`Канал **${channel.name}** заполнен, войти не могу`)
            if (!channel.permissionsFor(message.guild.me).has('CONNECT')) return message.channel.send(`У меня нету права заходить в канал **${channel.name}**`)
            return channel.join()
                .then(() => message.channel.send(`Я подключился к каналу **${channel.name}**`))
                .catch(e => message.channel.send(`Я не смог зайти в голосовой канал **${channel.name}**.\n${e.message}`))
        } else {
            switch (args[0]?.toLowerCase()) {
                case 'play':
                    if (!args[1]) return message.channel.send('Ты забыл указать ссылку на источник, да...')
                    if (args[1].toLowerCase() === 'last' && lastPlayed) args = ['play', lastPlayed]

                    try {
                        lastPlayed = args.slice(1).join(' ')
                        connection.play(args.slice(1).join(' '))
                        message.channel.send(`Включаю **${args.slice(1).join(' ')}** в канале **${connection.channel.name}**`)
                    } catch (error) {
                        if (error.message.startsWith('Error: Cannot find module')) return message.channel.send('Опус не найден, поэтому, ничего не будет воспроизводится')
                        else return message.channel.send('Возникла ошибка при воспроизведении:\n' + e.message)
                    }
                    break

                case 'pause':
                    if (!connection.dispatcher) return message.channel.send('Но ведь сейчас ничего не играет...')
                    if (connection.dispatcher.paused) {
                        connection.dispatcher.resume()
                        return message.channel.send('▶️')
                    } else {
                        connection.dispatcher.pause()
                        return message.channel.send('⏸️')
                    }

                case 'exit':
                    lastChannel = connection.channel.id
                    await connection.disconnect()
                    return message.channel.send(`Я вышел из канала **${lastChannel}**`)
                
                case undefined: 
                    return message.channel.send(xee.commands.help('voice', options.prefix))
                default:
                    return message.channel.send(`Подкоманды **${args[0].toLowerCase()}** не существует`)
            }
        }
    }
}