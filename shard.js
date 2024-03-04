const { ShardingManager } = require('discord.js')

const manager = new ShardingManager('./boi.js', {
    totalShards: 4,
    token: process.env.TOKEN || '',
    shardList: process.env.SHARD ? [+process.env.SHARD] : 'auto',
    mode: 'worker'
})

(async function spawn() {
    await new Promise(r => setTimeout(r, +process.env.SHARD * 2500))

    try {
        await manager.spawn({
            delay: 3000,
            timeout: Infinity
        })
    } catch (error) {
        console.log(error)
        spawn()
    }
})()