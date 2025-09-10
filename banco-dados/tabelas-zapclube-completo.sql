-- Arquivo: tabelas-zapclube-final.sql

-- PASSO 1: Cria a tabela de cupons (caso ainda não exista)
-- É importante que ela seja criada antes da tabela 'customer_coupons'.
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type ENUM('fixed', 'percentage', 'free_delivery') NOT NULL,
    discount_value DECIMAL(10, 2) DEFAULT 0,
    min_purchase_value DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PASSO 2: Adiciona as colunas na tabela de clientes, uma por uma.
-- Se alguma coluna já existir, o MySQL dará um erro de "Duplicate column name",
-- o que é normal. Apenas ignore o erro e execute a próxima linha.
ALTER TABLE customers ADD COLUMN loyalty_points INT NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN is_club_subscriber BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN subscription_expires_at DATE NULL DEFAULT NULL;

-- PASSO 3: Cria a tabela para as RECOMPENSAS (ignora se já existir)
CREATE TABLE IF NOT EXISTS rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- PASSO 4: Cria a tabela para os CUPONS dos assinantes (ignora se já existir)
CREATE TABLE IF NOT EXISTS customer_coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    coupon_id INT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    expires_at DATE NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

-- PASSO 5: Limpa as recompensas de exemplo antigas para garantir que teremos as novas
DELETE FROM rewards;

-- PASSO 6: Insere as recompensas atrativas
INSERT INTO rewards (name, description, points_cost) VALUES
('Coca-Cola Lata Grátis', 'Refresque-se! Troque seus pontos por uma Coca-Cola em lata.', 70, true),
('Nevada de Banana', 'A sobremesa mais pedida! Resgate uma deliciosa Nevada de Banana.', 120, true),
('Bauru de Filé Mignon', 'Um clássico da casa! Use seus pontos para saborear nosso Bauru de Filé Mignon.', 250, true),
('Porção de Fritas com Queijo e Bacon (400g)', 'Perfeita para compartilhar! Resgate uma porção caprichada.', 200, true);

-- Garante que o cupom de exemplo para assinantes exista (ignora se o código já foi inserido)
INSERT IGNORE INTO coupons (code, description, discount_type, discount_value, min_purchase_value) VALUES
('ZAPCLUB10', 'Cupom de 10% de desconto para membros ZapClube', 'percentage', 10.00, 30.00);


ALTER TABLE orders 
ADD COLUMN customer_id INT NULL DEFAULT NULL,
ADD CONSTRAINT fk_customer_order FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;