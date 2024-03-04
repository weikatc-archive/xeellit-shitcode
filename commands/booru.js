const fetch = require('../client/fetch')

const { MessageEmbed } = require('discord.js')

const booruSites = {
    yandere: { url: 'https://yande.re/post.json?limit=100&tags=', random: true }, 
    danbooru: { url: 'https://danbooru.donmai.us/posts.json?limit=100&tags=', random: false, maxTags: 2, safe: 'rating:sensitive' }, 
    gelbooru: { url: 'https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&tags=', random: false, paginate: true, safe: 'rating:sensitive' }, 
    konachan: { url: 'https://konachan.com/post.json?limit=100&tags=', random: true }, 
    rule34: { url: 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=', random: false }, 
    tbib: { url: 'https://tbib.org/index.php?page=dapi&s=post&q=index&json=1&limit=50&tags=', random: false, paginate: true }, 
    safebooru: { url: 'https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=50&tags=', random: false, paginate: true },
    xbooru: { url: 'https://xbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=50&tags=', random: false, paginate: true }
}

const imagePrefix = ['xbooru.com', 'tbib.org', 'safebooru.org']

module.exports = {
    command: {
        description: 'поиск пикч по booru сайтам',
        usage: '<сайт> [теги ]',
        examples: {
            '{{prefix}}booru safebooru megumin': 'найдет пикчу с тегом megumin на safebooru.org',
            '{{prefix}}booru konachan': 'отправит рандомную пикчу с konachan'
        },
        aliases: Object.keys(booruSites),
        combine: true,
        permissions: { me: ['ATTACH_FILES'] }
    },
    execute: async function (message, args, options) {
        const removeCooldown = () => this.cooldowns ? this.cooldowns.delete(message.author.id) : null
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix)).then(removeCooldown)

        args[0] = args[0].toLowerCase()
        let searchSite = booruSites[args[0]]
        if (!searchSite) return message.channel.send(`Сервис \`${args[0].slice(0, 100)}\` мной не поддерживается`).then(removeCooldown)
        
        let tags = args.slice(1)
        const safe = searchSite.safe ?? 'rating:safe'

        if (!message.channel.nsfw && !tags.includes(safe) && args[0] !== 'safebooru') tags.unshift(safe)
        if (searchSite.random && !tags.some(t => t.startsWith('order:'))) tags.unshift('order:random')
        if (searchSite.maxTags) tags = tags.slice(0, searchSite.maxTags)

        if (['shota', 'loli'].some(x => tags.some(t => t.includes(x))) && !tags.includes(safe) && args[0] !== 'safebooru') return message.channel.send('На территории Discord такие запросы запрещены!')

        let images = await this.search(searchSite, tags)
        if (!images.length || images.every(i => !i.fileUrl)) return message.channel.send(`По ${tags.length === 1 ? 'тегу' : tags.length === 0 ? 'запросу' : 'тегам'} ${tags.map(t => `\`${t}\``).join(', ')} ничего не найдено`).then(removeCooldown)
  
        if (!message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'])) return message.channel.send(images.shift().fileUrl)

        let page = 1
        while (!0) {
            if (!images.length && !searchSite.paginate) break
            images = images.length && images || await this.search(searchSite, tags, ++page)
            if (!images.length) break

            message.channel.sendTyping()

            const url = images.shift()
            url._fileName = url.image || url.md5 && `${url.md5}.${url.file_ext || 'jpg'}` ||
                `${args[0].toLowerCase()}.${url.fileUrl.split('.').pop()}`
            
            const stream = await fetch(url.fileUrl, { stream: true })
            if (+stream.headers['content-length'] > 8 * 1024 * 1024) {
                stream.destroy()
                continue
            }

            const imageTags = Array.isArray(url.tags) ? url.tags.join(' ') : url.tags || url.tag_string
            if (['shota', 'loli'].some(x => imageTags?.includes(x))) continue
        
            const _message = await message.channel.send({
                files: [{ attachment: stream, name: url._fileName }],
                content: !message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS') && 
                    typeof imageTags === 'string' && `\`\`\`\n${imageTags}\n\`\`\``.slice(0, 2000) || null,
                embeds: message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS') ? [
                    new MessageEmbed()
                        .setTitle(new URL(searchSite.url).hostname)
                        .setURL(url.fileUrl)
                        .setColor(xee.settings.color)
                        .setDescription(typeof imageTags === 'string' ? `\`\`\`\n${imageTags}\n\`\`\``.slice(0, 4096) : 'Тегов нет -__-')
                        .setTimestamp(url.createdAt)
                        .setFooter(message.author.tag)
                        .setImage(`attachment://${url._fileName}`)
                ] : []
            }).catch(() => null)

            if (!_message) continue
            xee.react(_message, ['🔁', '⏹️'])

            const collected = await _message.awaitReactions({ max: 1, user: message.author, filter: (reaction, user) => ['🔁', '⏹️'].includes(reaction.emoji.name) && user.id === message.author.id })

            if (!collected?.size || collected.first().emoji.name === '⏹️') {
                this.cooldowns?.delete(message.author.id)
                return _message.reactions.removeAll().catch(() => null)
            }

            if (_message?.deletable) _message.delete().catch(() => null)
            continue
        }

        return message.channel.send('Картинки закончились, используй команду заново')
    }, 
    resolveFileUrl(apiPath, data) {
      if (data.file_url) return data.file_url
      apiPath = new URL(apiPath)
      return apiPath.origin + `${imagePrefix.includes(apiPath.hostname) ? '/images' : ''}/${data.directory}/${data.image}`
    },
    search(site, tags, page = 1) {
        return fetch(site.url + tags.map(encodeURIComponent).join('+') + (site.paginate ? `&pid=${page}` : ''))
            .catch(e => e.body).then(r => typeof r === 'string' ? (r.length && r.startsWith('[{') && JSON.parse(r) || []) : r)
            .then(r => r?.post ? r.post : r)
            .then(res => Array.isArray(res) && res.map(i => ({ ...i, fileUrl: this.resolveFileUrl(site.url, i) }))?.filter(r => r.fileUrl) || [])
    }
}
