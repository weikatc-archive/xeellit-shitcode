const { MessageEmbed } = require('discord.js')

const cache = new Map()

function findLog(log) {
    if (log.extra.count === 1) return log.executor && Math.abs(log.createdTimestamp - Date.now()) < 500
    
    const cached = cache.get(log.id)
    cache.set(log.id, log.extra.count)
    
    if (!cached) return
    if (log.extra.count > cached) return true
}

module.exports = {
    async messageDelete(message) {
        if (!xee.redis?.ready) return

        const guild = message.channel.guild
        const guildData = await guild.getData()
        if (!guildData.logsChannel?.permissionsFor?.(guild.me)?.has(['SEND_MESSAGES', 'EMBED_LINKS'])) return

        const content = await xee.redis.getAsync(message.id).then(r => r ? JSON.parse(r) : r)
        if (!content) return
        else xee.redis.del(message.id)
            
        let log
        if (guild.members.me.permissions.has('VIEW_AUDIT_LOG')) {
            const logs = await guild.fetchAuditLogs({ limit: 5, type: 'MESSAGE_DELETE' })
            log = logs.entries.find(findLog)
        }
            
        if (!message.author) message.author = await xee.client.users.fetch(content.u).catch(() => null)
        if (!message.author) return
            
            
        const embed = new MessageEmbed()
            .setColor('RED')
            .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Сообщение из канала ${message.channel} было удалено${log?.executor ? ` ${log.executor.bot ? 'ботом' : 'участником'} ${log.executor}` : ''}`)
            .setFooter(`${message.id}\n└ Канал: ${message.channel.id}${log?.executor ? `\n└ Удаливший: ${log.executor.id}` : ''}`)
                
            
        if (content.c) embed.addField('Содержание', content.c.slice(0, 1024))
        guildData.entries.addLog(embed)
    },

    async messageUpdate(_, message) {
        if (!xee.redis?.ready) return

        const guild = message.channel.guild
        const guildData = await guild.getData()
        if (!guildData.logsChannel?.permissionsFor?.(guild.me)?.has(['SEND_MESSAGES', 'EMBED_LINKS'])) return

        if (message.partial) await message.fetch().catch(() => null)
        if (!message.author) return

        if (message.author?.partial) await message.author.fetch()
        if (message.webhookId || message.author?.bot) return

        const old = await xee.redis.getAsync(message.id).then(r => r ? JSON.parse(r) : r)
        const embed = new MessageEmbed()
            .setColor('BLUE')
            .setAuthor(`${message.author.tag} (${message.author.id})`, message.author.displayAvatarURL({ dynamic: true }))
            .setDescription(`[Сообщение](${message.url}) в канале ${message.channel} было изменено`)
            .setFooter(message.id + '\n└ Канал: ' + message.channel.id)
                
        if (old?.c === message.content) return
        if (old?.c?.length) embed.addField('Старое', old.c.slice(0, 1024))
        if (message.content.length) embed.addField('Новое', message.content.slice(0, 1024))
                
        xee.redis.setex(message.id, xee.config.messageCacheLifetime, JSON.stringify({ u: message.author.id, c: message.content.slice(0, 1024) }))
        guildData.entries.addLog(embed)
    },

    async messageDeleteBulk(messages) {
        if (!xee.redis?.ready) return

        if (!messages.size) return
        if (messages.size === 1) {
            const message = messages.first()
            message.guild = message.channel.guild
            return this.messageDelete(message)
        }
        
        const guild = messages.first()?.channel?.guild
        const guildData = await guild.getData()

        const channel = guildData.logsChannel
        if (!channel?.permissionsFor(channel.guild.me).has('ATTACH_FILES')) return

        const contents = await Promise.all(messages.map(message => xee.redis.getAsync(message.id).then(r => r ? JSON.parse(r) : null))).then(res => res.filter(Boolean))
        if (!contents.length) return

        await channel.send({ 
            content: `Удаленные сообщения из канала ${messages.first().channel} (их ${contents.length}):`,
            files: [{ 
                name: new Date().toLocaleString('ru', { timeZone: 'Europe/Moscow' }) + '.log', 
                attachment: Buffer.from(contents.map(c => `${c.u}: ${c.c}`).join('\n')) 
            }] 
        })
    }   
}
