const storage = require('node-persist');

module.exports.initDatabase = async function () {
    await storage.init();
}

module.exports.enqueUserToClassWaitlist = async function (clss, usr) {
    storage.getItem(clss).then(async (q) => {
        if (q) {
            q.push(usr);
            await storage.setItem(clss, q);
        } else {
            const newq = [];
            newq.push(usr);
            await storage.setItem(clss, newq);
        }
    })
}

module.exports.dequeUserFromClassWaitlist = async function (clss) {
    storage.getItem(clss).then(async (q) => {
        if (q) {
            const usr = q.pop();
            await storage.setItem(clss, q);
            return usr;
        } else {
            throw new Error('No such class exception');
        }
    });
    return 
}

module.exports.getDummyUser = async function (clss) {
    const userList = await storage.getItem(clss);
    return userList[0];
}