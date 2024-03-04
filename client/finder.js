const Fuse = require('fuse.js')

module.exports = class Finder {
    static fuse(array, keys) {
        return new Fuse(array, { treshold: 0.45, keys })
    }

    /**
     * 
     * @param {Array} array 
     * @param {Array} keys 
     * @param {String} string 
     */

    static findOne(array, keys, string) {
        return Finder.fuse(array, keys).search(string)[0]?.item || null
    }

    /**
     * 
     * @param {Collection} members 
     * @param {string} string 
     * @param {Message} message 
     */

    static findMember(members, string, message = null) {
        if (message && message.mentions.users.size !== 0)
            string = message.mentions.users.first().id
        const id = string.match(/\d{17,19}/)?.[0]
        if (members.has(id)) return members.get(id)
        return Finder.findOne([...members.values()], ['user.username', 'nickname', 'user.tag'], string)
    }

    /**
     * 
     * @param {Collection} collection 
     * @param {string} string 
     */

    static findByName(collection, string) {
        const id = string.match(/\d{17,19}/)?.[0]
        if (id && collection.has(id)) return collection.get(id)
        return Finder.findOne([...collection.values()], ['name'], string)
    }
}