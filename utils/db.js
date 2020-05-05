const spicedPg = require('spiced-pg');

let db;
if (process.env.DATABASE_URL) {
    db = spicedPg(process.env.DATABASE_URL);

} else {
    let secrets;
    secrets = require('./secrets');
    db = spicedPg(`postgres:${secrets.users.user}:${secrets.users.pwreg}@localhost:5432/users`);
}
// const db = spicedPg(`postgres:${secrets.database.first}:${secrets.database.pw}@localhost:5432/${secrets.database.name}`);

//async functions
const bcrypt = require('bcryptjs');
let { genSalt, hash, compare } = bcrypt;
const { promisify } = require('util');

genSalt = promisify(genSalt);
hash = promisify(hash);
compare = promisify(compare);

module.exports.addHashed = (first, last, email, pwreg) => {
    const q = `
    INSERT into users (first, last, email, password)
    VALUES ($1, $2, $3, $4)
    RETURNING * 
    `;
    const params = [first, last, email, pwreg];
    return db.query(q, params);
};

module.exports.getHashed = (emailDb) => {
    const q = `SELECT users.email, users.first, users.last, users.password, signatures.id AS "sigId", users.id
    FROM users
    JOIN signatures ON signatures.user_id = users.id 
    WHERE email = $1
    `;
    const params = [emailDb];
    return db.query(q, params);
};

module.exports.compare = compare;

module.exports.hash = hPWresult => genSalt().then(salt => hash(hPWresult, salt));

module.exports.addSig = (signature, userId) => {
    const q = `INSERT INTO signatures (signature, user_id)
    VALUES ($1, $2)
    RETURNING *
    `;
    const params = [signature, userId];
    return db.query(q, params);
};

module.exports.getSignerSignature = userId => {
    const q = `SELECT signature FROM signatures 
    WHERE user_id=$1
    `;
    const params = [userId];//need to replace with $
    return db.query(q, params);
};

module.exports.getSignatures = sigId => {
    const q = `SELECT id FROM signatures 
    WHERE user_id = $1
    `;
    const params = [sigId];
    return db.query(q, params);
};


module.exports.getSigcount = () => {
    const q = `SELECT COUNT (*) 
    FROM signatures
    `;
    return db.query(q);
};


module.exports.addUserProfile = (age, city, url, userId) => {
    const q = `
    INSERT into user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING * 
    `;
    const params = [age || null, city || null, url || null, userId || null];
    return db.query(q, params);
};


module.exports.getSignersResults = () => {
    const q = ` SELECT  users.first, users.last, user_profiles.age, user_profiles.city, user_profiles.url
    FROM users
    LEFT JOIN signatures ON users.id = signatures.user_id
    JOIN user_profiles ON users.id = user_profiles.user_id
    `;
    return db.query(q);
};

module.exports.getSignersCity = (city) => {
    const q = ` SELECT  user_profiles.city, users.first, users.last, user_profiles.age, user_profiles.url
    FROM users
    LEFT JOIN signatures ON users.id = signatures.user_id 
    JOIN user_profiles ON users.id = user_profiles.user_id
    WHERE user_profiles.city = $1
    `;
    const params = [city];
    return db.query(q, params);
};


module.exports.addUserEdit = (profileData) => {
    const q = `SELECT users.first, users.last,users.password, users.email , user_profiles.age, user_profiles.city, user_profiles.url
    FROM users
    LEFT JOIN user_profiles ON users.id = user_profiles.user_id
    WHERE users.id = $1 
    `;
    const params = [profileData];
    return db.query(q, params);
};

module.exports.getUserEditUsersNoPW = (first, last, email, userId) => {
    const q = `UPDATE users 
    SET first = $1,
    last = $2,
    email = $3
    WHERE users.id = $4
    RETURNING *
    `;
    const params = [first, last, email, userId];
    return db.query(q, params);
};

module.exports.getUserEditUsersProfile = (age, city, url, userId) => {
    const q = `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE
    SET age = $1,
    city = $2, 
    url = $3
    RETURNING *
    `;
    const params = [age || null, city || null, url || null, userId];
    return db.query(q, params);
};


module.exports.getUserEditUsersPW = (first, last, email, pwEdit, userId) => {
    const q = `UPDATE users 
    SET first = $1, 
    last = $2, 
    email = $3, 
    password = $4
    WHERE users.id = $5
    RETURNING *
    `;
    const params = [first, last, email, pwEdit, userId];
    db.query(q, params);
};

module.exports.getEmptySigCanvas = sigId => {
    const q = `DELETE 
    FROM signatures 
    WHERE user_id= $1
    `;
    const params = [sigId];
    return db.query(q, params);
};