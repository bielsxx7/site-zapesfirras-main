-- Passo 1: Adicionar a coluna de pontos na tabela de clientes.
-- (Esta parte permanece a mesma)
ALTER TABLE `customers`
ADD COLUMN `points` INT NOT NULL DEFAULT 0 AFTER `password_reset_expires`;

-- Passo 2: Criar a tabela de recompensas, agora com uma ligação para a tabela de produtos.
CREATE TABLE `rewards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL COMMENT 'Nome da recompensa (ex: Bauru Grátis)',
  `description` TEXT COMMENT 'Descrição opcional para o cliente',
  `points_cost` INT NOT NULL COMMENT 'Custo em pontos para resgatar',
  `product_id` INT NULL COMMENT 'ID do produto correspondente na tabela products',
  `is_active` BOOLEAN DEFAULT true COMMENT 'Se a recompensa está ativa para resgate',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) COMMENT='Tabela para armazenar as recompensas do programa de fidelidade.';

-- Passo 3 (Recomendado): Criar a tabela de log para o histórico de pontos.
-- (Esta parte permanece a mesma)
CREATE TABLE `points_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `order_id` INT NULL,
    `reward_id` INT NULL,
    `points_change` INT NOT NULL,
    `description` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reward_id`) REFERENCES `rewards`(`id`) ON DELETE SET NULL
) COMMENT='Histórico de transações de pontos dos clientes.';