-- Tabela para armazenar os produtos do cardápio
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    image TEXT,
    available BOOLEAN DEFAULT true
);

-- Tabela para os usuários administradores
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Tabela para armazenar os pedidos
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_info JSON,
    delivery_info JSON,
    items JSON,
    total_value DECIMAL(10, 2),
    payment_info JSON,
    status VARCHAR(50),
    delivery_number VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserindo os usuários admin
INSERT INTO admins (username, password) VALUES
('claudio', '123'),
('elaine', '321'),
('caua', '1234');