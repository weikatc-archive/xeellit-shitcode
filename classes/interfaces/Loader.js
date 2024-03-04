const { readdir } = require('fs/promises')
const { join } = require('path')

class Loader {
    constructor(folder) {
        this.folder = folder
    }

    async loadFolder(dir = this.folder, group) {
        const filesFolder = join(process.cwd(), dir)
        const files = await readdir(filesFolder, { withFileTypes: true })

        for (const file of files) {
            if (file.isDirectory()) {
                this.loadFolder(join(dir, file.name), group ?? file.name)
                continue
            }

            const filepath = join(filesFolder, file.name)
            this.load(filepath, group)
        }
    }

    static applyToClass(structure){
        Object.defineProperties(
            structure.prototype, 
            Object.getOwnPropertyDescriptors(this.prototype)
        )
    }
}

module.exports = Loader