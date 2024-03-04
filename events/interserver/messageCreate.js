const { MessageEmbed } = require('discord.js')
const  { isImage } = require('../../client/util')

module.exports = {
    execute: async function (message) {
        if (message.author.bot) return
        if (!message.content.length && !message.attachments.size && !message.stickers.size) return

        const interserver = xee.store.interservers.find(x => x.webhooks.some(w => w.channel === message.channel.id))
        if (!interserver) return

        if (interserver.block?.some(b => b.user === message.author.id)) return

        const images = [...message.attachments.filter(isImage).values()]
        const content = interserver.getContent(message)

        const sticker = message.stickers.find(sticker => sticker.format === 'PNG')
        if (sticker) images.unshift(sticker.url)

        const embed = new MessageEmbed()
            .setColor(xee.settings.color)

        const image = images.pop()
        if (image) embed.setTitle(image.name ?? 'Стикер').setImage(image.proxyURL ?? image)
    
        const imagesEmbeds = images.map(image => ({ title: image.name, color: xee.settings.color, image: { url: image.proxyURL } }))

        if (content.length > 2000) embed.setDescription(content)

        const payload = {
            username: message.author.tag,
            avatar_url: message.author.displayAvatarURL({ format: 'png' }),
            allowed_mentions: { parse: [] }
        }

        if (content.length > 2000) {
            payload.embeds = [embed]
        } else payload.content = content
        if (image) payload.embeds = [embed]

        if (imagesEmbeds.length) {
            payload.embeds.push(...imagesEmbeds)
        }

        interserver.sendLog({
            content: message.id, 
            embeds: [
                new MessageEmbed()
                    .setTimestamp()
                    .setColor(xee.settings.color)
                    .setTitle(`Канал: ${message.channel.id}`)
                    .setDescription(`\`\`\`${message.content.replace(new RegExp('`', 'g'), '\'') || ' '}\`\`\``)
                    .setAuthor({ name: `Автор: ${message.author.id}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setFooter(`Сервер: ${message.guild.id}`).toJSON()
            ]
        })

        let reference
        if (message.reference && message.channel.permissionsFor(message.guild.me).has('READ_MESSAGE_HISTORY')) {
            reference = interserver.messages.find(m => m.messages.some(m => m.message === message.reference.messageId))
            if (reference) {
                const channel = await xee.client.channels.fetch(reference.channel, { allowUnknownGuild: true }).catch(() => null)
                if (channel) {
                    embed.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ format: 'jpeg' }) })
                    return xee.client.rest.api.channels(reference.channel).messages.post({
                        data: {
                            content: content.length <= 2000 ? content : null,
                            embeds: [ embed.toJSON() ],
                            allowed_mentions: {
                                parse: []
                            },
                            message_reference: {
                                message_id: reference.message,
                                channel_id: reference.channel,
                                guild_id: reference.guild
                            }
                        }
                    }).then(sent => {
                        interserver.messages.set(message.id, {
                            channel: message.channel.id,
                            guild: message.guild.id,
                            message: message.id,
                            bot: true,
                            messages: [{
                                channel: sent.channel_id,
                                message: sent.id
                            }]
                        })
                    })
                }
            }
        }

        interserver.sendMessage(payload, message, reference)
        // let _reply = interserver.messages.find(m => m.messages.some(m => m.message === message.reference?.messageId))
        // if (_reply && message.channel.permissionsFor(message.guild.me).has('READ_MESSAGE_HISTORY')) {
        //     return xee.client.rest.api.channels(_reply.channel)
        //         .messages.post({
        //             data: {
        //                 embed,
        //                 message_reference: {
        //                     message_id: _reply.message,
        //                     channel_id: _reply.channel,
        //                     guild_id: _reply.guild
        //                 }
        //             }
        //         }).then(m => interserver.messages.set(message.id, {
        //             channel: message.channel.id,
        //             message: message.id,
        //             guild: message.guild.id,
        //             messages: [{ channel: m.channel_id, message: m.id }]
        //         })).catch(() => null)
        /* } else*/
    },
    clean: function (txt) {
        return txt
    }
}
