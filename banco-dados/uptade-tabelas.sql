-- Adiciona a coluna para controlar a ordem de exibição
ALTER TABLE categories ADD COLUMN display_order INT DEFAULT 99;

-- Define a ordem inicial para as suas categorias
UPDATE categories SET display_order = 1 WHERE name = 'Esfirras Salgadas';
UPDATE categories SET display_order = 2 WHERE name = 'Marmitas';
UPDATE categories SET display_order = 3 WHERE name = 'Beirutes';
UPDATE categories SET display_order = 4 WHERE name = 'Lanches';
UPDATE categories SET display_order = 5 WHERE name = 'Pastéis';
UPDATE categories SET display_order = 6 WHERE name = 'Porções';
UPDATE categories SET display_order = 7 WHERE name = 'Combos';
UPDATE categories SET display_order = 8 WHERE name = 'Esfirras Doces';
UPDATE categories SET display_order = 9 WHERE name = 'Pastéis Doces';
UPDATE categories SET display_order = 10 WHERE name = 'Sobremesas';
UPDATE categories SET display_order = 11 WHERE name = 'Refrigerantes';
UPDATE categories SET display_order = 12 WHERE name = 'Sucos';

-- Deixa o resto com uma ordem padrão (você pode ajustar depois se quiser)
UPDATE categories SET display_order = 20 WHERE name = 'Batatas Porções';
UPDATE categories SET display_order = 21 WHERE name = 'Caipirinhas';
UPDATE categories SET display_order = 22 WHERE name = 'Chope/Cervejas';
UPDATE categories SET display_order = 23 WHERE name = 'Torres';
UPDATE categories SET display_order = 24 WHERE name = 'Vinhos';