  
  DROP TABLE IF EXISTS user_profiles;
  
  CREATE TABLE user_profiles(
      id SERIAL PRIMARY KEY,
      age INT,
      city VARCHAR(255),
      url VARCHAR(255),
      user_id INT UNIQUE REFERENCES users(id)
  );