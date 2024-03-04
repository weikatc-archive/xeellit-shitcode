const { mergeDefault } = require('../client/util')
class Pagination {

    /**
     * @param {import('discord.js').User} user 
     */

    constructor(user, options = {}) {
        this.user = xee.client.users.resolveId(user)
        this.time = options.time ?? 120000
        this.page = options.page ?? 1
        this.pages = options.pages ?? []

        this.setReactions(options.reactions, options.selected ?? true)
    }

    async send(channel) {
        this.message = await channel?.send(await this.select())
        if (this.pages.length === 1) return ''
        if (this.pages.length <= 2) {
            this.reactions.first = null
            this.reactions.last = null
            this.reactions.select = null
        }

        this.createCollector()
        this.addReactions()

        return this
    }

    add(...pages) {
        this.pages.push(...pages)
        return this
    }

    select(page = 1) {
        this.page = page

        const pageFrame = this.pages[page - 1]
        const content = typeof _page === 'function' ? pageFrame() : pageFrame
        if (this.message) this.edit(content)

        return content
    }

    edit(content) {
        this.message?.edit?.(content)
    }

    createCollector(userId = this.user) {
        this.collector = this.message.createReactionCollector({
            idle: this.time, user: userId,
            dispose: true,
            filter: (react, user) => user.id === userId && this._reactions.includes(react.emoji.identifier)
        })

        this.collector.on('collect', this.handleReaction.bind(this))
        this.collector.on('remove', this.handleReaction.bind(this))

        return this
    }

    async handleReaction(react) {
        if (react.emoji.identifier === this.reactions.first && this.page !== 1) this.select(1)
        else if (react.emoji.identifier === this.reactions.back && this.page !== 1) this.select(this.page - 1)
        else if (react.emoji.identifier === this.reactions.next && this.page !== this.pages.length) this.select(this.page + 1)
        else if (react.emoji.identifier === this.reactions.last) this.select(this.pages.length)
        else if (react.emoji.identifier === this.reactions.stop) {
            if (this.message.deletable) this.message.delete().catch(() => this.collector.stop())
            else this.collector.stop('paginationStop')
        } else if (react.emoji.identifier === this.reactions.select) {
            const selectMessage = await this.message.channel.send(`Напишите в этом чате номер страницы, на которую хотите перепрыгнуть (всего их ${this.pages.length}).`)
            const collected = await selectMessage.channel.awaitMessages({ 
                max: 1, 
                time: this.time, 
                filter: message => message.author?.id === this.user && !isNaN(+message.content) && isFinite(+message.content) && +message.content <= this.pages.length && +message.content >= 1
            })

            if (selectMessage.deletable) await selectMessage.delete().catch(() => {})
            if (collected.size) this.select(+collected.first().content)
        }
    }


    setReactions(options = {}, canSelect) {
       this.reactions = Object.fromEntries(
           Object.entries(mergeDefault(Pagination.REACTIONS, options))
                .map(a => [ a[0], xee.client.emojis.resolveIdentifier(a[1]) ])
        )

        if (!canSelect) this.reactions.select = null

        return this
    }

    addReactions() {
        if (!this.message) throw new Error('Сообщения ещё нет')
        xee.react(this.message, this._reactions)
        return this
    }

    get _reactions() {
        return Object.values(this.reactions).filter(Boolean)
    }
}

Pagination.REACTIONS = {
    first: '⏮️',
    back: '⬅',
    stop: '⏸',
    next: '➡',
    last: '⏭️',
    select: '🔢'
}

module.exports = Pagination
