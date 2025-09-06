-- Arquivo: tabela-clientes.sql

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Adiciona o campo de e-mail, garantindo que cada e-mail seja único
ALTER TABLE customers ADD COLUMN email VARCHAR(255) UNIQUE;

-- Adiciona os campos para o processo de "Esqueci a Senha"
ALTER TABLE customers ADD COLUMN password_reset_token VARCHAR(255) NULL;
ALTER TABLE customers ADD COLUMN password_reset_expires BIGINT NULL;

-- Cria a tabela para armazenar os cupons
CREATE TABLE coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type ENUM('fixed', 'percentage', 'free_delivery') NOT NULL,
    discount_value DECIMAL(10, 2) DEFAULT 0,
    min_purchase_value DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insere o cupom de entrega grátis
INSERT INTO coupons (code, description, discount_type, min_purchase_value) VALUES
('ENTREGAGRATIS', 'Entrega grátis para pedidos acima de R$ 100,00', 'free_delivery', 100.00);