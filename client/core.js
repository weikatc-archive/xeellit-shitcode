const { Client, Permissions } = require('discord.js')

const Commands = require('../classes/Commands')
const Cluster = require('../classes/Cluster')
const ReactionQueue = require('../classes/ReactionQueue')

const MongoClient = require('mongodb')
const RedisClient = require('redis')

const version = require('../package.json').version
const util = require('./util')

class BotCore {
    client
    db
    constructor({ config, rest, client, database, stored } = {}) {
        this.rest = rest
        this.db = database
        this.store = stored
        this.version = version
        this.client = new Client(client)

        this.commands = new Commands('./commands/', false)
        this.interactions = new Commands('./interactions/', true)
        
        if ('REDISCLOUD_URL' in process.env) {
            this.redis = RedisClient.createClient(process.env['REDISCLOUD_URL'].trim())
            this.redis.on('ready', () => console.log('База кэша подключена'))
            this.redis.getAsync = require('util').promisify(this.redis.get).bind(this.redis)
        } else {
            const redis = new Map()
            this.redis = {
                ready: true,
                map: redis,
                setex: (k, t, v) => redis.set(k, v),
                getAsync: async (k) => redis.get(k),
                del: (k) => redis.delete(k)
            }
        }

        Object.defineProperties(this, {
            config: { value: config },
            reactionQueue: { value: new ReactionQueue() }
        })
    }

    async connect() {
        this.db = await (new MongoClient(this.db, {
            useUnifiedTopology: true
        }).then(db => this.db = db.db('xee')))
            .catch(error => console.log('Ошибка при подключении к базе данных:', error.message))

        this.client.login(this.config.botToken)
                .catch(error => console.log('Ошибка при подключении к вебсокету:', error.message))
    }

    getData(id, guildId) {
        if (guildId) {
            return new Promise(async resolve => {

            })
        }
    }

    loadCluster(code = 0, url = 'wss://xeellit-app.herokuapp.com/bot') {
        const cluster = this.cluster = new Cluster(+code, url)
        cluster.connect()
    }

    updateInteraction(json, guildId) {
        if (typeof json === 'string') json = this.interactions.get(json)?.config
        if (guildId?.id) guildId = guildId.id
        if (guildId) return this.rest.discord.api.applications(this.client.user.id).guilds(guildId).commands.post({ json })
        else return this.rest.discord.api.applications(this.client.user.id).commands.post({ json })
    }

    listInteractions(guildId) {
        if (guildId?.id) guildId = guildId.id
        if (guildId) return this.rest.discord.api.applications(this.client.user.id).guilds(guildId).commands.get()
        else return this.rest.discord.api.applications(this.client.user.id).commands.get()
    }

    react(message, emoji) {
        if (Array.isArray(emoji)) return emoji.forEach(r => this.react(message, r))
        return this.reactionQueue.add({ emoji, id: message.id, channel: message.channel.id })
    }

    calculateXp(lvl) {
        lvl = +lvl
        return Math.round(Math.sqrt(lvl) * 150 + lvl ** 2) - 1 + 100
    }

    random(obj) {
        if (typeof obj === 'string') return this.random([ ...obj ])
        if (!Array.isArray(obj)) return this.random(Object.values(obj))
        return obj[Math.floor(this.randomInt(obj.length))]
    }

    randomInt(min, max) {
        if (typeof max !== 'number') {
            max = min
            min = null
        }

        return (require('crypto').randomBytes(8).readUInt32LE() / 0xffffffff * (max ?? 1)) + (min ?? 0)
    }

    remove(array, element) {
        array.splice(array.indexOf(element), 1)
        return array
    }

    collection(collection = 'test') {
        return this.db.collection(collection)
    }

    
    get settings() {
        return this.config.settings
    }

    toJSON() {
        return {
            client: this.client,
            version: this.version,
            database: this.db.databaseName,
            rest: Object.fromEntries(Object.entries(this.rest).map(e => [e[0], e[1].path])),
            commands: this.commands.map(c => c.name)
        }
    }

    
    static ruMs(ms, _) {
        return new Intl.ListFormat('ru-RU').format(Object.entries(util.parseMs(ms))
            .filter(p => p[1]).slice(0, 2).map(p => `${p[1]} ${BotCore.plural({
                days: ['день', 'дня', 'дней'],
                hours: ['час', 'часа', 'часов'],
                minutes: [_ ? 'минуту' : 'минута', 'минуты', 'минут'],
                seconds: [_ ? 'секунду' : 'секунда', _ ? 'секунд' : 'секунды', 'секунд']
            }[p[0]], p[1])}`)) || 'менее секунды'
    }

    static plural(array, n, insertNumber = false) {
        n = +n
        const word = array[n % 10 === 1 && n % 100 != 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2]
        return insertNumber ? `${n} ${word}` : word
    }

    static formatPermissions(permissions, array = false) {
        permissions = new Permissions(permissions)

        const strings = require('../assets/permissions')
        const formatted = new Permissions(permissions).toArray().map(p => (permissions.has('ADMINISTRATOR') ? p !== 'ADMINISTRATOR' : null) ? null : strings[p]).filter(Boolean)
        return array ? formatted : util.firstUpper(formatted.join(', '))
    }
}

module.exports = BotCore