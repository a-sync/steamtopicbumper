const fs = require('fs');

module.exports = (filepath) => {
    return {
        load: async () => {
            return JSON.parse(await fs.readFileSync(filepath, 'utf8'));
        },
        save: (object) => {
            return fs.writeFileSync(filepath, JSON.stringify(object, null, 2));
        }
    }
};
