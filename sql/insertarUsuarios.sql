INSERT INTO usuarios (nombre, password_hash)
VALUES ('Daniel Salas', crypt('123456', gen_salt('bf')));
