const wait = t => new Promise(r => setTimeout(r, t))
class ReactionQueue {
    channels = new Map
    add(req) {
        req = { ...req, emoji: xee.client.emojis.resolveIdentifier(req.emoji) }
        if (!req.emoji) throw new Error('Это что за эмодзи?')


        (async () => {
            if (!this.channels.has(req.channel)) {
                this.channels.set(req.channel, [req])
    
                while (!0) {
                    let queue = this.channels.get(req.channel)
                    if (!queue.length) {
                        this.channels.delete(req.channel)
                        break
                    }
    
                    const request = queue.shift()
                    let headers
                    await xee.rest.discord.api.channels(request.channel).messages(request.id).reactions(request.emoji, '@me').put({ stream: true })
                        .then(res => (() => headers = res.headers)() && res)
                        .then(res => res.statusCode === 429 ? queue.unshift(request) : (res.statusCode === 404 ? (() => {
                            this.channels.set(req.channel, queue.filter(q => q.id !== request.id))
                        })() : null))
                    await wait(queue.retry || (queue.retry = +headers['x-ratelimit-reset-after'] * 1000))
                }
    
            } else this.channels.get(req.channel).push(req)
        })()
    }
}

module.exports = ReactionQueue