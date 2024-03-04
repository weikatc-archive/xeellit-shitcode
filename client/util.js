const { Util: _Util, Message, Constants, MessageActionRow, MessageSelectMenu } = require('discord.js')

const finder = require('./finder')
const { readdir } = require('fs/promises')

const units = ['K', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y']
const emojisRegex =/(?:\ud83d\udc68\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c\udffb|\ud83d\udc68\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffc]|\ud83d\udc68\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffd]|\ud83d\udc68\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffe]|\ud83d\udc69\ud83c\udffb\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffc-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffd-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c\udffb|\ud83d\udc69\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffc\udffe\udfff]|\ud83d\udc69\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb\udffc]|\ud83d\udc69\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffd\udfff]|\ud83d\udc69\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb-\udffd]|\ud83d\udc69\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffe]|\ud83d\udc69\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb-\udffe]|\ud83e\uddd1\ud83c\udffb\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c\udffb|\ud83e\uddd1\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb\udffc]|\ud83e\uddd1\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udffd]|\ud83e\uddd1\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udffe]|\ud83e\uddd1\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udfff]|\ud83e\uddd1\u200d\ud83e\udd1d\u200d\ud83e\uddd1|\ud83d\udc6b\ud83c[\udffb-\udfff]|\ud83d\udc6c\ud83c[\udffb-\udfff]|\ud83d\udc6d\ud83c[\udffb-\udfff]|\ud83d[\udc6b-\udc6d])|(?:\ud83d[\udc68\udc69])(?:\ud83c[\udffb-\udfff])?\u200d(?:\u2695\ufe0f|\u2696\ufe0f|\u2708\ufe0f|\ud83c[\udf3e\udf73\udf93\udfa4\udfa8\udfeb\udfed]|\ud83d[\udcbb\udcbc\udd27\udd2c\ude80\ude92]|\ud83e[\uddaf-\uddb3\uddbc\uddbd])|(?:\ud83c[\udfcb\udfcc]|\ud83d[\udd74\udd75]|\u26f9)((?:\ud83c[\udffb-\udfff]|\ufe0f)\u200d[\u2640\u2642]\ufe0f)|(?:\ud83c[\udfc3\udfc4\udfca]|\ud83d[\udc6e\udc71\udc73\udc77\udc81\udc82\udc86\udc87\ude45-\ude47\ude4b\ude4d\ude4e\udea3\udeb4-\udeb6]|\ud83e[\udd26\udd35\udd37-\udd39\udd3d\udd3e\uddb8\uddb9\uddcd-\uddcf\uddd6-\udddd])(?:\ud83c[\udffb-\udfff])?\u200d[\u2640\u2642]\ufe0f|(?:\ud83d\udc68\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d[\udc68\udc69]|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\u2764\ufe0f\u200d\ud83d\udc68|\ud83d\udc68\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d[\udc68\udc69]|\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83c\udff3\ufe0f\u200d\ud83c\udf08|\ud83c\udff4\u200d\u2620\ufe0f|\ud83d\udc15\u200d\ud83e\uddba|\ud83d\udc41\u200d\ud83d\udde8|\ud83d\udc68\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83d\udc6f\u200d\u2640\ufe0f|\ud83d\udc6f\u200d\u2642\ufe0f|\ud83e\udd3c\u200d\u2640\ufe0f|\ud83e\udd3c\u200d\u2642\ufe0f|\ud83e\uddde\u200d\u2640\ufe0f|\ud83e\uddde\u200d\u2642\ufe0f|\ud83e\udddf\u200d\u2640\ufe0f|\ud83e\udddf\u200d\u2642\ufe0f)|[#*0-9]\ufe0f?\u20e3|(?:[©®\u2122\u265f]\ufe0f)|(?:\ud83c[\udc04\udd70\udd71\udd7e\udd7f\ude02\ude1a\ude2f\ude37\udf21\udf24-\udf2c\udf36\udf7d\udf96\udf97\udf99-\udf9b\udf9e\udf9f\udfcd\udfce\udfd4-\udfdf\udff3\udff5\udff7]|\ud83d[\udc3f\udc41\udcfd\udd49\udd4a\udd6f\udd70\udd73\udd76-\udd79\udd87\udd8a-\udd8d\udda5\udda8\uddb1\uddb2\uddbc\uddc2-\uddc4\uddd1-\uddd3\udddc-\uddde\udde1\udde3\udde8\uddef\uddf3\uddfa\udecb\udecd-\udecf\udee0-\udee5\udee9\udef0\udef3]|[\u203c\u2049\u2139\u2194-\u2199\u21a9\u21aa\u231a\u231b\u2328\u23cf\u23ed-\u23ef\u23f1\u23f2\u23f8-\u23fa\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600-\u2604\u260e\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262a\u262e\u262f\u2638-\u263a\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267b\u267f\u2692-\u2697\u2699\u269b\u269c\u26a0\u26a1\u26aa\u26ab\u26b0\u26b1\u26bd\u26be\u26c4\u26c5\u26c8\u26cf\u26d1\u26d3\u26d4\u26e9\u26ea\u26f0-\u26f5\u26f8\u26fa\u26fd\u2702\u2708\u2709\u270f\u2712\u2714\u2716\u271d\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u2764\u27a1\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299])(?:\ufe0f|(?!\ufe0e))|(?:(?:\ud83c[\udfcb\udfcc]|\ud83d[\udd74\udd75\udd90]|[\u261d\u26f7\u26f9\u270c\u270d])(?:\ufe0f|(?!\ufe0e))|(?:\ud83c[\udf85\udfc2-\udfc4\udfc7\udfca]|\ud83d[\udc42\udc43\udc46-\udc50\udc66-\udc69\udc6e\udc70-\udc78\udc7c\udc81-\udc83\udc85-\udc87\udcaa\udd7a\udd95\udd96\ude45-\ude47\ude4b-\ude4f\udea3\udeb4-\udeb6\udec0\udecc]|\ud83e[\udd0f\udd18-\udd1c\udd1e\udd1f\udd26\udd30-\udd39\udd3d\udd3e\uddb5\uddb6\uddb8\uddb9\uddbb\uddcd-\uddcf\uddd1-\udddd]|[\u270a\u270b]))(?:\ud83c[\udffb-\udfff])?|(?:\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc65\udb40\udc6e\udb40\udc67\udb40\udc7f|\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc73\udb40\udc63\udb40\udc74\udb40\udc7f|\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc77\udb40\udc6c\udb40\udc73\udb40\udc7f|\ud83c\udde6\ud83c[\udde8-\uddec\uddee\uddf1\uddf2\uddf4\uddf6-\uddfa\uddfc\uddfd\uddff]|\ud83c\udde7\ud83c[\udde6\udde7\udde9-\uddef\uddf1-\uddf4\uddf6-\uddf9\uddfb\uddfc\uddfe\uddff]|\ud83c\udde8\ud83c[\udde6\udde8\udde9\uddeb-\uddee\uddf0-\uddf5\uddf7\uddfa-\uddff]|\ud83c\udde9\ud83c[\uddea\uddec\uddef\uddf0\uddf2\uddf4\uddff]|\ud83c\uddea\ud83c[\udde6\udde8\uddea\uddec\udded\uddf7-\uddfa]|\ud83c\uddeb\ud83c[\uddee-\uddf0\uddf2\uddf4\uddf7]|\ud83c\uddec\ud83c[\udde6\udde7\udde9-\uddee\uddf1-\uddf3\uddf5-\uddfa\uddfc\uddfe]|\ud83c\udded\ud83c[\uddf0\uddf2\uddf3\uddf7\uddf9\uddfa]|\ud83c\uddee\ud83c[\udde8-\uddea\uddf1-\uddf4\uddf6-\uddf9]|\ud83c\uddef\ud83c[\uddea\uddf2\uddf4\uddf5]|\ud83c\uddf0\ud83c[\uddea\uddec-\uddee\uddf2\uddf3\uddf5\uddf7\uddfc\uddfe\uddff]|\ud83c\uddf1\ud83c[\udde6-\udde8\uddee\uddf0\uddf7-\uddfb\uddfe]|\ud83c\uddf2\ud83c[\udde6\udde8-\udded\uddf0-\uddff]|\ud83c\uddf3\ud83c[\udde6\udde8\uddea-\uddec\uddee\uddf1\uddf4\uddf5\uddf7\uddfa\uddff]|\ud83c\uddf4\ud83c\uddf2|\ud83c\uddf5\ud83c[\udde6\uddea-\udded\uddf0-\uddf3\uddf7-\uddf9\uddfc\uddfe]|\ud83c\uddf6\ud83c\udde6|\ud83c\uddf7\ud83c[\uddea\uddf4\uddf8\uddfa\uddfc]|\ud83c\uddf8\ud83c[\udde6-\uddea\uddec-\uddf4\uddf7-\uddf9\uddfb\uddfd-\uddff]|\ud83c\uddf9\ud83c[\udde6\udde8\udde9\uddeb-\udded\uddef-\uddf4\uddf7\uddf9\uddfb\uddfc\uddff]|\ud83c\uddfa\ud83c[\udde6\uddec\uddf2\uddf3\uddf8\uddfe\uddff]|\ud83c\uddfb\ud83c[\udde6\udde8\uddea\uddec\uddee\uddf3\uddfa]|\ud83c\uddfc\ud83c[\uddeb\uddf8]|\ud83c\uddfd\ud83c\uddf0|\ud83c\uddfe\ud83c[\uddea\uddf9]|\ud83c\uddff\ud83c[\udde6\uddf2\uddfc]|\ud83c[\udccf\udd8e\udd91-\udd9a\udde6-\uddff\ude01\ude32-\ude36\ude38-\ude3a\ude50\ude51\udf00-\udf20\udf2d-\udf35\udf37-\udf7c\udf7e-\udf84\udf86-\udf93\udfa0-\udfc1\udfc5\udfc6\udfc8\udfc9\udfcf-\udfd3\udfe0-\udff0\udff4\udff8-\udfff]|\ud83d[\udc00-\udc3e\udc40\udc44\udc45\udc51-\udc65\udc6a-\udc6d\udc6f\udc79-\udc7b\udc7d-\udc80\udc84\udc88-\udca9\udcab-\udcfc\udcff-\udd3d\udd4b-\udd4e\udd50-\udd67\udda4\uddfb-\ude44\ude48-\ude4a\ude80-\udea2\udea4-\udeb3\udeb7-\udebf\udec1-\udec5\uded0-\uded2\uded5\udeeb\udeec\udef4-\udefa\udfe0-\udfeb]|\ud83e[\udd0d\udd0e\udd10-\udd17\udd1d\udd20-\udd25\udd27-\udd2f\udd3a\udd3c\udd3f-\udd45\udd47-\udd71\udd73-\udd76\udd7a-\udda2\udda5-\uddaa\uddae-\uddb4\uddb7\uddba\uddbc-\uddca\uddd0\uddde-\uddff\ude70-\ude73\ude78-\ude7a\ude80-\ude82\ude90-\ude95]|[\u23e9-\u23ec\u23f0\u23f3\u267e\u26ce\u2705\u2728\u274c\u274e\u2753-\u2755\u2795-\u2797\u27b0\u27bf\ue50a])|\ufe0f/g
module.exports = class Util {
    static mergeDefault(defaultOptions, given = {}) {
        if (!Object.keys(given).length) return defaultOptions
        let obj = { ...defaultOptions }
        
        for (const [ name, value ] of Object.entries(given)) {
            if (name in obj && typeof obj[name] === 'object') obj[name] = Util.mergeDefault(obj[name], value)
            else obj[name] = value
        }
    
        return obj
    }

    static parseMs(ms) {
        const round = ms > 0 ? Math.floor : Math.ceil

        return {
            days: round(ms / 86400000),
            hours: round(ms / 3600000) % 24,
            minutes: round(ms / 60000) % 60,
            seconds: round(ms / 1000) % 60
        }
    }

    static chunk(str, size) {
        return Array.from({ length: Math.ceil(str.length / size) }, (_, n) => str.slice(n * size, n * size + size))
    }

    static splitMessage(channel, content, { char = '\n', mapFunc = x => x }) {
        return Promise.all(_Util.splitMessage(content, { char }).map(mapFunc).map(c => channel.send(c)))
    }

    static firstUpper(text) {
        if (Array.isArray(text)) text = text.shift()
        if (!text) return ''
        return text.charAt(0).toUpperCase() + text.slice(1)
    }

    /**
     * @param {String} string 
     * @description Emoji parser
     */
    static parseEmoji(string) {
        try {
            let parsed = _Util.parseEmoji(string)
            if (!parsed) return null

            let output = {
                id: null,
                name: null,
                animated: false
            }

            if (!parsed.id) {
                if (emojisRegex.test(string) === false) return null
                output.name = string.match(emojisRegex)[0]
            } else {
                if (!xee.client.emojis.cache.has(parsed.id)) return null
                let emoji = xee.client.emojis.cache.get(parsed.id)  
                output.name = emoji.name
                output.id = String(emoji.id)
                output.animated = emoji.animated
            }

            return output
        } catch (error) { 
            console.log(error)
            return null 
        }
    }

    /**
     * @param {Message} message 
     * @param {String} string 
     * @returns {import('discord.js').GuildMember}
     */

    static async findMember(message, string, members) {
        const id = string.match(/\d{17,19}/)?.[0]
        if (!members && id && !!(await message.guild.members.fetch(id).catch(() => null))) return message.guild.members.cache.get(id) 
        if (!members) members = message.guild.memberCount / message.guild.members.cache.size >= 5 ? await message.guild.members.fetch() : message.guild.members.cache
        return finder.findMember(members, string, message)
    }

    static isMod(message, permission = 'MANAGE_MESSAGES', member) {
        if (!member) member = message.member
        return member.permissions.has(permission) || member.roles.cache.has(message.guild.data.modRole)
    }

    static parseDuration(str) {
        if (!str) return 0

        const msStrings = {
            s: 1000,
            m: 1000 * 60,
            h: 1000 * 60 * 60,
            d: 1000 * 60 * 60 * 24,
            w: 1000 * 60 * 60 * 24 * 7,
            y: 1000 * 60 * 60 * 24 * 365.25
        }
        const msRegex = new RegExp(Object.keys(msStrings).map(s => `([\\d.]+?${s})`).join('|'), 'gi')

        return [ ...str.matchAll(msRegex) ].map(m => m.slice(1).find(Boolean)).map(str => msStrings[str.slice(-1)] * str.slice(0, -1)).reduce((sum, n) => sum + n, 0)
    }

    /**
     * @param {Message} message 
     * @param {String} string 
     */
    static findChannel(message, string, options = {}) {
        let channels = message.guild.channels.cache
        if (options.text) channels = channels.filter(c => c.isText())
        if (options.type) channels = message.guild.channels.cache.filter(x => x.type === options.type.toUpperCase())
        if (string?.toLowerCase() === 'here' && channels.has(message.channel.id)) return message.channel

        if (!channels.size) return null
        else return finder.findByName(channels, string)
    }

    static bbcodeMarkdown(text) {
        if (typeof text !== 'string') return ''

        if (text.search(/TF2Toolbox/gmi) != -1) {
            text = text
                .replace(/(\(List generated at .+?\[\/URL\]\))((?:.|\n)+)/gmi, '$2\n\n\n$1')
                .replace('(List generated at', '(List generated from')
                .replace(/[^\S\n]+\(List/gmi, '(List')
                .replace(/\[b\]\[u\](.+?)\[\/u\]\[\/b\]/gmi, '[b]$1[/b]\n') 
                .replace(/(\n)\[\*\]\[b\](.+?)\[\/b\]/gmi, '$1\[\*\] $2')
        }

        text = text
            .replace(/\[b\]((?:.|\n)+?)\[\/b\]/gmi, '**$1**')
            .replace(/\[\i\]((?:.|\n)+?)\[\/\i\]/gmi, '*$1*') 
            .replace(/\[\u\]((?:.|\n)+?)\[\/\u\]/gmi, '$1')  
            .replace(/\[s\]((?:.|\n)+?)\[\/s\]/gmi, '~~ $1~~') 
            .replace(/\[center\]((?:.|\n)+?)\[\/center\]/gmi, '$1') 
            .replace(/\[quote\=.+?\]((?:.|\n)+?)\[\/quote\]/gmi, '$1') 
            .replace(/\[size\=.+?\]((?:.|\n)+?)\[\/size\]/gmi, '## $1')
            .replace(/\[color\=.+?\]((?:.|\n)+?)\[\/color\]/gmi, '$1') 
            .replace(/\[list\=1\]((?:.|\n)+?)\[\/list\]/gmi, function (match, p1, offset, string) { return p1.replace(/\[\*\]/gmi, '1. ') })
            .replace(/(\n)\[\*\]/gmi, '$1* ') 
            .replace(/\[\/*list\]/gmi, '')
            .replace(/\[url=(.+?)\]((?:.|\n)+?)\[\/url\]/gmi, '[$2]($1)')
            .replace(/\[code\](.*?)\[\/code\]/gmi, '`$1`')
            .replace(/\[code\]((?:.|\n)+?)\[\/code\]/gmi, function (match, p1, offset, string) { return p1.replace(/^/gmi, '    ') })
            .replace(/\[php\](.*?)\[\/php\]/gmi, '`$1`')
            .replace(/\[php\]((?:.|\n)+?)\[\/php\]/gmi, function (match, p1, offset, string) { return p1.replace(/^/gmi, '    ') })
            .replace(/\[pawn\](.*?)\[\/pawn\]/gmi, '`$1`')
            .replace(/\[pawn\]((?:.|\n)+?)\[\/pawn\]/gmi, function (match, p1, offset, string) { return p1.replace(/^/gmi, '    ') })
        return text
    }

    static normalizeNumber(num, digits) {
         for (let i = units.length - 1; i >= 0; i--) {
            const decimal = Math.pow(1000, i + 1)
    
            if (num <= -decimal || num >= decimal) {
                return +(num / decimal).toFixed(digits) + units[i]
            }
        }
        return num
    }

    static formatDate(ms, flag) {
        return `<t:${Math.floor(new Date(ms) / 1000)}${flag ? ':' + flag : ''}>`
    }

    static selectReason(type, message, options) {
        const { user, placeholder, menuOptions, content } = options
        const customId = message.id + '-' + type + '-reason'

        return new Promise(async resolve => {
            const selector = await message.channel.send({
                content,
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageSelectMenu()
                                .setCustomId(customId)
                                .setPlaceholder(placeholder)
                                .addOptions(menuOptions)
                        )
                ]
            })

            const selected = await selector.awaitMessageComponent({
                filter: d => d.customId === customId && d.user.id === user,
                time: 60000
            }).catch(() => null)

            await selector.delete().catch(() => {})
            return resolve(+selected?.values.shift())
        })
    }

    static isImage(attachment) {
        return attachment.contentType?.startsWith('image/') && !attachment.contentType?.endsWith('/webp')
    }

    static getInterserverContent(message) {
        // const images = [...message.attachments.filter(isImage).values()]
        // const content = interserver.getContent(message)

        // const sticker = message.stickers.find(sticker => sticker.format === 'PNG')
        // if (sticker) images.unshift(sticker.url)

        // const embed = new MessageEmbed()
        //     .setColor(xee.settings.color)

        // const image = images.pop()
        // if (image) embed.setTitle(image.name ?? 'Стикер').setImage(image.proxyURL ?? image)
    
        // const imagesEmbeds = images.map(image => ({ title: image.name, color: xee.settings.color, image: { url: image.proxyURL } }))

        // if (content.length > 2000) embed.setDescription(content)

        // const payload = {
        //     username: message.author.tag,
        //     avatar_url: message.author.displayAvatarURL({ format: 'png' }),
        //     allowed_mentions: { parse: [] }
        // }

        // if (content.length > 2000) {
        //     payload.embeds = [embed]
        // } else payload.content = content
        // if (image) payload.embeds = [embed]

        // console.log(payload)

        // if (imagesEmbeds.length) {
        //     payload.embeds.push(...imagesEmbeds)
        // }

    }
}
