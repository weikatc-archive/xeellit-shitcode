const RESTManager = require('./classes/RESTManager')
const Events = require('./classes/Events')
const Core = require('./client/core')

const { Options, Collection } = require('discord.js')
const { workerData } = require('worker_threads')
                       require('./preload')

const botToken = process.env.TOKEN
const userToken = process.env.USER_TOKEN ?? ''

global.xee = new Core({
    client: {
        restRequestTimeout: 30000,
        messageSweepInterval: 1600,
        allowedMentions: { parse: [] },
        ws: { properties: { $browser: 'Discord Android' } },
        makeCache: Options.cacheWithLimits({
            MessageManager: 30
        }),

        presence: {
            activities: [{
                name: 'x.help',
                type: 'LISTENING'
            }]
        },

        partials: [
            'MESSAGE',
            'REACTION',
            'GUILD_MEMBER'
        ],

        intents: [
            'GUILDS',
            'GUILD_MEMBERS',
            'GUILD_EMOJIS_AND_STICKERS',
            'GUILD_VOICE_STATES',
            'GUILD_MESSAGES',
            'GUILD_MESSAGE_REACTIONS',
            'GUILD_PRESENCES'
        ],
    },
    database: process.env.DATABASE,
    config: {
        botToken,
        userToken,
        webhook: 'https://discord.com/api/webhooks/',
        emojis: { yes: 'yes:917948294158753892', no: 'no:917948232867393557' },
        messageCacheLifetime: 604800,
        settings: { color: 0x2f3136, owners: process.env.OWNERS?.split(',') ?? [], toggle: [] }
    },
    rest: {
        selfbot: new RESTManager('https://discord.com/api/v8', { headers: { authorization: userToken } }),
        discord: new RESTManager('https://discord.com/api/v8', { headers: { authorization: `Bot ${botToken}` } }),
        sdc: new RESTManager('https://api.server-discord.com/v2', { headers: { authorization: 'SDC <restricted>' } }),
        ksoft: new RESTManager('https://api.ksoft.si', { headers: { authorization: 'Bearer <restricted>' } }),
        osu: new RESTManager('https://osu.ppy.sh/api', { query: { k: '<restricted>' } }),
        openweathermap: new RESTManager('https://api.openweathermap.org/data/2.5', { query: { appid: '<restricted>' } }),
        kaneki: new RESTManager('https://xeellit-app.herokuapp.com/api', { headers: { authorization: process.env.AUTH } }),
        hypixel: new RESTManager('https://api.hypixel.net', { query: { key: '<restricted>' } }),
        shikimori: new RESTManager('https://shikimori.me/api', { headers: { 'user-agent': '<restricted>', cookie: '<restricted>' } }),
        nekos: new RESTManager('https://nekos.life/api/v2'),
        senko: new RESTManager('https://senko.one/api', { headers: { authorization: '<restricted>' } }),
        nekobot: new RESTManager('https://nekobot.xyz/api'),
        uzairashraf: new RESTManager('https://anime-reactions.uzairashraf.dev/api/reactions'),
        hmtai: new RESTManager('https://hmtai.hatsunia.cfd/v2')
    },
    stored: {
        guilds: new Collection(),
        users: new Collection(),
        starboards: new Collection(),
        mutes: new Collection(),
        interservers: new Collection(),
        reactroles: new Collection(),
        polls: new Collection(),
        giveaways: new Collection(),
        members: new Collection(),
        _queue: new Object(),
        rooms: new Array()
    }
})

xee.connect()
xee.commands.loadFolder()
xee.interactions.loadFolder()
new Events('./events/').loadFolder()

if (workerData && 'SHARDS' in workerData) xee.loadCluster(+workerData.SHARDS)

xee.client.games = new Collection
xee.client.collectors = new Collection

process.on('uncaughtException', console.log)
process.on('unhandledRejection', console.log)
