-- =============================================================================
-- SEED CATÁLOGO KOQ STORE
-- Categorías, Colores, Modelos, Productos, Stock (locales 2,3,4), Model Colors
-- =============================================================================

-- 1. CATEGORÍAS
INSERT INTO categories (id, name) VALUES
  (gen_random_uuid(), 'Poleras'),
  (gen_random_uuid(), 'Polerones'),
  (gen_random_uuid(), 'Remeras'),
  (gen_random_uuid(), 'Musculosas'),
  (gen_random_uuid(), 'Buzos'),
  (gen_random_uuid(), 'Camisas'),
  (gen_random_uuid(), 'Suéters'),
  (gen_random_uuid(), 'Calzas');

-- 2. COLORES (todos únicos normalizados)
INSERT INTO colors (id, name) VALUES
  (gen_random_uuid(), 'NEGRO'),
  (gen_random_uuid(), 'BLANCO'),
  (gen_random_uuid(), 'BORDO'),
  (gen_random_uuid(), 'AZUL'),
  (gen_random_uuid(), 'VERDE PETROLEO'),
  (gen_random_uuid(), 'FUCSIA'),
  (gen_random_uuid(), 'ROJO'),
  (gen_random_uuid(), 'BEIGE'),
  (gen_random_uuid(), 'GRIS'),
  (gen_random_uuid(), 'VERDE OLIVA'),
  (gen_random_uuid(), 'ROSA'),
  (gen_random_uuid(), 'LILA'),
  (gen_random_uuid(), 'TERRACOTA'),
  (gen_random_uuid(), 'LADRILLO'),
  (gen_random_uuid(), 'MARRON'),
  (gen_random_uuid(), 'AZUL PETROLEO'),
  (gen_random_uuid(), 'GRIS TOPO'),
  (gen_random_uuid(), 'VERDE'),
  (gen_random_uuid(), 'ROSA VIEJO'),
  (gen_random_uuid(), 'CELESTE AGUA'),
  (gen_random_uuid(), 'CHAMPAGNE'),
  (gen_random_uuid(), 'MOSTAZA'),
  (gen_random_uuid(), 'VIOLETA'),
  (gen_random_uuid(), 'NARANJA'),
  (gen_random_uuid(), 'AMARILLO'),
  (gen_random_uuid(), 'ROSA CLARO'),
  (gen_random_uuid(), 'VERDE AGUA'),
  (gen_random_uuid(), 'CAMEL'),
  (gen_random_uuid(), 'VERDE OSCURO'),
  (gen_random_uuid(), 'AZUL MARINO'),
  (gen_random_uuid(), 'AZUL FRANCIA'),
  (gen_random_uuid(), 'CELESTE'),
  (gen_random_uuid(), 'ESTAMPADO LILA/BLANCO'),
  (gen_random_uuid(), 'ESTAMPADO NEGRO/BLANCO');

-- 3. CLOTHING MODELS
-- Pre-insertamos con IDs fijos usando variables (para después referenciar en el DO block)
DO $$
DECLARE
  m_polera_media_id text := gen_random_uuid()::text;
  m_polera_morley_id text := gen_random_uuid()::text;
  m_poleron_plush_id text := gen_random_uuid()::text;
  m_remera_ml_redondo_id text := gen_random_uuid()::text;
  m_remera_ml_cuellov_id text := gen_random_uuid()::text;
  m_remera_termica_id text := gen_random_uuid()::text;
  m_remera_mc_modal_id text := gen_random_uuid()::text;
  m_remera_mc_cuellov_id text := gen_random_uuid()::text;
  m_musculosa_bretel_id text := gen_random_uuid()::text;
  m_musculosa_deportiva_id text := gen_random_uuid()::text;
  m_musculosa_espalda_id text := gen_random_uuid()::text;
  m_buzo_capucha_id text := gen_random_uuid()::text;
  m_camisa_poplin_id text := gen_random_uuid()::text;
  m_camisa_raso_id text := gen_random_uuid()::text;
  m_camisola_id text := gen_random_uuid()::text;
  m_sueter_id text := gen_random_uuid()::text;
  m_calza_termica_id text := gen_random_uuid()::text;

  cat_poleras text := (SELECT id FROM categories WHERE name = 'Poleras');
  cat_polerones text := (SELECT id FROM categories WHERE name = 'Polerones');
  cat_remeras text := (SELECT id FROM categories WHERE name = 'Remeras');
  cat_musculosas text := (SELECT id FROM categories WHERE name = 'Musculosas');
  cat_buzos text := (SELECT id FROM categories WHERE name = 'Buzos');
  cat_camisas text := (SELECT id FROM categories WHERE name = 'Camisas');
  cat_sueters text := (SELECT id FROM categories WHERE name = 'Suéters');
  cat_calzas text := (SELECT id FROM categories WHERE name = 'Calzas');
BEGIN
  -- =========================================================================
  -- CLOTHING MODELS
  -- =========================================================================
  INSERT INTO clothing_models (id, name, id_category, active) VALUES
    (m_polera_media_id, 'Media Polera Modal Soft Unisex', cat_poleras, true),
    (m_polera_morley_id, 'Polera Morley Unisex', cat_poleras, true),
    (m_poleron_plush_id, 'Polerón Morley Plush Bifaz', cat_polerones, true),
    (m_remera_ml_redondo_id, 'Remera Manga Larga c/ Redondo Modal', cat_remeras, true),
    (m_remera_ml_cuellov_id, 'Remera Manga Larga Cuello V Modal Viscosa', cat_remeras, true),
    (m_sueter_id, 'Suéter Clásico Cuello Redondo', cat_sueters, true),
    (m_calza_termica_id, 'Calza Térmica', cat_calzas, true),
    (m_remera_termica_id, 'Remera Térmica', cat_remeras, true),
    (m_buzo_capucha_id, 'Buzo c/ Capucha Modal Soft', cat_buzos, true),
    (m_camisa_poplin_id, 'Camisa Poplin', cat_camisas, true),
    (m_camisa_raso_id, 'Camisa de Raso', cat_camisas, true),
    (m_camisola_id, 'Camisola 3/4', cat_camisas, true),
    (m_remera_mc_modal_id, 'Remera Manga Corta Modal Viscosa', cat_remeras, true),
    (m_remera_mc_cuellov_id, 'Remera Manga Corta Cuello V Modal Viscosa', cat_remeras, true),
    (m_musculosa_bretel_id, 'Musculosa Bretel Modal Viscosa', cat_musculosas, true),
    (m_musculosa_deportiva_id, 'Musculosa Deportiva', cat_musculosas, true),
    (m_musculosa_espalda_id, 'Musculosa Espalda Ancha', cat_musculosas, true);
END;
$$;

-- =============================================================================
-- 4. PRODUCTOS + STOCK + MODEL COLORS
-- Usamos un bloque PL/pgSQL que itera sobre los datos definidos como JSON
-- =============================================================================
DO $$
DECLARE
  models jsonb;
  m jsonb;
  model_id text;
  tier jsonb;
  sz integer;
  color_name text;
  color_id text;
  product_id text;
  price integer;
  total_stock integer;
  variant_stock integer;
  var_stock integer;
  remainder integer;
  variant_count integer;
  stock_luz integer;
  stock_santiago integer;
  stock_avellaneda integer;
  model_name text;
BEGIN
  models := '[
    {
      "name": "Media Polera Modal Soft Unisex",
      "colors": ["NEGRO","BLANCO","BORDO","AZUL","VERDE PETROLEO"],
      "tiers": [
        {"sizes": [1,2,3], "price": 5000, "stock": 80},
        {"sizes": [4,5,6,8], "price": 6000, "stock": 140}
      ]
    },
    {
      "name": "Polera Morley Unisex",
      "colors": ["FUCSIA","ROJO","BEIGE","NEGRO","GRIS"],
      "tiers": [
        {"sizes": [1,2,3], "price": 5500, "stock": 63},
        {"sizes": [4,5,6,8,10], "price": 6500, "stock": 115}
      ]
    },
    {
      "name": "Polerón Morley Plush Bifaz",
      "colors": ["VERDE OLIVA","FUCSIA","ROSA","LILA","TERRACOTA"],
      "tiers": [
        {"sizes": [2,4], "price": 13000, "stock": 27},
        {"sizes": [6,8], "price": 13000, "stock": 27}
      ]
    },
    {
      "name": "Remera Manga Larga c/ Redondo Modal",
      "colors": ["AZUL","NEGRO","GRIS","ROJO","BLANCO","BEIGE","VERDE","LADRILLO","MARRON"],
      "tiers": [
        {"sizes": [0,1,2,3], "price": 6000, "stock": 168},
        {"sizes": [4,5,6,8,10], "price": 7000, "stock": 216}
      ]
    },
    {
      "name": "Remera Manga Larga Cuello V Modal Viscosa",
      "colors": ["NEGRO","BLANCO","BORDO","TERRACOTA","AZUL PETROLEO","GRIS TOPO"],
      "tiers": [
        {"sizes": [0,1,2,3], "price": 7000, "stock": 108},
        {"sizes": [4,5,6,8,10], "price": 8000, "stock": 116}
      ]
    },
    {
      "name": "Suéter Clásico Cuello Redondo",
      "colors": ["NEGRO","ROSA","BEIGE","VERDE OLIVA","AZUL MARINO"],
      "tiers": [
        {"sizes": [2,4], "price": 10000, "stock": 8},
        {"sizes": [6,8], "price": 10000, "stock": 15}
      ]
    },
    {
      "name": "Calza Térmica",
      "colors": ["NEGRO","GRIS"],
      "tiers": [
        {"sizes": [1,2,3,4], "price": 10000, "stock": 5},
        {"sizes": [5,6,8], "price": 11000, "stock": 5}
      ]
    },
    {
      "name": "Remera Térmica",
      "colors": ["NEGRO","GRIS"],
      "tiers": [
        {"sizes": [0,1,2,3], "price": 10000, "stock": 16},
        {"sizes": [4,5,6,8], "price": 11000, "stock": 12}
      ]
    },
    {
      "name": "Buzo c/ Capucha Modal Soft",
      "colors": ["VERDE OSCURO","NEGRO","CAMEL","GRIS"],
      "tiers": [
        {"sizes": [6,8,10], "price": 8000, "stock": 18}
      ]
    },
    {
      "name": "Camisa Poplin",
      "colors": ["NARANJA","ROJO","AZUL FRANCIA","NEGRO","BLANCO","VERDE AGUA","ROSA CLARO","BEIGE"],
      "tiers": [
        {"sizes": [0,1,2], "price": 12000, "stock": 56},
        {"sizes": [3,4,5,6,7,9,11], "price": 13000, "stock": 94}
      ]
    },
    {
      "name": "Camisa de Raso",
      "colors": ["NEGRO","ROSA VIEJO","BLANCO","CELESTE AGUA","CHAMPAGNE"],
      "tiers": [
        {"sizes": [3], "price": 17000, "stock": 15},
        {"sizes": [5,7], "price": 17000, "stock": 15}
      ]
    },
    {
      "name": "Camisola 3/4",
      "colors": ["NEGRO","BLANCO","ROSA","LILA","ESTAMPADO LILA/BLANCO","ESTAMPADO NEGRO/BLANCO"],
      "tiers": [
        {"sizes": [1,2,3], "price": 12000, "stock": 29},
        {"sizes": [4,6,8,10], "price": 13000, "stock": 92}
      ]
    },
    {
      "name": "Remera Manga Corta Modal Viscosa",
      "colors": ["NEGRO","BLANCO","AZUL FRANCIA","CELESTE","ROJO","BORDO","ROSA","BEIGE","MARRON"],
      "tiers": [
        {"sizes": [0,1,2,3], "price": 5000, "stock": 48},
        {"sizes": [4,5,6,8,10], "price": 6000, "stock": 105}
      ]
    },
    {
      "name": "Remera Manga Corta Cuello V Modal Viscosa",
      "colors": ["BLANCO","MOSTAZA","NEGRO","VIOLETA","AZUL","ROJO"],
      "tiers": [
        {"sizes": [1,2,3], "price": 6000, "stock": 43},
        {"sizes": [4,5,6,8,10], "price": 7000, "stock": 18}
      ]
    },
    {
      "name": "Musculosa Bretel Modal Viscosa",
      "colors": ["NEGRO","AZUL FRANCIA","MOSTAZA","NARANJA","FUCSIA","BLANCO","BEIGE","VERDE AGUA","GRIS"],
      "tiers": [
        {"sizes": [0,1,2,3], "price": 3500, "stock": 133},
        {"sizes": [4,5,6,8,10], "price": 5000, "stock": 256}
      ]
    },
    {
      "name": "Musculosa Deportiva",
      "colors": ["NEGRO","GRIS","BLANCO","AMARILLO"],
      "tiers": [
        {"sizes": [1,2,3], "price": 4500, "stock": 83},
        {"sizes": [4,5,6,8,10], "price": 5500, "stock": 159}
      ]
    },
    {
      "name": "Musculosa Espalda Ancha",
      "colors": ["NEGRO","BEIGE","GRIS","BLANCO","AMARILLO","ROJO"],
      "tiers": [
        {"sizes": [1,2,3], "price": 4500, "stock": 27},
        {"sizes": [4,5,6,8,10], "price": 5500, "stock": 44}
      ]
    }
  ]'::jsonb;

  -- Iterate models
  FOR m IN SELECT * FROM jsonb_array_elements(models)
  LOOP
    model_name := m->>'name';

    -- Find the model ID
    SELECT id INTO model_id FROM clothing_models WHERE name = model_name;
    IF model_id IS NULL THEN
      RAISE NOTICE 'Model not found: %', model_name;
      CONTINUE;
    END IF;

    -- Process each tier
    FOR tier IN SELECT * FROM jsonb_array_elements(m->'tiers')
    LOOP
      price := (tier->>'price')::int;
      total_stock := (tier->>'stock')::int;

      -- variant_count = colors × sizes
      variant_count := jsonb_array_length(m->'colors') * jsonb_array_length(tier->'sizes');

      -- Stock per variant (floor), remainder goes to first variant
      variant_stock := total_stock / variant_count;
      remainder := total_stock - (variant_stock * variant_count);

      -- Process each color
      FOR color_name IN SELECT jsonb_array_elements_text(m->'colors')
      LOOP
        SELECT id INTO color_id FROM colors WHERE name = color_name;
        IF color_id IS NULL THEN
          RAISE NOTICE 'Color not found: %', color_name;
          CONTINUE;
        END IF;

        -- Insert clothing_model_colors (for future images)
        INSERT INTO clothing_model_colors (id, id_clothing_model, id_color, image_url)
        VALUES (gen_random_uuid()::text, model_id, color_id, '')
        ON CONFLICT DO NOTHING;

        -- Process each size in this tier
        FOR sz IN SELECT jsonb_array_elements_text(tier->'sizes')::int
        LOOP
          product_id := gen_random_uuid()::text;

          -- Calculate stock for THIS specific variant
          -- First variant gets remainder
          var_stock := variant_stock;
          IF remainder > 0 AND color_name = (m->'colors'->>0) AND sz = (tier->'sizes'->>0)::int THEN
            var_stock := var_stock + remainder;
          END IF;

          -- Distribute across 3 stores (~33/33/34 split)
          stock_luz := var_stock / 3;
          stock_santiago := var_stock / 3;
          stock_avellaneda := var_stock - stock_luz - stock_santiago;

          -- Insert product
          INSERT INTO products (id, id_clothing_model, size, id_color, cost_price, sale_price, active)
          VALUES (product_id, model_id, sz::text, color_id, price, price, true);

          -- Insert stock in each store
          IF stock_luz > 0 THEN
            INSERT INTO stock_locations (id, id_product, id_location, current_stock, minimum_stock)
            VALUES (gen_random_uuid()::text, product_id, '2', stock_luz, 1);
          END IF;
          IF stock_santiago > 0 THEN
            INSERT INTO stock_locations (id, id_product, id_location, current_stock, minimum_stock)
            VALUES (gen_random_uuid()::text, product_id, '3', stock_santiago, 1);
          END IF;
          IF stock_avellaneda > 0 THEN
            INSERT INTO stock_locations (id, id_product, id_location, current_stock, minimum_stock)
            VALUES (gen_random_uuid()::text, product_id, '4', stock_avellaneda, 1);
          END IF;

        END LOOP; -- sizes
      END LOOP; -- colors
    END LOOP; -- tiers
  END LOOP; -- models

  RAISE NOTICE 'Seed completo.';
END;
$$;
