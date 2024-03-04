const { MessageEmbed } = require('discord.js')
const Pagination = require('../../classes/Pagination')

const fetch = require('../../client/fetch')

const ext = { j: 'jpg', p: 'png', g: 'gif' }

module.exports = {
    command: {
        description: 'просмотр манги с NHentai.net',
        usage: '<название или теги>',
        cooldown: 60,
        examples: {
            '{{prefix}}nhentai naruto': 'найдет мангу с тегом naruto'
        },
        permissions: {
            me: ['READ_MESSAGE_HISTORY', 'EMBED_LINKS', 'ADD_REACTIONS']
        },
        ownerOnly: true,
        hidden: true
    },

    execute: async function(message, args, options) {
        const removeCooldown = (() => this.cooldowns?.delete(message.author.id)).bind(this)
        if (!message.channel.nsfw) return message.channel.send('Этот канал не похож на канал с пометкой NSFW').then(removeCooldown)    
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix)).then(removeCooldown)

        const query = args.join(' ')
        const entries = await fetch('https://nhentai.net/api/galleries/search', { query: { query } }).catch(() => null)
        if (!entries?.result?.length) return message.channel.send('По вашему запросу ничего не найдено. Почему? Непонятно').then(removeCooldown)

        const pages = Array(entries.num_pages === 1 ? 1 : entries.num_pages - 1)
        pages[0] = entries

        if (pages.length !== 1) {
            const last = await fetch('https://nhentai.net/api/galleries/search', { query: { query, page: entries.num_pages } }).catch(() => null)
            if (last) pages.push(last)
        }

        const totalPages = pages.length !== 1 ? (pages.length - 1) * pages[0].per_page + pages[pages.length - 1].result.length : pages[0].result.length
        const data = await new Promise(async resolve => {
            const selectInterface = new Pagination(message.author.id, { reactions: { stop: '✅' } })
            selectInterface.pages = Array(totalPages)

            selectInterface.select = async (page = 1) => {
                selectInterface.page = page
                const content = await this.selectPage(selectInterface.page - 1, pages, totalPages, query)
                if (selectInterface.message) selectInterface.edit(content)
                return content
            }

            await selectInterface.send(message.channel)
            await new Promise(resolve => setTimeout(resolve, 2500))
            selectInterface.collector.on('end', (_, reason) => {
                if (!['paginationStop', 'messageDelete'].includes(reason)) return
                const page = selectInterface.page - 1
                resolve(pages?.[Math.floor(page / pages[0]?.per_page)]?.result?.[page % 25])
            })
        })

        if (!data) return

        const interface = new Pagination(message.author.id)
        Array.from({ length: data.images.pages.length }, (_, n) => `https://i.nhentai.net/galleries/${data.media_id}/${n + 1}.${ext[data.images.pages[n]?.t] || 'jpg'}`)   
            .forEach((page, i, s) => interface.add({
                embeds: [
                    new MessageEmbed()
                        .setColor(xee.settings.color)
                        .setImage(page)
                        .setTitle(data.title.pretty)
                        .setURL(`https://nhentai.net/g/${data.id}/`)
                        .setFooter(`${i + 1} / ${s.length}`)
                ]
            }))

        return interface.send(message.channel).then(() => interface.collector.on('end', removeCooldown))
    },

    selectPage: async function(page, pages, totalPages, query) {
        const _page = Math.floor(page / pages[0].per_page)

        let entries = pages[_page]
        if (!entries?.result) entries = pages[_page] = await fetch('https://nhentai.net/api/galleries/search', { query: { query, page: _page + 1 } }).catch(() => 'error')
        if (entries === 'error') return this.selectPage(page + 1, pages, totalPages, query)
        const manga = entries.result[page % pages[0].per_page]
        return { 
            embeds: [
                new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setDescription('Дабы выбрать определенную мангу, нажмите на реакцию галочки снизу.')
                    .setImage(`https://t.nhentai.net/galleries/${manga.media_id}/cover.${ext[manga?.images?.cover?.t]}`)
                    .setTitle(manga.title.pretty)
                    .setURL(`https://nhentai.net/g/${manga.id}/`)
                    .setFooter(`${page + 1} / ${totalPages}`)
            ]
        }
    }
}
