-- 1. Cria a nova tabela para as categorias
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_visible BOOLEAN DEFAULT true
);

-- 2. Insere todas as suas categorias existentes na nova tabela
INSERT INTO categories (name)
SELECT DISTINCT category FROM products ORDER BY category;

-- 3. Adiciona a nova coluna 'category_id' na tabela de produtos
ALTER TABLE products ADD COLUMN category_id INT;

-- 4. Atualiza os produtos para ligá-los às novas categorias
UPDATE products p 
JOIN categories c ON p.category = c.name 
SET p.category_id = c.id;

-- 5. Adiciona a "chave estrangeira" para criar a relação oficial
ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES categories(id);

-- 6. Remove a coluna de texto antiga que não será mais usada
ALTER TABLE products DROP COLUMN category;