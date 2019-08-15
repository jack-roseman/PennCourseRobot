const storage = require('node-persist');

module.exports.initDatabase = async function () {
    await storage.init();
}

module.exports.set = async function (key, val) {
    await storage.setItem(key, val);
}

module.exports.getDummyUser = async function () {
    return await storage.getItem('me');
}