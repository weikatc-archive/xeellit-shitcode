class Confirmation {

    /**
     * @constructor
     * @description Делает подтверждение -__-
     * @param {import('discord.js').Message} message Сообщение -__-
     * @param {import('discord.js').User} user 
     */

    #isReact
    constructor(message, user) {
        /**
         * @type {import('discord.js').Message}
         */

        this.message = message
        this.#isReact = message.channel.permissionsFor(message.guild.me)
            .has([ 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY' ])

        this.setUser(user || message.author)
        this.setEntries()
    }

    setUser(user) {
        this.user = xee.client.users.resolveId(user)
        return this
    }

    setContent(content) {
        if (typeof content === 'string') {
            content = { content }
        }

        if (!this.#isReact) {
            const str =  `\nДля ответа, напишите \`${this.entries.yes}\` или \`${this.entries.no}\` в этом канале.`
            if (content.content) content.content += str
            else content.content = str 
        } 

        this.content = content
        return this
    }

    setEntries(options) {
        if (options) this.entries = options
        else {
            this.entries = !this.#isReact || !this.message.channel.permissionsFor(this.message.guild.me).has('USE_EXTERNAL_EMOJIS') ? {
                yes: this.#isReact && '%E2%9C%85' || 'да', 
                no: this.#isReact && '%E2%9D%8E' || 'нет' 
            } : xee.config.emojis
        }
    }

    async awaitResponse(onlyBoolean) {
        if (this.message.author.id === this.user && this.message._flags?.has('force')) { 
            this.data = true
            return onlyBoolean ? this.data : this
        }

        const entries = this.entries
        const entriesValues = Object.values(entries)

        this.message = await this.message.channel.send(this.content)
        if (this.#isReact) xee.react( this.message, entriesValues )

        const collected = await (this.#isReact ? 
            this.message.awaitReactions.bind(this.message) : 
            this.message.channel.awaitMessages.bind(this.message.channel)
        )({ 
            max: 1,
            time: 12e4,
            user: this.user,
            filter: (_, user) => this.#isReact ? user.id === this.user && entriesValues.includes(_.emoji.identifier) : _.author.id === this.user && entriesValues.includes(_.content?.toLowerCase()) 
        }).then(res => res.first())

        if (!collected || collected.content?.toLowerCase() === entries.no || collected.emoji?.identifier === entries.no) this.data = false
        else this.data = true

        return onlyBoolean ? this.data : this
    }

    /**
     * 
     * @param {import('discord.js').MessageOptions} content 
     */

    reply(content) {
        if (this.message?.editable && !this.message?.failed) {
            this.message.edit(content).catch(() => {
                this.message.failed = true
                return this.reply(content)
            })
        } else this.message.channel.send(content)
        return this
    }

    delete() {
        if (this.message?.author.id === xee.client.user.id) this.message?.delete?.().catch(() => null)
        return this
    }
}

module.exports = Confirmation