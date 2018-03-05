const redis = require('./redis');
const moment = require('moment-timezone').tz.setDefault("Asia/Kolkata");
const bcrypt = require('bcryptjs');
const constants = require('./constants');
const jwt = require('jsonwebtoken');
const config = require('config');
const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify
const jwtVerifyAsync = promisify(jwt.verify, jwt);


function redisStore(uni_key, value, expire_time=null) {

    return new Promise(function (resolve, reject) {

        if(!expire_time)
            expire_time = parseInt(moment().endOf('day').add(2, 'hours').format('X'));

        redis.set(uni_key, JSON.stringify(value), function (err) {

            if (err)
                return reject(['redis_store -> redis.set: ', uni_key, err]);

            redis.expireat(uni_key, expire_time, function (err) {

                console.log('stored in redis: ' + uni_key);
                if (err)
                    return reject(['redis_store -> redis.expireat: ', uni_key, err]);
                return resolve();
            });
        });
    });
}

function redisGet(key) {
    return new Promise((resolve, reject) => {

        redis.get(key, function(err, result) {

            if(err)
                return reject();
            console.log('fetching from redis key: ', key)
            resolve(JSON.parse(result));
        });
    });
}


function promiseParallelLimit(limit, funcs) {
    const batches = [];
    for(let e = 0; e < Math.ceil(funcs.length/limit); e++)
        batches.push(funcs.slice(e*limit, (e+1)*limit))
    return batches.reduce((promise, batch) =>
            promise.then(result =>
                Promise.all(batch).then(Array.prototype.concat.bind(result))),
        Promise.resolve([]));
}


function haversineDistance(coords1, coords2, isMiles= 0) {
    //coordinates in [latitude, longitude]
    //returns distance in kms

    function toRad(x) {
        return x * Math.PI / 180;
    }

    let lon1 = parseFloat(coords1[1]);
    let lat1 = parseFloat(coords1[0]);

    let lon2 = parseFloat(coords2[1]);
    let lat2 = parseFloat(coords2[0]);


    let R = 6371; // km

    let x1 = lat2 - lat1;
    let dLat = toRad(x1);
    let x2 = lon2 - lon1;
    let dLon = toRad(x2);

    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = R * c;

    if(isMiles) d /= 1.60934;

    return d;
}


function timeDiff(startTime, endTime) {
    const date = '2018-01-01 ';
    let timediff = (Date.parse(date + endTime) - Date.parse(date + startTime))/(1000);

    if(timediff < 0) {
        return  86400 + timediff
    }
    return timediff
}


function merge_overlapping_intervals(intervals) {
    const ans = [];
    intervals.sort((x, y) => x[0] - y[0]);

    let start = intervals[0][0];
    let end = intervals[0][1];

    for(let i = 1; i < intervals.length; i++) {

        if (end > intervals[i][1]) {
            continue;
        }

        if (intervals[i][0] > end) {

            ans.push([start, end]);
            start = intervals[i][0];
            end = intervals[i][1];
        }

        else {

            end = intervals[i][1];
        }
    }

    ans.push([start, end]);
    return ans
}



async function googleDistance(lat1, lon1,lat2, lon2) {
    let options = {
        method: 'GET',
        url: 'https://maps.googleapis.com/maps/api/distancematrix/json',
        qs:
            {
                destinations: `${lat1},${lon1}`,
                origins: `${lat2},${lon2}`,
                mode: 'driving'
            },
        json: true
    };

    const googleResponse = (await requestPromise(options)).body;
    if (googleResponse.status != 'OK') {
        return {
            status: false
        };
    }

    if (!googleResponse.rows.length)
        return {
            status: false
        };

    return {
        status: true,
        data: googleResponse,
    }
}


function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

async function makeBcryptHash(pass) {

    return await bcrypt.hash(pass, constants.saltrounds);
}

async function verifyBcryptHash(pass, hash) {

    return await bcrypt.compare(pass, hash)
}

function makeJWT(obj, expiresAfterSeconds=86400*7) {

    return jwt.sign(obj, config.get('secret_key'), {
        expiresIn: expiresAfterSeconds
    });

}

async function verifyJWT(token) {

    try {
        return await jwtVerifyAsync(token, config.get('secret_key'));

    }
    catch(e) {

        return {
            error: true,
            message: e.message
        }
    }
}


function clearDirectory(directory) {

    const files = fs.readdirSync(directory);

    for (const file of files) {
        fs.unlinkSync(path.join(directory, file))
    }
}



function listOfArrayToMatrix(l) {
    const indices = [];

    l.map(x => indices.push(0));

    const n = l.length;

    const solution = [];

    while(1) {

        const temp = [];

        for(let i = 0; i < indices.length; i += 1) {
            temp.push(l[i][indices[i]]);
        }

        solution.push(temp);

        let next = n - 1;

        while(next >= 0 && indices[next] + 1 >= l[next].length) {
            next -= 1;
        }

        if(next < 0) {
            return solution
        }

        indices[next] += 1;

        for(let i = next + 1; i < n ; i += 1) {
            indices[i] = 0
        }
    }
}


function authenticatePrivileges(userPrivileges, objectPrivileges) {

    return {
        error: false,
        message: "privileged user!",
    };
    //userPrivileges , objectPrivileges = [[1,2,3], [4,5,6]]

    // console.log(objectPrivileges);
    // console.log(userPrivileges);


    const solutions = [];
    objectPrivileges.map(x => solutions.push(false));

    const account = 0, category = 1, role = 2;

    //userPrivileges = [[8, 0, 7]];

    for(let objectPrivilege = 0; objectPrivilege < objectPrivileges.length; objectPrivilege++) {

        for(let userPrivilege = 0; userPrivilege < userPrivileges.length; userPrivilege++) {

            const accountFlag = objectPrivileges[objectPrivilege][account] === userPrivileges[userPrivilege][account] ||
                constants.adminAccount.includes(userPrivileges[userPrivilege][account]);

            const categoryFlag =  objectPrivileges[objectPrivilege][category] === userPrivileges[userPrivilege][category] ||
                constants.adminCategory.includes(userPrivileges[userPrivilege][category]);

            const roleFlag = objectPrivileges[objectPrivilege][role] === userPrivileges[userPrivilege][role] ||
                constants.adminRole.includes(userPrivileges[userPrivilege][role]);


            const fullHouse = accountFlag && categoryFlag && roleFlag;

            if(fullHouse) {

                solutions[objectPrivilege] = true;
            }
        }

    }
    // console.log(solutions);
    // console.log(objectPrivileges)
    // console.log(userPrivileges)
    for(const result of solutions) {
        if(!result) {
            return {
                error: true,
                message: "user not authorised",
                reason: "full house"
            };
        }
    }

    return {
        error: false,
        message: "privileged user!",
    };
}

exports.redisStore = redisStore;
exports.redisGet = redisGet;
exports.isJson = isJson;
exports.makeBcryptHash = makeBcryptHash;
exports.verifyBcryptHash = verifyBcryptHash;
exports.makeJWT = makeJWT;
exports.verifyJWT = verifyJWT;
exports.clearDirectory = clearDirectory;
exports.listOfArrayToMatrix = listOfArrayToMatrix;
exports.authenticatePrivileges = authenticatePrivileges;
