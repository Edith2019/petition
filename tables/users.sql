DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first VARCHAR(300) NOT NULL CHECK(first != ''),
    last VARCHAR(300) NOT NULL CHECK(last != ''),
    email VARCHAR(300) NOT NULL CHECK(email != ''),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);