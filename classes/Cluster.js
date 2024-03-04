const WebSocket = require('ws')
const EventEmitter = require('events')

const Interserver = require('./Interserver')
const { randomBytes } = require('crypto')
const { setTimeout } = require('timers/promises')

const wsAuth = process.env.WS_AUTH ?? 'test'

class Cluster extends EventEmitter {
    /**
     * @type {WebSocket}
     */
    #ws
    ready
    #heartbeat
    reconnecting
    packetQueue = []
    constructor(workerId, masterUrl) {
        super()

        this.masterUrl = masterUrl
        this.workerId = workerId
    }

    connect() {
        this.ready = false
        this.reconnecting = false

        this.#ws = new WebSocket(this.masterUrl, { headers: { authorization: wsAuth } })
        this.#ws.on('message', this.onMessage.bind(this))
        this.#ws.once('open', async () => {
            this.ready = true
            this.emit('READY')
            this.startHeartheat()
            this.#ws.send(this.workerId)

            await setTimeout(3500)
            for (const packet of this.packetQueue) {
                this.send(...packet)
            }
        })

        this.#ws.on('close', this.reconnect.bind(this))
        this.#ws.on('error', this.reconnect.bind(this))
    }

    reconnect() {
        if (this.reconnecting) return
        clearTimeout(this.#heartbeat)
            
        this.disconnect()
        this.reconnecting = true

        setTimeout(3000).then(() => {
            this.connect()
        })
    }

    disconnect() {
        this.#ws = null
        this.ready = false
        this.reconnecting = false
    }

    send(t, d) {
        if (!this.ready) this.packetQueue.push([ t, d ])
        else this.#ws.send(JSON.stringify({ t, d }))
    }

    async onMessage(message) {
        try {
            const json = JSON.parse(message)
            const content = json.d
            let interserver

            switch(json.t) {
                case 'STATS': 
                    this.send('STATS', { guilds: xee.client.guilds.cache.size, users: xee.client.guilds.cache.reduce((a, b) => a + b.memberCount, 0) })
                    break

                case 'INTERSERVER_CREATE':
                    new Interserver(content)
                    break

                case 'INTERSERVER_DELETE':
                    xee.store.interservers.delete(content.name)
                    break
                
                case 'INTERSERVER_CHANNEL':
                    interserver = xee.store.interservers.get(content.name)
                    if (!interserver) return

                    if (content.type === 'add') interserver.webhooks.push(content.channel)
                    else interserver.webhooks = interserver.webhooks.filter(w => w.channel !== content.channel)
                    break

                case 'INTERSERVER_MUTE':
                    interserver = xee.store.interservers.get(content.name)
                    if (!interserver) return

                    if (content.type === 'add') interserver.block.push(content.body)
                    else interserver.block = interserver.block.filter(c => c.user !== content.id)
                    break

                case 'INTERSERVER_LOCAL_MUTE':
                    interserver = xee.store.interservers.get(content.name)
                    if (!interserver) return
    
                    if (content.type === 'add') interserver.localBlock.push(content.body)
                    else interserver.localBlock = interserver.localBlock.filter(c => c.user !== content.id && c.channel !== content.channel)
                    break

                case 'INTERSERVER_MOD':
                    interserver = xee.store.interservers.get(content.name)
                    if (!interserver) return

                    if (content.type === 'add') interserver.mods.push(content.id)
                    else interserver.mods = interserver.mods.filter(c => c !== content.id)
                    break

                case 'INTERSERVER_LOG':
                    interserver = xee.store.interservers.get(content.name)
                    if (!interserver) return

                    interserver.logs = content.id
                    break

                case 'YOUTUBE':
                    xee.commands.resolve('youtube').sendHook(content)
                    break


                case 'EVAL_REQUEST':
                    let data = null
                    let isError = false
            
                    try {
                        data = await eval(content.code)
                    } catch (error) {
                        data = error.message
                        isError = true
                    }
            
                    this.send('EVAL_RESULT', { isError, data, ...content })
                    break

                default: 
                    this.emit(json.t, json.d)
                    break
            }

            this.emit(json.t, json.d)
        } catch {}
    }

    awaitResponse(t, d, time = 5000) {
        if (!this.ready) throw new Error('Cluster is not connected')
        const requestCode = randomBytes(6).toString('hex')
        return new Promise((resolve, reject) => {
            const messageReceiver = function(json) {
                if (json.requestCode !== requestCode) return
                this.removeListener(t, messageReceiver)
                clearTimeout(timeout)

                if (json.data) return resolve(json.data)
                if (json.error) return reject(new Error(json.error))
                else return resolve(json)
            }

            this.on(t + '_RESULT', messageReceiver)
            this.send(t + '_REQUEST', { requestCode, ...d })
            const timeout = setTimeout(() => {
                this.removeListener(t, messageReceiver)
                reject(new Error('Timeout!'))
            }, time)
        })
    }

    startHeartheat() {
       this.#heartbeat = setInterval(() => this.send('PING'), 30000)
    }

    eval(code, shard) {
        return this.awaitResponse('EVAL', { code, shard })
    }
}

module.exports = Cluster
