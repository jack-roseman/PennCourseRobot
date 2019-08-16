const robot = require('./robot.js');
const dli = require('./data_layer_interface.js');
/**
 * TEST FUNCTIONS
 */
const testOnboardAndCacheCookies = async (username, password, clss) => {
    dli.initDatabase()
        .then(async () => {
            const user = await robot.onboardUser(username, password);
            await robot.addUserToWaitlist(user, clss);
        })
        .catch((err) => {
            console.log('An error has occurred');
            console.log(err);
        });
};
// const testSignInExistingUser = async () => {
//     dli.initDatabase()
//         .then(async () => {
//             const user = await dli.getDummyUser();
//             await robot.signInUser(user)
//                 .catch((err) => {
//                     console.log('testSignInExistingUser() failed');
//                     console.log(err);
//                 });
//         });
// };


// this wont work
// const testSignUpExistingUser = async (cl, gt) => {
//     dli.initDatabase().then(async () => {
//         const user = await dli.getDummyUser();
//         await robot.registerClass(user, cl, gt)
//             .catch((err) => {
//                 console.log('testSignUpExistingUser() failed');
//                 console.log(err);
//             });
//     });
// };

/**
 * Uncomment to run individual tests
 */
testOnboardAndCacheCookies('jackrose', 'goodinstructionisbetterthanriches', 'EAS-203-001').catch((err) => console.log(err));
// testSignInExistingUser().catch((err) => console.log(err));
// testSignUpExistingUser('EAS-203-001', 'NN').catch((err) => console.log(err));