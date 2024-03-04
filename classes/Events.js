const { Constants } = require('discord.js')
const Loader = require('./interfaces/Loader')

const { basename } = require('path')
class Events extends Loader {
    load(filename) {
        const props = require(filename)
        const writeEvent = xee.client[props.once ? 'once' : 'on'].bind(xee.client)

        for (const name in props) {
            if (name === 'execute') writeEvent(props.name ?? basename(filename).split('.').shift(), props.execute.bind(props))
            else if (Object.values(Constants.Events).includes(name)) writeEvent(name, props[name].bind(props))
        }
    }
}

module.exports = Events